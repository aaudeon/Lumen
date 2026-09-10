/** Guards the resting position of the buttons that place themselves with a transform.
 *
 * Run: node tests/hover.check.mjs
 *
 * A map stop centres itself on its island coordinate with `transform:translate(-50%,-50%)`
 * — the transform *is* the layout, not an effect. A global `button:disabled:hover
 * {transform:none}` outranked it (0,2,1 beats 0,1,0), so the day the locked passages
 * became `disabled`, hovering one threw it half its own size down and to the right.
 * Nothing needed that rule: every hover and active effect in the project is already
 * written `:not(:disabled)`.
 *
 * The two rules this enforces:
 *   1. No stylesheet resets `transform` for every button at once. A reset erases
 *      positioning it knows nothing about; guard the effect with `:not(:disabled)`.
 *   2. Every rule that touches `.map-stop`'s transform restates its centring.
 */
import { readFileSync } from 'node:fs';

const sheets = ['style.css', 'home.css', 'shop.css']
  .map(name => ({ name, css: readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8') }));

/** Each leaf declaration block of a sheet. At-rule preludes never match: they nest a `{`. */
function rules(css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({
    selectors: match[1].split(',').map(part => part.trim()).filter(Boolean),
    body: match[2],
  }));
}

const declares = (body, property) => new RegExp(`(^|;)\\s*${property}\\s*:`).test(body);
/** A selector with no class and no id matches every button on the page. */
const catchAll = selector => /(^|[\s>+~(])button([\s:[.]|$)/.test(selector) && !/[.#]/.test(selector);

const problems = [];
let positioned = 0;

for (const { name, css } of sheets) {
  for (const { selectors, body } of rules(css)) {
    if (!declares(body, 'transform')) continue;
    const reset = /transform\s*:\s*none/.test(body);

    for (const selector of selectors) {
      if (reset && catchAll(selector)) {
        problems.push(`${name} · « ${selector} » remet transform à none pour tous les boutons : `
          + 'il effacerait le placement d’un bouton qui se positionne par transform');
      }
      if (!selector.includes('.map-stop')) continue;
      positioned++;
      if (!/translate\(\s*-50%\s*,\s*-50%\s*\)/.test(body)) {
        problems.push(`${name} · « ${selector} » change le transform d’un arrêt de carte `
          + 'sans redonner translate(-50%,-50%) : l’arrêt quitterait son point sur l’île');
      }
    }
  }
}

if (!positioned) problems.push('aucune règle ne place les arrêts de carte : le sélecteur a-t-il été renommé ?');

if (problems.length) {
  console.error(`survol : ${problems.length} problème(s)`);
  for (const problem of problems) console.error('   ' + problem);
  process.exit(1);
}
console.log(`survol conforme : ${positioned} règle(s) de transform sur les arrêts de carte, toutes recentrées`);
console.log('   aucun reset de transform ne s’applique à tous les boutons d’un coup');
