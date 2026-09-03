#!/usr/bin/env node
/**
 * Validates the asset manifest, and any assets already on disk.
 *
 * Runs in CI. It deliberately passes when public/assets is empty — the site is
 * built to work without third-party assets — so what it is really guarding is
 * that nothing enters the manifest without a licence we are allowed to use and
 * an attribution we can print.
 */
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { destinationFor, readManifest } from './asset-manifest.mjs';
import { validateManifest } from './validate-manifest.mjs';

async function sha256Of(path) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

async function checkOnDisk(asset, problems) {
  if (asset.file.endsWith('/')) return; // directory assets are checked by contents

  let path;
  try {
    path = destinationFor(asset);
  } catch (error) {
    problems.push(error.message);
    return;
  }

  try {
    await stat(path);
  } catch {
    return; // not fetched; that is allowed
  }

  if (!asset.sha256) {
    problems.push(
      `${asset.id}: present on disk but manifest has no sha256 (run assets:fetch -- --record)`,
    );
    return;
  }

  const actual = await sha256Of(path);
  if (actual !== asset.sha256) {
    problems.push(
      `${asset.id}: sha256 mismatch\n    expected ${asset.sha256}\n    actual   ${actual}`,
    );
  }
}

const manifest = await readManifest();
const problems = validateManifest(manifest);

for (const asset of manifest.assets) {
  await checkOnDisk(asset, problems);
}

if (problems.length > 0) {
  console.error(`\nAsset manifest invalid (${problems.length} problem(s)):\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('');
  process.exit(1);
}

const blocked = manifest.assets.filter((a) => a.hostBlockedHere).length;
console.log(`Asset manifest OK: ${manifest.assets.length} entries, all licensed and attributed.`);
if (blocked > 0) {
  console.log(`  (${blocked} sit on hosts blocked in this environment; they are optional.)`);
}
