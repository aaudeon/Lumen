import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createExplorer } from './explorer.js';
import { createCellFeature } from './hazards.js';
import { createRouteMotion, hasReachedCell, findWalkPreview } from './motion.js';
import { SPACE_PORTS, volumePosition } from './volume.js';

export function orbitalKit() {
  const geometries = new Set(), materials = new Set();
  const geometry = value => { geometries.add(value); return value; };
  const material = (color, options = {}) => {
    const surface = new THREE.MeshStandardMaterial({ color, roughness: .46, metalness: .45, ...options });
    materials.add(surface); return surface;
  };
  const box = geometry(new THREE.BoxGeometry(1, 1, 1));
  const tube = geometry(new THREE.CylinderGeometry(1, 1, 1, 10));
  const ring = geometry(new THREE.TorusGeometry(.19, .027, 6, 20));
  const gem = geometry(new THREE.OctahedronGeometry(.14));
  const frame = geometry(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.13, 1.13, 1.13)));
  const silver = material(0xbacbc8), dark = material(0x202b30), copper = material(0xe4a679);
  const conduitShell = material(0x70978d, { transparent: true, opacity: .28, depthWrite: false, metalness: .15 });
  const glass = material(0x92dccb, { transparent: true, opacity: .065, depthWrite: false, metalness: .1 });
  const invisible = material(0xffffff, { transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
  function mesh(parent, shape, surface, position = [0, 0, 0], scale = [1, 1, 1]) {
    const object = new THREE.Mesh(shape, surface);
    object.position.set(...position); object.scale.set(...scale); parent.add(object); return object;
  }
  function cube(tile) {
    const root = new THREE.Group(); root.name = 'orbital-cube';
    const outline = new THREE.LineBasicMaterial({ color: 0x638b83, transparent: true, opacity: .7 });
    materials.add(outline);
    root.add(new THREE.LineSegments(frame, outline));
    mesh(root, box, glass, [0, 0, 0], [1.1, 1.1, 1.1]);
    for (const horizontal of [-1, 1]) for (const height of [-1, 1]) for (const depth of [-1, 1]) {
      mesh(root, box, silver, [horizontal * .54, height * .54, depth * .54], [.13, .13, .13]);
    }
    const glow = material(0x8bd7c2, { emissive: 0x4ebbaa, emissiveIntensity: .75, roughness: .2 });
    const core = mesh(root, gem, glow);
    for (const side of tile.ports) {
      const direction = new THREE.Vector3(...SPACE_PORTS[side]);
      const conduit = mesh(root, tube, conduitShell, direction.clone().multiplyScalar(.29).toArray(), [.135, .58, .135]);
      conduit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      const light = mesh(root, tube, glow, direction.clone().multiplyScalar(.3).toArray(), [.066, .61, .066]);
      light.quaternion.copy(conduit.quaternion);
      const rim = mesh(root, ring, side === 'U' || side === 'D' ? copper : silver, direction.clone().multiplyScalar(.55).toArray());
      rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    }
    const proxy = mesh(root, box, invisible, [0, 0, 0], [1.15, 1.15, 1.15]);
    return { root, proxy, outline, glow, core, target: new THREE.Vector3(), index: -1,
      dispose() { root.removeFromParent(); outline.dispose(); glow.dispose(); materials.delete(outline); materials.delete(glow); } };
  }
  return { geometry, material, materials, mesh, cube, box, tube, ring, gem, frame, silver, dark, copper, invisible,
    dispose() { geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); } };
}

export function orbitalEnvironment(scene, kit) {
  let seed = 5731;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const starPositions = [], starColors = [];
  for (let index = 0; index < 850; index++) {
    const radius = 35 + random() * 80, angle = random() * Math.PI * 2, height = random() * 2 - 1;
    const horizontal = Math.sqrt(1 - height * height);
    starPositions.push(Math.cos(angle) * horizontal * radius, height * radius, Math.sin(angle) * horizontal * radius);
    starColors.push(.65 + random() * .35, .65 + random() * .35, .65 + random() * .35);
  }
  const starsGeometry = kit.geometry(new THREE.BufferGeometry());
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const starsMaterial = new THREE.PointsMaterial({ size: .13, vertexColors: true, transparent: true, opacity: .9, depthWrite: false });
  kit.materials.add(starsMaterial);
  const stars = new THREE.Points(starsGeometry, starsMaterial); scene.add(stars);
  const planet = new THREE.Group(); planet.position.set(26, -5, -15); planet.scale.setScalar(.7); scene.add(planet);
  const sphere = kit.geometry(new THREE.IcosahedronGeometry(4.7, 4));
  const position = sphere.attributes.position;
  const colors = [];
  for (let index = 0; index < position.count; index++) {
    const band = Math.sin(position.getY(index) * 3 + Math.sin(position.getX(index) * .9) * .4);
    const color = new THREE.Color(band > .4 ? 0x9caa9c : band < -.5 ? 0x73646a : 0xc5c9b7);
    colors.push(color.r, color.g, color.b);
  }
  sphere.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  kit.mesh(planet, sphere, kit.material(0xffffff, { vertexColors: true, metalness: 0, roughness: 1 }));
  const orbit = kit.mesh(planet, kit.geometry(new THREE.RingGeometry(5.7, 7.8, 100)),
    kit.material(0xac9b85, { side: THREE.DoubleSide, transparent: true, opacity: .7, metalness: .1 }));
  orbit.rotation.x = Math.PI / 2.6;
  const debrisGeometry = kit.geometry(new THREE.IcosahedronGeometry(1, 0));
  const debris = [];
  for (let index = 0; index < 18; index++) {
    const angle = index * 2.399, radius = 11 + random() * 7;
    const rock = kit.mesh(scene, debrisGeometry, kit.dark,
      [Math.cos(angle) * radius, -7 + random() * 4, Math.sin(angle) * radius], [.3 + random() * .4, .3, .45]);
    debris.push(rock);
  }
  scene.add(new THREE.HemisphereLight(0xe2f6ee, 0x273d36, 2));
  const sunlight = new THREE.DirectionalLight(0xffe5c9, 3.4); sunlight.position.set(-8, 14, 8); scene.add(sunlight);
  const rim = new THREE.DirectionalLight(0x8ddfcf, 2); rim.position.set(7, -4, -8); scene.add(rim);
  return time => {
    planet.rotation.y = time * .009;
    for (const [index, rock] of debris.entries()) rock.rotation.set(time * .014 + index, time * .008, index);
  };
}

export function createSpaceScene(host, callbacks) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x080e12, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Taquin spatial en trois dimensions');
  host.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 250);
  camera.position.set(-8, 6.5, 10);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .09;
  controls.minDistance = 7; controls.maxDistance = 55;
  controls.minPolarAngle = .05; controls.maxPolarAngle = Math.PI - .05;
  controls.mouseButtons.MIDDLE = null;
  const kit = orbitalKit();
  const updateEnvironment = orbitalEnvironment(scene, kit);
  const world = new THREE.Group(); world.name = 'orbital-volume'; scene.add(world);
  const cubes = new Map();
  const portal = new THREE.Group(); world.add(portal);
  const portalProxy = kit.mesh(portal, kit.box, kit.invisible, [0, 0, 0], [.6, 1.2, 1.2]); portalProxy.userData.index = 27;
  const portalGlow = kit.material(0xffd7a0, { emissive: 0xffba66, emissiveIntensity: 1.1 });
  for (const radius of [.42, .55]) {
    const ring = kit.mesh(portal, kit.geometry(new THREE.TorusGeometry(radius, .055, 8, 40)), portalGlow);
    ring.rotation.y = Math.PI / 2;
  }
  const entrance = new THREE.Group(); world.add(entrance);
  const entranceProxy = kit.mesh(entrance, kit.box, kit.invisible, [0, 0, 0], [.8, .8, .8]); entranceProxy.userData.index = -1;
  kit.mesh(entrance, kit.box, kit.silver, [0, -.32, 0], [.8, .12, .8]);
  const empty = new THREE.Group(); empty.name = 'orbital-empty'; world.add(empty);
  const emptyMaterial = new THREE.LineDashedMaterial({ color: 0xffd19b, dashSize: .13, gapSize: .08 });
  kit.materials.add(emptyMaterial);
  const emptyFrame = new THREE.LineSegments(kit.frame, emptyMaterial); emptyFrame.computeLineDistances(); empty.add(emptyFrame);
  const emptyProxy = kit.mesh(empty, kit.box, kit.invisible, [0, 0, 0], [1.15, 1.15, 1.15]);
  const explorer = createExplorer({ THREE, style: callbacks.style, effectWorld: world, portalMount: portal });
  const hero = explorer.root; hero.scale.setScalar(.38); world.add(hero);
  kit.mesh(hero, kit.geometry(new THREE.SphereGeometry(.32, 20, 12)),
    kit.material(0xd6fff1, { transparent: true, opacity: .13, depthWrite: false, roughness: .08, metalness: .25 }), [0, .91, .015]);
  const relic = createCellFeature({ THREE, kind: 'relic', palette: { gold: 0xffd0a1, gem: 0xb2f7cc } });
  relic.root.scale.setScalar(.63); world.add(relic.root);
  const routeGeometry = kit.geometry(new THREE.BufferGeometry());
  const routeMaterial = new THREE.LineBasicMaterial({ color: 0xedf9b3, transparent: true, opacity: .95, depthTest: false });
  kit.materials.add(routeMaterial);
  const routeLine = new THREE.Line(routeGeometry, routeMaterial); routeLine.renderOrder = 5; world.add(routeLine);
  const safe = { top: 0, right: 0, bottom: 0, left: 0 };
  let state = null, mode = 'slide', selected = -2, hovered = -2;
  let active = true, disposed = false, raf = 0, lastTime = performance.now();
  let spread = 0, spreadTarget = 0, layer = -1, motion = null, heading = 0;
  let pendingSettle = false, pendingVictory = false, relicTaken = null;
  let pointer = null, dragged = false;
  const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2();
  const point = index => new THREE.Vector3(...Object.values(volumePosition(index, spread)));
  const heroPoint = index => point(index).add(new THREE.Vector3(0, -.28, 0));
  const visibleLayer = index => layer < 0 || Math.floor(Math.max(0, Math.min(26, index)) / 9) === layer;

  function frameCamera(top = false) {
    const width = host.clientWidth || 1, height = host.clientHeight || 1;
    const availableWidth = Math.max(180, width - safe.left - safe.right);
    const availableHeight = Math.max(220, height - safe.top - safe.bottom);
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const angle = Math.atan(tangent * Math.min(availableWidth, availableHeight) / height);
    const radius = layer < 0 ? 3.3 + spreadTarget * .75 : 2.8;
    const distance = radius / Math.sin(angle);
    const direction = top ? new THREE.Vector3(.01, 1, .001) : new THREE.Vector3(-8, 6.5, 10).normalize();
    controls.target.set(0, layer < 0 ? 0 : volumePosition(layer * 9, spreadTarget).y, 0);
    camera.position.copy(direction.multiplyScalar(distance)).add(controls.target);
    camera.aspect = width / height;
    camera.setViewOffset(width, height, (safe.right - safe.left) / 2, (safe.bottom - safe.top) / 2, width, height);
    camera.updateProjectionMatrix(); controls.update();
  }
  function resize() {
    if (!host.clientWidth || !host.clientHeight || disposed) return;
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    frameCamera();
  }
  function updatePreview() {
    const destination = state?.hint?.type === 'walk' ? state.hint.index : mode === 'walk' ? (selected >= -1 ? selected : hovered) : -2;
    const route = findWalkPreview(state, destination);
    const positions = route.flatMap(index => point(index).toArray());
    routeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    routeGeometry.computeBoundingSphere();
    routeLine.visible = !motion && route.length > 1;
  }
  function colors() {
    for (const cube of cubes.values()) {
      const reachable = state?.reachable.includes(cube.index);
      const slidable = state?.slidable.includes(cube.index);
      const highlight = cube.index === hovered || cube.index === selected || state?.hint?.index === cube.index;
      const color = highlight ? 0xffd1a1 : mode === 'slide' && slidable ? 0xf1dd9c : reachable ? 0xa2f0d2 : 0x567b7e;
      cube.outline.color.set(color); cube.outline.opacity = highlight ? 1 : .7;
      cube.glow.color.set(color); cube.glow.emissive.set(color);
      cube.glow.emissiveIntensity = highlight ? 1.3 : reachable ? .9 : .25;
    }
    updatePreview();
  }
  function interactions() {
    if (!state || !hasReachedCell(motion, state.relic.index) || relicTaken === state.relic.taken) return;
    const previous = relicTaken;
    relicTaken = state.relic.taken;
    relic.set(relicTaken);
    if (relicTaken && previous === false) explorer.react('treasure');
    callbacks.onInteractions?.({ gameId: state.id, relicTaken, gatesOpen: true, descentRevealed: false });
  }
  function update(next, nextMode, focus = -2) {
    if (!next) return;
    const previous = state;
    state = next; mode = nextMode; selected = focus;
    const fresh = previous?.id !== next.id;
    if (fresh) {
      motion = null; relicTaken = null; pendingVictory = false;
      explorer.react('reset'); hero.position.copy(heroPoint(next.hero));
    }
    const present = new Set(next.tiles.filter(Boolean).map(tile => tile.id));
    for (const [id, cube] of cubes) if (!present.has(id)) { cube.dispose(); cubes.delete(id); }
    next.tiles.forEach((tile, index) => {
      if (!tile) { emptyProxy.userData.index = index; return; }
      let cube = cubes.get(tile.id);
      if (!cube) { cube = kit.cube(tile); cubes.set(tile.id, cube); world.add(cube.root); cube.root.position.copy(point(index)); }
      cube.index = index; cube.proxy.userData.index = index;
      cube.target.copy(point(index));
      if (fresh) cube.root.position.copy(cube.target);
    });
    if (!fresh && previous.hero !== next.hero) {
      if (next.walkPath?.length > 1) {
        const points = [hero.position.clone(), ...next.walkPath.slice(1).map(heroPoint)];
        const distances = [0];
        for (let index = 1; index < points.length; index++) distances.push(distances[index - 1] + points[index].distanceTo(points[index - 1]));
        motion = { route: createRouteMotion(points, 2.65), path: next.walkPath, distances, distance: 0, startedAt: performance.now() / 1000 };
      } else { motion = null; hero.position.copy(heroPoint(next.hero)); }
    }
    pendingSettle ||= next !== previous;
    pendingVictory ||= next.won && !previous?.won;
    if (!next.won) pendingVictory = false;
    interactions(); colors();
  }
  function pick(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    mouse.set((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    raycaster.setFromCamera(mouse, camera);
    const proxies = [...cubes.values()].filter(cube => visibleLayer(cube.index)).map(cube => cube.proxy);
    if (state && visibleLayer(emptyProxy.userData.index)) proxies.push(emptyProxy);
    if (visibleLayer(0)) proxies.push(entranceProxy);
    if (visibleLayer(26)) proxies.push(portalProxy);
    const hit = raycaster.intersectObjects(proxies, false)[0];
    return hit?.object.userData.index ?? -2;
  }
  function move(event) {
    if (pointer && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 5) dragged = true;
    const index = pick(event);
    if (index === hovered) return;
    hovered = index; callbacks.onHover?.(index); colors();
    renderer.domElement.style.cursor = index >= 0 ? 'pointer' : 'grab';
  }
  function leave() { hovered = -2; callbacks.onHover?.(-2); colors(); }
  function down(event) { pointer = { x: event.clientX, y: event.clientY }; dragged = false; }
  function up(event) { if (event.button === 1 && !dragged) callbacks.onModeToggle?.(); pointer = null; }
  function click(event) { if (!dragged) { const index = pick(event); if (index >= -1) callbacks.onTile?.(index); } }
  function orbit() { if (pointer && dragged) callbacks.onOrbit?.(); }
  function contextLost(event) { event.preventDefault(); callbacks.onError?.('Le rendu spatial a ete interrompu. Rechargez la page.'); }
  for (const [event, handler] of [['pointermove', move], ['pointerleave', leave], ['pointerdown', down], ['pointerup', up], ['click', click], ['webglcontextlost', contextLost]]) renderer.domElement.addEventListener(event, handler);
  controls.addEventListener('change', orbit);
  const observer = new ResizeObserver(resize); observer.observe(host); resize();

  function animate(now) {
    if (disposed || !active) return;
    const time = now / 1000, dt = Math.min(.05, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
    spread += (spreadTarget - spread) * (1 - Math.exp(-dt * 12));
    if (Math.abs(spread - spreadTarget) < .001) spread = spreadTarget;
    controls.update();
    let settling = Math.abs(spread - spreadTarget) > .001;
    for (const cube of cubes.values()) {
      cube.target.copy(point(cube.index));
      cube.root.position.lerp(cube.target, 1 - Math.exp(-dt * 17));
      cube.root.visible = visibleLayer(cube.index);
      cube.core.rotation.y = time * .35;
      if (cube.root.position.distanceTo(cube.target) > .004) settling = true;
    }
    entrance.position.copy(point(-1)); entrance.visible = visibleLayer(0);
    portal.position.copy(point(27)); portal.visible = visibleLayer(26);
    portal.rotation.x = time * .15;
    empty.position.copy(point(emptyProxy.userData.index ?? 0)); empty.visible = visibleLayer(emptyProxy.userData.index ?? 0);
    let distance = 0;
    const moving = Boolean(motion);
    if (motion) {
      const sample = motion.route.sample(time - motion.startedAt);
      distance = sample.distance - motion.distance; motion.distance = sample.distance;
      hero.position.set(sample.position.x, sample.position.y, sample.position.z);
      if (sample.heading !== null) heading = sample.heading;
      if (sample.complete) motion = null;
    } else if (state) hero.position.copy(heroPoint(state.hero));
    hero.visible = true;
    hero.rotation.y += Math.atan2(Math.sin(heading - hero.rotation.y), Math.cos(heading - hero.rotation.y)) * (1 - Math.exp(-dt * 12));
    explorer.update(time, dt, { moving, distance, interest: relicTaken ? 0 : .25 });
    if (state) {
      relic.root.position.copy(point(state.relic.index)).add(new THREE.Vector3(0, .05, 0));
      interactions(); relic.update(time);
      if (!visibleLayer(state.relic.index)) relic.root.visible = false;
    }
    if (pendingSettle && !motion && !settling) {
      pendingSettle = false;
      if (pendingVictory) { pendingVictory = false; explorer.react('victory'); callbacks.onVictory?.(); }
      colors(); callbacks.onSettled?.();
    }
    if (spread !== spreadTarget) updatePreview();
    updateEnvironment(time); renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate); callbacks.onReady?.();
  return {
    update,
    setSafeArea(insets) { Object.assign(safe, insets); resize(); },
    setView(view) { if (view !== 'free') frameCamera(view === 'top'); },
    setVolumeView(view) { spreadTarget = view.expanded ? 1 : 0; layer = view.layer ?? -1; frameCamera(); updatePreview(); },
    setExplorerStyle(style) { explorer.setStyle(style); },
    setActive(value) {
      if (active === value || disposed) return;
      active = value; cancelAnimationFrame(raf);
      if (active) { lastTime = performance.now(); resize(); raf = requestAnimationFrame(animate); }
    },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      controls.removeEventListener('change', orbit); controls.dispose();
      for (const [event, handler] of [['pointermove', move], ['pointerleave', leave], ['pointerdown', down], ['pointerup', up], ['click', click], ['webglcontextlost', contextLost]]) renderer.domElement.removeEventListener(event, handler);
      explorer.dispose(); relic.dispose(); kit.dispose(); renderer.dispose(); renderer.domElement.remove(); renderer.forceContextLoss();
    },
  };
}

export function createSpaceMapScene(canvas, stops, completed, onProject, levels = []) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(), kit = orbitalKit();
  const updateEnvironment = orbitalEnvironment(scene, kit);
  const camera = new THREE.PerspectiveCamera(38, 1, .1, 250);
  camera.position.set(0, 13, 16); camera.lookAt(0, 0, 0);
  const locations = stops.map(stop => new THREE.Vector3((stop.x - 500) * .012, 0, (stop.y - 450) * .012));
  const moonRock = kit.material(0xc4c8c4, { metalness: 0, roughness: 1 });
  const craterSurface = kit.material(0x788481, { metalness: 0, roughness: 1 });
  const craterShape = kit.geometry(new THREE.CircleGeometry(.068, 14));
  const stations = locations.map((position, order) => {
    const station = new THREE.Group(); station.position.copy(position); scene.add(station);
    const lunar = levels[order]?.region === 'moon';
    if (stops.length > 5) station.scale.setScalar(.68);
    station.name = lunar ? 'lunar-destination' : 'orbital-destination';
    for (let index = 0; index < 27; index++) {
      if (index === 8) continue;
      const point = volumePosition(index);
      kit.mesh(station, kit.box, completed[order] ? kit.copper : lunar ? moonRock : kit.silver,
        [point.x * .2, point.y * .2, point.z * .2], lunar ? [.30, .30, .30] : [.255, .255, .255]);
      if (lunar && index >= 18) {
        const crater = kit.mesh(station, craterShape, craterSurface, [point.x * .2 + .035, point.y * .2 + .151, point.z * .2 - .025]);
        crater.rotation.x = -Math.PI / 2;
      }
    }
    const orbit = kit.mesh(station, kit.geometry(new THREE.TorusGeometry(.85, .018, 6, 48)), kit.copper);
    orbit.rotation.x = Math.PI / 2;
    orbit.visible = !lunar;
    return station;
  });
  const route = kit.geometry(new THREE.BufferGeometry().setFromPoints(locations));
  const routeMaterial = new THREE.LineDashedMaterial({ color: 0xa2e1c4, dashSize: .14, gapSize: .12, transparent: true, opacity: .7 });
  kit.materials.add(routeMaterial);
  const line = new THREE.Line(route, routeMaterial); line.computeLineDistances(); scene.add(line);
  let raf, disposed = false;
  function resize() {
    if (!canvas.clientWidth || !canvas.clientHeight || disposed) return;
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix();
    camera.position.set(0, 13, 16).multiplyScalar(Math.max(1, 1 / camera.aspect)); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    onProject(locations.map(location => { const projected = location.clone().project(camera); return { x: (projected.x + 1) * 50, y: (1 - projected.y) * 50 }; }));
    renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  function animate(now) {
    if (disposed) return;
    if (!document.hidden) {
      const time = now / 1000;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) stations.forEach((station, index) => { station.rotation.y = Math.sin(time * .12 + index) * .25; });
      updateEnvironment(time); renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);
  return () => { disposed = true; cancelAnimationFrame(raf); observer.disconnect(); kit.dispose(); renderer.dispose(); if (!canvas.isConnected) renderer.forceContextLoss(); };
}