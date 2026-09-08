/**
 * The shape of the land, in one place.
 *
 * The scene is a single valley that runs from a wet pine forest in the north
 * to open desert in the south. Everything is expressed against these numbers
 * rather than hard-coded twice, so the valley can be made longer or wider by
 * editing this file alone.
 *
 * Axes: +x is across the valley, +z is the journey. z = 0 is deep forest,
 * z = LENGTH is deep desert.
 */
export const WORLD = Object.freeze({
  /** Full width across the valley. */
  WIDTH: 1600,
  HALF_WIDTH: 800,
  /** Length of the journey, forest to desert. */
  LENGTH: 5600,
  /** Terrain mesh lattice spacing. Divides WIDTH and LENGTH exactly. */
  CELL: 20,
});

/**
 * The four bands of the journey, in order, each pinned to the point along the
 * journey (0..1) where it is the only thing you can see.
 *
 * Blending is linear between neighbouring anchors and smoothstepped, so at any
 * point exactly two bands are in play and their weights sum to one. That is
 * what lets ground colour, fog, terrain amplitude and planting density all be
 * driven by the same four numbers without any of them agreeing in advance —
 * see src/world/biome.js.
 */
export const BIOMES = Object.freeze([
  { id: 'forest', name: 'Pine forest', at: 0.17 },
  { id: 'woodland', name: 'Thinning woodland', at: 0.44 },
  { id: 'scrub', name: 'Dry scrub', at: 0.72 },
  { id: 'desert', name: 'Open desert', at: 0.95 },
]);

/**
 * How far the biome boundary wanders off a straight line across the valley.
 *
 * Without it the forest ends along a ruler-straight line at a fixed z, which
 * reads as a bug from any angle that shows both sides at once. The warp is a
 * function of x only, so the journey still advances monotonically wherever you
 * stand.
 */
export const BIOME_WARP = Object.freeze({ AMOUNT: 420, SCALE: 0.0016 });

/** Terrain relief. Amplitudes are per band and blended by biome weight. */
export const TERRAIN = Object.freeze({
  /** Rolling ground under the forest, in world units of peak height. */
  HILLS: { forest: 78, woodland: 56, scrub: 34, desert: 15 },
  /** Wind-blown dune ridges. Desert only, or the forest floor corrugates. */
  DUNES: { forest: 0, woodland: 0, scrub: 12, desert: 34 },
  /** Frequencies of the two relief fields, in cycles per world unit. */
  HILL_SCALE: 0.0016,
  DUNE_SCALE: 0.0075,
  /** Fine breakup laid over everything so no slope is perfectly smooth. */
  DETAIL_SCALE: 0.02,
  DETAIL_AMOUNT: 3.2,
  /**
   * The valley walls, which is how a finite world gets away with having an
   * edge. The ground rises steeply past WALL_START (as a fraction of the half
   * width) so the far side of every view is hillside rather than a horizon
   * with nothing behind it.
   */
  WALL_START: 0.55,
  WALL_HEIGHT: 300,
});

/**
 * Flat-topped desert buttes. Placed by hand rather than scattered: three
 * silhouettes on the horizon is scenery, thirty is noise.
 */
export const MESAS = Object.freeze([
  { x: -430, z: 4180, radius: 300, height: 210 },
  { x: 470, z: 5030, radius: 240, height: 165 },
  { x: -110, z: 5450, radius: 190, height: 120 },
]);

/**
 * Standing water: one forest pond, one desert oasis.
 *
 * A pool's surface height is not written here, because a fixed height in a
 * landscape that rolls is a pool halfway up a hillside. It is taken from the
 * terrain at the pool's own centre — see `poolLevel` in src/world/terrain.js —
 * and the basin is then carved relative to that: `depth` below the surface
 * inside `radius`, climbing to `bank` above it out to `radius * BASIN_FALLOFF`.
 * The bank is what keeps the water inside its own outline instead of pooling
 * in every dip nearby.
 */
export const POOLS = Object.freeze([
  { id: 'pond', x: -250, z: 900, radius: 185, depth: 30, bank: 20 },
  { id: 'oasis', x: 300, z: 4600, radius: 130, depth: 20, bank: 16 },
]);

export const BASIN_FALLOFF = 1.9;

/** Half the world, for callers that need to clamp into bounds. */
export const bounds = Object.freeze({
  minX: -WORLD.HALF_WIDTH,
  maxX: WORLD.HALF_WIDTH,
  minZ: 0,
  maxZ: WORLD.LENGTH,
});
