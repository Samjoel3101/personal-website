import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/config/world.js';
import { buildShade, shadeAt } from '../src/world/shade.js';

/** A stand of trees around the origin, and nothing anywhere else. */
const stand = () =>
  new Map([
    [
      'pine',
      [
        { x: 0, z: 400, height: 70 },
        { x: 20, z: 420, height: 60 },
        { x: -15, z: 380, height: 80 },
      ],
    ],
  ]);

describe('canopy shade', () => {
  const shade = buildShade(stand());

  it('is deep under the trees and gone in the open', () => {
    expect(shadeAt(shade, 0, 400)).toBeGreaterThan(0.8);
    expect(shadeAt(shade, 300, 400)).toBe(0);
  });

  it('falls off with distance rather than stopping at an edge', () => {
    const near = shadeAt(shade, 25, 400);
    const middle = shadeAt(shade, 38, 400);
    const far = shadeAt(shade, 60, 400);
    expect(near).toBeGreaterThan(middle);
    expect(middle).toBeGreaterThanOrEqual(far);
  });

  it('stays inside zero and one', () => {
    const crowded = new Map([
      ['pine', Array.from({ length: 40 }, (_, i) => ({ x: i - 20, z: 400, height: 90 }))],
    ]);
    const dense = buildShade(crowded);
    expect(shadeAt(dense, 0, 400)).toBeLessThanOrEqual(1);
    expect(shadeAt(dense, 0, 400)).toBeGreaterThan(0.9);
  });

  it('answers outside the valley without reading past its buffer', () => {
    expect(shadeAt(shade, -99999, -99999)).toBe(0);
    expect(shadeAt(shade, 99999, WORLD.LENGTH * 3)).toBe(0);
  });

  it('shades nothing when nothing was planted', () => {
    const bare = buildShade(new Map([['pine', []]]));
    expect(shadeAt(bare, 0, 400)).toBe(0);
  });
});
