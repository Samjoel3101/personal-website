import { WORLD } from '../config/world.js';
import { heightAt, latticeHeightAt, slopeAt } from '../world/terrain.js';

/**
 * The ground the player can actually see, as one definition.
 *
 * src/world/terrain.js gives a smooth analytic field. The mesh draws that field
 * as flat facets, and those two are not the same surface — between lattice
 * lines they differ by several units. Every renderer module that puts something
 * on the ground has to agree on which of the two it means, or things sink,
 * float, and poke through each other. They all mean this one.
 *
 * Two numbers do the work:
 *
 *   FACET is the mesh's cell size, and the resolution the surface is drawn at.
 *   FLAT_MARGIN is a facet's diagonal — how far past the flat corridor the
 *   field has to be held at zero so that no facet touching the corridor can
 *   interpolate above it. Without it a facet with one corner on the hillside
 *   tilts up through the flat track ribbons laid at y = 0.
 */

/** Cells across one world tile. 16-unit facets, ~33k triangles. */
export const TERRAIN_CELLS = 128;

export const FACET = WORLD.SIZE / TERRAIN_CELLS;

const FLAT_MARGIN = FACET * Math.SQRT2;

/** What the mesh samples at each lattice vertex. */
export const meshHeightAt = (x, z) => heightAt(x, z, FLAT_MARGIN);

/** Where the drawn ground is under any point, between lattice lines included. */
export const surfaceHeightAt = (x, z) => latticeHeightAt(x, z, FACET, FLAT_MARGIN);

/**
 * The slope of the same field, sampled a facet apart.
 *
 * Deliberately the analytic gradient rather than the facet's own: it is what
 * makes the mesh shade as one smooth hillside instead of 33,000 flat plates,
 * and what keeps the kart's tilt from stepping as it crosses a facet edge.
 */
export const surfaceSlopeAt = (x, z, epsilon = FACET) => slopeAt(x, z, epsilon, FLAT_MARGIN);
