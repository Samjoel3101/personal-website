import { CylinderGeometry, SphereGeometry } from 'three';
import { FLORA } from '../../config/palette.js';
import { finish, part } from './shapes.js';

/**
 * The deciduous trees: green in the forest, turning through the woodland.
 *
 * They are all the same tree with a different crown — a leaning trunk under
 * five overlapping blobs — because that is what the reference art is: the
 * variety comes from colour and proportion, not from modelling. Two of the
 * five are autumn, which is what stops a wall of green from being a wall.
 *
 * The crowns are smooth-shaded spheres carrying a vertical gradient, not
 * faceted lumps. That is the one place this project spends polygons on
 * roundness, and it is worth it: a hard-facetted canopy reads as a crystal,
 * and the gradient does the work that soft lighting deliberately will not —
 * the underside of a crown sits in its own shade.
 *
 * Same contract as everything else in here: one unit tall, base at y = 0,
 * colours in a vertex attribute. See ./shapes.js.
 */

/**
 * A crown of overlapping blobs on a trunk.
 *
 * `tones` is read in order and cycled, so a two-tone crown alternates and a
 * three-tone one never repeats twice running. The blobs are deliberately
 * uneven: five spheres of one radius on a ring is a lollipop.
 */
function tree({ tones, trunk, lean = 0, spread = 0.24, base = 0.62, lift = 0.3 }) {
  const blobs = [
    { r: 0.3, x: 0, z: 0, y: 0.16 },
    { r: 0.24, x: spread, z: 0.08, y: 0 },
    { r: 0.23, x: -spread * 0.85, z: -0.1, y: 0.04 },
    { r: 0.21, x: 0.06, z: -spread * 0.8, y: 0.2 },
    { r: 0.19, x: -0.08, z: spread * 0.75, y: 0.1 },
  ];

  return [
    part(new CylinderGeometry(trunk.top, trunk.bottom, base + lift, 6), trunk.hex, {
      y: (base + lift) / 2,
      lean,
    }),
    ...blobs.map((blob, index) =>
      part(new SphereGeometry(blob.r, 6, 4), tones[(index + 1) % tones.length], {
        gradient: tones[index % tones.length],
        x: blob.x + lean * -base,
        y: base + lift * 0.55 + blob.y,
        z: blob.z,
      }),
    ),
  ];
}

const OAK_TRUNK = { top: 0.05, bottom: 0.09, hex: FLORA.BARK };
const SLIM_TRUNK = { top: 0.032, bottom: 0.055, hex: FLORA.BARK_LIGHT };

/** The green broadleaf that takes over as the pines thin. */
export function oak() {
  return finish(
    tree({
      tones: [FLORA.BROADLEAF_MID, FLORA.BROADLEAF_DARK, FLORA.BROADLEAF_LIGHT],
      trunk: OAK_TRUNK,
    }),
    'oak',
    { smooth: true },
  );
}

/** Taller, thinner, lighter: the one that lets light through to the floor. */
export function aspen() {
  return finish(
    tree({
      tones: [FLORA.BROADLEAF_LIGHT, FLORA.BROADLEAF_MID],
      trunk: SLIM_TRUNK,
      lean: 0.06,
      spread: 0.19,
      base: 0.7,
      lift: 0.22,
    }),
    'aspen',
    { smooth: true },
  );
}

export function mapleRed() {
  return finish(
    tree({
      tones: [FLORA.AUTUMN_RED, FLORA.AUTUMN_RUST, FLORA.AUTUMN_ORANGE],
      trunk: OAK_TRUNK,
      lean: -0.05,
    }),
    'maple-red',
    { smooth: true },
  );
}

export function mapleGold() {
  return finish(
    tree({
      tones: [FLORA.AUTUMN_GOLD, FLORA.AUTUMN_OLIVE, FLORA.AUTUMN_ORANGE],
      trunk: SLIM_TRUNK,
      lean: 0.05,
      spread: 0.22,
    }),
    'maple-gold',
    { smooth: true },
  );
}

/**
 * Birch: a pale trunk with dark scars up it, under a loose light crown.
 *
 * The scars are four flattened boxes rather than a texture. At the distance
 * anything is actually seen from here that is the same picture for none of the
 * cost, and it keeps the whole species on one untextured material.
 */
export function birch() {
  const parts = tree({
    tones: [FLORA.BROADLEAF_LIGHT, FLORA.BROADLEAF_MID],
    trunk: { top: 0.026, bottom: 0.042, hex: FLORA.BIRCH_BARK },
    spread: 0.17,
    base: 0.78,
    lift: 0.16,
  });

  for (let i = 0; i < 4; i += 1) {
    parts.push(
      part(new CylinderGeometry(0.031, 0.034, 0.022, 5), FLORA.BIRCH_MARK, {
        y: 0.16 + i * 0.17,
        spin: i * 1.9,
        x: 0.004,
      }),
    );
  }
  return finish(parts, 'birch', { smooth: true });
}
