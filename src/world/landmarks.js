import { LANDMARKS } from '../content/resume.js';
import { WORLD } from '../config/world.js';
import { PROPS } from '../config/palette.js';
import { blockKey } from './grid.js';

/**
 * Turns a landmark's `structure` description into the stack of boxes that
 * represents it.
 *
 * The six `style` keys come from src/content/resume.js and never change — only
 * the shapes they produce do. They are rally structures now: a timber lookout,
 * a lodge, a service garage with a pit awning, a spectator arena, a trailside
 * café under a canopy, a marshal post with a gantry.
 *
 * Distinct silhouettes matter far more than detail here: you navigate this
 * stage by recognising a shape from three blocks away, which is also why every
 * style keeps a tall or wide feature that survives being drawn at 900 units.
 */

/** Set of "bi,bj" block keys that hold a landmark, for the surface sampler. */
export const paddockBlockKeys = new Set(
  LANDMARKS.map((landmark) =>
    blockKey(Math.floor(landmark.x / WORLD.BLOCK), Math.floor(landmark.z / WORLD.BLOCK)),
  ),
);

/**
 * @returns {Array<{x,z,halfWidth,halfDepth,base,height,color,windows,landmarkId}>}
 */
export function landmarkBoxes(landmark) {
  const { w, d, h, style } = landmark.structure;
  const halfWidth = w / 2;
  const halfDepth = d / 2;

  const box = (overrides = {}) => ({
    x: landmark.x,
    z: landmark.z,
    halfWidth,
    halfDepth,
    base: 0,
    height: h,
    color: landmark.color,
    windows: false,
    landmarkId: landmark.id,
    ...overrides,
  });

  const builder = STYLES[style] ?? STYLES.post;
  return builder(box, { landmark, halfWidth, halfDepth, height: h });
}

const STYLES = {
  /* A timber lookout tower: four splayed legs, a glazed cabin, and the mast
     that makes it findable from anywhere on the stage. */
  tower: (box, { halfWidth, halfDepth, height, landmark }) => [
    box({
      halfWidth: halfWidth * 0.55,
      halfDepth: halfDepth * 0.55,
      height: height * 0.82,
      color: PROPS.TIMBER,
    }),
    box({
      halfWidth,
      halfDepth,
      base: height * 0.82,
      height: height * 0.14,
      windows: true,
    }),
    box({
      halfWidth: halfWidth * 1.15,
      halfDepth: halfDepth * 1.15,
      base: height * 0.96,
      height: height * 0.03,
      color: PROPS.TIMBER,
    }),
    box({
      halfWidth: 5,
      halfDepth: 5,
      base: height * 0.99,
      height: 64,
      color: landmark.accent,
    }),
  ],

  /* A long timber lodge with a cross wing and a stone chimney. */
  campus: (box, { halfWidth, halfDepth, height, landmark }) => [
    box({ height: height * 0.62, windows: true }),
    box({
      halfWidth: halfWidth * 1.06,
      halfDepth: halfDepth * 0.62,
      base: height * 0.62,
      height: height * 0.3,
      color: PROPS.TIMBER,
    }),
    box({
      halfWidth: halfWidth * 0.3,
      halfDepth: halfDepth * 1.3,
      height: height * 0.86,
      windows: true,
    }),
    box({
      x: landmark.x - halfWidth * 0.72,
      halfWidth: 12,
      halfDepth: 12,
      height: height * 1.25,
      color: landmark.accent,
    }),
  ],

  /* A service garage: open bays, a pit awning on posts, and a jib crane. */
  workshop: (box, { halfWidth, halfDepth, height, landmark }) => [
    box({ height: height * 0.9, windows: true }),
    box({
      halfWidth: halfWidth * 1.04,
      halfDepth: halfDepth * 1.04,
      base: height * 0.9,
      height: height * 0.12,
      color: PROPS.METAL,
    }),
    box({
      z: landmark.z + halfDepth * 1.02,
      halfWidth: halfWidth * 0.92,
      halfDepth: halfDepth * 0.26,
      base: height * 0.72,
      height: 6,
      color: landmark.accent,
    }),
    box({
      x: landmark.x + halfWidth * 0.72,
      halfWidth: 9,
      halfDepth: 9,
      height: height * 1.8,
      color: PROPS.METAL,
    }),
  ],

  /* Four banked spectator stands around an open service area, deliberately
     short of the corners so there is a diagonal gap wide enough to drive
     through, with a marker mast at each corner. */
  stadium: (box, { halfWidth, halfDepth, height, landmark }) => {
    const stands = [];
    for (const [dx, dz, sw, sd] of [
      [0, -0.82, 0.55, 0.18],
      [0, 0.82, 0.55, 0.18],
      [-0.82, 0, 0.18, 0.55],
      [0.82, 0, 0.18, 0.55],
    ]) {
      stands.push(
        box({
          x: landmark.x + dx * halfWidth,
          z: landmark.z + dz * halfDepth,
          halfWidth: halfWidth * sw,
          halfDepth: halfDepth * sd,
          color: PROPS.TIMBER,
        }),
        box({
          x: landmark.x + dx * halfWidth,
          z: landmark.z + dz * halfDepth,
          halfWidth: halfWidth * sw * 0.94,
          halfDepth: halfDepth * sd * 0.6,
          base: height,
          height: height * 0.5,
        }),
      );
    }

    const masts = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        masts.push(
          box({
            x: landmark.x + sx * halfWidth * 0.8,
            z: landmark.z + sz * halfDepth * 0.8,
            halfWidth: 5,
            halfDepth: 5,
            height: height + 92,
            color: landmark.accent,
          }),
        );
      }
    }
    return [...stands, ...masts];
  },

  /* A trailside café under a wide canvas canopy on corner posts. */
  cafe: (box, { halfWidth, halfDepth, height, landmark }) => [
    box({
      halfWidth: halfWidth * 0.8,
      halfDepth: halfDepth * 0.8,
      height: height * 0.7,
      windows: true,
    }),
    box({
      base: height * 0.7,
      height: 10,
      halfWidth: halfWidth * 1.25,
      halfDepth: halfDepth * 1.25,
      color: landmark.accent,
    }),
    box({
      x: landmark.x + halfWidth * 1.1,
      z: landmark.z + halfDepth * 1.1,
      halfWidth: 5,
      halfDepth: 5,
      height: height * 0.7,
      color: PROPS.TIMBER,
    }),
    box({
      x: landmark.x - halfWidth * 1.1,
      z: landmark.z + halfDepth * 1.1,
      halfWidth: 5,
      halfDepth: 5,
      height: height * 0.7,
      color: PROPS.TIMBER,
    }),
  ],

  /* A marshal post under a start-finish gantry: two towers and a beam. */
  post: (box, { halfWidth, halfDepth, height, landmark }) => [
    box({
      halfWidth: halfWidth * 0.7,
      halfDepth: halfDepth * 0.7,
      height: height * 0.8,
      windows: true,
    }),
    box({
      base: height * 0.8,
      height: 12,
      halfWidth: halfWidth * 0.95,
      halfDepth: halfDepth * 0.95,
      color: PROPS.METAL,
    }),
    box({
      x: landmark.x - halfWidth * 0.95,
      halfWidth: 8,
      halfDepth: halfDepth * 0.32,
      height: height * 1.35,
      color: PROPS.TIMBER,
    }),
    box({
      x: landmark.x + halfWidth * 0.95,
      halfWidth: 8,
      halfDepth: halfDepth * 0.32,
      height: height * 1.35,
      color: PROPS.TIMBER,
    }),
    box({
      halfWidth: halfWidth * 1.05,
      halfDepth: halfDepth * 0.22,
      base: height * 1.35,
      height: 16,
      color: landmark.accent,
    }),
  ],
};
