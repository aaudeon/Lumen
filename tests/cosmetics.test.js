import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATALOGUE, DEFAULT_LOOK, EMPTY_WARDROBE, GEAR_SLOTS, ITEMS, SLOTS,
  equip, owns, paintCoat, paintSleeve, purchase, resolveLook, spendable,
} from '../src/cosmetics.js';

test('the catalogue is coherent: unique ids, one free item per slot, rising prices', () => {
  const ids = Object.keys(ITEMS);
  assert.equal(ids.length, new Set(ids).size);
  for (const group of CATALOGUE) {
    const free = group.items.filter(item => item.price === 0);
    assert.equal(free.length, 1, `${group.slot} doit avoir exactement une tenue de départ`);
    const prices = group.items.map(item => item.price);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
    for (const item of group.items) {
      assert.ok(item.name && item.story, `${item.id} doit être nommé et raconté`);
      assert.ok(Number.isInteger(item.price) && item.price >= 0);
      // Only a free "wear nothing" option may describe no material at all.
      assert.ok(Object.keys(item.palette).length > 0 || item.price === 0,
        `${item.id} est payant : il doit avoir une palette`);
    }
  }
});

test('the coat dye is the only shared palette, and every shade is defined', () => {
  const coats = CATALOGUE.find(group => group.slot === 'coat').items;
  const reference = Object.keys(coats[0].palette).sort();
  for (const item of coats) {
    assert.deepEqual(Object.keys(item.palette).sort(), reference, `${item.id} a une teinture incomplète`);
  }
  for (const painter of [paintCoat, paintSleeve]) {
    for (const item of coats) {
      const used = [];
      painter(colour => used.push(colour), item.palette);
      assert.ok(used.length > 0);
      for (const colour of used) assert.match(colour, /^#[0-9a-f]{6}$/i, `${item.id}: couleur manquante`);
    }
  }
});

test('gear slots carry mesh palettes: numeric colours, free to differ per model', () => {
  for (const slot of GEAR_SLOTS) {
    const group = CATALOGUE.find(item => item.slot === slot);
    assert.ok(group, `${slot} doit exister au catalogue`);
    for (const item of group.items) {
      for (const [key, colour] of Object.entries(item.palette)) {
        assert.equal(typeof colour, 'number', `${item.id}.${key} doit être une couleur trois-octets`);
        assert.ok(colour >= 0 && colour <= 0xffffff);
      }
    }
    if (slot !== 'light') continue;
    // The rig animates a flame, so every light must describe a whole one.
    for (const item of group.items) {
      for (const key of ['outer', 'outerGlow', 'mid', 'midGlow', 'core', 'coreGlow', 'light']) {
        assert.ok(key in item.palette, `${item.id} n'a pas de ${key}`);
      }
    }
  }
});

test('the starting outfit is owned for free, before anything is ever saved', () => {
  for (const slot of SLOTS) {
    assert.ok(owns(EMPTY_WARDROBE, DEFAULT_LOOK[slot]));
    assert.ok(owns(undefined, DEFAULT_LOOK[slot]));
  }
  assert.ok(!owns(EMPTY_WARDROBE, 'nacre'));
  assert.ok(!owns(EMPTY_WARDROBE, 'objet-inexistant'));
});

test('the balance is the wallet minus what has been spent, never negative', () => {
  const progress = { aube: { score: 1200 }, relais: { score: 2400 } };
  assert.equal(spendable(progress, EMPTY_WARDROBE), 3600);
  assert.equal(spendable(progress, { spent: 1500 }), 2100);
  assert.equal(spendable(progress, { spent: 99999 }), 0);
  assert.equal(spendable({}, { spent: 0 }), 0);
});

test('buying debits, grants and equips in one step', () => {
  const { ok, wardrobe, item } = purchase(EMPTY_WARDROBE, 'nacre', 5000);
  assert.ok(ok);
  assert.equal(item.id, 'nacre');
  assert.equal(wardrobe.spent, ITEMS.nacre.price);
  assert.ok(owns(wardrobe, 'nacre'));
  assert.equal(wardrobe.equipped.hat, 'nacre');
  assert.equal(wardrobe.equipped.cape, DEFAULT_LOOK.cape, 'les autres emplacements ne bougent pas');
});

test('a refused purchase changes nothing and says why', () => {
  const poor = purchase(EMPTY_WARDROBE, 'braise', 10);
  assert.ok(!poor.ok);
  assert.match(poor.reason, /manque/);
  assert.equal(poor.wardrobe.spent, 0);
  assert.ok(!owns(poor.wardrobe, 'braise'));

  const owned = purchase({ ...EMPTY_WARDROBE, owned: ['paille'] }, 'paille', 99999);
  assert.ok(!owned.ok);
  assert.equal(owned.wardrobe.spent, 0);

  const unknown = purchase(EMPTY_WARDROBE, 'chapeau-fantome', 99999);
  assert.ok(!unknown.ok);
  assert.equal(unknown.wardrobe.spent, 0);
});

test('equipping needs ownership, and unknown ids are ignored', () => {
  assert.equal(equip(EMPTY_WARDROBE, 'braise').equipped.cape, DEFAULT_LOOK.cape);
  const bought = purchase(EMPTY_WARDROBE, 'mousse', 5000).wardrobe;
  assert.equal(equip(bought, 'mousse').equipped.cape, 'mousse');
  assert.equal(equip(bought, DEFAULT_LOOK.cape).equipped.cape, DEFAULT_LOOK.cape, 'on peut revenir à la tenue de départ');
  assert.equal(equip(bought, 'rien-du-tout').equipped.cape, 'mousse');
});

test('a look always resolves to a full outfit, whatever is stored', () => {
  for (const equipped of [undefined, {}, { hat: 'inconnu' }, { hat: 'cuir' }, { coat: 'nacre' }]) {
    const look = resolveLook(equipped);
    assert.deepEqual(Object.keys(look).sort(), [...SLOTS].sort());
    // The id travels with the palette: the mesh builder is chosen from it.
    for (const slot of SLOTS) {
      assert.ok(look[slot]?.id, `${slot} doit nommer son modèle`);
      assert.equal(ITEMS[look[slot].id].slot, slot);
    }
  }
  // An id parked in the wrong slot must not be worn there.
  assert.equal(resolveLook({ hat: 'cuir' }).hat.id, DEFAULT_LOOK.hat);
  assert.equal(resolveLook({ coat: 'nacre' }).coat.id, DEFAULT_LOOK.coat);
  assert.equal(resolveLook({ light: 'brasero' }).light.id, 'brasero');
});
