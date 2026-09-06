import { BOOST_PAD, SURFACE, WORLD } from '../config/world.js';
import { blockIndexAt, blockKey, distanceToBlockCentre } from './grid.js';
import { buildPuddles, createPuddleSampler } from './puddles.js';
import { distanceAcrossTrack } from './track.js';

/**
 * What is under the kart at a given point.
 *
 * The first renderer rasterised the whole world into a 2048x2048 byte map and
 * sampled that. This computes the same answer analytically: the track is
 * defined by its distance to the nearest snaking centre line, so there is no
 * bitmap to build, no four megabytes to hold, and — the reason it matters — the
 * result is a pure function that a unit test can assert on without a canvas.
 *
 * The track wanders, so "distance to the nearest line" is now
 * distanceAcrossTrack rather than a distance to a grid line; everything else
 * about the classification is unchanged. Measuring across the axis is
 * deliberate and matches how the renderer lays the ribbon down — see
 * src/world/track.js.
 */

/** A boost pad sits on each track, at the midpoint of every block segment. */
function onBoostPad(x, z) {
  // trackOffsetAt is zero at every block midpoint, so a pad always lands
  // square on the track without being told where the track went.
  const acrossX = distanceAcrossTrack(x, z) <= BOOST_PAD.HALF_ACROSS;
  const alongZ = distanceToBlockCentre(z) <= BOOST_PAD.HALF_ALONG;
  if (acrossX && alongZ) return true;

  const acrossZ = distanceAcrossTrack(z, x) <= BOOST_PAD.HALF_ACROSS;
  const alongX = distanceToBlockCentre(x) <= BOOST_PAD.HALF_ALONG;
  return acrossZ && alongX;
}

/**
 * Builds a surface sampler.
 *
 * @param {Set<string>} paddockBlocks "bi,bj" keys whose block interiors are the
 *   packed service areas around a landmark rather than open meadow
 * @param {Array<{x, z, radius}>} puddles the one list, shared with the renderer
 */
export function createSurfaceSampler(paddockBlocks, puddles = buildPuddles()) {
  const vergeEdge = WORLD.ROAD_HALF + WORLD.WALK;
  const inPuddle = createPuddleSampler(puddles);

  return function surfaceAt(x, z) {
    const dx = distanceAcrossTrack(x, z);
    const dz = distanceAcrossTrack(z, x);

    if (dx <= WORLD.ROAD_HALF || dz <= WORLD.ROAD_HALF) {
      return onBoostPad(x, z) ? SURFACE.BOOST : SURFACE.TRACK;
    }
    if (dx <= vergeEdge || dz <= vergeEdge) return SURFACE.VERGE;

    // Puddles are kept clear of the track by construction, so this can only
    // ever fire out in the open — see src/world/puddles.js.
    if (inPuddle(x, z)) return SURFACE.MUD;

    const { bi, bj } = blockIndexAt(x, z);
    return paddockBlocks.has(blockKey(bi, bj)) ? SURFACE.PADDOCK : SURFACE.FIELD;
  };
}
