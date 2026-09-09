import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { CATALOGUE_HTML } from './catalogue-page.mjs';

const TYPES = { '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.html': 'text/html' };
const CATALOGUE_SIZE = 320;

/**
 * Serves the catalogue page, three, and a directory of models.
 *
 * Its own server rather than the app's: the catalogue deliberately does not go
 * through src/render, so it cannot be a route in the built app, and a file://
 * page cannot import modules from node_modules.
 */
async function serve(modelsDir) {
  const roots = { '/three/': 'node_modules/three/', '/models/': `${modelsDir}/` };

  const server = createServer((request, response) => {
    const url = decodeURIComponent(request.url.split('?')[0]);
    const prefix = Object.keys(roots).find((key) => url.startsWith(key));
    if (!prefix) {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end(CATALOGUE_HTML);
      return;
    }
    const file = path.resolve(roots[prefix] + url.slice(prefix.length));
    // Refuse anything that climbed out of the directory it was served from.
    if (!file.startsWith(path.resolve(roots[prefix]))) {
      response.writeHead(403).end();
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    });
    createReadStream(file)
      .on('error', () => response.writeHead(404).end())
      .pipe(response);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { port: server.address().port, stop: () => server.close() };
}

export async function shootCatalogue(page, options) {
  const modelsDir = await findModels(options.models);
  const files = (await readdir(modelsDir)).filter((name) => name.endsWith('.glb')).sort();
  if (files.length === 0) throw new Error(`No .glb files under ${modelsDir}`);

  const server = await serve(modelsDir);
  const out = path.join(options.out, 'catalogue');
  await mkdir(out, { recursive: true });
  console.log(`Cataloguing ${files.length} models from ${modelsDir}`);

  try {
    await page.setViewportSize({ width: CATALOGUE_SIZE, height: CATALOGUE_SIZE });
    await page.goto(`http://127.0.0.1:${server.port}/?size=${CATALOGUE_SIZE}`);
    await page.waitForFunction(() => window.__catalogueReady === true, null, { timeout: 60_000 });

    const entries = [];
    for (const file of files) {
      const name = file.replace(/\.glb$/, '');
      const info = await page
        .evaluate((f) => window.__catalogue.show(f), file)
        .catch((error) => {
          console.warn(`  ! ${name}: ${error.message}`);
          return null;
        });
      if (!info) continue;
      await page.screenshot({ path: path.join(out, `${name}.png`) });
      entries.push({ name, file, image: `${name}.png`, ...info });
      console.log(
        `  ${name.padEnd(26)} ${String(info.triangles).padStart(6)} tris  ${info.size.join(' x ')}`,
      );
    }

    await writeFile(path.join(out, 'index.json'), `${JSON.stringify(entries, null, 2)}\n`);
    await writeFile(path.join(out, 'index.html'), sheet(entries, modelsDir));
    console.log(`\n  ${entries.length} models -> ${path.join(out, 'index.html')}`);
    return entries;
  } finally {
    server.stop();
  }
}

/** Prefer the fetched models; fall back to a checkout of the mirror. */
async function findModels(given) {
  const candidates = [given, path.join(given, 'nature-megakit'), path.join(given, 'nature-kit')];
  for (const dir of candidates) {
    const found = await stat(dir).catch(() => null);
    if (!found?.isDirectory()) continue;
    const files = await readdir(dir);
    if (files.some((name) => name.endsWith('.glb'))) return dir;
    const nested = files.map((name) => path.join(dir, name));
    for (const child of nested) {
      const childStat = await stat(child).catch(() => null);
      if (childStat?.isDirectory() && (await readdir(child)).some((n) => n.endsWith('.glb'))) {
        return child;
      }
    }
  }
  throw new Error(`No .glb files under ${given}. Run \`npm run assets:fetch\`, or pass --models.`);
}

function sheet(entries, modelsDir) {
  const cards = entries
    .map(
      (entry) => `<figure>
    <img src="${entry.image}" width="${CATALOGUE_SIZE}" height="${CATALOGUE_SIZE}" loading="lazy" alt="${entry.name}" />
    <figcaption><b>${entry.name}</b><span>${entry.triangles.toLocaleString()} tris &middot; ${entry.size.join(' &times; ')}</span></figcaption>
  </figure>`,
    )
    .join('\n  ');

  return `<!doctype html>
<meta charset="utf-8" />
<title>Model catalogue</title>
<style>
  body { margin: 0; padding: 24px; background: #16181c; color: #e8e6e1;
         font: 13px/1.5 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size: 18px; font-weight: 600; margin: 0 0 4px; }
  p.meta { margin: 0 0 24px; color: #9a978f; }
  .grid { display: grid; gap: 18px; grid-template-columns: repeat(auto-fill, minmax(${CATALOGUE_SIZE}px, 1fr)); }
  figure { margin: 0; background: #212429; border-radius: 8px; overflow: hidden; }
  img { display: block; width: 100%; height: auto; }
  figcaption { padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
  figcaption span { color: #9a978f; font-variant-numeric: tabular-nums; }
</style>
<h1>Model catalogue</h1>
<p class="meta">${entries.length} models from <code>${modelsDir}</code> &middot; each on neutral ground under the valley's own light, framed by its own bounds.</p>
<div class="grid">
  ${cards}
</div>
`;
}
