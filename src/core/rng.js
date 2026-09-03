/**
 * Deterministic pseudo-random numbers.
 *
 * The city is generated from a fixed seed so that it is byte-identical on
 * every visit and in every test run. Anything that calls Math.random during
 * generation makes the layout untestable and the screenshots unstable, so
 * nothing does.
 */

/** mulberry32: small, fast, and good enough for placing buildings. */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max). */
export const rangeFrom = (rng, min, max) => min + rng() * (max - min);

/** A uniformly chosen element of `items`. */
export const pickFrom = (rng, items) => items[Math.floor(rng() * items.length) % items.length];

/** True with probability `chance`. */
export const chanceFrom = (rng, chance) => rng() < chance;
