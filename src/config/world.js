/**
 * Dimensions of the city. Every other module derives its geometry from these
 * numbers rather than hard-coding its own, so the city can be resized in one
 * place.
 *
 * The world is a torus: driving off one edge arrives at the other. SIZE is a
 * power of two so wrapping is a bitmask rather than a modulo.
 */
export const WORLD = Object.freeze({
  /** Length of one edge of the square world, in world units. */
  SIZE: 2048,
  /** SIZE - 1, for bitmask wrapping of integer coordinates. */
  MASK: 2047,
  /** Spacing between road centre lines. */
  BLOCK: 512,
  /** Number of roads along each axis (SIZE / BLOCK). */
  GRID: 4,
  /** Half-width of the asphalt. */
  ROAD_HALF: 46,
  /** Width of the pavement band outside the asphalt. */
  WALK: 18,
});

/** Half-width of a block's buildable interior, from its centre to the kerb. */
export const LOT_HALF = WORLD.BLOCK / 2 - WORLD.ROAD_HALF - WORLD.WALK;

/** Centre coordinate of block `index` along one axis. */
export const blockCentre = (index) => index * WORLD.BLOCK + WORLD.BLOCK / 2;

/** The valid landmark centres, as a flat list of coordinates. */
export const BLOCK_CENTRES = Array.from({ length: WORLD.GRID }, (_, i) => blockCentre(i));

/**
 * Ground materials. The physics reads these to decide grip; the renderer reads
 * them to decide what to paint. They are an enum rather than a bitmap so the
 * lookup is a pure function of position, testable without a canvas.
 */
export const SURFACE = Object.freeze({
  ROAD: 0,
  WALK: 1,
  PLAZA: 2,
  GRASS: 3,
  BOOST: 4,
});

/** Boost pad footprint, centred on a road at the middle of each block segment. */
export const BOOST_PAD = Object.freeze({
  HALF_ACROSS: WORLD.ROAD_HALF - 12,
  HALF_ALONG: 26,
});

/** How close the kart must get to a landmark centre to trigger its card. */
export const DISCOVER_RADIUS = 115;
