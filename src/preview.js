/** A small self-contained viewer that shows the explorer wearing an outfit.
 *
 * It owns its own renderer, so the store can try clothes on without disturbing
 * the game scene. The rig idles and turns slowly; a drag turns it by hand.
 */
import * as THREE from 'three';
import { createExplorer } from './explorer.js';

export function createExplorerPreview(host, { style, biome = 'jungle' } = {}) {
  const tints = {
    jungle: { sky: 0x9fc6c0, ground: 0x1d3a26, key: 0xffe0a8, rim: 0x76c6a8 },
    atlantis: { sky: 0x9fd4e2, ground: 0x123244, key: 0xd8f4ff, rim: 0x53c4d6 },
    volcano: { sky: 0xd9b7a4, ground: 0x2a1a1e, key: 0xffcf9a, rim: 0xff7a44 },
  };
  const tint = tints[biome] || tints.jungle;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 0.72, 2.55);
  camera.lookAt(0, 0.62, 0);

  scene.add(new THREE.HemisphereLight(tint.sky, tint.ground, 1.15));
  const key = new THREE.DirectionalLight(tint.key, 2.6);
  key.position.set(-1.6, 2.4, 2.2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(tint.rim, 1.5);
  rim.position.set(2.2, 1.1, -1.8);
  scene.add(rim);

  const turntable = new THREE.Group();
  scene.add(turntable);
  const explorer = createExplorer({ THREE, style });
  turntable.add(explorer.root);
  // A dark disc under the boots so the rig does not float in the void.
  const discGeometry = new THREE.CylinderGeometry(0.46, 0.5, 0.035, 28);
  const discMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2c2a, roughness: 0.95 });
  const disc = new THREE.Mesh(discGeometry, discMaterial);
  disc.position.y = -0.018;
  turntable.add(disc);

  let spin = 0.35;
  let dragging = null;
  let raf = 0;
  let disposed = false;
  let last = performance.now();

  let framed = false;
  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    // A host still being laid out would otherwise leave a one-pixel buffer
    // stretched across the panel: keep waiting instead of rendering a smear.
    if (width < 16 || height < 16) { framed = false; return; }
    framed = true;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  function onDown(event) { dragging = event.clientX; renderer.domElement.setPointerCapture?.(event.pointerId); }
  function onMove(event) {
    if (dragging === null) return;
    spin += (event.clientX - dragging) * 0.012;
    dragging = event.clientX;
  }
  function onUp() { dragging = null; }
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointerleave', onUp);

  function frame(now) {
    if (disposed) return;
    const time = now / 1000;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (dragging === null) spin += dt * 0.42;
    turntable.rotation.y = spin;
    explorer.update(time, dt, { moving: false });
    if (!framed) resize();
    if (framed) renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    setStyle(next) { explorer.setStyle(next); },
    /** Frame the part being tried on; without a slot, back to the full figure. */
    focusSlot(slot) {
      const framing = {
        hat: { height: 1.0, distance: 1.5, look: 0.95 },
        light: { height: 0.66, distance: 2.0, look: 0.55 },
        cape: { height: 0.74, distance: 2.35, look: 0.62 },
      }[slot] || { height: 0.72, distance: 2.55, look: 0.62 };
      camera.position.set(0, framing.height, framing.distance);
      camera.lookAt(0, framing.look, 0);
      if (slot === 'cape') spin = Math.PI * 0.86;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointerleave', onUp);
      explorer.dispose();
      discGeometry.dispose();
      discMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
