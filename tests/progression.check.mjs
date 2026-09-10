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
import { BIOMES, SAVE_KEYS } from '../src/campaign.js';
import { buttons, load } from './render.mjs';

const root = new URL('../', import.meta.url);
const render = await load('HomeScreen.jsx');

/** The campaign as `/api/levels` serves it: chapter order, worlds in contiguous blocks.
 *  Built from `BIOMES`, so a world added to the campaign is covered without a rewrite. */
const PER_WORLD = 5;
const LEVELS = BIOMES.flatMap((world, index) => Array.from({ length: PER_WORLD }, (_, i) => {
  const chapter = index * PER_WORLD + i + 1;
  return { id: `n${chapter}`, chapter, biomeLevel: i + 1, biome: world.id,
    name: `Passage ${chapter}`, subtitle: 'Un chemin.', difficulty: 'Exploration', par: 5, stepPar: 9 };
}));
/** The levels of the nth world of the campaign. */
const worldBlock = index => LEVELS.filter(level => level.biome === BIOMES[index].id);

const finished = count => Object.fromEntries(LEVELS.slice(0, count)
  .map(level => [level.id, { completed: true, moves: 12, score: 900 }]));

const props = progress => ({
  levels: LEVELS, progress, currentGame: null, busy: false, error: '',
  onStart() {}, onSound() {}, sound: false, onBuy() {}, onEquip() {}, onReset() {},
  wardrobe: { ...EMPTY_WARDROBE, equipped: { ...DEFAULT_LOOK } }, credits: 0,
});
const screen = progress => render(props(progress));
const numeral = chapter => String(chapter).padStart(2, '0');

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

const firstWorld = worldBlock(0);

// A brand-new account: one passage, and one only. The map opens on the frontier's world.
const fresh = screen({});
open(stop(fresh, firstWorld[0].chapter), `Compte neuf · passage ${numeral(firstWorld[0].chapter)}`);
for (const level of firstWorld.slice(1)) shut(stop(fresh, level.chapter), `Compte neuf · passage ${numeral(level.chapter)}`);
open(worldTab(fresh, BIOMES[0].id), `Compte neuf · onglet ${BIOMES[0].name}`);
for (const world of BIOMES.slice(1)) shut(worldTab(fresh, world.id), `Compte neuf · onglet ${world.name}`);
open(play(fresh), 'Compte neuf · bouton Explorer');

// One passage finished opens the next one, and stops there.
const one = screen(finished(1));
open(stop(one, 2), 'Passage 01 terminé · passage 02');
shut(stop(one, 3), 'Passage 01 terminé · passage 03');
for (const world of BIOMES.slice(1)) shut(worldTab(one, world.id), `Passage 01 terminé · onglet ${world.name}`);

// One passage short of the next world: the first world is open, the second is not.
const almost = screen(finished(firstWorld.length - 1));
for (const level of firstWorld) open(stop(almost, level.chapter), `${BIOMES[0].name} presque finie · passage ${numeral(level.chapter)}`);
shut(worldTab(almost, BIOMES[1].id), `${BIOMES[0].name} presque finie · onglet ${BIOMES[1].name}`);

// The last passage of a world is the key to the next one.
const secondWorld = worldBlock(1);
const worldDone = screen(finished(firstWorld.length));
open(worldTab(worldDone, BIOMES[1].id), `${BIOMES[0].name} terminée · onglet ${BIOMES[1].name}`);
for (const world of BIOMES.slice(2)) shut(worldTab(worldDone, world.id), `${BIOMES[0].name} terminée · onglet ${world.name}`);
open(stop(worldDone, secondWorld[0].chapter), `${BIOMES[0].name} terminée · passage ${numeral(secondWorld[0].chapter)}`);
shut(stop(worldDone, secondWorld[1].chapter), `${BIOMES[0].name} terminée · passage ${numeral(secondWorld[1].chapter)}`);

// Nothing stays shut once the campaign is over.
const allDone = screen(finished(LEVELS.length));
check(!allDone.includes('lock-mark'), 'Campagne terminée · un cadenas subsiste');
for (const world of BIOMES) open(worldTab(allDone, world.id), `Campagne terminée · onglet ${world.name}`);

// Starting over has to forget every key the game writes, or the reset lies.
const appSource = readFileSync(new URL('src/App.jsx', root), 'utf8');
const written = [...appSource.matchAll(/(?:save|readSaved)\('([^']+)'/g)].map(match => match[1]);
for (const key of new Set(written)) {
  check(SAVE_KEYS.includes(key), `Remise à zéro · la clé « ${key} » survivrait : absente de SAVE_KEYS`);
}
check(appSource.includes('function resetAccount()'), 'Remise à zéro · App n’expose plus resetAccount');
check(appSource.includes('function migrate()'), 'Remise à zéro · la migration de format de sauvegarde a disparu');
check(appSource.includes('onReset={resetAccount}'), 'Remise à zéro · le carnet n’est plus branché sur resetAccount');

// Dev mode: every padlock lifted on an untouched account, and a badge that says so.
globalThis.location = { search: '?dev', href: 'http://127.0.0.1:8765/?dev' };
const devScreen = await load('HomeScreen.jsx', 'dev');
delete globalThis.location;
const dev = devScreen(props({}));
check(!dev.includes('lock-mark'), 'Mode dév · un cadenas subsiste alors que tout est ouvert');
check(dev.includes('MODE DÉV'), 'Mode dév · rien ne signale la session à l’écran');
for (const world of BIOMES) open(worldTab(dev, world.id), `Mode dév · onglet ${world.name}`);
for (const level of firstWorld) open(stop(dev, level.chapter), `Mode dév · passage ${numeral(level.chapter)}`);
open(play(dev), 'Mode dév · bouton Explorer');
// And it stays a view of the campaign: an untouched account still lands on passage one.
check(dev.includes('VOTRE DESTINATION'), 'Mode dév · la carte n’ouvre plus sur la frontière réelle');
check(!screen({}).includes('MODE DÉV'), 'Session normale · le badge de mode dév s’affiche à tort');

if (problems.length) {
  console.error('progression : ' + problems.length + ' problème(s)');
  for (const problem of problems) console.error('   ' + problem);
  process.exit(1);
}
console.log(`progression conforme : ${BIOMES.length} mondes, ${LEVELS.length} passages, un seul ouvert au départ`);
console.log('   cadenas et « disabled » vont de pair sur la carte, les onglets de monde et le bouton Explorer');
console.log(`   remise à zéro : ${SAVE_KEYS.length} clés effacées, soit tout ce qu’App.jsx écrit`);
console.log('   mode dév : tout est ouvert, le badge est visible, et la carte reste sur la frontière réelle');
