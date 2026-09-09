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
import { createTileHazard, createCollapseEffects } from './hazards.js';

const GAP = 1.34;
const DIR = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const palette = { stone: 0x70827c, edge: 0x3e514f, path: 0xd5c9a6, active: 0x8be9cd, gold: 0xf5d38b };

export function createGameScene(host, callbacks) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x193b2d, 0.026);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
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
  let heroMotion = null;
  let heroHeading = 0;
  let currentLevel = null;
  let currentBiome = 'jungle';
  let biomePalette = BIOME_PALETTES.jungle;
  let winTime = -100;
  let pendingSettle = false;
  let pendingVictory = false;
  const materials = new Set();
  const geometries = new Set();
  const pixelTextures = createPixelTextures(THREE);

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
    if (index === -1) return new THREE.Vector3(-3.02, 0.36, -1.5 * GAP);
    if (index === 16) return new THREE.Vector3(3.04, 0.36, 1.5 * GAP);
    return new THREE.Vector3((index % 4 - 1.5) * GAP, 0.36, (Math.floor(index / 4) - 1.5) * GAP);
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
  const leafMat = material(0x537b62, { flatShading: true });
  const paleLeafMat = material(0x779672, { flatShading: true });
  const goldMat = material(palette.gold, { emissive: 0xc89340, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.35 });
  box(world, 5.64, 0.45, 5.64, baseMat, 0, -0.22, 0, 0.12);
  box(world, 5.72, 0.065, 5.72, rimMat, 0, -0.22, 0, 0.035);
  box(world, 5.49, 0.38, 5.49, darkMat, 0, -0.53, 0, 0.12);
  box(world, 5.21, 0.3, 5.21, rockMat, 0, -0.8, 0, 0.12);
  for (let i = 0; i < 19; i++) {
    const angle = i * 2.39996;
    const radius = 1 + ((i * 17) % 10) / 10;
    const rock = mesh(new THREE.DodecahedronGeometry(0.65 + (i % 4) * 0.18, 0), rockMat, world,
      Math.cos(angle) * radius, -0.93 - (i % 3) * 0.27, Math.sin(angle) * radius);
    rock.scale.set(1.0, 1.25, 0.9);
    rock.rotation.set(i * 0.2, i, 0.5);
  }
  // Engraved sides make the board feel like a surviving piece of a larger temple.
  for (let i = 0; i < 8; i++) {
    box(world, 0.055, 0.1, 0.01, rimMat, -2.35 + i * 0.67, -0.075, 2.824, 0.004);
    box(world, 0.01, 0.1, 0.055, rimMat, 2.824, -0.075, -2.35 + i * 0.67, 0.004);
  }
  for (const [x, z, height] of [[-2.69, 2.64, 0.72], [2.65, -2.63, 1.15], [-2.7, -2.7, 0.3]]) {
    box(world, 0.45, 0.12, 0.45, baseMat, x, 0.08, z);
    box(world, 0.25, height, 0.25, baseMat, x, height / 2 + 0.14, z, 0.03);
    box(world, 0.36, 0.12, 0.36, rimMat, x, height + 0.17, z, 0.025);
    mesh(new THREE.OctahedronGeometry(0.13), goldMat, world, x, height + 0.39, z);
  }
  const jungleDetails = new THREE.Group();
  world.add(jungleDetails);
  function shrub(x, y, z, scale = 1) {
    for (let j = 0; j < 4; j++) {
      const leaf = mesh(new THREE.IcosahedronGeometry(0.15 * scale, 0), j % 2 ? leafMat : paleLeafMat,
        jungleDetails, x + Math.cos(j * 2.4) * 0.1, y + j * 0.038, z + Math.sin(j * 2.4) * 0.1);
      leaf.scale.set(1, 0.65, 1);
    }
  }
  [[-2.65, 0.05, 1.8], [1.7, 0.04, -2.66], [-2.63, 0.06, 2.62], [2.63, 0.04, -1.52], [1.3, -0.45, 2.72]].forEach(p => shrub(...p));
  for (let i = 0; i < 15; i++) {
    const vine = mesh(new THREE.IcosahedronGeometry(0.07, 0), i % 2 ? leafMat : paleLeafMat,
      jungleDetails, -2.73 + Math.sin(i * 1.9) * 0.08, -i * 0.085, 1.68 + Math.cos(i) * 0.055);
    vine.scale.y = 1.4;
  }

  const startPosition = cellPosition(-1);
  const endPosition = cellPosition(16);
  const entryPlatform = box(world, 0.8, 0.28, 1.02, baseMat, startPosition.x - 0.04, 0.0, startPosition.z);
  box(world, 0.8, 0.28, 1.02, baseMat, endPosition.x + 0.03, 0.0, endPosition.z);
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

  const explorer = createExplorer({ THREE });
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

  const jungle = createJungleEnvironment({ THREE, scene, world, textures: pixelTextures });
  const biomeEnvironment = createBiomeEnvironment({ THREE, world, maps: pixelTextures });
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

  function buildTile(tile, index) {
    const group = new THREE.Group();
    const tileMat = material(0xd1d3c0, { map: pixelTextures.stone });
    const tileEdge = material(0x839281, { map: pixelTextures.stone });
    const pathMat = material(0xf3dfb3, { map: pixelTextures.path, metalness: 0.05, roughness: 0.9 });
    const traceMat = material(0xeadcab, { emissive: 0x97ccb2, emissiveIntensity: 0.15 });
    const edge = box(group, 1.25, 0.3, 1.25, tileEdge, 0, -0.19, 0, 0.065);
    const top = box(group, 1.23, 0.145, 1.23, tileMat, 0, -0.05, 0, 0.045);
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
    // Small corner studs and a weathered stone chip.
    for (const [x, z] of [[-.49, -.49], [.49, .49]]) {
      box(group, 0.07, 0.012, 0.07, tileEdge, x, 0.028, z, 0.008);
    }
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
    const hazard = createTileHazard({ THREE, tile });
    group.add(hazard.root);
    group.position.copy(cellPosition(index));
    world.add(group);
    const data = { group, tileMat, tileEdge, pathMat, traceMat, target: cellPosition(index), index, texture, arrows,
      hazard, tile, collapseDistance: null, fallStartedAt: null };
    tiles.set(tile.id, data);
    return data;
  }

  function removeTile(id, data) {
    data.hazard.dispose();
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
    const nextBiome = Object.hasOwn(BIOME_PALETTES, next.biome) ? next.biome : 'jungle';
    if (nextBiome !== currentBiome) setBiome(nextBiome);
    if (next !== previous) pendingSettle = true;
    if (currentLevel !== next.id) {
      for (const [id, data] of tiles) removeTile(id, data);
      collapseEffects.clear();
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
    if (next.won && !previous?.won) pendingVictory = true;
    if (!next.won) pendingVictory = false;
    updateColors();
  }
  function setBiome(kind) {
    currentBiome = kind;
    biomePalette = BIOME_PALETTES[kind];
    const color = biomePalette;
    jungle.setVisible(kind === 'jungle');
    jungleDetails.visible = kind === 'jungle';
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
    dustMaterial.color.set(kind === 'atlantis' ? 0x92c2c7 : kind === 'volcano' ? 0x967b73 : 0xab9d69);
  }
  function updateColors() {
    if (!state) return;
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
      data.tileEdge.color.set(color.edge);
      data.tileMat.color.set(occupied ? color.occupied : hilite && active ? color.hover : active ? color.active : color.tile);
      data.tileMat.emissive.set(isHint ? 0x625b2d : active && hilite ? color.highlight : 0x000000);
      data.tileMat.emissiveIntensity = isHint ? 0.55 : 0.2;
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

  let cameraDistance = 1;
  const cameraTarget = new THREE.Vector3(8.1, 10.1, 11.5);
  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    composer.setSize(width, height);
    glowPass.uniforms.resolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
    camera.aspect = width / height;
    const oldDistance = cameraDistance;
    cameraDistance = Math.max(0.79, 1.06 / camera.aspect);
    if (camera.position.length() > 1) camera.position.multiplyScalar(cameraDistance / oldDistance);
    controls.minDistance = 7.8 * cameraDistance;
    controls.maxDistance = 28 * cameraDistance;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  camera.position.copy(cameraTarget).multiplyScalar(cameraDistance);
  camera.lookAt(0, 0, 0);
  function animate(now) {
    if (disposed || !active) return;
    const time = now / 1000;
    const frameDelta = Math.max(0, (now - lastTime) / 1000);
    const dt = Math.min(frameDelta, 0.05);
    lastTime = now;
    const ideal = (topView ? new THREE.Vector3(0.01, 17.8, 0.9) : cameraTarget.clone()).multiplyScalar(cameraDistance);
    if (cameraTransition) {
      camera.position.lerp(ideal, 1 - Math.exp(-frameDelta * 7));
      if (camera.position.distanceTo(ideal) < 0.01) cameraTransition = false;
    }
    controls.update();
    for (const data of tiles.values()) {
      data.hazard.update(time, { urgent: data.collapseDistance !== null });
      if (data.fallStartedAt !== null) continue;
      const lifted = data.target.clone();
      if (data.collapseDistance === null && data.index === hovered && state?.slidable.includes(data.index) && mode === 'slide') lifted.y += 0.06;
      data.group.position.lerp(lifted, 1 - Math.exp(-frameDelta * 17));
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
    const turn = Math.atan2(Math.sin(heroHeading - hero.rotation.y), Math.cos(heroHeading - hero.rotation.y));
    hero.rotation.y += turn * (1 - Math.exp(-frameDelta * 16));
    const gait = explorer.update(time, dt, { moving, distance });
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
      if (pendingVictory) { winTime = time; pendingVictory = false; callbacks.onVictory?.(); }
      updatePreview();
      callbacks.onSettled?.();
    }
    heroRing.material.emissiveIntensity = 0.5 + Math.sin(time * 2.5) * 0.2;
    previewRing.scale.setScalar(1 + Math.sin(time * 3.5) * .075);
    jungle.update(time, dt, camera);
    biomeEnvironment.update(time);
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
    // Keep one shadow update per frame, including the animated foliage and explorer.
    renderer.shadowMap.needsUpdate = true;
    composer.render(dt);
    raf = requestAnimationFrame(animate);
  }
  raf = requestAnimationFrame(animate);
  callbacks.onReady?.();
  return {
    update,
    setActive(value) {
      if (disposed || active === value) return;
      active = value;
      if (active) {
        lastTime = performance.now();
        resize();
        raf = requestAnimationFrame(animate);
      } else cancelAnimationFrame(raf);
    },
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
      collapseEffects.dispose();
      explorer.dispose();
      pixelTextures.dispose();
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
      for (const [id, data] of tiles) removeTile(id, data);
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      glowTexture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
