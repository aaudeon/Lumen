/** Checks that the store's changing room opens on the outfit you are wearing.
 *
 * Run: node tests/shop.check.mjs
 *
 * The store used to seed its trial with a whole collection — `useState(() =>
 * ensemble('faerie'))` — so opening the shop dressed the explorer in a rose coat, a wand
 * and a unicorn nobody had bought, and the figure on the left was a sales pitch rather
 * than a mirror.
 *
 * The rule this enforces: on opening, the trial is empty. The stage says « VOTRE TENUE »,
 * the card on the left names a piece the wardrobe really wears, and no catalogue card
 * claims to be tried on.
 */
import { EMPTY_WARDROBE, DEFAULT_LOOK, ITEMS } from '../src/cosmetics.js';
import { buttons, escaped, load } from './render.mjs';

const render = await load('Shop.jsx');

const wardrobeOf = (owned, equipped) => ({ ...EMPTY_WARDROBE, owned,
  equipped: { ...DEFAULT_LOOK, ...equipped },
  spent: owned.reduce((sum, id) => sum + (ITEMS[id]?.price || 0), 0) });

const store = wardrobe => render({ wardrobe, credits: 4000, biome: 'jungle',
  progress: { aube: { completed: true, moves: 9, score: 4000 } },
  onBuy() {}, onEquip() {}, onClose() {} });

/** The name on the card of the changing room, which is the piece under examination. */
const examined = markup => {
  const panel = markup.slice(markup.indexOf('class="atelier-selection"'));
  return panel.slice(panel.indexOf('<h3>') + 4, panel.indexOf('</h3>'));
};
const tried = markup => buttons(markup)
  .filter(button => button.includes('class="atelier-item') && button.includes('aria-pressed="true"'));

const problems = [];
const check = (condition, complaint) => { if (!condition) problems.push(complaint); };

function opensOnTheWardrobe(wardrobe, expected, where) {
  const markup = store(wardrobe);
  check(markup.includes('VOTRE TENUE'), `${where} : la cabine n’annonce pas « VOTRE TENUE »`);
  check(!markup.includes('ESSAYAGE LIBRE'),
    `${where} : la cabine s’ouvre en essayage, donc sur une tenue qui n’est pas la vôtre`);
  check(examined(markup) === escaped(expected),
    `${where} : la fiche présente « ${examined(markup)} » au lieu de « ${expected} », que l’aventurier porte`);
  const pressed = tried(markup);
  check(!pressed.length,
    `${where} : ${pressed.length} pièce(s) du catalogue se disent à l’essai à l’ouverture`);
  return markup;
}

// A brand-new wardrobe: the starting outfit, and the hat of the first day on the card.
const fresh = opensOnTheWardrobe(wardrobeOf([]), ITEMS[DEFAULT_LOOK.hat].name, 'Garde-robe neuve');
// Nothing bought means nothing to undress: the whole default look is what the stage shows.
for (const [slot, id] of Object.entries(DEFAULT_LOOK)) {
  check(ITEMS[id].price === 0, `Garde-robe neuve · l’emplacement ${slot} démarre sur une pièce payante`);
}
check(fresh.includes('Ma tenue ↺'), 'Garde-robe neuve · le retour à la tenue équipée a disparu');

// A wardrobe with a purchase opens on that purchase, not on a novelty being pushed.
opensOnTheWardrobe(wardrobeOf(['paille'], { hat: 'paille' }), ITEMS.paille.name, 'Chapeau acheté');
opensOnTheWardrobe(wardrobeOf(['braise'], { cape: 'braise' }), ITEMS.braise.name, 'Cape achetée');

// A stale save naming an item that no longer exists must not empty the card.
opensOnTheWardrobe(wardrobeOf([], { hat: 'chapeau-fantome' }), ITEMS[DEFAULT_LOOK.hat].name,
  'Sauvegarde périmée');

if (problems.length) {
  console.error(`boutique : ${problems.length} problème(s)`);
  for (const problem of problems) console.error('   ' + problem);
  process.exit(1);
}
console.log('boutique conforme : la cabine ouvre sur la tenue équipée, jamais sur une combinaison à vendre');
console.log('   la fiche de gauche nomme une pièce réellement portée, et aucun article ne se dit à l’essai');
