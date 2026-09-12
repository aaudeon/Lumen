/** Deux architectures partageant le meme emplacement, sans changer le taquin. */
export function buildEchoEnvironment(THREE, parent) {
  const group = new THREE.Group(); group.name = 'echoes-environment'; parent.add(group);
  const geometries = new Set(), materials = new Set();
  const geometry = shape => { geometries.add(shape); return shape; };
  const box = geometry(new THREE.BoxGeometry(1, 1, 1));
  const column = geometry(new THREE.CylinderGeometry(1, 1, 1, 8));
  const stone = geometry(new THREE.DodecahedronGeometry(1, 0));
  const arch = geometry(new THREE.TorusGeometry(1.05, .12, 8, 40, Math.PI));
  const ruins = new THREE.Group(), past = new THREE.Group();
  ruins.name = 'echoes-ruins'; past.name = 'echoes-past'; group.add(ruins, past);
  const ruinedMaterials = [], pastMaterials = [];
  function material(color, era, options = {}) {
    const surface = new THREE.MeshStandardMaterial({ color, roughness: .8, transparent: true, ...options });
    materials.add(surface); (era ? pastMaterials : ruinedMaterials).push(surface); return surface;
  }
  const aged = material(0x536e66, 0), moss = material(0x304d3a, 0), wornCopper = material(0x5b9b8e, 0, { metalness: .6 });
  const ivory = material(0xe0e5d4, 1), rose = material(0xbc8e8b, 1), brass = material(0xd7b369, 1, { metalness: .65 });
  function mesh(owner, shape, surface, position, scale) {
    const object = new THREE.Mesh(shape, surface); object.position.set(...position); object.scale.set(...scale);
    object.castShadow = object.receiveShadow = true; owner.add(object); return object;
  }
  for (let index = 0; index < 6; index++) {
    const horizontal = -3.4 + index % 3 * 3.4, depth = index < 3 ? -3.55 : 3.55;
    if (index === 1 || index === 4) continue;
    const height = index % 2 ? 1.4 : .85;
    mesh(ruins, column, aged, [horizontal, height / 2 - .25, depth], [.25, height, .25]);
    mesh(ruins, stone, aged, [horizontal + .18, -.4, depth + .13], [.65, .4, .55]);
    mesh(ruins, box, wornCopper, [horizontal, height - .16, depth], [.63, .13, .59]).rotation.y = index * .22;
    for (let leaf = 0; leaf < 4; leaf++) mesh(ruins, stone, moss,
      [horizontal + Math.sin(leaf * 2.4) * .3, height - .12 + leaf * .08, depth + Math.cos(leaf * 2.4) * .27], [.22, .08, .15]);
    mesh(past, column, ivory, [horizontal, .98, depth], [.25, 2.45, .25]);
    mesh(past, box, brass, [horizontal, 2.27, depth], [.68, .15, .65]);
    mesh(past, box, rose, [horizontal, -.13, depth], [.75, .18, .75]);
  }
  for (const horizontal of [-2.2, 0, 2.2]) {
    const gateway = mesh(past, arch, ivory, [horizontal, 1.12, -3.65], [1, 1, 1]);
    gateway.rotation.z = 0;
    for (const side of [-1, 1]) mesh(past, column, rose, [horizontal + side * 1.05, .35, -3.65], [.115, 1.6, .115]);
    const fallen = mesh(ruins, column, aged, [horizontal, -.48, -3.5], [.19, 1.4, .19]);
    fallen.rotation.z = 1.25; fallen.rotation.y = horizontal;
  }
  const halo = mesh(past, geometry(new THREE.TorusGeometry(1.3, .055, 8, 80)), brass, [0, 2.48, -3.95], [1, 1, 1]);
  for (let index = 0; index < 12; index++) {
    const angle = index * Math.PI / 6;
    const mark = mesh(past, box, brass, [Math.cos(angle) * 1.15, 2.48 + Math.sin(angle) * 1.15, -3.95], [.035, .15, .05]);
    mark.rotation.z = angle - Math.PI / 2;
  }
  const light = new THREE.PointLight(0xf6dfaa, 0, 15, 2); light.position.set(0, 3, -2); group.add(light);
  let phase = 0, blend = 0, previousTime = null, disposed = false;
  function animate(time) {
    const delta = previousTime === null ? 0 : Math.max(0, Math.min(.1, time - previousTime)); previousTime = time;
    blend += (phase - blend) * (1 - Math.exp(-delta * 7));
    if (Math.abs(blend - phase) < .003) blend = phase;
    for (const surface of ruinedMaterials) { surface.opacity = 1 - blend; surface.depthWrite = blend < .5; }
    for (const surface of pastMaterials) { surface.opacity = blend; surface.depthWrite = blend >= .5; }
    ruins.visible = blend < .999; past.visible = blend > .001;
    light.intensity = blend * 7;
    halo.rotation.z = time * .07;
  }
  animate(0);
  return { group, animate: [animate], setPhase(value) { phase = value ? 1 : 0; },
    dispose() { if (disposed) return; disposed = true; group.removeFromParent(); geometries.forEach(shape => shape.dispose()); materials.forEach(surface => surface.dispose()); } };
}