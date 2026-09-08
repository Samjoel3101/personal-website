/**
 * Deterministic value noise, and the two fields built on it.
 *
 * Everything about the landscape — its hills, its dunes, where the biome
 * boundary wanders — is a pure function of position, with no state and no
 * Math.random anywhere. That is what lets the terrain be unit-tested in Node,
 * lets the same seed give the same valley on every visit, and lets the
 * renderer sample the ground at a point without asking anyone to remember it.
 *
 * Value noise rather than Perlin or simplex on purpose: it is a dozen lines,
 * it has no patent history, and at the scales used here the difference is
 * invisible under flat shading.
 */
import { lerp } from './math.js';

/** Integer hash → float in [0, 1). Two coordinates and a seed. */
export function hash2(x, y, seed = 0) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Quintic fade: continuous in the first and second derivative, so the field
 *  has no visible lattice creases where cells meet. */
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** Value noise in [-1, 1] at lattice spacing 1. */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = fade(x - xi);
  const ty = fade(y - yi);

  const top = lerp(hash2(xi, yi, seed), hash2(xi + 1, yi, seed), tx);
  const bottom = lerp(hash2(xi, yi + 1, seed), hash2(xi + 1, yi + 1, seed), tx);
  return lerp(top, bottom, ty) * 2 - 1;
}

/**
 * Fractal sum of `octaves` noise fields, each twice the frequency and half the
 * amplitude of the last. Normalised so the result stays in [-1, 1] whatever
 * the octave count.
 */
export function fbm(x, y, { octaves = 4, seed = 0, lacunarity = 2, gain = 0.5 } = {}) {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let total = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    sum += noise2(x * frequency, y * frequency, seed + octave * 101) * amplitude;
    total += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / total;
}

/**
 * Ridged noise: the absolute value of the field, inverted, so the peaks become
 * sharp crests and the troughs become broad flats. That is the shape of a dune
 * field, and it is why the desert does not look like the forest repainted.
 * Returns [0, 1].
 */
export function ridged(x, y, options = {}) {
  const value = 1 - Math.abs(fbm(x, y, { octaves: 3, ...options }));
  return value * value;
}
