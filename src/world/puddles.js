import { WORLD } from '../config/world.js';
import { createRng, rangeFrom } from '../core/rng.js';
import { wrapDistance } from '../core/torus.js';
import { blockIndexAt, blockKey } from './grid.js';
import { paddockBlockKeys } from './landmarks.js';
import { distanceToTrack } from './track.js';

/**
 * Standing water, as a seeded list of discs.
 *
 * ONE SOURCE OF TRUTH. src/world/surfaces.js reads this to hand back
 * SURFACE.MUD, and src/render/builders/puddles.js reads the same list to lay
 * the dark wet patches. Two lists would drift, and the drift would show up as
 * water you can see but not feel — or worse, grip you lose with nothing on
 * screen to explain it.
 *
 * They are kept clear of the track by CLEARANCE. A puddle across the racing
 * line would be a grip bug rather than a feature: you would lose the back end
 * on a straight with no warning and no way to read it.
 */

const PUDDLE_SEED = 0xd12b7;
const COUNT = 40;

/** No puddle comes closer than this to a track centre line. */
export const CLEARANCE = WORLD.ROAD_HALF + WORLD.WALK + 8;
/** Nor sits further out than this — a puddle nobody can reach is scenery. */
const MAX_FROM_TRACK = 190;

const MIN_RADIUS = 11;
const MAX_RADIUS = 30;

/**
 * @returns {Array<{x: number, z: number, radius: number}>} deterministic for a
 *   given seed, and identical on every call
 */
export function buildPuddles(seed = PUDDLE_SEED) {
  const rng = createRng(seed);
  const puddles = [];

  // Rejection sampling. The valid band is a thin ribbon either side of a
  // snaking track, which has no closed-form parametrisation worth writing when
  // a few hundred rejected candidates cost nothing at build time.
  for (let attempt = 0; attempt < 4000 && puddles.length < COUNT; attempt += 1) {
    const x = rng() * WORLD.SIZE;
    const z = rng() * WORLD.SIZE;
    const radius = rangeFrom(rng, MIN_RADIUS, MAX_RADIUS);
    const gap = distanceToTrack(x, z);

    if (gap - radius < CLEARANCE) continue;
    if (gap > MAX_FROM_TRACK) continue;
    if (inLandmarkBlock(x, z)) continue;
    if (overlapsExisting(puddles, x, z, radius)) continue;

    puddles.push({ x, z, radius });
  }

  return puddles;
}

/** Landmark blocks are the service paddocks; keep the approach to them dry. */
function inLandmarkBlock(x, z) {
  const { bi, bj } = blockIndexAt(x, z);
  return paddockBlockKeys.has(blockKey(bi, bj));
}

function overlapsExisting(puddles, x, z, radius) {
  return puddles.some((other) => wrapDistance(x, z, other.x, other.z) < radius + other.radius + 12);
}

/** Builds a sampler: true when (x, z) is in standing water. */
export function createPuddleSampler(puddles) {
  return function inPuddle(x, z) {
    for (const puddle of puddles) {
      if (wrapDistance(x, z, puddle.x, puddle.z) <= puddle.radius) return true;
    }
    return false;
  };
}
