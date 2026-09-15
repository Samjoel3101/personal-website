import { SphereGeometry } from 'three';
import { FLORA } from '../../config/palette.js';
import { finish, part } from './shapes.js';
import { blades, mat } from './cover-shapes.js';

/**
 * The forest floor's own detail: litter, needles, moss and sedge.
 *
 * Same family as cover-shapes.js — these extend its `mat()` and `blades()`
 * helpers rather than inventing a new vocabulary — split into their own file
 * only because cover-shapes.js is already at its line ceiling. See the note
 * at the top of that file for the budget and the mat-vs-tuft philosophy.
 */

/** A carpet of fallen broadleaf litter: warm rust rather than green. */
export function leafLitterMat() {
  return finish(
    mat({ hex: FLORA.MAT_LITTER, tipHex: FLORA.LITTER_LIGHT, thickness: 0.05 }),
    'leaf-litter-mat',
  );
}

/**
 * A bed of shed pine needles: thinner and more linear than leaf litter, and
 * carried toward the pines it fell from with a greener cast than the
 * broadleaf litter beside it.
 */
export function needleMat() {
  return finish(
    mat({ hex: FLORA.MAT_NEEDLE, tipHex: FLORA.NEEDLE_LIGHT, thickness: 0.018, flatten: 0.32 }),
    'needle-mat',
  );
}

/**
 * A small deep-shade moss clump.
 *
 * Built the same way as clover() — a scattering of flattened spheres just off
 * the ground — but smaller and more saturated: moss is a character accent
 * tucked at the base of a trunk or a stone, not a coverage layer.
 */
export function moss() {
  const parts = [];
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2 + i * 1.7;
    const reach = 0.1 + (i % 3) * 0.06;
    const lift = 0.07 + (i % 2) * 0.05;

    parts.push(
      part(new SphereGeometry(0.08 - (i % 3) * 0.015, 5, 3), FLORA.MOSS_GREEN, {
        gradient: i % 2 === 0 ? FLORA.GRASS_LIGHT : FLORA.MOSS_GREEN,
        scale: [1, 0.32, 1],
        x: Math.cos(angle) * reach,
        y: lift,
        z: Math.sin(angle) * reach,
      }),
    );
  }
  return finish(parts, 'moss', { smooth: true });
}

/**
 * A dense, upright tussock: sedge grown tighter and straighter than grass or
 * tall-grass, so it reads as a rounded clump rather than a splayed tuft.
 */
export function sedgeTussock() {
  return finish(
    blades({
      count: 14,
      hex: FLORA.PINE_MID,
      tipHex: FLORA.GRASS_LIGHT,
      spread: 0.08,
      lean: 0.16,
      thickness: 0.026,
    }),
    'sedge-tussock',
  );
}
