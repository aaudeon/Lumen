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
  scene.add(disc);

  let spin = 0.35;
  let dragging = null;
  let raf = 0;
  let disposed = false;
  let last = performance.now();
  let walking=false;
  let focus=null;
  const petAnchor=explorer.root.getObjectByName('explorer-pet-anchor');
  const stageOrigin=new THREE.Vector3();
  const upAxis=new THREE.Vector3(0,1,0);
  function displaySubject() {
    const petOnly=focus==='pet' && petAnchor?.children[0]?.children.length>0;
    for(const child of explorer.root.children) child.visible=!petOnly || child===petAnchor;
    disc.scale.setScalar(petOnly ? .58 : 1);
    if(petOnly) {
      const [x,y,z]=petAnchor.userData.home;
      // An exhibition has a fixed origin. Only the creature's rig moves here;
      // the follow-lag belongs on the game board, never on its display plinth.
      petAnchor.position.set(x,y+(petAnchor.userData.ground?0:.34),z);
      petAnchor.rotation.set(0,0,0);
      stageOrigin.set(x,0,z).applyAxisAngle(upAxis,spin);
      turntable.position.copy(stageOrigin).negate();
    } else {turntable.position.set(0,0,0);}
  }
  function frameCamera() {
    if(focus==='pet' && petAnchor?.children[0]?.children.length) {
      const grounded=petAnchor.userData.ground;
      const center=grounded ? .16 : .30;
      camera.position.set(0,center+(grounded ? .37 : .46),(grounded ? 1.2 : 1.55)*Math.max(1,1/camera.aspect));
      camera.lookAt(0,center,0);
      return;
    }
    if(focus) {
      let target=null;
      explorer.root.traverse(object=>{if(object.name.startsWith(`gear-${focus}-`))target=object;});
      if(target?.children.length) {
        const bounds=new THREE.Box3().setFromObject(target);
        const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
        const span=Math.max(size.y,size.x/camera.aspect,size.z,.25);
        const distance=Math.max(focus==='pet' ? .65 : .85,span*2.5);
        const ground=focus==='aura'||focus==='trail';
        camera.position.copy(center).add(new THREE.Vector3(0,ground?distance*.85:focus==='pet'?distance*.32:.09,ground?distance*.8:distance));
        camera.lookAt(center);
        return;
      }
    }
    const bounds=new THREE.Box3().setFromObject(explorer.root);
    const size=bounds.getSize(new THREE.Vector3());
    const narrow=Math.max(1,1/camera.aspect);
    const distance=Math.max(3.0,size.y*2.5,size.x*2.4*narrow);
    camera.position.set(0,.83,distance);
    camera.lookAt(0,.63,0);
  }

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
    frameCamera();
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
    explorer.update(time, dt, { moving: walking, distance:walking?dt*.7:0 });
    displaySubject();
    if(focus)frameCamera();
    if (!framed) resize();
    if (framed) renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    setStyle(next) { explorer.setStyle(next);frameCamera(); },
    setWalking(next){walking=next;},
    /** Frame the part being tried on; without a slot, back to the full figure. */
    focusSlot(slot) {
      focus=slot;
      if(slot==='pet')spin=.45;
      if (slot === 'cape') spin = Math.PI * 0.86;
      turntable.rotation.y=spin;
      displaySubject();frameCamera();
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
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
