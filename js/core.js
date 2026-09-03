/* core.js — world constants, lighting model, deterministic RNG, wrap-aware
   math, colour utils. Loaded first; exposes a global `K` plus free functions. */

const K = {
  /* World. Power of two so wrapping is a bitmask instead of a modulo. */
  WORLD: 2048,
  WORLD_MASK: 2047,
  BLOCK: 512,          // road-to-road spacing
  ROAD_HALF: 46,       // asphalt half-width
  WALK: 18,            // sidewalk band outside the asphalt

  /* Surface ids baked into the surface map, sampled by the physics. */
  SURF: { ROAD: 0, WALK: 1, PLAZA: 2, GRASS: 3, BOOST: 4 },

  /* Renderer. Geometry is drawn at the display's own resolution with
     anti-aliasing on. Only the ground raster runs at a fraction of that and
     is bilinearly upscaled — it is a per-pixel software loop, so it is the
     one thing that cannot be free at full resolution, and a smooth upscale
     of a texture-mapped road is indistinguishable from the real thing. */
  RW: 1280,
  RH: 720,
  GROUND_SCALE: 0.5,   // ground raster resolution, relative to the canvas
  MAX_W: 1800,         // caps on the render target, whatever the display is
  MAX_H: 1000,
  HORIZON: 297,        // horizon as a fraction of height: 297/720 = 0.4125
  CAM_H: 30,           // camera height above the road
  CAM_BACK: 34,        // camera distance behind the kart
  NEAR: 12,            // near clip for projected geometry
  FAR: 1900,           // draw distance
  FOG_START: 620,

  /* Sky. The haze colour is also the fog colour, so distant geometry melts
     into the horizon instead of ending at a visible line. */
  SKY_TOP: '#1f7fd4',
  SKY_MID: '#6cc2f2',
  SKY_HAZE: '#c2e2f5',

  /* Kart */
  MAX_SPEED: 250,
  BOOST_SPEED: 380,
  ACCEL: 210,
  BRAKE: 400,
  DRAG: 0.86,
  TURN: 2.5,

  DISCOVER_R: 115      // how close you must get to a landmark to trigger it
};

/* --------------------------------------------------------------- lighting --
   A key light (the sun), a weaker fill from roughly the opposite side
   standing in for sky bounce, and a flat ambient term. Precomputed per face
   normal, since the sun does not move: four constants, no per-frame work.
   The same sun direction drives the ground shadows, so shading and shadows
   agree — which is most of what makes a flat-shaded scene read as lit. */
const SUN = { x: 0.30, y: 0.82, z: -0.49 };   // direction toward the sun
const FILL = { x: -0.30, y: 0.60, z: 0.49 };  // direction toward the sky bounce

/* Deliberately flat and bright. A physically-weighted key light gives you
   near-black shadow sides, which is exactly the look a cartoon racer avoids:
   its world is lit so that every surface stays saturated and readable, and
   the sun only tips faces a little brighter or darker than each other. */
const AMBIENT = 0.62, KEY = 0.80, FILLK = 0.30;

function faceLight(nx, ny, nz) {
  const k = Math.max(0, nx * SUN.x + ny * SUN.y + nz * SUN.z);
  const f = Math.max(0, nx * FILL.x + ny * FILL.y + nz * FILL.z);
  return AMBIENT + KEY * k + FILLK * f;
}

K.FACE = {
  PX: faceLight(1, 0, 0),    // ~0.86  east-facing, catches the sun obliquely
  NX: faceLight(-1, 0, 0),   // ~0.71  in shade, lit only by bounce
  PZ: faceLight(0, 0, 1),    // ~0.77
  NZ: faceLight(0, 0, -1),   // ~1.01  square to the sun, the bright side
  TOP: faceLight(0, 1, 0)    // clamped in practice
};

/* Ground offset a shadow travels per unit of height. Straight from the sun
   direction, so the shadows fall the same way the faces are lit. */
K.SHADOW = { x: -SUN.x / SUN.y, z: -SUN.z / SUN.y };

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

/* --- colour utils ----------------------------------------------------------
   `shadeFog` runs a few thousand times a frame, so parsing a hex string every
   call actually shows up in a profile. The parse is memoised; there are only
   a couple of dozen distinct colours in the whole city. */
const RGB_CACHE = new Map();
function hexToRgb(hex) {
  let v = RGB_CACHE.get(hex);
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    RGB_CACHE.set(hex, v);
  }
  return v;
}

function rgbToCss(r, g, b) { return `rgb(${r | 0},${g | 0},${b | 0})`; }

/* Pack a hex colour into the ABGR word layout an ImageData buffer uses. */
function packRGB(hex) {
  const [r, g, b] = hexToRgb(hex);
  return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
}

K.FOG = packRGB(K.SKY_HAZE);
const FOG_RGB = hexToRgb(K.SKY_HAZE);

/* Scale a hex colour's brightness and return CSS. Used for face shading. */
function shade(hex, mul) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToCss(Math.min(255, r * mul), Math.min(255, g * mul), Math.min(255, b * mul));
}

/* Mix a shaded hex colour toward the fog colour by `t` (0..1) and return CSS. */
function shadeFog(hex, mul, t) {
  const [r, g, b] = hexToRgb(hex);
  if (t <= 0) {
    return rgbToCss(Math.min(255, r * mul), Math.min(255, g * mul), Math.min(255, b * mul));
  }
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
