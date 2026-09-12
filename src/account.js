import { SAVE_KEYS, SAVE_VERSION, VERSION_KEY } from './campaign.js';
import { DEFAULT_LOOK, EMPTY_WARDROBE } from './cosmetics.js';

export const SESSION_EXPIRED_EVENT = 'lumen-session-expired';

export async function accountRequest(path = '/api/account', body) {
  const response = await fetch(path, {
    credentials: 'same-origin', signal: AbortSignal.timeout(10000),
    ...(body === undefined ? {} : { method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('Le serveur de sauvegarde ne répond pas.'); }
  if (!response.ok) {
    const error = new Error(data.error || 'La sauvegarde est indisponible.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export function emptySave() {
  return { version: SAVE_VERSION, progress: {}, wardrobe: { ...EMPTY_WARDROBE, equipped: { ...DEFAULT_LOOK } }, levelId: null };
}

/** Une file par compte : aucune progression connectee n'ecrase le mode invite. */
export class ProgressProfile {
  constructor(account, storage, request = accountRequest) {
    this.user = account.user;
    this.packs = [...(account.packs || [])];
    this.storage = storage;
    this.memory = new Map();
    this.request = request;
    this.prefix = this.user ? `lumen-account:${this.user.id}:` : '';
    this.revision = account.revision || 0;
    this.pendingRevision = this.revision;
    this.listeners = new Set();
    this.status = this.user ? 'saved' : 'guest';
    this.error = '';
    this.blocked = false;
    this.pending = null;
    this.inFlight = null;
    this.packInFlight = null;
    this.timer = null;
    if (this.user) {
      if (account.save && account.save.version !== SAVE_VERSION) throw new Error('Cette sauvegarde utilise une autre version du jeu.');
      const outbox = this.read('outbox', null);
      const snapshot = outbox?.save || account.save || emptySave();
      if (this.read('lumen-level', null) !== snapshot.levelId) this.remove('lumen-session');
      this.install(snapshot);
      if (outbox) {
        this.pending = outbox.save;
        this.pendingRevision = outbox.revision;
        this.status = outbox.revision === this.revision ? 'pending' : 'conflict';
        this.blocked = outbox.revision !== this.revision;
        if (this.blocked) this.error = 'Une autre session a modifié ce carnet. Votre copie locale est conservée.';
      }
    } else if (this.read(VERSION_KEY, null) !== SAVE_VERSION) {
      for (const key of SAVE_KEYS) this.remove(key);
      this.put(VERSION_KEY, SAVE_VERSION);
    }
  }

  read = (key, fallback) => {
    if (this.memory.has(key)) return this.memory.get(key) ?? fallback;
    try { return JSON.parse(this.storage?.getItem(this.prefix + key)) ?? fallback; } catch { return fallback; }
  };

  put(key, value) {
    this.memory.set(key, value);
    try { this.storage?.setItem(this.prefix + key, JSON.stringify(value)); } catch { /* La file en memoire reste disponible. */ }
  }

  remove(key) {
    this.memory.set(key, null);
    try { this.storage?.removeItem(this.prefix + key); } catch { /* Le stockage peut etre desactive. */ }
  }

  install(snapshot) {
    this.put('lumen-progress', snapshot.progress);
    this.put('lumen-wardrobe', snapshot.wardrobe);
    this.put('lumen-level', snapshot.levelId);
    this.put(VERSION_KEY, SAVE_VERSION);
    this.snapshot = snapshot;
  }

  getSave = () => this.snapshot || {
    version: SAVE_VERSION, progress: this.read('lumen-progress', {}),
    wardrobe: this.read('lumen-wardrobe', emptySave().wardrobe), levelId: this.read('lumen-level', null),
  };

  write = (key, value) => {
    this.put(key, value);
    const field = { 'lumen-progress': 'progress', 'lumen-wardrobe': 'wardrobe', 'lumen-level': 'levelId' }[key];
    if (!field) return;
    const previous = this.getSave();
    const next = { ...previous, [field]: value };
    if (JSON.stringify(previous) === JSON.stringify(next) && this.user) return;
    this.snapshot = next;
    if (!this.user) return;
    this.pending = next;
    this.put('outbox', { save: next, revision: this.pendingRevision });
    if (!this.blocked) this.status = 'pending';
    this.emit();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.flush().catch(() => {}); }, 300);
  };

  subscribe = listener => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getStatus = () => this.status;
  emit() { for (const listener of this.listeners) listener(); }

  expire = () => {
    if (!this.user) return;
    this.status = 'expired';
    this.blocked = true;
    this.error = 'Reconnectez-vous pour reprendre votre voyage. Votre copie locale est conservée.';
    this.emit();
  };

  flush = () => {
    clearTimeout(this.timer);
    if (this.inFlight) return this.inFlight;
    if (this.blocked) return Promise.reject(new Error(this.error));
    if (!this.user || !this.pending) return Promise.resolve();
    this.inFlight = this.drain().finally(() => { this.inFlight = null; });
    return this.inFlight;
  };

  async drain() {
    this.status = 'saving'; this.emit();
    try {
      while (this.pending && !this.blocked) {
        const sent = this.pending;
        const result = await this.request('/api/account/save', { save: sent, revision: this.revision, userId: this.user.id });
        this.revision = result.revision;
        this.pendingRevision = result.revision;
        if (this.pending === sent) { this.pending = null; this.remove('outbox'); }
        else this.put('outbox', { save: this.pending, revision: this.revision });
      }
      if (!this.blocked) { this.status = 'saved'; this.error = ''; }
    } catch (error) {
      this.status = error.status === 409 ? 'conflict' : error.status === 401 ? 'expired' : 'offline';
      this.blocked = [409, 401].includes(error.status);
      this.error = error.message;
      throw error;
    } finally { this.emit(); }
  }

  purchasePack(packId) {
    if (this.packInFlight) return this.packInFlight;
    this.packInFlight = this.buyPack(packId).finally(() => { this.packInFlight = null; });
    return this.packInFlight;
  }

  async buyPack(packId) {
    await this.flush();
    if (!this.user || this.blocked) throw new Error(this.error || 'Connectez-vous pour acheter une exp\u00e9dition.');
    const before = this.getSave();
    this.status = 'saving'; this.emit();
    this.inFlight = this.request('/api/account/pack', { packId, revision: this.revision, userId: this.user.id }).then(result => {
      this.packs = [...(result.packs || [])];
      this.revision = this.pendingRevision = result.revision;
      // Une sauvegarde arrivee pendant l'achat garde ses changements et le debit confirme.
      if (this.pending) {
        const charged = (result.save.wardrobe.spent || 0) - (before.wardrobe.spent || 0);
        this.pending = { ...this.pending, wardrobe: { ...this.pending.wardrobe,
          spent: (this.pending.wardrobe.spent || 0) + charged } };
        this.install(this.pending);
        this.put('outbox', { save: this.pending, revision: result.revision });
      } else {
        this.install(result.save);
        this.remove('outbox');
      }
      if (!this.blocked) { this.status = this.pending ? 'pending' : 'saved'; this.error = ''; }
      return result;
    }).catch(error => {
      if (!this.blocked) {
        this.status = error.status === 409 ? 'conflict' : error.status === 401 ? 'expired' : error.status === 400 ? 'saved' : 'offline';
        this.blocked = [409, 401].includes(error.status);
        this.error = error.message;
      }
      throw error;
    }).finally(() => { this.inFlight = null; this.emit(); });
    const result = await this.inFlight;
    if (this.pending) await this.flush();
    return result;
  }

  async reset() {
    await this.flush();
    const snapshot = emptySave();
    if (this.user) {
      const result = await this.request('/api/account/save', { save: snapshot, revision: this.revision, userId: this.user.id });
      this.revision = result.revision;
      this.pendingRevision = result.revision;
    }
    for (const key of SAVE_KEYS) this.remove(key);
    this.install(snapshot);
    this.remove('outbox');
  }

  discardPending() { this.remove('outbox'); this.remove('lumen-session'); }
  stop() { clearTimeout(this.timer); }
}