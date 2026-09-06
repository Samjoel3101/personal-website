import { describe, expect, it } from 'vitest';
import { PADDOCK_HALF, WORLD } from '../src/config/world.js';
import { LANDMARKS } from '../src/content/resume.js';
import { MAX_TERRAIN_HEIGHT, heightAt, latticeHeightAt, slopeAt } from '../src/world/terrain.js';
import { FACET, surfaceHeightAt } from '../src/render/terrain-surface.js';
import { trackOffsetAt } from '../src/world/track.js';

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

  it('is exactly flat on the track corridor, wherever the track has wandered', () => {
    const flat = WORLD.ROAD_HALF + WORLD.WALK;
    for (let g = 0; g < WORLD.GRID; g += 1) {
      const line = g * WORLD.BLOCK;
      for (let along = 0; along < WORLD.SIZE; along += 37) {
        // The centre line snakes; sampling the grid line would sample a hill.
        const centre = line + trackOffsetAt(along);
        for (const offset of [-flat, -20, 0, 20, flat]) {
          expect(heightAt(centre + offset, along)).toBe(0);
          expect(heightAt(along, centre + offset)).toBe(0);
        }
      }
    }
  });

  it('is exactly flat inside every landmark paddock', () => {
    for (const landmark of LANDMARKS) {
      for (const dx of [-PADDOCK_HALF, -60, 0, 60, PADDOCK_HALF]) {
        for (const dz of [-PADDOCK_HALF, -60, 0, 60, PADDOCK_HALF]) {
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
    const flatSlope = slopeAt(WORLD.BLOCK + trackOffsetAt(300), 300);
    expect(flatSlope.dx).toBe(0);
    expect(flatSlope.dz).toBe(0);

    // On a hillside the gradient must actually point uphill. The probe steps
    // 12 units, not the 6 slopeAt samples at: probing at slopeAt's own epsilon
    // would just restate its subtraction and could never fail.
    const PROBE = 12;
    let hillsides = 0;
    for (let x = 0; x < WORLD.SIZE; x += 61) {
      for (let z = 0; z < WORLD.SIZE; z += 67) {
        const { dx } = slopeAt(x, z);
        if (Math.abs(dx) < 0.02) continue; // too flat to have a direction
        hillsides += 1;
        expect(heightAt(x + Math.sign(dx) * PROBE, z), `at ${x},${z}`).toBeGreaterThan(
          heightAt(x - Math.sign(dx) * PROBE, z),
        );
      }
    }
    expect(hillsides).toBeGreaterThan(100);
  });
});

/**
 * The surface the renderer actually draws.
 *
 * heightAt is a smooth field; the mesh samples it on a lattice and joins the
 * samples with flat triangles, so between lattice lines the two are different
 * surfaces. Everything the player sees is seated on the second one — see
 * src/render/terrain-surface.js — and these pin the two properties that makes
 * it safe to: it agrees with the field where they touch, and it never rises
 * into the flat ribbons laid at y = 0.
 */
describe('the drawn surface', () => {
  it('meets the analytic field at every lattice corner', () => {
    for (let x = 0; x < WORLD.SIZE; x += FACET * 7) {
      for (let z = 0; z < WORLD.SIZE; z += FACET * 11) {
        expect(latticeHeightAt(x, z, FACET), `at ${x},${z}`).toBeCloseTo(heightAt(x, z), 9);
      }
    }
  });

  it('interpolates between corners rather than snapping to one', () => {
    // A cell out on open hillside — one in the flat corridor would pass this
    // by having no relief at all.
    const [x, z] = [368, 848];
    const corners = [
      heightAt(x, z),
      heightAt(x + FACET, z),
      heightAt(x, z + FACET),
      heightAt(x + FACET, z + FACET),
    ];
    expect(Math.max(...corners) - Math.min(...corners)).toBeGreaterThan(1);

    const middle = latticeHeightAt(x + FACET / 2, z + FACET / 2, FACET);
    expect(middle).toBeGreaterThan(Math.min(...corners));
    expect(middle).toBeLessThan(Math.max(...corners));
  });

  it('never rises into the track corridor, between lattice lines included', () => {
    // The bug this catches: the corridor boundary does not follow the lattice,
    // so a facet with one corner out on the hillside tilts up through the
    // ribbons. Sampling on the lattice alone would miss it entirely — these
    // offsets are deliberately not multiples of FACET.
    const flat = WORLD.ROAD_HALF + WORLD.WALK;
    for (let g = 0; g < WORLD.GRID; g += 1) {
      const line = g * WORLD.BLOCK;
      for (let along = 0; along < WORLD.SIZE; along += 6.5) {
        const centre = line + trackOffsetAt(along);
        for (const offset of [-flat, -flat + 3.5, -13.5, 0, 13.5, flat - 3.5, flat]) {
          expect(surfaceHeightAt(centre + offset, along), `across ${offset} at ${along}`).toBe(0);
          expect(surfaceHeightAt(along, centre + offset), `along ${offset} at ${along}`).toBe(0);
        }
      }
    }
  });

  it('never rises into a landmark paddock', () => {
    for (const landmark of LANDMARKS) {
      for (let dx = -PADDOCK_HALF; dx <= PADDOCK_HALF; dx += 9.5) {
        for (let dz = -PADDOCK_HALF; dz <= PADDOCK_HALF; dz += 9.5) {
          expect(surfaceHeightAt(landmark.x + dx, landmark.z + dz)).toBe(0);
        }
      }
    }
  });
});
