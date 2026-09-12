import * as THREE from 'three';
import { terrainHeight } from './map-layout.js';
import { createSpaceMapScene } from './space-scene.js';

const THEMES = {
  jungle: { low: '#adad79', high: '#496d46', rock: '#72725b', water: '#236b66', leaves: ['#335d40','#50784b','#779956','#9cac69'], light: '#ffebbd', glow: '#ffe1a1', rim: '#a6dfbd' },
  atlantis: { low: '#d3d3ad', high: '#638f83', rock: '#829f91', water: '#227d8b', leaves: ['#d79894','#e5bca4','#90c5ba','#bd829c'], light: '#d5fff1', glow: '#a8f4ee', rim: '#8edce5' },
  volcano: { low: '#665650', high: '#49434b', rock: '#352f3b', water: '#302d3b', leaves: ['#50434b','#6d5655','#352e3b','#86695d'], light: '#ffd7af', glow: '#ffb775', rim: '#ef9b82' },
  boreal: { low: '#849daa', high: '#e4ece1', rock: '#71899b', water: '#355f7a', leaves: ['#527a78','#406866','#75908c','#cdded7'], light: '#e4f4ff', glow: '#c6fff0', rim: '#9cebd0' },
};

export function createMapScene(canvas, biome, stops, completed, onProject, levels = []) {
  if (biome === 'space') return createSpaceMapScene(canvas, stops, completed, onProject, levels);
  const theme = THEMES[biome];
  const animationTime = { value: 0 };
  const atmosphereMaterials = [];
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, Math.max(1.5, devicePixelRatio || 1)));
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-13, 13, 11, -11, .1, 100);
  camera.position.set(0, 25, 19);
  camera.lookAt(0, .2, 0);
  scene.add(new THREE.HemisphereLight('#e6f3df', '#27352e', 1.4));
  const sunlight = new THREE.DirectionalLight(theme.light, 2.8);
  sunlight.position.set(-10, 18, -8);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  Object.assign(sunlight.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 60 });
  sunlight.shadow.bias = -.0005;
  sunlight.shadow.normalBias = .035;
  scene.add(sunlight);
  const fillLight = new THREE.DirectionalLight('#b4dcd5', .7);
  fillLight.position.set(8, 5, 10);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(theme.rim, .8);
  rimLight.position.set(5, 7, -10);
  scene.add(rimLight);

  let seed = 8719;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const groundAt = (horizontal, vertical) => terrainHeight(biome, horizontal, vertical);
  const positionAt = (horizontal, vertical, lift = 0) => new THREE.Vector3((horizontal - 500) * .022, groundAt(horizontal, vertical) + lift, (vertical - 450) * .022);
  const materials = new Map();
  function material(color, options = {}) {
    const key = color + JSON.stringify(options);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .9, flatShading: true, ...options }));
    return materials.get(key);
  }
  function mesh(geometry, surface, position, scale) {
    const object = new THREE.Mesh(geometry, surface);
    if (position) object.position.copy(position);
    if (scale) object.scale.set(...scale);
    object.castShadow = true;
    object.receiveShadow = true;
    scene.add(object);
    return object;
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const stone = new THREE.IcosahedronGeometry(1, 0);
  const trunk = new THREE.CylinderGeometry(.055, .09, 1, 5);
  const foliage = new THREE.IcosahedronGeometry(1, 1);
  const pine = new THREE.ConeGeometry(1, 1, 6);
  const column = new THREE.CylinderGeometry(.13, .17, 1, 8);
  const portalMaterial = material(theme.glow, { emissive: theme.glow, emissiveIntensity: 1.35 });
  let lavaMaterial;
  let lavaLight;

  // Les sommets partages conservent des normales et des couleurs continues entre les triangles.
  const source = new THREE.PlaneGeometry(22, 19.8, 180, 162);
  source.rotateX(-Math.PI / 2);
  const sourcePosition = source.attributes.position;
  const shorelinePixels = new Uint8Array(sourcePosition.count);
  for (let index = 0; index < sourcePosition.count; index++) {
    const height = groundAt(sourcePosition.getX(index) / .022 + 500, sourcePosition.getZ(index) / .022 + 450);
    sourcePosition.setY(index, height);
    shorelinePixels[index] = Math.round(255 * THREE.MathUtils.clamp((height + .65) / .61, 0, 1));
  }
  // Le masque suit les cotes, pas le rectangle du canvas : la pleine mer laisse voir la page.
  const shoreline = new THREE.DataTexture(shorelinePixels, 181, 163, THREE.RedFormat);
  shoreline.minFilter = THREE.LinearFilter;
  shoreline.magFilter = THREE.LinearFilter;
  shoreline.needsUpdate = true;
  source.computeVertexNormals();
  const triangles = [];
  const colors = [];
  const low = new THREE.Color(theme.low);
  const high = new THREE.Color(theme.high);
  const tone = new THREE.Color();
  for (let index = 0; index < sourcePosition.count; index++) {
    tone.copy(low).lerp(high, THREE.MathUtils.smoothstep(sourcePosition.getY(index), 0, biome === 'boreal' ? 1.3 : .8));
    colors.push(tone.r, tone.g, tone.b);
  }
  for (let index = 0; index < source.index.count; index += 3) {
    const triangle = [source.index.getX(index), source.index.getX(index + 1), source.index.getX(index + 2)];
    if (triangle.every(vertex => sourcePosition.getY(vertex) < -.25)) continue;
    triangles.push(...triangle);
  }
  const terrain = source;
  terrain.setIndex(triangles);
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  // La coupe suit le niveau de l'eau, avec anticrenelage, au lieu des aretes de la grille.
  mesh(terrain, material('#ffffff', {
    vertexColors: true, flatShading: false, alphaToCoverage: true,
    clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), .04)], clipShadows: true,
  }));

  const sea = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { time: animationTime, tint: { value: new THREE.Color(theme.water) }, glint: { value: new THREE.Color(theme.glow) }, shoreline: { value: shoreline } },
    vertexShader: `varying vec2 coordinate; varying vec2 coastCoordinate;
      void main(){
        coordinate=uv;
        vec4 worldPosition=modelMatrix*vec4(position,1.0);
        coastCoordinate=worldPosition.xz/vec2(22.,19.8)+.5;
        gl_Position=projectionMatrix*viewMatrix*worldPosition;
      }`,
    fragmentShader: `uniform float time; uniform vec3 tint; uniform vec3 glint; uniform sampler2D shoreline; varying vec2 coordinate; varying vec2 coastCoordinate;
      void main(){
        vec2 point=coordinate*35.;
        float ripple=sin(point.y*7.+sin(point.x*1.6+point.y*.7)*.9-time*.45);
        float crest=smoothstep(.8-fwidth(ripple),1.,ripple)*smoothstep(.25,.95,sin(point.x*2.1+sin(point.y*1.2)));
        float sparkle=pow(max(0.,sin(point.x*.55+point.y*.8-time*.22)),12.)*crest;
        float coast=smoothstep(.02,.85,texture2D(shoreline,coastCoordinate).r);
        float bounds=smoothstep(0.,.02,coastCoordinate.x)*smoothstep(0.,.02,1.-coastCoordinate.x)
          *smoothstep(0.,.02,coastCoordinate.y)*smoothstep(0.,.02,1.-coastCoordinate.y);
        gl_FragColor=vec4(tint+vec3(.025,.04,.037)*crest+glint*sparkle*.16,.32*coast*bounds);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const water = mesh(new THREE.PlaneGeometry(34, 30), sea, new THREE.Vector3(0, -.04, 0));
  water.rotation.x = -Math.PI / 2;
  water.castShadow = false;
  const routeSamples = [];
  const routeMaterial = material(biome === 'boreal' ? '#d5c798' : '#c8b887');
  const finishedMaterial = material('#eed79e', { emissive: '#b38a43', emissiveIntensity: .15 });
  const borderMaterial = material(theme.rock);
  stops.slice(1).forEach((stop, index) => {
    const start = stops[index];
    const distance = Math.hypot(stop.x - start.x, stop.y - start.y);
    const control = { x: (start.x + stop.x) / 2 - (stop.y - start.y) / distance * 32, y: (start.y + stop.y) / 2 + (stop.x - start.x) / distance * 32 };
    const samples = Array.from({ length: 33 }, (_, step) => {
      const fraction = step / 32;
      const horizontal = (1 - fraction) ** 2 * start.x + 2 * (1 - fraction) * fraction * control.x + fraction ** 2 * stop.x;
      const vertical = (1 - fraction) ** 2 * start.y + 2 * (1 - fraction) * fraction * control.y + fraction ** 2 * stop.y;
      routeSamples.push([horizontal, vertical]);
      const point = positionAt(horizontal, vertical, .075);
      point.y = Math.max(.18, point.y);
      if (groundAt(horizontal, vertical) < .12 && step % 2 === 0) {
        const plank = mesh(box, material('#a59675'), point, [.24, .07, .13]);
        plank.rotation.y = -Math.atan2(stop.y - start.y, stop.x - start.x);
      }
      return point;
    });
    const curve = new THREE.CatmullRomCurve3(samples);
    mesh(new THREE.TubeGeometry(curve, 70, .065, 5, false), borderMaterial);
    const trail = mesh(new THREE.TubeGeometry(curve, 70, .038, 5, false), completed[index] ? finishedMaterial : routeMaterial);
    trail.position.y = .03;
  });

  const nearPath = (horizontal, vertical, gap = 40) => routeSamples.some(([pathX, pathY]) => Math.hypot(pathX - horizontal, pathY - vertical) < gap)
    || stops.some(stop => Math.hypot(stop.x - horizontal, stop.y - vertical) < 65);
  const instances = new Map();
  const transform = new THREE.Object3D();
  function instance(geometry, color, position, scale, rotation = 0) {
    const key = geometry.uuid + color;
    if (!instances.has(key)) instances.set(key, { geometry, surface: material(color), transforms: [] });
    transform.position.copy(position);
    transform.scale.set(...scale);
    transform.rotation.set(0, rotation, 0);
    transform.updateMatrix();
    instances.get(key).transforms.push(transform.matrix.clone());
  }

  for (let attempt = 0; attempt < 1200; attempt++) {
    const horizontal = 65 + random() * 870;
    const vertical = 65 + random() * 770;
    const height = groundAt(horizontal, vertical);
    if (height < .16 || nearPath(horizontal, vertical)) continue;
    const density = Math.sin(horizontal * .021) * Math.sin(vertical * .025);
    if (biome === 'jungle' && density < -.12) continue;
    if (biome !== 'jungle' && random() > .45) continue;
    const point = positionAt(horizontal, vertical);
    const size = .35 + random() * .55;
    const color = theme.leaves[Math.floor(random() * theme.leaves.length)];
    if (biome === 'jungle') {
      instance(trunk, '#66593b', point.clone().add(new THREE.Vector3(0, size * .5, 0)), [1, size, 1]);
      for (let crown = 0; crown < 3; crown++) {
        instance(foliage, color, point.clone().add(new THREE.Vector3((random() - .5) * size, size * (1.1 + crown * .16), (random() - .5) * size)), [size * .65, size * .5, size * .6], random() * Math.PI);
      }
    } else if (biome === 'boreal') {
      instance(trunk, '#5b6262', point.clone().add(new THREE.Vector3(0, size * .5, 0)), [1, size, 1]);
      for (let tier = 0; tier < 3; tier++) {
        const radius = size * (.55 - tier * .12);
        instance(pine, tier === 2 ? '#e6eee2' : color, point.clone().add(new THREE.Vector3(0, size * (.7 + tier * .38), 0)), [radius, size * .9, radius]);
      }
    } else if (biome === 'atlantis') {
      for (let branch = 0; branch < 3; branch++) {
        instance(foliage, color, point.clone().add(new THREE.Vector3((branch - 1) * .13, size * .2, 0)), [size * .2, size * (.25 + random() * .4), size * .12], random());
      }
    } else {
      instance(stone, color, point.clone().add(new THREE.Vector3(0, size * .25, 0)), [size * .7, size * (.4 + height * .15), size * .6], random() * Math.PI);
    }
  }

  function sanctuary(horizontal, vertical, scale = 1) {
    const origin = positionAt(horizontal, vertical);
    const stoneColor = biome === 'volcano' ? '#8c7964' : biome === 'boreal' ? '#b2c9c6' : '#c1bd8c';
    for (let tier = 0; tier < 4; tier++) {
      mesh(box, material(stoneColor), origin.clone().add(new THREE.Vector3(0, (.1 + tier * .19) * scale, 0)), [(1.7 - tier * .27) * scale, .2 * scale, (1.3 - tier * .2) * scale]);
    }
    for (const side of [-1, 1]) mesh(box, material(stoneColor), origin.clone().add(new THREE.Vector3(side * .3 * scale, 1.05 * scale, 0)), [.2 * scale, .7 * scale, .3 * scale]);
    mesh(box, material(stoneColor), origin.clone().add(new THREE.Vector3(0, 1.44 * scale, 0)), [1.02 * scale, .24 * scale, .55 * scale]);
    mesh(box, portalMaterial, origin.clone().add(new THREE.Vector3(0, .9 * scale, .05)), [.22 * scale, .4 * scale, .12]);
  }
  if (biome === 'jungle') {
    sanctuary(535, 205, 1.25);
    sanctuary(820, 460, .65);
    const camp = positionAt(150, 710, .42);
    const tent = mesh(new THREE.ConeGeometry(.6, .85, 4), material('#d9b877'), camp, [1, 1, 1.3]);
    tent.rotation.y = Math.PI / 4;
  } else if (biome === 'atlantis') {
    sanctuary(745, 120, 1.25);
    for (const stop of stops) {
      for (let index = 0; index < 5; index++) {
        const angle = Math.PI + index * Math.PI / 5;
        const horizontal = stop.x + Math.cos(angle) * 67;
        const vertical = stop.y + Math.sin(angle) * 48;
        const height = .5 + random() * .9;
        const point = positionAt(horizontal, vertical);
        if (point.y < .1) continue;
        mesh(column, material('#c7d4bd'), point.clone().add(new THREE.Vector3(0, height / 2, 0)), [1, height, 1]);
        mesh(box, material('#e1dec0'), point.clone().add(new THREE.Vector3(0, height, 0)), [.4, .12, .35]);
        mesh(box, material('#a7b8a3'), point.clone().add(new THREE.Vector3(0, .02, 0)), [.45, .12, .45]);
      }
    }
  } else if (biome === 'volcano') {
    lavaMaterial = material('#ef7434', { emissive: '#ff541a', emissiveIntensity: 1.3, roughness: .3 });
    const lava = mesh(new THREE.CircleGeometry(3.5, 72), lavaMaterial, new THREE.Vector3(.33, .13, -.55));
    lava.rotation.x = -Math.PI / 2;
    lava.scale.y = .97;
    lava.castShadow = false;
    lavaLight = new THREE.PointLight('#ff7834', 9, 12, 2);
    lavaLight.position.set(.3, 1.5, -.6);
    scene.add(lavaLight);
    const flow = [];
    for (let vertical = 480; vertical < 820; vertical += 8) {
      const horizontal = 520 + (vertical - 440) * .5;
      const point = positionAt(horizontal, vertical, .06);
      point.y = Math.max(.1, point.y);
      flow.push(point);
    }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(flow), 90, .13, 6, false), lavaMaterial);
    sanctuary(500, 105, .75);
  } else {
    for (const [horizontal, vertical, size] of [[480,230,1.4],[415,520,1.1],[610,400,1.2]]) {
      const point = positionAt(horizontal, vertical);
      mesh(new THREE.ConeGeometry(size, size * 2.8, 5), material('#8299a7'), point.clone().add(new THREE.Vector3(0, size, 0)));
      mesh(new THREE.ConeGeometry(size * .54, size * 1.55, 5), material('#eef1e6'), point.clone().add(new THREE.Vector3(0, size * 1.62, 0)));
    }
    sanctuary(505, 85, .75);
  }

  for (const { geometry, surface, transforms } of instances.values()) {
    const batch = new THREE.InstancedMesh(geometry, surface, transforms.length);
    transforms.forEach((matrix, index) => batch.setMatrixAt(index, matrix));
    batch.castShadow = true;
    batch.receiveShadow = true;
    scene.add(batch);
  }

  // Un seul nuage GPU : les particules suivent le relief et s'effacent avant de reboucler.
  const particlePositions = [];
  const particlePhases = [];
  const particleSizes = [];
  for (let attempt = 0; attempt < 320 && particlePhases.length < 64; attempt++) {
    const horizontal = 75 + random() * 850;
    const vertical = 70 + random() * 780;
    if (groundAt(horizontal, vertical) < .05) continue;
    const point = positionAt(horizontal, vertical, .2);
    particlePositions.push(point.x, point.y, point.z);
    particlePhases.push(random());
    particleSizes.push(2.5 + random() * 3);
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
  particleGeometry.setAttribute('phase', new THREE.Float32BufferAttribute(particlePhases, 1));
  particleGeometry.setAttribute('size', new THREE.Float32BufferAttribute(particleSizes, 1));
  const particleMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      time: animationTime, tint: { value: new THREE.Color(biome === 'boreal' ? '#e1f6ff' : theme.glow) },
      pixelRatio: { value: renderer.getPixelRatio() }, kind: { value: ['jungle', 'atlantis', 'volcano', 'boreal'].indexOf(biome) },
    },
    vertexShader: `uniform float time; uniform float pixelRatio; uniform float kind;
      attribute float phase; attribute float size; varying float visibility;
      void main(){
        float cycle=fract(phase+time*(kind==2.?.095:.045));
        vec3 drift=position;
        drift.x+=sin(time*.3+phase*31.)*.22;
        drift.z+=cos(time*.24+phase*19.)*.16;
        drift.y+=(kind==3.?1.-cycle:cycle)*2.2;
        visibility=smoothstep(0.,.15,cycle)*smoothstep(0.,.2,1.-cycle)*(.65+.25*sin(phase*43.+time*1.2));
        gl_Position=projectionMatrix*modelViewMatrix*vec4(drift,1.);
        gl_PointSize=size*pixelRatio;
      }`,
    fragmentShader: `uniform vec3 tint; uniform float kind; varying float visibility;
      void main(){
        float radius=length(gl_PointCoord-.5);
        float light=1.-smoothstep(.06,.24,radius)+(1.-smoothstep(.12,.5,radius))*.25;
        if(kind==1.) light=(1.-smoothstep(.035,.1,abs(radius-.28)))*.65;
        gl_FragColor=vec4(tint,light*visibility);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  atmosphereMaterials.push(particleMaterial);
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  scene.add(particles);

  if (biome === 'boreal') {
    const auroraMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { time: animationTime },
      vertexShader: `varying vec2 coordinate;
        void main(){coordinate=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float time; varying vec2 coordinate;
        void main(){
          float ribbon=.36+sin(coordinate.x*7.+time*.16)*.12+sin(coordinate.x*13.-time*.1)*.035;
          float veil=exp(-pow((coordinate.y-ribbon)*5.,2.));
          float folds=.55+.45*sin(coordinate.x*55.+time*.2+coordinate.y*5.);
          float edge=smoothstep(0.,.14,coordinate.x)*smoothstep(0.,.14,1.-coordinate.x)
            *smoothstep(0.,.12,coordinate.y)*smoothstep(0.,.25,1.-coordinate.y);
          vec3 tint=mix(vec3(.38,.86,.72),vec3(.42,.67,.92),coordinate.y);
          gl_FragColor=vec4(tint,veil*(.12+folds*.1)*edge);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    atmosphereMaterials.push(auroraMaterial);
    const aurora = new THREE.Mesh(new THREE.PlaneGeometry(19, 4.4), auroraMaterial);
    aurora.position.set(0, 2.8, -7.4);
    aurora.renderOrder = -1;
    scene.add(aurora);
  }

  const anchors = stops.map(stop => positionAt(stop.x, stop.y, .2));
  for (const anchor of anchors) {
    const platform = mesh(new THREE.CylinderGeometry(.31, .38, .12, 12), material('#d4c9a0'), anchor.clone().add(new THREE.Vector3(0, -.1, 0)));
    platform.receiveShadow = true;
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const halfWidth = Math.max(11.3, 8.75 * aspect);
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfWidth / aspect + .4;
    camera.bottom = -halfWidth / aspect + .4;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    onProject(anchors.map(anchor => {
      const projected = anchor.clone().project(camera);
      return { x: (projected.x + 1) * 50, y: (1 - projected.y) * 50 };
    }));
    renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame;
  let previousTime = 0;
  let elapsed = 0;
  function animate(time) {
    if (document.hidden || motion.matches) return;
    frame = requestAnimationFrame(animate);
    if (time - previousTime < 40) return;
    if (previousTime) elapsed += Math.min((time - previousTime) / 1000, .1);
    previousTime = time;
    animationTime.value = elapsed;
    portalMaterial.emissiveIntensity = 1.35 + Math.sin(elapsed * 1.3) * .18;
    finishedMaterial.emissiveIntensity = .15 + Math.sin(elapsed * .8) * .06;
    rimLight.intensity = .8 + Math.sin(elapsed * .35) * .12;
    if (lavaMaterial) {
      const pulse = Math.sin(elapsed * 1.5) * .16 + Math.sin(elapsed * 3.7) * .05;
      lavaMaterial.emissiveIntensity = 1.3 + pulse;
      lavaLight.intensity = 9 + pulse * 8;
    }
    renderer.render(scene, camera);
  }
  // En arriere-plan ou en mouvement reduit, aucune boucle de rendu ne reste active.
  function syncMotion() {
    cancelAnimationFrame(frame);
    previousTime = 0;
    if (!document.hidden && !motion.matches) frame = requestAnimationFrame(animate);
  }
  motion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  syncMotion();
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    motion.removeEventListener('change', syncMotion);
    document.removeEventListener('visibilitychange', syncMotion);
    const geometries = new Set([box, stone, trunk, foliage, pine, column]);
    scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(surface => surface.dispose());
    atmosphereMaterials.forEach(surface => surface.dispose());
    shoreline.dispose();
    sea.dispose();
    sunlight.shadow.dispose();
    renderer.dispose();
    if (!canvas.isConnected) renderer.forceContextLoss();
  };
}