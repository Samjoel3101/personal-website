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
  /**
   * Terrain mesh lattice spacing. Divides WIDTH and LENGTH exactly.
   *
   * Ten rather than twenty because the trail is only eighteen units across:
   * on a coarser lattice its edge is interpolated over most of its own width
   * and it reads as a brown smear rather than as a path with sides.
   */
  CELL: 10,
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

/**
 * The trail.
 *
 * There is one, it runs the whole length of the valley, and it is the single
 * most important thing in the scene: it is what makes the forest somewhere a
 * person could walk rather than a field of trees seen from a helicopter. The
 * camera follows it, the terrain flattens across it, the ground is bare earth
 * on it, nothing is planted on it, and flowers crowd its edges.
 *
 * WANDER is how far it swings off the centre line. Keep it well inside the
 * valley walls, and clear of the pools — a trail that walks into a lake is
 * worse than no trail at all; `tests/path.test.js` pins both.
 */
export const PATH = Object.freeze({
  /** Half the width of the bare earth. A footpath, not a fire road: at eye
   *  level anything wider fills the bottom of the frame with dirt. */
  HALF_WIDTH: 7,
  /** How far past the earth the verge reaches — where the flowers go. Tight,
   *  because this band is also where nothing else may grow, and a wide one
   *  leaves a mown strip of bare ground either side of the path. */
  VERGE: 6,
  /** How far the centre line swings off x = 0, at most. */
  WANDER: 210,
  /** Frequencies of the two swings that make up the wander. A single sine
   *  reads as a slalom; two incommensurable ones read as a path. */
  WANDER_SCALE: 0.0007,
  WANDER_SCALE_2: 0.0013,
  /** How far the trail is worn below the land it crosses. */
  SINK: 1.4,
  /** How far out the cross-slope is levelled, as a multiple of HALF_WIDTH.
   *  This is what stops the trail running along a hillside at a camber. */
  FLATTEN: 3.4,
});

/**
 * Plant communities — the stands the undergrowth grows in.
 *
 * SCALE sets how big a stand is: one over it is roughly the wavelength, so
 * 0.011 gives mats around ninety units across, which at eye level is a stand
 * you walk through in a few seconds rather than a texture you walk over.
 *
 * BLEND is how close a second community has to run before it mixes in. Small
 * keeps stands distinct with soft edges; large dissolves the whole idea back
 * into an even sprinkle of everything. See src/world/patches.js.
 */
export const PATCH = Object.freeze({
  SCALE: 0.011,
  BLEND: 0.22,
  /** How hard the noise is pushed out toward the corners of the square. See
   *  `spread` in src/world/patches.js: at 1 the middle community swallows half
   *  the valley and the corners are never reached. */
  GAIN: 1.5,
});

/** Terrain relief. Amplitudes are per band and blended by biome weight. */
export const TERRAIN = Object.freeze({
  /**
   * Rolling ground, in world units of peak height. The same gentle roll carries
   * the whole valley: the desert sits within ~10% of the forest, so its ground
   * reads as forest relief that has been recoloured and replanted, not as a
   * different landform. Only palette, fog and planting say "desert".
   */
  HILLS: { forest: 78, woodland: 56, scrub: 66, desert: 70 },
  /**
   * A shallow ridged comb laid over the scrub and desert for a hint of
   * wind-blown dune texture. Single digits on purpose: `naturalHeightAt` adds
   * it without any downward bias, so it lifts a crest a few units over tens of
   * metres and never digs a hollow or raises a wall.
   */
  DUNES: { forest: 0, woodland: 0, scrub: 3, desert: 6 },
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
 * Standing water: one forest pond, one desert oasis.
 *
 * Both are placed to sit a little way off the trail rather than on it — near
 * enough to walk past, far enough that the path never wades in. A test pins
 * that clearance, because moving either the trail or a pool can break it.
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
  { id: 'pond', x: -344, z: 900, radius: 185, depth: 30, bank: 20 },
  { id: 'oasis', x: 353, z: 4600, radius: 130, depth: 20, bank: 16 },
]);

export const BASIN_FALLOFF = 1.9;

/** Half the world, for callers that need to clamp into bounds. */
export const bounds = Object.freeze({
  minX: -WORLD.HALF_WIDTH,
  maxX: WORLD.HALF_WIDTH,
  minZ: 0,
  maxZ: WORLD.LENGTH,
});
