import { ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { FLORA } from '../../config/palette.js';
import { finish, part } from './shapes.js';

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

/**
 * A splay of blades. Everything grassy is this with different numbers.
 *
 * Each blade is a three-sided cone squashed on one axis, which is the cheapest
 * shape that still reads as a blade rather than as a spike: nine triangles a
 * tuft, and there are fifty thousand tufts. Unsquashed they are wedges, and a
 * meadow of wedges is what the first version of this looked like from eye
 * level.
 */
function blades({ count, hex, tipHex, spread, lean, thickness, flatten = 0.34 }) {
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + i * 0.7;
    const blade = new ConeGeometry(thickness, 1, 3);
    blade.translate(0, 0.5, 0);
    parts.push(
      part(blade, hex, {
        // Dark at the root, light at the tip, up the blade's own axis. Grass
        // is the largest single thing in the scene by instance count and the
        // gradient costs nothing per instance.
        gradient: i % 3 === 0 ? FLORA.GRASS_LIGHT : tipHex,
        scale: [1, 0.7 + (i % 3) * 0.15, flatten],
        lean: lean * (0.6 + (i % 4) * 0.22),
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
      count: 11,
      hex: FLORA.GRASS_GREEN,
      tipHex: FLORA.GRASS_LIGHT,
      spread: 0.16,
      lean: 0.3,
      thickness: 0.035,
    }),
    'grass',
  );
}

/**
 * The same tuft grown tall and leaning.
 *
 * Most of what carpets the forest floor in the reference art is not one grass
 * but two at different heights, and the taller one is what breaks the
 * silhouette of everything standing in it.
 */
export function tallGrass() {
  return finish(
    blades({
      count: 11,
      hex: FLORA.GRASS_LIGHT,
      tipHex: FLORA.GRASS_GREEN,
      spread: 0.13,
      lean: 0.34,
      thickness: 0.03,
    }),
    'tall-grass',
  );
}

export function grassDry() {
  return finish(
    blades({
      count: 7,
      hex: FLORA.GRASS_DRY,
      tipHex: FLORA.DEAD_WOOD,
      spread: 0.2,
      lean: 0.44,
      thickness: 0.055,
    }),
    'grass-dry',
  );
}

/** Wider, darker, drooping: forest floor rather than meadow. */
export function fern() {
  return finish(
    blades({
      count: 11,
      hex: FLORA.BROADLEAF_DARK,
      tipHex: FLORA.PINE_MID,
      spread: 0.14,
      lean: 0.7,
      thickness: 0.048,
      flatten: 0.5,
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
      part(new SphereGeometry(0.42, 6, 4), FLORA.BROADLEAF_DARK, {
        gradient: FLORA.BROADLEAF_MID,
        y: 0.4,
        scale: [1, 0.9, 1],
      }),
      part(new SphereGeometry(0.3, 5, 3), FLORA.BROADLEAF_MID, {
        gradient: FLORA.BROADLEAF_LIGHT,
        x: 0.24,
        y: 0.3,
        z: 0.1,
      }),
      part(new SphereGeometry(0.26, 5, 3), FLORA.BROADLEAF_DARK, {
        gradient: FLORA.BROADLEAF_MID,
        x: -0.2,
        y: 0.34,
        z: -0.14,
      }),
    ],
    'bush',
    { smooth: true },
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
