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
