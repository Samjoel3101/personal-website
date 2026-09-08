import { describe, expect, it } from 'vitest';
import { GROUND, ROCK, WATER } from '../src/config/palette.js';
import { WORLD } from '../src/config/world.js';
import { POOLS } from '../src/world/water.js';
import { groundColour } from '../src/world/ground.js';
import { parseHex } from '../src/core/colour.js';

const green = (hex) => {
  const { r, g, b } = parseHex(hex);
  return g - (r + b) / 2;
};
const warmth = (hex) => {
  const { r, b } = parseHex(hex);
  return r - b;
};

describe('ground colour', () => {
  it('always returns a colour', () => {
    for (let z = 0; z <= WORLD.LENGTH; z += 200) {
      for (const x of [-600, 0, 600]) {
        expect(groundColour(x, z, 0.1)).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('drains the green out of the ground along the journey', () => {
    // Measured against the scrub and the desert rather than pairwise down the
    // whole journey: the woodland is a lighter, yellower green than the
    // forest, which is the point of it, and reads as *more* green by any
    // simple channel measure even though it is on the way out.
    const forest = green(groundColour(0, 200, 0.05));
    const scrub = green(groundColour(0, 4000, 0.05));
    const desert = green(groundColour(0, 5400, 0.05));
    expect(forest).toBeGreaterThan(scrub);
    expect(scrub).toBeGreaterThan(desert);
  });

  it('warms it up as it goes', () => {
    expect(warmth(groundColour(0, 5400, 0.05))).toBeGreaterThan(warmth(groundColour(0, 200, 0.05)));
  });

  it('bares the rock on anything steep', () => {
    const flat = groundColour(0, 1000, 0);
    const cliff = groundColour(0, 1000, 1.4);
    expect(cliff).not.toBe(flat);
    expect(green(cliff)).toBeLessThan(green(flat));
    // A cliff in the forest is grey rock, not sand.
    expect(warmth(cliff)).toBeLessThan(warmth(ROCK.WARM));
  });

  it('bleaches the shoreline of every pool toward wet sand', () => {
    const toBank = (hex) => {
      const colour = parseHex(hex);
      const sand = parseHex(WATER.BANK);
      return Math.hypot(colour.r - sand.r, colour.g - sand.g, colour.b - sand.b);
    };
    for (const pool of POOLS) {
      const bank = groundColour(pool.x + pool.radius * 1.05, pool.z, 0.1);
      const inland = groundColour(pool.x + pool.radius * 4, pool.z, 0.1);
      expect(toBank(bank), `pool ${pool.id}`).toBeLessThan(toBank(inland));
    }
  });

  it('is built from the palette it was given', () => {
    // Deep forest, dead flat, nowhere near water: the flat forest tone, give
    // or take the mottling.
    const flat = parseHex(groundColour(0, 150, 0));
    const expected = parseHex(GROUND.forest.flat);
    expect(Math.abs(flat.g - expected.g)).toBeLessThan(40);
  });
});
