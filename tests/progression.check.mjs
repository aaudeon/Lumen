/** Checks that the campaign really is locked on screen, not just in `campaign.js`.
 *
 * Run: node tests/progression.check.mjs
 *
 * `openCount` is unit-tested, but a padlock the player can click through is worth
 * nothing. So this renders the real HomeScreen with react-dom/server and reads the
 * markup back: a closed passage must carry both a `disabled` attribute and a visible
 * lock mark, on the island map and on the world tabs alike.
 *
 * The screen is rendered through `tests/render.mjs`, which bundles it first.
 */
import { readFileSync } from 'node:fs';
import { EMPTY_WARDROBE, DEFAULT_LOOK } from '../src/cosmetics.js';
import { SAVE_KEYS } from '../src/campaign.js';
import { buttons, load } from './render.mjs';

const root = new URL('../', import.meta.url);
const render = await load('HomeScreen.jsx');

/** The campaign as `/api/levels` serves it: chapter order, worlds in contiguous blocks. */
const LEVELS = [
  ...Array.from({ length: 10 }, (_, i) => ({ biome: 'jungle', biomeLevel: i + 1, chapter: i + 1 })),
  ...Array.from({ length: 7 }, (_, i) => ({ biome: 'atlantis', biomeLevel: i + 1, chapter: i + 11 })),
  ...Array.from({ length: 7 }, (_, i) => ({ biome: 'volcano', biomeLevel: i + 1, chapter: i + 18 })),
].map(level => ({ ...level, id: `n${level.chapter}`, name: `Passage ${level.chapter}`,
  subtitle: 'Un chemin.', difficulty: 'Exploration', par: 5, stepPar: 9 }));

const finished = count => Object.fromEntries(LEVELS.slice(0, count)
  .map(level => [level.id, { completed: true, moves: 12, score: 900 }]));

const screen = progress => render({
  levels: LEVELS, progress, currentGame: null, busy: false, error: '',
  onStart() {}, onSound() {}, sound: false, onBuy() {}, onEquip() {}, onReset() {},
  wardrobe: { ...EMPTY_WARDROBE, equipped: { ...DEFAULT_LOOK } }, credits: 0,
});

const stop = (markup, chapter) => buttons(markup)
  .find(button => button.includes(`aria-label="Niveau ${chapter} :`));
const worldTab = (markup, world) => buttons(markup)
  .find(button => button.includes(`data-world="${world}"`));
const play = markup => buttons(markup).find(button => button.includes('class="home-play'));

const problems = [];
const check = (condition, complaint) => { if (!condition) problems.push(complaint); };
const missing = (button, where) => {
  if (button) return false;
  problems.push(`${where} : ce bouton n'est pas à l'écran`);
  return true;
};
const shut = (button, where) => {
  if (missing(button, where)) return;
  check(/\sdisabled(=""|\s|>)/.test(button), `${where} : cliquable alors qu'il est verrouillé`);
  check(button.includes('lock-mark'), `${where} : verrouillé sans cadenas visible`);
};
const open = (button, where) => {
  if (missing(button, where)) return;
  check(!/\sdisabled(=""|\s|>)/.test(button), `${where} : désactivé alors qu'il est ouvert`);
  check(!button.includes('lock-mark'), `${where} : cadenas affiché sur un passage ouvert`);
};

// A brand-new account: one passage, and one only. The map opens on the frontier's world.
const fresh = screen({});
open(stop(fresh, 1), 'Compte neuf · passage 01');
for (let chapter = 2; chapter <= 10; chapter++) shut(stop(fresh, chapter), `Compte neuf · passage ${String(chapter).padStart(2, '0')}`);
open(worldTab(fresh, 'jungle'), 'Compte neuf · onglet Jungle');
shut(worldTab(fresh, 'atlantis'), 'Compte neuf · onglet Atlantide');
shut(worldTab(fresh, 'volcano'), 'Compte neuf · onglet Volcan');
open(play(fresh), 'Compte neuf · bouton Explorer');

// One passage finished opens the next one, and stops there.
const one = screen(finished(1));
open(stop(one, 2), 'Passage 01 terminé · passage 02');
shut(stop(one, 3), 'Passage 01 terminé · passage 03');
shut(worldTab(one, 'atlantis'), 'Passage 01 terminé · onglet Atlantide');

// One passage short of the next world: the whole jungle is open, Atlantide is not.
const almost = screen(finished(9));
for (let chapter = 1; chapter <= 10; chapter++) open(stop(almost, chapter), `Jungle presque finie · passage ${String(chapter).padStart(2, '0')}`);
shut(worldTab(almost, 'atlantis'), 'Jungle presque finie · onglet Atlantide');

// The last passage of a world is the key to the next one.
const jungleDone = screen(finished(10));
open(worldTab(jungleDone, 'atlantis'), 'Jungle terminée · onglet Atlantide');
shut(worldTab(jungleDone, 'volcano'), 'Jungle terminée · onglet Volcan');
open(stop(jungleDone, 11), 'Jungle terminée · passage 11');
shut(stop(jungleDone, 12), 'Jungle terminée · passage 12');

// Nothing stays shut once the campaign is over.
const allDone = screen(finished(LEVELS.length));
check(!allDone.includes('lock-mark'), 'Campagne terminée · un cadenas subsiste');
for (const world of ['jungle', 'atlantis', 'volcano']) open(worldTab(allDone, world), `Campagne terminée · onglet ${world}`);

// Starting over has to forget every key the game writes, or the reset lies.
const appSource = readFileSync(new URL('src/App.jsx', root), 'utf8');
const written = [...appSource.matchAll(/(?:save|readSaved)\('([^']+)'/g)].map(match => match[1]);
for (const key of new Set(written)) {
  check(SAVE_KEYS.includes(key), `Remise à zéro · la clé « ${key} » survivrait : absente de SAVE_KEYS`);
}
check(appSource.includes('function resetAccount()'), 'Remise à zéro · App n’expose plus resetAccount');
check(appSource.includes('function migrate()'), 'Remise à zéro · la migration de format de sauvegarde a disparu');
check(appSource.includes('onReset={resetAccount}'), 'Remise à zéro · le carnet n’est plus branché sur resetAccount');

if (problems.length) {
  console.error('progression : ' + problems.length + ' problème(s)');
  for (const problem of problems) console.error('   ' + problem);
  process.exit(1);
}
console.log(`progression conforme : ${LEVELS.length} passages, un seul ouvert au départ, un de plus par victoire`);
console.log('   cadenas et « disabled » vont de pair sur la carte, les onglets de monde et le bouton Explorer');
console.log(`   remise à zéro : ${SAVE_KEYS.length} clés effacées, soit tout ce qu’App.jsx écrit`);
