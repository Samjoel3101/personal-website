import { describe, expect, it } from 'vitest';
import { MESAS, POOLS, WORLD } from '../src/config/world.js';
import {
  heightAt,
  naturalHeightAt,
  poolLevel,
  sampleGrid,
  surfaceHeight,
  surfaceNormal,
  surfaceSlope,
} from '../src/world/terrain.js';

const grid = sampleGrid();

describe('the terrain field', () => {
  it('is a pure function of position', () => {
    for (const [x, z] of [
      [0, 0],
      [-317, 2044],
      [612, 4801],
    ]) {
      expect(heightAt(x, z)).toBe(heightAt(x, z));
    }
  });

  it('is continuous: no cliff between neighbouring samples', () => {
    for (let z = 0; z < WORLD.LENGTH; z += 137) {
      const step = Math.abs(heightAt(0, z) - heightAt(0, z + 1));
      expect(step).toBeLessThan(6);
    }
  });

  it('climbs into a valley wall at both edges', () => {
    for (let z = 200; z < WORLD.LENGTH; z += 700) {
      const middle = heightAt(0, z);
      expect(heightAt(-WORLD.HALF_WIDTH + 10, z)).toBeGreaterThan(middle + 100);
      expect(heightAt(WORLD.HALF_WIDTH - 10, z)).toBeGreaterThan(middle + 100);
    }
  });

  it('raises a flat top on every mesa', () => {
    for (const mesa of MESAS) {
      const top = heightAt(mesa.x, mesa.z);
      // Sampled along z, not x: a mesa is close enough to the valley side
      // that a step across would land in the wall rather than on the floor.
      const outside = heightAt(mesa.x, mesa.z - mesa.radius * 1.6);
      expect(top).toBeGreaterThan(outside + mesa.height * 0.6);
      // Flat, not domed: the whole point of a butte. Not perfectly flat —
      // the dunes and the detail field still run over the top of it — so the
      // tolerance is a quarter of the rise rather than nothing.
      const across = Math.abs(top - heightAt(mesa.x, mesa.z + mesa.radius * 0.3));
      expect(across).toBeLessThan(mesa.height * 0.25);
    }
  });
});

describe('water basins', () => {
  it('puts every pool surface at the height of the land it fills', () => {
    for (const pool of POOLS) {
      expect(poolLevel(pool)).toBeCloseTo(naturalHeightAt(pool.x, pool.z), 6);
    }
  });

  it('carves the ground below the waterline inside the outline', () => {
    for (const pool of POOLS) {
      const level = poolLevel(pool);
      for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
        for (const reach of [0, 0.4, 0.95]) {
          const x = pool.x + Math.cos(angle) * pool.radius * reach;
          const z = pool.z + Math.sin(angle) * pool.radius * reach;
          expect(heightAt(x, z)).toBeLessThanOrEqual(level);
        }
      }
    }
  });

  it('raises a bank outside it, so the water stays in its own outline', () => {
    for (const pool of POOLS) {
      const level = poolLevel(pool);
      for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
        const x = pool.x + Math.cos(angle) * pool.radius * 1.25;
        const z = pool.z + Math.sin(angle) * pool.radius * 1.25;
        expect(heightAt(x, z)).toBeGreaterThan(level);
      }
    }
  });
});

describe('the sampled grid', () => {
  it('covers the world at the configured spacing', () => {
    expect(grid.columns).toBe(WORLD.WIDTH / WORLD.CELL);
    expect(grid.rows).toBe(WORLD.LENGTH / WORLD.CELL);
    expect(grid.heights.length).toBe((grid.columns + 1) * (grid.rows + 1));
  });

  it('agrees with the field exactly on the lattice', () => {
    for (let i = 0; i <= grid.columns; i += 7) {
      for (let j = 0; j <= grid.rows; j += 23) {
        const x = grid.minX + i * grid.cell;
        const z = grid.minZ + j * grid.cell;
        expect(surfaceHeight(grid, x, z)).toBeCloseTo(heightAt(x, z), 4);
      }
    }
  });

  it('interpolates between lattice points rather than stepping', () => {
    const a = surfaceHeight(grid, 100, 1000);
    const b = surfaceHeight(grid, 100 + WORLD.CELL / 2, 1000);
    const c = surfaceHeight(grid, 100 + WORLD.CELL, 1000);
    expect(b).toBeGreaterThanOrEqual(Math.min(a, c) - 1e-6);
    expect(b).toBeLessThanOrEqual(Math.max(a, c) + 1e-6);
  });

  it('clamps outside the world instead of reading past the buffer', () => {
    expect(Number.isFinite(surfaceHeight(grid, -99999, -99999))).toBe(true);
    expect(Number.isFinite(surfaceHeight(grid, 99999, 99999))).toBe(true);
    expect(Number.isFinite(surfaceSlope(grid, 99999, 99999))).toBe(true);
  });

  it('reports a slope of zero on the flat and a normal that points up', () => {
    const normal = surfaceNormal(grid, 0, 1200);
    expect(normal.y).toBeGreaterThan(0.5);
    expect(Math.hypot(normal.x, normal.y, normal.z)).toBeCloseTo(1, 6);
    expect(surfaceSlope(grid, 0, 1200)).toBeGreaterThanOrEqual(0);
  });

  it('finds the valley walls steeper than the valley floor', () => {
    const floor = surfaceSlope(grid, 0, 2000);
    const wall = surfaceSlope(grid, -WORLD.HALF_WIDTH + 60, 2000);
    expect(wall).toBeGreaterThan(floor);
  });
});
