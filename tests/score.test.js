import test from 'node:test';
import assert from 'node:assert/strict';
import { RATES, REWARDS, rateOf, scoreRun, timeTarget, walletTotal } from '../src/score.js';

const PERFECT = REWARDS.passage + REWARDS.moves + REWARDS.steps + REWARDS.time;

test('a run at the authored reference is paid in full, treasure aside', () => {
  const run = scoreRun({ par: 6, stepPar: 12, moves: 6, steps: 12, seconds: timeTarget(6, 12) });
  assert.equal(run.moves, REWARDS.moves);
  assert.equal(run.steps, REWARDS.steps);
  assert.equal(run.time, REWARDS.time);
  assert.equal(run.relic, 0);
  assert.equal(run.total, PERFECT);
});

test('beating the reference does not pay more than reaching it', () => {
  const inside = scoreRun({ par: 6, stepPar: 12, moves: 2, steps: 4, seconds: 1 });
  assert.equal(inside.total, PERFECT);
});

test('every part shrinks with waste but never turns negative', () => {
  const sloppy = scoreRun({ par: 6, stepPar: 12, moves: 24, steps: 48, seconds: timeTarget(6, 12) * 10 });
  assert.equal(sloppy.moves, Math.round(REWARDS.moves / 4));
  assert.equal(sloppy.steps, Math.round(REWARDS.steps / 4));
  assert.equal(sloppy.time, Math.round(REWARDS.time / 10));
  assert.ok(sloppy.total > REWARDS.passage);
  assert.ok(sloppy.total < PERFECT);
});

test('a run that never ends still earns the passage, and nothing else', () => {
  const crawl = scoreRun({ par: 1, stepPar: 1, moves: 1e6, steps: 1e6, seconds: 1e9 });
  assert.deepEqual(crawl, { passage: REWARDS.passage, moves: 0, steps: 0, time: 0, relic: 0,
    earned: REWARDS.passage, rate: 1, total: REWARDS.passage });
});

test('the treasure is a bonus on top, not a share of the run', () => {
  const without = scoreRun({ par: 4, stepPar: 8, moves: 9, steps: 15, seconds: 200 });
  const withRelic = scoreRun({ par: 4, stepPar: 8, moves: 9, steps: 15, seconds: 200, relic: true });
  assert.equal(withRelic.total - without.total, REWARDS.relic);
});

test('missing or absurd inputs stay finite', () => {
  for (const run of [scoreRun(), scoreRun({ par: 0, stepPar: 0, moves: 0, steps: 0, seconds: 0 })]) {
    assert.ok(Number.isFinite(run.total));
    assert.ok(run.total >= REWARDS.passage);
    for (const value of Object.values(run)) assert.ok(value >= 0);
  }
});

test('the wallet sums the best run of each passage and ignores the rest', () => {
  assert.equal(walletTotal(null), 0);
  assert.equal(walletTotal({}), 0);
  assert.equal(walletTotal({
    aube: { completed: true, score: 1150 },
    relais: { completed: true, score: 900 },
    brumes: { completed: true },
    corail: undefined,
  }), 2050);
});

test('the difficulty label sets the rate, and an unknown one is neutral', () => {
  const run = { par: 4, stepPar: 8, moves: 4, steps: 8, seconds: timeTarget(4, 8) };
  const plain = scoreRun(run);
  assert.equal(plain.rate, 1);
  assert.equal(plain.total, plain.earned);
  assert.equal(scoreRun({ ...run, difficulty: 'Rien de connu' }).total, plain.total);
  const legend = scoreRun({ ...run, difficulty: 'Légende' });
  assert.equal(legend.earned, plain.earned, 'les parts restent lisibles avant pondération');
  assert.equal(legend.total, Math.round(plain.earned * RATES['Légende']));
  assert.ok(legend.total > plain.total);
});

test('every rate is a real multiplier, ordered from easiest to hardest', () => {
  const ladder = ['Initiation', 'Découverte', 'Exploration', 'Aventure', 'Défi', 'Expert', 'Maîtrise', 'Légende'];
  const rates = ladder.map(rateOf);
  assert.deepEqual(rates, [...rates].sort((a, b) => a - b));
  assert.equal(rates[0], 1);
  for (const rate of rates) assert.ok(rate >= 1 && rate <= 3);
});
