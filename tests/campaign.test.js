test('a pack has paid progression in normal mode and can be previewed in dev mode', () => {
  const levels = [{ id: 'base' }, { id: 'end' }, { id: 'echo-one', packId: 'echoes' }, { id: 'echo-two', packId: 'echoes' }];
  const done = { base: { completed: true }, end: { completed: true } };
  assert.equal(isOpen(levels, done, 'echo-one'), false);
  assert.equal(isOpen(levels, done, 'echo-one', true), true);
  assert.equal(isOpen(levels, {}, 'echo-two', true), true);
  assert.equal(isOpen(levels, {}, 'echo-one', false, ['echoes']), true);
  assert.equal(isOpen(levels, {}, 'echo-two', false, ['echoes']), false);
  assert.equal(isOpen(levels, { 'echo-one': { completed: true } }, 'echo-two', false, ['echoes']), true);
  assert.equal(frontierLevel(levels, done).id, 'end');
  assert.equal(frontierLevel(levels, done, ['echoes']).id, 'echo-one');
  assert.equal(unlockedBy(levels, 'echo-one'), null);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { frontierLevel, isOpen, openCount, SAVE_KEYS, SAVE_VERSION, unlockedBy, VERSION_KEY } from '../src/campaign.js';

/** The campaign as the server hands it over: in chapter order. */
const LEVELS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
const done = (...ids) => Object.fromEntries(ids.map(id => [id, { completed: true }]));

test('a fresh traveller only has the first passage', () => {
  assert.equal(openCount(LEVELS, {}), 1);
  assert.equal(isOpen(LEVELS, {}, 'a'), true);
  assert.equal(isOpen(LEVELS, {}, 'b'), false);
  assert.equal(frontierLevel(LEVELS, {}).id, 'a');
});

test('finishing a passage opens the next one, and only the next one', () => {
  const progress = done('a');
  assert.equal(openCount(LEVELS, progress), 2);
  assert.equal(isOpen(LEVELS, progress, 'b'), true);
  assert.equal(isOpen(LEVELS, progress, 'c'), false);
  assert.equal(frontierLevel(LEVELS, progress).id, 'b');
});

test('the last passage stays the frontier once the campaign is finished', () => {
  const progress = done('a', 'b', 'c', 'd');
  assert.equal(openCount(LEVELS, progress), LEVELS.length);
  assert.equal(frontierLevel(LEVELS, progress).id, 'd');
  assert.equal(isOpen(LEVELS, progress, 'd'), true);
});

test('a save that skipped ahead does not open the passages it skipped', () => {
  const progress = done('a', 'c', 'd');
  assert.equal(openCount(LEVELS, progress), 2);
  assert.equal(isOpen(LEVELS, progress, 'c'), false);
});

test('an unknown level is never open, and neither is a missing one', () => {
  assert.equal(isOpen(LEVELS, done('a', 'b'), 'ailleurs'), false);
  assert.equal(isOpen(LEVELS, done('a', 'b'), undefined), false);
  assert.equal(openCount([], {}), 0);
  assert.equal(frontierLevel([], {}), undefined);
});

test('each passage names the one that unlocks it', () => {
  assert.equal(unlockedBy(LEVELS, 'a'), null);
  assert.equal(unlockedBy(LEVELS, 'c').id, 'b');
});

test('resetting clears every key the browser keeps', () => {
  assert.deepEqual([...SAVE_KEYS].sort(),
    ['lumen-level', 'lumen-progress', 'lumen-session', 'lumen-wardrobe']);
});

test('the save format carries a stamp, kept apart from the data it guards', () => {
  assert.ok(Number.isInteger(SAVE_VERSION) && SAVE_VERSION > 0);
  assert.equal(SAVE_KEYS.includes(VERSION_KEY), false);
});

test('the dev-mode override opens every passage, whatever the progress', () => {
  assert.equal(openCount(LEVELS, {}, true), LEVELS.length);
  for (const level of LEVELS) assert.equal(isOpen(LEVELS, {}, level.id, true), true);
  assert.equal(isOpen(LEVELS, done('a', 'c'), 'd', true), true);
  assert.equal(isOpen(LEVELS, {}, 'ailleurs', true), false, 'un niveau inconnu reste fermé');
  assert.equal(openCount([], {}, true), 0);
});

test('the override is opt-in: omitting it keeps the chain', () => {
  assert.equal(openCount(LEVELS, {}), 1);
  assert.equal(isOpen(LEVELS, {}, 'b'), false);
  assert.equal(isOpen(LEVELS, {}, 'b', false), false);
});

test('the traveller still lands on the real frontier in dev mode', () => {
  // frontierLevel takes no override: where you are is a fact of the campaign, not a view.
  assert.equal(frontierLevel(LEVELS, {}, true).id, 'a');
  assert.equal(frontierLevel(LEVELS, {}).id, 'a');
  assert.equal(frontierLevel(LEVELS, done('a', 'b')).id, 'c');
});
