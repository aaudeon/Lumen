/** Renders a screen of the game to markup, for checks that want to read the real interface.
 *
 * The screens import stylesheets and pull in three.js, so a component is bundled with
 * esbuild first: stylesheets stubbed out, react and three left for node to resolve from
 * the project. Effects never run — `renderToStaticMarkup` gives the opening state, which
 * is exactly what these checks are about.
 */
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);

/** The default export of `src/<name>`, ready to render. */
export async function load(name) {
  const outfile = fileURLToPath(new URL(`work/${name.replace(/\W+/g, '-')}.check.mjs`, root));
  mkdirSync(fileURLToPath(new URL('work/', root)), { recursive: true });
  await build({
    entryPoints: [fileURLToPath(new URL(`src/${name}`, root))],
    outfile, bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', logLevel: 'warning',
    external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/server', 'three'],
    plugins: [{
      name: 'stylesheets-are-not-behaviour',
      setup(builder) {
        builder.onResolve({ filter: /\.css$/ }, args => ({ path: args.path, namespace: 'blank' }));
        builder.onLoad({ filter: /.*/, namespace: 'blank' }, () => ({ contents: '' }));
      },
    }],
  });
  const module = await import(pathToFileURL(outfile));
  return props => renderToStaticMarkup(createElement(module.default, props));
}

/** Every `<button>` of a markup, sliced at its closing tag. No button nests another. */
export const buttons = markup => markup.split('<button').slice(1)
  .map(chunk => chunk.slice(0, chunk.indexOf('</button>')));

/** React escapes text, so compare against what actually lands in the HTML. */
export const escaped = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
