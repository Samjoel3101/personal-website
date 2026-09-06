import { describe, expect, it } from 'vitest';
import { LOT_HALF, SURFACE, WORLD } from '../src/config/world.js';
import { LANDMARKS } from '../src/content/resume.js';
import { wrapDelta } from '../src/core/torus.js';
import { createKart } from '../src/physics/kart.js';
import { createEmitter } from '../src/core/emitter.js';
import { createCity } from '../src/world/city.js';
import { distanceAcrossTrack, distanceToTrack } from '../src/world/track.js';

const city = createCity();

/**
 * Invariants that make the stage drivable. Each of these, broken, produces a
 * bug that is invisible until someone drives into that specific corner of the
 * map — which is exactly the class of bug worth spending CI time on.
 */
describe('stage generation', () => {
  it('is deterministic', () => {
    const again = createCity();
    expect(JSON.stringify(again.scenery)).toBe(JSON.stringify(city.scenery));
    expect(JSON.stringify(again.cars)).toBe(JSON.stringify(city.cars));
    expect(JSON.stringify(again.puddles)).toBe(JSON.stringify(city.puddles));
  });

  it('differs when seeded differently', () => {
    const other = createCity(11);
    expect(JSON.stringify(other.scenery)).not.toBe(JSON.stringify(city.scenery));
  });

  it('keeps every piece of scenery clear of the track, wherever it has wandered', () => {
    // Stronger than the old "never puts a building on a road": the track
    // snakes, so a footprint that clears its grid line can still be sitting in
    // the dirt. This walks the actual centre line past every box.
    //
    // Service vehicles are the deliberate exception — they park ON the dirt,
    // and the lane test below is their equivalent.
    for (const box of city.scenery) {
      const where = `${box.kind} at ${Math.round(box.x)},${Math.round(box.z)}`;
      expect(distanceAcrossTrack(box.x, box.z) - box.halfWidth, where).toBeGreaterThanOrEqual(
        WORLD.ROAD_HALF,
      );
      expect(distanceAcrossTrack(box.z, box.x) - box.halfDepth, where).toBeGreaterThanOrEqual(
        WORLD.ROAD_HALF,
      );
      expect(distanceToTrack(box.x, box.z), where).toBeGreaterThan(WORLD.ROAD_HALF);
    }
  });

  it('keeps every piece of scenery inside its block', () => {
    for (const box of city.scenery) {
      for (const [coord, half] of [
        [box.x, box.halfWidth],
        [box.z, box.halfDepth],
      ]) {
        const centre =
          Math.round((coord - WORLD.BLOCK / 2) / WORLD.BLOCK) * WORLD.BLOCK + WORLD.BLOCK / 2;
        expect(Math.abs(wrapDelta(coord - centre)) + half).toBeLessThanOrEqual(LOT_HALF + 0.001);
      }
    }
  });

  it('leaves the racing line clear of parked vehicles', () => {
    for (const car of city.cars) {
      const acrossX = distanceAcrossTrack(car.x, car.z);
      const acrossZ = distanceAcrossTrack(car.z, car.x);
      const across = Math.min(acrossX, acrossZ);
      const half = acrossX < acrossZ ? car.halfWidth : car.halfDepth;
      // Inner edge must leave more than a kart's width of lane.
      expect(across - half).toBeGreaterThan(20);
      // Outer edge must stay on the dirt.
      expect(across + half).toBeLessThanOrEqual(WORLD.ROAD_HALF);
    }
  });

  it('gives every landmark a paddock to stand on', () => {
    for (const landmark of LANDMARKS) {
      expect(city.surfaceAt(landmark.x, landmark.z)).toBe(SURFACE.PADDOCK);
    }
  });

  it('spawns the kart on the track and not beside it', () => {
    const kart = createKart({ city, emitter: createEmitter() });
    expect(city.surfaceAt(kart.state.x, kart.state.z)).toBe(SURFACE.TRACK);
  });

  it('tags landmark geometry so bumping into it counts as arriving', () => {
    for (const landmark of LANDMARKS) {
      const owned = city.colliders.filter((box) => box.landmarkId === landmark.id);
      expect(owned.length).toBeGreaterThan(0);
    }
  });

  it('only offers ground-level boxes to the collision solver', () => {
    expect(city.colliders.every((box) => box.base === 0)).toBe(true);
  });

  it('never makes a tree stand collidable', () => {
    // Cutting through a copse is fun; bouncing off an invisible box drawn
    // around one is not.
    const trees = city.props.filter((prop) => prop.type === 'tree');
    expect(trees.length).toBeGreaterThan(20);
    expect(city.colliders.some((box) => box.kind === 'tree')).toBe(false);
  });

  it('uses every block theme somewhere', () => {
    const kinds = new Set(city.scenery.map((box) => box.kind));
    for (const kind of ['rock', 'barn', 'bales', 'stand', 'landmark']) {
      expect(kinds, `no ${kind} anywhere on the stage`).toContain(kind);
    }
  });
});
