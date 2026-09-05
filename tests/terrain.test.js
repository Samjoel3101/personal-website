import { describe, expect, it } from 'vitest';
import { LOT_HALF, WORLD } from '../src/config/world.js';
import { LANDMARKS } from '../src/content/resume.js';
import { MAX_TERRAIN_HEIGHT, heightAt, slopeAt } from '../src/world/terrain.js';

/**
 * The heightfield is renderer-only, but it is generated in the world model so
 * it can be pinned without a GPU. Two properties matter more than the shape
 * itself: it wraps, and it is dead flat everywhere the kart drives. Break
 * either and you get a cliff along the seam or a road that bucks.
 */
describe('terrain', () => {
  it('is deterministic', () => {
    for (const [x, z] of [
      [0, 0],
      [317, 1499],
      [2047.5, 3.25],
    ]) {
      expect(heightAt(x, z)).toBe(heightAt(x, z));
    }
  });

  it('wraps in both axes', () => {
    for (let i = 0; i < 40; i += 1) {
      const x = i * 53.7;
      const z = i * 91.3;
      expect(heightAt(x + WORLD.SIZE, z)).toBeCloseTo(heightAt(x, z), 9);
      expect(heightAt(x, z + WORLD.SIZE)).toBeCloseTo(heightAt(x, z), 9);
      expect(heightAt(x - WORLD.SIZE, z - WORLD.SIZE)).toBeCloseTo(heightAt(x, z), 9);
    }
  });

  it('is exactly flat on the track corridor', () => {
    const flat = WORLD.ROAD_HALF + WORLD.WALK;
    for (let g = 0; g < WORLD.GRID; g += 1) {
      const line = g * WORLD.BLOCK;
      for (let along = 0; along < WORLD.SIZE; along += 37) {
        for (const offset of [-flat, -20, 0, 20, flat]) {
          expect(heightAt(line + offset, along)).toBe(0);
          expect(heightAt(along, line + offset)).toBe(0);
        }
      }
    }
  });

  it('is exactly flat inside every landmark paddock', () => {
    for (const landmark of LANDMARKS) {
      for (const dx of [-LOT_HALF, -60, 0, 60, LOT_HALF]) {
        for (const dz of [-LOT_HALF, -60, 0, 60, LOT_HALF]) {
          expect(heightAt(landmark.x + dx, landmark.z + dz)).toBe(0);
        }
      }
    }
  });

  it('actually rises away from the corridor', () => {
    let highest = 0;
    for (let x = 0; x < WORLD.SIZE; x += 31) {
      for (let z = 0; z < WORLD.SIZE; z += 31) highest = Math.max(highest, heightAt(x, z));
    }
    expect(highest).toBeGreaterThan(8);
  });

  it('stays inside its bounds', () => {
    for (let x = 0; x < WORLD.SIZE; x += 17) {
      for (let z = 0; z < WORLD.SIZE; z += 19) {
        const y = heightAt(x, z);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(MAX_TERRAIN_HEIGHT);
      }
    }
  });

  it('has no cliff between adjacent samples', () => {
    const STEP = 4;
    for (let x = 0; x < WORLD.SIZE; x += 13) {
      for (let z = 0; z < WORLD.SIZE; z += 13) {
        expect(Math.abs(heightAt(x + STEP, z) - heightAt(x, z))).toBeLessThan(STEP);
        expect(Math.abs(heightAt(x, z + STEP) - heightAt(x, z))).toBeLessThan(STEP);
      }
    }
  });

  it('reports a slope that matches the height it samples', () => {
    const flatSlope = slopeAt(WORLD.BLOCK, 300);
    expect(flatSlope.dx).toBe(0);
    expect(flatSlope.dz).toBe(0);

    // Somewhere on a hillside, the gradient must point uphill.
    const x = 700;
    const z = 700;
    const { dx } = slopeAt(x, z);
    if (dx !== 0) {
      const uphill = heightAt(x + Math.sign(dx) * 6, z);
      expect(uphill).toBeGreaterThan(heightAt(x - Math.sign(dx) * 6, z));
    }
  });
});
