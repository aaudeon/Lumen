/** Small, self-owned 3D props that make each tile's rule visible from any angle. */
export function createTileHazard({ THREE, tile }) {
  const root = new THREE.Group();
  root.name = `hazard-${tile.hazard || 'none'}`;
  const geometries = new Set();
  const materials = new Set();
  const animations = [];
  let disposed = false;
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
  const seed = [...String(tile.id)].reduce((sum, character) => sum + character.charCodeAt(0), 0) * .31;

  if (tile.hazard === 'crocodile') {
    const skin = material(0x427b43);
    const dark = material(0x254b2e);
    const belly = material(0xc0ba75);
    const eye = material(0xf7ca4f, { emissive: 0x9b4a11, emissiveIntensity: .4 });
    const pupil = material(0x182c25);
    const ivory = material(0xffecc0);
    const mouth = material(0x753f37);
    const crocodile = new THREE.Group();
    crocodile.rotation.y = tile.ports.includes('E') && tile.ports.includes('W') ? Math.PI / 2 : -.22;
    root.add(crocodile);
    const body = new THREE.Group();
    crocodile.add(body);
    mesh(body, block, skin, [0, .205, -.075], [.34, .20, .56]);
    mesh(body, block, belly, [0, .13, .015], [.29, .06, .59]);
    for (const side of [-1, 1]) {
      for (const z of [-.22, .12]) {
        const leg = mesh(body, block, skin, [side * .225, .125, z], [.18, .10, .13]);
        leg.rotation.y = side * .35;
        mesh(body, block, dark, [side * .30, .092, z + .035], [.13, .045, .14]);
        for (let claw = 0; claw < 2; claw++) mesh(body, block, ivory,
          [side * (.26 + claw * .06), .10, z + .118], [.025, .018, .045]);
      }
    }
    mesh(body, block, mouth, [0, .19, .36], [.255, .024, .30]);
    mesh(body, block, belly, [0, .17, .365], [.28, .055, .32]);
    const jaw = new THREE.Group();
    jaw.position.set(0, .245, .18);
    body.add(jaw);
    mesh(jaw, block, skin, [0, 0, .14], [.30, .105, .34]);
    for (const side of [-1, 1]) {
      mesh(jaw, block, dark, [side * .105, .06, .025], [.115, .085, .125]);
      mesh(jaw, block, eye, [side * .115, .085, .061], [.067, .062, .067]);
      mesh(jaw, block, pupil, [side * .118, .093, .098], [.027, .044, .012]);
      mesh(jaw, block, dark, [side * .076, .06, .256], [.027, .018, .025]);
      for (const z of [.10, .22]) mesh(jaw, block, ivory, [side * .128, -.063, z], [.028, .052, .032]);
    }
    const tail = new THREE.Group();
    tail.position.set(0, .17, -.30);
    body.add(tail);
    mesh(tail, block, skin, [0, -.005, -.15], [.22, .13, .31]);
    const tip = mesh(tail, block, dark, [.045, -.015, -.36], [.105, .075, .24]);
    tip.rotation.y = -.30;
    const spike = geometry(new THREE.ConeGeometry(.065, .10, 4));
    for (let i = 0; i < 4; i++) mesh(body, spike, dark, [0, .35, .13 - i * .12], [1, 1, 1]);
    animations.push(time => {
      body.position.y = Math.sin(time * 1.8 + seed) * .008;
      tail.rotation.y = Math.sin(time * 1.15 + seed) * .17;
      jaw.rotation.x = -.08 - Math.max(0, Math.sin(time * .75 + seed)) ** 8 * .19;
    });
  } else if (tile.hazard === 'current') {
    const water = material(0x37becf, { transparent: true, opacity: .48, metalness: .2, roughness: .22,
      emissive: 0x087f9c, emissiveIntensity: .32, depthWrite: false });
    const foam = material(0xa4fff8, { emissive: 0x35ddeb, emissiveIntensity: 1.2, roughness: .3 });
    const flow = new THREE.Group();
    flow.rotation.y = { N: 0, E: -Math.PI / 2, S: Math.PI, W: Math.PI / 2 }[tile.flow] || 0;
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
  } else if (tile.hazard === 'fragile') {
    const dark = material(0x382d34);
    const ember = material(0xffbd6f, { emissive: 0xff591b, emissiveIntensity: 1.1, roughness: .5 });
    const chip = material(0x775959, { emissive: 0x44150e, emissiveIntensity: .2 });
    const cracks = [
      [[-.56, -.38], [-.24, -.24], [.02, -.05], [.16, .23], [.47, .53]],
      [[.55, -.43], [.21, -.27], [.02, -.05], [-.15, .18], [-.51, .39]],
      [[-.24, -.24], [-.11, -.56]],
      [[.16, .23], [.49, .12]],
    ];
    for (const points of cracks) for (let i = 1; i < points.length; i++) {
      bar(root, dark, points[i - 1], points[i], .049, .093);
      bar(root, ember, points[i - 1], points[i], .018, .104);
    }
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4;
      const shard = mesh(root, block, chip, [Math.cos(angle) * .51, .085, Math.sin(angle) * .51], [.08, .06, .065]);
      shard.rotation.set(.15, angle, .12);
    }
    animations.push((time, { urgent = false } = {}) => {
      ember.emissiveIntensity = (urgent ? 1.8 : .9) + Math.sin(time * (urgent ? 14 : 2.5) + seed) * .24;
    });
  }
  return {
    root,
    update(time, context) { for (const animate of animations) animate(time, context); },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      geometries.forEach(value => value.dispose());
      materials.forEach(value => value.dispose());
    },
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
