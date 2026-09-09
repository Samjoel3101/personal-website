import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateAsset, validateManifest } from '../scripts/validate-manifest.mjs';
import { SPECIES } from '../src/config/flora.js';

const manifest = JSON.parse(readFileSync(new URL('../assets/manifest.json', import.meta.url)));

/**
 * The manifest is the only place a third-party file can enter this project, so
 * it is the only place licensing has to be enforced. These run in `npm test` as
 * well as in `npm run assets:verify`, so an unlicensed addition fails fast.
 */
describe('asset manifest', () => {
  it('is valid', () => {
    expect(validateManifest(manifest)).toEqual([]);
  });

  it('refuses a licence outside the allow-list', () => {
    const problems = validateAsset(manifest, { ...manifest.assets[0], license: 'GPL-3.0' });
    expect(problems.join()).toMatch(/not in the allow-list/);
  });

  it('demands attribution where the licence requires it', () => {
    const problems = validateAsset(manifest, {
      ...manifest.assets[0],
      license: 'CC-BY-4.0',
      author: undefined,
    });
    expect(problems.join()).toMatch(/requires "author" and "title"/);
  });

  it('refuses a file path that escapes the asset directory', () => {
    const problems = validateAsset(manifest, { ...manifest.assets[0], file: '../../etc/passwd' });
    expect(problems.join()).toMatch(/must stay inside public\/assets/);
  });

  it('gives every asset a role, so nothing is downloaded by accident', () => {
    for (const asset of manifest.assets) expect(asset.role).toBeTruthy();
  });

  it('backs every model a species names with a manifest entry', () => {
    const ids = new Set(manifest.assets.map((asset) => asset.id));
    for (const species of SPECIES) {
      // A species' `assets` is a list of choices, best first, and a choice may
      // itself be a list of interchangeable variants. Both shapes flatten to
      // the same question: is every id something we could actually fetch?
      for (const id of (species.assets ?? []).flat()) {
        expect(ids, `species ${species.id}`).toContain(id);
      }
    }
  });

  it('never names the same model twice within one species', () => {
    // Two variants pointing at the same file is a silent way to weight one
    // silhouette double, and it looks exactly like variety in the table.
    for (const species of SPECIES) {
      for (const choice of species.assets ?? []) {
        const ids = Array.isArray(choice) ? choice : [choice];
        expect(new Set(ids).size, `species ${species.id}`).toBe(ids.length);
      }
    }
  });

  it('tells a human how to install anything it cannot fetch', () => {
    // No local entries today — everything is reachable through the mirror —
    // but the rules that make one honest are still enforced, because the day
    // one is added is the day they matter.
    const local = { ...manifest.assets[0], provenance: 'local', url: undefined };
    expect(validateAsset(manifest, local).join()).toMatch(/needs "install"/);
    expect(validateAsset(manifest, { ...local, install: 'download it' })).toEqual([]);
    expect(validateAsset(manifest, { ...local, install: 'x', url: 'http://a' }).join()).toMatch(
      /must not carry a "url"/,
    );

    for (const asset of manifest.assets) {
      if (asset.provenance !== 'local') continue;
      expect(asset.install, `asset ${asset.id}`).toMatch(/assets:link|public\/assets/);
      expect(asset.url ?? null).toBeNull();
    }
  });

  it('pins every fetched model to a commit, never a branch', () => {
    for (const asset of manifest.assets) {
      if (!asset.url?.includes('raw.githubusercontent.com')) continue;
      const [, ref] = asset.url.split('raw.githubusercontent.com/')[1].split(/\/(?=[^/]*$)/);
      expect(asset.url, `asset ${asset.id}`).toMatch(/\/[0-9a-f]{40}\//);
      expect(ref).toBeTruthy();
    }
  });

  it('keeps every asset optional, which is what rule 4 means', () => {
    for (const asset of manifest.assets) expect(asset.required).toBe(false);
  });
});
