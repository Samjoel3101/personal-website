import { describe, expect, it } from 'vitest';
import { chanceFrom, createRng, pickFrom, rangeFrom } from '../src/core/rng.js';

/**
 * The city is generated from a seed, and screenshot tests and layout
 * assertions depend on that being genuinely reproducible.
 */
describe('seeded random numbers', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(1234);
    const b = createRng(1234);
    const first = Array.from({ length: 50 }, () => a());
    const second = Array.from({ length: 50 }, () => b());
    expect(first).toEqual(second);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it('stays inside [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 5000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('picks within range and from the given list', () => {
    const rng = createRng(7);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 200; i += 1) {
      const value = rangeFrom(rng, 10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(20);
      expect(items).toContain(pickFrom(rng, items));
      expect(typeof chanceFrom(rng, 0.5)).toBe('boolean');
    }
  });
});
