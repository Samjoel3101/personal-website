import { TRAFFIC } from '../config/tuning.js';
import { VEHICLES } from '../config/palette.js';
import { pickFrom, rangeFrom } from '../core/rng.js';
import { trackOffsetAt, trackSlopeAt } from './track.js';
import { wrap } from '../core/torus.js';

/**
 * The vehicles that drive rather than sit.
 *
 * They are the same boxes the parked ones are, and the collider list holds the
 * same object references the renderer draws — so moving one is a matter of
 * writing x and z, with nothing to rebuild and not a line of src/physics that
 * has to know traffic exists.
 *
 * Position is never integrated in x and z. A vehicle advances `along` its
 * track and re-derives its cross-axis coordinate from the track curve, so it
 * holds exactly `lane` from the centre line forever, wobble and seam included.
 * Integrating a world position instead would drift off the line within a lap
 * and put a truck in the hedge.
 */

/** Traffic keeps right: on a Z line the +x lane runs toward +z, and on an X
 *  line the +z lane runs toward -x. Two vehicles meeting head-on are therefore
 *  never in the same strip of dirt. */
const directionFor = (axis, side) => (axis === 'z' ? side : -side);

/**
 * One vehicle pulling out of the lay-by at (`line`, `along`) on `side`.
 *
 * Same shape as a parked one — the physics reads an axis-aligned box either
 * way — but carrying the progress, lane and speed that `createTraffic`
 * advances.
 */
export function trafficCar(rng, line, along, axis, side) {
  const alongZ = axis === 'z';
  const car = {
    kind: 'car',
    moving: true,
    axis,
    line,
    along: wrap(along),
    lane: side * TRAFFIC.LANE,
    direction: directionFor(axis, side),
    speed: rangeFrom(rng, TRAFFIC.SPEED_MIN, TRAFFIC.SPEED_MAX),
    x: 0,
    z: 0,
    heading: 0,
    yaw: 0,
    halfWidth: alongZ ? 8 : 20,
    halfDepth: alongZ ? 20 : 8,
    base: 0,
    height: 11,
    cabinHeight: 7,
    color: pickFrom(rng, VEHICLES),
    windows: false,
  };
  seat(car);
  return car;
}

/**
 * @param {object[]} cars
 * @returns {{cars: object[], update: (dt: number) => void}}
 */
export function createTraffic(cars) {
  return {
    cars,

    /**
     * Advances every vehicle. A pure function of accumulated time — no rng at
     * runtime — so the same number of steps from the same seed always puts the
     * traffic in the same place, which is what a test can pin.
     */
    update(dt) {
      for (const car of cars) {
        car.along = wrap(car.along + car.speed * car.direction * dt);
        seat(car);
      }
    },
  };
}

/**
 * Writes the world position, travel heading and drawn yaw a vehicle's progress
 * implies.
 *
 * Two angles, because they are two different things. `heading` is the way the
 * vehicle is travelling. `yaw` is how far its box is turned off the axis it
 * was authored along, which is the track's own gradient and never more than
 * about 35 degrees — the collision box stays axis-aligned through it, exactly
 * as a parked vehicle's does. Drawing the box at `heading` instead would lay
 * every vehicle on an X line broadside across the road.
 */
function seat(car) {
  const across = wrap(car.line + trackOffsetAt(car.along) + car.lane);
  const alongZ = car.axis === 'z';
  car.x = alongZ ? across : wrap(car.along);
  car.z = alongZ ? wrap(car.along) : across;

  const slope = trackSlopeAt(car.along);
  const vx = alongZ ? slope : 1;
  const vz = alongZ ? 1 : slope;
  car.heading = Math.atan2(car.direction * vx, car.direction * vz);
  car.yaw = alongZ ? Math.atan(slope) : -Math.atan(slope);
}
