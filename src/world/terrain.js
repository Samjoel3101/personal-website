import { MESAS, TERRAIN, WORLD } from '../config/world.js';
import { clamp, lerp, smoothstep } from '../core/math.js';
import { fbm, noise2, ridged } from '../core/noise.js';
import { biomeWeights, blendValue, journeyAt } from './biome.js';
import { basinFactor, basinTarget } from './water.js';
import { PATH } from '../config/world.js';
import { flattenFactor, pathCentre, pathFactor } from './path.js';

/**
 * The shape of the ground: one pure function of position, and the sampled grid
 * the renderer and the planting both stand on.
 *
 * Four fields are summed. Rolling hills carry the forest; ridged noise builds
 * dune crests that only exist in the desert; a fine detail field keeps any
 * slope from being perfectly smooth; and the valley walls climb at both edges
 * so the world can be finite without ever showing an edge. Mesas and water
 * basins are then blended in over the top.
 *
 * Every amplitude is blended by biome weight, so the ground itself changes
 * character along the journey rather than being repainted — the forest is
 * lumpy, the desert is combed.
 */
export function heightAt(x, z) {
  return carveBasins(x, z, levelTrail(x, z, naturalHeightAt(x, z)));
}

/**
 * The trail's own elevation profile: the land at its centre line, smoothed
 * along it.
 *
 * Smoothed, because a path takes a gentler line than the ground it crosses.
 * Following the raw field puts a metre-high hump in the middle of the trail
 * every twenty paces — from eye level you walk into a mound and the path
 * disappears behind it, which is exactly what the unsmoothed version did.
 *
 * Cached by z rounded to two units. It is called for every terrain sample near
 * the trail and for every plant that has to decide whether it is on it, and
 * each call is five evaluations of the whole noise stack.
 */
const TRAIL_WINDOW = [
  [-70, 0.45],
  [-35, 0.85],
  [0, 1],
  [35, 0.85],
  [70, 0.45],
];
const trailProfile = new Map();

export function trailHeight(z) {
  const key = Math.round(z / 2);
  const cached = trailProfile.get(key);
  if (cached !== undefined) return cached;

  let sum = 0;
  let total = 0;
  for (const [offset, weight] of TRAIL_WINDOW) {
    const along = clamp(key * 2 + offset, 0, WORLD.LENGTH);
    sum += naturalHeightAt(pathCentre(along), along) * weight;
    total += weight;
  }

  const height = sum / total;
  trailProfile.set(key, height);
  return height;
}

/**
 * Levels the ground across the trail and wears it down a little.
 *
 * Across, and gently along. At any point the ground is level from one side of
 * the trail to the other — without that it runs along every hillside at a
 * camber and reads as a texture painted on a slope — and along its length it
 * follows the smoothed profile above rather than every bump in the field.
 *
 * The levelling reaches several times wider than the earth itself so the
 * ground eases down onto it instead of stepping off a kerb.
 */
function levelTrail(x, z, height) {
  const flatten = flattenFactor(x, z);
  if (flatten <= 0) return height;
  return lerp(height, trailHeight(z) - PATH.SINK * pathFactor(x, z), flatten);
}

/**
 * The land as it would be with no water in it.
 *
 * Exists so a pool can sit at the height of the ground it fills: the carve
 * needs a surface level, and asking `heightAt` for one at the pool's centre
 * would ask about the hole it is about to dig.
 */
export function naturalHeightAt(x, z) {
  const weights = biomeWeights(journeyAt(x, z));
  const hills =
    fbm(x * TERRAIN.HILL_SCALE, z * TERRAIN.HILL_SCALE, { octaves: 4, seed: 11 }) *
    blendValue(weights, TERRAIN.HILLS);
  const dunes =
    (ridged(x * TERRAIN.DUNE_SCALE, z * TERRAIN.DUNE_SCALE * 0.34, { seed: 23 }) - 0.45) *
    blendValue(weights, TERRAIN.DUNES) *
    2;
  const detail =
    noise2(x * TERRAIN.DETAIL_SCALE, z * TERRAIN.DETAIL_SCALE, 41) * TERRAIN.DETAIL_AMOUNT;
  return hills + dunes + detail + wallHeight(x, z) + mesaHeight(x, z);
}

/** Surface height of a pool, memoised: the natural ground at its centre. */
const levels = new Map();
export function poolLevel(pool) {
  if (!levels.has(pool.id)) levels.set(pool.id, naturalHeightAt(pool.x, pool.z));
  return levels.get(pool.id);
}

/** The valley sides. Rises as a square so the floor stays flat and the climb
 *  steepens, which is what makes it read as a hillside rather than a bowl. */
function wallHeight(x, z) {
  const across = Math.abs(x) / WORLD.HALF_WIDTH;
  const rise = smoothstep(TERRAIN.WALL_START, 1.05, across);
  const roughness = 1 + 0.4 * fbm(x * 0.004, z * 0.004, { octaves: 3, seed: 77 });
  return rise * rise * TERRAIN.WALL_HEIGHT * roughness;
}

/** Flat-topped buttes: a plateau inside 62% of the radius, a cliff outside it. */
function mesaHeight(x, z) {
  let sum = 0;
  for (const mesa of MESAS) {
    const distance = Math.hypot(x - mesa.x, z - mesa.z) / mesa.radius;
    const shape = smoothstep(1, 0.62, distance);
    if (shape > 0) {
      const notch = 1 + 0.12 * noise2(x * 0.01, z * 0.01, mesa.radius | 0);
      sum += mesa.height * shape * notch;
    }
  }
  return sum;
}

/** Pulls the ground into a pool's basin, leaving a raised bank around it. */
function carveBasins(x, z, height) {
  const { factor, pool } = basinFactor(x, z);
  if (!pool || factor <= 0) return height;
  return lerp(height, basinTarget(pool, poolLevel(pool), x, z), factor);
}

/**
 * The terrain sampled on the drawing lattice.
 *
 * Everything that has to agree with the picture reads this rather than
 * `heightAt`. The drawn surface is flat triangles between lattice points, so
 * between them it is somewhere else entirely — by several units on a hillside.
 * Anything seated on the analytic field therefore floats or sinks visibly, and
 * a tree standing in mid-air is the single most obvious thing a scene like
 * this can get wrong.
 *
 * `surfaceHeight` reproduces the mesh's own triangle split exactly. Change the
 * winding in src/render/geometry/heightfield.js and it has to change here too.
 */
export function sampleGrid({ cell = WORLD.CELL } = {}) {
  const columns = Math.round(WORLD.WIDTH / cell);
  const rows = Math.round(WORLD.LENGTH / cell);
  const across = columns + 1;
  const heights = new Float32Array(across * (rows + 1));

  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i <= columns; i += 1) {
      heights[j * across + i] = heightAt(-WORLD.HALF_WIDTH + i * cell, j * cell);
    }
  }
  return { cell, columns, rows, across, heights, minX: -WORLD.HALF_WIDTH, minZ: 0 };
}

const at = (grid, i, j) => {
  const column = clamp(i, 0, grid.columns);
  const row = clamp(j, 0, grid.rows);
  return grid.heights[row * grid.across + column];
};

/** Height of the drawn surface at any point, matching the mesh triangle for
 *  triangle. */
export function surfaceHeight(grid, x, z) {
  const gx = (x - grid.minX) / grid.cell;
  const gz = (z - grid.minZ) / grid.cell;
  const i = Math.floor(gx);
  const j = Math.floor(gz);
  const fx = gx - i;
  const fz = gz - j;

  const a = at(grid, i, j);
  const c = at(grid, i + 1, j + 1);
  if (fx <= fz) {
    const b = at(grid, i, j + 1);
    return a + (b - a) * (fz - fx) + (c - a) * fx;
  }
  const d = at(grid, i + 1, j);
  return a + (d - a) * (fx - fz) + (c - a) * fz;
}

/** Steepness of the drawn surface: rise over run, from the lattice itself. */
export function surfaceSlope(grid, x, z) {
  const i = Math.round((x - grid.minX) / grid.cell);
  const j = Math.round((z - grid.minZ) / grid.cell);
  const dx = (at(grid, i + 1, j) - at(grid, i - 1, j)) / (2 * grid.cell);
  const dz = (at(grid, i, j + 1) - at(grid, i, j - 1)) / (2 * grid.cell);
  return Math.hypot(dx, dz);
}

/** Upward normal of the drawn surface, as a plain vector. */
export function surfaceNormal(grid, x, z) {
  const i = Math.round((x - grid.minX) / grid.cell);
  const j = Math.round((z - grid.minZ) / grid.cell);
  const dx = at(grid, i + 1, j) - at(grid, i - 1, j);
  const dz = at(grid, i, j + 1) - at(grid, i, j - 1);
  const span = 2 * grid.cell;
  const length = Math.hypot(dx, span, dz) || 1;
  return { x: -dx / length, y: span / length, z: -dz / length };
}
