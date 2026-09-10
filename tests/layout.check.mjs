/** Guards the safe-area contract the game shell is built on.
 *
 * Run: node tests/layout.check.mjs
 *
 * The chrome scrim darkens the board behind the interface, and it fades out at
 * the safe-area edges. On a phone the narrative moved from a left column to a
 * top strip, so `--safe-left` collapsed to 20px — but the scrim still declared
 * its transparent stop there, *after* a literal 220px stop. CSS clamps a stop
 * that retreats, so the veil stopped dead in the middle of the board instead of
 * fading. That painted a hard seam down the screen and washed out half the game.
 *
 * The rule this enforces: wherever a safe-area edge is narrower than a literal
 * stop that precedes it, that gradient must be redefined for the breakpoint.
 */
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const problems = [];

/** Split the sheet into the base rules and one entry per media query. */
function breakpoints(source) {
  const blocks = [{ query: 'écran large', body: '' }];
  let depth = 0, at = 0, current = blocks[0];
  while (at < source.length) {
    const start = source.indexOf('@media', at);
    if (start < 0) { current.body += source.slice(at); break; }
    current.body += source.slice(at, start);
    const open = source.indexOf('{', start);
    depth = 1;
    let cursor = open + 1;
    while (cursor < source.length && depth > 0) {
      if (source[cursor] === '{') depth++;
      if (source[cursor] === '}') depth--;
      cursor++;
    }
    blocks.push({ query: source.slice(start + 6, open).trim(), body: source.slice(open + 1, cursor - 1) });
    at = cursor;
  }
  return blocks;
}

const raw = breakpoints(css);
const base = raw[0];
// CSS cascades across blocks that share a condition, so judge them together:
// the sheet declares --safe-left in one (max-width:800px) block and redraws the
// scrim in another. Read separately, that looks like a hole where there is none.
const grouped = new Map();
for (const block of raw.slice(1)) {
  const query = block.query.replace(/\s+/g, '');
  grouped.set(query, (grouped.get(query) || '') + block.body);
}
const blocks = [...grouped].map(([query, body]) => ({ query, body }));

/** Last declared value of a custom property inside a block, if any. */
const declared = (body, name) => {
  const found = [...body.matchAll(new RegExp(`--${name}\\s*:\\s*([^;}]+)`, 'g'))];
  return found.length ? found.at(-1)[1].trim() : null;
};

/** Literal px value, or null when it is a calc() we will not evaluate. */
const pixels = value => {
  if (!value) return null;
  const match = /^(-?[\d.]+)px$/.exec(value);
  return match ? Number(match[1]) : null;
};

// Every gradient stop that ends at a safe-area edge, with the stop before it.
const GRADIENT = /linear-gradient\(([^;]*?)transparent\s+var\(--safe-(top|right|bottom|left)\)\)/g;
const guarded = [];
for (const [, prelude, edge] of base.body.matchAll(GRADIENT)) {
  const literals = [...prelude.matchAll(/([\d.]+)px/g)].map(match => Number(match[1]));
  if (literals.length) guarded.push({ edge, last: Math.max(...literals) });
}
if (!guarded.length) problems.push('aucun dégradé de voile trouvé : le contrôle ne garde plus rien');

console.log(`Voile de l’interface · ${guarded.length} dégradé(s) bornés par une zone franche`);
for (const { edge, last } of guarded) console.log(`   --safe-${edge} doit rester au-delà de ${last}px`);

for (const block of blocks) {
  for (const { edge, last } of guarded) {
    const value = pixels(declared(block.body, `safe-${edge}`));
    if (value === null || value > last) continue;
    // This breakpoint narrows the edge past the stop: the scrim must be redrawn.
    const redrawn = /\.chrome-scrim\s*\{[^}]*background/.test(block.body);
    const verdict = redrawn ? 'voile redessiné' : 'VOILE NON REDESSINÉ';
    console.log(`   @media ${block.query} · --safe-${edge}: ${value}px < ${last}px → ${verdict}`);
    if (!redrawn) {
      problems.push(`@media ${block.query} : --safe-${edge} vaut ${value}px, en retrait de l’étape à ${last}px,`
        + ' et .chrome-scrim n’y est pas redéfini — le dégradé se coupera net au milieu de l’écran');
    } else {
      const scrim = /\.chrome-scrim\s*\{([^}]*)\}/.exec(block.body)[1];
      if (scrim.includes(`var(--safe-${edge})`)) {
        problems.push(`@media ${block.query} : le voile redessiné borne encore sur --safe-${edge}`);
      }
    }
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problème(s) :`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('\nvoile conforme : aucun dégradé ne se coupe dans la zone de jeu');
