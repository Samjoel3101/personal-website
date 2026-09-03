import { BOOST_PAD, SURFACE, WORLD } from '../config/world.js';
import { wrapDelta } from '../core/torus.js';

/**
 * What is under the kart at a given point.
 *
 * The previous renderer rasterised the whole city into a 2048x2048 byte map
 * and sampled that. This computes the same answer analytically: a road is
 * defined by its distance to the nearest grid line, so there is no bitmap to
 * build, no four megabytes to hold, and — the reason it matters — the result
 * is a pure function that a unit test can assert on without a canvas.
 */

/** Distance from a coordinate to the nearest road centre line. */
export function distanceToRoadLine(coord) {
  const nearest = Math.round(coord / WORLD.BLOCK) * WORLD.BLOCK;
  return Math.abs(wrapDelta(coord - nearest));
}

/** Distance from a coordinate to the nearest block centre. */
export function distanceToBlockCentre(coord) {
  const half = WORLD.BLOCK / 2;
  const nearest = Math.round((coord - half) / WORLD.BLOCK) * WORLD.BLOCK + half;
  return Math.abs(wrapDelta(coord - nearest));
}

/** Which block a point falls in, as integer indices. */
export function blockIndexAt(x, z) {
  const size = WORLD.SIZE;
  const fold = (v) => ((Math.floor(v / WORLD.BLOCK) % WORLD.GRID) + WORLD.GRID) % WORLD.GRID;
  return { bi: fold(((x % size) + size) % size), bj: fold(((z % size) + size) % size) };
}

/** A boost pad sits on each road, at the midpoint of every block segment. */
function onBoostPad(x, z) {
  const acrossX = distanceToRoadLine(x) <= BOOST_PAD.HALF_ACROSS;
  const alongZ = distanceToBlockCentre(z) <= BOOST_PAD.HALF_ALONG;
  if (acrossX && alongZ) return true;

  const acrossZ = distanceToRoadLine(z) <= BOOST_PAD.HALF_ACROSS;
  const alongX = distanceToBlockCentre(x) <= BOOST_PAD.HALF_ALONG;
  return acrossZ && alongX;
}

/**
 * Builds a surface sampler. `plazaBlocks` is a Set of "bi,bj" keys whose block
 * interiors are paved rather than rough ground — the landmark blocks.
 */
export function createSurfaceSampler(plazaBlocks) {
  const walkEdge = WORLD.ROAD_HALF + WORLD.WALK;

  return function surfaceAt(x, z) {
    const dx = distanceToRoadLine(x);
    const dz = distanceToRoadLine(z);

    if (dx <= WORLD.ROAD_HALF || dz <= WORLD.ROAD_HALF) {
      return onBoostPad(x, z) ? SURFACE.BOOST : SURFACE.ROAD;
    }
    if (dx <= walkEdge || dz <= walkEdge) return SURFACE.WALK;

    const { bi, bj } = blockIndexAt(x, z);
    return plazaBlocks.has(`${bi},${bj}`) ? SURFACE.PLAZA : SURFACE.GRASS;
  };
}
