import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_REGIONS, mapStops, terrainHeight } from '../src/map-layout.js';

test('chaque biome possede sa geographie et son parcours', () => {
  const reliefs = Object.keys(MAP_REGIONS).map(biome =>
    JSON.stringify([150, 300, 450, 600, 750].flatMap(vertical =>
      [150, 300, 450, 600, 750].map(horizontal => terrainHeight(biome, horizontal, vertical)))));
  assert.equal(new Set(reliefs).size, Object.keys(MAP_REGIONS).length);
  for (const [biome, count] of [['jungle',10],['atlantis',7],['volcano',7],['boreal',5],['space',10],['echoes',5]]) {
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

test('le relief est stable et chaque destination repose sur une terre emergee', () => {
  for (const [biome, region] of Object.entries(MAP_REGIONS)) {
    for (const [horizontal, vertical] of region.route) {
      const height = terrainHeight(biome, horizontal, vertical);
      assert.ok(Number.isFinite(height) && height > .1, `${biome}: ${horizontal},${vertical}`);
      assert.equal(terrainHeight(biome, horizontal, vertical), height);
    }
    if (biome !== 'space') assert.ok(terrainHeight(biome, 0, 0) < 0);
  }
});