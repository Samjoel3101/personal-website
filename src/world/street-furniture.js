import { WORLD, blockCentre } from '../config/world.js';
import { VEHICLES } from '../config/palette.js';
import { chanceFrom, pickFrom } from '../core/rng.js';
import { wrap } from '../core/torus.js';
import { trackOffsetAt } from './track.js';

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
/** Distance from the track centre line to the lay-by. */
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
 * Service vehicles pulled onto the verge. They are collidable like anything
 * else, which is what makes the racing line feel like a line rather than an
 * empty corridor. `axis` is the track direction the vehicle is aligned with.
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

/** Fills the four bays (both sides, both track orientations) at one position. */
function fillBays(rng, cars, line, along) {
  const centre = line + trackOffsetAt(along);
  for (const side of [-1, 1]) {
    const lane = side * PARKING_LANE;
    if (chanceFrom(rng, BAY_OCCUPANCY)) {
      cars.push(parkedCar(wrap(centre + lane), wrap(along), 'z', pickFrom(rng, VEHICLES)));
    }
    if (chanceFrom(rng, BAY_OCCUPANCY)) {
      cars.push(parkedCar(wrap(along), wrap(centre + lane), 'x', pickFrom(rng, VEHICLES)));
    }
  }
}

export function buildParkedCars(rng) {
  const cars = [];
  for (let g = 0; g < WORLD.GRID; g += 1) {
    const line = g * WORLD.BLOCK;
    for (let segment = 0; segment < WORLD.GRID; segment += 1) {
      for (const offset of PARKING_OFFSETS) {
        fillBays(rng, cars, line, segment * WORLD.BLOCK + offset);
      }
    }
  }
  return cars;
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
