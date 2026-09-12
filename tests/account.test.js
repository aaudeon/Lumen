import test from 'node:test';
import assert from 'node:assert/strict';
import { ProgressProfile, emptySave } from '../src/account.js';
import { SAVE_VERSION, VERSION_KEY } from '../src/campaign.js';
import { load } from './render.mjs';

function storage() {
  const values = new Map([[VERSION_KEY, String(SAVE_VERSION)]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
const account = (id = 'one', save = emptySave(), revision = 0) => ({ user: { id, username: id }, save, revision });

test('guest progression is preserved and never imported into an existing account', () => {
  const local = storage();
  const guest = new ProgressProfile({ user: null }, local);
  guest.write('lumen-progress', { aube: { score: 100 } });
  const first = new ProgressProfile(account(), local);
  assert.deepEqual(first.read('lumen-progress', {}), {});
  assert.equal(guest.getSave().progress.aube.score, 100);
  const second = new ProgressProfile(account('two'), local);
  assert.deepEqual(second.getSave().progress, {});
});

test('saves arriving during a request are sent in order with the new revision', async () => {
  let resolveFirst;
  const calls = [];
  const profile = new ProgressProfile(account(), storage(), async (_path, body) => {
    calls.push(body);
    if (calls.length === 1) await new Promise(resolve => { resolveFirst = resolve; });
    return { revision: calls.length };
  });
  profile.write('lumen-progress', { aube: { score: 100 } });
  const saving = profile.flush();
  profile.write('lumen-wardrobe', { ...emptySave().wardrobe, spent: 20 });
  resolveFirst();
  await saving;
  assert.deepEqual(calls.map(call => call.revision), [0, 1]);
  assert.equal(calls[1].save.progress.aube.score, 100);
  assert.equal(calls[1].save.wardrobe.spent, 20);
  assert.equal(profile.status, 'saved');
  assert.equal(profile.read('outbox', null), null);
  profile.stop();
});

test('network failure survives reload and retries without losing progression', async () => {
  const local = storage();
  const profile = new ProgressProfile(account(), local, async () => { throw new Error('offline'); });
  profile.write('lumen-progress', { aube: { completed: true } });
  await assert.rejects(profile.flush());
  assert.equal(profile.status, 'offline');
  const restored = new ProgressProfile(account(), local, async () => ({ revision: 1 }));
  assert.equal(restored.getSave().progress.aube.completed, true);
  await restored.flush();
  assert.equal(restored.status, 'saved');
  assert.equal(restored.read('outbox', null), null);
});

test('stale local copy never overwrites a newer server save', async () => {
  const local = storage();
  const profile = new ProgressProfile(account(), local);
  profile.write('lumen-progress', { aube: { completed: true } });
  profile.stop();
  const stale = new ProgressProfile(account('one', emptySave(), 2), local, async () => assert.fail('must not write'));
  assert.equal(stale.status, 'conflict');
  await assert.rejects(stale.flush());
  assert.equal(stale.getSave().progress.aube.completed, true);
  stale.write('lumen-level', 'relais');
  stale.stop();
  assert.equal(new ProgressProfile(account('one', emptySave(), 2), local).status, 'conflict');
  stale.discardPending();
  assert.deepEqual(new ProgressProfile(account('one', emptySave(), 2), local).getSave().progress, {});
});

test('expired session is blocked and reset failure does not erase local data', async () => {
  const local = storage();
  const profile = new ProgressProfile(account(), local, async () => { const error = new Error('expired'); error.status = 401; throw error; });
  profile.write('lumen-progress', { aube: { completed: true } });
  await assert.rejects(profile.flush());
  assert.equal(profile.status, 'expired');
  await assert.rejects(profile.reset());
  assert.equal(profile.getSave().progress.aube.completed, true);
});

test('reset persists an empty account save and leaves the guest untouched', async () => {
  const local = storage();
  local.setItem('lumen-progress', JSON.stringify({ aube: { score: 400 } }));
  let sent;
  const profile = new ProgressProfile(account(), local, async (_path, body) => { sent = body; return { revision: 1 }; });
  await profile.reset();
  assert.deepEqual(sent.save, emptySave());
  assert.equal(JSON.parse(local.getItem('lumen-progress')).aube.score, 400);
});

test('account save remains readable when browser storage is disabled', () => {
  const snapshot = { ...emptySave(), progress: { aube: { completed: true } } };
  const profile = new ProgressProfile(account('one', snapshot), undefined);
  assert.deepEqual(profile.read('lumen-progress', {}), snapshot.progress);
});

test('a pack purchase flushes progression first, debits once and never equips a pack', async () => {
  const calls = [];
  let revision = 0;
  const profile = new ProgressProfile(account(), storage(), async (path, body) => {
    calls.push({ path, body });
    revision++;
    if (path.endsWith('/save')) return { revision };
    return { packs: ['echoes'], revision, save: { ...profile.getSave(), wardrobe: {
      ...profile.getSave().wardrobe, spent: 45000 } } };
  });
  profile.write('lumen-progress', { aube: { completed: true, score: 50000 } });
  const first = profile.purchasePack('echoes');
  assert.equal(profile.purchasePack('echoes'), first);
  await first;
  assert.deepEqual(calls.map(call => call.path), ['/api/account/save', '/api/account/pack']);
  assert.equal(calls[1].body.revision, 1);
  assert.equal(profile.getSave().wardrobe.spent, 45000);
  assert.deepEqual(profile.getSave().wardrobe.equipped, emptySave().wardrobe.equipped);
  assert.deepEqual(profile.packs, ['echoes']);
  assert.equal(profile.status, 'saved');
  profile.stop();
});

test('a refused pack purchase leaves the balance and access unchanged', async () => {
  const profile = new ProgressProfile(account(), storage(), async () => {
    const error = new Error('Solde insuffisant'); error.status = 400; throw error;
  });
  await assert.rejects(profile.purchasePack('echoes'), /Solde insuffisant/);
  assert.deepEqual(profile.packs, []);
  assert.equal(profile.getSave().wardrobe.spent, 0);
  assert.equal(profile.status, 'saved');
  profile.stop();
});

test('a save arriving during a pack purchase keeps the confirmed debit', async () => {
  let completePurchase;
  let notifyStarted;
  const started = new Promise(resolve => { notifyStarted = resolve; });
  const calls = [];
  const profile = new ProgressProfile(account(), storage(), async (path, body) => {
    calls.push({ path, body });
    if (path.endsWith('/pack')) {
      notifyStarted();
      return new Promise(resolve => { completePurchase = resolve; });
    }
    return { revision: 2 };
  });
  const buying = profile.purchasePack('echoes');
  await started;
  profile.write('lumen-progress', { jardins: { completed: true, score: 900 } });
  completePurchase({ packs: ['echoes'], revision: 1, save: { ...emptySave(), wardrobe: { ...emptySave().wardrobe, spent: 45000 } } });
  await buying;
  assert.equal(calls[1].body.save.wardrobe.spent, 45000);
  assert.equal(calls[1].body.save.progress.jardins.score, 900);
  assert.equal(profile.getSave().wardrobe.spent, 45000);
  assert.equal(profile.revision, 2);
  profile.stop();
});

test('session expiry locks the profile without discarding pending changes', async () => {
  const profile = new ProgressProfile(account(), storage());
  profile.write('lumen-progress', { aube: { completed: true } });
  profile.expire();
  assert.equal(profile.status, 'expired');
  await assert.rejects(profile.flush());
  assert.equal(profile.getSave().progress.aube.completed, true);
  assert.equal(profile.read('outbox', null).save.progress.aube.completed, true);
});

test('an in-flight save cannot unlock a profile whose session has expired', async () => {
  let finish;
  const profile = new ProgressProfile(account(), storage(), () => new Promise(resolve => { finish = resolve; }));
  profile.write('lumen-progress', { aube: { completed: true } });
  const pending = profile.flush();
  profile.expire();
  finish({ revision: 1 });
  await pending;
  assert.equal(profile.status, 'expired');
  await assert.rejects(profile.flush());
});

test('mandatory login offers neither a close button nor guest access', async () => {
  const render = await load('AccountPanel.jsx', 'mandatory');
  const markup = render({ profile: new ProgressProfile({ user: null }, storage()), status: 'guest', mandatory: true, onChange() {} });
  assert.match(markup, /account-required/);
  assert.match(markup, /autocomplete="current-password"/i);
  assert.match(markup, /account-honeypot/);
  assert.doesNotMatch(markup, /Continuer en invité|Fermer le compte/);
});