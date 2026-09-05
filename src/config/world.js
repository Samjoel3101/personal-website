/**
 * Dimensions of the rally stage. Every other module derives its geometry from
 * these numbers rather than hard-coding its own, so the world can be resized in
 * one place.
 *
 * The world is a torus: driving off one edge arrives at the other. SIZE is a
 * power of two so wrapping is a bitmask rather than a modulo.
 */
export const WORLD = Object.freeze({
  /** Length of one edge of the square world, in world units. */
  SIZE: 2048,
  /** SIZE - 1, for bitmask wrapping of integer coordinates. */
  MASK: 2047,
  /** Spacing between track centre lines. */
  BLOCK: 512,
  /** Number of tracks along each axis (SIZE / BLOCK). */
  GRID: 4,
  /** Half-width of the packed dirt. */
  ROAD_HALF: 46,
  /** Width of the grass verge outside the dirt. */
  WALK: 18,
});

/**
 * How far the track wanders off its grid line.
 *
 * The shape is TRACK.WOBBLE * sin(2π * along / WORLD.BLOCK), which is zero at
 * every multiple of BLOCK / 2 — so the track passes dead through every junction
 * AND through every block midpoint, where the boost pads sit. Neither needs
 * special-casing. See src/world/track.js.
 */
export const TRACK = Object.freeze({
  WOBBLE: 58,
});

/**
 * Half-width of a block's usable interior, from its centre to the verge.
 *
 * The wobble is subtracted so that scenery can never be swallowed by a track
 * that has swung toward it: the lots are smaller than a grid would need, which
 * suits sparse rally scenery anyway.
 */
export const LOT_HALF = WORLD.BLOCK / 2 - WORLD.ROAD_HALF - WORLD.WALK - TRACK.WOBBLE;

/** Centre coordinate of block `index` along one axis. */
export const blockCentre = (index) => index * WORLD.BLOCK + WORLD.BLOCK / 2;

/** The valid landmark centres, as a flat list of coordinates. */
export const BLOCK_CENTRES = Array.from({ length: WORLD.GRID }, (_, i) => blockCentre(i));

/**
 * Ground materials. The physics reads these to decide grip; the renderer reads
 * them to decide what to paint. They are an enum rather than a bitmap so the
 * lookup is a pure function of position, testable without a canvas.
 *
 * The indices are load-bearing: GRIP in src/config/tuning.js is an array keyed
 * by them, so a member may be renamed in place but never reordered, and a new
 * one goes on the end.
 */
export const SURFACE = Object.freeze({
  /** Packed dirt and gravel: the racing line. */
  TRACK: 0,
  /** Grass shoulder. Costs you a little. */
  VERGE: 1,
  /** The packed service area at a landmark. */
  PADDOCK: 2,
  /** Open meadow. */
  FIELD: 3,
  /** A chevron ramp. */
  BOOST: 4,
  /** A puddle: the worst place on the stage to be. */
  MUD: 5,
});

/** Boost pad footprint, centred on the track at the middle of each block segment. */
export const BOOST_PAD = Object.freeze({
  HALF_ACROSS: WORLD.ROAD_HALF - 12,
  HALF_ALONG: 26,
});

/** How close the kart must get to a landmark centre to trigger its card. */
export const DISCOVER_RADIUS = 115;
