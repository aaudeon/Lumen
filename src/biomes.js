import { buildBorealEnvironment } from './boreal-environment.js';
/** Scene palettes and self-owned scenery for the expedition's worlds. */
export const BIOME_PALETTES = {
  boreal: {
    fog:0x24354f,fogDensity:.024,sky:0xbbdaeb,ground:0x26374c,
    sun:0xf4e9d5,sunPower:3.3,rimLight:0x8bebd1,ambient:1.1,
    rock:0x69879c,base:0xa5c5d5,rim:0xe5e8cf,dark:0x38516a,
    tile:0xe4edf0,edge:0x99bfcd,active:0xf2f5e8,hover:0xffefd1,occupied:0xf5e4b6,
    path:0xe5d6b7,connected:0xb2f4de,trace:0xa7bbce,traceGlow:0x466c83,
    connectedGlow:0x60cfb7,highlight:0x243d57,gold:0xf3d596,goldGlow:0xa9894d,
    portal:0xa2f8df,motes:0xd9f5ff,shaft:0xb7dce9,
  },
  jungle: {
    fog: 0x193b2d, fogDensity: 0.026, sky: 0x9fc6c0, ground: 0x12271b,
    sun: 0xffd593, sunPower: 4.1, rimLight: 0x78b6b1, ambient: 0.85,
    rock: 0x667165, base: 0xb5c2ae, rim: 0xe3d1a8, dark: 0x68746b,
    tile: 0xe0e4ca, edge: 0xc5c9ad, active: 0xeff2d3, hover: 0xfff1d3, occupied: 0xf1efc1,
    path: 0xf1e0bb, connected: 0x95efca, trace: 0xcdbd8e, traceGlow: 0x8c7951,
    connectedGlow: 0x4fd9b7, highlight: 0x183d2e, gold: 0xf5d38b, goldGlow: 0xc89340,
    portal: 0x7dfbdd, motes: 0xe5dca4, shaft: 0xffd286,
  },
  atlantis: {
    fog: 0x123b51, fogDensity: 0.035, sky: 0x9adce5, ground: 0x103448,
    sun: 0xb7eeff, sunPower: 3.4, rimLight: 0x59eddf, ambient: 1.05,
    rock: 0x506f7d, base: 0xa5c8ce, rim: 0xd0e4de, dark: 0x587e8d,
    tile: 0xe5f4f2, edge: 0xc1dce1, active: 0xf0fffc, hover: 0xffffff, occupied: 0xfff2c9,
    path: 0xd0e6e2, connected: 0x79f7ef, trace: 0x91bcc7, traceGlow: 0x287998,
    connectedGlow: 0x26dce5, highlight: 0x18465b, gold: 0xd6eeca, goldGlow: 0x4aacac,
    portal: 0x5efaff, motes: 0xa1e9ff, shaft: 0x88dbf6,
  },
  volcano: {
    fog: 0x312027, fogDensity: 0.025, sky: 0xc4a4aa, ground: 0x32151b,
    sun: 0xffbd8d, sunPower: 3.6, rimLight: 0xee6656, ambient: 1.05,
    rock: 0x41404b, base: 0x8d7c77, rim: 0xc7a58b, dark: 0x554951,
    tile: 0xd4cbd2, edge: 0xb8a4b4, active: 0xf0ddd2, hover: 0xffe7d5, occupied: 0xffddb1,
    path: 0xedc596, connected: 0xffca83, trace: 0xd59b78, traceGlow: 0x9c4931,
    connectedGlow: 0xf78035, highlight: 0x4e251c, gold: 0xffc47c, goldGlow: 0xec7836,
    portal: 0xff9a48, motes: 0xff9955, shaft: 0xff9274,
  },
};

export function createBiomeEnvironment({ THREE, world, maps = {}, boardTextures }) {
  const root = new THREE.Group();
  root.name = 'expedition-biomes';
  world.add(root);
  const variants = new Map();
  let active = null;
  let disposed = false;

  function build(kind) {
    if(kind==='boreal') {const value=buildBorealEnvironment(THREE,root);variants.set(kind,value);return value;}
    const group = new THREE.Group();
    group.name = `${kind}-environment`;
    root.add(group);
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const instances = [];
    const animate = [];
    const geometry = value => { geometries.add(value); return value; };
    const material = value => { materials.add(value); return value; };
    const stone = material(new THREE.MeshStandardMaterial({ color: kind === 'atlantis' ? 0x92b8bd : 0x42414b,
      map: boardTextures?.get(kind).edge || maps.stone || null, roughness: 0.95, flatShading: true }));
    const trim = material(new THREE.MeshStandardMaterial({ color: kind === 'atlantis' ? 0xccd6ba : 0x80625d,
      roughness: 0.85, metalness: 0.1 }));
    const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 7));
    const block = geometry(new THREE.BoxGeometry(1, 1, 1));
    const rock = geometry(new THREE.DodecahedronGeometry(1, 0));
    function mesh(shape, surface, position, scale, shadow = true) {
      const item = new THREE.Mesh(shape, surface);
      item.position.set(...position);
      item.scale.set(...scale);
      item.castShadow = shadow;
      item.receiveShadow = shadow;
      group.add(item);
      return item;
    }
    function batch(shape, surface, transforms, shadow = true) {
      const items = new THREE.InstancedMesh(shape, surface, transforms.length);
      const transform = new THREE.Object3D();
      transforms.forEach((value, i) => {
        transform.position.set(...value.position);
        transform.scale.set(...value.scale);
        transform.rotation.set(...(value.rotation || [0, 0, 0]));
        if (value.quaternion) transform.quaternion.copy(value.quaternion);
        transform.updateMatrix();
        items.setMatrixAt(i, transform.matrix);
      });
      items.castShadow = shadow;
      items.receiveShadow = shadow;
      group.add(items);
      instances.push(items);
      return items;
    }
    const positions = [[-3.38, -3.18], [3.34, -3.2], [-3.32, 3.21], [3.4, 3.28]];
    if (kind === 'atlantis') {
      positions.forEach(([x, z], i) => {
        const height = i === 2 ? 0.78 : 1.32 + (i % 2) * 0.38;
        mesh(block, trim, [x, -0.12, z], [0.7, 0.18, 0.7]);
        mesh(block, stone, [x, -0.28, z], [0.85, 0.16, 0.85]);
        mesh(cylinder, stone, [x, height / 2, z], [0.2, height, 0.2]);
        mesh(cylinder, trim, [x, 0.08, z], [0.28, 0.14, 0.28]);
        mesh(block, trim, [x, height + 0.05, z], [0.57, 0.15, 0.57]);
        // Ribs break up the shaft and catch the moving underwater light.
        for (let j = 0; j < 4; j++) {
          const angle = j * Math.PI / 2;
          mesh(cylinder, trim, [x + Math.cos(angle) * 0.195, height / 2, z + Math.sin(angle) * 0.195],
            [0.026, height * 0.86, 0.026], false);
        }
      });
      const fallen = mesh(cylinder, stone, [-3.22, -0.35, 0.45], [0.22, 1.15, 0.22]);
      fallen.rotation.x = 1.38;
      const coralColors = [0xd67a9e, 0xdea870, 0x63b9bb];
      const up = new THREE.Vector3(0, 1, 0);
      coralColors.forEach((color, colorIndex) => {
        const coral = material(new THREE.MeshStandardMaterial({ color, roughness: 0.88,
          emissive: color, emissiveIntensity: 0.08 }));
        const segments = [];
        for (let cluster = 0; cluster < 3; cluster++) {
          const angle = (colorIndex * 3 + cluster) * Math.PI * 2 / 9 + 0.1;
          const radius = 3.3 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          for (let branch = 0; branch < 5; branch++) {
            const branchAngle = branch * 2.4;
            const a = new THREE.Vector3(x, -0.28, z);
            const b = new THREE.Vector3(x + Math.cos(branchAngle) * 0.26, 0.18 + (branch % 3) * 0.15, z + Math.sin(branchAngle) * 0.26);
            const direction = b.clone().sub(a);
            segments.push({ position: a.clone().add(b).multiplyScalar(0.5).toArray(),
              scale: [0.04, direction.length(), 0.04], quaternion: new THREE.Quaternion().setFromUnitVectors(up, direction.normalize()) });
            segments.push({ position: [b.x + Math.cos(branchAngle + 1) * 0.06, b.y + 0.1, b.z],
              scale: [0.032, 0.24, 0.032], rotation: [0.2, 0, -0.5 * Math.cos(branchAngle)] });
          }
        }
        batch(cylinder, coral, segments, false);
      });
    } else {
      const pillars = [];
      const rocks = [];
      for (let i = 0; i < 22; i++) {
        const angle = i * 2.39996;
        const radius = (3.12 + (i % 3) * 0.18) / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
        const height = 0.48 + (i % 5) * 0.21;
        pillars.push({ position: [Math.cos(angle) * radius, height / 2 - 0.65, Math.sin(angle) * radius],
          scale: [0.17 + (i % 2) * 0.1, height, 0.2], rotation: [0, i * 0.5, 0] });
        if (i % 2 === 0) rocks.push({ position: [Math.cos(angle) * radius, -0.7, Math.sin(angle) * radius],
          scale: [0.5, 0.4 + (i % 3) * 0.1, 0.45], rotation: [i, i * 0.4, 0] });
      }
      batch(cylinder, stone, pillars);
      batch(rock, stone, rocks);
      const molten = material(new THREE.MeshStandardMaterial({ color: 0xffa351, emissive: 0xff581f,
        emissiveIntensity: 1.6, toneMapped: false, roughness: 0.65 }));
      const fissures = [];
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        const radius = 3.05 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
        fissures.push({ position: [Math.cos(angle) * radius, -0.64, Math.sin(angle) * radius],
          scale: [0.055, 0.04, 0.55], rotation: [0, Math.PI / 2 - angle, 0] });
      }
      batch(block, molten, fissures, false);
      animate.push(time => { molten.emissiveIntensity = 1.3 + Math.sin(time * 1.7) * 0.18; });
    }

    // A single surface adds depth below the floating ruins without covering any puzzle tile.
    const liquid = material(new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, volcanic: { value: kind === 'volcano' ? 1 : 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `uniform float time;uniform float volcanic;varying vec2 vUv;
        void main(){vec2 p=(vUv-.5)*2.;float r=length(p);
          float a=sin(p.x*24.+sin(p.y*17.+time*.6)*2.+time*.45);
          float b=sin(p.y*29.-sin(p.x*13.-time*.4)*2.-time*.3);
          float veins=pow(1.-abs(a*b),7.);
          vec3 water=mix(vec3(.015,.18,.24),vec3(.1,.58,.64),veins*.65);
          vec3 lava=mix(vec3(.27,.027,.018),vec3(1.8,.48,.07),veins);
          gl_FragColor=vec4(mix(water,lava,volcanic),(1.-smoothstep(.84,1.,r))*mix(.44,.87,volcanic));}`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, toneMapped: false,
    }));
    const surface = mesh(geometry(new THREE.PlaneGeometry(8.7, 8.7)), liquid, [0, -1.57, 0], [1, 1, 1], false);
    surface.rotation.x = -Math.PI / 2;
    animate.push(time => { liquid.uniforms.time.value = time; });
    const light = new THREE.PointLight(kind === 'atlantis' ? 0x4fdfff : 0xff551f,
      kind === 'atlantis' ? 3.3 : 5.2, 9, 1.7);
    light.position.set(0, -0.55, 0);
    group.add(light);

    const size = 24;
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
      const offset = (y * size + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
      pixels[offset + 3] = Math.round(255 * (kind === 'atlantis'
        ? Math.max(0, 1 - Math.abs(radius - 0.65) * 7) * 0.65
        : Math.max(0, 1 - radius) ** 2));
    }
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    textures.add(texture);
    const count = kind === 'atlantis' ? 42 : 64;
    const motes = new Float32Array(count * 3);
    const particleGeometry = geometry(new THREE.BufferGeometry());
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(motes, 3));
    const particleMaterial = material(new THREE.PointsMaterial({ color: kind === 'atlantis' ? 0xb6efff : 0xff9d42,
      map: texture, size: kind === 'atlantis' ? 0.15 : 0.1, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.8 }));
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.frustumCulled = false;
    group.add(particles);
    animate.push(time => {
      for (let i = 0; i < count; i++) {
        const angle = i * 2.39996;
        const radius = (3.05 + (i % 7) * 0.13) / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
        motes[i * 3] = Math.cos(angle) * radius + Math.sin(time * 0.55 + i) * 0.11;
        motes[i * 3 + 1] = -1.25 + ((time * (kind === 'atlantis' ? 0.24 : 0.38) + i * 0.173) % 3.7);
        motes[i * 3 + 2] = Math.sin(angle) * radius + Math.cos(time * 0.6 + i) * 0.1;
      }
      particleGeometry.attributes.position.needsUpdate = true;
    });
    const value = { group, animate, dispose() {
      group.removeFromParent();
      instances.forEach(item => item.dispose());
      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      textures.forEach(item => item.dispose());
      group.clear();
    } };
    variants.set(kind, value);
    return value;
  }
  return {
    setBiome(kind) {
      if (disposed) return;
      active = ['atlantis','volcano','boreal'].includes(kind) ? kind : null;
      if (active && !variants.has(active)) build(active);
      variants.forEach((value, name) => { value.group.visible = name === active; });
    },
    update(time) {
      if (disposed || !active) return;
      variants.get(active)?.animate.forEach(update => update(time));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      variants.forEach(value => value.dispose());
      variants.clear();
      root.removeFromParent();
      root.clear();
    },
  };
}
