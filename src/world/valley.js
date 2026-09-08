import { CANOPY, GROUND_COVER, SCATTER } from '../config/flora.js';
import { POOLS, WORLD, bounds } from '../config/world.js';
import { biomeWeights, dominantBiome, journeyAt } from './biome.js';
import { plant } from './scatter.js';
import { poolLevel, sampleGrid, surfaceHeight, surfaceNormal, surfaceSlope } from './terrain.js';

/**
 * The whole world, as plain data.
 *
 * This is the only thing the renderer is handed, and it contains no geometry,
 * no colours-as-objects and no three.js anything: a sampled height grid, two
 * lists of planted items, the pools with their surface levels, and a few pure
 * functions for asking about a point. Everything visual is derived from it in
 * src/render, which is what keeps the model testable in Node.
 *
 * Building it is a few hundred milliseconds of noise sampling, all of it at
 * boot and none of it per frame.
 */
export function createValley({ groundCover = 1 } = {}) {
  const grid = sampleGrid();

  const canopy = plant(grid, {
    species: CANOPY,
    cell: SCATTER.CANOPY_CELL,
    clearance: SCATTER.CANOPY_CLEARANCE,
  });
  const cover = plant(grid, {
    species: GROUND_COVER,
    cell: SCATTER.GROUND_CELL,
    density: groundCover,
    seed: SCATTER.SEED ^ 0x9e37,
  });

  const pools = POOLS.map((pool) => ({ ...pool, level: poolLevel(pool) }));

  return {
    grid,
    canopy,
    cover,
    pools,
    bounds,
    size: WORLD,

    /** Height of the drawn ground under a point. */
    heightAt: (x, z) => surfaceHeight(grid, x, z),
    slopeAt: (x, z) => surfaceSlope(grid, x, z),
    normalAt: (x, z) => surfaceNormal(grid, x, z),

    /** 0 in the deep forest, 1 in the deep desert. */
    journeyAt,
    weightsAt: (x, z) => biomeWeights(journeyAt(x, z)),
    biomeAt: (x, z) => dominantBiome(biomeWeights(journeyAt(x, z))),

    /** Total planted items, for the loading readout and the tests. */
    get plantedCount() {
      let total = 0;
      for (const list of [...canopy.values(), ...cover.values()]) total += list.length;
      return total;
    },
  };
}
