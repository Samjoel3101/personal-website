/** Renderer settings: camera framing, atmosphere, and the quality ladder. */

export const CAMERA = Object.freeze({
  FOV: 62,
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
  FOG_NEAR: 340,
  FOG_FAR: 980,
  /** Hard ceiling: WORLD.SIZE / 2. Do not raise past this without also
   *  increasing the tiling in src/render/builders/. */
  MAX_VISIBLE: 1024,
});

export const SUN = Object.freeze({
  /** Direction toward the sun, normalised by the lighting module. */
  DIRECTION: { x: 0.42, y: 0.78, z: -0.46 },
  INTENSITY: 2.4,
  /* Deliberately modest. Ambient this high plus a key light washes every
     surface toward white under filmic tone mapping — the road in particular
     stops reading as asphalt. The palette carries the brightness instead. */
  AMBIENT_INTENSITY: 0.85,
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
