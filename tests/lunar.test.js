import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LUNAR_FACES, LUNAR_GAP, LUNAR_FINISH, surfaceIndex, surfaceParts, isExteriorSurface,
  surfaceNeighbor, surfaceFrame, createSurfaceMotion, lunarKeyDestination } from '../src/lunar.js';
import { updateLunarCubeAppearance } from '../src/lunar-scene.js';

const entry = surfaceIndex(18, 'U'), exit = surfaceIndex(0, 'D');
const state = { entry: { index: entry }, exit: { index: exit }, finishIndex: LUNAR_FINISH };

test('engravings stay attached and visible on every cube face throughout slides and undo', () => {
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(.5, 0, 0)]);
  const pathMaterial = new THREE.LineBasicMaterial();
  const cube = { index: 13, border: new THREE.Group(), outline: new THREE.LineBasicMaterial(),
    patches: LUNAR_FACES.map(face => {
      const root = new THREE.Group();
      root.add(new THREE.Line(geometry, pathMaterial));
      root.visible = false;
      return { face, root, surface: new THREE.MeshStandardMaterial() };
    }) };
  const paths = cube.patches.map(patch => patch.root.children[0]);
  const coordinates = Array.from(geometry.attributes.position.array);
  for (const index of [13, 22, 13, 4, 13, 14, 13]) {
    cube.index = index;
    for (const mode of ['slide', 'walk']) {
      updateLunarCubeAppearance(cube, { ...state, slidable: [index], reachable: [], hint: null }, mode);
      for (const [number, patch] of cube.patches.entries()) {
        assert.equal(patch.root.visible, true, `${index}:${patch.face}: the engraving must not depend on walkability`);
        assert.equal(patch.root.children[0], paths[number]);
        assert.deepEqual(Array.from(geometry.attributes.position.array), coordinates);
      }
    }
  }
  assert.equal(isExteriorSurface(surfaceIndex(13, 'U')), false, 'visible engraving does not make an internal face walkable');
  cube.patches.forEach(patch => patch.surface.dispose());
  cube.outline.dispose(); geometry.dispose(); pathMaterial.dispose();
});

test('the lunar surface matches all 54 patches and their reciprocal edges', () => {
  const patches = Array.from({ length: LUNAR_FINISH }, (_, index) => index).filter(isExteriorSurface);
  assert.equal(patches.length, 54);
  for (const index of patches) {
    const neighbors = LUNAR_FACES.map(side => [side, surfaceNeighbor(index, side)]).filter(([, neighbor]) => neighbor);
    assert.equal(neighbors.length, 4);
    for (const [side, { index: destination, back }] of neighbors) {
      assert.deepEqual(surfaceNeighbor(destination, back), { index, back: side });
    }
  }
  assert.ok(LUNAR_FACES.every(face => !isExteriorSurface(surfaceIndex(13, face))));
});

test('lunar walking stays outside the solid and rotates the feet with local gravity', () => {
  const path = [-1, entry, surfaceIndex(18, 'W'), surfaceIndex(9, 'W'), surfaceIndex(0, 'W'), exit, LUNAR_FINISH];
  const motion = createSurfaceMotion(path, state);
  let turns = 0;
  for (let elapsed = 0; elapsed <= motion.duration; elapsed += .005) {
    const sample = motion.sample(elapsed);
    const { x, y, z } = sample.position;
    assert.ok(Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) >= LUNAR_GAP * 1.5 - 1e-6, 'never cut through the moon');
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(sample.quaternion);
    assert.ok(up.distanceTo(sample.normal) < 1e-8, 'feet always face the ground');
    assert.ok(Math.abs(sample.quaternion.length() - 1) < 1e-8);
    if (Math.abs(sample.normal.y) > .01 && Math.abs(sample.normal.x) > .01) turns++;
  }
  assert.ok(turns > 0, 'the turn around an edge must be progressive');
  const arrival = motion.sample(motion.duration);
  assert.equal(arrival.complete, true);
  assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(arrival.quaternion).distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-8);
  const position = new THREE.Vector3(arrival.position.x, arrival.position.y, arrival.position.z);
  assert.ok(position.distanceTo(surfaceFrame(LUNAR_FINISH, state).position) < 1e-8);
});

test('undo retraces the surface arc and per-cell distances preserve arrival timing', () => {
  const path = [entry, surfaceIndex(18, 'W'), surfaceIndex(9, 'W'), surfaceIndex(0, 'W'), exit];
  const forward = createSurfaceMotion(path, state);
  const reverse = createSurfaceMotion([...path].reverse(), state);
  assert.equal(forward.distances.length, path.length);
  assert.ok(forward.distances.every((distance, index) => !index || distance > forward.distances[index - 1]));
  for (let step = 0; step <= 50; step++) {
    const first = forward.sample(forward.duration * step / 50).position;
    const second = reverse.sample(reverse.duration * (1 - step / 50)).position;
    assert.ok(Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z) < 1e-7);
  }
});

test('keyboard moves in each face plane and crosses onto the adjoining face', () => {
  assert.equal(lunarKeyDestination(entry, 'arrowleft'), surfaceIndex(18, 'W'));
  assert.equal(lunarKeyDestination(surfaceIndex(0, 'D'), 'arrowup'), surfaceIndex(3, 'D'));
  assert.equal(lunarKeyDestination(surfaceIndex(0, 'D'), 'arrowdown'), surfaceIndex(0, 'N'));
  assert.deepEqual(surfaceParts(entry), { cube: 18, face: 'U' });
});