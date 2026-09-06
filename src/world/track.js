import { TRACK, WORLD } from '../config/world.js';
import { wrapDelta } from '../core/torus.js';

/**
 * The shape of the track.
 *
 * There are still GRID track lines down each axis, but each one snakes: the
 * line nominally at x = g * BLOCK actually runs at x = g * BLOCK +
 * trackOffsetAt(z). One sine, one period per block.
 *
 * Why that shape and not a spline: sin(2π * along / BLOCK) is zero at every
 * multiple of BLOCK / 2, which is every junction AND every block midpoint. So
 * the track passes dead through the junctions where two tracks cross, and dead
 * through the midpoints where the boost pads sit, with nothing special-cased.
 * The period divides WORLD.SIZE, so it is continuous across the torus seam. And
 * it stays a closed form, which is what lets distanceToTrack be O(1) and lets a
 * unit test pin it — the same property that made surfaces.js analytic in the
 * first place.
 */

const PERIOD = (Math.PI * 2) / WORLD.BLOCK;

/** How far the track has wandered from its grid line at this point along it. */
export function trackOffsetAt(along) {
  return TRACK.WOBBLE * Math.sin(along * PERIOD);
}

/** d(offset)/d(along): the track's gradient, for orienting props and ribbons. */
export function trackSlopeAt(along) {
  return TRACK.WOBBLE * PERIOD * Math.cos(along * PERIOD);
}

/**
 * How far `across` sits from the nearest track centre line, measured along the
 * axis that crosses it.
 *
 * Measured across the axis rather than perpendicular to the curve on purpose:
 * that is exactly how the ribbon in src/render/geometry/ribbon.js lays the
 * track down, so the surface the physics reads and the surface you can see are
 * the same surface. A perpendicular measure would drift from the picture by up
 * to a fifth of the width on the diagonals.
 *
 * @param {number} across the coordinate that crosses the track
 * @param {number} along  the coordinate that runs down it
 */
export function distanceAcrossTrack(across, along) {
  const centre = trackOffsetAt(along);
  const nearest = Math.round(wrapDelta(across - centre) / WORLD.BLOCK) * WORLD.BLOCK + centre;
  return Math.abs(wrapDelta(across - nearest));
}

/** Distance to the nearest track centre line of either family. */
export function distanceToTrack(x, z) {
  return Math.min(distanceAcrossTrack(x, z), distanceAcrossTrack(z, x));
}
