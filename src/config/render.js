/** Renderer settings: camera framing, atmosphere, and the quality ladder. */

export const CAMERA = Object.freeze({
  FOV: 62,
  /** Extra degrees of field of view at full boost. Speed reads as speed only
   *  if the edges of the frame move faster than the middle. */
  FOV_KICK: 7,
  /** How quickly the kick comes on and lets go, per second. Slower than the
   *  camera follow on purpose: a snappy FOV reads as a glitch. */
  FOV_LAMBDA: 3,
  NEAR: 1,
  FAR: 1100,
  /** Distance the camera trails behind the kart. */
  DISTANCE: 68,
  /** Height above the road. */
  HEIGHT: 27,
  /** Point above the kart the camera aims at. */
  LOOK_HEIGHT: 11,
  /** How quickly the camera catches up, per second. Lag is what makes
   *  cornering feel like cornering. */
  FOLLOW_LAMBDA: 7,
});

/**
 * Atmosphere, and the one hard constraint the wrapping world places on it.
 *
 * The city is tiled 3x3 in the scene so it has no visible edge. That works
 * only while you cannot see further than half the world (1024 units) — beyond
 * that you would be looking at a second copy of the same street and the
 * repetition would show. So the fog has to finish the picture before the
 * repeat begins, and the camera's far plane sits just behind it.
 */
export const ATMOSPHERE = Object.freeze({
  FOG_NEAR: 300,
  FOG_FAR: 980,
  /** Hard ceiling: WORLD.SIZE / 2. Do not raise past this without also
   *  increasing the tiling in src/render/builders/. */
  MAX_VISIBLE: 1024,
});

export const SUN = Object.freeze({
  /** Direction toward the sun, normalised by the lighting module. Low in the
   *  sky: a late-afternoon rally sun rakes across the hills, which is what
   *  gives a heightfield its shape. Raise y and the terrain flattens out. */
  DIRECTION: { x: 0.5, y: 0.34, z: -0.52 },
  INTENSITY: 2.5,
  /* Modest, and now a little lower than the city needed. Ambient plus a key
     light washes every surface toward white under filmic tone mapping, and mud
     is the first thing to stop reading as mud. Rally scenery can carry more
     shadow contrast than pastel facades could, so the sun does more of the
     work and this does less. */
  AMBIENT_INTENSITY: 0.62,
  SHADOW_MAP_SIZE: 2048,
  /** Half-extent of the orthographic shadow frustum, in world units. */
  SHADOW_RADIUS: 420,
});

/**
 * Quality ladder. The runtime picks a tier from the measured frame interval
 * and can move up or down it; see src/render/quality.js.
 */
export const QUALITY_TIERS = Object.freeze([
  { name: 'low', pixelRatio: 0.7, shadows: false, bloom: false },
  { name: 'medium', pixelRatio: 1.0, shadows: true, bloom: false },
  { name: 'high', pixelRatio: 1.5, shadows: true, bloom: true },
]);

export const DEFAULT_QUALITY_INDEX = 2;
