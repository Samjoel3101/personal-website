/**
 * Pure validation of the asset manifest.
 *
 * Kept separate from the file-touching parts of verify-assets.mjs so the unit
 * suite can assert the same rules CI enforces, rather than a second copy of
 * them that can drift.
 */
const REQUIRED_FIELDS = ['id', 'kind', 'file', 'license', 'source', 'role'];

/**
 * Where an asset comes from.
 *
 * "remote" is the normal case: a URL the fetch script can download and pin.
 * "local" means the file cannot be fetched here and has to be supplied by
 * whoever is building — a pack behind a download page, or a host this
 * environment's egress policy blocks. A local entry still declares its
 * licence, author and source, so `CREDITS.md` is complete whether or not the
 * file was ever installed, and it is still optional: the renderer falls back
 * to procedural geometry exactly as it does for a remote asset nobody fetched.
 */
const PROVENANCE = ['remote', 'local'];

export function needsAttribution(manifest, asset) {
  return manifest.licenses.attributionRequired.includes(asset.license);
}

/** Where the file comes from, and what that obliges the entry to carry. */
function provenanceProblems(asset, id) {
  const provenance = asset.provenance ?? 'remote';
  if (!PROVENANCE.includes(provenance)) {
    return [`${id}: provenance must be one of ${PROVENANCE.join(', ')}`];
  }
  if (provenance === 'remote') {
    return asset.url ? [] : [`${id}: missing "url"`];
  }

  const problems = [];
  if (asset.url) problems.push(`${id}: a local asset must not carry a "url"`);
  if (!asset.install) problems.push(`${id}: a local asset needs "install" telling a human how`);
  if (asset.required) problems.push(`${id}: a local asset can never be required`);
  return problems;
}

/** Checks one asset entry. @returns {string[]} */
export function validateAsset(manifest, asset) {
  const problems = [];
  const id = asset.id ?? '(no id)';

  for (const field of REQUIRED_FIELDS) {
    if (!asset[field]) problems.push(`${id}: missing "${field}"`);
  }

  problems.push(...provenanceProblems(asset, id));

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
