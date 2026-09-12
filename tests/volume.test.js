import test from 'node:test';
import assert from 'node:assert/strict';
import { boardShape, cellCoordinates, adjacentCell, volumePosition, cellLabel } from '../src/volume.js';

const volume = { size: 3, depth: 3, finishIndex: 27 };

test('the volume has 27 cells and six neighbors around its center', () => {
  assert.deepEqual(boardShape(volume), { size: 3, depth: 3, count: 27, finish: 27 });
  assert.deepEqual(cellCoordinates(volume, 13), { column: 1, row: 1, layer: 1 });
  assert.equal(cellLabel(volume, 13), 'Etage 2 - Ligne 2, colonne 2');
  assert.deepEqual(['N', 'E', 'S', 'W', 'U', 'D'].map(side => adjacentCell(volume, 13, side)), [10, 14, 16, 12, 22, 4]);
});

test('navigation never wraps rows or floors and keeps planar levels unchanged', () => {
  assert.equal(adjacentCell(volume, 2, 'E'), null);
  assert.equal(adjacentCell(volume, 8, 'S'), null);
  assert.equal(adjacentCell(volume, 18, 'U'), null);
  assert.equal(adjacentCell({ size: 4 }, 5, 'S'), 9);
  assert.equal(adjacentCell({ size: 4 }, 5, 'U'), null);
  assert.equal(boardShape({ size: 4 }).finish, 16);
});

test('exploding the volume only separates floors and keeps entrances attached', () => {
  assert.deepEqual(volumePosition(13), { x: 0, y: 0, z: 0 });
  assert.equal(volumePosition(0, 1).y, -2.5);
  assert.equal(volumePosition(26, 1).y, 2.5);
  assert.equal(volumePosition(-1, 1).y, volumePosition(0, 1).y);
  assert.equal(volumePosition(27, 1).y, volumePosition(26, 1).y);
  assert.equal(volumePosition(4, 1).x, volumePosition(4, 0).x);
});