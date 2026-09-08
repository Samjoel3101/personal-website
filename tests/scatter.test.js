import { describe, expect, it } from 'vitest';
import { CANOPY, GROUND_COVER, SCATTER } from '../src/config/flora.js';
import { POOLS, WORLD, bounds } from '../src/config/world.js';
import { plant } from '../src/world/scatter.js';
import { sampleGrid, surfaceSlope } from '../src/world/terrain.js';
import { journeyAt } from '../src/world/biome.js';
import { PATH } from '../src/config/world.js';
import { distanceToPath, vergeFactor } from '../src/world/path.js';

const grid = sampleGrid();
const canopy = plant(grid, { species: CANOPY, cell: SCATTER.CANOPY_CELL });
const cover = plant(grid, { species: GROUND_COVER, cell: SCATTER.GROUND_CELL });

const all = (items) => [...items.values()].flat();
/** Mean journey position of a species: near 0 is forest, near 1 is desert. */
const meanJourney = (items) =>
  items.reduce((total, item) => total + journeyAt(item.x, item.z), 0) / items.length;
/** Distance to the nearest pool, in multiples of that pool's radius. */
const nearestBank = (item) =>
  Math.min(...POOLS.map((pool) => Math.hypot(item.x - pool.x, item.z - pool.z) / pool.radius));

describe('planting', () => {
  it('is deterministic', () => {
    const again = plant(grid, { species: CANOPY, cell: SCATTER.CANOPY_CELL });
    for (const [id, items] of canopy) {
      expect(again.get(id).length).toBe(items.length);
      if (items.length > 0) expect(again.get(id)[0]).toEqual(items[0]);
    }
  });

  it('plants something of everything', () => {
    for (const [id, items] of [...canopy, ...cover]) {
      expect(items.length, `species ${id}`).toBeGreaterThan(0);
    }
  });

  it('stays inside the world', () => {
    for (const item of [...all(canopy), ...all(cover)]) {
      expect(item.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(item.x).toBeLessThanOrEqual(bounds.maxX);
      expect(item.z).toBeGreaterThanOrEqual(bounds.minZ);
      expect(item.z).toBeLessThanOrEqual(bounds.maxZ);
    }
  });

  it('gives every item the size, seat and spin the renderer needs', () => {
    for (const [id, items] of [...canopy, ...cover]) {
      const species = [...CANOPY, ...GROUND_COVER].find((entry) => entry.id === id);
      for (const item of items) {
        expect(item.height).toBeGreaterThanOrEqual(species.height[0]);
        expect(item.height).toBeLessThanOrEqual(species.height[1]);
        expect(item.rotationY).toBeGreaterThanOrEqual(0);
        expect(item.rotationY).toBeLessThanOrEqual(Math.PI * 2);
        expect(Number.isFinite(item.y)).toBe(true);
      }
    }
  });

  it('refuses ground too steep to grow on', () => {
    for (const [id, items] of canopy) {
      const species = CANOPY.find((entry) => entry.id === id);
      const limit = species.maxSlope ?? SCATTER.MAX_SLOPE;
      for (const item of items)
        expect(surfaceSlope(grid, item.x, item.z)).toBeLessThanOrEqual(limit);
    }
  });

  it('plants nothing on the trail', () => {
    for (const item of [...all(canopy), ...all(cover)]) {
      // Not "nothing within the verge": the verge is where the flowers go.
      // Nothing on the bare earth is the rule, and the fringe of it is the
      // scatter easing off rather than a boundary.
      expect(distanceToPath(item.x, item.z)).toBeGreaterThan(PATH.HALF_WIDTH * 0.55);
    }
  });

  it('lines the trail with flowers rather than scattering them evenly', () => {
    const flowers = [...cover.get('flower-blue'), ...cover.get('flower-purple')];
    const beside = flowers.filter((item) => vergeFactor(item.x, item.z) > 0.1);

    // The verge is a sliver of the valley — under two per cent of it — so the
    // measure that means anything is density, not headcount. Sample the area
    // share, and ask that flowers be several times thicker per unit of ground
    // on the trail's edge than off it.
    let vergeCells = 0;
    let cells = 0;
    for (let z = 0; z < WORLD.LENGTH; z += 47) {
      for (let x = -WORLD.HALF_WIDTH; x < WORLD.HALF_WIDTH; x += 3) {
        cells += 1;
        if (vergeFactor(x, z) > 0.1) vergeCells += 1;
      }
    }
    const areaShare = vergeCells / cells;
    const flowerShare = beside.length / flowers.length;
    expect(flowerShare / areaShare).toBeGreaterThan(5);

    // And enough of them to actually line a kilometre of path.
    expect(beside.length).toBeGreaterThan(150);
  });

  it('plants nothing in open water', () => {
    for (const item of [...all(canopy), ...all(cover)]) {
      for (const pool of POOLS) {
        expect(Math.hypot(item.x - pool.x, item.z - pool.z)).toBeGreaterThanOrEqual(pool.radius);
      }
    }
  });
});

describe('what grows where', () => {
  it('keeps the conifers in the forest and the cacti in the desert', () => {
    expect(meanJourney(canopy.get('pine'))).toBeLessThan(0.3);
    expect(meanJourney(canopy.get('spire'))).toBeLessThan(0.3);
    expect(meanJourney(canopy.get('saguaro'))).toBeGreaterThan(0.75);
    expect(meanJourney(canopy.get('barrel'))).toBeGreaterThan(0.75);
    expect(meanJourney(cover.get('fern'))).toBeLessThan(0.35);
    expect(meanJourney(canopy.get('maple-red'))).toBeLessThan(0.55);
    expect(meanJourney(cover.get('mushroom'))).toBeLessThan(0.35);
  });

  it('puts the broadleaves and the dead wood between them', () => {
    const birch = meanJourney(canopy.get('birch'));
    expect(birch).toBeGreaterThan(meanJourney(canopy.get('pine')));
    expect(birch).toBeLessThan(meanJourney(canopy.get('deadwood')));
    expect(meanJourney(canopy.get('deadwood'))).toBeLessThan(meanJourney(canopy.get('saguaro')));
  });

  it('grows reeds only on a bank', () => {
    for (const item of cover.get('reed')) {
      expect(nearestBank(item)).toBeLessThan(1.6);
    }
  });

  it('draws the palms to the water without confining them to it', () => {
    const palms = canopy.get('palm');
    const beside = palms.filter((item) => nearestBank(item) < 2).length;
    expect(beside / palms.length).toBeGreaterThan(0.3);
  });

  it('thins out with the density, without rearranging the valley', () => {
    const sparse = plant(grid, { species: GROUND_COVER, cell: SCATTER.GROUND_CELL, density: 0.3 });
    expect(all(sparse).length).toBeLessThan(all(cover).length * 0.6);
    // Every surviving position is one the full-density pass also chose, so
    // turning the quality down thins the undergrowth rather than replanting it.
    const full = new Set(all(cover).map((item) => `${item.x},${item.z}`));
    const kept = all(sparse).filter((item) => full.has(`${item.x},${item.z}`));
    expect(kept.length / all(sparse).length).toBeGreaterThan(0.9);
  });

  it('covers the ground densely enough to hide the grid it was placed on', () => {
    expect(all(cover).length).toBeGreaterThan(5000);
    expect(all(canopy).length).toBeGreaterThan(1500);
    const cells = (WORLD.WIDTH / SCATTER.GROUND_CELL) * (WORLD.LENGTH / SCATTER.GROUND_CELL);
    expect(all(cover).length).toBeLessThan(cells);
  });
});
