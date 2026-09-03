/* core.js — world constants, deterministic RNG, wrap-aware math, colour utils.
   Loaded before everything else; exposes a single global `K` (constants) plus
   a handful of free functions. */

const K = {
  /* World. Power of two so wrapping is a bitmask instead of a modulo. */
  WORLD: 2048,
  WORLD_MASK: 2047,
  BLOCK: 512,          // road-to-road spacing
  ROAD_HALF: 46,       // asphalt half-width
  WALK: 18,            // sidewalk band outside the asphalt

  /* Surface ids baked into the surface map, sampled by the physics. */
  SURF: { ROAD: 0, WALK: 1, PLAZA: 2, GRASS: 3, BOOST: 4 },

  /* Renderer. Deliberately tiny — it is upscaled with smoothing off. */
  RW: 400,             // internal render width
  RH: 232,             // internal render height
  HORIZON: 96,         // scanline of the horizon
  CAM_H: 30,           // camera height above the road
  CAM_BACK: 34,        // camera distance behind the kart
  NEAR: 12,            // near clip for projected geometry
  FAR: 1500,           // draw distance
  FOG_START: 500,

  /* Colours */
  FOG: 0xffcfa87a,     // packed ABGR (little-endian) haze colour
  SKY_TOP: '#2a4a8f',
  SKY_MID: '#7fa8d8',
  SKY_HAZE: '#7aa8cf',

  /* Kart */
  MAX_SPEED: 250,
  BOOST_SPEED: 380,
  ACCEL: 210,
  BRAKE: 400,
  DRAG: 0.86,
  TURN: 2.5,

  DISCOVER_R: 115      // how close you must get to a landmark to trigger it
};

/* --- deterministic RNG (mulberry32) so the city is identical every load --- */
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --- wrapping helpers -----------------------------------------------------
   The world is a torus: driving off one edge brings you back on the other, so
   there are no invisible walls and you can never get permanently lost. Any
   difference between two positions has to be taken the short way round. */
function wrap(v) { return ((v % K.WORLD) + K.WORLD) % K.WORLD; }

function wrapDelta(d) {
  d = wrap(d);
  return d > K.WORLD / 2 ? d - K.WORLD : d;
}

function wrapDist(ax, az, bx, bz) {
  const dx = wrapDelta(ax - bx), dz = wrapDelta(az - bz);
  return Math.hypot(dx, dz);
}

/* --- colour utils ---------------------------------------------------------- */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToCss(r, g, b) { return `rgb(${r | 0},${g | 0},${b | 0})`; }

/* Scale a hex colour's brightness and return CSS. Used for face shading. */
function shade(hex, mul) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToCss(Math.min(255, r * mul), Math.min(255, g * mul), Math.min(255, b * mul));
}

/* Mix a shaded hex colour toward the fog colour by `t` (0..1) and return CSS. */
const FOG_RGB = [K.FOG & 255, (K.FOG >> 8) & 255, (K.FOG >> 16) & 255];
function shadeFog(hex, mul, t) {
  const [r, g, b] = hexToRgb(hex);
  const s = 1 - t;
  return rgbToCss(
    Math.min(255, r * mul) * s + FOG_RGB[0] * t,
    Math.min(255, g * mul) * s + FOG_RGB[1] * t,
    Math.min(255, b * mul) * s + FOG_RGB[2] * t
  );
}

/* How hazy is something at this depth? 0 near, 1 at the draw distance. */
function fogAt(depth) {
  if (depth <= K.FOG_START) return 0;
  const t = (depth - K.FOG_START) / (K.FAR - K.FOG_START);
  return t > 1 ? 1 : t;
}

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
