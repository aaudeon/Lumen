import { buildCrocodile } from './crocodile.js';

/** Small, self-owned 3D props that make each tile's rule visible from any angle. */

/** Shared modelling tools: every prop owns its geometries, materials and animations. */
function toolkit(THREE) {
  const geometries = new Set();
  const materials = new Set();
  const animations = [];
  const geometry = value => { geometries.add(value); return value; };
  const block = geometry(new THREE.BoxGeometry(1, 1, 1));
  function material(color, extra = {}) {
    const value = new THREE.MeshStandardMaterial({ color, roughness: .78, flatShading: true, ...extra });
    materials.add(value);
    return value;
  }
  function mesh(parent, shape, surface, position, scale = [1, 1, 1]) {
    const item = new THREE.Mesh(shape, surface);
    item.position.set(...position);
    item.scale.set(...scale);
    item.castShadow = item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function bar(parent, surface, from, to, width, y) {
    const dx = to[0] - from[0], dz = to[1] - from[1];
    const item = mesh(parent, block, surface, [(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2],
      [width, .012, Math.hypot(dx, dz)]);
    item.rotation.y = Math.atan2(dx, dz);
    return item;
  }
  return {
    THREE, geometry, block, material, mesh, bar, animations,
    dispose(root) {
      root.removeFromParent();
      geometries.forEach(value => value.dispose());
      materials.forEach(value => value.dispose());
    },
  };
}

export function createTileHazard({ THREE, tile, biome }) {
  const tools = toolkit(THREE);
  const { block, geometry, material, mesh, bar, animations } = tools;
  const root = new THREE.Group();
  root.name = `hazard-${tile.hazard || 'none'}`;
  let disposed = false;
  const seed = [...String(tile.id)].reduce((sum, character) => sum + character.charCodeAt(0), 0) * .31;
  // Rules that react to the live board rather than to the stone alone.
  let onBoard = () => {};

  if (tile.hazard === 'crocodile') {
    const crocodile = new THREE.Group();
    crocodile.rotation.y = tile.ports.includes('E') && tile.ports.includes('W') ? Math.PI / 2 : -.22;
    root.add(crocodile);
    buildCrocodile(tools, crocodile, seed);
  } else if (tile.hazard === 'ice') {
    const glass=material(0x51badc,{roughness:.12,metalness:.25,emissive:0x2575a5,emissiveIntensity:.28});
    const frost=material(0xdafaff,{emissive:0x53aacb,emissiveIntensity:.5});
    mesh(root,block,glass,[0,.097,0],[.47,.022,.47]);
    const directions={N:[0,-1],E:[1,0],S:[0,1],W:[-1,0]};
    for(const port of tile.ports) {
      const [x,z]=directions[port];
      mesh(root,block,glass,[x*.32,.097,z*.32],[x?.64:.47,.022,z?.64:.47]);
      for(const edge of [-1,1])bar(root,frost,[x*.07+z*edge*.19,z*.07+x*edge*.19],[x*.6+z*edge*.19,z*.6+x*edge*.19],.012,.113);
    }
    // A snowflake on the corner identifies ice even when the route is highlighted.
    for(let ray=0;ray<3;ray++) {
      const a=ray*Math.PI/3,x=Math.cos(a)*.095,z=Math.sin(a)*.095;
      bar(root,frost,[-.43-x,-.43-z],[-.43+x,-.43+z],.014,.085);
    }
    animations.push(t=>{glass.emissiveIntensity=.26+Math.sin(t*1.4+seed)*.06;});
  } else if (tile.hazard === 'current') {
    const water = material(0x37becf, { transparent: true, opacity: .48, metalness: .2, roughness: .22,
      emissive: 0x087f9c, emissiveIntensity: .32, depthWrite: false });
    const foam = material(0xa4fff8, { emissive: 0x35ddeb, emissiveIntensity: 1.2, roughness: .3 });
    const flow = new THREE.Group();
    const angles = { N: 0, E: -Math.PI / 2, S: Math.PI, W: Math.PI / 2 };
    flow.rotation.y = angles[tile.heading || tile.flow] || 0;
    let turn = flow.rotation.y;
    root.add(flow);
    mesh(flow, block, water, [0, .087, 0], [.38, .018, 1.19]);
    for (let i = 0; i < 3; i++) {
      const chevron = new THREE.Group();
      flow.add(chevron);
      bar(chevron, foam, [-.13, .07], [0, -.07], .042, .105);
      bar(chevron, foam, [0, -.07], [.13, .07], .042, .105);
      animations.push(time => {
        const phase = (time * .65 + i / 3) % 1;
        chevron.position.z = .43 - phase * .86;
        chevron.scale.setScalar(.75 + Math.sin(phase * Math.PI) * .3);
      });
    }
    for (const side of [-1, 1]) {
      const bank = mesh(flow, block, foam, [side * .225, .09, 0], [.017, .019, 1.01]);
      bank.material = water;
    }
    // The tide swings the arrow around instead of snapping it to its new heading.
    animations.push(() => {
      const delta = Math.atan2(Math.sin(turn - flow.rotation.y), Math.cos(turn - flow.rotation.y));
      flow.rotation.y += delta * .12;
    });
    onBoard = ({ heading }) => { if (heading && angles[heading] !== undefined) turn = angles[heading]; };
  } else if (tile.hazard === 'fragile' || tile.hazard === 'brittle') {
    const ready = tile.hazard === 'fragile';
    const frozen = biome === 'boreal';
    const dark = material(0x382d34);
    const ember = material(frozen ? (ready ? 0xedb38c : 0x8bb9c5) : ready ? 0xffbd6f : 0x9d7a63,
      { emissive: frozen ? 0x52758b : ready ? 0xff591b : 0x4a1d0a, emissiveIntensity: ready ? 1.1 : .3, roughness: .5 });
    const chip = material(frozen ? 0xb1d0df : 0x775959, { emissive: frozen ? 0x294a60 : 0x44150e, emissiveIntensity: .2 });
    const cracks = ready ? [
      [[-.56, -.38], [-.24, -.24], [.02, -.05], [.16, .23], [.47, .53]],
      [[.55, -.43], [.21, -.27], [.02, -.05], [-.15, .18], [-.51, .39]],
      [[-.24, -.24], [-.11, -.56]],
      [[.16, .23], [.49, .12]],
    ] : [
      [[-.44, -.31], [-.13, -.16], [.14, .12], [.41, .38]],
      [[.34, -.36], [.05, -.11], [-.19, .27]],
    ];
    for (const points of cracks) for (let i = 1; i < points.length; i++) {
      bar(root, dark, points[i - 1], points[i], ready ? .049 : .03, .093);
      bar(root, ember, points[i - 1], points[i], ready ? .018 : .009, .104);
    }
    if (ready) for (let i = 0; i < 5; i++) {
      const angle = i * 2.4;
      const shard = mesh(root, block, chip, [Math.cos(angle) * .51, .085, Math.sin(angle) * .51], [.08, .06, .065]);
      shard.rotation.set(.15, angle, .12);
    }
    animations.push((time, { urgent = false } = {}) => {
      ember.emissiveIntensity = ready ? (urgent ? 1.8 : .9) + Math.sin(time * (urgent ? 14 : 2.5) + seed) * .24
        : .28 + Math.sin(time * 1.4 + seed) * .1;
    });
  } else if (tile.hazard === 'gate') {
    const stone = material(0x8d8377, { roughness: .82 });
    const iron = material(0x59504f, { metalness: .45, roughness: .5 });
    const glyph = material(0xffd88f, { emissive: 0xc4761c, emissiveIntensity: .7, toneMapped: false });
    const frame = new THREE.Group();
    root.add(frame);
    for (const side of [-1, 1]) {
      mesh(frame, block, stone, [side * .43, .27, 0], [.15, .5, .5]);
      mesh(frame, block, iron, [side * .43, .52, 0], [.19, .05, .55]);
    }
    mesh(frame, block, stone, [0, .53, 0], [1.02, .1, .42]);
    const seal = mesh(frame, geometry(new THREE.TorusGeometry(.11, .022, 6, 18)), glyph, [0, .53, .0]);
    seal.rotation.x = Math.PI / 2;
    const grid = new THREE.Group();
    frame.add(grid);
    for (let i = -2; i <= 2; i++) mesh(grid, block, iron, [i * .17, .25, 0], [.055, .46, .07]);
    mesh(grid, block, iron, [0, .42, 0], [.82, .06, .09]);
    let open = 0, target = 0;
    animations.push(time => {
      open += (target - open) * .11;
      grid.position.y = -open * .52;
      grid.visible = open < .97;
      glyph.emissiveIntensity = (open > .5 ? 1.6 : .45) + Math.sin(time * 2.2 + seed) * .18;
      glyph.color.set(open > .5 ? 0xa8ffdc : 0xffd88f);
    });
    onBoard = ({ gatesOpen }) => { target = gatesOpen ? 1 : 0; };
  } else if (tile.hazard === 'weight') {
    const granite = material(0x6f6a64, { roughness: .9 });
    const brass = material(0xc79a52, { metalness: .55, roughness: .35, emissive: 0x4a3007, emissiveIntensity: .25 });
    const core = mesh(root, block, granite, [0, .22, 0], [.46, .28, .46]);
    core.rotation.y = .2;
    mesh(root, block, brass, [0, .37, 0], [.5, .05, .5]).rotation.y = .2;
    mesh(root, block, brass, [0, .1, 0], [.52, .045, .52]).rotation.y = .2;
    const handle = mesh(root, geometry(new THREE.TorusGeometry(.11, .022, 6, 16)), brass, [0, .43, 0]);
    handle.rotation.x = Math.PI / 2;
    animations.push(time => {
      brass.emissiveIntensity = .2 + Math.sin(time * 1.7 + seed) * .1;
      handle.position.y = .43 + Math.sin(time * 1.1 + seed) * .006;
    });
  } else if (tile.hazard === 'submerged') {
    const water = material(0x2f8fb4, { transparent: true, opacity: .62, roughness: .12, metalness: .3,
      emissive: 0x0d4f68, emissiveIntensity: .4, depthWrite: false });
    const weed = material(0x4d8f76, { roughness: .9 });
    const sheet = mesh(root, block, water, [0, .2, 0], [1.16, .3, 1.16]);
    sheet.castShadow = false;
    for (let i = 0; i < 4; i++) {
      const blade = mesh(root, block, weed, [Math.cos(i * 1.9) * .34, .12, Math.sin(i * 1.9) * .34], [.05, .18, .05]);
      blade.rotation.z = Math.sin(i) * .3;
    }
    let depth = 1, target = 1;
    animations.push(time => {
      depth += (target - depth) * .07;
      sheet.visible = depth > .04;
      sheet.scale.y = .04 + depth * .3;
      sheet.position.y = .06 + depth * .16 + Math.sin(time * 1.4 + seed) * .012;
      water.opacity = .18 + depth * .46;
    });
    onBoard = ({ tide }) => { target = tide === 'basse' ? 0 : 1; };
  }
  return {
    root,
    /** Board-wide values the stone reacts to: tide level, gates, current heading. */
    apply(board) { onBoard(board); },
    update(time, context) { for (const animate of animations) animate(time, context); },
    dispose() {
      if (disposed) return;
      disposed = true;
      tools.dispose(root);
    },
  };
}

/** A crocodile that patrols cells of its own: it never belongs to a single stone. */
export function createGuardian({ THREE, seed = 0 }) {
  const tools = toolkit(THREE);
  const root = new THREE.Group();
  root.name = 'patrolling-guardian';
  const body = new THREE.Group();
  root.add(body);
  buildCrocodile(tools, body, seed);
  let heading = 0;
  let walking = 0;
  let disposed = false;
  return {
    root,
    /** Face the next cell while gliding towards the current one. */
    face(angle) { heading = angle; },
    update(time, dt, moving, context = {}) {
      walking += ((moving ? 1 : 0) - walking) * (1 - Math.exp(-dt * 9));
      const turn = Math.atan2(Math.sin(heading - body.rotation.y), Math.cos(heading - body.rotation.y));
      body.rotation.y += turn * (1 - Math.exp(-dt * 9));
      for (const animate of tools.animations) animate(time, { ...context, walking, dt });
    },
    dispose() { if (!disposed) { disposed = true; tools.dispose(root); } },
  };
}

/** Ground fittings anchored to a cell: pressure seals, levers and hidden treasure. */
export function createCellFeature({ THREE, kind, palette = {} }) {
  const tools = toolkit(THREE);
  const { block, geometry, material, mesh, animations } = tools;
  const root = new THREE.Group();
  root.name = `cell-${kind}`;
  let disposed = false;
  let lit = 0, target = 0;
  let onState = () => {};

  if (kind === 'seal') {
    const stone = material(0x7d7468, { roughness: .95 });
    const glyph = material(0xffd88f, { emissive: 0x8a5a12, emissiveIntensity: .5, toneMapped: false });
    const plate = mesh(root, geometry(new THREE.CylinderGeometry(.44, .48, .05, 12)), stone, [0, .028, 0]);
    plate.castShadow = false;
    const ring = mesh(root, geometry(new THREE.TorusGeometry(.3, .028, 6, 24)), glyph, [0, .06, 0]);
    ring.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const spoke = mesh(root, block, glyph, [Math.cos(i * 1.57) * .19, .06, Math.sin(i * 1.57) * .19], [.13, .02, .05]);
      spoke.rotation.y = -i * 1.57;
    }
    animations.push(time => {
      lit += (target - lit) * .12;
      glyph.emissiveIntensity = .25 + lit * (1.5 + Math.sin(time * 3) * .3);
      glyph.color.set(lit > .5 ? 0xa8ffdc : 0xffd88f);
      ring.position.y = .06 - lit * .022;
      ring.scale.setScalar(1 + lit * .06);
    });
    onState = pressed => { target = pressed ? 1 : 0; };
  } else if (kind === 'lever') {
    const stone = material(0x7d7468, { roughness: .95 });
    const brass = material(0xc79a52, { metalness: .5, roughness: .38 });
    const glow = material(0xffe0a0, { emissive: 0xc4761c, emissiveIntensity: .8, toneMapped: false });
    mesh(root, block, stone, [0, .1, 0], [.42, .2, .42]);
    const post = new THREE.Group();
    post.position.set(0, .2, 0);
    root.add(post);
    mesh(post, block, brass, [0, .17, 0], [.07, .34, .07]);
    mesh(post, geometry(new THREE.SphereGeometry(.075, 10, 8)), glow, [0, .35, 0]);
    animations.push(time => {
      lit += (target - lit) * .1;
      post.rotation.x = -lit * 1.05;
      glow.emissiveIntensity = .4 + lit * 1.6 + Math.sin(time * 2.6) * .15;
      glow.color.set(lit > .5 ? 0xa8ffdc : 0xffe0a0);
    });
    onState = pulled => { target = pulled ? 1 : 0; };
  } else if (kind === 'relic') {
    const gold = material(palette.gold ?? 0xf3cd7f, { metalness: .7, roughness: .22,
      emissive: 0xa5741d, emissiveIntensity: .5 });
    const gem = material(palette.gem ?? 0x8be9cd, { emissive: palette.gem ?? 0x2fae8f,
      emissiveIntensity: 1.5, roughness: .18, toneMapped: false });
    const float = new THREE.Group();
    float.position.y = .52;
    root.add(float);
    const base = mesh(float, geometry(new THREE.TorusGeometry(.13, .026, 6, 20)), gold, [0, -.08, 0]);
    base.rotation.x = Math.PI / 2;
    mesh(float, geometry(new THREE.OctahedronGeometry(.115)), gem, [0, .05, 0]);
    for (let i = 0; i < 3; i++) {
      const shard = mesh(float, block, gold, [Math.cos(i * 2.1) * .17, -.02, Math.sin(i * 2.1) * .17], [.035, .1, .035]);
      shard.rotation.z = Math.cos(i * 2.1) * .4;
      shard.rotation.x = -Math.sin(i * 2.1) * .4;
    }
    const halo = mesh(float, geometry(new THREE.TorusGeometry(.24, .008, 5, 28)), gem, [0, -.05, 0]);
    halo.rotation.x = Math.PI / 2;
    halo.castShadow = false;
    animations.push(time => {
      lit += (target - lit) * .1;
      root.visible = lit < .98;
      float.position.y = .52 + Math.sin(time * 1.4) * .045 + lit * .9;
      float.rotation.y = time * .8;
      float.scale.setScalar(Math.max(.001, 1 - lit));
      halo.rotation.z = time * 1.4;
      gem.emissiveIntensity = 1.2 + Math.sin(time * 3.4) * .35;
    });
    // Taken treasure rises and fades instead of blinking out.
    onState = taken => { target = taken ? 1 : 0; };
  }
  return {
    root,
    set(value) { onState(value); },
    update(time) { for (const animate of animations) animate(time); },
    dispose() { if (!disposed) { disposed = true; tools.dispose(root); } },
  };
}

/** A reusable pool keeps falling stones and embers inexpensive across a campaign. */
export function createCollapseEffects({ THREE, world }) {
  const root = new THREE.Group();
  root.name = 'falling-stone-fragments';
  world.add(root);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const stone = new THREE.MeshStandardMaterial({ color: 0x8d6757, roughness: .95, flatShading: true });
  const ember = new THREE.MeshStandardMaterial({ color: 0xffb06c, emissive: 0xff4b12, emissiveIntensity: 1.3 });
  const fragments = Array.from({ length: 64 }, (_, index) => {
    const item = new THREE.Mesh(geometry, index % 3 ? stone : ember);
    item.visible = false;
    root.add(item);
    return { item, age: 2, velocity: new THREE.Vector3(), size: 0 };
  });
  let cursor = 0;
  let disposed = false;
  return {
    burst(position) {
      for (let i = 0; i < 14; i++) {
        const fragment = fragments[cursor++ % fragments.length];
        const angle = i * 2.39996;
        fragment.age = 0;
        fragment.size = .045 + (i % 4) * .025;
        fragment.item.visible = true;
        fragment.item.position.copy(position);
        fragment.item.position.x += Math.cos(angle) * .41;
        fragment.item.position.z += Math.sin(angle) * .41;
        fragment.item.position.y += .1;
        fragment.item.rotation.set(i, angle, i * .2);
        fragment.velocity.set(Math.cos(angle) * .8, .6 + (i % 5) * .12, Math.sin(angle) * .8);
      }
    },
    update(dt) {
      for (const fragment of fragments) {
        if (!fragment.item.visible) continue;
        fragment.age += dt;
        if (fragment.age > .85) { fragment.item.visible = false; continue; }
        fragment.velocity.y -= dt * 5.5;
        fragment.item.position.addScaledVector(fragment.velocity, dt);
        fragment.item.rotation.x += dt * 3;
        fragment.item.rotation.z += dt * 2;
        fragment.item.scale.setScalar(fragment.size * Math.min(1, (1 - fragment.age / .85) * 3));
      }
    },
    clear() { fragments.forEach(fragment => { fragment.item.visible = false; }); },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      geometry.dispose();
      stone.dispose();
      ember.dispose();
    },
  };
}
