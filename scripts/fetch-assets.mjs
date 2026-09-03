#!/usr/bin/env node
/**
 * Downloads every asset in the manifest into public/assets, verifying the
 * recorded sha256 or recording it on first fetch with `--record`.
 *
 * A failure to reach a host is reported but is only fatal for assets marked
 * `required`. Everything else is optional by design: the renderer falls back to
 * procedural geometry, so a blocked CDN degrades the visuals rather than
 * breaking the build.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { destinationFor, readManifest, writeManifest } from './asset-manifest.mjs';
import { writeCredits } from './write-credits.mjs';

const record = process.argv.includes('--record');
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');

async function alreadyCorrect(asset) {
  if (!asset.sha256) return false;
  try {
    const path = destinationFor(asset);
    await stat(path);
    return hash(await readFile(path)) === asset.sha256;
  } catch {
    return false;
  }
}

async function download(asset) {
  const response = await fetch(asset.url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchOne(asset) {
  if (asset.file.endsWith('/')) {
    return { status: 'skipped', reason: 'archive assets need a manual unpack step' };
  }
  if (await alreadyCorrect(asset)) return { status: 'cached' };

  const body = await download(asset);
  const digest = hash(body);

  if (asset.sha256 && asset.sha256 !== digest) {
    throw new Error(`sha256 mismatch: expected ${asset.sha256}, got ${digest}`);
  }
  if (!asset.sha256) {
    if (!record) {
      return {
        status: 'unpinned',
        reason: 'no sha256 in manifest; re-run with --record to pin it',
        digest,
      };
    }
    asset.sha256 = digest;
  }

  const path = destinationFor(asset);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
  return { status: 'fetched', bytes: body.length, digest };
}

const manifest = await readManifest();
let failures = 0;
let changed = false;

for (const asset of manifest.assets) {
  process.stdout.write(`  ${asset.id.padEnd(22)} `);
  try {
    const result = await fetchOne(asset);
    if (result.status === 'fetched') {
      console.log(`fetched ${(result.bytes / 1024).toFixed(0)} KB`);
      changed = true;
    } else if (result.status === 'cached') {
      console.log('cached, hash matches');
    } else if (result.status === 'unpinned') {
      console.log(`downloaded but NOT saved — ${result.reason}\n      sha256 ${result.digest}`);
    } else {
      console.log(`skipped (${result.reason})`);
    }
  } catch (error) {
    const fatal = asset.required === true;
    console.log(`${fatal ? 'FAILED' : 'unavailable'} — ${error.message}`);
    if (asset.hostBlockedHere)
      console.log("      (host is blocked by this environment's egress policy)");
    if (fatal) failures += 1;
  }
}

if (changed && record) await writeManifest(manifest);
await writeCredits(manifest);
console.log('\nCREDITS.md regenerated from the manifest.');

if (failures > 0) {
  console.error(`\n${failures} required asset(s) could not be fetched.`);
  process.exit(1);
}
