import { damp } from '../core/math.js';
import { heightAt, slopeAt } from '../world/terrain.js';

/**
 * How things sit on the terrain: a damped read for things that move, and a
 * one-shot seat for things that are placed once at build time.
 *
 * THE HEIGHT IS COSMETIC. The simulation is two-dimensional and stays that way
 * — src/physics never reads src/world/terrain.js, and nothing here feeds back
 * into it. This exists so the kart looks like it is on the ground it is driving
 * over, and so the chase camera rises with it instead of burrowing into a hill.
 *
 * The damping is what makes the moving case usable. Sampling raw height per
 * frame at 250 units per second puts a 16-unit facet edge straight into the
 * camera as a jolt; approaching it exponentially turns the same facets into
 * suspension.
 */
export function createGroundFollow(lambda) {
  let height = 0;

  return {
    get height() {
      return height;
    },

    /** @returns {number} the damped ground height under (x, z) */
    update(x, z, dt) {
      height = damp(height, heightAt(x, z), lambda, dt);
      return height;
    },
  };
}

/**
 * Where the base of a box-shaped thing should sit.
 *
 * A footprint is flat and the ground is not, so seating it at the height of
 * its own centre floats its downhill corners. Sinking it by how far the ground
 * falls across its own half-extents buries the uphill side instead, which is
 * what a barn dropped on a hillside actually looks like.
 */
export function seatOnGround(x, z, halfWidth = 0, halfDepth = 0) {
  const height = heightAt(x, z);
  if (halfWidth === 0 && halfDepth === 0) return height;

  const gradient = slopeAt(x, z, 8);
  const drop = Math.abs(gradient.dx) * halfWidth + Math.abs(gradient.dz) * halfDepth;
  return height - drop - 1;
}
