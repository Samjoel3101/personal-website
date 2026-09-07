import { describe, expect, it } from 'vitest';
import { KART } from '../src/config/tuning.js';
import { WORLD } from '../src/config/world.js';
import { createEmitter } from '../src/core/emitter.js';
import { createKart } from '../src/physics/kart.js';
import { resolveAll } from '../src/physics/collision.js';
import { createCity } from '../src/world/city.js';
import { distanceAcrossTrack } from '../src/world/track.js';
import { wrapDelta, wrapDistance } from '../src/core/torus.js';

const STEP = 1 / 120;

/** A fresh stage per case: traffic is mutable state, and a suite that shared
 *  one would make every case depend on the order the others ran in. */
function stage() {
  const city = createCity();
  return { city, moving: city.cars.filter((car) => car.moving) };
}

/** How far a vehicle sits from the centre line of the track it is driving
 *  down, measured across that track exactly as the surface sampler does. */
function laneDistance(car) {
  return car.axis === 'z' ? distanceAcrossTrack(car.x, car.z) : distanceAcrossTrack(car.z, car.x);
}

/** Its half-extent across that same track. */
const halfAcross = (car) => (car.axis === 'z' ? car.halfWidth : car.halfDepth);

/** Do two axis-aligned boxes on the torus overlap? */
const overlaps = (a, b) =>
  Math.abs(wrapDelta(a.x - b.x)) < a.halfWidth + b.halfWidth &&
  Math.abs(wrapDelta(a.z - b.z)) < a.halfDepth + b.halfDepth;

/** The four corners of a vehicle's body as drawn: its own box, yawed. */
function drawnCorners(car) {
  const sin = Math.sin(car.yaw);
  const cos = Math.cos(car.yaw);
  const corners = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * car.bodyHalfWidth;
      const z = sz * car.bodyHalfDepth;
      corners.push({ x: x * cos + z * sin, z: -x * sin + z * cos });
    }
  }
  return corners;
}

function step(city, seconds) {
  for (let t = 0; t < seconds; t += STEP) city.traffic.update(STEP);
}

/**
 * Runs `check` after every physics step rather than every so often.
 *
 * A vehicle at SPEED_MAX covers 27 units between quarter-second samples and a
 * parked one is 24 long, so a sampled check can step clean over the very
 * overlap it exists to catch. These properties are meant to hold at every
 * instant, so they are asserted at every instant.
 */
function eachTick(city, seconds, check) {
  for (let t = 0; t < seconds; t += STEP) {
    city.traffic.update(STEP);
    check();
  }
}

describe('moving traffic', () => {
  it('puts some vehicles on the move and leaves the rest parked', () => {
    const { city, moving } = stage();
    expect(moving.length).toBeGreaterThan(5);
    expect(city.cars.length - moving.length).toBeGreaterThan(5);
  });

  it('is deterministic, at build and after the same number of steps', () => {
    const first = stage();
    const second = stage();
    expect(JSON.stringify(second.moving)).toBe(JSON.stringify(first.moving));

    step(first.city, 3);
    step(second.city, 3);
    expect(JSON.stringify(second.moving)).toBe(JSON.stringify(first.moving));
  });

  it('holds its lane for as long as it drives', () => {
    // The bound tests/city.test.js puts on a parked vehicle, asserted over
    // time: because `lane` is constant and the cross-axis coordinate is
    // re-derived from the track curve, it holds at every instant rather than
    // only where the vehicle happened to start.
    const { city, moving } = stage();
    for (let sample = 0; sample < 8; sample += 1) {
      step(city, 0.75);
      for (const car of moving) {
        const where = `${car.axis} vehicle at ${Math.round(car.along)} along`;
        expect(laneDistance(car) - halfAcross(car), where).toBeGreaterThan(20);
        expect(laneDistance(car) + halfAcross(car), where).toBeLessThanOrEqual(WORLD.ROAD_HALF);
      }
    }
  });

  it('comes back to where it started after a full lap of the world', () => {
    const { city, moving } = stage();
    const car = moving[0];
    const start = { x: car.x, z: car.z };

    // One world length at this vehicle's own speed. Everything else on the
    // stage moves too; only this one is asked to arrive.
    const steps = 4096;
    const dt = WORLD.SIZE / car.speed / steps;
    for (let i = 0; i < steps; i += 1) city.traffic.update(dt);

    expect(wrapDistance(car.x, car.z, start.x, start.z)).toBeLessThan(0.01);
  });

  it('is collided against where it is now, not where it was built', () => {
    const { city, moving } = stage();
    const car = moving[0];
    const spot = { x: car.x, z: car.z };

    expect(resolveAll(spot.x, spot.z, KART.RADIUS, city.colliders).contact).not.toBeNull();
    step(city, 1);
    // A vehicle doing at least SPEED_MIN clears its own length in a second, so
    // the same point is now open road — which is only true because the
    // collider list holds the very object the traffic moved.
    expect(resolveAll(spot.x, spot.z, KART.RADIUS, city.colliders).contact).toBeNull();
  });

  it('never starts on top of the kart', () => {
    const { city, moving } = stage();
    const kart = createKart({ city, emitter: createEmitter() });
    for (const car of moving) {
      const gap = wrapDistance(car.x, car.z, kart.state.x, kart.state.z);
      expect(gap, `vehicle at ${Math.round(car.x)},${Math.round(car.z)}`).toBeGreaterThan(
        KART.RADIUS * 2,
      );
    }
  });

  it('is collided against a box that covers the vehicle it draws', () => {
    // The physics only knows axis-aligned boxes, so a yawed vehicle's box is
    // the bounding box of its body. Of the two ways to be wrong, a box
    // narrower than the picture is the one the player feels: it drives through
    // ten units of visibly solid truck.
    const { city, moving } = stage();
    const escaped = [];
    eachTick(city, 10, () => {
      for (const car of moving) {
        for (const corner of drawnCorners(car)) {
          const out =
            Math.abs(corner.x) > car.halfWidth + 1e-9 || Math.abs(corner.z) > car.halfDepth + 1e-9;
          if (out) escaped.push(Math.round((car.yaw * 180) / Math.PI));
        }
      }
    });
    expect(escaped).toEqual([]);
  });

  it('never drives through a parked vehicle', () => {
    // A driven strip carries no parked vehicles at all: they share a lane, and
    // traffic neither swerves nor brakes.
    const { city, moving } = stage();
    const parked = city.cars.filter((car) => !car.moving);
    expect(parked.length).toBeGreaterThan(5);

    const hits = [];
    eachTick(city, 10, () => {
      for (const car of moving) {
        for (const still of parked) {
          if (overlaps(car, still)) hits.push(`${Math.round(car.x)},${Math.round(car.z)}`);
        }
      }
    });
    expect(hits).toEqual([]);
  });

  it('never drives through traffic sharing its lane', () => {
    // Everything on one strip runs at that strip's speed, so the gap the
    // stations gave them is the gap they keep. Vehicles on crossing tracks do
    // meet at junctions: traffic that dodges is out of scope.
    const { city, moving } = stage();
    const hits = [];
    eachTick(city, 10, () => {
      for (let i = 0; i < moving.length; i += 1) {
        for (let j = i + 1; j < moving.length; j += 1) {
          const a = moving[i];
          const b = moving[j];
          if (a.axis === b.axis && a.line === b.line && a.lane === b.lane && overlaps(a, b)) {
            hits.push(`${a.axis} line ${a.line}`);
          }
        }
      }
    });
    expect(hits).toEqual([]);
  });
});
