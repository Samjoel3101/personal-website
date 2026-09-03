import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/config/world.js';
import { wrap, wrapDelta, wrapDistance } from '../src/core/torus.js';

/**
 * The wrapping helpers are the foundation the whole world model stands on:
 * every position comparison in the codebase goes through them. A bug here is
 * a bug in collision, discovery, the compass and the minimap at once.
 */
describe('torus wrapping', () => {
  it('folds coordinates into the world', () => {
    expect(wrap(0)).toBe(0);
    expect(wrap(WORLD.SIZE)).toBe(0);
    expect(wrap(WORLD.SIZE + 10)).toBe(10);
    expect(wrap(-10)).toBe(WORLD.SIZE - 10);
    expect(wrap(-WORLD.SIZE * 3 - 5)).toBe(WORLD.SIZE - 5);
  });

  it('takes differences the short way round', () => {
    expect(wrapDelta(10)).toBe(10);
    expect(wrapDelta(-10)).toBe(-10);
    // Across the seam: 10 and SIZE-10 are 20 apart, not SIZE-20.
    expect(wrapDelta(10 - (WORLD.SIZE - 10))).toBe(20);
    expect(wrapDelta(WORLD.SIZE - 10 - 10)).toBe(-20);
  });

  it('never returns a difference longer than half the world', () => {
    for (let value = -3000; value <= 3000; value += 7) {
      expect(Math.abs(wrapDelta(value))).toBeLessThanOrEqual(WORLD.SIZE / 2);
    }
  });

  it('measures distance across the seam', () => {
    const near = wrapDistance(5, 5, WORLD.SIZE - 5, WORLD.SIZE - 5);
    expect(near).toBeCloseTo(Math.hypot(10, 10), 6);
  });

  it('is symmetric', () => {
    expect(wrapDistance(100, 200, 1900, 1700)).toBeCloseTo(wrapDistance(1900, 1700, 100, 200), 6);
  });
});
