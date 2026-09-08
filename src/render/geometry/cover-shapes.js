import { ConeGeometry, CylinderGeometry, IcosahedronGeometry } from 'three';
import { FLORA, ROCK } from '../../config/palette.js';
import { finish, part, roughen } from './shapes.js';

/**
 * Undergrowth, stones and dead wood: the dense pass.
 *
 * These are drawn tens of thousands of times, so the budgets are brutal — a
 * tuft of grass is three triangles-worth of cone and a pebble is an
 * icosahedron. What sells them is not detail, it is that there are enough of
 * them: bare ground between the trees is the single thing that makes a
 * procedural landscape look procedural.
 *
 * Same contract as the trees: unit height, base at zero, colours baked in.
 * See ./shapes.js.
 */

/** A splay of blades. Everything grassy is this with different numbers. */
function blades({ count, hex, tipHex, spread, lean, thickness }) {
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + i * 0.7;
    const blade = new ConeGeometry(thickness, 1, 3);
    blade.translate(0, 0.5, 0);
    parts.push(
      part(blade, i % 3 === 0 ? tipHex : hex, {
        scale: [1, 0.7 + (i % 3) * 0.15, 1],
        lean,
        spin: angle,
        x: Math.cos(angle) * spread,
        z: Math.sin(angle) * spread,
      }),
    );
  }
  return parts;
}

export function grass() {
  return finish(
    blades({
      count: 5,
      hex: FLORA.GRASS_GREEN,
      tipHex: FLORA.BROADLEAF_LIGHT,
      spread: 0.1,
      lean: 0.26,
      thickness: 0.07,
    }),
    'grass',
  );
}

export function grassDry() {
  return finish(
    blades({
      count: 5,
      hex: FLORA.GRASS_DRY,
      tipHex: FLORA.DEAD_WOOD,
      spread: 0.13,
      lean: 0.4,
      thickness: 0.06,
    }),
    'grass-dry',
  );
}

/** Wider, darker, drooping: forest floor rather than meadow. */
export function fern() {
  return finish(
    blades({
      count: 7,
      hex: FLORA.BROADLEAF_DARK,
      tipHex: FLORA.PINE_MID,
      spread: 0.16,
      lean: 0.62,
      thickness: 0.11,
    }),
    'fern',
  );
}

/** Tall, straight, and only ever planted on a bank. */
export function reed() {
  return finish(
    blades({
      count: 6,
      hex: FLORA.PINE_MID,
      tipHex: FLORA.GRASS_DRY,
      spread: 0.06,
      lean: 0.12,
      thickness: 0.035,
    }),
    'reed',
  );
}

export function bush() {
  return finish(
    [
      part(new IcosahedronGeometry(0.42, 0), FLORA.BROADLEAF_DARK, { y: 0.4, scale: [1, 0.9, 1] }),
      part(new IcosahedronGeometry(0.3, 0), FLORA.BROADLEAF_MID, { x: 0.24, y: 0.3, z: 0.1 }),
      part(new IcosahedronGeometry(0.26, 0), FLORA.BROADLEAF_LIGHT, { x: -0.2, y: 0.34, z: -0.14 }),
    ],
    'bush',
  );
}

export function flower() {
  return finish(
    [
      ...blades({
        count: 3,
        hex: FLORA.GRASS_GREEN,
        tipHex: FLORA.GRASS_GREEN,
        spread: 0.05,
        lean: 0.12,
        thickness: 0.045,
      }),
      part(new IcosahedronGeometry(0.14, 0), FLORA.FLOWER_A, { y: 0.86, x: 0.05 }),
      part(new IcosahedronGeometry(0.11, 0), FLORA.FLOWER_B, { y: 0.72, x: -0.09, z: 0.06 }),
    ],
    'flower',
  );
}

export function mushroom() {
  return finish(
    [
      part(new CylinderGeometry(0.08, 0.1, 0.55, 6), FLORA.MUSHROOM_STEM, { y: 0.28 }),
      part(new ConeGeometry(0.32, 0.42, 8), FLORA.MUSHROOM_CAP, { y: 0.72 }),
    ],
    'mushroom',
  );
}

/** A stone. Two sizes of the same idea, because a jittered icosahedron at two
 *  subdivision levels is the whole of low-poly rock art. */
export function rock() {
  return finish(
    [
      part(roughen(new IcosahedronGeometry(0.5, 0), 0.5, 3), ROCK.COOL, {
        scale: [1.15, 0.85, 1],
        y: 0.34,
      }),
    ],
    'rock',
  );
}

export function boulder() {
  return finish(
    [
      part(roughen(new IcosahedronGeometry(0.5, 1), 0.36, 5), ROCK.COOL, {
        scale: [1.15, 1, 1.05],
        y: 0.44,
      }),
      part(roughen(new IcosahedronGeometry(0.18, 0), 0.5, 9), ROCK.WARM, {
        x: 0.4,
        y: 0.14,
        z: 0.22,
      }),
    ],
    'boulder',
  );
}

/**
 * A fallen trunk, lying on its side with the stump end showing.
 *
 * Long relative to its girth — about six to one — because anything squatter
 * reads from above as a brown slab rather than as a tree that fell over, which
 * is precisely what the first version of this looked like.
 */
export function log() {
  const trunk = new CylinderGeometry(0.15, 0.19, 2.2, 7);
  return finish(
    [
      part(trunk, FLORA.DEAD_WOOD, { tilt: Math.PI / 2, spin: 0.2, y: 0.18 }),
      part(new CylinderGeometry(0.13, 0.13, 0.06, 7), FLORA.BARK_LIGHT, {
        tilt: Math.PI / 2,
        spin: 0.2,
        x: 0.14,
        y: 0.18,
        z: 1.05,
      }),
    ],
    'log',
  );
}
