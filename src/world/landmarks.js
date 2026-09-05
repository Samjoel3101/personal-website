import { LANDMARKS } from '../content/resume.js';
import { WORLD } from '../config/world.js';
import { blockKey } from './grid.js';

/**
 * Turns a landmark's `structure` description into the stack of boxes that
 * represents it. Distinct silhouettes matter far more than detail here: you
 * navigate this city by recognising a shape from three blocks away.
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
    windows: true,
    landmarkId: landmark.id,
    ...overrides,
  });

  const builder = STYLES[style] ?? STYLES.post;
  return builder(box, { landmark, halfWidth, halfDepth, height: h });
}

const STYLES = {
  tower: (box, { halfWidth, halfDepth, height, landmark }) => [
    box({ height: height * 0.9 }),
    box({
      halfWidth: halfWidth * 0.6,
      halfDepth: halfDepth * 0.6,
      base: height * 0.9,
      height: height * 0.18,
      windows: false,
    }),
    box({
      halfWidth: 6,
      halfDepth: 6,
      base: height * 1.08,
      height: 60,
      color: landmark.accent,
      windows: false,
    }),
  ],

  campus: (box, { halfWidth, halfDepth, height, landmark }) => [
    box({ height: height * 0.7 }),
    box({ halfWidth: halfWidth * 0.34, halfDepth: halfDepth * 1.15, height: height * 1.05 }),
    box({
      halfWidth: halfWidth * 0.2,
      halfDepth: halfDepth * 0.2,
      base: height * 1.05,
      height: height * 0.3,
      color: landmark.accent,
      windows: false,
    }),
  ],

  workshop: (box, { halfWidth, halfDepth, height, landmark }) => [
    box({ height: height * 0.8 }),
    box({
      x: landmark.x - halfWidth * 0.5,
      halfWidth: halfWidth * 0.45,
      halfDepth: halfDepth * 0.7,
      height: height * 1.25,
    }),
    box({
      x: landmark.x + halfWidth * 0.55,
      halfWidth: 14,
      halfDepth: 14,
      height: height * 1.9,
      windows: false,
    }),
  ],

  /* Four low stands around an open pitch, deliberately short of the corners so
     there is a diagonal gap wide enough to drive through. */
  stadium: (box, { halfWidth, halfDepth, height, landmark }) => {
    const stands = [
      box({
        z: landmark.z - halfDepth * 0.82,
        halfWidth: halfWidth * 0.55,
        halfDepth: halfDepth * 0.18,
        windows: false,
      }),
      box({
        z: landmark.z + halfDepth * 0.82,
        halfWidth: halfWidth * 0.55,
        halfDepth: halfDepth * 0.18,
        windows: false,
      }),
      box({
        x: landmark.x - halfWidth * 0.82,
        halfWidth: halfWidth * 0.18,
        halfDepth: halfDepth * 0.55,
        windows: false,
      }),
      box({
        x: landmark.x + halfWidth * 0.82,
        halfWidth: halfWidth * 0.18,
        halfDepth: halfDepth * 0.55,
        windows: false,
      }),
    ];
    const floodlights = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        floodlights.push(
          box({
            x: landmark.x + sx * halfWidth * 0.8,
            z: landmark.z + sz * halfDepth * 0.8,
            halfWidth: 7,
            halfDepth: 7,
            base: height,
            height: 78,
            color: landmark.accent,
            windows: false,
          }),
        );
      }
    }
    return [...stands, ...floodlights];
  },

  cafe: (box, { halfWidth, halfDepth, height, landmark }) => [
    box({ height: height * 0.85 }),
    box({
      base: height * 0.85,
      height: 12,
      halfWidth: halfWidth * 1.2,
      halfDepth: halfDepth * 1.2,
      color: landmark.accent,
      windows: false,
    }),
  ],

  post: (box, { halfWidth, halfDepth, height, landmark }) => [
    box(),
    box({
      base: height,
      height: 14,
      halfWidth: halfWidth * 1.1,
      halfDepth: halfDepth * 1.1,
      color: landmark.accent,
      windows: false,
    }),
  ],
};
