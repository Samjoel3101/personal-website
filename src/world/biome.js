import { BIOMES, BIOME_WARP, WORLD } from '../config/world.js';
import { clamp, smoothstep } from '../core/math.js';
import { noise2 } from '../core/noise.js';

/**
 * Where you are on the journey, and what that means.
 *
 * One number — `journeyAt`, zero in the deep forest and one in the deep desert
 * — drives everything that changes along the valley: the height of the hills,
 * the colour of the ground, the haze on the horizon, and which species are
 * planted. Nothing else in the codebase knows where a biome boundary is.
 *
 * The boundary is not a straight line across the valley. `BIOME_WARP` bends it
 * by a few hundred units as a function of x, so the forest reaches further down
 * one side than the other. It is a function of x alone, so walking forward
 * always advances the journey, whatever line you take.
 */
export const BIOME_IDS = Object.freeze(BIOMES.map((biome) => biome.id));

export function journeyAt(x, z) {
  const warp = noise2(x * BIOME_WARP.SCALE, 4.7, 0x1e) * BIOME_WARP.AMOUNT;
  return clamp((z + warp) / WORLD.LENGTH, 0, 1);
}

/**
 * The weight of each band at `u`, summing to exactly one.
 *
 * Only the two bands either side of `u` are ever non-zero. That is a deliberate
 * simplification: a Gaussian over four anchors puts a trace of desert in the
 * forest, and a trace of desert is a dead tree in a rainstorm.
 */
export function biomeWeights(u) {
  const weights = {};
  for (const biome of BIOMES) weights[biome.id] = 0;

  const clamped = clamp(u, 0, 1);
  if (clamped <= BIOMES[0].at) {
    weights[BIOMES[0].id] = 1;
    return weights;
  }
  const last = BIOMES[BIOMES.length - 1];
  if (clamped >= last.at) {
    weights[last.id] = 1;
    return weights;
  }

  for (let i = 0; i < BIOMES.length - 1; i += 1) {
    const from = BIOMES[i];
    const to = BIOMES[i + 1];
    if (clamped < from.at || clamped > to.at) continue;
    const t = smoothstep(from.at, to.at, clamped);
    weights[from.id] = 1 - t;
    weights[to.id] = t;
    return weights;
  }
  return weights;
}

/** Weighted sum of a per-biome table of numbers. */
export function blendValue(weights, table) {
  let sum = 0;
  for (const id of BIOME_IDS) sum += (weights[id] ?? 0) * (table[id] ?? 0);
  return sum;
}

/** The band with the most weight here — the one to name in the interface. */
export function dominantBiome(weights) {
  let best = BIOMES[0];
  for (const biome of BIOMES) {
    if ((weights[biome.id] ?? 0) > (weights[best.id] ?? 0)) best = biome;
  }
  return best;
}
