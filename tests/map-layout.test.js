import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_REGIONS, mapStops } from '../src/map-layout.js';

test('chaque biome possede sa geographie et son parcours', () => {
  assert.equal(new Set(Object.values(MAP_REGIONS).map(region => JSON.stringify(region.land))).size, 4);
  for (const [biome, count] of [['jungle',10],['atlantis',7],['volcano',7],['boreal',5]]) {
    const stops = mapStops(biome, count);
    assert.deepEqual(stops.map(stop => [stop.x, stop.y]), MAP_REGIONS[biome].route);
    for (const stop of stops) {
      assert.ok(stop.x >= 100 && stop.x <= 900 && stop.y >= 100 && stop.y <= 800);
    }
  }
});

test('les niveaux supplementaires ne recyclent pas les positions', () => {
  for (const biome of Object.keys(MAP_REGIONS)) {
    for (const count of [0, 1, 5, 7, 10, 12]) {
      const stops = mapStops(biome, count);
      assert.equal(stops.length, count);
      assert.equal(new Set(stops.map(stop => `${stop.x},${stop.y}`)).size, count);
      assert.ok(stops.every(stop => Number.isFinite(stop.x) && Number.isFinite(stop.y)));
    }
  }
});