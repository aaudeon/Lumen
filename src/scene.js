import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createJungleEnvironment } from './jungle.js';
import { BIOME_PALETTES, createBiomeEnvironment } from './biomes.js';
import { createExplorer } from './explorer.js';
import { createPixelTextures } from './textures.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createRouteMotion, findWalkPreview } from './motion.js';
import { createTileHazard, createCollapseEffects, createGuardian, createCellFeature } from './hazards.js';
import { createBoardTextures } from './board-textures.js';
import { getBoardProfile, createBoardStructure, createTileScenery } from './boards.js';

const GAP = 1.34;
const DIR = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const palette = { stone: 0x70827c, edge: 0x3e514f, path: 0xd5c9a6, active: 0x8be9cd, gold: 0xf5d38b };
/** Vertical angle the playable board is framed with, inside the free area left by the interface. */
const BASE_FOV = 34;
/** Beyond this the wide-angle stretch on the screen corners becomes visible. */
const MAX_FOV = 78;
const FIT_MARGIN = 1.05;
/** Ceiling on device pixels: full bleed on a high-density screen would otherwise quadruple fragment cost. */
const PIXEL_BUDGET = 3.2e6;
const BASE_TAN = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));
const ISO_DIR = new THREE.Vector3(8.1, 10.1, 11.5).normalize();
const TOP_DIR = new THREE.Vector3(0.01, 17.8, 0.9).normalize();
const ORIGIN = new THREE.Vector3();

export function createGameScene(host, callbacks) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x193b2d, 0.026);
  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x15272e, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.domElement.setAttribute('aria-label', 'Plateau 3D interactif. Cliquez sur une dalle. Les commandes clavier sont disponibles dans l’aide.');
  renderer.domElement.setAttribute('role', 'img');
  host.appendChild(renderer.domElement);
  const composer = new EffectComposer(renderer);
  composer.renderTarget1.samples = 4;
  composer.renderTarget2.samples = 4;
  const renderPass = new RenderPass(scene, camera);
  const glowPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 resolution; varying vec2 vUv;
      void main(){
        vec4 base=texture2D(tDiffuse,vUv);vec3 glow=vec3(0.0);
        for(int x=-2;x<=2;x++){for(int y=-2;y<=2;y++){
          vec3 sampleColor=texture2D(tDiffuse,vUv+vec2(float(x),float(y))*3.0/resolution).rgb;
          glow+=max(sampleColor-vec3(1.0),vec3(0.0))/(1.0+float(x*x+y*y));
        }}
        glow*=0.055;
        float coverage=max(base.a,clamp(dot(glow,vec3(0.3,0.6,0.1)),0.0,0.38));
        gl_FragColor=vec4(base.rgb+glow,coverage);
      }`,
  });
  const outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(glowPass);
  composer.addPass(outputPass);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, -0.05, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;
  controls.minPolarAngle = 0.08;
  controls.maxPolarAngle = Math.PI * 0.43;
  controls.minDistance = 8;
  controls.maxDistance = 27;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

  const ambientLight = new THREE.HemisphereLight(0x9fc6c0, 0x12271b, 0.85);
  scene.add(ambientLight);
  const sun = new THREE.DirectionalLight(0xffd593, 4.1);
  sun.position.set(-5, 10, -3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -7;
  sun.shadow.camera.right = 7;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -7;
  sun.shadow.normalBias = 0.065;
  sun.shadow.bias = -0.0007;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x78b6b1, 1.4);
  rim.position.set(5, 3, -5);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);
  const scenery = new THREE.Group();
  world.add(scenery);
  const tiles = new Map();
  const blankMarkers = [];
  const collapseEffects = createCollapseEffects({ THREE, world });
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let state = null;
  let mode = 'slide';
  let hovered = -2;
  let focus = -2;
  let topView = false;
  let cameraTransition = false;
  let pointerOrigin = null;
  let dragged = false;
  let disposed = false;
  let active = true;
  let raf = 0;
  let lastTime = performance.now();
  let shadowStamp = 0;
  let heroMotion = null;
  let heroHeading = 0;
  let currentLevel = null;
  let currentBiome = 'jungle';
  let boardProfile = getBoardProfile('aube');
  let biomePalette = BIOME_PALETTES.jungle;
  let winTime = -100;
  let pendingSettle = false;
  let pendingVictory = false;
  let pendingTreasure = false;
  const heroWorld = new THREE.Vector3();
  const materials = new Set();
  const geometries = new Set();
  const pixelTextures = createPixelTextures(THREE);
  const boardTextures = createBoardTextures(THREE);
  const architecture = createBoardStructure({ THREE, world, textures: boardTextures });

  function material(color, options = {}) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options });
    materials.add(mat);
    return mat;
  }
  function mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
    geometries.add(geo);
    const object = new THREE.Mesh(geo, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(parent, w, h, d, mat, x = 0, y = 0, z = 0, radius = 0.05) {
    return mesh(new RoundedBoxGeometry(w, h, d, 2, radius), mat, parent, x, y, z);
  }
  function cellPosition(index) {
    if (index === -1) return new THREE.Vector3(-3.02 * boardProfile.sx, 0.36, -1.5 * GAP * boardProfile.sz);
    if (index === 16) return new THREE.Vector3(3.04 * boardProfile.sx, 0.36, 1.5 * GAP * boardProfile.sz);
    return new THREE.Vector3((index % 4 - 1.5) * GAP * boardProfile.sx, 0.36, (Math.floor(index / 4) - 1.5) * GAP * boardProfile.sz);
  }
  function heroPosition(index) {
    const position = cellPosition(index);
    position.y = index === -1 || index === 16 ? 0.15 : 0.435;
    return position;
  }

  const rockMat = material(0x667165, { flatShading: true, map: pixelTextures.soil });
  const baseMat = material(0xb5c2ae, { map: pixelTextures.stone });
  const rimMat = material(0xe3d1a8, { metalness: 0.1, map: pixelTextures.path });
  const darkMat = material(0x68746b, { map: pixelTextures.stone });
  const goldMat = material(palette.gold, { emissive: 0xc89340, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.35 });

  const startPosition = cellPosition(-1);
  const endPosition = cellPosition(16);
  const entryPlatform = box(world, 0.8, 0.28, 1.02, baseMat, startPosition.x - 0.04, 0.0, startPosition.z);
  const exitPlatform = box(world, 0.8, 0.28, 1.02, baseMat, endPosition.x + 0.03, 0.0, endPosition.z);
  const portal = new THREE.Group();
  portal.position.copy(endPosition).add(new THREE.Vector3(0.1, -0.21, 0));
  world.add(portal);
  for (const z of [-0.42, 0.42]) {
    box(portal, 0.31, 1.22, 0.27, baseMat, 0, 0.61, z, 0.055);
    box(portal, 0.35, 0.1, 0.33, rimMat, 0, 1.12, z, 0.02);
    box(portal, 0.33, 0.12, 0.35, rimMat, 0, 0.08, z, 0.025);
  }
  box(portal, 0.36, 0.23, 1.18, rimMat, 0, 1.27, 0, 0.065);
  const portalCrystal = mesh(new THREE.OctahedronGeometry(0.17), goldMat, portal, 0, 1.54, 0);
  const portalRing = mesh(new THREE.TorusGeometry(0.34, 0.016, 6, 48), goldMat, portal, 0.015, 0.7, 0);
  portalRing.rotation.y = Math.PI / 2;
  const portalLight = new THREE.PointLight(0x7dfbdd, 3, 3);
  portalLight.position.set(0, 0.65, 0);
  portal.add(portalLight);

  const explorer = createExplorer({ THREE, style: callbacks.style, effectWorld:world, portalMount:portal });
  const hero = explorer.root;
  world.add(hero);
  const heroRing = mesh(new THREE.TorusGeometry(0.29, 0.012, 5, 32), goldMat, hero, 0, 0.012, 0);
  heroRing.rotation.x = -Math.PI / 2;
  const dustGeometry = new THREE.BoxGeometry(0.047, 0.047, 0.047);
  const dustMaterial = material(0xab9d69, { roughness: 1 });
  const dust = Array.from({length: 24}, () => {
    const bit = mesh(dustGeometry, dustMaterial, world);
    bit.castShadow = bit.receiveShadow = false;
    bit.visible = false;
    return { mesh: bit, age: 1, velocity: new THREE.Vector3() };
  });
  let dustCursor = 0;

  const previewGeometry = new THREE.CircleGeometry(0.047, 6);
  geometries.add(previewGeometry);
  const previewMaterial = new THREE.MeshBasicMaterial({color:0xe0fff1,transparent:true,opacity:.95,toneMapped:false});
  materials.add(previewMaterial);
  const previewDots = new THREE.InstancedMesh(previewGeometry, previewMaterial, 180);
  previewDots.count = 0;
  previewDots.frustumCulled = false;
  world.add(previewDots);
  const previewTransform = new THREE.Object3D();
  const previewRingMaterial = new THREE.MeshBasicMaterial({color:0xafffe0,transparent:true,opacity:.75,toneMapped:false});
  materials.add(previewRingMaterial);
  const previewRing = mesh(new THREE.TorusGeometry(.21,.012,5,32), previewRingMaterial, world);
  previewRing.rotation.x = -Math.PI / 2;
  previewRing.castShadow = false;
  previewRing.visible = false;

  function updatePreview() {
    const destination = state?.hint?.type === 'walk' ? state.hint.index : mode === 'walk' ? (focus >= -1 ? focus : hovered) : -2;
    const route = findWalkPreview(state, destination);
    let count = 0;
    for (let i = 1; i < route.length; i++) {
      const from = heroPosition(route[i - 1]);
      const to = heroPosition(route[i]);
      const steps = Math.ceil(from.distanceTo(to) / .19);
      for (let j = 1; j <= steps && count < 180; j++) {
        previewTransform.position.lerpVectors(from, to, j / steps);
        previewTransform.position.y += .038;
        previewTransform.rotation.set(-Math.PI / 2, 0, 0);
        previewTransform.updateMatrix();
        previewDots.setMatrixAt(count++, previewTransform.matrix);
      }
    }
    previewDots.count = heroMotion ? 0 : count;
    previewDots.instanceMatrix.needsUpdate = true;
    previewRing.visible = count > 0 && !heroMotion;
    if (previewRing.visible) { previewRing.position.copy(heroPosition(destination)); previewRing.position.y += .04; }
  }
  // All world particles share a small radial canvas texture.
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 64;
  const ctx = glowCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.12, '#fff7d8');
  gradient.addColorStop(0.4, 'rgba(255,246,203,.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const glowTexture = new THREE.CanvasTexture(glowCanvas);
  const particleCount = 145;
  const positions = new Float32Array(particleCount * 3);
  const origins = [];
  for (let i = 0; i < particleCount; i++) {
    origins.push({ x: Math.sin(i * 127.1) * 7.5, y: ((i * 19) % 73) / 12 - 2.5, z: Math.cos(i * 39.43) * 6.5 });
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometries.add(particleGeo);
  const particleMat = new THREE.PointsMaterial({ color: 0xe5dca4, size: 0.09, map: glowTexture, transparent: true,
    depthWrite: false, opacity: 0.6, blending: THREE.AdditiveBlending });
  materials.add(particleMat);
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);
  const sparksGeo = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array(100 * 3);
  sparksGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  geometries.add(sparksGeo);
  const sparksMat = new THREE.PointsMaterial({ color: 0xffd588, size: 0.14, map: glowTexture, transparent: true,
    depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending });
  materials.add(sparksMat);
  const sparks = new THREE.Points(sparksGeo, sparksMat);
  scene.add(sparks);

  const jungle = createJungleEnvironment({ THREE, scene, world: scenery, textures: pixelTextures });
  const biomeEnvironment = createBiomeEnvironment({ THREE, world: scenery, maps: pixelTextures, boardTextures });
  const shaftMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0xffd286) } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv; uniform vec3 color; void main(){float edge=pow(sin(vUv.x*3.14159),2.0); float fade=smoothstep(0.0,0.16,vUv.y)*(1.0-smoothstep(0.7,1.0,vUv.y));gl_FragColor=vec4(color,edge*fade*0.075);}',
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  materials.add(shaftMat);
  const shafts = new THREE.Group();
  scene.add(shafts);
  for (let i = 0; i < 6; i++) {
    const shaft = mesh(new THREE.PlaneGeometry(0.35 + i % 3 * 0.2, 7.6), shaftMat, shafts, -2.6 + i * 0.78, 2.5, -1.3 + i % 2 * .7);
    shaft.rotation.z = -0.43;
    shaft.rotation.y = -0.38;
    shaft.castShadow = shaft.receiveShadow = false;
  }

  const floatingRocks = [];
  for (const [x, y, z, s] of [[-4.6, -1.9, 0.3, 0.47], [3.8, -1.5, -3, 0.6], [1.8, -2.4, 4, 0.25], [-1.6, -2, -4.2, 0.22]]) {
    const stone = mesh(new THREE.DodecahedronGeometry(s, 0), rockMat, scene, x, y, z);
    stone.rotation.set(x, z, y);
    stone.userData.baseY = y;
    floatingRocks.push(stone);
  }

  const blankMat = material(0x57736e, { emissive: 0x40665c, emissiveIntensity: 0.1 });
  const blankProxyMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
  materials.add(blankProxyMaterial);
  for (let index = 0; index < 16; index++) {
    const marker = new THREE.Group();
    marker.position.copy(cellPosition(index));
    marker.position.y = .018;
    marker.visible = false;
    world.add(marker);
    const highlight = material(0x98cfb5, { emissive: 0x40665c, emissiveIntensity: .3 });
    for (const [x, z] of [[-.48, -.48], [.48, -.48], [-.48, .48], [.48, .48]]) {
      box(marker, .19, .012, .027, highlight, x - Math.sign(x) * .065, 0, z, .005);
      box(marker, .027, .012, .19, highlight, x, 0, z - Math.sign(z) * .065, .005);
    }
    const floor = box(marker, 1.14, .012, 1.14, blankMat, 0, -.014, 0, .025);
    floor.castShadow = false;
    const proxy = mesh(new THREE.PlaneGeometry(1.26, 1.26), blankProxyMaterial, marker, 0, .08, 0);
    proxy.rotation.x = -Math.PI / 2;
    proxy.castShadow = proxy.receiveShadow = false;
    proxy.userData.emptyIndex = index;
    blankMarkers.push({ group: marker, proxy, highlight, index });
  }

  // Crocodiles that patrol cells, plus a discreet mark on the cell they head for.
  const guardians = [];
  const guardMat = new THREE.MeshBasicMaterial({ color: 0x9ee8c6, transparent: true, opacity: .6, toneMapped: false, side: THREE.DoubleSide });
  materials.add(guardMat);
  function addGuardian() {
    const actor = createGuardian({ THREE, seed: guardians.length * 2.7 });
    world.add(actor.root);
    const marker = new THREE.Group();
    marker.visible = false;
    world.add(marker);
    const ring = mesh(new THREE.TorusGeometry(.36, .018, 5, 26), guardMat, marker, 0, .05, 0);
    ring.rotation.x = -Math.PI / 2;
    ring.castShadow = ring.receiveShadow = false;
    for (let i = 0; i < 2; i++) {
      const chevron = mesh(new THREE.ConeGeometry(.1, .16, 3), guardMat, marker, 0, .06, -.1 + i * .19);
      chevron.rotation.x = -Math.PI / 2;
      chevron.castShadow = chevron.receiveShadow = false;
    }
    const entry = { actor, marker, target: new THREE.Vector3(), next: -1 };
    guardians.push(entry);
    return entry;
  }
  function syncGuardians() {
    const list = state?.guardians || [];
    while (guardians.length > list.length) {
      const gone = guardians.pop();
      gone.actor.dispose();
      gone.marker.removeFromParent();
    }
    while (guardians.length < list.length) {
      const fresh = addGuardian();
      fresh.actor.root.position.copy(cellPosition(list[guardians.length - 1].index));
    }
    list.forEach((info, order) => {
      const entry = guardians[order];
      entry.target.copy(cellPosition(info.index));
      entry.next = info.next;
      entry.marker.visible = info.next !== info.index;
      if (entry.marker.visible) {
        entry.marker.position.copy(cellPosition(info.next));
        entry.marker.position.y = .38;
        const towards = cellPosition(info.next).sub(cellPosition(info.index));
        entry.marker.rotation.y = Math.atan2(towards.x, towards.z);
      }
    });
  }

  // Pressure seals, levers and the level's optional treasure belong to a cell.
  const features = [];
  function syncFeatures() {
    const wanted = [
      ...(state?.seals || []).map(seal => ({ kind: 'seal', index: seal.index, value: seal.pressed })),
      ...(state?.levers || []).map(lever => ({ kind: 'lever', index: lever.index, value: lever.pulled })),
      ...(state?.relic ? [{ kind: 'relic', index: state.relic.index, value: state.relic.taken }] : []),
    ];
    const same = features.length === wanted.length
      && features.every((item, order) => item.kind === wanted[order].kind && item.index === wanted[order].index);
    if (!same) {
      features.forEach(item => item.feature.dispose());
      features.length = 0;
      for (const item of wanted) {
        const feature = createCellFeature({ THREE, kind: item.kind,
          palette: { gold: biomePalette.gold, gem: biomePalette.connectedGlow } });
        world.add(feature.root);
        features.push({ ...item, feature });
      }
    }
    features.forEach((item, order) => {
      item.feature.set(wanted[order].value);
      item.feature.root.position.copy(cellPosition(item.index));
      // A fitting left over a hole settles to the bottom of the pit.
      item.feature.root.position.y = state?.tiles[item.index] ? .36 : .04;
    });
  }

  function buildTile(tile, index) {
    const group = new THREE.Group();
    const variant = [...tile.id].reduce((sum, char) => sum + char.charCodeAt(0), boardProfile.variant) % 3;
    const maps = boardTextures.get(boardProfile.biome, variant);
    const tileMat = material(0xffffff, { map: maps.top, bumpMap: maps.top, bumpScale: .012, roughness: boardProfile.biome === 'atlantis' ? .46 : .92 });
    const tileEdge = material(0xffffff, { map: maps.edge, bumpMap: maps.edge, bumpScale: .028 });
    const pathMat = material(0xffffff, { map: maps.path, metalness: boardProfile.biome === 'atlantis' ? .18 : .04, roughness: .7 });
    const traceMat = material(0xeadcab, { emissive: 0x97ccb2, emissiveIntensity: 0.15 });
    let edge, top;
    if (boardProfile.biome === 'volcano') {
      const shape = new THREE.Shape();
      const cut = .12 + variant * .025;
      [[-.62+cut,-.62],[.62-cut,-.62],[.62,-.62+cut],[.62,.62-cut],[.62-cut,.62],[-.62+cut,.62],[-.62,.62-cut],[-.62,-.62+cut]].forEach(([x,y],i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y));
      shape.closePath();
      const slab = (height,surface,y) => {
        const geometry = new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});
        geometry.rotateX(-Math.PI/2);
        return mesh(geometry,surface,group,0,y,0);
      };
      edge=slab(.29,tileEdge,-.34);top=slab(.13,tileMat,-.11);
    } else {
      edge = box(group, 1.25, 0.3, 1.25, tileEdge, 0, -0.19, 0, boardProfile.biome === 'atlantis' ? .09 : .045);
      top = box(group, 1.23, 0.145, 1.23, tileMat, 0, -0.05, 0, boardProfile.biome === 'atlantis' ? .065 : .025);
      if (boardProfile.biome === 'atlantis') box(group,1.255,.026,1.255,pathMat,0,-.115,0,.04);
    }
    edge.userData.tileId = tile.id;
    top.userData.tileId = tile.id;
    // Broad stone walkways with fine luminous inlays make connections readable.
    if (tile.ports.length) {
      box(group, 0.39, 0.043, 0.39, pathMat, 0, 0.043, 0, 0.035);
      for (const port of tile.ports) {
        const [dx, dz] = DIR[port];
        box(group, dx ? 0.43 : 0.39, 0.043, dz ? 0.43 : 0.39, pathMat, dx * 0.41, 0.043, dz * 0.41, 0.008);
        box(group, dx ? 0.66 : 0.035, 0.014, dz ? 0.66 : 0.035, traceMat, dx * 0.3, 0.071, dz * 0.3, 0.009);
      }
      const seal = mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.015, 12), traceMat, group, 0, 0.079, 0);
      seal.castShadow = false;
    } else {
      const engraving = box(group, 0.22, 0.011, 0.22, tileEdge, 0, 0.028, 0, 0.02);
      engraving.rotation.y = Math.PI / 4;
      box(group, 0.1, 0.013, 0.1, tileMat, 0, 0.035, 0, 0.02).rotation.y = Math.PI / 4;
    }
    const details = createTileScenery({ THREE, tile, profile: boardProfile });
    group.add(details.root);
    const numberCanvas = document.createElement('canvas');
    numberCanvas.width = numberCanvas.height = 64;
    const numberCtx = numberCanvas.getContext('2d');
    numberCtx.fillStyle = 'rgba(223,229,208,0.65)';
    numberCtx.font = '500 31px sans-serif';
    numberCtx.textAlign = 'center';
    numberCtx.textBaseline = 'middle';
    numberCtx.fillText(String(index + 1).padStart(2, '0'), 32, 32);
    const texture = new THREE.CanvasTexture(numberCanvas);
    const numberMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    materials.add(numberMat);
    const number = mesh(new THREE.PlaneGeometry(0.2, 0.2), numberMat, group, .41, .034, -.43);
    number.rotation.x = -Math.PI / 2;
    number.castShadow = false;
    const arrowShape = new THREE.Shape();
    arrowShape.moveTo(0,.13); arrowShape.lineTo(-.09,-.01); arrowShape.lineTo(-.033,-.01);
    arrowShape.lineTo(-.033,-.10); arrowShape.lineTo(.033,-.10); arrowShape.lineTo(.033,-.01);
    arrowShape.lineTo(.09,-.01); arrowShape.closePath();
    const arrowMaterial = new THREE.MeshBasicMaterial({color:0xf3d58a,transparent:true,opacity:.88,toneMapped:false,side:THREE.DoubleSide});
    materials.add(arrowMaterial);
    const arrows = Array.from({ length: 4 }, () => {
      const arrow = new THREE.Group();
      const arrowFace = mesh(new THREE.ShapeGeometry(arrowShape), arrowMaterial, arrow);
      arrowFace.rotation.x = -Math.PI / 2;
      arrowFace.castShadow = false;
      arrow.visible = false;
      group.add(arrow);
      return arrow;
    });
    const hazard = createTileHazard({ THREE, tile, biome:boardProfile.biome });
    group.add(hazard.root);
    group.scale.set(boardProfile.sx, 1, boardProfile.sz);
    group.position.copy(cellPosition(index));
    world.add(group);
    const data = { group, tileMat, tileEdge, pathMat, traceMat, target: cellPosition(index), index, texture, arrows,
      hazard, details, tile, collapseDistance: null, fallStartedAt: null };
    tiles.set(tile.id, data);
    return data;
  }

  function removeTile(id, data) {
    data.hazard.dispose();
    data.details.dispose();
    world.remove(data.group);
    const oldMaterials = new Set();
    data.group.traverse(object => {
      if (object.geometry) { object.geometry.dispose(); geometries.delete(object.geometry); }
      if (object.material) oldMaterials.add(object.material);
    });
    oldMaterials.forEach(mat => { mat.dispose(); materials.delete(mat); });
    data.texture.dispose();
    tiles.delete(id);
  }

  function updateBlankMarkers() {
    if (!state) return;
    for (const marker of blankMarkers) {
      const waiting = [...tiles.values()].some(data => data.index === marker.index && data.collapseDistance !== null && data.fallStartedAt === null);
      marker.group.visible = state.tiles[marker.index] === null && !waiting;
      const available = (state.slideOptions || []).some(option => option.index === focus && option.to === marker.index);
      const hilite = hovered === marker.index;
      marker.highlight.color.set(available || hilite ? biomePalette.gold : biomePalette.connected);
      marker.highlight.emissive.set(available ? biomePalette.goldGlow : biomePalette.connectedGlow);
      marker.highlight.emissiveIntensity = available ? 1.2 : hilite ? .7 : .25;
    }
  }

  function update(next, nextMode, selected = -2) {
    const previous = state;
    state = next;
    mode = nextMode;
    focus = selected;
    if (!next) return;
    if (currentLevel !== next.id) setBoardProfile(getBoardProfile(next.levelId));
    const nextBiome = Object.hasOwn(BIOME_PALETTES, next.biome) ? next.biome : 'jungle';
    if (nextBiome !== currentBiome) setBiome(nextBiome);
    if (next !== previous) pendingSettle = true;
    if (currentLevel !== next.id) {
      for (const [id, data] of tiles) removeTile(id, data);
      // Guardians belong to their level: rebuild them instead of gliding across the board.
      while (guardians.length) {
        const gone = guardians.pop();
        gone.actor.dispose();
        gone.marker.removeFromParent();
      }
      collapseEffects.clear();
      pendingTreasure = false;
      explorer.react('reset');
      currentLevel = next.id;
      hero.position.copy(heroPosition(next.hero));
      heroMotion = null;
      heroHeading = Math.atan2(camera.position.x, camera.position.z);
      hero.rotation.y = heroHeading;
    }
    next.tiles.forEach((tile, index) => {
      if (!tile) return;
      const data = tiles.get(tile.id) || buildTile(tile, index);
      if (data.tile.hazard !== tile.hazard || data.tile.flow !== tile.flow) {
        data.hazard.dispose();
        data.hazard = createTileHazard({ THREE, tile });
        data.group.add(data.hazard.root);
      }
      data.hazard.apply({ gatesOpen: next.gatesOpen, tide: next.tide, heading: tile.heading });
      if (data.collapseDistance !== null || data.fallStartedAt !== null) {
        data.group.position.copy(cellPosition(index));
        data.group.rotation.set(0, 0, 0);
      }
      data.tile = tile;
      data.index = index;
      data.target.copy(cellPosition(index));
      data.collapseDistance = data.fallStartedAt = null;
    });
    if (previous && previous.id === next.id && previous.hero !== next.hero) {
      if (next.walkPath?.length > 1) {
        const points = [hero.position.clone(), ...next.walkPath.slice(1).map(heroPosition)];
        const distances = [0];
        for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + points[i].distanceTo(points[i - 1]));
        const running = next.walkPath.some(index => previous.tiles[index]?.hazard === 'fragile' || next.tiles[index]?.hazard === 'fragile');
        heroMotion = { route: createRouteMotion(points, running ? 4.8 : 3.4), path: next.walkPath, distances,
          startedAt: performance.now() / 1000, distance: 0 };
      } else {
        heroMotion = null;
        hero.position.copy(heroPosition(next.hero));
      }
    }
    if (next !== previous) {
      const present = new Set(next.tiles.filter(Boolean).map(tile => tile.id));
      for (const [id, data] of tiles) {
        if (present.has(id)) continue;
        const collapse = next.collapsed?.find(event => event.tileId === id);
        if (collapse && heroMotion && heroMotion.distances[collapse.pathStep + 1] != null) {
          const start = heroMotion.distances[collapse.pathStep];
          const end = heroMotion.distances[collapse.pathStep + 1];
          // Leave enough space for both feet before the stone drops behind the runner.
          data.collapseDistance = start + (end - start) * .72;
          data.fallStartedAt = null;
        } else removeTile(id, data);
      }
    }
    if (previous?.id === next.id && next.relic?.taken && !previous?.relic?.taken) pendingTreasure = true;
    if (!next.relic?.taken) pendingTreasure = false;
    syncGuardians();
    syncFeatures();
    if (next.won && !previous?.won) pendingVictory = true;
    if (!next.won) pendingVictory = false;
    updateColors();
  }
  function setBiome(kind) {
    currentBiome = kind;
    biomePalette = BIOME_PALETTES[kind];
    const color = biomePalette;
    jungle.setVisible(kind === 'jungle');
    biomeEnvironment.setBiome(kind);
    scene.fog.color.set(color.fog);
    scene.fog.density = color.fogDensity;
    ambientLight.color.set(color.sky);
    ambientLight.groundColor.set(color.ground);
    ambientLight.intensity = color.ambient;
    sun.color.set(color.sun);
    sun.intensity = color.sunPower;
    rim.color.set(color.rimLight);
    rockMat.color.set(color.rock);
    baseMat.color.set(color.base);
    rimMat.color.set(color.rim);
    darkMat.color.set(color.dark);
    goldMat.color.set(color.gold);
    goldMat.emissive.set(color.goldGlow);
    portalLight.color.set(color.portal);
    particleMat.color.set(color.motes);
    sparksMat.color.set(color.gold);
    shaftMat.uniforms.color.value.set(color.shaft);
    previewMaterial.color.set(color.connected);
    previewRingMaterial.color.set(color.connected);
    blankMat.color.set(color.dark);
    dustMaterial.color.set(kind==='boreal' ? 0xd5f1ff : kind === 'atlantis' ? 0x92c2c7 : kind === 'volcano' ? 0x967b73 : 0xab9d69);
  }
  function setBoardProfile(profile) {
    boardProfile = profile;
    architecture.setProfile(profile);
    scenery.scale.set(profile.sx, 1, profile.sz);
    const maps = boardTextures.get(profile.biome, profile.variant);
    for (const [surface,map] of [[baseMat,maps.edge],[rimMat,maps.path],[darkMat,maps.edge],[rockMat,maps.edge]]) {
      surface.map=map;surface.needsUpdate=true;
    }
    const entrance = cellPosition(-1), exit = cellPosition(16);
    entryPlatform.position.set(entrance.x-.04,0,entrance.z);
    exitPlatform.position.set(exit.x+.03,0,exit.z);
    entryPlatform.scale.set(profile.sx,1,profile.sz);
    exitPlatform.scale.set(profile.sx,1,profile.sz);
    portal.position.copy(exit).add(new THREE.Vector3(.1,-.21,0));
    for (const marker of blankMarkers) {
      marker.group.position.copy(cellPosition(marker.index));
      marker.group.position.y=.018;
      marker.group.scale.set(profile.sx,1,profile.sz);
    }
    reframe();
  }
  function updateColors() {
    if (!state) return;
    const previewed = state.hint?.type === 'walk' ? state.hint.index : mode === 'walk' ? (focus >= -1 ? focus : hovered) : -2;
    const impact = state.walkImpact?.[String(previewed)];
    for (const data of tiles.values()) {
      const i = data.index;
      if (data.collapseDistance !== null || data.fallStartedAt !== null) {
        data.arrows.forEach(arrow => { arrow.visible = false; });
        continue;
      }
      const occupied = state.hero === i;
      const reachable = state.reachable.includes(i);
      const slidable = state.slidable.includes(i);
      const active = mode === 'slide' ? slidable : reachable && !occupied;
      const hilite = hovered === i || focus === i;
      const isHint = state.hint?.index === i;
      const emptyCells = state.emptyCells || state.tiles.flatMap((tile, index) => tile ? [] : [index]);
      const destinations = state.slideOptions
        ? state.slideOptions.filter(option => option.index === i).map(option => option.to)
        : emptyCells.filter(empty => Math.abs(empty % 4 - i % 4) + Math.abs(Math.floor(empty / 4) - Math.floor(i / 4)) === 1);
      data.arrows.forEach((arrow, number) => {
        arrow.visible = mode === 'slide' && slidable && number < destinations.length;
        if (!arrow.visible) return;
        const empty = destinations[number];
        const dx = empty % 4 - i % 4;
        const dz = Math.floor(empty / 4) - Math.floor(i / 4);
        arrow.position.set(dx * .49,.135,dz * .49);
        arrow.rotation.y = Math.atan2(-dx,-dz);
      });
      const color = biomePalette;
      // Show what a crossing would cost before it is played: stones lost, stones cracked.
      const doomed = impact?.collapse.includes(i);
      const cracking = impact?.weaken.includes(i);
      data.tileEdge.color.set(doomed ? 0xd2683a : color.edge);
      data.tileMat.color.set(occupied ? color.occupied : hilite && active ? color.hover : active ? color.active : color.tile);
      data.tileMat.emissive.set(doomed ? 0x8c3410 : cracking ? 0x6d4a12 : isHint ? 0x625b2d : active && hilite ? color.highlight : 0x000000);
      data.tileMat.emissiveIntensity = doomed ? 0.85 : cracking ? 0.5 : isHint ? 0.55 : 0.2;
      data.pathMat.color.set(reachable ? color.connected : color.path);
      data.traceMat.color.set(occupied ? color.gold : reachable ? color.connected : color.trace);
      data.traceMat.emissive.set(occupied ? color.gold : reachable ? color.connectedGlow : color.traceGlow);
      data.traceMat.emissiveIntensity = reachable ? 1.1 : 0.15;
    }
    updateBlankMarkers();
    updatePreview();
  }
  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects([...tiles.values()].filter(data => data.collapseDistance === null && data.fallStartedAt === null).map(d => d.group), true);
    for (const hit of hits) {
      if (hit.object.userData.tileId != null) return tiles.get(hit.object.userData.tileId)?.index ?? -2;
    }
    const emptyHits = raycaster.intersectObjects(blankMarkers.filter(marker => marker.group.visible).map(marker => marker.proxy));
    if (emptyHits.length) return emptyHits[0].object.userData.emptyIndex;
    const gateHits = raycaster.intersectObject(portal, true);
    if (gateHits.length) return 16;
    return raycaster.intersectObject(entryPlatform).length ? -1 : -2;
  }
  function onMove(event) {
    if (pointerOrigin && Math.hypot(event.clientX - pointerOrigin[0], event.clientY - pointerOrigin[1]) > 6) {
      if (!dragged) callbacks.onOrbit?.();
      dragged = true;
      hovered = -2;
      updateColors();
      renderer.domElement.style.cursor = 'grabbing';
      return;
    }
    const i = pick(event);
    if (i !== hovered) {
      hovered = i;
      renderer.domElement.style.cursor = i >= -1 ? 'pointer' : 'grab';
      updateColors();
      callbacks.onHover?.(i);
    }
  }
  function onLeave() { hovered = -2; updateColors(); callbacks.onHover?.(-2); }
  function onClick(event) { if (dragged) return; const i = pick(event); if (i >= -1) callbacks.onTile?.(i); }
  function onPointerDown(event) { pointerOrigin = [event.clientX, event.clientY]; dragged = false; cameraTransition = false; }
  function onPointerUp() { pointerOrigin = null; renderer.domElement.style.cursor = 'grab'; }
  function onWheel() { cameraTransition = false; callbacks.onOrbit?.(); }
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerleave', onLeave);
  renderer.domElement.addEventListener('click', onClick);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  function onContextLost(event) { event.preventDefault(); callbacks.onError?.('Le rendu 3D a été interrompu. Rechargez la page pour le rétablir.'); }

  /** Interface chrome overlaying the canvas, in CSS pixels; the board is framed in what it leaves free. */
  const safeArea = { top: 0, right: 0, bottom: 0, left: 0 };
  /** Canvas size, the free rectangle inside it, and the half-angle tangents that rectangle is granted. */
  const framing = { width: 1, height: 1, x: 0, y: 0, w: 1, h: 1, vTan: BASE_TAN, hTan: BASE_TAN };
  /** Per view: how far the camera stands, and where its axis must sit on the canvas to centre the board. */
  const isoFrame = { distance: 17.3, x: 0, y: 0 };
  const topFrame = { distance: 17.8, x: 0, y: 0 };
  const axis = new THREE.Vector2();
  const axisGoal = new THREE.Vector2();
  const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  const screenRight = new THREE.Vector3();
  const screenUp = new THREE.Vector3();
  const screenBox = { uMin: 0, uMax: 0, vMin: 0, vMax: 0 };

  /** Board, its two platforms and the explorer, as a box around the point the camera looks at. */
  function loadContent(direction) {
    const hx = 3.5 * boardProfile.sx;
    const hz = 2.7 * boardProfile.sz;
    const basis = new THREE.Matrix4().lookAt(direction, ORIGIN, camera.up);
    screenRight.setFromMatrixColumn(basis, 0);
    screenUp.setFromMatrixColumn(basis, 1);
    for (let i = 0; i < 8; i++) {
      corners[i].set(i & 1 ? hx : -hx, (i & 2 ? 1.35 : -0.35) - controls.target.y, i & 4 ? hz : -hz);
    }
  }

  /** Screen box of that content in tangent units; false when the camera would sit inside it. */
  function projectContent(direction, distance) {
    screenBox.uMin = screenBox.vMin = Infinity;
    screenBox.uMax = screenBox.vMax = -Infinity;
    for (const corner of corners) {
      const depth = distance - corner.dot(direction);
      if (depth < 0.25) return false;
      const u = corner.dot(screenRight) / depth;
      const v = corner.dot(screenUp) / depth;
      screenBox.uMin = Math.min(screenBox.uMin, u); screenBox.uMax = Math.max(screenBox.uMax, u);
      screenBox.vMin = Math.min(screenBox.vMin, v); screenBox.vMax = Math.max(screenBox.vMax, v);
    }
    return true;
  }

  /** Nearest distance whose screen box still spans the frame, and the axis that centres it there. */
  function solveFrame(direction, out) {
    loadContent(direction);
    let lo = 0.25;
    let hi = 400;
    for (let i = 0; i < 36; i++) {
      const mid = (lo + hi) / 2;
      const fits = projectContent(direction, mid)
        && screenBox.vMax - screenBox.vMin <= 2 * framing.vTan
        && screenBox.uMax - screenBox.uMin <= 2 * framing.hTan;
      if (fits) hi = mid; else lo = mid;
    }
    out.distance = hi * FIT_MARGIN;
    projectContent(direction, out.distance);
    // A board seen from an angle is not symmetric on screen: offset the axis instead of wasting the gap.
    const perTan = framing.h / 2 / framing.vTan;
    out.x = framing.x - (screenBox.uMin + screenBox.uMax) / 2 * perTan;
    out.y = framing.y + (screenBox.vMin + screenBox.vMax) / 2 * perTan;
  }

  /** Off-centre the frustum onto `x, y`, keeping the free rectangle at its intended angular size. */
  function applyAxis(x, y) {
    const fullWidth = 2 * Math.max(x, framing.width - x);
    const fullHeight = 2 * Math.max(y, framing.height - y);
    camera.fov = Math.min(MAX_FOV, THREE.MathUtils.radToDeg(2 * Math.atan(BASE_TAN * fullHeight / framing.h)));
    // Render the whole canvas, but aim it off centre: the scene bleeds behind the chrome while the
    // board stays composed in the free area. setViewOffset derives the aspect ratio from the arguments.
    camera.setViewOffset(fullWidth, fullHeight, fullWidth / 2 - x, fullHeight / 2 - y, framing.width, framing.height);
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return { v: tan * framing.h / fullHeight, h: tan * framing.w / fullHeight };
  }

  function reframe() {
    const previous = topView ? topFrame.distance : isoFrame.distance;
    framing.vTan = BASE_TAN;
    framing.hTan = BASE_TAN * framing.w / framing.h;
    let goal = isoFrame;
    // Two passes, so a frame too cramped to be granted the full angle settles on what it did get.
    for (let pass = 0; pass < 2; pass++) {
      solveFrame(ISO_DIR, isoFrame);
      solveFrame(TOP_DIR, topFrame);
      goal = topView ? topFrame : isoFrame;
      const granted = applyAxis(goal.x, goal.y);
      framing.vTan = granted.v;
      framing.hTan = granted.h;
    }
    axis.set(goal.x, goal.y);
    // Preserve however far the player had zoomed in or out.
    if (camera.position.length() > 1 && previous > 0) camera.position.multiplyScalar(goal.distance / previous);
    controls.minDistance = goal.distance * 0.5;
    controls.maxDistance = goal.distance * 2.1;
  }

  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(PIXEL_BUDGET / (width * height)));
    renderer.setPixelRatio(Math.max(1, ratio));
    renderer.setSize(width, height);
    composer.setSize(width, height);
    glowPass.uniforms.resolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
    // Grant the chrome its space, but shrink it proportionally rather than starve the framing rectangle.
    const insetX = safeArea.left + safeArea.right;
    const insetY = safeArea.top + safeArea.bottom;
    const keepX = insetX > 0 ? Math.min(1, width * 0.66 / insetX) : 0;
    const keepY = insetY > 0 ? Math.min(1, height * 0.64 / insetY) : 0;
    const left = safeArea.left * keepX;
    const top = safeArea.top * keepY;
    framing.width = width;
    framing.height = height;
    framing.w = width - left - safeArea.right * keepX;
    framing.h = height - top - safeArea.bottom * keepY;
    framing.x = left + framing.w / 2;
    framing.y = top + framing.h / 2;
    reframe();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  camera.position.copy(ISO_DIR).multiplyScalar(isoFrame.distance);
  camera.lookAt(controls.target);
  function animate(now) {
    if (disposed || !active) return;
    const time = now / 1000;
    const frameDelta = Math.max(0, (now - lastTime) / 1000);
    const dt = Math.min(frameDelta, 0.05);
    lastTime = now;
    const view = topView ? topFrame : isoFrame;
    const ideal = (topView ? TOP_DIR : ISO_DIR).clone().multiplyScalar(view.distance);
    if (cameraTransition) {
      const blend = 1 - Math.exp(-frameDelta * 7);
      camera.position.lerp(ideal, blend);
      axisGoal.set(view.x, view.y);
      axis.lerp(axisGoal, blend);
      applyAxis(axis.x, axis.y);
      if (camera.position.distanceTo(ideal) < 0.01) {
        cameraTransition = false;
        axis.copy(axisGoal);
        applyAxis(axis.x, axis.y);
      }
    }
    const cameraMoved = controls.update();
    let tilesMoving = false;
    for (const data of tiles.values()) {
      if (data.fallStartedAt !== null) { tilesMoving = true; continue; }
      const lifted = data.target.clone();
      if (data.collapseDistance === null && data.index === hovered && state?.slidable.includes(data.index) && mode === 'slide') lifted.y += 0.06;
      data.group.position.lerp(lifted, 1 - Math.exp(-frameDelta * 17));
      if (data.group.position.distanceToSquared(lifted) > 1e-6) tilesMoving = true;
    }
    const moving = Boolean(heroMotion);
    let distance = 0;
    let travelDistance = null;
    if (heroMotion) {
      // Keep travel duration stable even when rendering is slow or the tab was hidden.
      const sample = heroMotion.route.sample(time - heroMotion.startedAt);
      distance = sample.distance - heroMotion.distance;
      travelDistance = sample.distance;
      heroMotion.distance = sample.distance;
      hero.position.set(sample.position.x, sample.position.y, sample.position.z);
      if (sample.heading !== null) heroHeading = sample.heading;
      if (sample.complete) heroMotion = null;
    }
    hero.getWorldPosition(heroWorld);
    for (const data of tiles.values()) data.hazard.update(time, {
      urgent: data.collapseDistance !== null, dt, heroPosition: state?.won ? null : heroWorld,
    });
    if (pendingTreasure && (!heroMotion || hero.position.distanceTo(cellPosition(state.relic.index)) < .55)) {
      pendingTreasure = false; explorer.react('treasure');
    }
    let blanksChanged = false;
    for (const [id, data] of tiles) {
      if (data.collapseDistance === null) continue;
      if (data.fallStartedAt === null && travelDistance !== null && travelDistance >= data.collapseDistance) {
        data.fallStartedAt = time;
        collapseEffects.burst(data.target);
        callbacks.onCollapse?.();
        blanksChanged = true;
      }
      if (data.fallStartedAt === null) continue;
      const elapsed = time - data.fallStartedAt;
      data.group.position.y = data.target.y - elapsed * elapsed * 8;
      data.group.rotation.x = elapsed * .55;
      data.group.rotation.z = elapsed * .38;
      if (elapsed > .58) { removeTile(id, data); blanksChanged = true; }
    }
    if (blanksChanged) updateBlankMarkers();
    collapseEffects.update(dt);
    for (const guard of guardians) {
      const step = guard.actor.root.position.distanceTo(guard.target);
      guard.actor.root.position.lerp(guard.target, 1 - Math.exp(-frameDelta * 9));
      if (step > .02) {
        const towards = guard.target.clone().sub(guard.actor.root.position);
        guard.actor.face(Math.atan2(towards.x, towards.z));
      }
      guard.actor.update(time, dt, step > .02, { heroPosition: state?.won ? null : heroWorld });
      if (step > .01) tilesMoving = true;
      guard.marker.scale.setScalar(1 + Math.sin(time * 3.2) * .07);
    }
    if (guardians.length) guardMat.opacity = .34 + Math.sin(time * 3.2) * .16;
    for (const item of features) item.feature.update(time);
    const turn = Math.atan2(Math.sin(heroHeading - hero.rotation.y), Math.cos(heroHeading - hero.rotation.y));
    hero.rotation.y += turn * (1 - Math.exp(-frameDelta * 16));
    const skating=moving && [...tiles.values()].some(data=>data.tile.hazard==='ice' &&
      Math.abs(hero.position.x-data.group.position.x)<.67*boardProfile.sx &&
      Math.abs(hero.position.z-data.group.position.z)<.67*boardProfile.sz);
    const awareness = { danger: 0, interest: 0, look: 0 };
    let nearest = Infinity;
    function notice(position, kind) {
      const dx = position.x - hero.position.x, dz = position.z - hero.position.z;
      const gap = Math.hypot(dx, dz);
      const amount = THREE.MathUtils.clamp((2.5 - gap) / 1.65, 0, 1);
      awareness[kind] = Math.max(awareness[kind], amount);
      if (amount > .1 && gap < nearest) {
        nearest = gap;
        const angle = Math.atan2(dx, dz) - hero.rotation.y;
        awareness.look = Math.atan2(Math.sin(angle), Math.cos(angle));
      }
    }
    if (!state?.won) {
      for (const guard of guardians) notice(guard.actor.root.position, 'danger');
      for (const data of tiles.values()) {
        if (['crocodile', 'fragile', 'brittle'].includes(data.tile.hazard)) notice(data.group.position, 'danger');
      }
      if (!awareness.danger && state?.relic && !state.relic.taken) notice(cellPosition(state.relic.index), 'interest');
    }
    const gait = explorer.update(time, dt, { moving, distance, sliding:skating, ...awareness });
    if (gait?.footfall) {
      callbacks.onFootfall?.();
      const footSide = gait.foot === 'left' ? -.1 : .1;
      for (let j = 0; j < 3; j++) {
        const bit = dust[dustCursor++ % dust.length];
        bit.age = 0;
        bit.mesh.visible = true;
        bit.mesh.position.copy(hero.position);
        bit.mesh.position.x += Math.cos(hero.rotation.y) * footSide + Math.cos(dustCursor * 2.4) * 0.035;
        bit.mesh.position.z += -Math.sin(hero.rotation.y) * footSide + Math.sin(dustCursor * 2.4) * 0.035;
        bit.velocity.set(Math.sin(dustCursor) * 0.2, 0.2 + j * 0.06, Math.cos(dustCursor) * 0.2);
      }
    }
    dust.forEach(bit => {
      bit.age += dt;
      if (bit.age > 0.5) { bit.mesh.visible = false; return; }
      bit.mesh.position.addScaledVector(bit.velocity, dt);
      bit.mesh.scale.setScalar(1 - bit.age * 2);
      bit.mesh.rotation.x += dt * 3;
    });
    if (pendingSettle && !heroMotion && [...tiles.values()].every(tile =>
      tile.collapseDistance === null && tile.fallStartedAt === null &&
      Math.abs(tile.group.position.x - tile.target.x) + Math.abs(tile.group.position.z - tile.target.z) < 0.004)) {
      pendingSettle = false;
      if (pendingVictory) { winTime = time; pendingVictory = false; pendingTreasure = false; explorer.react('victory'); callbacks.onVictory?.(); }
      updatePreview();
      callbacks.onSettled?.();
    }
    heroRing.material.emissiveIntensity = 0.5 + Math.sin(time * 2.5) * 0.2;
    previewRing.scale.setScalar(1 + Math.sin(time * 3.5) * .075);
    jungle.update(time, dt, camera);
    biomeEnvironment.update(time);
    architecture.update(time);
    portalCrystal.rotation.y = time * 0.5;
    portalCrystal.position.y = 1.54 + Math.sin(time * 1.5) * 0.045;
    portalRing.rotation.z = time * 0.15;
    portalRing.scale.setScalar(1 + Math.sin(time * 2) * 0.04);
    portalLight.intensity = state?.canExit ? 5 : 1.5 + Math.sin(time) * 0.4;
    for (let i = 0; i < particleCount; i++) {
      const o = origins[i];
      positions[i * 3] = o.x + Math.sin(time * .12 + i) * .4;
      positions[i * 3 + 1] = o.y + Math.sin(time * .3 + i * 2) * .3;
      positions[i * 3 + 2] = o.z + Math.cos(time * .12 + i * .7) * .3;
    }
    particleGeo.attributes.position.needsUpdate = true;
    floatingRocks.forEach((rock, i) => { rock.position.y = rock.userData.baseY + Math.sin(time * 0.6 + i) * 0.08; rock.rotation.y += dt * 0.045; });
    const elapsed = time - winTime;
    if (elapsed < 4) {
      sparksMat.opacity = Math.max(0, 1 - elapsed / 4);
      for (let i = 0; i < 100; i++) {
        const theta = i * 2.39996;
        const spread = elapsed * (0.3 + (i % 9) * 0.15);
        sparkPositions[i * 3] = endPosition.x + Math.cos(theta) * spread;
        sparkPositions[i * 3 + 1] = .7 + elapsed * (1 + (i % 7) * .16) - .35 * elapsed * elapsed;
        sparkPositions[i * 3 + 2] = endPosition.z + Math.sin(theta) * spread;
      }
      sparksGeo.attributes.position.needsUpdate = true;
    } else sparksMat.opacity = 0;
    // A 2048 soft shadow map is the heaviest pass of the frame. Refresh it whenever something
    // actually moves, and otherwise idle at ~8 Hz so the ambient foliage sway still casts.
    if (cameraMoved || cameraTransition || moving || tilesMoving || elapsed < 4 || now - shadowStamp > 120) {
      renderer.shadowMap.needsUpdate = true;
      shadowStamp = now;
    }
    composer.render(dt);
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);
  callbacks.onReady?.();
  return {
    update,
    setSafeArea(insets) {
      if (disposed) return;
      let changed = false;
      for (const key of ['top', 'right', 'bottom', 'left']) {
        const value = Math.max(0, insets?.[key] || 0);
        if (Math.abs(safeArea[key] - value) > 0.5) { safeArea[key] = value; changed = true; }
      }
      if (changed) resize();
    },
    setActive(value) {
      if (disposed || active === value) return;
      active = value;
      if (active) {
        lastTime = performance.now();
        resize();
        raf = requestAnimationFrame(animate);
      } else cancelAnimationFrame(raf);
    },
    setExplorerStyle(style) { explorer.setStyle(style); },
    setView(value) {
      if (value === 'free') return;
      topView = value === 'top';
      cameraTransition = true;
      controls.enableDamping = false;
      controls.update();
      controls.enableDamping = true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      jungle.dispose();
      biomeEnvironment.dispose();
      architecture.dispose();
      collapseEffects.dispose();
      explorer.dispose();
      pixelTextures.dispose();
      boardTextures.dispose();
      renderPass.dispose();
      glowPass.dispose();
      outputPass.dispose();
      composer.dispose();
      previewDots.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      guardians.forEach(guard => { guard.actor.dispose(); guard.marker.removeFromParent(); });
      features.forEach(item => item.feature.dispose());
      for (const [id, data] of tiles) removeTile(id, data);
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      glowTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
