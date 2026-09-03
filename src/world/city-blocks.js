import { LOT_HALF, WORLD, blockCentre } from '../config/world.js';
import { BUILDINGS } from '../config/palette.js';
import { chanceFrom, pickFrom, rangeFrom } from '../core/rng.js';

/** Lots per block edge; the gaps between them are the alleys. */
const LOTS_PER_EDGE = 3;
/** Gap between a lot's edge and its building, in world units. */
const LOT_PADDING = 16;
/** Chance a lot is left as a pocket park instead of built on. */
const PARK_CHANCE = 0.16;

const MIN_HEIGHT = 70;
const MAX_HEIGHT = 310;

/**
 * Fills one ordinary city block with a lattice of buildings.
 *
 * A couple of lots are deliberately left empty as pocket parks, so the city has
 * somewhere to breathe and somewhere to cut through when you are late.
 *
 * @returns {{buildings: object[], props: object[]}}
 */
export function buildBlock(rng, blockX, blockZ) {
  const buildings = [];
  const props = [];
  const span = (LOT_HALF * 2) / LOTS_PER_EDGE;

  for (let i = 0; i < LOTS_PER_EDGE; i += 1) {
    for (let j = 0; j < LOTS_PER_EDGE; j += 1) {
      const lotX = blockX - LOT_HALF + span * (i + 0.5);
      const lotZ = blockZ - LOT_HALF + span * (j + 0.5);

      if (chanceFrom(rng, PARK_CHANCE)) {
        for (let t = 0; t < 3; t += 1) {
          props.push({
            type: 'tree',
            x: lotX + (rng() - 0.5) * span * 0.7,
            z: lotZ + (rng() - 0.5) * span * 0.7,
            height: rangeFrom(rng, 40, 60),
          });
        }
        continue;
      }

      const shrink = rangeFrom(rng, 0.7, 1);
      buildings.push({
        kind: 'block',
        x: lotX,
        z: lotZ,
        halfWidth: (span / 2 - LOT_PADDING) * shrink,
        halfDepth: (span / 2 - LOT_PADDING) * shrink,
        base: 0,
        height: rangeFrom(rng, MIN_HEIGHT, MAX_HEIGHT),
        color: pickFrom(rng, BUILDINGS),
        windows: true,
      });
    }
  }

  return { buildings, props };
}

/** Trees ringing a landmark plaza, plus the signpost at its kerb. */
export function decorateLandmarkPlaza(rng, landmark) {
  const props = [];
  const RING_COUNT = 10;

  for (let i = 0; i < RING_COUNT; i += 1) {
    const angle = (i / RING_COUNT) * Math.PI * 2;
    props.push({
      type: 'tree',
      x: landmark.x + Math.cos(angle) * (LOT_HALF - 26),
      z: landmark.z + Math.sin(angle) * (LOT_HALF - 26),
      height: rangeFrom(rng, 46, 60),
    });
  }

  props.push({
    type: 'sign',
    x: landmark.x,
    z: landmark.z - LOT_HALF + 24,
    height: 54,
    landmarkId: landmark.id,
  });

  return props;
}

/** Every block centre in the grid, as {bi, bj, x, z}. */
export function eachBlock() {
  const blocks = [];
  for (let bi = 0; bi < WORLD.GRID; bi += 1) {
    for (let bj = 0; bj < WORLD.GRID; bj += 1) {
      blocks.push({ bi, bj, x: blockCentre(bi), z: blockCentre(bj) });
    }
  }
  return blocks;
}
