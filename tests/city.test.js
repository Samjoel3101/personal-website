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
 * Invariants that make the city drivable. Each of these, broken, produces a
 * bug that is invisible until someone drives into that specific corner of the
 * map — which is exactly the class of bug worth spending CI time on.
 */
describe('city generation', () => {
  it('is deterministic', () => {
    const again = createCity();
    expect(JSON.stringify(again.buildings)).toBe(JSON.stringify(city.buildings));
    expect(JSON.stringify(again.cars)).toBe(JSON.stringify(city.cars));
    expect(JSON.stringify(again.puddles)).toBe(JSON.stringify(city.puddles));
  });

  it('differs when seeded differently', () => {
    const other = createCity(11);
    expect(JSON.stringify(other.buildings)).not.toBe(JSON.stringify(city.buildings));
  });

  it('keeps every ground collider clear of the track, wherever it has wandered', () => {
    // Stronger than the old "not on a road": the track snakes, so a footprint
    // that clears its grid line can still be sitting in the dirt. This walks
    // the actual centre line past every collider.
    for (const box of city.colliders) {
      const reach = Math.hypot(box.halfWidth, box.halfDepth);
      const gap = distanceToTrack(box.x, box.z) - reach;
      expect(gap, `${box.kind} at ${box.x},${box.z} is in the track`).toBeGreaterThanOrEqual(
        box.kind === 'car' ? -reach : WORLD.ROAD_HALF,
      );
    }
  });

  it('keeps every building inside its block', () => {
    for (const box of city.buildings) {
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
});
