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
 * Four more fields shape *arrangement* rather than density, and they are what
 * stop the floor reading as an even sprinkle:
 *
 *   `patch`   affinity for the plant communities in src/world/patches.js —
 *             which species this one grows *with*. Normalised by its own mean,
 *             so it concentrates a species into stands without planting more
 *             of it.
 *   `shade`   -1 wants open light, +1 wants canopy over it.
 *   `bankWeight` / `vergeWeight`  pull toward water and the trail's edge.
 *             Both are *added* to the biome weight rather than multiplied into
 *             it, so a plant can exist only beside water or only along a path.
 *   `onPath`  inverts the trail rule: this grows on the bare earth and nowhere
 *             else. For the stones worn into the track.
 *
 * `modelScale` multiplies the height a *fetched* model is drawn at, and only
 * that. It is not a fudge factor: a species' `height` is the size of the plant
 * in the world, and the procedural shape is built to fill it, but the pack's
 * model of the same plant may be a denser, shorter thing that fills its own
 * unit box differently. Where the two disagree the near form visibly grows as
 * you walk up to it, and the number here is what makes them meet.
 *
 * `shape` names a builder in src/render/geometry — the world model itself
 * never draws anything. `asset` names an optional manifest entry that replaces
 * the procedural shape when it has been fetched; absent, the scene is complete
 * anyway. That is the rule the whole project runs on.
 */

/** Grid spacing for each planting pass, in world units. */
export const SCATTER = Object.freeze({
  CANOPY_CELL: 40,
  /**
   * Undergrowth spacing. Small, because this is seen from inside it: at eye
   * level the floor has to be a carpet, and anything sparser reads as a lawn
   * with things dotted on it. Seven units — about a metre and a half — with
   * mats that spread six or eight is what finally closed the gaps.
   *
   * It is also the single biggest number in the build: halving it quadruples
   * the cells the planting walks, and the planting is most of the three
   * seconds the loading card is there for. Six rather than seven is a third
   * more plants and about a second more loading, bought deliberately — at
   * seven the floor still showed through between the mats in open ground,
   * which is the one thing the reference art never does.
   */
  GROUND_CELL: 6,
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

import { CANOPY } from './canopy.js';
import { GROUND_COVER } from './ground-cover.js';

export { CANOPY, GROUND_COVER };

export const SPECIES = Object.freeze([...CANOPY, ...GROUND_COVER]);

/** Rows and columns each pass walks. Exported so tests can size expectations. */
export const passSize = (cell) => ({
  columns: Math.round(WORLD.WIDTH / cell),
  rows: Math.round(WORLD.LENGTH / cell),
});
