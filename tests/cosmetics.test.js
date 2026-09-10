import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATALOGUE, DEFAULT_LOOK, EMPTY_WARDROBE, GEAR_SLOTS, ITEMS, SLOTS,
  browseCatalogue, equip, owns, paintCoat, paintSleeve, purchase, resolveLook, spendable,
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

test('existing purchases survive the extra slots and a new companion purchase', () => {
  const old = { owned: ['nacre', 'corail'], spent: 5600, equipped: { hat: 'nacre', cape: 'corail', light: 'torche', coat: 'cuir' } };
  const progress = { aube: { score: 9000 } }, snapshot = structuredClone(progress);
  const bought = purchase(old, 'faerie-pet', spendable(progress, old));
  assert.ok(bought.ok);
  assert.equal(bought.wardrobe.equipped.hat, 'nacre');
  assert.equal(bought.wardrobe.equipped.cape, 'corail');
  assert.equal(bought.wardrobe.equipped.pet, 'faerie-pet');
  assert.equal(bought.wardrobe.equipped.aura, 'aura-none');
  assert.equal(spendable(progress, bought.wardrobe), 9000 - 5600 - ITEMS['faerie-pet'].price);
  assert.deepEqual(progress, snapshot);
  assert.deepEqual(old.owned, ['nacre', 'corail']);
});

test('discovery combines accents, ownership, rarity, fresh pieces and affordable prices', () => {
  assert.equal(browseCatalogue({ query: 'ecarlate' }).items[0].id, 'dragon-coat');
  const fresh = browseCatalogue({ freshOnly: true, collection: 'astral', slot: 'pet', rarity: 'legendary' });
  assert.deepEqual(fresh.items.map(item => item.id), ['astral-pet']);
  const wardrobe = purchase(EMPTY_WARDROBE, 'faerie-pet', 9999).wardrobe;
  assert.deepEqual(browseCatalogue({ collection: 'faerie', ownership: 'owned', wardrobe }).items.map(item => item.id), ['faerie-pet']);
  const cheap = browseCatalogue({ collection: 'faerie', ownership: 'affordable', balance: 350, wardrobe });
  assert.deepEqual(cheap.items.map(item => item.slot).sort(), ['coat', 'trail']);
  assert.equal(browseCatalogue({ query: 'introuvable', page: 30 }).page, 1);
  assert.deepEqual(browseCatalogue({ query: 'introuvable' }).items, []);
});

test('hundreds of future objects stay paged and filters clamp an obsolete page', () => {
  const items = Array.from({ length: 243 }, (_, i) => ({ ...ITEMS['faerie-pet'], id: `future-${i}`, price: i }));
  const first = browseCatalogue({ items, pageSize: 6, sort: 'price' });
  const last = browseCatalogue({ items, pageSize: 6, sort: 'price', page: 200 });
  assert.equal(first.items.length, 6);
  assert.equal(first.pages, 41);
  assert.equal(last.page, 41);
  assert.equal(last.items.length, 3);
  assert.equal(last.items.at(-1).id, 'future-242');
  assert.equal(browseCatalogue({ slot: 'portal', page: 200 }).page, 1);
});

test('the bestiary is a real menagerie: every familiar has a family and a model', async () => {
  const { BESTIARY, PET_FAMILIES } = await import('../src/bestiary.js');
  const { PETS } = await import('../src/pets/index.js');
  const families = new Set(PET_FAMILIES.map(family => family.id));
  assert.ok(BESTIARY.length >= 12, 'le joueur a demandé du choix');
  assert.equal(BESTIARY.length, new Set(BESTIARY.map(item => item.id)).size);
  for (const item of BESTIARY) {
    assert.ok(families.has(item.family), `${item.id} n'appartient à aucune famille`);
    assert.equal(typeof PETS[item.id], 'function', `${item.id} n'a pas de modèle dans src/pets/`);
    assert.equal(item.slot, 'pet');
    assert.ok(item.price > 0 && item.name && item.story);
    assert.ok(Object.values(item.palette).every(colour => typeof colour === 'number'));
  }
  // Each family the store offers must actually have something in it.
  for (const family of PET_FAMILIES) {
    const members = BESTIARY.filter(item => item.family === family.id);
    assert.ok(members.length >= 3, `${family.id} n'a que ${members.length} familier(s)`);
    assert.ok(family.name && family.symbol && family.tagline);
  }
  // The four families the player asked for, by name.
  for (const wanted of ['cats', 'dogs', 'turtles', 'dragons']) {
    assert.ok(families.has(wanted), `famille manquante : ${wanted}`);
  }
});

test('the menagerie is browsable family by family', async () => {
  const { PET_FAMILIES } = await import('../src/bestiary.js');
  for (const family of PET_FAMILIES) {
    const found = browseCatalogue({ slot: 'pet', family: family.id, pageSize: 99 });
    assert.ok(found.total >= 3, `${family.id} : ${found.total} résultat(s)`);
    assert.ok(found.items.every(item => item.slot === 'pet' && item.family === family.id));
  }
  const everything = browseCatalogue({ slot: 'pet', pageSize: 99 });
  assert.equal(everything.total, PET_FAMILIES.reduce((sum, family) =>
    sum + browseCatalogue({ slot: 'pet', family: family.id, pageSize: 99 }).total, 0) + 1, 'plus « sans familier »');
});
