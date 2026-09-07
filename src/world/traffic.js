import { TRAFFIC } from '../config/tuning.js';
import { VEHICLES } from '../config/palette.js';
import { pickFrom } from '../core/rng.js';
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
 * One vehicle on `strip` — a lane of one track, as `{line, axis, side, speed}`
 * — starting at `along`.
 *
 * The speed belongs to the strip rather than to the vehicle: everything
 * sharing a lane travels at one speed and so keeps the spacing it started
 * with, for as long as it drives.
 */
export function trafficCar(rng, strip, along) {
  const { line, axis, side } = strip;
  const alongZ = axis === 'z';
  const car = {
    kind: 'car',
    moving: true,
    axis,
    line,
    along: wrap(along),
    lane: side * TRAFFIC.LANE,
    direction: directionFor(axis, side),
    speed: strip.speed,
    x: 0,
    z: 0,
    heading: 0,
    yaw: 0,
    /* The body as drawn: axis-aligned half-extents, which is what the renderer
       scales its box to before yawing it. halfWidth and halfDepth below are
       the collision box, and they are not the same numbers. */
    bodyHalfWidth: alongZ ? TRAFFIC.HALF_ACROSS : TRAFFIC.HALF_ALONG,
    bodyHalfDepth: alongZ ? TRAFFIC.HALF_ALONG : TRAFFIC.HALF_ACROSS,
    halfWidth: 0,
    halfDepth: 0,
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
 * Writes the position, the two angles and the collision box a vehicle's
 * progress implies.
 *
 * Two angles, because they are two different things. `heading` is the way the
 * vehicle is travelling. `yaw` is how far its box is turned off the axis it
 * was authored along, which is the track's own gradient — up to 35 degrees at
 * the steepest part of the wobble. Drawing the box at `heading` instead would
 * lay every vehicle on an X line broadside across the road.
 *
 * The collision box is the bounding box of that yawed body, recomputed here
 * rather than fixed at build time. The physics only knows axis-aligned boxes,
 * and of the two ways to be wrong — a box narrower than the picture, so the
 * kart drives through ten units of visibly solid truck, or one wider, so it
 * clips an empty corner — only the second is survivable. The lane and the body
 * size are chosen so even the widest of these still leaves the racing line
 * clear; tests/traffic.test.js pins that across time.
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

  const sin = Math.abs(Math.sin(car.yaw));
  const cos = Math.abs(Math.cos(car.yaw));
  const swept = TRAFFIC.HALF_ACROSS * cos + TRAFFIC.HALF_ALONG * sin;
  const long = TRAFFIC.HALF_ACROSS * sin + TRAFFIC.HALF_ALONG * cos;
  car.halfWidth = alongZ ? swept : long;
  car.halfDepth = alongZ ? long : swept;
}
