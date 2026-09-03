import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MANIFEST_PATH = join(ROOT, 'assets', 'manifest.json');
export const ASSET_DIR = join(ROOT, 'public', 'assets');

export async function readManifest() {
  return JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
}

export async function writeManifest(manifest) {
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

/** Absolute destination for an asset, refusing anything that escapes ASSET_DIR. */
export function destinationFor(asset) {
  const target = resolve(ASSET_DIR, normalize(asset.file));
  if (!target.startsWith(ASSET_DIR)) {
    throw new Error(`asset "${asset.id}": file path escapes public/assets`);
  }
  return target;
}

/** Assets whose licence obliges us to name the author. */
export function needsAttribution(manifest, asset) {
  return manifest.licenses.attributionRequired.includes(asset.license);
}
