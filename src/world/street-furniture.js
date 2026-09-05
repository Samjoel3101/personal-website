import { WORLD, blockCentre } from '../config/world.js';
import { VEHICLES } from '../config/palette.js';
import { chanceFrom, pickFrom } from '../core/rng.js';
import { wrap } from '../core/torus.js';

/** Spacing of street lamps along a kerb. */
const LAMP_SPACING = 160;
const LAMP_HEIGHT = 78;

/** Offsets within each block segment where a parking bay exists. Chosen to
 *  clear both the junction crosswalks and the boost pad at the midpoint. */
const PARKING_OFFSETS = [130, 380];
/** Distance from the road centre line to the parking lane. */
const PARKING_LANE = 35;
const BAY_OCCUPANCY = 0.5;

/** Street lamps down both kerbs of every road. */
export function buildLamps() {
  const props = [];
  const kerbOffset = WORLD.ROAD_HALF + WORLD.WALK * 0.5;

  for (let g = 0; g < WORLD.GRID; g += 1) {
    const line = g * WORLD.BLOCK;
    for (let along = 0; along < WORLD.SIZE; along += LAMP_SPACING) {
      for (const side of [-1, 1]) {
        const offset = side * kerbOffset;
        props.push({
          type: 'lamp',
          x: wrap(line + offset),
          z: wrap(along + 40),
          height: LAMP_HEIGHT,
        });
        props.push({
          type: 'lamp',
          x: wrap(along + 120),
          z: wrap(line + offset),
          height: LAMP_HEIGHT,
        });
      }
    }
  }
  return props;
}

/**
 * Parked cars down the kerbside. They are collidable like anything else, which
 * is what makes the driving lane feel like a lane rather than an empty
 * corridor. `axis` is the road direction the car is aligned with.
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

/** Fills the four bays (both sides, both road orientations) at one position. */
function fillBays(rng, cars, line, along) {
  for (const side of [-1, 1]) {
    const lane = side * PARKING_LANE;
    if (chanceFrom(rng, BAY_OCCUPANCY)) {
      cars.push(parkedCar(wrap(line + lane), wrap(along), 'z', pickFrom(rng, VEHICLES)));
    }
    if (chanceFrom(rng, BAY_OCCUPANCY)) {
      cars.push(parkedCar(wrap(along), wrap(line + lane), 'x', pickFrom(rng, VEHICLES)));
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

/** One boost pad on each approach to the middle of every road segment. */
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
