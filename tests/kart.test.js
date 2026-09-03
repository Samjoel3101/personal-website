import { beforeEach, describe, expect, it } from 'vitest';
import { KART } from '../src/config/tuning.js';
import { SURFACE, WORLD, blockCentre } from '../src/config/world.js';
import { createEmitter } from '../src/core/emitter.js';
import { createKart } from '../src/physics/kart.js';
import { resolveAgainstBox } from '../src/physics/collision.js';
import { createCity } from '../src/world/city.js';

const city = createCity();
const STEP = 1 / 120;
const NOTHING = { accelerate: false, brake: false, left: false, right: false, drift: false };

function drive(kart, input, seconds) {
  for (let t = 0; t < seconds; t += STEP) kart.update(STEP, { ...NOTHING, ...input });
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
    drive(kart, { accelerate: true }, 1);
    const early = kart.state.speed;
    expect(early).toBeGreaterThan(50);

    drive(kart, { accelerate: true }, 12);
    expect(kart.state.speed).toBeGreaterThan(early);
    expect(kart.state.speed).toBeLessThanOrEqual(KART.MAX_SPEED + 1);
  });

  it('sheds speed when the throttle is released', () => {
    // Set the speed rather than driving up to it. Boost pads sit at every
    // block midpoint, 512 apart, and a kart at full speed covers that in two
    // seconds — so any run long enough to accelerate is long enough to cross
    // one, which would push the speed up rather than down.
    kart.state.z = blockCentre(0) + 120;
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
    kart.state.x = WORLD.BLOCK;
    kart.state.z = blockCentre(0) - 60;
    drive(kart, { accelerate: true }, 6);
    expect(events).toContain('boost');
    expect(kart.state.speed).toBeGreaterThan(KART.MAX_SPEED);
  });

  it('is slower off-road than on it', () => {
    const onRoad = createKart({ city, emitter: createEmitter() });
    drive(onRoad, { accelerate: true }, 10);

    const offRoad = createKart({ city, emitter: createEmitter() });
    offRoad.state.x = 768;
    offRoad.state.z = 1792; // an ordinary block interior
    drive(offRoad, { accelerate: true }, 10);

    expect(offRoad.state.surface).toBe(SURFACE.GRASS);
    expect(offRoad.state.speed).toBeLessThan(onRoad.state.speed * 0.7);
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
