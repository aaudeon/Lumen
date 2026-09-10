export const BIOMES = [
  {
    id: 'jungle', name: 'Jungle', world: 'I', title: 'Le sanctuaire de la jungle',
    headline: 'La jungle garde', emphasis: 'ses secrets.',
    description: 'Sous les racines et la mousse, cinq passages attendent leur prochain voyageur.',
    arrival: 'Explorer la jungle', symbol: '❧',
  },
  {
    id: 'atlantis', name: 'Atlantide', world: 'II', title: 'La cité engloutie',
    headline: 'Sous les vagues,', emphasis: 'une cité oubliée.',
    description: 'Suivez la lumière des coraux, entre colonnes brisées et sanctuaires engloutis.',
    arrival: 'Découvrir l’Atlantide', symbol: '♆',
  },
  {
    id: 'volcano', name: 'Volcan', world: 'III', title: 'Le cœur du volcan',
    headline: 'Là où la terre', emphasis: 'brûle encore.',
    description: 'Au-dessus des coulées de lave, retrouvez les cinq chemins taillés dans l’obsidienne.',
    arrival: 'Entrer dans le volcan', symbol: '△',
  },
  {
    id:'boreal',name:'Boréale',world:'IV',title:'Les sanctuaires du grand nord',
    headline:'Au-delà des braises,',emphasis:'l’éclat du grand nord.',
    description:'Cinq épreuves sous les aurores. Apprivoisez la glace, préparez vos appuis et réveillez les refuges scellés.',
    arrival:'Traverser la banquise',symbol:'❄',
  },
];

export const getBiome = id => BIOMES.find(biome => biome.id === id) || BIOMES[0];

/** The campaign opens one passage at a time: a level needs the previous one finished.
 *
 * `levels` arrives from the server already in chapter order, so the run of
 * finished passages at the front of that list is exactly what has been earned.
 * The passage right after that run is the frontier — open, but not yet done.
 *
 * `allOpen` is the dev-mode override: the chain still describes the campaign, it is
 * simply not enforced. See `src/dev-mode.js`.
 */
export function openCount(levels = [], progress = {}, allOpen = false) {
  if (allOpen) return levels.length;
  let open = 0;
  while (open < levels.length && progress?.[levels[open].id]?.completed) open += 1;
  return Math.min(open + 1, levels.length);
}

export function isOpen(levels, progress, levelId, allOpen = false) {
  const index = (levels || []).findIndex(level => level.id === levelId);
  return index >= 0 && index < openCount(levels, progress, allOpen);
}

/** The passage that has to be finished before `levelId` opens, if any. */
export function unlockedBy(levels, levelId) {
  const index = (levels || []).findIndex(level => level.id === levelId);
  return index > 0 ? levels[index - 1] : null;
}

/** Where to send a traveller who has no valid destination in mind: the frontier.
 *
 * Real progress only, deliberately. Dev mode lifts every padlock, but the traveller
 * still lands where the campaign actually left them, not on the last passage. */
export function frontierLevel(levels = [], progress = {}) {
  return levels[openCount(levels, progress) - 1] || levels[0];
}

/** The keys this browser keeps. Clearing them all is starting over from scratch. */
export const SAVE_KEYS = ['lumen-progress', 'lumen-wardrobe', 'lumen-session', 'lumen-level'];

/** Save format, and where the browser remembers which one it holds.
 *
 * Bumped when a change makes older saves meaningless, and the client then wipes them
 * once on the next load. Version 2 is the arrival of the padlocks: progression is now
 * a chain, so a save that finished passages out of order describes a campaign state
 * that can no longer be reached — points earned beyond a locked passage included.
 */
export const SAVE_VERSION = 2;
export const VERSION_KEY = 'lumen-save-version';
