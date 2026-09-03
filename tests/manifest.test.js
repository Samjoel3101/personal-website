import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateAsset, validateManifest } from '../scripts/validate-manifest.mjs';

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
});
