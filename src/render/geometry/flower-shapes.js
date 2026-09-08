import { ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { FLORA } from '../../config/palette.js';
import { finish, part } from './shapes.js';

/**
 * Flower clumps.
 *
 * Five or six heads on stems over a couple of leaves, in one colour per
 * species. They cost almost nothing and they do more for the picture than
 * anything else in this directory: a green forest floor with clumps of blue,
 * violet and pink through it is the difference between undergrowth and a
 * texture. The scatter crowds them along the trail's edge, which is where the
 * eye already is.
 *
 * One species per colour rather than one species tinted per instance, because
 * the instance tint multiplies the vertex colour — it can shade a flower, but
 * it cannot turn a blue one violet without dragging its stem and leaves along
 * with it.
 */
function clump(petal, { heads = 4, headSize = 0.14, tall = false } = {}) {
  const parts = [];
  const stemTop = tall ? 0.78 : 0.62;

  for (let i = 0; i < heads; i += 1) {
    const angle = (i / heads) * Math.PI * 2 + 0.6;
    const reach = 0.13 + (i % 3) * 0.05;
    const height = stemTop - (i % 3) * 0.12;

    parts.push(
      part(new CylinderGeometry(0.012, 0.018, height, 3), FLORA.GRASS_GREEN, {
        x: Math.cos(angle) * reach * 0.5,
        y: height / 2,
        z: Math.sin(angle) * reach * 0.5,
        lean: Math.cos(angle) * 0.16,
      }),
      part(new SphereGeometry(headSize - (i % 3) * 0.02, 6, 4), petal, {
        x: Math.cos(angle) * reach,
        y: height + 0.04,
        z: Math.sin(angle) * reach,
      }),
    );
  }

  // Two leaves at the base, so the clump is planted rather than floating.
  for (const side of [1, -1]) {
    const leaf = new ConeGeometry(0.075, 0.34, 3);
    leaf.translate(0, 0.17, 0);
    parts.push(
      part(leaf, FLORA.GRASS_LIGHT, {
        scale: [1, 1, 0.4],
        lean: side * 0.7,
        spin: side * 1.1,
        x: side * 0.1,
      }),
    );
  }
  return parts;
}

const round = { smooth: true };

export const flowerBlue = () => finish(clump(FLORA.FLOWER_BLUE), 'flower-blue', round);
export const flowerPurple = () =>
  finish(clump(FLORA.FLOWER_PURPLE, { heads: 5, tall: true }), 'flower-purple', round);
export const flowerPink = () =>
  finish(clump(FLORA.FLOWER_PINK, { heads: 4 }), 'flower-pink', round);
export const flowerYellow = () =>
  finish(clump(FLORA.FLOWER_YELLOW, { heads: 5, headSize: 0.11 }), 'flower-yellow', round);
export const flowerWhite = () =>
  finish(
    clump(FLORA.FLOWER_WHITE, { heads: 4, headSize: 0.12, tall: true }),
    'flower-white',
    round,
  );
