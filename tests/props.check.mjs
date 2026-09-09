/** Builds, animates and disposes every tile prop outside the browser. */
// The rig paints its textures on a canvas; outside a browser a recorder stands in.
const strokes = [];
globalThis.document = {
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => ({ set fillStyle(value) { strokes.push(value); }, fillRect() {} }),
  }),
};

import * as THREE from 'three';
import { createTileHazard, createGuardian, createCellFeature } from '../src/hazards.js';
import { createTileScenery, getBoardProfile } from '../src/boards.js';
import { createExplorer } from '../src/explorer.js';
import { CATALOGUE, DEFAULT_LOOK, ITEMS } from '../src/cosmetics.js';

for (const hazard of [null, 'crocodile', 'current', 'fragile', 'brittle', 'gate', 'weight', 'submerged']) {
  const tile = { id: `t-${hazard}`, ports: ['W', 'E'], hazard, flow: 'E', heading: 'W' };
  const prop = createTileHazard({ THREE, tile });
  prop.apply({ gatesOpen: true, tide: 'basse', heading: 'S' });
  for (let frame = 0; frame < 4; frame++) prop.update(frame * 0.3, { urgent: true });
  let meshes = 0;
  prop.root.traverse(object => { if (object.isMesh) meshes++; });
  console.log(`hazard ${String(hazard).padEnd(10)} ${String(meshes).padStart(3)} meshes`);
  prop.dispose();
  prop.dispose();
}
const guard = createGuardian({ THREE, seed: 1 });
guard.face(1.2);
for (let frame = 0; frame < 5; frame++) guard.update(frame * .2, .016, frame % 2 === 0);
console.log('guardian faces', guard.root.children[0].rotation.y.toFixed(3));
guard.dispose();
for (const kind of ['seal', 'lever', 'relic']) {
  const feature = createCellFeature({ THREE, kind, palette: { gold: 0xf5d38b, gem: 0x4fd9b7 } });
  feature.set(true);
  for (let frame = 0; frame < 40; frame++) feature.update(frame * .1);
  console.log(`feature ${kind.padEnd(6)} visible=${feature.root.visible}`);
  feature.set(false);
  feature.update(1);
  feature.dispose();
}
for (const levelId of ['aube', 'gardiens', 'lagon', 'reflux', 'cendres', 'sacrifice']) {
  const profile = getBoardProfile(levelId);
  const counts = [];
  // Three id seeds so every scenery variant of the biome gets built once.
  for (const suffix of ['a', 'b', 'c']) {
    const scenery = createTileScenery({ THREE, tile: { id: `${levelId}-${suffix}`, ports: [] }, profile });
    let meshes = 0;
    scenery.root.traverse(object => { if (object.isMesh) meshes++; });
    counts.push(meshes);
    scenery.dispose();
  }
  console.log(`scenery ${levelId.padEnd(10)} ${profile.biome.padEnd(9)} variants ${counts.join(' / ')} meshes`);
}
const explorer = createExplorer({ THREE });
for (let frame = 0; frame < 4; frame++) explorer.update(frame * .2, .016, { moving: true, distance: .1 });
if (!strokes.length) throw new Error('le gréement de départ ne peint aucune texture');

/** Colours actually reaching the screen, plus how much geometry carries them. */
function inspect(root) {
  const colours = new Set();
  let meshes = 0;
  root.traverse(object => {
    if (object.isPointLight) colours.add(object.color.getHex());
    if (!object.isMesh) return;
    meshes++;
    for (const material of [object.material].flat()) {
      if (material?.color) colours.add(material.color.getHex());
      if (material?.emissive) colours.add(material.emissive.getHex());
    }
  });
  return { colours, meshes };
}

const bare = inspect(explorer.root).meshes;
for (const group of CATALOGUE) {
  for (const item of group.items) {
    strokes.length = 0;
    explorer.setStyle({ ...DEFAULT_LOOK, [group.slot]: item.id });
    explorer.update(1, .016, { moving: false });
    const { colours, meshes } = inspect(explorer.root);
    const wanted = Object.values(ITEMS[item.id].palette);
    const missing = wanted.filter(colour => typeof colour === 'number'
      ? !colours.has(colour)
      : !strokes.includes(colour));
    const empty = item.id === 'aucune';
    if (missing.length) throw new Error(`${item.id}: couleur absente du rendu (${missing[0]})`);
    if (!empty && !wanted.length) throw new Error(`${item.id}: palette vide`);
    console.log(`wardrobe ${group.slot.padEnd(5)} ${item.id.padEnd(11)} ${String(meshes).padStart(3)} mailles`
      + ` (${meshes - bare >= 0 ? '+' : ''}${meshes - bare} vs nu) · ${wanted.length} couleurs portées`);
  }
}
// A cape buried inside the bedroll is invisible, or worse: its embers poke
// through it. Every cape must reach further back than the bundle it drapes over.
const bundle = new THREE.Box3();
explorer.root.updateWorldMatrix(true, true);
let bundleMesh = null;
explorer.root.traverse(object => { if (object.name === 'back-bundle') bundleMesh = object; });
if (!bundleMesh) throw new Error('le rouleau de dos n’est plus nommé : le contrôle des capes est aveugle');
bundle.setFromObject(bundleMesh);
for (const cape of CATALOGUE.find(group => group.slot === 'cape').items) {
  explorer.setStyle({ ...DEFAULT_LOOK, cape: cape.id });
  explorer.update(1, .016, { moving: false });
  explorer.root.updateWorldMatrix(true, true);
  let gear = null;
  explorer.root.traverse(object => { if (object.name === `gear-cape-${cape.id}`) gear = object; });
  if (!gear) throw new Error(`${cape.id}: cape absente du gréement`);
  if (cape.id === 'aucune') { console.log('cape   aucune      rien à porter'); continue; }
  const box = new THREE.Box3().setFromObject(gear);
  const clearance = bundle.min.z - box.min.z;
  console.log(`cape   ${cape.id.padEnd(11)} arrière ${box.min.z.toFixed(3)} vs paquetage ${bundle.min.z.toFixed(3)}`
    + ` · dégagement ${clearance.toFixed(3)} · tombe à ${box.min.y.toFixed(3)}`);
  if (clearance <= 0) throw new Error(`${cape.id} est enfouie dans le rouleau de dos`);
  if (box.min.y > bundle.min.y) throw new Error(`${cape.id} ne descend pas plus bas que le paquetage`);
  if (box.min.y < .1) throw new Error(`${cape.id} traîne au sol (${box.min.y.toFixed(3)})`);
  // An animation that overwrites a built scale turns a spark into a unit cube.
  const size = box.getSize(new THREE.Vector3());
  // Depth is generous: the yoke crosses the shoulders while the panel hangs behind.
  if (size.x > .6 || size.y > .9 || size.z > .48) {
    throw new Error(`${cape.id} déborde du gabarit d'une cape : ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
  }
}

// Swapping back and forth must not pile geometry up.
for (let round = 0; round < 6; round++) {
  explorer.setStyle({ ...DEFAULT_LOOK, hat: round % 2 ? 'nacre' : 'obsidienne', light: round % 2 ? 'brasero' : 'torche' });
}
explorer.setStyle(DEFAULT_LOOK);
const settled = inspect(explorer.root).meshes;
if (settled !== bare) throw new Error(`fuite de maillages : ${settled} au lieu de ${bare} après douze changements`);
console.log(`wardrobe stable : ${settled} mailles après douze changements de tenue`);
explorer.dispose();
explorer.setStyle(DEFAULT_LOOK);
console.log('every prop built, animated and disposed');
