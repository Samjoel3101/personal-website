import manifest from '../../assets/manifest.json';

/**
 * Runtime view of the asset manifest: which ids exist and where they live once
 * fetched. The build inlines the JSON, so this costs nothing at runtime and
 * cannot drift from what the fetch script writes.
 */

const BASE = import.meta.env?.BASE_URL ?? '/';

const byId = new Map(
  manifest.assets.map((asset) => [
    asset.id,
    { ...asset, url: `${BASE}assets/${asset.file}`.replace(/([^:])\/\//g, '$1/') },
  ]),
);

/** Public URL for an asset id, or null if it is not in the manifest. */
export function assetUrl(id) {
  return byId.get(id)?.url ?? null;
}

export function assetInfo(id) {
  return byId.get(id) ?? null;
}

export const assetIds = [...byId.keys()];
