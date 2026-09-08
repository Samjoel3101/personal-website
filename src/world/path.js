import { PATH, WORLD } from '../config/world.js';
import { clamp, smoothstep } from '../core/math.js';
import { noise2 } from '../core/noise.js';

/**
 * The trail through the valley.
 *
 * A single centre line, a function of z alone, that every other part of the
 * world reads: the terrain levels its cross-slope and wears it down a little,
 * the ground turns to bare earth on it, the planting refuses to grow on it and
 * crowds flowers along its edge, and the camera walks it.
 *
 * A function of z alone is a real constraint and worth stating: it means the
 * trail can never double back or fork, which a wandering path in a real forest
 * would. What it buys is that every one of those consumers can ask "how far am
 * I from the trail?" in a few operations, with no curve to search along and no
 * arc-length parameterisation to keep in step — and at the density this scene
 * plants at, that question is asked a hundred thousand times at load.
 *
 * The wander is two sines of incommensurable period plus a little noise. One
 * sine is a slalom, and a pure noise field doubles back on itself; two sines
 * and a nudge reads as a path that is going somewhere.
 */
export function pathCentre(z) {
  const swing =
    Math.sin(z * PATH.WANDER_SCALE * Math.PI * 2) * 0.62 +
    Math.sin(z * PATH.WANDER_SCALE_2 * Math.PI * 2 + 1.7) * 0.2 +
    noise2(z * 0.0009, 7.3, 0x9a1) * 0.24;

  // Clamped well inside the valley walls: the trail climbing a hillside it
  // then has to level out is how you get a shelf cut into a cliff.
  return clamp(swing * PATH.WANDER, -WORLD.HALF_WIDTH * 0.55, WORLD.HALF_WIDTH * 0.55);
}

/** Lateral distance to the centre line. */
export const distanceToPath = (x, z) => Math.abs(x - pathCentre(z));

/**
 * How much this point is trail, 0..1. One on the bare earth, falling to zero
 * across the verge.
 *
 * `clearance` widens the whole band outward without moving the earth itself.
 * That is what a tree uses: nothing may grow on the path, but a trunk needs to
 * keep further back than a tuft of grass — at eye level a trunk planted at the
 * very edge of the trail swallows half the frame as you walk past it, which is
 * exactly what the first version of this did.
 */
export const pathFactor = (x, z, clearance = 0) =>
  1 -
  smoothstep(
    PATH.HALF_WIDTH + clearance,
    PATH.HALF_WIDTH + PATH.VERGE + clearance,
    distanceToPath(x, z),
  );

/**
 * How much this point is the trail's edge, 0..1 — peaking just outside the
 * earth and fading off into the undergrowth.
 *
 * This is where the flowers go, and it deliberately reaches much further than
 * the verge that keeps the ground clear. The two bands do opposite jobs: the
 * clear band has to be tight, or the path sits in a mown strip of bare earth,
 * while the planting bias has to be wide, or there are not enough flowers in
 * it to line a kilometre of trail. One band cannot be both.
 */
/**
 * The scuffed band the earth colour bleeds into, 0..1.
 *
 * Deliberately its own function rather than the planting's verge. The two were
 * the same thing once, and widening the verge to get enough flowers along the
 * trail widened the *paint* with it — which turned a footpath into a
 * forty-unit clearing of bare ground with flowers standing in it.
 */
export const scuffFactor = (x, z) =>
  1 - smoothstep(PATH.HALF_WIDTH, PATH.HALF_WIDTH + PATH.VERGE * 2.2, distanceToPath(x, z));

export function vergeFactor(x, z) {
  const distance = distanceToPath(x, z);
  const rising = smoothstep(PATH.HALF_WIDTH * 0.6, PATH.HALF_WIDTH, distance);
  const falling = 1 - smoothstep(PATH.HALF_WIDTH, PATH.HALF_WIDTH + PATH.VERGE * 4, distance);
  return rising * falling;
}

/**
 * How strongly the terrain's cross-slope is levelled here, 0..1.
 *
 * Wider than the trail itself, so the ground eases into the level rather than
 * stepping down onto it.
 */
export const flattenFactor = (x, z) =>
  1 - smoothstep(PATH.HALF_WIDTH, PATH.HALF_WIDTH * PATH.FLATTEN, distanceToPath(x, z));
