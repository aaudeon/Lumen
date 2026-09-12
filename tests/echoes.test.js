import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildEchoEnvironment } from '../src/echo-environment.js';

test('the archive scenery changes epochs and returns without moving the board', () => {
  const world = new THREE.Group();
  const environment = buildEchoEnvironment(THREE, world);
  const ruins = environment.group.getObjectByName('echoes-ruins');
  const past = environment.group.getObjectByName('echoes-past');
  const origin = environment.group.position.clone();
  assert.equal(ruins.visible, true);
  assert.equal(past.visible, false);
  environment.setPhase(1);
  for (let frame = 1; frame <= 120; frame++) environment.animate[0](frame / 60);
  assert.equal(ruins.visible, false);
  assert.equal(past.visible, true);
  assert.ok(environment.group.position.equals(origin));
  environment.setPhase(0);
  for (let frame = 121; frame <= 240; frame++) environment.animate[0](frame / 60);
  assert.equal(ruins.visible, true);
  assert.equal(past.visible, false);
  environment.group.updateWorldMatrix(true, true);
  environment.group.traverse(object => assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
  environment.dispose(); environment.dispose();
  assert.equal(world.children.length, 0);
});