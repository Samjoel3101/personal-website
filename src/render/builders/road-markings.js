import { BOOST_PAD, WORLD, blockCentre } from '../../config/world.js';
import { PROPS, TERRAIN } from '../../config/palette.js';
import { GROUND_LAYER, flatQuad } from '../geometry/flat.js';

const LANE_LINE_INSET = 7;
const LANE_LINE_WIDTH = 3;
const DASH_LENGTH = 24;
const DASH_GAP = 46;
const DASH_WIDTH = 4;
const CROSSING_BARS = 9;
const CROSSING_BAR = { width: 6, length: 14, spacing: 9 };
const KERB_WIDTH = 2.5;

/**
 * Every painted mark on the road, grouped by colour so each becomes one merged
 * geometry and one draw call.
 *
 * @returns {Array<{color: string, geometries: import('three').BufferGeometry[]}>}
 */
export function buildRoadMarkings() {
  const white = [...kerbs(), ...laneLines(), ...crossings()];
  const yellow = centreDashes();
  const pads = boostPads();

  return [
    { color: TERRAIN.MUD, geometries: white },
    { color: TERRAIN.TRACK_WET, geometries: yellow },
    { color: TERRAIN.MUD, geometries: pads.plates },
    { color: PROPS.FLAG_WHITE, geometries: pads.chevrons },
  ];
}

function forEachRoad(make) {
  const out = [];
  for (let g = 0; g < WORLD.GRID; g += 1) out.push(...make(g * WORLD.BLOCK));
  return out;
}

/** A bright edge where the asphalt meets the pavement. */
function kerbs() {
  return forEachRoad((line) => {
    const marks = [];
    for (const side of [-1, 1]) {
      const at = line + side * WORLD.ROAD_HALF;
      marks.push(flatQuad(KERB_WIDTH, WORLD.SIZE, at, WORLD.SIZE / 2, GROUND_LAYER.KERB));
      marks.push(flatQuad(WORLD.SIZE, KERB_WIDTH, WORLD.SIZE / 2, at, GROUND_LAYER.KERB));
    }
    return marks;
  });
}

function laneLines() {
  return forEachRoad((line) => {
    const marks = [];
    for (const side of [-1, 1]) {
      const at = line + side * (WORLD.ROAD_HALF - LANE_LINE_INSET);
      marks.push(flatQuad(LANE_LINE_WIDTH, WORLD.SIZE, at, WORLD.SIZE / 2, GROUND_LAYER.MARKING));
      marks.push(flatQuad(WORLD.SIZE, LANE_LINE_WIDTH, WORLD.SIZE / 2, at, GROUND_LAYER.MARKING));
    }
    return marks;
  });
}

function centreDashes() {
  return forEachRoad((line) => {
    const marks = [];
    for (let along = 0; along < WORLD.SIZE; along += DASH_GAP) {
      const centre = along + DASH_LENGTH / 2;
      marks.push(flatQuad(DASH_WIDTH, DASH_LENGTH, line, centre, GROUND_LAYER.MARKING));
      marks.push(flatQuad(DASH_LENGTH, DASH_WIDTH, centre, line, GROUND_LAYER.MARKING));
    }
    return marks;
  });
}

/** Zebra bars on all four approaches to every junction. */
function crossings() {
  const marks = [];
  const half = (CROSSING_BARS - 1) / 2;
  const stopLine = WORLD.ROAD_HALF - CROSSING_BAR.length / 2 - 2;

  for (let gi = 0; gi < WORLD.GRID; gi += 1) {
    for (let gj = 0; gj < WORLD.GRID; gj += 1) {
      const x = gi * WORLD.BLOCK;
      const z = gj * WORLD.BLOCK;
      for (let i = -half; i <= half; i += 1) {
        const offset = i * CROSSING_BAR.spacing;
        for (const side of [-1, 1]) {
          const { width, length } = CROSSING_BAR;
          marks.push(
            flatQuad(width, length, x + offset, z + side * stopLine, GROUND_LAYER.MARKING),
          );
          marks.push(
            flatQuad(length, width, x + side * stopLine, z + offset, GROUND_LAYER.MARKING),
          );
        }
      }
    }
  }
  return marks;
}

/** Boost pads: a dark plate with three chevrons pointing along the road. */
function boostPads() {
  const plates = [];
  const chevrons = [];
  const across = BOOST_PAD.HALF_ACROSS * 2;
  const along = BOOST_PAD.HALF_ALONG * 2;

  for (let g = 0; g < WORLD.GRID; g += 1) {
    const line = g * WORLD.BLOCK;
    for (let segment = 0; segment < WORLD.GRID; segment += 1) {
      const middle = blockCentre(segment);
      plates.push(flatQuad(across, along, line, middle, GROUND_LAYER.PAD));
      plates.push(flatQuad(along, across, middle, line, GROUND_LAYER.PAD));

      for (let i = 0; i < 3; i += 1) {
        const step = -14 + i * 14;
        chevrons.push(
          flatQuad(across - 10, 5, line, middle + step, GROUND_LAYER.PAD_CHEVRON),
          flatQuad(5, across - 10, middle + step, line, GROUND_LAYER.PAD_CHEVRON),
        );
      }
    }
  }
  return { plates, chevrons };
}
