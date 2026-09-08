import { describe, expect, it } from 'vitest';
import { BIOMES, WORLD } from '../src/config/world.js';
import {
  BIOME_IDS,
  biomeWeights,
  blendValue,
  dominantBiome,
  journeyAt,
} from '../src/world/biome.js';

const sum = (weights) => BIOME_IDS.reduce((total, id) => total + weights[id], 0);

describe('the journey', () => {
  it('runs 0 to 1 from one end of the valley to the other', () => {
    // Not exactly 0 at z = 0: the boundary warp shifts the whole journey by a
    // few hundred units. What matters is that both ends are past their band's
    // anchor, so the forest starts as forest and the desert ends as desert.
    for (let x = -WORLD.HALF_WIDTH; x <= WORLD.HALF_WIDTH; x += 100) {
      expect(dominantBiome(biomeWeights(journeyAt(x, 0))).id).toBe('forest');
      expect(dominantBiome(biomeWeights(journeyAt(x, WORLD.LENGTH))).id).toBe('desert');
    }
  });

  it('advances whichever line across the valley you take', () => {
    for (const x of [-700, -250, 0, 250, 700]) {
      let previous = -1;
      for (let z = 0; z <= WORLD.LENGTH; z += 100) {
        const u = journeyAt(x, z);
        expect(u).toBeGreaterThanOrEqual(previous);
        previous = u;
      }
    }
  });

  it('bends the boundary off a straight line across the valley', () => {
    const samples = new Set();
    for (let x = -WORLD.HALF_WIDTH; x <= WORLD.HALF_WIDTH; x += 40) {
      samples.add(journeyAt(x, 2800).toFixed(3));
    }
    expect(samples.size).toBeGreaterThan(5);
  });
});

describe('biome weights', () => {
  it('always sum to one', () => {
    for (let u = 0; u <= 1.0001; u += 0.01) {
      expect(sum(biomeWeights(u))).toBeCloseTo(1, 10);
    }
  });

  it('give a band everything at its own anchor', () => {
    for (const biome of BIOMES) {
      expect(biomeWeights(biome.at)[biome.id]).toBeCloseTo(1, 6);
    }
  });

  it('never mix bands that are not neighbours', () => {
    for (let u = 0; u <= 1; u += 0.005) {
      const weights = biomeWeights(u);
      const active = BIOME_IDS.filter((id) => weights[id] > 1e-9);
      expect(active.length).toBeLessThanOrEqual(2);
      if (active.length === 2) {
        const gap = Math.abs(BIOME_IDS.indexOf(active[0]) - BIOME_IDS.indexOf(active[1]));
        expect(gap).toBe(1);
      }
    }
  });

  it('clamp outside the journey rather than falling off it', () => {
    expect(sum(biomeWeights(-3))).toBe(1);
    expect(biomeWeights(-3).forest).toBe(1);
    expect(biomeWeights(9).desert).toBe(1);
  });

  it('blend a per-band table', () => {
    const table = { forest: 100, woodland: 0, scrub: 0, desert: 0 };
    expect(blendValue(biomeWeights(0), table)).toBeCloseTo(100);
    expect(blendValue(biomeWeights(1), table)).toBeCloseTo(0);
    // A missing entry counts as zero rather than as NaN.
    expect(blendValue(biomeWeights(1), { forest: 5 })).toBe(0);
  });

  it('name the band with the most weight', () => {
    expect(dominantBiome(biomeWeights(0)).id).toBe('forest');
    expect(dominantBiome(biomeWeights(1)).id).toBe('desert');
    expect(dominantBiome(biomeWeights(0.5)).id).toBe('woodland');
  });
});
