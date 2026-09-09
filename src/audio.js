const PENTATONIC = [220, 261.63, 293.66, 329.63, 392];

/** Quiet, asset-free sounds. Audio starts only after setEnabled(true). */
export class GameAudio {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.voices = new Set();
    this.ambientTimer = null;
    this.disposed = false;
    this.request = 0;
    this.step = 0;
    this.ambientStep = 0;
  }

  async setEnabled(value) {
    const request = ++this.request;
    if (this.disposed) return false;

    if (!value) {
      this.enabled = false;
      this._stop();
      if (this.master && this.context) {
        this.master.gain.cancelScheduledValues(this.context.currentTime);
        this.master.gain.setValueAtTime(0, this.context.currentTime);
      }
      return false;
    }

    try {
      if (!this.context) {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) return false;
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.context.destination);

        // One reusable noise buffer supplies the little stone and footstep sounds.
        const length = Math.ceil(this.context.sampleRate * 0.4);
        this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
        const samples = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      }

      // Called directly from the sound button so browser gesture rules are respected.
      await this.context.resume();
      if (this.disposed || request !== this.request) return this.enabled;
      if (this.context.state !== 'running') return false;
      this.enabled = true;
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0.16, now + 0.18);
      if (this.ambientTimer === null) {
        this._ambient();
        this.ambientTimer = globalThis.setInterval(() => this._ambient(), 7200);
      }
      return true;
    } catch {
      if (request === this.request) {
        this.enabled = false;
        this._stop();
      }
      return false;
    }
  }

  play(kind = 'slide') {
    if (!this.enabled || this.disposed || this.context?.state !== 'running') return;
    const now = this.context.currentTime;

    try {
      switch (kind) {
        case 'slide':
          this._noise(now, 0.22, 0.15, 650);
          this._tone(125, now, 0.15, 0.12, 'sine', 80);
          break;
        case 'walk':
          this._noise(now, 0.07, 0.09, 420);
          this._tone(this.step++ % 2 ? 140 : 165, now, 0.09, 0.11, 'sine', 90);
          break;
        case 'collapse':
          this._noise(now, 0.34, 0.22, 950);
          this._tone(115, now, 0.35, 0.18, 'sine', 38);
          this._noise(now + 0.11, 0.18, 0.07, 1800);
          break;
        case 'win':
          [440, 523.25, 659.25, 783.99, 880].forEach((frequency, index) => {
            this._tone(frequency, now + index * 0.17, 1.5, 0.12);
            this._tone(frequency * 2, now + index * 0.17, 0.85, 0.024);
          });
          break;
        case 'error':
          this._tone(146.83, now, 0.17, 0.12, 'sine', 130.81);
          break;
        case 'hint':
          [329.63, 392, 523.25].forEach((frequency, index) => {
            this._tone(frequency, now + index * 0.12, 0.6, 0.09);
          });
          break;
        default:
          break;
      }
    } catch {
      // Sound is optional: a device/context change must never interrupt a puzzle.
    }
  }

  _ambient() {
    if (!this.enabled || this.disposed || this.context?.state !== 'running') return;
    if (globalThis.document?.hidden) return;
    try {
      const now = this.context.currentTime;
      const melody = [0, 2, 1, 4, 3, 2, 4, 1];
      const frequency = PENTATONIC[melody[this.ambientStep++ % melody.length]];
      this._tone(frequency, now + 0.1, 4.2, 0.075, 'sine', null, 0.8);
      this._tone(frequency * 2, now + 0.55, 3.3, 0.023, 'sine', null, 0.65);
    } catch {
      // An unavailable output device should be silent, not fatal.
    }
  }

  _tone(frequency, start, duration, volume, type = 'sine', endFrequency = null, attack = 0.015) {
    const source = this.context.createOscillator();
    const gain = this.context.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, start);
    if (endFrequency) source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(attack, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain);
    gain.connect(this.master);
    this._track(source, [gain]);
    source.start(start);
    source.stop(start + duration + 0.025);
  }

  _noise(start, duration, volume, frequency) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency, start);
    filter.Q.value = 0.6;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    this._track(source, [filter, gain]);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  _track(source, nodes) {
    const voice = { source, nodes };
    this.voices.add(voice);
    source.onended = () => {
      source.disconnect();
      nodes.forEach(node => node.disconnect());
      this.voices.delete(voice);
    };
  }

  _stop() {
    if (this.ambientTimer !== null) {
      globalThis.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
    this.voices.forEach(({ source, nodes }) => {
      source.onended = null;
      try { source.stop(); } catch { /* The voice may have already finished. */ }
      source.disconnect();
      nodes.forEach(node => node.disconnect());
    });
    this.voices.clear();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.enabled = false;
    this.request += 1;
    this._stop();
    this.master?.disconnect();
    if (this.context && this.context.state !== 'closed') {
      this.context.close().catch(() => {});
    }
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
  }
}
