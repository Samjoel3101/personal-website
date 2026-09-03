import { describe, expect, it } from 'vitest';
import { LOT_HALF, SURFACE, WORLD } from '../src/config/world.js';
import { LANDMARKS } from '../src/content/resume.js';
import { wrapDelta } from '../src/core/torus.js';
import { createCity } from '../src/world/city.js';

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
  });

  it('differs when seeded differently', () => {
    const other = createCity(11);
    expect(JSON.stringify(other.buildings)).not.toBe(JSON.stringify(city.buildings));
  });

  it('never puts a building on a road', () => {
    for (const box of city.buildings) {
      for (const [coord, half] of [
        [box.x, box.halfWidth],
        [box.z, box.halfDepth],
      ]) {
        const nearestLine = Math.round(coord / WORLD.BLOCK) * WORLD.BLOCK;
        const gap = Math.abs(wrapDelta(coord - nearestLine)) - half;
        expect(gap).toBeGreaterThanOrEqual(WORLD.ROAD_HALF);
      }
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

  it('leaves the driving lane clear of parked cars', () => {
    for (const car of city.cars) {
      const acrossX = Math.abs(wrapDelta(car.x - Math.round(car.x / WORLD.BLOCK) * WORLD.BLOCK));
      const acrossZ = Math.abs(wrapDelta(car.z - Math.round(car.z / WORLD.BLOCK) * WORLD.BLOCK));
      const across = Math.min(acrossX, acrossZ);
      const half = acrossX < acrossZ ? car.halfWidth : car.halfDepth;
      // Inner edge must leave more than a kart's width of lane.
      expect(across - half).toBeGreaterThan(20);
      // Outer edge must stay on the asphalt.
      expect(across + half).toBeLessThanOrEqual(WORLD.ROAD_HALF);
    }
  });

  it('gives every landmark a plaza to stand on', () => {
    for (const landmark of LANDMARKS) {
      expect(city.surfaceAt(landmark.x, landmark.z)).toBe(SURFACE.PLAZA);
    }
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
