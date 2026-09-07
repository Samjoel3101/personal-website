import { TRAFFIC } from '../config/tuning.js';
import { WORLD, blockCentre } from '../config/world.js';
import { VEHICLES } from '../config/palette.js';
import { chanceFrom, pickFrom, rangeFrom } from '../core/rng.js';
import { wrap } from '../core/torus.js';
import { trackOffsetAt } from './track.js';
import { trafficCar } from './traffic.js';

/**
 * Everything that lines the track: marker posts, abandoned service vehicles and
 * the boost ramps.
 *
 * Every position here is measured from the TRACK centre line, not from the grid
 * line the track nominally follows — so each one adds trackOffsetAt for the
 * point it sits at. Miss that and a marker post ends up in the middle of the
 * racing line, sixty units from the edge it was supposed to mark.
 */

/** Spacing of corner marker posts down a verge. */
const POST_SPACING = 160;
const POST_HEIGHT = 78;

/** Offsets within each block segment where a service vehicle is pulled over.
 *  Chosen to clear both the junction and the boost pad at the midpoint — and
 *  they sit at the wobble's extremes, where the track runs straight, so an
 *  axis-aligned vehicle still looks parallel to the dirt. */
const PARKING_OFFSETS = [130, 380];
/** Distance from the track centre line to the lay-by. Inside ROAD_HALF, so a
 *  parked vehicle narrows the dirt rather than standing clear of it. */
const PARKING_LANE = 35;
const BAY_OCCUPANCY = 0.5;

/** Marker posts down both verges of every track. */
export function buildLamps() {
  const props = [];
  const vergeOffset = WORLD.ROAD_HALF + WORLD.WALK * 0.5;

  for (let g = 0; g < WORLD.GRID; g += 1) {
    const line = g * WORLD.BLOCK;
    for (let along = 0; along < WORLD.SIZE; along += POST_SPACING) {
      for (const side of [-1, 1]) {
        const offset = side * vergeOffset;
        const downZ = wrap(along + 40);
        const downX = wrap(along + 120);
        props.push({
          type: 'lamp',
          x: wrap(line + trackOffsetAt(downZ) + offset),
          z: downZ,
          height: POST_HEIGHT,
        });
        props.push({
          type: 'lamp',
          x: downX,
          z: wrap(line + trackOffsetAt(downX) + offset),
          height: POST_HEIGHT,
        });
      }
    }
  }
  return props;
}

/**
 * Service vehicles pulled over at the edge of the dirt. They stand ON the
 * track, not on the verge — PARKING_LANE is inside ROAD_HALF — and that is the
 * point: they are collidable like anything else, which is what makes the racing
 * line feel like a line rather than an empty corridor. tests/city.test.js pins
 * the lane they leave clear. `axis` is the track direction the vehicle is
 * aligned with.
 */
function parkedCar(x, z, axis, color) {
  const alongZ = axis === 'z';
  return {
    kind: 'car',
    x,
    z,
    halfWidth: alongZ ? 8 : 20,
    halfDepth: alongZ ? 20 : 8,
    base: 0,
    height: 11,
    cabinHeight: 7,
    color,
    windows: false,
  };
}

/** Every station down one strip: the lay-bys of all four segments. */
const STATIONS = Array.from({ length: WORLD.GRID }, (_, segment) =>
  PARKING_OFFSETS.map((offset) => segment * WORLD.BLOCK + offset),
).flat();

/**
 * Fills one strip — one lane of one track — with vehicles.
 *
 * A strip is either driven or parked in, never both. The two share a lane, and
 * traffic neither swerves nor brakes, so a parked vehicle in a lane somebody is
 * driving down is a collision waiting for the seed to line it up. Everything on
 * a driven strip travels at that strip's one speed, which is what keeps the
 * vehicles on it exactly as far apart as the stations put them.
 */
function fillStrip(rng, bays, line, axis, side) {
  const driven = chanceFrom(rng, TRAFFIC.SHARE);
  const strip = { line, axis, side, speed: rangeFrom(rng, TRAFFIC.SPEED_MIN, TRAFFIC.SPEED_MAX) };

  for (const along of STATIONS) {
    if (!chanceFrom(rng, BAY_OCCUPANCY)) continue;
    if (driven) {
      bays.traffic.push(trafficCar(rng, strip, along));
      continue;
    }
    const centre = line + trackOffsetAt(along) + side * PARKING_LANE;
    const colour = pickFrom(rng, VEHICLES);
    bays.parked.push(
      axis === 'z'
        ? parkedCar(wrap(centre), wrap(along), 'z', colour)
        : parkedCar(wrap(along), wrap(centre), 'x', colour),
    );
  }
}

/**
 * Every lay-by on the stage, filled or not.
 *
 * @returns {{parked: object[], traffic: object[]}}
 */
export function buildVehicles(rng) {
  const bays = { parked: [], traffic: [] };
  for (let g = 0; g < WORLD.GRID; g += 1) {
    for (const axis of ['z', 'x']) {
      for (const side of [-1, 1]) fillStrip(rng, bays, g * WORLD.BLOCK, axis, side);
    }
  }
  return bays;
}

/**
 * One boost ramp at the middle of every track segment.
 *
 * No offset is applied and none is needed: trackOffsetAt is exactly zero at
 * every block midpoint by construction, which is the whole reason the wobble
 * has a period of one block. See src/world/track.js.
 */
export function buildBoostPads() {
  const pads = [];
  for (let g = 0; g < WORLD.GRID; g += 1) {
    const line = g * WORLD.BLOCK;
    for (let segment = 0; segment < WORLD.GRID; segment += 1) {
      const middle = blockCentre(segment);
      pads.push({ x: line, z: middle, orientation: 'z' });
      pads.push({ x: middle, z: line, orientation: 'x' });
    }
  }
  return pads;
}
