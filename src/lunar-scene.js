import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createExplorer } from './explorer.js';
import { createCellFeature } from './hazards.js';
import { hasReachedCell, findWalkPreview } from './motion.js';
import { orbitalKit, orbitalEnvironment } from './space-scene.js';
import { SPACE_PORTS } from './volume.js';
import { LUNAR_FACES, LUNAR_GAP, surfaceIndex, surfaceParts, isExteriorSurface,
  lunarCubePosition, surfaceFrame, surfaceQuaternion, createSurfaceMotion } from './lunar.js';

export function updateLunarCubeAppearance(cube, state, mode, selected = -2, hovered = -2) {
  const hintCube = state.hint?.type === 'slide' ? state.hint.index : null;
  const selectedCube = mode === 'slide' ? (hovered >= 0 ? hovered : selected) : hovered >= 0 && hovered < state.finishIndex ? surfaceParts(hovered).cube : -1;
  const slidable = state.slidable.includes(cube.index);
  cube.border.visible = mode === 'slide' && (slidable || cube.index === selectedCube || cube.index === hintCube);
  cube.outline.color.set(cube.index === hintCube ? 0xfbe19d : slidable ? 0xc5e6d0 : 0x627a83);
  cube.outline.opacity = cube.index === selectedCube || cube.index === hintCube ? 1 : .6;
  for (const patch of cube.patches) {
    const index = surfaceIndex(cube.index, patch.face);
    // Les gravures appartiennent au cube ; seule la roche voisine peut les occulter.
    patch.root.visible = true;
    const reachable = state.reachable.includes(index);
    const highlighted = mode === 'walk' && (index === hovered || index === selected || state.hint?.index === index);
    const color = highlighted ? 0xffd9a1 : reachable ? 0xb6ead6 : 0xb4bbc0;
    patch.surface.color.set(color); patch.surface.emissive.set(color);
    patch.surface.emissiveIntensity = highlighted ? .8 : reachable ? .26 : .035;
  }
}

function moonTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#b9bab6'; context.fillRect(0, 0, 256, 256);
  let seed = 3917;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  for (let index = 0; index < 9000; index++) {
    const tone = Math.floor(135 + random() * 85);
    context.fillStyle = `rgba(${tone},${tone},${tone},.2)`;
    context.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
  }
  for (let index = 0; index < 34; index++) {
    const horizontal = random() * 256, vertical = random() * 256, radius = 3 + random() ** 2 * 29;
    const crater = context.createRadialGradient(horizontal - radius * .2, vertical - radius * .2, radius * .1,
      horizontal, vertical, radius);
    crater.addColorStop(0, '#92958f'); crater.addColorStop(.68, '#797e79');
    crater.addColorStop(.79, '#ced0c7'); crater.addColorStop(.91, '#a5a79f'); crater.addColorStop(1, '#b9bab600');
    context.fillStyle = crater; context.beginPath(); context.arc(horizontal, vertical, radius, 0, Math.PI * 2); context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

export function createLunarScene(host, callbacks) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x090e13, 1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Lune cubique : chemins sur les six faces ext\u00e9rieures');
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 250);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .085;
  controls.minDistance = 6; controls.maxDistance = 55;
  controls.minPolarAngle = .015; controls.maxPolarAngle = Math.PI - .015;
  controls.mouseButtons.MIDDLE = null;
  const kit = orbitalKit();
  const updateEnvironment = orbitalEnvironment(scene, kit);
  scene.add(new THREE.AmbientLight(0xdce4f0, .55));
  const world = new THREE.Group(); world.name = 'lunar-surface'; scene.add(world);
  const texture = moonTexture();
  const rock = kit.material(0xd0d0ca, { map: texture, metalness: 0, roughness: 1 });
  const trackBed = kit.material(0x404f58, { roughness: .9, metalness: .1 });
  const cubeShape = kit.geometry(new RoundedBoxGeometry(LUNAR_GAP - .035, LUNAR_GAP - .035, LUNAR_GAP - .035, 2, .025));
  const borderShape = kit.geometry(new THREE.EdgesGeometry(new THREE.BoxGeometry(LUNAR_GAP - .015, LUNAR_GAP - .015, LUNAR_GAP - .015)));
  const dotShape = kit.geometry(new THREE.CircleGeometry(.11, 16));
  const cubes = new Map();

  function buildCube(tile) {
    const root = new THREE.Group(); root.name = 'lunar-cube'; world.add(root);
    const body = kit.mesh(root, cubeShape, rock);
    const outline = new THREE.LineBasicMaterial({ color: 0xf4d693, transparent: true, opacity: .8 });
    kit.materials.add(outline);
    const border = new THREE.LineSegments(borderShape, outline); border.visible = false; root.add(border);
    const patches = [];
    for (const face of LUNAR_FACES) {
      const normal = new THREE.Vector3(...SPACE_PORTS[face]);
      const patch = new THREE.Group(); patch.name = `lunar-face-${face}`;
      patch.position.copy(normal).multiplyScalar(LUNAR_GAP / 2 - .012);
      patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal); root.add(patch);
      const inverse = patch.quaternion.clone().invert();
      const surface = kit.material(0xc9d6ce, { emissive: 0x244d43, emissiveIntensity: .2, roughness: .6, metalness: .15 });
      const ports = tile.faces[face] || [];
      if (ports.length) {
        kit.mesh(patch, dotShape, trackBed, [0, 0, .009], [1.35, 1.35, 1]);
        kit.mesh(patch, dotShape, surface, [0, 0, .015], [.53, .53, 1]);
      }
      for (const direction of ports) {
        if (!SPACE_PORTS[direction]) continue;
        const tangent = new THREE.Vector3(...SPACE_PORTS[direction]).applyQuaternion(inverse);
        const horizontal = Math.abs(tangent.x) > .5;
        kit.mesh(patch, kit.box, trackBed, [tangent.x * .32, tangent.y * .32, .003],
          [horizontal ? .66 : .19, horizontal ? .19 : .66, .012]);
        kit.mesh(patch, kit.box, surface, [tangent.x * .33, tangent.y * .33, .011],
          [horizontal ? .68 : .055, horizontal ? .055 : .68, .014]);
      }
      patches.push({ root: patch, face, surface });
    }
    return { root, body, border, outline, patches, index: -1, target: new THREE.Vector3(),
      dispose() {
        root.removeFromParent(); outline.dispose(); kit.materials.delete(outline);
        for (const patch of patches) { patch.surface.dispose(); kit.materials.delete(patch.surface); }
      } };
  }

  const beaconSurface = kit.material(0xf4d59f, { emissive: 0xbf8432, emissiveIntensity: .6 });
  const entry = new THREE.Group(); entry.name = 'lunar-entry'; world.add(entry);
  const exit = new THREE.Group(); exit.name = 'lunar-exit'; world.add(exit);
  const platformShape = kit.geometry(new THREE.CylinderGeometry(.32, .37, .1, 8));
  kit.mesh(entry, platformShape, kit.silver, [0, -.05, 0]);
  kit.mesh(exit, platformShape, kit.silver, [0, -.05, 0]);
  for (const side of [-1, 1]) {
    kit.mesh(exit, kit.box, kit.silver, [side * .25, .28, 0], [.07, .56, .09]);
    kit.mesh(entry, kit.box, beaconSurface, [side * .26, .035, 0], [.07, .07, .07]);
  }
  const exitRing = kit.mesh(exit, kit.geometry(new THREE.TorusGeometry(.27, .025, 6, 40)), beaconSurface, [0, .4, 0]);
  const entryProxy = kit.mesh(entry, kit.box, kit.invisible, [0, .16, 0], [.75, .65, .75]); entryProxy.userData.terminal = -1;
  const exitProxy = kit.mesh(exit, kit.box, kit.invisible, [0, .22, 0], [.75, .75, .75]); exitProxy.userData.terminal = 162;
  const explorer = createExplorer({ THREE, style: callbacks.style, effectWorld: world, portalMount: exit });
  const hero = explorer.root; hero.scale.setScalar(.48); world.add(hero);
  kit.mesh(hero, kit.geometry(new THREE.SphereGeometry(.32, 20, 12)),
    kit.material(0xd8edf0, { transparent: true, opacity: .16, depthWrite: false, roughness: .1, metalness: .2 }), [0, .91, .015]);
  const relic = createCellFeature({ THREE, kind: 'relic', palette: { gold: 0xf2cc8d, gem: 0xadf1df } });
  relic.root.scale.setScalar(.55); world.add(relic.root);
  const routeGeometry = kit.geometry(new THREE.BufferGeometry());
  const routeSurface = new THREE.LineDashedMaterial({ color: 0xa6ffe1, dashSize: .09, gapSize: .055 });
  kit.materials.add(routeSurface);
  const preview = new THREE.Line(routeGeometry, routeSurface); preview.visible = false; world.add(preview);
  const safe = { top: 0, right: 0, bottom: 0, left: 0 };
  const mouse = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  let state = null, mode = 'slide', selected = -2, hovered = -2;
  let motion = null, relicTaken = null, pendingSettle = false, pendingVictory = false;
  let active = true, disposed = false, raf = 0, lastTime = performance.now();
  let pointer = null, dragged = false, faceView = 'free';

  function frameCamera(face = faceView) {
    const width = host.clientWidth || 1, height = host.clientHeight || 1;
    const availableWidth = Math.max(160, width - safe.left - safe.right);
    const availableHeight = Math.max(190, height - safe.top - safe.bottom);
    const angle = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(availableWidth, availableHeight) / height);
    const direction = SPACE_PORTS[face] ? new THREE.Vector3(...SPACE_PORTS[face]) : new THREE.Vector3(-8, 6.5, 10).normalize();
    if (Math.abs(direction.y) > .99) direction.z = .018;
    camera.position.copy(direction.normalize().multiplyScalar(3.8 / Math.sin(angle)));
    controls.target.set(0, 0, 0); camera.lookAt(controls.target);
    camera.aspect = width / height;
    camera.setViewOffset(width, height, (safe.right - safe.left) / 2, (safe.bottom - safe.top) / 2, width, height);
    camera.updateProjectionMatrix(); controls.update();
  }
  function resize() {
    if (!host.clientWidth || !host.clientHeight || disposed) return;
    renderer.setSize(host.clientWidth, host.clientHeight, false); frameCamera();
  }
  function updatePreview() {
    const destination = state?.hint?.type === 'walk' ? state.hint.index : mode === 'walk' ? (selected >= -1 ? selected : hovered) : -2;
    const path = findWalkPreview(state, destination);
    preview.visible = !motion && path.length > 1;
    if (!preview.visible) return;
    const route = createSurfaceMotion(path, state);
    routeGeometry.setFromPoints(route.points); preview.computeLineDistances();
  }
  function colors() {
    if (!state) return;
    for (const cube of cubes.values()) updateLunarCubeAppearance(cube, state, mode, selected, hovered);
    updatePreview();
  }
  function interactions() {
    if (!state || relicTaken === state.relic.taken || !hasReachedCell(motion, state.relic.index)) return;
    const previous = relicTaken; relicTaken = state.relic.taken; relic.set(relicTaken);
    if (previous === false && relicTaken) explorer.react('treasure');
    callbacks.onInteractions?.({ gameId: state.id, relicTaken, gatesOpen: true, descentRevealed: false });
  }
  function update(next, nextMode, focus = -2) {
    if (!next) return;
    const previous = state, fresh = previous?.id !== next.id;
    if (nextMode !== mode) hovered = -2;
    state = next; mode = nextMode; selected = focus;
    if (fresh) {
      motion = null; relicTaken = null; pendingVictory = false; explorer.react('reset');
      const frame = surfaceFrame(next.hero, next);
      hero.position.copy(frame.position); hero.quaternion.copy(surfaceQuaternion(frame.normal, new THREE.Vector3(0, 0, 1)));
    }
    const present = new Set(next.tiles.filter(Boolean).map(tile => tile.id));
    for (const [id, cube] of cubes) if (!present.has(id)) { cube.dispose(); cubes.delete(id); }
    next.tiles.forEach((tile, index) => {
      if (!tile) return;
      let cube = cubes.get(tile.id);
      if (!cube) { cube = buildCube(tile); cubes.set(tile.id, cube); cube.root.position.copy(lunarCubePosition(index)); }
      cube.index = index; cube.body.userData.cube = index; cube.target.copy(lunarCubePosition(index));
      if (fresh) cube.root.position.copy(cube.target);
    });
    if (!fresh && previous.hero !== next.hero) {
      if (next.walkPath?.length > 1) {
        const route = createSurfaceMotion(next.walkPath, next);
        motion = { route, path: next.walkPath, distances: route.distances, distance: 0, startedAt: performance.now() / 1000 };
      } else {
        motion = null;
        const frame = surfaceFrame(next.hero, next);
        hero.position.copy(frame.position); hero.quaternion.copy(surfaceQuaternion(frame.normal, new THREE.Vector3(0, 0, 1)));
      }
    }
    const entryFrame = surfaceFrame(-1, next), exitFrame = surfaceFrame(next.finishIndex, next);
    entry.position.copy(entryFrame.position); exit.position.copy(exitFrame.position);
    entry.quaternion.copy(surfaceQuaternion(entryFrame.normal, new THREE.Vector3(0, 0, 1)));
    exit.quaternion.copy(surfaceQuaternion(exitFrame.normal, new THREE.Vector3(0, 0, 1)));
    const relicFrame = surfaceFrame(next.relic.index, next);
    relic.root.position.copy(relicFrame.position);
    relic.root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), relicFrame.normal);
    pendingSettle ||= next !== previous;
    pendingVictory ||= next.won && !previous?.won;
    if (!next.won) pendingVictory = false;
    interactions(); colors();
  }
  function pick(event) {
    if (!state) return -2;
    const bounds = renderer.domElement.getBoundingClientRect();
    mouse.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects([...cubes.values()].map(cube => cube.body).concat(entryProxy, exitProxy), false)[0];
    if (!hit) return -2;
    if (hit.object.userData.terminal !== undefined) return hit.object.userData.terminal;
    const cube = hit.object.userData.cube;
    if (mode === 'slide') return cube;
    const normal = hit.face.normal;
    const face = LUNAR_FACES.reduce((best, current) => new THREE.Vector3(...SPACE_PORTS[current]).dot(normal)
      > new THREE.Vector3(...SPACE_PORTS[best]).dot(normal) ? current : best);
    const index = surfaceIndex(cube, face);
    return isExteriorSurface(index) ? index : -2;
  }
  function move(event) {
    if (pointer && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5) dragged = true;
    const index = pick(event);
    if (index !== hovered) { hovered = index; colors(); callbacks.onHover?.(index); }
    renderer.domElement.style.cursor = index >= -1 ? 'pointer' : 'grab';
  }
  function leave() { hovered = -2; colors(); callbacks.onHover?.(-2); }
  function down(event) { pointer = { x: event.clientX, y: event.clientY }; dragged = false; }
  function up(event) { if (event.button === 1 && !dragged) callbacks.onModeToggle?.(); pointer = null; }
  function click(event) { if (!dragged) { const index = pick(event); if (index >= -1) callbacks.onTile?.(index); } }
  function orbit() { if (pointer && dragged) { faceView = 'free'; callbacks.onOrbit?.(); } }
  function contextLost(event) { event.preventDefault(); callbacks.onError?.('Le rendu lunaire a ete interrompu. Rechargez la page.'); }
  const handlers = [['pointermove', move], ['pointerleave', leave], ['pointerdown', down], ['pointerup', up], ['click', click], ['webglcontextlost', contextLost]];
  for (const [event, handler] of handlers) renderer.domElement.addEventListener(event, handler);
  controls.addEventListener('change', orbit);
  const observer = new ResizeObserver(resize); observer.observe(host); resize();

  function animate(now) {
    if (disposed || !active) return;
    const time = now / 1000, dt = Math.min(.05, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
    controls.update();
    let settling = false;
    for (const cube of cubes.values()) {
      cube.root.position.lerp(cube.target, 1 - Math.exp(-dt * 17));
      if (cube.root.position.distanceTo(cube.target) > .004) settling = true;
    }
    const moving = Boolean(motion);
    let distance = 0;
    if (motion) {
      const sample = motion.route.sample(time - motion.startedAt);
      distance = sample.distance - motion.distance; motion.distance = sample.distance;
      hero.position.set(sample.position.x, sample.position.y, sample.position.z); hero.quaternion.copy(sample.quaternion);
      if (sample.complete) motion = null;
    }
    const gait = explorer.update(time, dt, { moving, distance, interest: relicTaken ? 0 : .12 });
    if (gait?.footfall && moving) callbacks.onFootfall?.();
    interactions(); relic.update(time); exitRing.rotation.z = time * .13;
    if (pendingSettle && !motion && !settling) {
      pendingSettle = false;
      if (pendingVictory) { pendingVictory = false; explorer.react('victory'); callbacks.onVictory?.(); }
      colors(); callbacks.onSettled?.();
    }
    updateEnvironment(time); renderer.render(scene, camera); raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate); callbacks.onReady?.();
  return {
    update,
    setSafeArea(insets) { Object.assign(safe, insets); resize(); },
    setView(value) { if (value !== 'free') { faceView = value === 'top' ? 'U' : 'free'; frameCamera(); } },
    setSurfaceView(value) {
      faceView = value === 'hero' && state ? surfaceFrame(state.hero, state).face : value;
      if (faceView !== 'free') frameCamera();
    },
    setExplorerStyle(style) { explorer.setStyle(style); },
    setActive(value) {
      if (value === active || disposed) return;
      active = value; cancelAnimationFrame(raf);
      if (active) { lastTime = performance.now(); resize(); raf = requestAnimationFrame(animate); }
    },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      controls.removeEventListener('change', orbit); controls.dispose();
      for (const [event, handler] of handlers) renderer.domElement.removeEventListener(event, handler);
      explorer.dispose(); relic.dispose(); texture.dispose(); kit.dispose(); renderer.dispose();
      renderer.domElement.remove(); renderer.forceContextLoss();
    },
  };
}