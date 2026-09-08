import { ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { FLORA } from '../../config/palette.js';
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

/**
 * A wide, low mat of many short blades.
 *
 * The single most important shape on the floor, and the answer to a hard
 * constraint. The reference art has no bare ground at all — the green *is*
 * plants — and covering a valley that way one tuft at a time would need
 * something like a million instances. A mat covers eight or ten units for
 * thirty triangles, and because the planting gives every grid cell exactly one
 * plant, mats winning cells that tufts used to win costs nothing at all: the
 * instance count is fixed by the grid, and this is simply a far better use of
 * it. Tufts then stand *in* the mats rather than on a lawn.
 */
function mat({ hex, tipHex }) {
  const parts = [];
  for (let i = 0; i < 13; i += 1) {
    const angle = (i / 13) * Math.PI * 2 + i * 1.3;
    const reach = 0.26 + (i % 4) * 0.15;
    // Thin. A mat is read as grass or as leaves entirely by the width of one
    // blade against its length, and these are drawn five metres wide.
    const blade = new ConeGeometry(0.05, 1, 3);
    blade.translate(0, 0.5, 0);

    parts.push(
      part(blade, hex, {
        gradient: i % 3 === 0 ? tipHex : hex,
        // Splayed almost flat and shrinking outward, so the mat has a domed
        // middle and a feathered edge rather than a hard rim.
        scale: [1, 0.78 - (i % 4) * 0.11, 0.34],
        lean: 0.62 + (i % 3) * 0.16,
        spin: angle,
        x: Math.cos(angle) * reach,
        z: Math.sin(angle) * reach,
      }),
    );
  }
  return parts;
}

export function grassMat() {
  // Rooted in the ground's own green and lightening only at the tips: a mat
  // painted brighter than the earth under it reads as a patch laid on top.
  return finish(mat({ hex: FLORA.MAT_GREEN, tipHex: FLORA.GRASS_GREEN }), 'grass-mat');
}

export function dryMat() {
  return finish(mat({ hex: FLORA.MAT_DRY, tipHex: FLORA.GRASS_DRY }), 'dry-mat');
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

/**
 * A clover mat: broad round leaves close to the ground.
 *
 * The dominant thing on the reference art's forest floor, and a different job
 * from grass — grass gives the floor height and movement, this gives it
 * *cover*. Deliberately far wider than it is tall: shapes are scaled by
 * height, so a mat two units high spreads six or seven across and a scattering
 * of them closes the gaps between the tufts. Tufts alone, at any spacing the
 * frame budget allows, leave a lawn with things standing on it.
 */
export function clover() {
  const parts = [];
  for (let i = 0; i < 11; i += 1) {
    const angle = (i / 11) * Math.PI * 2 + i * 1.4;
    const reach = 0.22 + (i % 4) * 0.16;
    // Barely off the ground. Leaves on visible stems read as lily pads
    // floating over the floor rather than as something growing out of it.
    const lift = 0.18 + (i % 3) * 0.1;

    parts.push(
      part(new SphereGeometry(0.13 - (i % 3) * 0.02, 5, 3), FLORA.BROADLEAF_MID, {
        gradient: i % 2 === 0 ? FLORA.GRASS_LIGHT : FLORA.BROADLEAF_LIGHT,
        scale: [1, 0.3, 1],
        x: Math.cos(angle) * reach,
        y: lift,
        z: Math.sin(angle) * reach,
      }),
    );
  }
  return finish(parts, 'clover', { smooth: true });
}

/**
 * A leafy shrub.
 *
 * Flat-shaded and knocked about, unlike the tree crowns next door: a bush is
 * seen from two metres away rather than twenty, and a smooth sphere at that
 * range is a beach ball. The facets are the leaves.
 */
export function bush() {
  return finish(
    [
      part(roughen(new SphereGeometry(0.42, 7, 5), 0.3, 31), FLORA.BROADLEAF_DARK, {
        gradient: FLORA.BROADLEAF_MID,
        y: 0.4,
        scale: [1, 0.9, 1],
      }),
      part(roughen(new SphereGeometry(0.3, 6, 4), 0.3, 37), FLORA.BROADLEAF_MID, {
        gradient: FLORA.BROADLEAF_LIGHT,
        x: 0.24,
        y: 0.3,
        z: 0.1,
      }),
      part(roughen(new SphereGeometry(0.26, 6, 4), 0.3, 41), FLORA.BROADLEAF_DARK, {
        gradient: FLORA.BROADLEAF_MID,
        x: -0.2,
        y: 0.34,
        z: -0.14,
      }),
    ],
    'bush',
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
