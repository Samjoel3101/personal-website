import { LOT_HALF, WORLD } from '../config/world.js';
import { LANDMARKS } from '../content/resume.js';
import { wrapDelta } from '../core/torus.js';
import { distanceToTrack } from './track.js';

/**
 * Rolling ground, as a pure function of position.
 *
 * THIS IS VISUAL ONLY. Nothing in src/physics reads it: collision, discovery
 * and surface sampling stay strictly two-dimensional, exactly as they were when
 * the world was flat. The renderer lifts the kart, the camera and the scenery
 * onto this field; the simulation never learns it exists. That is deliberate —
 * a kart whose handling depended on a heightfield would need a whole gravity
 * model, and the arcade feel this game wants does not survive one.
 *
 * The field has two properties everything else depends on:
 *
 *   1. It is seamless. The lattice cell sizes divide WORLD.SIZE and the lattice
 *      index wraps, so heightAt(x, z) === heightAt(x + WORLD.SIZE, z). Anything
 *      else would put a cliff along the torus seam.
 *   2. It is exactly zero where you drive — along the track corridor and inside
 *      every landmark paddock — and ramps up over the next stretch of ground.
 *      Flat where you drive, hills where you look.
 */

/** Fixed seed: the same hills on every visit and in every CI run. */
const TERRAIN_SEED = 0x5eed01;

/**
 * Two octaves of value noise. Both cell sizes divide WORLD.SIZE, which is what
 * makes the lattice wrap; change one to a size that does not and the seam comes
 * back.
 */
const OCTAVES = Object.freeze([
  { cell: 256, amplitude: 18, salt: 0 },
  { cell: 128, amplitude: 8, salt: 8191 },
]);

/** Tallest the ground can get, for tests and for the renderer's colour ramp. */
export const MAX_TERRAIN_HEIGHT = OCTAVES.reduce((sum, o) => sum + o.amplitude, 0);

/** Ground stays dead flat out to here, measured from the track centre line. */
const FLAT_HALF_WIDTH = WORLD.ROAD_HALF + WORLD.WALK;
/** And then climbs to full height over this distance. */
const CORRIDOR_RAMP = 70;

/** Integer hash → [0, 1). Deterministic, and cheap enough to call per vertex. */
function latticeValue(ix, iz, salt) {
  let h = Math.imul(ix ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul(iz ^ salt, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Hermite fade. C1-continuous, so no facet edge shows at a lattice boundary. */
const fade = (t) => t * t * (3 - 2 * t);

const mix = (a, b, t) => a + (b - a) * t;

/**
 * One octave of value noise on a wrapping lattice.
 *
 * `cell` must divide WORLD.SIZE and the resulting cell count must be a power of
 * two, because the wrap is a bitmask — which is also what makes it correct for
 * negative indices, where a modulo would not be.
 */
function valueNoise(x, z, { cell, salt }) {
  const mask = WORLD.SIZE / cell - 1;
  const gx = x / cell;
  const gz = z / cell;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const u = fade(gx - ix);
  const v = fade(gz - iz);

  const x0 = ix & mask;
  const x1 = (ix + 1) & mask;
  const z0 = iz & mask;
  const z1 = (iz + 1) & mask;

  const top = mix(latticeValue(x0, z0, salt), latticeValue(x1, z0, salt), u);
  const bottom = mix(latticeValue(x0, z1, salt), latticeValue(x1, z1, salt), u);
  return mix(top, bottom, v);
}

/** 0 at or below `flatTo`, 1 beyond `flatTo + CORRIDOR_RAMP`, smooth between. */
function ramp(distance, flatTo) {
  const t = (distance - flatTo) / CORRIDOR_RAMP;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return fade(t);
}

/**
 * How much of the noise survives here. Zero anywhere the kart is meant to be
 * able to drive without the ground moving under it.
 */
function corridorMask(x, z) {
  let mask = ramp(distanceToTrack(x, z), FLAT_HALF_WIDTH);
  if (mask === 0) return 0;

  for (const landmark of LANDMARKS) {
    // Chebyshev distance: the paddock is a square block interior, not a disc.
    const inset = Math.max(
      Math.abs(wrapDelta(x - landmark.x)),
      Math.abs(wrapDelta(z - landmark.z)),
    );
    mask = Math.min(mask, ramp(inset, LOT_HALF));
    if (mask === 0) return 0;
  }
  return mask;
}

/** Ground height in world units, 0 .. MAX_TERRAIN_HEIGHT. */
export function heightAt(x, z) {
  const mask = corridorMask(x, z);
  if (mask === 0) return 0;

  let height = 0;
  for (const octave of OCTAVES) {
    height += valueNoise(x + TERRAIN_SEED, z + TERRAIN_SEED, octave) * octave.amplitude;
  }
  return height * mask;
}

/** Central-difference gradient: how steeply the ground rises along each axis. */
export function slopeAt(x, z, epsilon = 6) {
  return {
    dx: (heightAt(x + epsilon, z) - heightAt(x - epsilon, z)) / (2 * epsilon),
    dz: (heightAt(x, z + epsilon) - heightAt(x, z - epsilon)) / (2 * epsilon),
  };
}
