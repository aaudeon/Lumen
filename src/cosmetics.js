/** The explorer's wardrobe: the catalogue, and the buying rules.
 *
 * Each item names a mesh built by `src/gear.js` and the palette that mesh
 * paints itself with, so a hat is a real hat and not a recoloured one. Only
 * the coat slot is a dye: it repaints the woven texture the torso already has.
 *
 * The wallet stays a record — the sum of your best run on each passage — so it
 * never goes down. Spending is tracked apart, and the balance is the difference.
 */
import { walletTotal } from './score.js';

/** Coat texture, 32 x 32 pixels. Shared by the 3D rig and the store swatch. */
export function paintCoat(rect, coat) {
  rect(coat.cloth, 0, 0, 32, 32);
  for (let i = 0; i < 36; i++) rect(i % 2 ? coat.light : coat.dark, (i * 13) % 31, (i * 7) % 31, 2, 1);
  rect(coat.dark, 0, 0, 2, 32); rect(coat.dark, 30, 0, 2, 32);
  rect(coat.trim, 3, 3, 26, 1); rect(coat.trim, 3, 29, 26, 1);
  rect(coat.shirt, 12, 0, 8, 32); rect(coat.shirtShade, 15, 3, 2, 29);
  rect(coat.dark, 10, 0, 2, 32); rect(coat.dark, 20, 0, 2, 32);
  rect(coat.pocket, 2, 13, 7, 8); rect(coat.dark, 2, 13, 7, 2);
  rect(coat.pocket, 23, 13, 7, 8); rect(coat.dark, 23, 13, 7, 2);
  rect(coat.trim, 5, 15, 2, 2); rect(coat.trim, 26, 15, 2, 2);
}

export function paintSleeve(rect, coat) {
  rect(coat.sleeve, 0, 0, 32, 32);
  rect(coat.sleeveLight, 3, 0, 2, 32); rect(coat.sleeveDark, 25, 0, 3, 32);
  rect(coat.cuff, 0, 26, 32, 2); rect(coat.sleeveDark, 0, 29, 32, 3);
  rect(coat.sleeveDark, 8, 17, 12, 2);
}

export const CATALOGUE = [
  {
    slot: 'hat', title: 'Couvre-chef', note: 'Chaque modèle a sa propre forme.',
    items: [
      { id: 'feutre', name: 'Feutre d’expédition', price: 0, story: 'Bord large, ruban usé, celui du premier jour.',
        palette: { felt: 0x895b34, band: 0x422b24, pin: 0xbfa268 } },
      { id: 'paille', name: 'Chapeau de paille', price: 900, story: 'Un disque tressé sous la canopée, effiloché au bord.',
        palette: { straw: 0xd8bd7a, dark: 0x9c8747, cord: 0x6d7a44 } },
      { id: 'nacre', name: 'Casque de nacre', price: 2400, story: 'Une coquille polie, crête dressée, repêchée au lagon.',
        palette: { shell: 0xd6ece9, fin: 0x6fbfc4, gold: 0xd8c489 } },
      { id: 'obsidienne', name: 'Capuche d’obsidienne', price: 4200, story: 'Des plaques anguleuses, une braise le long du front.',
        palette: { glass: 0x2f2833, edge: 0x584a5e, ember: 0xff7a33 } },
    ],
  },
  {
    slot: 'cape', title: 'Cape', note: 'Ce qui tombe dans le dos de Lumen.',
    items: [
      { id: 'aucune', name: 'Aucune cape', price: 0, story: 'Les épaules libres, comme au départ.', palette: {} },
      { id: 'mousse', name: 'Cape de mousse', price: 1400, story: 'Un pan de tissu à l’ourlet déchiqueté par les ronces.',
        palette: { cloth: 0x4f6f45, shade: 0x36512f, cord: 0x9fb063 } },
      { id: 'corail', name: 'Mante de corail', price: 3200, story: 'Courte, avec des branches qui poussent aux épaules.',
        palette: { cloth: 0x3f7480, coral: 0xd07f9f, clasp: 0xe0d2a4 } },
      { id: 'braise', name: 'Manteau de braise', price: 5400, story: 'Lourd, semé d’escarbilles qui refusent de s’éteindre.',
        palette: { cloth: 0x5a2f2a, trim: 0xd8813f, ember: 0xff6a1e } },
    ],
  },
  {
    slot: 'light', title: 'Lumière', note: 'Ce que Lumen tient à bout de bras.',
    items: [
      { id: 'torche', name: 'Torche de bois', price: 0, story: 'Un manche, un chiffon, une flamme franche.',
        palette: { wood: 0x422b24, wrap: 0x805335, metal: 0xbfa268,
          outer: 0xf48b27, outerGlow: 0xff6b16, mid: 0xffd469, midGlow: 0xffb62c,
          core: 0xffefbb, coreGlow: 0xffe2a0, light: 0xffb85f } },
      { id: 'lanterne', name: 'Lanterne de laiton', price: 1800, story: 'Une cage vitrée qui se balance à chaque pas.',
        palette: { wood: 0x6b4a2c, wrap: 0x8a6a3a, metal: 0xd0aa63, glass: 0x9fd8c8,
          outer: 0x35c98a, outerGlow: 0x14a765, mid: 0x8ff0b4, midGlow: 0x37d489,
          core: 0xe2fff0, coreGlow: 0xa8ffd4, light: 0x6ff0b6 } },
      { id: 'cristal', name: 'Cristal d’azur', price: 3600, story: 'Une pierre qui flotte au-dessus du bâton, escortée d’éclats.',
        palette: { wood: 0x2f4a58, wrap: 0x3f6a78, metal: 0xa8cfe0,
          outer: 0x3f9bdd, outerGlow: 0x1a6fc4, mid: 0x8fd4ff, midGlow: 0x3aa6ef,
          core: 0xe6f6ff, coreGlow: 0xb2e4ff, light: 0x7cc6ff } },
      { id: 'brasero', name: 'Brasero suspendu', price: 6000, story: 'Une coupe de fonte sur ses chaînes, pleine de braises.',
        palette: { wood: 0x3a2b33, wrap: 0x4d3a44, metal: 0xc08a58,
          outer: 0xb14bd0, outerGlow: 0x8a1fb0, mid: 0xe6a0ff, midGlow: 0xc154e8,
          core: 0xfbeaff, coreGlow: 0xe8bcff, light: 0xd08bff } },
    ],
  },
  {
    slot: 'coat', title: 'Teinture du manteau', note: 'La couleur de la veste, des manches et de la chemise.',
    items: [
      { id: 'cuir', name: 'Cuir fauve', price: 0, story: 'Usé aux coudes, increvable.',
        palette: { cloth: '#875a38', light: '#91633e', dark: '#67432c', trim: '#b0824f', shirt: '#d7c399',
          shirtShade: '#b9a67e', pocket: '#ab7747', sleeve: '#805335', sleeveLight: '#9b6a40',
          sleeveDark: '#5f402c', cuff: '#ac7e4e' } },
      { id: 'fougere', name: 'Vert fougère', price: 700, story: 'La jungle finit par déteindre.',
        palette: { cloth: '#4d6b42', light: '#5c7c4c', dark: '#33482d', trim: '#9fb063', shirt: '#dfd6a4',
          shirtShade: '#bdb282', pocket: '#6d8a4c', sleeve: '#456139', sleeveLight: '#587547',
          sleeveDark: '#2f4327', cuff: '#8ea45c' } },
      { id: 'lagon', name: 'Bleu lagon', price: 1900, story: 'Teinte prise aux jardins engloutis.',
        palette: { cloth: '#3f7480', light: '#4c8894', dark: '#2a5058', trim: '#8fd7cd', shirt: '#e6dcc6',
          shirtShade: '#c0b79f', pocket: '#c9829f', sleeve: '#376670', sleeveLight: '#478089',
          sleeveDark: '#24454c', cuff: '#79c3bb' } },
      { id: 'cendre', name: 'Rouge cendre', price: 3400, story: 'Il sent encore la cendre chaude.',
        palette: { cloth: '#6a3730', light: '#7d453a', dark: '#43221f', trim: '#e08a4a', shirt: '#e5c9a4',
          shirtShade: '#bfa383', pocket: '#96432c', sleeve: '#5d312b', sleeveLight: '#743d33',
          sleeveDark: '#3a1d1a', cuff: '#c9743f' } },
    ],
  },
];

/** Slots whose item is a mesh, in the order the store shows them. */
export const GEAR_SLOTS = ['hat', 'cape', 'light'];
export const SLOTS = CATALOGUE.map(group => group.slot);
export const ITEMS = Object.fromEntries(CATALOGUE.flatMap(group =>
  group.items.map(item => [item.id, { ...item, slot: group.slot }])));
/** The starting outfit, always owned and always free. */
export const DEFAULT_LOOK = Object.fromEntries(CATALOGUE.map(group =>
  [group.slot, group.items.find(item => item.price === 0).id]));

export const EMPTY_WARDROBE = { owned: [], equipped: { ...DEFAULT_LOOK }, spent: 0 };

/** Free items count as owned even in a wardrobe that has never been saved. */
export function owns(wardrobe, itemId) {
  const item = ITEMS[itemId];
  if (!item) return false;
  return item.price === 0 || (wardrobe?.owned || []).includes(itemId);
}

export function spendable(progress, wardrobe) {
  return Math.max(0, walletTotal(progress) - Math.max(0, wardrobe?.spent || 0));
}

/** Buying is refused, never partly applied: the caller keeps its wardrobe on failure. */
export function purchase(wardrobe, itemId, balance) {
  const item = ITEMS[itemId];
  const safe = { ...EMPTY_WARDROBE, ...wardrobe, equipped: { ...DEFAULT_LOOK, ...wardrobe?.equipped } };
  if (!item) return { ok: false, reason: 'Cet objet n’existe pas.', wardrobe: safe };
  if (owns(safe, itemId)) return { ok: false, reason: 'Vous possédez déjà cet objet.', wardrobe: safe };
  if (balance < item.price) {
    return { ok: false, wardrobe: safe,
      reason: `Il vous manque ${(item.price - balance).toLocaleString('fr-FR')} crédits.` };
  }
  return {
    ok: true, reason: '', item,
    wardrobe: { ...safe, owned: [...safe.owned, itemId], spent: safe.spent + item.price,
      equipped: { ...safe.equipped, [item.slot]: itemId } },
  };
}

/** Equipping something you do not own leaves the wardrobe untouched. */
export function equip(wardrobe, itemId) {
  const item = ITEMS[itemId];
  const safe = { ...EMPTY_WARDROBE, ...wardrobe, equipped: { ...DEFAULT_LOOK, ...wardrobe?.equipped } };
  if (!item || !owns(safe, itemId)) return safe;
  return { ...safe, equipped: { ...safe.equipped, [item.slot]: itemId } };
}

/** A complete, valid outfit whatever is stored: unknown or misfiled ids fall back. */
export function resolveLook(equipped) {
  return Object.fromEntries(SLOTS.map(slot => {
    const chosen = ITEMS[equipped?.[slot]];
    const fallback = ITEMS[DEFAULT_LOOK[slot]];
    const item = chosen && chosen.slot === slot ? chosen : fallback;
    return [slot, { id: item.id, ...item.palette }];
  }));
}
