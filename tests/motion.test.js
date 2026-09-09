import test from 'node:test';
import assert from 'node:assert/strict';
import { createRouteMotion, findWalkPreview, directionalDestination } from '../src/motion.js';

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
