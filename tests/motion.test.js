import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouteMotion, hasReachedCell, sampleCaptureMotion, findWalkPreview, isCrocodileCell, directionalDestination } from '../src/motion.js';

test('a walk follows every corner, at constant speed between the start and end', () => {
  const motion = createRouteMotion([{x:0,y:0,z:0},{x:2,y:0,z:0},{x:2,y:0,z:2}], 2);
  let previous = 0;
  for (let t = 0; t < motion.duration; t += 0.01) {
    const frame = motion.sample(t);
    assert.ok(frame.distance >= previous);
    assert.ok(frame.position.z === 0 || frame.position.x === 2, 'never cut across the diagonal');
    previous = frame.distance;
  }
  const nearCorner = 2 / 2 + 0.06;
  assert.ok(Math.abs((motion.sample(nearCorner + .01).distance - motion.sample(nearCorner - .01).distance) / .02 - 2) < 1e-8);
  assert.deepEqual(motion.sample(999).position, {x:2,y:0,z:2});
  assert.equal(motion.sample(999).complete, true);
});

test('the reversed route retraces its original path including different entrance heights', () => {
  const points = [{x:-1,y:.15,z:0},{x:0,y:.435,z:0},{x:0,y:.435,z:1}];
  const forward = createRouteMotion(points);
  const reverse = createRouteMotion([...points].reverse());
  for (let i = 0; i <= 30; i++) {
    const a = forward.sample(forward.duration * i / 30).position;
    const b = reverse.sample(reverse.duration * (1 - i / 30)).position;
    assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z) < 1e-8);
  }
});

test('zero-length segments and short walks stay finite and end exactly', () => {
  const point = {x:1,y:0,z:0};
  assert.deepEqual(createRouteMotion([point,point]).sample(0).position, point);
  const motion = createRouteMotion([point,point,{x:1.01,y:0,z:0}]);
  assert.deepEqual(motion.sample(motion.duration).position, {x:1.01,y:0,z:0});
  assert.equal(motion.sample(-100).distance, 0);
});

test('cell interactions wait for the exact arrival, not a proximity threshold', () => {
  const motion = { path: [-1, 0, 3], distances: [0, 1.5, 3], distance: 1.5 - 0.000001 };
  assert.equal(hasReachedCell(motion, 0), false);
  motion.distance = 1.5;
  assert.equal(hasReachedCell(motion, 0), true);
  assert.equal(hasReachedCell(motion, 3), false);
  motion.distance = 3 - 0.000001;
  assert.equal(hasReachedCell(motion, 3), false);
  motion.distance = 3;
  assert.equal(hasReachedCell(motion, 3), true);
});

test('crossed cells activate in route order even when a frame skips an arrival', () => {
  const motion = { path: [0, 3, 4, 1], distances: [0, 1.5, 3, 4.5], distance: 3.2 };
  assert.equal(hasReachedCell(motion, 0), true);
  assert.equal(hasReachedCell(motion, 3), true);
  assert.equal(hasReachedCell(motion, 4), true);
  assert.equal(hasReachedCell(motion, 1), false);
  assert.equal(hasReachedCell(motion, 2), false);
});

test('without an animated walk, restored cell states apply immediately', () => {
  assert.equal(hasReachedCell(null, 4), true);
});

test('capture opens the jaw before hiding the hero and finishes only once', () => {
  assert.equal(sampleCaptureMotion(0).heroScale, 1);
  assert.equal(sampleCaptureMotion(.24).heroScale, 1);
  assert.equal(sampleCaptureMotion(.24).jawOpen, 1);
  assert.ok(sampleCaptureMotion(.6).heroScale < 1);
  assert.equal(sampleCaptureMotion(1.199).complete, false);
  assert.equal(sampleCaptureMotion(1.2).complete, true);
  assert.equal(sampleCaptureMotion(1.2).heroScale, 0);
  assert.equal(sampleCaptureMotion(999).jawOpen, 0);
  assert.equal(sampleCaptureMotion(999).lunge, 0);
  assert.deepEqual(sampleCaptureMotion(-1), sampleCaptureMotion(0));
});

test('a lost game cannot preview another walk', () => {
  const state = { hero: 0, lost: true, walkRoutes: { '1': [0, 1] } };
  assert.deepEqual(findWalkPreview(state, 1), []);
});

test('both crocodile cells and occupied patrol cells are dangerous, not future patrol targets', () => {
  const state = { tiles: [{ hazard: 'crocodile' }, {}, {}, null], guardians: [{ index: 1, next: 2 }] };
  assert.equal(isCrocodileCell(state, 0), true);
  assert.equal(isCrocodileCell(state, 1), true);
  assert.equal(isCrocodileCell(state, 2), false);
  assert.equal(isCrocodileCell(state, 3), false);
  assert.equal(isCrocodileCell(null, -1), false);
});

test('preview respects facing openings and follows a detour to an adjacent destination', () => {
  const state = {size:2,hero:0,tiles:[{ports:['S','W']},{ports:['S']},{ports:['N','E']},{ports:['W','N']}],won:false};
  assert.deepEqual(findWalkPreview(state,1),[0,2,3,1]);
  state.tiles[3].ports = ['N'];
  assert.deepEqual(findWalkPreview(state,1),[]);
});

test('preview supports entry, exit, and cannot wrap rows', () => {
  const state = {size:2,hero:-1,tiles:[{ports:['W','S']},{ports:['E']},{ports:['N','E']},{ports:['W','E']}],won:false};
  assert.deepEqual(findWalkPreview(state,4),[-1,0,2,3,4]);
  state.hero = 1;
  assert.deepEqual(findWalkPreview(state,2),[]);
  state.won = true;
  assert.deepEqual(findWalkPreview(state,4),[]);
});

test('preview uses safe routes and never offers a blocked or fragile landing', () => {
  const state = {size:2,hero:0,tiles:[{ports:['E','S']},{ports:['W','S'],hazard:'crocodile'},{ports:['N','E'],hazard:'fragile'},{ports:['N','W']}],walkRoutes:{'3':[0,2,3]},won:false};
  assert.deepEqual(findWalkPreview(state,1),[]);
  assert.deepEqual(findWalkPreview(state,2),[]);
  assert.deepEqual(findWalkPreview(state,3),[0,2,3]);
});

test('directional walking crosses fragile tiles to the nearest safe stop', () => {
  const state = {hero:0,walkRoutes:{'3':[0,2,3],'7':[0,2,3,7],'1':[0,1]}};
  assert.equal(directionalDestination(state,2),3);
  assert.equal(directionalDestination(state,1),1);
  assert.equal(directionalDestination(state,4),null);
  assert.equal(directionalDestination({hero:0,walkRoutes:{'4':[0,2,3,4]}},2),4);
});
