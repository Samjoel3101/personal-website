import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/config/world.js';
import { createValley } from '../src/world/valley.js';

const valley = createValley();

/**
 * The valley is the only thing the renderer is handed, so these are really
 * tests of that contract: everything it needs is present, nothing in it is a
 * renderer object, and it can be generated twice with the same result.
 */
describe('the valley', () => {
  it('plants a populated world', () => {
    expect(valley.plantedCount).toBeGreaterThan(10_000);
    expect(valley.canopy.size).toBeGreaterThan(5);
    expect(valley.cover.size).toBeGreaterThan(5);
  });

  it('hands over the ground as data, not as geometry', () => {
    expect(valley.grid.heights).toBeInstanceOf(Float32Array);
    expect(valley.grid.columns * valley.grid.cell).toBe(WORLD.WIDTH);
    expect(valley.grid.rows * valley.grid.cell).toBe(WORLD.LENGTH);
  });

  it('answers where the ground is and which way it faces', () => {
    expect(Number.isFinite(valley.heightAt(0, 1000))).toBe(true);
    expect(valley.slopeAt(0, 1000)).toBeGreaterThanOrEqual(0);
    expect(valley.normalAt(0, 1000).y).toBeGreaterThan(0);
  });

  it('names the band you are standing in', () => {
    expect(valley.biomeAt(0, 100).id).toBe('forest');
    expect(valley.biomeAt(0, WORLD.LENGTH - 100).id).toBe('desert');
  });

  it('gives each pool a surface level and keeps its floor below it', () => {
    expect(valley.pools.length).toBeGreaterThan(0);
    for (const pool of valley.pools) {
      expect(Number.isFinite(pool.level)).toBe(true);
      expect(valley.heightAt(pool.x, pool.z)).toBeLessThan(pool.level);
    }
  });

  it('can be thinned for a slower machine without moving the trees', () => {
    const sparse = createValley({ groundCover: 0.4 });
    expect(sparse.plantedCount).toBeLessThan(valley.plantedCount);
    for (const [id, items] of valley.canopy) {
      expect(sparse.canopy.get(id).length).toBe(items.length);
    }
  });

  it('is identical on a second generation', () => {
    const again = createValley();
    expect(again.plantedCount).toBe(valley.plantedCount);
    expect(again.canopy.get('pine')[0]).toEqual(valley.canopy.get('pine')[0]);
    expect(again.grid.heights[12345]).toBe(valley.grid.heights[12345]);
  });
});
