import { WORLD } from './world.js';

/**
 * What grows where.
 *
 * One table drives the whole planting. Each species declares the shape it is
 * drawn with, the size it grows to, and a weight per biome; the scatter walks
 * a jittered grid and, in each cell, picks one species in proportion to its
 * weight at that point. Weights blend with the biomes, so a pine thins out
 * across the woodland instead of stopping at a line, and nothing has to know
 * where the boundary is.
 *
 * `shape` names a builder in src/render/geometry — the world model itself
 * never draws anything. `asset` names an optional manifest entry that replaces
 * the procedural shape when it has been fetched; absent, the scene is complete
 * anyway. That is the rule the whole project runs on.
 */

/** Grid spacing for each planting pass, in world units. */
export const SCATTER = Object.freeze({
  CANOPY_CELL: 38,
  GROUND_CELL: 16,
  /** How far an item may wander inside its cell, as a fraction of the cell.
   *  Below 1 the grid still shows; at 1 items from adjacent cells collide. */
  JITTER: 0.86,
  /** Nothing plants on ground steeper than this (rise over run) unless it says
   *  otherwise: trees do not grow on cliffs, and one that does reads as broken. */
  MAX_SLOPE: 0.62,
  SEED: 0x5eed1eaf,
});

/** Everything with a trunk, a boulder or a silhouette: the sparse pass. */
export const CANOPY = Object.freeze([
  {
    id: 'pine',
    shape: 'conifer',
    height: [46, 88],
    weight: { forest: 0.95, woodland: 0.12, scrub: 0.01, desert: 0 },
    asset: 'kit.nature.tree.pine',
  },
  {
    id: 'spire',
    shape: 'conifer-tall',
    height: [70, 120],
    weight: { forest: 0.45, woodland: 0.05, scrub: 0, desert: 0 },
    asset: 'kit.nature.tree.spire',
  },
  {
    id: 'birch',
    shape: 'birch',
    height: [40, 66],
    weight: { forest: 0.2, woodland: 0.22, scrub: 0.02, desert: 0 },
  },
  {
    id: 'oak',
    shape: 'broadleaf',
    height: [38, 62],
    weight: { forest: 0.12, woodland: 0.2, scrub: 0.03, desert: 0 },
    asset: 'kit.nature.tree.oak',
  },
  {
    id: 'deadwood',
    shape: 'dead-tree',
    height: [26, 52],
    weight: { forest: 0.02, woodland: 0.05, scrub: 0.13, desert: 0.04 },
  },
  {
    id: 'palm',
    shape: 'palm',
    height: [42, 74],
    weight: { forest: 0, woodland: 0, scrub: 0.01, desert: 0.025 },
    /** Palms mark water. This is added to the weight above rather than
     *  multiplied into it, so a bank is worth far more than a dune — which is
     *  what makes the oasis read as an oasis. */
    bankWeight: 0.7,
    /** …but only where a palm belongs. Water draws plants to it; it does not
     *  make a palm reasonable on the bank of a forest pond. */
    bankBands: { forest: 0, woodland: 0, scrub: 1, desert: 1 },
    asset: 'kit.nature.tree.palm',
  },
  {
    id: 'saguaro',
    shape: 'cactus',
    height: [22, 46],
    weight: { forest: 0, woodland: 0, scrub: 0.05, desert: 0.15 },
    asset: 'kit.nature.cactus.tall',
  },
  {
    id: 'barrel',
    shape: 'cactus-round',
    height: [6, 12],
    weight: { forest: 0, woodland: 0, scrub: 0.035, desert: 0.08 },
    asset: 'kit.nature.cactus.short',
  },
  {
    id: 'boulder',
    shape: 'boulder',
    height: [8, 26],
    weight: { forest: 0.14, woodland: 0.08, scrub: 0.1, desert: 0.07 },
    maxSlope: 1.3,
    asset: 'kit.nature.rock.large',
  },
  {
    id: 'log',
    shape: 'log',
    /** Read as a girth, not a height: the shape lies down, and it is about
     *  six times longer than the number given here. */
    height: [2.6, 4.2],
    weight: { forest: 0.1, woodland: 0.05, scrub: 0.01, desert: 0 },
    asset: 'kit.nature.log',
  },
]);

/** Undergrowth: the dense pass, and most of what the ground actually is. */
export const GROUND_COVER = Object.freeze([
  {
    id: 'tuft',
    shape: 'grass',
    height: [2.4, 5.2],
    weight: { forest: 0.34, woodland: 0.4, scrub: 0.16, desert: 0.01 },
  },
  {
    id: 'dry-tuft',
    shape: 'grass-dry',
    height: [2.2, 4.6],
    weight: { forest: 0.01, woodland: 0.1, scrub: 0.34, desert: 0.08 },
  },
  {
    id: 'fern',
    shape: 'fern',
    height: [4, 8],
    weight: { forest: 0.2, woodland: 0.09, scrub: 0.01, desert: 0 },
  },
  {
    id: 'bush',
    shape: 'bush',
    height: [5, 11],
    /** Nothing in the desert. A leafy shrub there reads as a rock with grass
     *  growing out of it, which is exactly how it looked. */
    weight: { forest: 0.09, woodland: 0.13, scrub: 0.06, desert: 0 },
    asset: 'kit.nature.bush.large',
  },
  {
    id: 'pebble',
    shape: 'rock',
    height: [1.4, 4],
    weight: { forest: 0.05, woodland: 0.05, scrub: 0.1, desert: 0.12 },
    maxSlope: 1.3,
    asset: 'kit.nature.rock.small',
  },
  {
    id: 'flower',
    shape: 'flower',
    height: [1.8, 3.4],
    weight: { forest: 0.03, woodland: 0.06, scrub: 0.02, desert: 0.004 },
  },
  {
    id: 'mushroom',
    shape: 'mushroom',
    height: [1.4, 3],
    weight: { forest: 0.05, woodland: 0.012, scrub: 0, desert: 0 },
  },
  {
    id: 'reed',
    shape: 'reed',
    height: [5, 11],
    /** Nothing anywhere: a reed has no reason to exist away from water, so
     *  the bank term below is the only weight it ever carries. */
    weight: { forest: 0, woodland: 0, scrub: 0, desert: 0 },
    bankWeight: 1.4,
  },
]);

export const SPECIES = Object.freeze([...CANOPY, ...GROUND_COVER]);

/** Rows and columns each pass walks. Exported so tests can size expectations. */
export const passSize = (cell) => ({
  columns: Math.round(WORLD.WIDTH / cell),
  rows: Math.round(WORLD.LENGTH / cell),
});
