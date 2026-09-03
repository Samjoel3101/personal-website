/**
 * Pure validation of the asset manifest.
 *
 * Kept separate from the file-touching parts of verify-assets.mjs so the unit
 * suite can assert the same rules CI enforces, rather than a second copy of
 * them that can drift.
 */
const REQUIRED_FIELDS = ['id', 'kind', 'file', 'url', 'license', 'source', 'role'];

export function needsAttribution(manifest, asset) {
  return manifest.licenses.attributionRequired.includes(asset.license);
}

/** Checks one asset entry. @returns {string[]} */
export function validateAsset(manifest, asset) {
  const problems = [];
  const id = asset.id ?? '(no id)';

  for (const field of REQUIRED_FIELDS) {
    if (!asset[field]) problems.push(`${id}: missing "${field}"`);
  }

  if (asset.license && !manifest.licenses.allowed.includes(asset.license)) {
    problems.push(
      `${id}: licence "${asset.license}" is not in the allow-list ` +
        `(${manifest.licenses.allowed.join(', ')})`,
    );
  }

  if (needsAttribution(manifest, asset) && !(asset.author && asset.title)) {
    problems.push(`${id}: licence ${asset.license} requires "author" and "title"`);
  }

  if (typeof asset.file === 'string' && (asset.file.includes('..') || asset.file.startsWith('/'))) {
    problems.push(`${id}: file path must stay inside public/assets`);
  }

  return problems;
}

/** @returns {string[]} problems; empty means the manifest is valid */
export function validateManifest(manifest) {
  if (!Array.isArray(manifest?.licenses?.allowed)) {
    return ['manifest.licenses.allowed must be an array'];
  }

  const problems = [];
  const seen = new Set();

  for (const asset of manifest.assets ?? []) {
    if (seen.has(asset.id)) problems.push(`duplicate asset id "${asset.id}"`);
    seen.add(asset.id);
    problems.push(...validateAsset(manifest, asset));
  }

  return problems;
}
