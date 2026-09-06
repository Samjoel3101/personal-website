import { BOOST_PAD, WORLD, blockCentre } from '../../config/world.js';
import { PROPS, TERRAIN } from '../../config/palette.js';
import { GROUND_LAYER } from '../geometry/flat.js';
import { everyTrackRibbon, trackRibbon } from '../geometry/ribbon.js';

/**
 * Everything painted onto the dirt, grouped by colour so each becomes one
 * merged geometry and one draw call.
 *
 * No lane paint, no dashes, no zebras — a rally stage has none of them. What it
 * has is the marks driving leaves: two tyre ruts down the middle, a ragged wet
 * edge where the dirt frays into the verge, chevrons on the ramps, and one
 * start line under the gantry.
 *
 * Every one of these is a ribbon rather than a quad, because the track snakes.
 * See src/render/geometry/ribbon.js.
 *
 * @returns {Array<{color: string, geometries: import('three').BufferGeometry[]}>}
 */
export function buildTrackDressing() {
  const pads = boostPads();
  const start = startLine();

  return [
    { color: TERRAIN.MUD, geometries: mudEdges() },
    { color: TERRAIN.TRACK_WET, geometries: ruts() },
    { color: TERRAIN.MUD, geometries: pads.plates },
    { color: PROPS.FLAG_WHITE, geometries: pads.chevrons },
    { color: PROPS.TYRE, geometries: start.dark },
    { color: PROPS.FLAG_WHITE, geometries: start.light },
  ];
}

/** Distance from the centre line to each wheel track. */
const RUT_LATERAL = 15;
const RUT_HALF_WIDTH = 4;
/** Half-width of the wet, churned band along each edge of the dirt. */
const EDGE_HALF_WIDTH = 5;

/** Two wheel tracks worn down the middle of the stage. */
function ruts() {
  return [-RUT_LATERAL, RUT_LATERAL].flatMap((lateral) =>
    everyTrackRibbon({ halfWidth: RUT_HALF_WIDTH, y: GROUND_LAYER.RUT, lateral }),
  );
}

/** The churned edge where the dirt gives way to grass. */
function mudEdges() {
  return [-WORLD.ROAD_HALF, WORLD.ROAD_HALF].flatMap((lateral) =>
    everyTrackRibbon({ halfWidth: EDGE_HALF_WIDTH, y: GROUND_LAYER.MUD_EDGE, lateral }),
  );
}

/**
 * Boost ramps: a dark churned plate with three chevrons pointing down the
 * stage.
 *
 * They sit at block midpoints, where trackOffsetAt is exactly zero — but the
 * track is at its steepest angle there, so the plate has to be a ribbon like
 * everything else or its corners hang off the dirt.
 */
function boostPads() {
  const plates = [];
  const chevrons = [];

  for (let g = 0; g < WORLD.GRID; g += 1) {
    const line = g * WORLD.BLOCK;
    for (let segment = 0; segment < WORLD.GRID; segment += 1) {
      const middle = blockCentre(segment);
      for (const axis of ['z', 'x']) {
        plates.push(
          trackRibbon({
            line,
            axis,
            halfWidth: BOOST_PAD.HALF_ACROSS,
            y: GROUND_LAYER.PAD,
            from: middle - BOOST_PAD.HALF_ALONG,
            to: middle + BOOST_PAD.HALF_ALONG,
            segments: 4,
          }),
        );
        chevrons.push(...chevronsAt(line, axis, middle));
      }
    }
  }
  return { plates, chevrons };
}

const CHEVRON_COUNT = 3;
const CHEVRON_SPACING = 14;
const CHEVRON_LENGTH = 5;

function chevronsAt(line, axis, middle) {
  const bars = [];
  for (let i = 0; i < CHEVRON_COUNT; i += 1) {
    const at = middle + (i - (CHEVRON_COUNT - 1) / 2) * CHEVRON_SPACING;
    bars.push(
      trackRibbon({
        line,
        axis,
        halfWidth: BOOST_PAD.HALF_ACROSS - 5,
        y: GROUND_LAYER.PAD_CHEVRON,
        from: at - CHEVRON_LENGTH / 2,
        to: at + CHEVRON_LENGTH / 2,
        segments: 1,
      }),
    );
  }
  return bars;
}

/** Chequered squares across the stage at the junction the gantry stands over. */
const START_SQUARES = 8;
const START_DEPTH = 9;

function startLine() {
  const dark = [];
  const light = [];
  const width = (WORLD.ROAD_HALF * 2) / START_SQUARES;

  for (let i = 0; i < START_SQUARES; i += 1) {
    const square = trackRibbon({
      line: 0,
      axis: 'z',
      halfWidth: width / 2,
      y: GROUND_LAYER.START_LINE,
      from: -START_DEPTH / 2,
      to: START_DEPTH / 2,
      lateral: -WORLD.ROAD_HALF + (i + 0.5) * width,
      segments: 1,
    });
    (i % 2 === 0 ? dark : light).push(square);
  }

  return { dark, light };
}
