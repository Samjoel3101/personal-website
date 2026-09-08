/** Camera framing, atmosphere, sun and the quality ladder. */

export const CAMERA = Object.freeze({
  FOV: 58,
  NEAR: 1,
  FAR: 4600,
  /**
   * Height the camera holds above whatever ground is under it.
   *
   * Above the canopy, deliberately. The pines reach 88 units and fly-through
   * footage from inside a forest is a dark green blur with a trunk in it — the
   * shape of the valley, which is the thing worth looking at, is only visible
   * from above the trees.
   */
  HEIGHT: 112,
  /** How far ahead down the valley it looks. */
  LOOK_AHEAD: 380,
  /** Height of the point it aims at, relative to the ground there. Well below
   *  the camera, so the view is angled down over the landscape. */
  LOOK_HEIGHT: 24,
  /** How quickly it settles after a nudge, per second. */
  LAMBDA: 3.4,
  /** Limits on the viewer's own look, in radians. */
  MAX_PITCH: 0.55,
  MIN_PITCH: -0.42,
  MAX_YAW: 1.15,
});

/**
 * The flight down the valley.
 *
 * The whole piece is a journey from one biome to another, so the default state
 * is moving: the camera drifts forward on its own and the viewer steers,
 * speeds up, slows down or stops. Reaching the end turns it around rather than
 * stopping dead, so the scene never arrives at a state with nothing happening.
 */
export const JOURNEY = Object.freeze({
  /** World units per second at rest on the controls. */
  DRIFT_SPEED: 34,
  /** Units per second held down. */
  FAST_SPEED: 220,
  /** How quickly the speed responds, per second. */
  SPEED_LAMBDA: 2.6,
  /** Sideways travel, per second, when steering across the valley. */
  STRAFE_SPEED: 150,
  /** Distance from either end at which the flight reverses. */
  TURN_MARGIN: 240,
});

/**
 * Atmosphere. The fog colour is not constant: it is mixed from the biome haze
 * at the camera, which is most of why the desert reads as hot from a mile away
 * and the forest reads as damp.
 */
export const ATMOSPHERE = Object.freeze({
  FOG_NEAR: 420,
  FOG_FAR: 3000,
  /** How quickly the fog and sky follow the biome underfoot, per second. */
  BLEND_LAMBDA: 0.9,
});

export const SUN = Object.freeze({
  /** Direction toward the sun. Low and off to one side: a raking light is the
   *  only thing that gives a heightfield its shape. */
  DIRECTION: { x: 0.62, y: 0.4, z: -0.38 },
  INTENSITY: 2.4,
  AMBIENT_INTENSITY: 0.55,
  SHADOW_MAP_SIZE: 2048,
  /** Half-extent of the orthographic shadow frustum, in world units. It
   *  follows the camera, so this is the radius of crisp shadow, not the world. */
  SHADOW_RADIUS: 620,
});

/** The runtime picks a tier from measured frame intervals; see render/quality.js. */
export const QUALITY_TIERS = Object.freeze([
  { name: 'low', pixelRatio: 0.7, shadows: false, groundCover: 0.35 },
  { name: 'medium', pixelRatio: 1.0, shadows: true, groundCover: 0.7 },
  { name: 'high', pixelRatio: 1.5, shadows: true, groundCover: 1 },
]);

export const DEFAULT_QUALITY_INDEX = 2;
