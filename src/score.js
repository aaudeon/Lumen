/** Scoring for a finished passage, and the wallet the campaign fills up.
 *
 * Every part rewards staying close to the authored reference rather than
 * beating a clock: reaching the reference already pays in full, and no part
 * can ever go negative. A slow, careful run still earns the passage bonus.
 */
export const REWARDS = { passage: 400, moves: 300, steps: 250, time: 250, relic: 200 };

/** A passage is worth what it asks of you: the authored difficulty label sets the rate. */
export const RATES = {
  Initiation: 1, 'Découverte': 1, Exploration: 1.2, Aventure: 1.4,
  'Défi': 1.6, Expert: 1.8, 'Maîtrise': 2.1, 'Légende': 2.5,
};

export function rateOf(difficulty) {
  return RATES[difficulty] ?? 1;
}

/** Seconds a run may take before the time reward starts shrinking. */
export function timeTarget(par = 1, stepPar = 1) {
  return 30 + par * 9 + stepPar * 3;
}

const share = (target, actual) => Math.max(0, Math.min(1, Math.max(target, 0) / Math.max(actual, 1)));

/** Points for one finished run, part by part. `seconds` is wall time on the level. */
export function scoreRun({ par = 1, stepPar = 1, moves = 0, steps = 0, seconds = 0,
                           relic = false, difficulty = '' } = {}) {
  const parts = {
    passage: REWARDS.passage,
    moves: Math.round(REWARDS.moves * share(par, moves)),
    steps: Math.round(REWARDS.steps * share(stepPar, steps)),
    time: Math.round(REWARDS.time * share(timeTarget(par, stepPar), seconds)),
    relic: relic ? REWARDS.relic : 0,
  };
  const earned = Object.values(parts).reduce((sum, value) => sum + value, 0);
  const rate = rateOf(difficulty);
  return { ...parts, earned, rate, total: Math.round(earned * rate) };
}

/** The wallet holds the best run of each passage, so replaying can only improve it. */
export function walletTotal(progress) {
  return Object.values(progress || {}).reduce((sum, entry) => sum + (entry?.score || 0), 0);
}

export const LABELS = {
  passage: 'Passage ouvert',
  moves: 'Déplacements de dalles',
  steps: 'Pas parcourus',
  time: 'Temps',
  relic: 'Trésor rapporté',
};
