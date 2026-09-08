import { ConeGeometry, CylinderGeometry, IcosahedronGeometry } from 'three';
import { FLORA } from '../../config/palette.js';
import { finish, part, roughen } from './shapes.js';

/**
 * Everything with a trunk.
 *
 * Each builder returns one merged, flat-shaded, vertex-coloured geometry
 * normalised to unit height — see ./shapes.js for the contract — so the whole
 * species is drawn in a single instanced call however many pieces it is made
 * of. Proportions are baked in here rather than passed in: a pine is a pine at
 * any size, and letting a caller stretch one produces a fir tree that has been
 * stepped on.
 *
 * Polygon budgets are deliberate. There are a few thousand trees in the
 * valley, so a canopy is three cones and not a subdivided mesh; the look these
 * are after gets its charm from the facets, not from hiding them.
 */

/** A stack of cones on a trunk: the pine that fills the forest floor. */
export function conifer() {
  const tiers = [
    { radius: 0.3, height: 0.36, y: 0.34, hex: FLORA.PINE_DARK },
    { radius: 0.24, height: 0.34, y: 0.58, hex: FLORA.PINE_MID },
    { radius: 0.16, height: 0.3, y: 0.83, hex: FLORA.PINE_LIGHT },
  ];
  return finish(
    [
      part(new CylinderGeometry(0.035, 0.06, 0.5, 6), FLORA.BARK, { y: 0.25 }),
      ...tiers.map((tier) =>
        part(new ConeGeometry(tier.radius, tier.height, 8), tier.hex, { y: tier.y }),
      ),
    ],
    'conifer',
  );
}

/** The same tree grown for the light: narrower, taller, four tiers. */
export function coniferTall() {
  const parts = [part(new CylinderGeometry(0.028, 0.05, 0.44, 6), FLORA.BARK, { y: 0.22 })];
  const greens = [FLORA.PINE_DARK, FLORA.PINE_DARK, FLORA.PINE_MID, FLORA.PINE_LIGHT];
  for (let tier = 0; tier < 4; tier += 1) {
    parts.push(
      part(new ConeGeometry(0.21 - tier * 0.042, 0.3, 7), greens[tier], {
        y: 0.28 + tier * 0.21,
      }),
    );
  }
  return finish(parts, 'conifer-tall');
}

/** Pale trunk, loose crown: the tree that takes over as the forest thins. */
export function birch() {
  return finish(
    [
      part(new CylinderGeometry(0.028, 0.042, 0.66, 6), FLORA.BIRCH_BARK, { y: 0.33 }),
      part(new IcosahedronGeometry(0.24, 0), FLORA.BROADLEAF_MID, { y: 0.76 }),
      part(new IcosahedronGeometry(0.18, 0), FLORA.BROADLEAF_LIGHT, { x: 0.15, y: 0.66, z: 0.06 }),
      part(new IcosahedronGeometry(0.15, 0), FLORA.BROADLEAF_DARK, { x: -0.12, y: 0.7, z: -0.1 }),
    ],
    'birch',
  );
}

/** A broad, heavy crown on a short trunk. */
export function broadleaf() {
  const blobs = [
    { r: 0.3, x: 0, y: 0.66, z: 0, hex: FLORA.BROADLEAF_MID },
    { r: 0.24, x: 0.2, y: 0.58, z: 0.08, hex: FLORA.BROADLEAF_DARK },
    { r: 0.22, x: -0.18, y: 0.62, z: -0.1, hex: FLORA.BROADLEAF_LIGHT },
    { r: 0.2, x: 0.02, y: 0.82, z: -0.04, hex: FLORA.BROADLEAF_LIGHT },
  ];
  return finish(
    [
      part(new CylinderGeometry(0.05, 0.09, 0.46, 6), FLORA.BARK, { y: 0.23 }),
      ...blobs.map((blob) =>
        part(new IcosahedronGeometry(blob.r, 0), blob.hex, { x: blob.x, y: blob.y, z: blob.z }),
      ),
    ],
    'broadleaf',
  );
}

/** Bare, forked, bleached: the first thing to appear as the water runs out. */
export function deadTree() {
  const parts = [part(new CylinderGeometry(0.025, 0.07, 0.86, 6), FLORA.DEAD_WOOD, { y: 0.43 })];
  const branches = [
    { spin: 0.4, lean: 0.95, y: 0.62, length: 0.36 },
    { spin: 2.4, lean: -0.8, y: 0.5, length: 0.3 },
    { spin: 4.3, lean: 0.7, y: 0.74, length: 0.24 },
  ];
  for (const branch of branches) {
    const limb = new CylinderGeometry(0.012, 0.028, branch.length, 5);
    limb.translate(0, branch.length / 2, 0);
    parts.push(part(limb, FLORA.DEAD_WOOD, { lean: branch.lean, spin: branch.spin, y: branch.y }));
  }
  return finish(parts, 'dead-tree');
}

/** A leaning trunk under a crown of fronds. Only ever planted beside water. */
export function palm() {
  const parts = [];
  const segments = 7;
  for (let i = 0; i < segments; i += 1) {
    const t = i / segments;
    parts.push(
      part(new CylinderGeometry(0.036, 0.05, 0.13, 6), FLORA.PALM_TRUNK, {
        x: t * t * 0.16,
        y: 0.065 + t * 0.78,
        lean: -t * 0.32,
      }),
    );
  }

  for (let i = 0; i < 7; i += 1) {
    const frond = new ConeGeometry(0.055, 0.52, 3);
    frond.translate(0, 0.26, 0);
    parts.push(
      part(frond, i % 2 === 0 ? FLORA.PALM_FROND : FLORA.BROADLEAF_DARK, {
        scale: [1, 1, 0.28],
        lean: 1.15,
        spin: (i / 7) * Math.PI * 2,
        x: 0.16,
        y: 0.9,
      }),
    );
  }
  return finish(parts, 'palm');
}

/** Saguaro: one column, two arms, and the silhouette the desert is known by. */
export function cactus() {
  const parts = [
    part(new CylinderGeometry(0.13, 0.15, 0.8, 8), FLORA.CACTUS, { y: 0.4 }),
    part(new IcosahedronGeometry(0.13, 0), FLORA.CACTUS, { y: 0.8 }),
  ];

  for (const side of [1, -1]) {
    const elbow = new CylinderGeometry(0.06, 0.07, 0.22, 7);
    parts.push(part(elbow, FLORA.CACTUS_DARK, { lean: Math.PI / 2, x: side * 0.19, y: 0.42 }));
    const limb = new CylinderGeometry(0.055, 0.065, 0.3 + side * 0.06, 7);
    parts.push(part(limb, FLORA.CACTUS, { x: side * 0.28, y: 0.57 + side * 0.03 }));
  }
  return finish(parts, 'cactus');
}

/** Barrel cactus: a squat, ribbed lump with a flower on top. */
export function cactusRound() {
  const body = roughen(new IcosahedronGeometry(0.4, 1), 0.14, 7);
  return finish(
    [
      part(body, FLORA.CACTUS_DARK, { scale: [1, 0.85, 1], y: 0.34 }),
      part(new IcosahedronGeometry(0.09, 0), FLORA.FLOWER_A, { y: 0.72 }),
    ],
    'cactus-round',
  );
}
