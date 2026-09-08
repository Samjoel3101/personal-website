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
 * A species may also declare where water and the trail pull it: `bankWeight`
 * for a shoreline, `vergeWeight` for the trail's edge. Both are added to the
 * biome weight rather than multiplied into it, so a plant can exist *only*
 * beside water or *only* along the path.
 *
 * `shape` names a builder in src/render/geometry — the world model itself
 * never draws anything. `asset` names an optional manifest entry that replaces
 * the procedural shape when it has been fetched; absent, the scene is complete
 * anyway. That is the rule the whole project runs on.
 */

/** Grid spacing for each planting pass, in world units. */
export const SCATTER = Object.freeze({
  CANOPY_CELL: 34,
  /**
   * Undergrowth spacing. Small, because this is seen from inside it: at eye
   * level the floor has to be a carpet, and anything sparser than about a
   * plant every ten units reads as a lawn with things dotted on it.
   */
  GROUND_CELL: 11,
  /** How far an item may wander inside its cell, as a fraction of the cell.
   *  Below 1 the grid still shows; at 1 items from adjacent cells collide. */
  JITTER: 0.86,
  /** Nothing plants on ground steeper than this (rise over run) unless it says
   *  otherwise: trees do not grow on cliffs, and one that does reads as broken. */
  MAX_SLOPE: 0.62,
  /**
   * How far back from the trail anything with a trunk stands, on top of the
   * verge everything keeps off.
   *
   * At eye level this is the difference between walking a path through a wood
   * and walking through a hedge: a trunk planted on the very lip of the trail
   * fills half the frame as you pass it. Individual species override it —
   * see `clearance` — so a rock can still sit on the path's edge.
   */
  CANOPY_CLEARANCE: 16,
  SEED: 0x5eed1eaf,
});

/** Everything with a trunk or a silhouette: the sparse pass. */
export const CANOPY = Object.freeze([
  {
    id: 'pine',
    assets: ['pack.quaternius.pine', 'kit.nature.tree.pine'],
    shape: 'conifer',
    height: [46, 88],
    weight: { forest: 0.42, woodland: 0.08, scrub: 0.01, desert: 0 },
  },
  {
    id: 'spire',
    assets: ['pack.quaternius.spire', 'kit.nature.tree.spire'],
    shape: 'conifer-tall',
    height: [70, 120],
    weight: { forest: 0.2, woodland: 0.03, scrub: 0, desert: 0 },
  },
  {
    id: 'birch',
    assets: ['pack.quaternius.birch'],
    shape: 'birch',
    height: [44, 72],
    weight: { forest: 0.3, woodland: 0.26, scrub: 0.02, desert: 0 },
  },
  {
    id: 'aspen',
    assets: ['pack.quaternius.aspen'],
    shape: 'aspen',
    height: [40, 68],
    weight: { forest: 0.2, woodland: 0.24, scrub: 0.02, desert: 0 },
  },
  {
    id: 'oak',
    assets: ['pack.quaternius.oak', 'kit.nature.tree.oak'],
    shape: 'oak',
    height: [38, 62],
    weight: { forest: 0.18, woodland: 0.24, scrub: 0.03, desert: 0 },
  },
  {
    id: 'maple-red',
    assets: ['pack.quaternius.maple-red'],
    shape: 'maple-red',
    height: [36, 60],
    /** Autumn crowns are the warm half of the forest. Weighted highest at the
     *  turn rather than in the deep forest, so walking out of the pines walks
     *  into the colour. */
    weight: { forest: 0.3, woodland: 0.26, scrub: 0.02, desert: 0 },
  },
  {
    id: 'maple-gold',
    assets: ['pack.quaternius.maple-gold'],
    shape: 'maple-gold',
    height: [34, 58],
    weight: { forest: 0.26, woodland: 0.24, scrub: 0.03, desert: 0 },
  },
  {
    id: 'deadwood',
    assets: ['pack.quaternius.deadwood'],
    shape: 'dead-tree',
    height: [26, 52],
    weight: { forest: 0.02, woodland: 0.05, scrub: 0.13, desert: 0.04 },
  },
  {
    id: 'palm',
    assets: ['pack.quaternius.palm', 'kit.nature.tree.palm'],
    shape: 'palm',
    height: [42, 74],
    weight: { forest: 0, woodland: 0, scrub: 0.01, desert: 0.025 },
    /** Palms mark water. Added to the weight above rather than multiplied into
     *  it, so a bank is worth far more than a dune — which is what makes the
     *  oasis read as an oasis. */
    bankWeight: 0.7,
    /** …but only where a palm belongs. Water draws plants to it; it does not
     *  make a palm reasonable on the bank of a forest pond. */
    bankBands: { forest: 0, woodland: 0, scrub: 1, desert: 1 },
  },
  {
    id: 'saguaro',
    assets: ['pack.quaternius.cactus-tall', 'kit.nature.cactus.tall'],
    shape: 'cactus',
    height: [22, 46],
    weight: { forest: 0, woodland: 0, scrub: 0.05, desert: 0.15 },
  },
  {
    id: 'barrel',
    assets: ['pack.quaternius.cactus-short', 'kit.nature.cactus.short'],
    shape: 'cactus-round',
    height: [6, 12],
    weight: { forest: 0, woodland: 0, scrub: 0.035, desert: 0.08 },
  },
  {
    id: 'boulder',
    assets: ['pack.quaternius.rock-large'],
    shape: 'boulder',
    height: [8, 26],
    weight: { forest: 0.09, woodland: 0.06, scrub: 0.08, desert: 0.06 },
    maxSlope: 1.3,
  },
  {
    id: 'shard',
    assets: ['pack.quaternius.rock-shard'],
    shape: 'shard',
    height: [10, 30],
    /** Pale rock breaking out of the undergrowth, in every band. It is the
     *  only light value in the picture besides the sky. */
    weight: { forest: 0.09, woodland: 0.08, scrub: 0.09, desert: 0.06 },
    maxSlope: 1.3,
    /** Weighted heavily onto the trail's edge, where a stone reads as
     *  something the path was cut around. */
    vergeWeight: 0.6,
  },
  {
    id: 'log',
    assets: ['pack.quaternius.log'],
    shape: 'log',
    /** Read as a girth, not a height: the shape lies down, and it is about
     *  six times longer than the number given here. */
    height: [2.6, 4.2],
    weight: { forest: 0.08, woodland: 0.04, scrub: 0.01, desert: 0 },
    /** A fallen trunk lies on the flat. On a hillside it beds into the slope
     *  at one end and juts out of it at the other, which reads as a bug. */
    maxSlope: 0.3,
  },
]);

/** Undergrowth: the dense pass, and most of what the ground actually is. */
export const GROUND_COVER = Object.freeze([
  {
    id: 'tuft',
    assets: ['pack.quaternius.grass'],
    shape: 'grass',
    height: [3, 6.4],
    weight: { forest: 0.5, woodland: 0.5, scrub: 0.2, desert: 0.01 },
    vergeWeight: 0.6,
  },
  {
    id: 'tall-tuft',
    assets: ['pack.quaternius.tall-grass'],
    shape: 'tall-grass',
    height: [5, 8.5],
    weight: { forest: 0.3, woodland: 0.24, scrub: 0.1, desert: 0 },
    vergeWeight: 0.5,
  },
  {
    id: 'dry-tuft',
    shape: 'grass-dry',
    height: [3, 6],
    weight: { forest: 0.01, woodland: 0.09, scrub: 0.52, desert: 0.1 },
  },
  {
    id: 'fern',
    assets: ['pack.quaternius.fern'],
    shape: 'fern',
    height: [3.2, 5.6],
    weight: { forest: 0.22, woodland: 0.09, scrub: 0.01, desert: 0 },
  },
  {
    id: 'bush',
    assets: ['pack.quaternius.bush'],
    shape: 'bush',
    height: [5, 11],
    weight: { forest: 0.08, woodland: 0.11, scrub: 0.12, desert: 0 },
  },
  {
    id: 'pebble',
    assets: ['pack.quaternius.rock-small'],
    shape: 'rock',
    height: [1.4, 4],
    weight: { forest: 0.04, woodland: 0.05, scrub: 0.14, desert: 0.12 },
    maxSlope: 1.3,
    vergeWeight: 0.2,
  },
  {
    id: 'flower-blue',
    assets: ['pack.quaternius.flower-blue'],
    shape: 'flower-blue',
    height: [2.6, 4.4],
    weight: { forest: 0.035, woodland: 0.035, scrub: 0.004, desert: 0 },
    /** Flowers line the trail. This is the single cheapest thing in the whole
     *  scene and close to the most effective: a path with colour along its
     *  edge reads as a path, and one without reads as a gap. */
    vergeWeight: 1,
  },
  {
    id: 'flower-purple',
    assets: ['pack.quaternius.flower-purple'],
    shape: 'flower-purple',
    height: [2.8, 4.8],
    weight: { forest: 0.03, woodland: 0.03, scrub: 0.004, desert: 0 },
    vergeWeight: 0.8,
  },
  {
    id: 'flower-pink',
    assets: ['pack.quaternius.flower-pink'],
    shape: 'flower-pink',
    height: [2.4, 4],
    weight: { forest: 0.02, woodland: 0.025, scrub: 0.004, desert: 0 },
    vergeWeight: 0.5,
  },
  {
    id: 'flower-yellow',
    assets: ['pack.quaternius.flower-yellow'],
    shape: 'flower-yellow',
    height: [2.2, 3.8],
    weight: { forest: 0.02, woodland: 0.03, scrub: 0.05, desert: 0.008 },
    vergeWeight: 0.6,
  },
  {
    id: 'flower-white',
    shape: 'flower-white',
    height: [2.6, 4.2],
    weight: { forest: 0.025, woodland: 0.02, scrub: 0.008, desert: 0 },
    vergeWeight: 0.45,
  },
  {
    id: 'mushroom',
    assets: ['pack.quaternius.mushroom'],
    shape: 'mushroom',
    height: [1.4, 3],
    weight: { forest: 0.035, woodland: 0.01, scrub: 0, desert: 0 },
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
