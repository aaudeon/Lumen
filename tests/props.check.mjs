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
import { buildGear } from '../src/gear.js';
import { CATALOGUE, DEFAULT_LOOK, ITEMS, resolveLook } from '../src/cosmetics.js';

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
    for (let ancestor=object; ancestor; ancestor=ancestor.parent) if(!ancestor.visible)return;
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
    explorer.update(1, .1, { moving: true, distance: .6 });
    const { colours, meshes } = inspect(explorer.root);
    const wanted = Object.values(ITEMS[item.id].palette);
    const missing = wanted.filter(colour => typeof colour === 'number'
      ? !colours.has(colour)
      : !strokes.includes(colour));
    const empty = item.price === 0 && !wanted.length;
    if (missing.length) throw new Error(`${item.id}: couleur absente du rendu (${missing[0]})`);
    if (!empty && !wanted.length) throw new Error(`${item.id}: palette vide`);
    console.log(`wardrobe ${group.slot.padEnd(5)} ${item.id.padEnd(11)} ${String(meshes).padStart(3)} mailles`
      + ` (${meshes - bare >= 0 ? '+' : ''}${meshes - bare} vs nu) · ${wanted.length} couleurs portées`);
  }
}
// Compare cape panels and the bedroll in their common torso space, at rest and
// across walking poses. Wings may spread wider, but never clip through the pack.
function boundsIn(root, space) {
  const box = new THREE.Box3(), inverse = new THREE.Matrix4().copy(space.matrixWorld).invert();
  root.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.computeBoundingBox();
    box.union(object.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld)));
  });
  return box;
}
const bundleMesh = explorer.root.getObjectByName('back-bundle');
if (!bundleMesh) throw new Error('le rouleau de dos doit rester identifiable');
for (const cape of CATALOGUE.find(group => group.slot === 'cape').items) {
  explorer.setStyle({ ...DEFAULT_LOOK, cape: cape.id });
  const gear = explorer.root.getObjectByName(`gear-cape-${cape.id}`);
  if (!gear) throw new Error(`${cape.id}: cape absente du gréement`);
  if (cape.id === 'aucune') continue;
  for (let frame=0; frame<24; frame++) {
    explorer.update(frame*.17, .1, { moving: frame>2, distance: .11 });
    explorer.root.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(gear);
    const local = boundsIn(gear, gear.parent), bundle = boundsIn(bundleMesh, gear.parent);
    if (local.min.z >= bundle.min.z || local.min.y >= bundle.min.y) throw new Error(`${cape.id}: cape enfouie dans le paquetage`);
    // Walking lowers the torso; keep at least 6 cm of real ground clearance.
    if (box.min.y < .06) throw new Error(`${cape.id}: trop proche du sol à la pose ${frame} (${box.min.y.toFixed(3)})`);
    const size = local.getSize(new THREE.Vector3()), limit = cape.bounds || [.6,.9,.48];
    if (size.x>limit[0] || size.y>limit[1] || size.z>limit[2]) throw new Error(`${cape.id}: gabarit dépassé ${size.toArray()}`);
    gear.traverse(object => {
      if(object.name !== 'cape-panel') return;
      if(boundsIn(object, gear.parent).max.z >= bundle.min.z-.002) throw new Error(`${cape.id}: panneau dans le sac à la pose ${frame}`);
    });
  }
  console.log(`cape ${cape.id}: 24 poses, paquetage et sol dégagés`);
}

// A companion's wings must stay clear of both the walking arm and the satchel.
for(const pet of CATALOGUE.find(group=>group.slot==='pet').items.filter(item=>item.price)) {
  explorer.setStyle({...DEFAULT_LOOK,pet:pet.id});
  for(let frame=0;frame<12;frame++) {
    explorer.update(frame*.2,.1,{moving:true,distance:.13});
    explorer.root.updateWorldMatrix(true,true);
    const body=new THREE.Box3();
    explorer.root.traverse(object=>{
      if(!object.isMesh)return;
      for(let parent=object;parent;parent=parent.parent)if(parent.name.startsWith('gear-'))return;
      body.union(new THREE.Box3().setFromObject(object));
    });
    const companion=new THREE.Box3().setFromObject(explorer.root.getObjectByName(`gear-pet-${pet.id}`));
    if(companion.intersectsBox(body))throw new Error(`${pet.id}: touche le corps pendant la marche`);
  }
}

// Every material and geometry from every new model is released exactly once;
// hidden pooled particles count too. Emitted trails must fade without new meshes.
for (const item of Object.values(ITEMS).filter(item => item.slot !== 'coat')) {
  const piece = buildGear({ THREE, slot:item.slot, palette:resolveLook({[item.slot]:item.id})[item.slot] });
  const resources = new Map();
  piece.root.traverse(object => {
    if(!object.isMesh)return;
    for(const resource of [object.geometry, ...[object.material].flat()])resources.set(resource,0);
  });
  resources.forEach((_,resource) => resource.addEventListener('dispose',()=>resources.set(resource,resources.get(resource)+1)));
  const count=inspect(piece.root).meshes;
  if(item.price && !count)throw new Error(`${item.id}: modèle vide`);
  // Articulated animals have four legs, facial joints and tails; ornaments stay cheaper.
  if(count>(item.slot==='pet'?80:64))throw new Error(`${item.id}: trop de maillages (${count})`);
  piece.animate?.(2,{footfall:true,position:new THREE.Vector3(2,0,1)});
  const rendered = inspect(piece.root).colours;
  for(const colour of Object.values(item.palette))if(!rendered.has(colour))throw new Error(`${item.id}: couleur absente de la pièce elle-même`);
  piece.animate?.(4,{footfall:false});
  if(item.slot==='trail' && piece.root.children.some(object=>object.visible))throw new Error(`${item.id}: traces persistantes`);
  piece.dispose();piece.dispose();
  if([...resources.values()].some(count=>count!==1))throw new Error(`${item.id}: ressource non libérée ou libérée deux fois`);
}

// The exit ornament stays at the exit, and footfalls stay on the board when the
// character moves. Disposing the rig also removes both externally mounted props.
const world = new THREE.Group(), exit = new THREE.Group();world.add(exit);
const traveller = createExplorer({THREE,effectWorld:world,portalMount:exit,style:{...DEFAULT_LOOK,trail:'arcade-trail',portal:'clockwork-portal',pet:'dragon-pet'}});
world.add(traveller.root);traveller.root.position.set(2,0,3);
traveller.update(1,.1,{moving:true,distance:.6});
const trail = world.getObjectByName('gear-trail-arcade-trail');
const print = trail.children.find(object=>object.visible);
if(!print || Math.abs(print.position.z-3)>.001)throw new Error('les traces ne sont pas sur le plateau');
const at = print.position.clone();traveller.root.position.x=5;
traveller.update(1.1,.1,{moving:false,distance:0});
if(!print.position.equals(at))throw new Error('une trace suit le personnage');
if(exit.children[0]?.name!=='gear-portal-clockwork-portal')throw new Error('parure absente du portail de sortie');
traveller.dispose();
if(world.children.length!==1 || exit.children.length)throw new Error('les effets externes survivent au personnage');

// Swapping all 68 pieces must return to the original number of meshes.
explorer.setStyle(DEFAULT_LOOK);
const settled = inspect(explorer.root).meshes;
if (settled !== bare) throw new Error(`fuite de maillages : ${settled} au lieu de ${bare}`);
console.log(`wardrobe stable : ${settled} mailles après tout le catalogue`);
explorer.dispose();explorer.dispose();explorer.setStyle(DEFAULT_LOOK);
console.log('every prop built, animated and disposed');
