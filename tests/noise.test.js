import { describe, expect, it } from 'vitest';
import { fbm, hash2, noise2, ridged } from '../src/core/noise.js';

/**
 * The landscape is a pure function of position, and these are the properties
 * that has to have: the same input gives the same output forever, the output
 * stays in range, and the field is continuous — a discontinuity in the noise
 * is a cliff in the terrain and a tear in the mesh.
 */
describe('noise', () => {
  it('hashes deterministically into 0..1', () => {
    expect(hash2(3, 9, 1)).toBe(hash2(3, 9, 1));
    expect(hash2(3, 9, 1)).not.toBe(hash2(3, 9, 2));
    for (let i = 0; i < 500; i += 1) {
      const value = hash2(i, i * 7, 5);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('stays inside [-1, 1]', () => {
    for (let i = 0; i < 2000; i += 1) {
      const x = i * 0.37;
      const z = i * -0.21;
      expect(Math.abs(noise2(x, z, 3))).toBeLessThanOrEqual(1);
      expect(Math.abs(fbm(x, z, { octaves: 5 }))).toBeLessThanOrEqual(1);
      const crest = ridged(x, z);
      expect(crest).toBeGreaterThanOrEqual(0);
      expect(crest).toBeLessThanOrEqual(1);
    }
  });

  it('is continuous across a lattice line', () => {
    const before = noise2(3 - 1e-6, 2.4, 1);
    const after = noise2(3 + 1e-6, 2.4, 1);
    expect(Math.abs(after - before)).toBeLessThan(1e-4);
  });

  it('actually varies', () => {
    const samples = new Set();
    for (let i = 0; i < 50; i += 1) samples.add(fbm(i * 0.7, i * 1.3, { seed: 2 }).toFixed(6));
    expect(samples.size).toBeGreaterThan(40);
  });
});
