import { ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { FLORA } from '../../config/palette.js';
import { finish, part, roughen } from './shapes.js';

/**
 * Woodland-floor flowers and the bramble thicket.
 *
 * Character shapes rather than coverage — see cover-shapes.js for the mat
 * family — kept apart from it only because that file is at its line ceiling.
 */

/**
 * A low clump of broad flat leaves with a couple of thin umbels of small
 * white flowers standing above them. Same technique as clover() — flattened
 * spheres for leaves — but larger and more elongated, the way a wild garlic
 * leaf reads next to a clover one.
 */
export function wildGarlic() {
  const parts = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + i * 1.1;
    const reach = 0.14 + (i % 3) * 0.08;
    parts.push(
      part(new SphereGeometry(0.2 - (i % 3) * 0.03, 5, 3), FLORA.BROADLEAF_MID, {
        gradient: FLORA.GRASS_LIGHT,
        scale: [1, 0.2, 1.9],
        spin: angle,
        lean: 0.28,
        x: Math.cos(angle) * reach,
        y: 0.1,
        z: Math.sin(angle) * reach,
      }),
    );
  }

  for (const side of [1, -1]) {
    const stem = new CylinderGeometry(0.012, 0.016, 0.62, 3);
    stem.translate(0, 0.31, 0);
    parts.push(part(stem, FLORA.GRASS_GREEN, { x: side * 0.08, lean: side * 0.08 }));
    for (let j = 0; j < 3; j += 1) {
      const bloomAngle = (j / 3) * Math.PI * 2;
      parts.push(
        part(new SphereGeometry(0.045, 5, 3), FLORA.FLOWER_WHITE, {
          x: side * 0.08 + Math.cos(bloomAngle) * 0.05,
          y: 0.62,
          z: Math.sin(bloomAngle) * 0.05,
        }),
      );
    }
  }
  return finish(parts, 'wild-garlic', { smooth: true });
}

/**
 * A cluster of tiny white star-flowers, low to the ground.
 *
 * The single-bloom clumps in flower-shapes.js each carry one flower on a tall
 * stem; a wood anemone is a clump of several tiny ones close together, so this
 * builds a handful of short-stemmed stars rather than reusing that shape.
 */
export function woodAnemone() {
  const blooms = [
    { x: 0, z: 0, h: 0.42 },
    { x: 0.14, z: 0.05, h: 0.34 },
    { x: -0.11, z: 0.09, h: 0.38 },
    { x: 0.04, z: -0.13, h: 0.3 },
    { x: -0.1, z: -0.08, h: 0.36 },
  ];
  const parts = [];
  for (const { x, z, h } of blooms) {
    const stem = new CylinderGeometry(0.008, 0.01, h, 3);
    stem.translate(0, h / 2, 0);
    parts.push(part(stem, FLORA.GRASS_GREEN, { x, z }));

    for (let i = 0; i < 5; i += 1) {
      const angle = (i / 5) * Math.PI * 2;
      const petal = new ConeGeometry(0.035, 0.09, 3);
      parts.push(
        part(petal, FLORA.FLOWER_WHITE, {
          scale: [1, 1, 0.3],
          lean: Math.PI / 2 - 0.25,
          spin: angle,
          x: x + Math.cos(angle) * 0.035,
          y: h,
          z: z + Math.sin(angle) * 0.035,
        }),
      );
    }
    parts.push(part(new SphereGeometry(0.02, 5, 3), FLORA.FLOWER_YELLOW, { x, y: h + 0.015, z }));
  }
  return finish(parts, 'wood-anemone', { smooth: true });
}

/**
 * A thin stem with several small bells drooping from its upper half.
 *
 * A cone's default orientation — narrow apex up, wide base down — is already
 * a bell hanging from its neck, so no flip is needed: just lean it away from
 * the stem and hang it from the attachment point.
 */
export function bluebell() {
  const stemHeight = 0.85;
  const stem = new CylinderGeometry(0.014, 0.02, stemHeight, 4);
  stem.translate(0, stemHeight / 2, 0);
  const parts = [part(stem, FLORA.GRASS_GREEN, { lean: 0.08 })];

  const bells = 5;
  for (let i = 0; i < bells; i += 1) {
    const t = i / (bells - 1);
    const y = stemHeight * (0.5 + t * 0.42);
    const side = i % 2 === 0 ? 1 : -1;
    const bell = new ConeGeometry(0.045, 0.12, 6);
    bell.translate(0, -0.06, 0);
    parts.push(
      part(bell, FLORA.BLUEBELL, {
        gradient: FLORA.FLOWER_PURPLE,
        lean: side * 0.5,
        spin: side * 0.6 + i,
        x: side * 0.03,
        y,
      }),
    );
  }
  return finish(parts, 'bluebell', { smooth: true });
}

/**
 * A bramble thicket: the bush() technique, but chaotic, thorny and taller
 * rather than round — stretched crowns, heavier roughening, and a scatter of
 * thin thorny canes poking clear of the mass.
 */
export function bramble() {
  const parts = [
    part(roughen(new SphereGeometry(0.4, 6, 5), 0.55, 53), FLORA.BROADLEAF_DARK, {
      gradient: FLORA.BROADLEAF_MID,
      y: 0.46,
      scale: [1, 1.3, 0.85],
    }),
    part(roughen(new SphereGeometry(0.28, 6, 4), 0.5, 59), FLORA.BROADLEAF_DARK, {
      gradient: FLORA.BROADLEAF_MID,
      x: 0.26,
      y: 0.34,
      z: 0.12,
      scale: [1, 1.2, 0.8],
    }),
    part(roughen(new SphereGeometry(0.24, 6, 4), 0.5, 61), FLORA.BROADLEAF_DARK, {
      gradient: FLORA.BROADLEAF_MID,
      x: -0.22,
      y: 0.4,
      z: -0.16,
      scale: [1, 1.25, 0.8],
    }),
  ];

  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 + i * 0.9;
    const cane = new ConeGeometry(0.02, 0.5, 3);
    cane.translate(0, 0.25, 0);
    parts.push(
      part(cane, FLORA.AUTUMN_RUST, {
        lean: 0.5 + (i % 3) * 0.15,
        spin: angle,
        x: Math.cos(angle) * 0.3,
        y: 0.3,
        z: Math.sin(angle) * 0.3,
      }),
    );
  }
  return finish(parts, 'bramble');
}
