#!/usr/bin/env node
/**
 * Installs a downloaded model pack into the manifest's local slots.
 *
 * Some packs cannot be fetched from the environment this project is built in —
 * quaternius.com, itch.io and poly.pizza are all blocked by its egress policy,
 * and the download is behind a page rather than at a URL in any case. So the
 * manifest declares those files as `provenance: "local"`: it knows their
 * licence, their author and the name it wants them under, and waits for a
 * human to supply them.
 *
 * This is that step, automated:
 *
 *     npm run assets:link -- ~/Downloads/StylizedNatureMegaKit/glTF
 *
 * It walks the folder for glTF files, scores each local slot's `match`
 * keywords against the file names, copies the best match into place, and then
 * tells you to run `assets:fetch -- --record` to pin the hashes. Nothing is
 * overwritten unless --force is passed, and a slot with no match is left for
 * the procedural shape, which is always a complete fallback.
 */
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { destinationFor, readManifest } from './asset-manifest.mjs';

const [source, ...flags] = process.argv.slice(2).filter((argument) => argument !== '--');
const force = flags.includes('--force');

if (!source) {
  console.error('usage: npm run assets:link -- <folder of .glb/.gltf files> [--force]');
  process.exit(1);
}

/** Every model file under `dir`, recursively. */
async function models(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await models(path)));
    else if (['.glb', '.gltf'].includes(extname(entry.name).toLowerCase())) found.push(path);
  }
  return found;
}

/**
 * How well a file name answers a slot.
 *
 * Earlier keywords are worth more, so a slot can say "the specific model I
 * really want, then the family it belongs to" and get the right one when both
 * are present. A shorter name wins ties: `Pine_1.glb` is a better answer to
 * "pine" than `PineSnowRound_3.glb`.
 */
function score(file, keywords) {
  const name = basename(file)
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  let best = 0;
  keywords.forEach((keyword, index) => {
    const flat = keyword.toLowerCase().replace(/[\s_-]/g, '');
    if (name.includes(flat)) best = Math.max(best, keywords.length - index);
  });
  return best === 0 ? 0 : best * 1000 - name.length;
}

const manifest = await readManifest();
const slots = manifest.assets.filter((asset) => asset.provenance === 'local' && asset.match);
const files = await models(source);

if (files.length === 0) {
  console.error(`No .glb or .gltf files under ${source}`);
  process.exit(1);
}
console.log(`Found ${files.length} model files in ${source}\n`);

const taken = new Set();
let linked = 0;

for (const slot of slots) {
  const ranked = files
    .filter((file) => !taken.has(file))
    .map((file) => ({ file, points: score(file, slot.match) }))
    .filter((entry) => entry.points > 0)
    .sort((a, b) => b.points - a.points);

  const target = destinationFor(slot);
  const already = await stat(target).catch(() => null);
  if (already && !force) {
    console.log(`  ${slot.id.padEnd(32)} already installed`);
    continue;
  }
  if (ranked.length === 0) {
    console.log(`  ${slot.id.padEnd(32)} no match — keeping the procedural shape`);
    continue;
  }

  taken.add(ranked[0].file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(ranked[0].file, target);
  console.log(`  ${slot.id.padEnd(32)} ← ${basename(ranked[0].file)}`);
  linked += 1;
}

const next = linked > 0 ? '\nNow run: npm run assets:fetch -- --record   (pins their hashes)' : '';
console.log(`\nLinked ${linked} of ${slots.length} slots.${next}`);
