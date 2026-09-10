/** Every familiar must be built, articulated, and unlike every other one.
 *
 * Run: node tests/pets.check.mjs [id ...]
 *
 * The store's first familiars all shared one bob-in-place loop, so six different
 * creatures moved identically. This check measures where each mesh actually
 * travels over a sampled second — idle and walking — and refuses a creature that
 * is inert, that ignores whether Lumen is moving, or whose motion signature is
 * indistinguishable from another's.
 */
const strokes = [];
globalThis.document = {
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => ({ set fillStyle(value) { strokes.push(value); }, fillRect() {} }),
  }),
};

import * as THREE from 'three';
import { createExplorer } from '../src/explorer.js';
import { DEFAULT_LOOK } from '../src/cosmetics.js';
import { BESTIARY, PET_FAMILIES } from '../src/bestiary.js';

/** A ground familiar stands beside a 1.2-unit explorer; keep the menagerie to scale. */
const ENVELOPE = { min: [.08, .06, .12], max: [.42, .46, .58] };
const FRAMES = 26;
const STEP = .042;

const explorer = createExplorer({ THREE });
const spot = new THREE.Vector3();

/** Sample where every mesh of the creature travels across a second of animation. */
function sample(id, moving) {
  explorer.setStyle({ ...DEFAULT_LOOK, pet: id });
  let node = null;
  explorer.root.traverse(object => { if (object.name === `gear-pet-${id}`) node = object; });
  if (!node) throw new Error(`${id} : absent du gréement`);
  const tracks = new Map();
  const box = new THREE.Box3();
  const span = new THREE.Box3();
  // The rig smooths its walk state across calls, so settle it first: otherwise a
  // creature's score would depend on which creature was measured before it.
  for (let warm = 0; warm < 16; warm++) {
    explorer.update(-1 + warm * STEP, STEP, { moving, distance: moving ? STEP * 1.4 : 0 });
  }
  for (let frame = 0; frame < FRAMES; frame++) {
    explorer.update(frame * STEP, STEP, { moving, distance: moving ? STEP * 1.4 : 0 });
    explorer.root.updateWorldMatrix(true, true);
    node.traverse(object => {
      if (!object.isMesh) return;
      object.getWorldPosition(spot);
      const track = tracks.get(object.id) || [];
      track.push(spot.clone());
      tracks.set(object.id, track);
    });
    box.setFromObject(node);
    span.union(box);
  }
  let total = 0, peak = 0, busy = 0, rise = 0;
  const perFrame = new Array(FRAMES - 1).fill(0);
  for (const track of tracks.values()) {
    let travelled = 0;
    for (let i = 1; i < track.length; i++) {
      const step = track[i].distanceTo(track[i - 1]);
      travelled += step;
      perFrame[i - 1] += step;
      rise += Math.abs(track[i].y - track[i - 1].y);
    }
    total += travelled;
    peak = Math.max(peak, travelled);
    if (travelled > .004) busy++;
  }
  // A trot pulses frame to frame; a glide does not. That tells gaits apart.
  const mean = perFrame.reduce((sum, value) => sum + value, 0) / perFrame.length;
  const spread = Math.sqrt(perFrame.reduce((sum, value) => sum + (value - mean) ** 2, 0) / perFrame.length);
  const rhythm = spread / Math.max(mean, 1e-6);
  const vertical = rise / Math.max(total, 1e-6);
  const colours = new Set();
  node.traverse(object => {
    if (!object.isMesh) return;
    for (const material of [object.material].flat()) {
      if (material?.color) colours.add(material.color.getHex());
      if (material?.emissive) colours.add(material.emissive.getHex());
    }
  });
  return { total, peak, busy, rhythm, vertical, colours, meshes: tracks.size, size: span.getSize(new THREE.Vector3()) };
}

/** Five numbers that describe how a creature moves, not what it looks like. */
const signature = (idle, walk) => [
  idle.total / Math.max(1, idle.meshes),
  walk.total / Math.max(1, walk.meshes),
  idle.busy / Math.max(1, idle.meshes),
  walk.peak / Math.max(.001, walk.total),
  idle.peak / Math.max(.001, idle.total),
  walk.rhythm, idle.rhythm,
  walk.vertical, idle.vertical,
];
const distance = (a, b) => Math.hypot(...a.map((value, i) => (value - b[i]) / (Math.abs(value) + Math.abs(b[i]) + 1e-4)));

const wanted = process.argv.slice(2);
const roster = BESTIARY.filter(item => !wanted.length || wanted.includes(item.id));
const problems = [];
const seen = [];

for (const family of PET_FAMILIES) {
  const members = roster.filter(item => item.family === family.id);
  if (!members.length) continue;
  console.log(`\n${family.symbol}  ${family.name.toUpperCase()}`);
  for (const item of members) {
    let idle, walk;
    try {
      idle = sample(item.id, false);
      walk = sample(item.id, true);
    } catch (error) {
      problems.push(`${item.id} : ${error.message}`);
      console.log(`   ${item.id.padEnd(17)} ÉCHEC — ${error.message}`);
      continue;
    }
    const [w, h, d] = idle.size.toArray();
    const marks = [];
    if (idle.meshes < 8) marks.push(`trop sommaire (${idle.meshes} mailles)`);
    if (idle.busy < 4) marks.push(`inerte au repos (${idle.busy} pièces mobiles)`);
    if (walk.busy < 4) marks.push(`inerte en marche (${walk.busy} pièces mobiles)`);
    const reaction = Math.abs(walk.total - idle.total) / Math.max(walk.total, idle.total, 1e-6);
    if (reaction < .12) marks.push(`ne réagit pas à la marche de Lumen (écart ${(reaction * 100).toFixed(0)} %)`);
    for (const [axis, value, i] of [['largeur', w, 0], ['hauteur', h, 1], ['longueur', d, 2]]) {
      if (value < ENVELOPE.min[i]) marks.push(`${axis} minuscule (${value.toFixed(2)})`);
      if (value > ENVELOPE.max[i]) marks.push(`${axis} hors gabarit (${value.toFixed(2)})`);
    }
    // The store shows a palette; the creature must actually wear all of it.
    const unused = Object.entries(item.palette)
      .filter(([, colour]) => typeof colour === 'number' && !idle.colours.has(colour))
      .map(([key]) => key);
    if (unused.length) marks.push(`palette inutilisée : ${unused.join(', ')}`);
    const mine = signature(idle, walk);
    const twin = seen.find(other => distance(mine, other.signature) < .22);
    if (twin) marks.push(`bouge comme ${twin.id}`);
    seen.push({ id: item.id, signature: mine });
    const verdict = marks.length ? `  ✗ ${marks.join(' · ')}` : '';
    console.log(`   ${item.id.padEnd(17)} ${String(idle.meshes).padStart(3)} mailles · ${w.toFixed(2)}x${h.toFixed(2)}x${d.toFixed(2)}`
      + ` · repos ${idle.total.toFixed(2)} → marche ${walk.total.toFixed(2)} · ${walk.busy} pièces mobiles${verdict}`);
    if (marks.length) problems.push(`${item.id} : ${marks.join(' · ')}`);
  }
}

// Swapping through the whole menagerie must not leave geometry behind.
let bare = 0;
explorer.setStyle({ ...DEFAULT_LOOK, pet: 'pet-none' });
explorer.update(1, .016, { moving: false });
explorer.root.traverse(object => { if (object.isMesh) bare++; });
for (const item of roster) explorer.setStyle({ ...DEFAULT_LOOK, pet: item.id });
explorer.setStyle({ ...DEFAULT_LOOK, pet: 'pet-none' });
explorer.update(1, .016, { moving: false });
let settled = 0;
explorer.root.traverse(object => { if (object.isMesh) settled++; });
if (settled !== bare) problems.push(`fuite de maillages : ${settled} au lieu de ${bare} après tout le bestiaire`);
explorer.dispose();

console.log(`\n${roster.length} familiers · ${bare} mailles au repos, ${settled} après passage complet`);
if (problems.length) {
  console.error(`\n${problems.length} problème(s) :`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('bestiaire conforme : chaque familier est articulé, à l’échelle, et bouge à sa manière');
