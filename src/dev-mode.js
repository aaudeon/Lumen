/** Dev mode: a session where the whole campaign is open, to try new passages at once.
 *
 * Turned on by adding `?dev` to the address, and remembered for the tab so that
 * reloading keeps it. `?dev=0` — or the badge in the interface — turns it back off, and
 * closing the tab ends it: a dev session never becomes the permanent state of the game.
 *
 * It changes nothing that is saved. Progress, records, relics and the wallet stay exactly
 * as the campaign left them; only the padlocks step aside. A passage finished in dev mode
 * counts as finished, which is what makes it useful for testing a new world.
 */
const KEY = 'lumen-dev';
const OFF = ['0', 'false', 'off', 'non'];

/** Session storage, when there is one. Absent in node, and off in private browsing. */
function tabStore() {
  try { return globalThis.sessionStorage ?? null; } catch { return null; }
}

/** Reads the address once, at load, and remembers the answer for the tab. */
function detect() {
  const search = globalThis.location?.search;
  if (search === undefined) return false;
  const asked = new URLSearchParams(search).get('dev');
  try {
    if (asked === null) return tabStore()?.getItem(KEY) === '1';
    const on = !OFF.includes(asked.toLowerCase());
    if (on) tabStore()?.setItem(KEY, '1'); else tabStore()?.removeItem(KEY);
    return on;
  } catch { return asked !== null && !OFF.includes(asked.toLowerCase()); }
}

export const DEV_MODE = detect();

/** Leaves dev mode: forgets the flag, then reloads without the parameter. */
export function exitDevMode() {
  try { tabStore()?.removeItem(KEY); } catch { /* Private browsing can disable storage. */ }
  try {
    const url = new URL(globalThis.location.href);
    url.searchParams.delete('dev');
    globalThis.location.replace(url.toString());
  } catch { /* Nothing to leave without an address bar. */ }
}
