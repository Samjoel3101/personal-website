import { beforeEach, describe, expect, it } from 'vitest';
import { KART } from '../src/config/tuning.js';
import { SURFACE, WORLD, blockCentre } from '../src/config/world.js';
import { createEmitter } from '../src/core/emitter.js';
import { createKart } from '../src/physics/kart.js';
import { resolveAgainstBox } from '../src/physics/collision.js';
import { wrap } from '../src/core/torus.js';
import { createCity } from '../src/world/city.js';
import { trackOffsetAt } from '../src/world/track.js';

const city = createCity();
const STEP = 1 / 120;
const NOTHING = { accelerate: false, brake: false, left: false, right: false, drift: false };

function drive(kart, input, seconds) {
  for (let t = 0; t < seconds; t += STEP) kart.update(STEP, { ...NOTHING, ...input });
}

/**
 * Drives down a track line, holding the kart on the centre line as it snakes.
 *
 * The track is a sine with a period of one block, so a kart driven in a
 * straight line for more than a couple of seconds is a kart in a field —
 * which measures the map rather than the handling. Re-seating x each step
 * reproduces exactly the run these tests used to get from a straight road,
 * and it keeps the surface honestly SURFACE.TRACK the whole way.
 */
function driveTrack(kart, line, input, seconds) {
  for (let t = 0; t < seconds; t += STEP) {
    kart.state.x = wrap(line + trackOffsetAt(kart.state.z));
    kart.update(STEP, { ...NOTHING, ...input });
  }
}

/** Puts the kart on the centre line of the track running down `line`. */
function placeOnTrack(kart, line, z) {
  kart.state.z = z;
  kart.state.x = wrap(line + trackOffsetAt(z));
}

describe('kart physics', () => {
  let kart;
  let emitter;
  let events;

  beforeEach(() => {
    emitter = createEmitter();
    events = [];
    emitter.on('kart:bump', () => events.push('bump'));
    emitter.on('kart:boost', () => events.push('boost'));
    kart = createKart({ city, emitter });
  });

  it('accelerates and then settles at a top speed', () => {
    driveTrack(kart, WORLD.BLOCK, { accelerate: true }, 1);
    const early = kart.state.speed;
    expect(early).toBeGreaterThan(50);

    driveTrack(kart, WORLD.BLOCK, { accelerate: true }, 12);
    expect(kart.state.surface).toBe(SURFACE.TRACK);
    expect(kart.state.speed).toBeGreaterThan(early);
    expect(kart.state.speed).toBeLessThanOrEqual(KART.MAX_SPEED + 1);
  });

  it('sheds speed when the throttle is released', () => {
    // Set the speed rather than driving up to it. Boost pads sit at every
    // block midpoint, 512 apart, and a kart at full speed covers that in two
    // seconds — so any run long enough to accelerate is long enough to cross
    // one, which would push the speed up rather than down.
    placeOnTrack(kart, WORLD.BLOCK, blockCentre(0) + 120);
    kart.state.speed = 200;
    drive(kart, {}, 0.4);
    expect(kart.state.speed).toBeLessThan(200);
    expect(kart.state.surface).not.toBe(SURFACE.BOOST);
  });

  it('snaps to a complete stop below walking pace', () => {
    kart.state.speed = 3;
    kart.update(STEP, NOTHING);
    expect(kart.state.speed).toBe(0);
  });

  it('cannot be steered while stationary', () => {
    const heading = kart.state.heading;
    drive(kart, { left: true }, 2);
    expect(kart.state.heading).toBeCloseTo(heading, 6);
  });

  it('steers once it is moving', () => {
    drive(kart, { accelerate: true }, 2);
    const heading = kart.state.heading;
    drive(kart, { accelerate: true, left: true }, 2);
    expect(kart.state.heading).not.toBeCloseTo(heading, 3);
  });

  it('grants boost on a pad and exceeds the normal top speed', () => {
    placeOnTrack(kart, WORLD.BLOCK, blockCentre(0) - 60);
    driveTrack(kart, WORLD.BLOCK, { accelerate: true }, 6);
    expect(events).toContain('boost');
    expect(kart.state.speed).toBeGreaterThan(KART.MAX_SPEED);
  });

  it('is slower in a field than on the track', () => {
    const onTrack = createKart({ city, emitter: createEmitter() });
    driveTrack(onTrack, WORLD.BLOCK, { accelerate: true }, 10);

    const offTrack = createKart({ city, emitter: createEmitter() });
    offTrack.state.x = 768;
    offTrack.state.z = 1792; // an ordinary block interior
    drive(offTrack, { accelerate: true }, 10);

    expect(onTrack.state.surface).toBe(SURFACE.TRACK);
    expect(offTrack.state.surface).toBe(SURFACE.FIELD);
    expect(offTrack.state.speed).toBeLessThan(onTrack.state.speed * 0.7);
  });

  it('keeps its position inside the world', () => {
    drive(kart, { accelerate: true, right: true }, 40);
    expect(kart.state.x).toBeGreaterThanOrEqual(0);
    expect(kart.state.x).toBeLessThan(WORLD.SIZE);
    expect(kart.state.z).toBeGreaterThanOrEqual(0);
    expect(kart.state.z).toBeLessThan(WORLD.SIZE);
  });

  it('never comes to rest inside a building', () => {
    for (const heading of [0, 1, 2, 3, 4, 5]) {
      const runner = createKart({ city, emitter: createEmitter() });
      runner.state.heading = heading;
      drive(runner, { accelerate: true }, 25);

      const inside = city.colliders.some(
        (box) => resolveAgainstBox(runner.state.x, runner.state.z, 1, box) !== null,
      );
      expect(inside, `heading ${heading} ended inside a building`).toBe(false);
    }
  });

  it('announces a hard impact', () => {
    // Point at the tower's block and drive into it.
    kart.state.x = 256;
    kart.state.z = 60;
    kart.state.heading = 0;
    drive(kart, { accelerate: true }, 8);
    expect(events).toContain('bump');
  });
});
