import { PATCH } from '../config/world.js';
import { clamp, smoothstep } from '../core/math.js';
import { fbm } from '../core/noise.js';

/**
 * Plant communities: what grows *with* what, and where.
 *
 * Scattering each species independently gives an even sprinkle of everything
 * everywhere, and an even sprinkle is the one thing a real forest floor never
 * looks like. Ground cover grows in stands — a mat of clover under the trees,
 * a drift of dry golden grass out in the light, a bank of ferns in the shade,
 * a patch of flowers around a stone. The eye reads those stands as depth; it
 * reads a uniform mixture as texture, however many species are in it.
 *
 * So the valley carries a second field alongside the biome one. Each community
 * has its own low-frequency noise, and at any point the one running highest
 * wins — cleanly where it leads, blended where two are close. Species then
 * declare an affinity for communities rather than a bare density, and the
 * stands fall out on their own.
 *
 * This is deliberately independent of the biome. A community is *which plants
 * grow together*; a biome is *how far down the valley you are*. Multiplying
 * them is what gives a dry-grass drift in the forest and a clover mat in the
 * woodland, instead of a hard mosaic where both change at once.
 */
/**
 * The communities, placed in a two-axis space rather than given a field each.
 *
 * `damp` runs dry to wet and `open` runs sheltered to exposed, and each
 * community sits somewhere in that square. Two noise fields then say where any
 * point lands, and the nearest communities win.
 *
 * Two fields rather than six is three times less noise per plant — this is
 * asked for every one of a hundred thousand of them — but the real gain is
 * that adjacency now means something. A dry drift borders a meadow because
 * they are neighbours in the square; it never borders a fern bank, because
 * nothing in a landscape goes straight from parched to deep shade.
 */
export const COMMUNITIES = Object.freeze([
  /** Open grass, the middle of the square: what fills the space between. */
  { id: 'meadow', damp: 0.5, open: 0.5 },
  /** Low leafy ground cover, thick and dark: the mats under the canopy. */
  { id: 'clover', damp: 0.9, open: 0.45 },
  /** Dry golden grass, out in the open light. */
  { id: 'dry', damp: 0.15, open: 0.82 },
  /** Ferns and broad leaves, where the trees are thickest. */
  { id: 'shade', damp: 0.75, open: 0.05 },
  /** Flower drifts. */
  { id: 'flowery', damp: 0.58, open: 0.96 },
  /** Stony ground: pebbles, thin grass, the odd bush. */
  { id: 'stony', damp: 0.06, open: 0.22 },
]);

export const COMMUNITY_IDS = Object.freeze(COMMUNITIES.map((community) => community.id));

/**
 * Noise, into the unit square, with its middle pushed out to the corners.
 *
 * A fractal sum clusters hard around zero, so mapped straight onto the square
 * every point lands near the middle and the community sitting there takes over
 * half the valley while the corners go unvisited. The gain spreads it; the
 * clamp keeps the ends flat rather than letting them run off.
 */
const spread = (value) => clamp(0.5 + value * PATCH.GAIN, 0, 1);

/**
 * How strongly each community holds this point, summing to one.
 *
 * The winner takes everything unless another is within `PATCH.BLEND` of it, so
 * a stand has a definite middle and a soft edge — which is what a stand looks
 * like. Widen the blend and the whole field mixes back into an even sprinkle.
 */
export function patchAt(x, z) {
  // Two octaves, at slightly different scales so the two axes never move
  // together and the square gets properly explored rather than walked along
  // its diagonal.
  const damp = spread(fbm(x * PATCH.SCALE, z * PATCH.SCALE, { octaves: 2, seed: 0x9e37 }));
  const open = spread(
    fbm(x * PATCH.SCALE * 1.37, z * PATCH.SCALE * 1.37, { octaves: 2, seed: 0x51f1 }),
  );

  let nearest = Infinity;
  const distances = COMMUNITIES.map((community) => {
    const distance = Math.hypot(damp - community.damp, open - community.open);
    nearest = Math.min(nearest, distance);
    return distance;
  });

  const weights = {};
  let total = 0;
  COMMUNITIES.forEach((community, index) => {
    // One at the nearest community, falling to zero PATCH.BLEND further out:
    // a stand with a definite middle and a soft edge, which is what a stand
    // looks like. Widen the blend and the whole field mixes back into an even
    // sprinkle of everything.
    const share = 1 - smoothstep(nearest, nearest + PATCH.BLEND, distances[index]);
    weights[community.id] = share;
    total += share;
  });

  for (const id of COMMUNITY_IDS) weights[id] /= total || 1;
  return weights;
}

/**
 * How much of an affinity table applies here — as a multiplier around one.
 *
 * Normalised by the table's own mean, which is the property that makes these
 * tables safe to write. A species keeps the overall density its biome weights
 * give it and merely *redistributes* it into the stands it likes: doubling an
 * affinity concentrates it, it does not plant more of it. Without that, every
 * affinity added anywhere would quietly rebalance the whole valley.
 */
const means = new WeakMap();

export function patchValue(weights, table) {
  if (!table) return 1;

  if (!means.has(table)) {
    let total = 0;
    for (const id of COMMUNITY_IDS) total += table[id] ?? 0;
    means.set(table, total / COMMUNITY_IDS.length);
  }

  const mean = means.get(table);
  if (mean <= 0) return 0;

  let sum = 0;
  for (const id of COMMUNITY_IDS) sum += weights[id] * (table[id] ?? 0);
  return sum / mean;
}
