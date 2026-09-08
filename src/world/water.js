import { BASIN_FALLOFF, POOLS } from '../config/world.js';
import { smoothstep } from '../core/math.js';

/**
 * Standing water: one forest pond and one desert oasis.
 *
 * Both are declared in config/world.js and read from here by three different
 * consumers — the terrain carves a basin for them, the planting refuses to
 * grow inside them and crowds reeds and palms around them, and the renderer
 * draws a surface at their level. Keeping the geometry of a pool in one place
 * is what stops those three drifting apart and leaving a palm standing in
 * open water.
 */

/**
 * How strongly the terrain is pulled toward a pool's basin, 0..1.
 *
 * Note where the ramp starts: the pull is total out to a little past the
 * waterline and only then releases. A pool whose carve was already fading at
 * its own edge gets a ragged shoreline where the drawn surface floats over
 * high ground on one side and sinks under low ground on the other.
 */
export function basinFactor(x, z) {
  let strongest = 0;
  let pool = null;
  for (const candidate of POOLS) {
    const distance = Math.hypot(x - candidate.x, z - candidate.z);
    const factor = smoothstep(candidate.radius * BASIN_FALLOFF, candidate.radius * 1.15, distance);
    if (factor > strongest) {
      strongest = factor;
      pool = candidate;
    }
  }
  return { factor: strongest, pool };
}

/**
 * The height the terrain is pulled toward, given the pool's own surface level.
 *
 * Inside the outline it falls away to `depth`; outside it climbs to `bank`.
 * That rising ring is not decoration: without it the carve merely drags the
 * surrounding land toward the water line, and every natural dip within reach
 * of the falloff fills up with a satellite puddle.
 */
export function basinTarget(pool, level, x, z) {
  const distance = Math.hypot(x - pool.x, z - pool.z);
  if (distance < pool.radius) {
    return level - pool.depth * (1 - distance / pool.radius);
  }
  return level + pool.bank * smoothstep(pool.radius, pool.radius * BASIN_FALLOFF, distance);
}

/** True inside a pool's outline, where the drawn surface covers the ground. */
export const isSubmerged = (x, z) => {
  const pool = nearestPool(x, z);
  return pool !== null && Math.hypot(x - pool.x, z - pool.z) < pool.radius;
};

/**
 * How much this point counts as shoreline, 0..1 — peaking in the band just
 * outside the waterline and falling away both into the pool and inland. Reeds
 * and palms are weighted by it, which is what draws the eye to the water.
 */
export function bankFactor(x, z) {
  let best = 0;
  for (const pool of POOLS) {
    const distance = Math.hypot(x - pool.x, z - pool.z);
    const rising = smoothstep(pool.radius * 0.75, pool.radius, distance);
    const falling = 1 - smoothstep(pool.radius, pool.radius * 1.55, distance);
    best = Math.max(best, rising * falling);
  }
  return best;
}

/** The pool whose basin reaches this point, or null. */
export function nearestPool(x, z) {
  for (const pool of POOLS) {
    if (Math.hypot(x - pool.x, z - pool.z) <= pool.radius * BASIN_FALLOFF) return pool;
  }
  return null;
}

export { POOLS };
