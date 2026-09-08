import { SCATTER } from '../config/flora.js';
import { WORLD, bounds } from '../config/world.js';
import { createRng } from '../core/rng.js';
import { hash2 } from '../core/noise.js';
import { clamp, lerp } from '../core/math.js';
import { biomeWeights, blendValue, journeyAt } from './biome.js';
import { surfaceHeight, surfaceSlope } from './terrain.js';
import { bankFactor, isSubmerged } from './water.js';
import { pathFactor, vergeFactor } from './path.js';
import { patchAt, patchValue } from './patches.js';
import { shadeAt } from './shade.js';

/**
 * Where everything grows.
 *
 * A jittered grid, walked once per pass: each cell draws from a deterministic
 * generator seeded by its own coordinates, picks at most one species in
 * proportion to that species' weight at that point, and either plants it or
 * leaves the cell empty. Two properties fall out of that and both matter.
 *
 * It is stable: the same cell always makes the same decision, so the valley is
 * identical on every visit and in every test, and a pass can be re-run at a
 * different density without the forest rearranging itself.
 *
 * And it needs no rejection loop. Species compete for one slot rather than
 * being placed independently and pushed apart afterwards, so a pine and a
 * boulder can never end up inside one another, and thinning the forest into
 * woodland is a matter of the weights falling off rather than of anything
 * being removed.
 */

/** Everything a cell needs to know about the ground it is standing on. */
function siteAt(x, z, clearance, shade) {
  return {
    x,
    z,
    weights: biomeWeights(journeyAt(x, z)),
    patch: patchAt(x, z),
    shade: shade ? shadeAt(shade, x, z) : 0,
    bank: bankFactor(x, z),
    path: pathFactor(x, z, clearance),
    verge: vergeFactor(x, z),
  };
}

/**
 * How a species feels about standing under trees.
 *
 * `shade` runs -1 (wants open light) to +1 (wants cover), and the factor swings
 * either side of one. It is the second half of arrangement: the communities in
 * ./patches.js decide what grows *together*, and this decides where those
 * stands sit relative to the canopy — ferns and mushrooms in under the trees,
 * dry grass and flowers out in the light.
 */
function shadeFactor(species, shade) {
  if (!species.shade) return 1;

  const match = species.shade > 0 ? shade : 1 - shade;
  // Raised to a power rather than mixed linearly. Half the forest floor sits
  // at middling cover, and a linear response barely moves a species there —
  // dry grass ended up almost as shaded as the ferns. The exponent turns a
  // preference into an actual habitat: a clearing gets six times the sun
  // lovers a thicket does.
  return Math.max(0.04, (0.5 + match) ** (3 * Math.abs(species.shade)));
}

/** Willing to grow on any shoreline, which is what a species gets by default. */
const EVERYWHERE = { forest: 1, woodland: 1, scrub: 1, desert: 1 };

/** A species' best weight anywhere on the journey, memoised by species. */
const peaks = new WeakMap();
function peakWeight(species) {
  if (!peaks.has(species)) peaks.set(species, Math.max(...Object.values(species.weight)));
  return peaks.get(species);
}

/** How at home a species is here, 0..1, against the best it manages anywhere. */
function belonging(species, base) {
  const peak = peakWeight(species);
  return peak > 0 ? Math.min(1, base / peak) : 0;
}

/**
 * Species weight here: the biome blend, plus a shoreline term.
 *
 * The shoreline term is added rather than multiplied, and that is the whole
 * difference between a reed bed and reeds scattered across a desert. A
 * multiplier scales a weight that already exists everywhere; an addend can be
 * the only weight a species has, which lets a reed be worth nothing at all
 * away from water and quite a lot on a bank.
 */
function weightOf(species, site) {
  const biome = blendValue(site.weights, species.weight);
  // The community and the canopy redistribute a species' density; they never
  // add to it. See `patchValue`.
  const base = biome * patchValue(site.patch, species.patch) * shadeFactor(species, site.shade);
  // The shoreline term carries its own bands. Water draws plants to it, but
  // it does not make a palm reasonable beside a pine: `bankBands` is where a
  // species says which stretches of the journey it is willing to be a
  // waterside plant in, and defaults to all of them.
  const shoreline = species.bankWeight
    ? species.bankWeight * site.bank * blendValue(site.weights, species.bankBands ?? EVERYWHERE)
    : 0;
  // The verge term is the same idea applied to the trail's edge, and it is
  // what lines the path with colour instead of leaving a bare gap through the
  // undergrowth.
  //
  // Scaled by how at home the species already is here, though — its own biome
  // profile, normalised to its peak. A trail concentrates what grows beside
  // it; it does not import anything. Ungated, this planted forest flowers
  // along the path in the middle of the desert.
  const edge = species.vergeWeight
    ? species.vergeWeight * site.verge * belonging(species, base)
    : 0;

  // Nothing grows on the trail. Last, and multiplicative, so it overrules
  // every reason a species might otherwise have had to be here. A species may
  // keep further back than its pass does — see `clearance` — which is how a
  // pine stands off the path while a pebble sits on its lip.
  //
  // `onPath` inverts it, for the few things that belong *on* the trail and
  // nowhere else: the stones worn into it.
  const path =
    species.clearance === undefined ? site.path : pathFactor(site.x, site.z, species.clearance);
  const room = species.onPath ? path : 1 - path;
  return (base + shoreline + edge) * room;
}

/**
 * Weighted pick over `species`, or null for an empty cell.
 *
 * Two decisions, from one roll. Whether the cell is occupied at all is
 * `min(total, 1) × density`: a cell whose species barely want it stays empty
 * in proportion, which is what thins a forest into woodland rather than merely
 * changing which species fills every slot — and `density` scales that
 * occupancy directly rather than scaling the weights. That distinction is the
 * whole quality ladder: once the floor is saturated (total weight well over
 * one, which it is anywhere the undergrowth is thick), scaling weights thins
 * nothing at all.
 *
 * Then which species, in proportion, by rescaling the same roll — one draw, so
 * adding a species does not reshuffle the rest of the valley.
 */
function choose(species, site, density, roll) {
  let total = 0;
  const weights = species.map((entry) => {
    const weight = weightOf(entry, site);
    total += weight;
    return weight;
  });

  const occupancy = Math.min(total, 1) * density;
  if (total <= 0 || roll >= occupancy) return null;

  let cursor = (roll / occupancy) * total;
  for (let i = 0; i < species.length; i += 1) {
    cursor -= weights[i];
    if (cursor <= 0) return species[i];
  }
  return species[species.length - 1];
}

/**
 * One planting pass.
 *
 * @param {object} grid sampled terrain grid, from src/world/terrain.js
 * @param {object} options
 * @param {Array} options.species candidates, from src/config/flora.js
 * @param {number} options.cell grid spacing for this pass
 * @param {number} [options.density] overall multiplier, for the quality ladder
 * @param {number} [options.clearance] how far this pass keeps off the trail
 * @param {object} [options.shade] canopy cover field, from ./shade.js
 * @returns {Map<string, Array>} items keyed by species id
 */
export function plant(
  grid,
  { species, cell, density = 1, seed = SCATTER.SEED, clearance = 0, shade = null },
) {
  const items = new Map(species.map((entry) => [entry.id, []]));
  const columns = Math.round(WORLD.WIDTH / cell);
  const rows = Math.round(WORLD.LENGTH / cell);

  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const rng = createRng(hash2(i, j, seed) * 4294967296);
      const x = bounds.minX + (i + 0.5 + (rng() - 0.5) * SCATTER.JITTER) * cell;
      const z = bounds.minZ + (j + 0.5 + (rng() - 0.5) * SCATTER.JITTER) * cell;
      if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) continue;

      const chosen = choose(species, siteAt(x, z, clearance, shade), density, rng());
      if (!chosen) continue;

      const item = place(grid, chosen, x, z, rng);
      if (item) items.get(chosen.id).push(item);
    }
  }
  return items;
}

/** Seats one plant on the drawn surface, or refuses the site. */
function place(grid, species, x, z, rng) {
  if (isSubmerged(x, z)) return null;
  if (surfaceSlope(grid, x, z) > (species.maxSlope ?? SCATTER.MAX_SLOPE)) return null;

  const [min, max] = species.height;
  return {
    x,
    z,
    // The drawn surface, not the analytic field: see src/world/terrain.js.
    y: surfaceHeight(grid, x, z),
    height: lerp(min, max, rng()),
    rotationY: rng() * Math.PI * 2,
    /** Per-instance brightness, so a stand of pines is not one flat colour. */
    tint: clamp(0.84 + rng() * 0.32, 0, 2),
  };
}
