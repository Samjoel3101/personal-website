/**
 * Undergrowth: the dense planting pass, and most of what the ground is.
 *
 * See src/config/flora.js for what the fields mean. This is where arrangement
 * lives: `patch` says which plant communities a species belongs to and `shade`
 * says whether it wants canopy over it, and between them they turn an even
 * sprinkle of everything into mats, drifts and clumps.
 */
export const GROUND_COVER = Object.freeze([
  {
    id: 'grass-mat',
    /** The floor itself. Wide, low and cheap — see the note on `mat` in
     *  src/render/geometry/cover-shapes.js for why this carries most of the
     *  coverage and the tufts merely stand in it. */
    patch: { meadow: 1.2, clover: 0.95, flowery: 0.9, shade: 0.75, stony: 0.8, dry: 0.5 },
    shape: 'grass-mat',
    /** A height; the mat spreads about twice this across. */
    height: [2.4, 4.2],
    weight: { forest: 0.55, woodland: 0.55, scrub: 0.26, desert: 0.02 },
    vergeWeight: 0.5,
  },
  {
    id: 'dry-mat',
    /** The golden drifts, as ground rather than as scattered stalks. */
    patch: { dry: 1.9, stony: 0.4, meadow: 0.15 },
    shade: -0.7,
    shape: 'dry-mat',
    height: [2.6, 4.6],
    weight: { forest: 0.16, woodland: 0.3, scrub: 0.55, desert: 0.08 },
  },
  {
    id: 'tuft',
    patch: { meadow: 1, flowery: 0.7, clover: 0.45, stony: 0.35, shade: 0.4, dry: 0.25 },
    shape: 'grass',
    height: [3, 6.4],
    weight: { forest: 0.3, woodland: 0.3, scrub: 0.14, desert: 0.01 },
    vergeWeight: 1,
  },
  {
    id: 'tall-tuft',
    patch: { meadow: 1.1, flowery: 0.5, dry: 0.35, clover: 0.2 },
    shade: -0.3,
    shape: 'tall-grass',
    height: [5, 8.5],
    weight: { forest: 0.3, woodland: 0.24, scrub: 0.1, desert: 0 },
    vergeWeight: 0.8,
  },
  {
    id: 'dry-tuft',
    /** The golden drifts. In the reference art these run right through the
     *  green forest wherever the light gets in, which is why this is no longer
     *  a scrub-only species. */
    patch: { dry: 1.8, stony: 0.35, meadow: 0.12 },
    shade: -0.8,
    shape: 'grass-dry',
    height: [3, 6],
    weight: { forest: 0.1, woodland: 0.16, scrub: 0.26, desert: 0.06 },
  },
  {
    id: 'fern',
    patch: { shade: 1.7, clover: 0.5 },
    shade: 1,
    assets: ['pack.nature.fern'],
    shape: 'fern',
    height: [3.2, 5.6],
    weight: { forest: 0.3, woodland: 0.12, scrub: 0.01, desert: 0 },
  },
  {
    id: 'bush',
    /** The green one, and the common one. Procedural at every distance: the
     *  pack's bush is the red accent below. */
    patch: { meadow: 0.7, shade: 0.6, stony: 0.5, clover: 0.4 },
    shape: 'bush',
    height: [4, 8],
    weight: { forest: 0.05, woodland: 0.07, scrub: 0.07, desert: 0 },
  },
  {
    id: 'bush-red',
    /** The pack's bush carries the twisted tree's deep red leaves, which is
     *  gorgeous once and oppressive by the hundred — it was most of what you
     *  saw in the mid-ground. An accent now: a fraction of the green bushes,
     *  weighted onto stony and dry ground where a turning shrub belongs. */
    assets: ['pack.nature.bush'],
    patch: { stony: 1.4, dry: 1.1, meadow: 0.2 },
    shape: 'bush',
    height: [4.5, 8.5],
    weight: { forest: 0.008, woodland: 0.013, scrub: 0.016, desert: 0 },
  },
  {
    id: 'clover',
    /** The mat that covers the shaded floor in the reference art. Broad and
     *  low: its job is coverage, where grass's is height and movement. */
    patch: { clover: 1.9, shade: 0.7, meadow: 0.25 },
    shade: 0.7,
    shape: 'clover',
    /** Read as a height; the mat spreads about three times this across. */
    height: [1.6, 2.8],
    weight: { forest: 0.32, woodland: 0.26, scrub: 0.04, desert: 0 },
    vergeWeight: 0.3,
  },
  {
    id: 'plant',
    patch: { shade: 1.2, clover: 0.9, stony: 0.2 },
    shade: 0.8,
    shape: 'fern',
    height: [3.5, 6.5],
    weight: { forest: 0.18, woodland: 0.14, scrub: 0.04, desert: 0 },
    assets: ['pack.nature.plant'],
  },
  {
    id: 'pebble',
    patch: { stony: 1.9, dry: 0.4, meadow: 0.15 },
    shade: -0.4,
    shape: 'rock',
    height: [1.4, 4],
    weight: { forest: 0.06, woodland: 0.07, scrub: 0.14, desert: 0.12 },
    maxSlope: 1.3,
    vergeWeight: 0.2,
  },
  {
    id: 'flower-blue',
    patch: { flowery: 1.9, meadow: 0.35 },
    shade: -0.2,
    shape: 'flower-blue',
    height: [2.2, 3.6],
    weight: { forest: 0.035, woodland: 0.035, scrub: 0.004, desert: 0 },
    /** Flowers line the trail. This is the single cheapest thing in the whole
     *  scene and close to the most effective: a path with colour along its
     *  edge reads as a path, and one without reads as a gap. */
    vergeWeight: 1.5,
  },
  {
    id: 'flower-purple',
    patch: { flowery: 1.9, meadow: 0.35 },
    shade: -0.2,
    shape: 'flower-purple',
    height: [2.4, 3.8],
    weight: { forest: 0.03, woodland: 0.03, scrub: 0.004, desert: 0 },
    vergeWeight: 1.2,
  },
  {
    id: 'flower-pink',
    patch: { flowery: 1.9, meadow: 0.35 },
    shade: -0.2,
    shape: 'flower-pink',
    height: [2, 3.2],
    weight: { forest: 0.02, woodland: 0.025, scrub: 0.004, desert: 0 },
    vergeWeight: 0.8,
  },
  {
    id: 'flower-yellow',
    patch: { flowery: 1.9, meadow: 0.35 },
    shade: -0.2,
    shape: 'flower-yellow',
    height: [1.9, 3],
    weight: { forest: 0.02, woodland: 0.03, scrub: 0.05, desert: 0.008 },
    vergeWeight: 1,
  },
  {
    id: 'flower-white',
    patch: { flowery: 1.9, meadow: 0.35 },
    shade: -0.2,
    shape: 'flower-white',
    height: [2.2, 3.4],
    weight: { forest: 0.025, woodland: 0.02, scrub: 0.008, desert: 0 },
    vergeWeight: 0.7,
  },
  {
    id: 'mushroom',
    /** Clumped under the trees, the way the reference has them: at trunks,
     *  on the shaded side of a stone, never out in the open. */
    patch: { shade: 1.8, clover: 0.7 },
    shade: 1,
    vergeWeight: 0.3,
    assets: ['pack.nature.mushroom'],
    shape: 'mushroom',
    height: [1.4, 3],
    weight: { forest: 0.07, woodland: 0.02, scrub: 0, desert: 0 },
  },
  {
    id: 'trail-stone',
    /** Worn into the path, and the only species that grows on it. Small,
     *  flat, and scattered the way stones surface on a walked track — without
     *  them the trail is a painted stripe rather than a surface. */
    assets: ['pack.nature.trail-stone'],
    shape: 'flat-stone',
    height: [1, 2.4],
    onPath: true,
    maxSlope: 1.3,
    /** A scatter, not a cobbled road. The pack's path piece is itself a
     *  cluster of stones, so one instance is already several. */
    weight: { forest: 0.12, woodland: 0.12, scrub: 0.1, desert: 0.07 },
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
