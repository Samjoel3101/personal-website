#!/usr/bin/env node
/**
 * Downloads every asset in the manifest into public/assets, verifying the
 * recorded sha256 or recording it on first fetch with `--record`.
 *
 * A failure to reach a host is reported but is only fatal for assets marked
 * `required`. Everything else is optional by design: the renderer falls back to
 * procedural geometry, so a blocked CDN degrades the visuals rather than
 * breaking the build.
 *
 * This runs automatically before `npm run dev` and `npm run build` (as
 * `predev` and `prebuild`), because nothing binary is committed and the
 * failure mode without it is silent: a fresh clone renders the whole valley
 * out of procedural shapes and looks, quite reasonably, like the models were
 * never wired up. Already-downloaded files are hash-checked and skipped, so
 * the second run costs nothing.
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

/** Bounded, because this now sits in front of `npm run dev`: an unreachable
 *  host must cost a few seconds, not hang the dev server behind a TCP timeout. */
const TIMEOUT_MS = 20_000;

async function download(asset) {
  const response = await fetch(asset.url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchOne(asset) {
  if (asset.file.endsWith('/')) {
    return { status: 'skipped', reason: 'archive assets need a manual unpack step' };
  }
  if ((asset.provenance ?? 'remote') === 'local') return checkLocal(asset);
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

/**
 * A local asset is never downloaded — it is checked.
 *
 * Present and matching its hash: nothing to do. Present and unpinned: record
 * the hash so it is pinned from now on. Absent: say where to get it and carry
 * on, because it is optional like everything else here.
 */
async function checkLocal(asset) {
  const path = destinationFor(asset);
  let body;
  try {
    body = await readFile(path);
  } catch {
    return { status: 'supply', reason: asset.install };
  }

  const digest = hash(body);
  if (asset.sha256 && asset.sha256 !== digest) {
    throw new Error(`sha256 mismatch: expected ${asset.sha256}, got ${digest}`);
  }
  if (!asset.sha256) {
    if (!record) {
      return { status: 'unpinned', reason: 're-run with --record to pin it', digest };
    }
    asset.sha256 = digest;
    return { status: 'pinned', digest };
  }
  return { status: 'cached' };
}

const manifest = await readManifest();
let failures = 0;
let changed = false;
let onDisk = 0;

for (const asset of manifest.assets) {
  process.stdout.write(`  ${asset.id.padEnd(22)} `);
  try {
    const result = await fetchOne(asset);
    if (result.status === 'fetched') {
      console.log(`fetched ${(result.bytes / 1024).toFixed(0)} KB`);
      changed = true;
      onDisk += 1;
    } else if (result.status === 'cached') {
      console.log('cached, hash matches');
      onDisk += 1;
    } else if (result.status === 'pinned') {
      console.log('supplied locally, hash recorded');
      changed = true;
      onDisk += 1;
    } else if (result.status === 'supply') {
      console.log(`not installed — ${result.reason}`);
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

/*
 * Say plainly what the scene will look like, because the alternative is
 * silence: with no models on disk everything falls back to procedural shapes
 * and looks finished, which is by design and is also indistinguishable from
 * the models never having been wired up.
 */
const models = manifest.assets.filter((asset) => asset.role === 'flora').length;
console.log(`\n${onDisk} of ${models} models on disk; CREDITS.md regenerated.`);
if (onDisk === 0) {
  console.log('The valley will draw entirely from procedural geometry.');
} else if (onDisk < models) {
  console.log('Species without one keep their procedural shape.');
}

if (failures > 0) {
  console.error(`\n${failures} required asset(s) could not be fetched.`);
  process.exit(1);
}
