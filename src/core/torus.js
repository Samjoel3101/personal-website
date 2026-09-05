import { WORLD } from '../config/world.js';

/**
 * The stage wraps in both axes, so it has no edges and no invisible walls: you
 * cannot get permanently lost, and the renderer never has to fake a boundary.
 *
 * The cost is that no two positions can be compared directly. Every distance
 * and difference has to be taken the short way round, which is what these
 * helpers exist to guarantee. Subtracting two coordinates anywhere else in the
 * codebase is a bug.
 */

/** Fold a coordinate into [0, SIZE). */
export const wrap = (value) => ((value % WORLD.SIZE) + WORLD.SIZE) % WORLD.SIZE;

/** The shortest signed difference between two coordinates, in [-SIZE/2, SIZE/2). */
export function wrapDelta(difference) {
  const folded = wrap(difference);
  return folded > WORLD.SIZE / 2 ? folded - WORLD.SIZE : folded;
}

/** Shortest distance between two points across the torus. */
export function wrapDistance(ax, az, bx, bz) {
  return Math.hypot(wrapDelta(ax - bx), wrapDelta(az - bz));
}

/** Squared shortest distance, for comparisons that do not need the root. */
export function wrapDistanceSquared(ax, az, bx, bz) {
  const dx = wrapDelta(ax - bx);
  const dz = wrapDelta(az - bz);
  return dx * dx + dz * dz;
}
