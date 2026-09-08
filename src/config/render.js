/** Camera framing, atmosphere, sun and the quality ladder. */

export const CAMERA = Object.freeze({
  FOV: 62,
  NEAR: 0.5,
  FAR: 2600,
  /**
   * Height above the ground: eye level of someone walking the trail.
   *
   * This is the single number that decides what the scene is. Above the canopy
   * it is a landscape seen from a helicopter — legible, and nowhere anyone has
   * ever been. Down here the trees tower, the grass reaches your knees, the
   * trail leads somewhere, and the shape of the valley arrives as glimpses
   * between trunks. Everything else in this file is scaled to it.
   */
  HEIGHT: 9,
  /** How far ahead along the trail it looks. */
  LOOK_AHEAD: 130,
  /** Height of the point it aims at, relative to the ground there. Slightly
   *  below eye level, so the trail stays in frame. */
  LOOK_HEIGHT: 6,
  /** How quickly it settles after a nudge, per second. Higher than it was
   *  above the canopy: at eye level the ground moves under you far faster. */
  LAMBDA: 5,
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
  /** World units per second at rest on the controls: a walk. One unit is
   *  roughly a fifth of a metre, which is what makes the trees read as trees
   *  and the trail as something you could walk down. */
  DRIFT_SPEED: 17,
  /** Units per second held down: a run, and the way to cross a kilometre of
   *  valley without waiting ten minutes for the desert. */
  FAST_SPEED: 110,
  /** How quickly the speed responds, per second. */
  SPEED_LAMBDA: 2.6,
  /** Sideways travel, per second, when steering across the valley. */
  STRAFE_SPEED: 60,
  /** Distance from either end at which the flight reverses. */
  TURN_MARGIN: 240,
});

/**
 * Atmosphere. The fog colour is not constant: it is mixed from the biome haze
 * at the camera, which is most of why the desert reads as hot from a mile away
 * and the forest reads as damp.
 */
export const ATMOSPHERE = Object.freeze({
  /* Close in, because the camera is now standing in the undergrowth rather
     than flying over it. Haze between the trunks at a hundred units is most of
     what makes a forest read as deep; the same fog seen from above just
     erased the valley. */
  FOG_NEAR: 160,
  FOG_FAR: 1500,
  /** How quickly the fog and sky follow the biome underfoot, per second. */
  BLEND_LAMBDA: 0.9,
});

export const SUN = Object.freeze({
  /** Direction toward the sun. Low and off to one side: a raking light is the
   *  only thing that gives a heightfield its shape. */
  DIRECTION: { x: 0.5, y: 0.62, z: -0.34 },
  INTENSITY: 2.5,
  /* High. The reference look has almost no true shadow in it — every surface
     facing away from the sun is still lit, in colour. Under-lighting this is
     what turned an illustrated forest into a swamp. */
  AMBIENT_INTENSITY: 1.25,
  SHADOW_MAP_SIZE: 2048,
  /** Half-extent of the orthographic shadow frustum, in world units. It
   *  follows the camera, so this is the radius of crisp shadow, not the world.
   *  Tight, because at eye level a shadow is something you stand in. */
  SHADOW_RADIUS: 260,
});

/** The runtime picks a tier from measured frame intervals; see render/quality.js. */
export const QUALITY_TIERS = Object.freeze([
  { name: 'low', pixelRatio: 0.7, shadows: false, groundCover: 0.35 },
  { name: 'medium', pixelRatio: 1.0, shadows: true, groundCover: 0.7 },
  { name: 'high', pixelRatio: 1.5, shadows: true, groundCover: 1 },
]);

export const DEFAULT_QUALITY_INDEX = 2;
