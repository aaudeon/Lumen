import test from 'node:test';
import assert from 'node:assert/strict';

/** `DEV_MODE` is decided once, when the module loads, so each case needs its own
 *  instance: a query on the import specifier gives one. */
let instance = 0;
async function session({ search, store } = {}) {
  if (search !== undefined) globalThis.location = { search, href: `http://127.0.0.1:8765/${search}` };
  if (store) globalThis.sessionStorage = store;
  try { return await import(`../src/dev-mode.js?case=${instance++}`); }
  finally { delete globalThis.location; delete globalThis.sessionStorage; }
}

/** A session storage that records what the module leaves behind. */
const storage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: key => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: key => { delete data[key]; } };
};

test('without an address bar there is no dev mode', async () => {
  const { DEV_MODE } = await session();
  assert.equal(DEV_MODE, false);
});

test('a plain address leaves the campaign locked', async () => {
  const store = storage();
  const { DEV_MODE } = await session({ search: '', store });
  assert.equal(DEV_MODE, false);
  assert.deepEqual(store.data, {}, 'rien ne doit être écrit sans demande');
});

test('?dev turns it on and remembers it for the tab', async () => {
  const store = storage();
  const { DEV_MODE } = await session({ search: '?dev', store });
  assert.equal(DEV_MODE, true);
  assert.equal(store.data['lumen-dev'], '1');
});

test('the flag alone survives a reload, without the parameter', async () => {
  const store = storage({ 'lumen-dev': '1' });
  const { DEV_MODE } = await session({ search: '', store });
  assert.equal(DEV_MODE, true);
});

test('every spelling of off turns it off, and clears the flag', async () => {
  for (const value of ['0', 'false', 'off', 'non', 'OFF']) {
    const store = storage({ 'lumen-dev': '1' });
    const { DEV_MODE } = await session({ search: `?dev=${value}`, store });
    assert.equal(DEV_MODE, false, `?dev=${value} devrait éteindre le mode dév`);
    assert.equal(store.getItem('lumen-dev'), null, `?dev=${value} devrait oublier le drapeau`);
  }
});

test('an explicit value that is not a refusal turns it on', async () => {
  for (const value of ['1', 'true', 'oui', '']) {
    const { DEV_MODE } = await session({ search: `?dev=${value}`, store: storage() });
    assert.equal(DEV_MODE, true, `?dev=${value} devrait allumer le mode dév`);
  }
});

test('other parameters are none of its business', async () => {
  const { DEV_MODE } = await session({ search: '?niveau=aube&son=1', store: storage() });
  assert.equal(DEV_MODE, false);
});

test('a browser without storage still honours the address', async () => {
  const { DEV_MODE } = await session({ search: '?dev' });
  assert.equal(DEV_MODE, true, 'sans sessionStorage, l’adresse doit suffire');
});

test('leaving drops the flag and reloads without the parameter', async () => {
  const store = storage({ 'lumen-dev': '1' });
  let left = '';
  globalThis.location = { search: '?dev', href: 'http://127.0.0.1:8765/?dev=1&niveau=aube',
    replace: url => { left = String(url); } };
  globalThis.sessionStorage = store;
  try {
    const { exitDevMode } = await import(`../src/dev-mode.js?case=${instance++}`);
    exitDevMode();
    assert.equal(store.getItem('lumen-dev'), null);
    assert.equal(left, 'http://127.0.0.1:8765/?niveau=aube', 'les autres paramètres restent');
  } finally { delete globalThis.location; delete globalThis.sessionStorage; }
});
