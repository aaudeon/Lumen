import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildGear } from '../src/gear.js';
import { BESTIARY } from '../src/bestiary.js';
import { createGuardian, createTileHazard } from '../src/hazards.js';

const matrices = root => {
  root.updateWorldMatrix(true, true);
  const values = [];
  root.traverse(node => { if (node.isMesh) values.push(...node.matrixWorld.elements); });
  return values;
};

test('all 18 companions react, settle and restore their authored gait without accumulated offsets', () => {
  for (const item of BESTIARY) {
    const build = () => buildGear({ THREE, slot: 'pet', palette: { ...item.palette, creature: item.id } });
    const pet = build(), reference = build();
    const outer = pet.root.position.clone();
    let changed = false;
    for (let frame = 0; frame < 340; frame++) {
      if (frame === 0) pet.spec.react('danger');
      if (frame === 90) pet.spec.react('victory');
      if (frame === 190) pet.spec.react('curious');
      if (frame === 280) pet.spec.react('reset');
      const context = { dt: 1 / 60, moving: true, speed: .45 };
      pet.animate(frame / 60, context); reference.animate(frame / 60, context);
      if (frame % 20 === 0) {
        const actual = matrices(pet.root), baseline = matrices(reference.root);
        assert.ok(actual.every(Number.isFinite), item.id + ': invalid pose');
        const different = actual.some((value, index) => Math.abs(value - baseline[index]) > 1e-7);
        if (frame === 40) changed = different;
        if (frame >= 280) assert.equal(different, false, item.id + ': reaction leaked into gait');
      }
    }
    assert.ok(changed, item.id + ': inert reaction');
    assert.ok(pet.root.position.equals(outer), item.id + ': display mount moved');
    pet.spec.react('treasure');
    for (let i = 0; i < 250; i++) pet.animate(6 + i / 60, { dt: 1 / 60 });
    const stage = pet.root.getObjectByName('pet-reaction');
    assert.equal(stage.position.length(), 0, item.id + ': celebration never ends');
    // Easing back to rest lands on -0, which Object.is separates from 0.
    assert.equal(Math.abs(stage.rotation.y), 0, item.id + ': celebration left a turn behind');
    pet.dispose(); reference.dispose();
  }
});

test('crocodile walks through articulated feet, watches the hero, and stays on its assigned cell', () => {
  const guard = createGuardian({ THREE, seed: 2 });
  guard.root.position.set(3, 0, 2);
  const origin = guard.root.position.clone();
  const foot = guard.root.getObjectByName('croc-foot-0');
  const positions = [];
  for (let i = 0; i < 70; i++) {
    guard.update(i / 60, 1 / 60, true, { heroPosition: new THREE.Vector3(4, 0, 3) });
    positions.push(foot.getWorldPosition(new THREE.Vector3()));
  }
  assert.ok(positions.some(p => p.distanceTo(positions[0]) > .02), 'feet must take steps');
  const neck = guard.root.getObjectByName('croc-neck');
  assert.ok(neck.rotation.y > .05, 'head must watch the nearby hero');
  assert.ok(guard.root.getObjectByName('croc-jaw').rotation.x > .1, 'alert jaw');
  assert.ok(guard.root.position.equals(origin), 'cosmetic animation cannot change patrol cells');
  const bounds = new THREE.Box3().setFromObject(guard.root).getSize(new THREE.Vector3());
  assert.ok(bounds.x < 1.2 && bounds.z < 1.4, 'guardian exceeds its tile');
  guard.dispose(); guard.dispose();
});

test('tile crocodiles use world-space attention even on a rotated board', () => {
  const croc = createTileHazard({ THREE, tile: { id: 'watch', hazard: 'crocodile', ports: ['E', 'W'] } });
  const world = new THREE.Group(); world.rotation.y = .6; world.add(croc.root);
  const hero = world.localToWorld(new THREE.Vector3(1, 0, -.7));
  for (let i = 0; i < 100; i++) croc.update(i / 60, { dt: 1 / 60, heroPosition: hero });
  assert.ok(croc.root.getObjectByName('croc-neck').rotation.y > .05);
  assert.ok(matrices(croc.root).every(Number.isFinite));
  croc.dispose();
});
