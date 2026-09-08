/**
 * Every colour in the scene.
 *
 * The register is the bright end of the low-poly nature look: high-key,
 * saturated, sunlit, with pale haze in the distance and almost no true
 * shadow. That is a deliberate target and not a default — an earlier, muddier
 * version of this palette was accurate to a real forest and read as a swamp.
 * The lighting model is Lambert, which never pushes a surface toward grey on
 * its own, so the palette has to carry the whole picture.
 *
 * Anything keyed by biome id is blended by the same weights that drive the
 * terrain, so a colour only ever has to be right in the middle of its band.
 */

/** The sky gradient. The horizon stop is blended toward the fog at runtime. */
export const SKY = Object.freeze({
  TOP: '#2f9bd8',
  MIDDLE: '#7cc9ea',
  HORIZON: '#e4f2f2',
});

/** Horizon and fog, per biome. The far distance is where the journey reads. */
export const HAZE = Object.freeze({
  forest: '#d2ecdf',
  woodland: '#e3eede',
  scrub: '#efe6bd',
  desert: '#f8e4b0',
});

/** Ground, per biome: the flat, the slope, and the bare earth under both. */
export const GROUND = Object.freeze({
  forest: { flat: '#529f36', slope: '#3f8130', bare: '#7c5e39' },
  woodland: { flat: '#6fb23d', slope: '#568e32', bare: '#8b6b40' },
  scrub: { flat: '#a9a44f', slope: '#8e8842', bare: '#a9814e' },
  desert: { flat: '#e4c586', slope: '#cea866', bare: '#be8b56' },
});

/**
 * What the plant communities do to the ground under them.
 *
 * The reference art's floor is not one green: it runs from rich shaded green
 * through open meadow to drifts of dry gold, in stands tens of metres across.
 * Half of that is the planting; the other half is the ground itself, and this
 * is that half. Mixed in by the same field that decides what grows there — see
 * src/world/patches.js.
 */
export const MEADOW = Object.freeze({
  DRY: '#c9b45c',
  RICH: '#3d7d2c',
});

/**
 * The trail's own earth, per biome.
 *
 * Warmer and lighter than the `bare` tone beside it: bare ground is soil that
 * never grew anything, and a trail is soil that has been walked dry.
 */
export const TRAIL = Object.freeze({
  forest: '#a87d4e',
  woodland: '#b2874f',
  scrub: '#c39c5f',
  desert: '#ddb97b',
});

/**
 * Exposed rock, and every stone standing in the undergrowth.
 *
 * Pale, nearly white in the light. Grey rock in a scene this bright reads as a
 * hole in the picture; the stones in the reference art are the lightest thing
 * in the frame after the sky, and they are what stops a wall of green from
 * being a wall.
 */
export const ROCK = Object.freeze({
  /* Grey-green rather than near-white, matched to the pack's own stone: the
     procedural rocks stand in for the fetched ones past MODEL_DISTANCE, and a
     white boulder beside a grey one makes the swap the first thing you see. */
  PALE: '#b3b9af',
  SHADE: '#8d948a',
  COOL: '#b4b9b0',
  WARM: '#b0855e',
});

/** Standing water, and the sand ring around it. */
export const WATER = Object.freeze({
  SHALLOW: '#63c3b6',
  DEEP: '#1f7a80',
  BANK: '#cdb587',
});

/** Plant life. Species pick from here rather than inventing their own greens. */
export const FLORA = Object.freeze({
  PINE_DARK: '#35784a',
  PINE_MID: '#4b9c57',
  PINE_LIGHT: '#6bb964',
  BROADLEAF_DARK: '#47953a',
  BROADLEAF_MID: '#63b442',
  BROADLEAF_LIGHT: '#93d554',
  /** The autumn crowns. Half the reason the reference forest reads as warm. */
  AUTUMN_RED: '#c4402f',
  AUTUMN_RUST: '#9d3b2c',
  AUTUMN_ORANGE: '#de7f2b',
  AUTUMN_GOLD: '#dab632',
  AUTUMN_OLIVE: '#b0a233',
  BARK: '#7d5c3d',
  BARK_LIGHT: '#9d7c55',
  BIRCH_BARK: '#e8e3d5',
  BIRCH_MARK: '#5f5d54',
  DEAD_WOOD: '#a58e66',
  /** The base of a ground mat: close to the ground's own green, so the mats
   *  read as the floor rather than as patches laid on it. */
  MAT_GREEN: '#4e9c33',
  MAT_DRY: '#b39f4e',
  GRASS_GREEN: '#74c742',
  GRASS_LIGHT: '#9ade56',
  GRASS_DRY: '#c7b55f',
  CACTUS: '#4c9e5d',
  CACTUS_DARK: '#357c4a',
  PALM_FROND: '#59a54b',
  PALM_TRUNK: '#9e7c50',
  FLOWER_BLUE: '#4aa8e6',
  FLOWER_PURPLE: '#a172d8',
  FLOWER_PINK: '#ec88bf',
  FLOWER_YELLOW: '#f6d94f',
  FLOWER_WHITE: '#f5f2e5',
  MUSHROOM_CAP: '#d4503c',
  MUSHROOM_STEM: '#f1e9d3',
});

/**
 * Downloaded kits, repainted onto this palette by glTF material name.
 *
 * Kenney's untextured kits carry flat named materials rather than an atlas,
 * and the colours in the files are not the colours the kit is drawn with:
 * the greens arrive teal and the browns salmon. Every name recognised here is
 * repainted from the palette above so a fetched model sits in the same scene
 * as the procedural one beside it; anything unrecognised keeps the colour it
 * shipped with, so a new kit degrades to its own look rather than to nothing.
 */
export const KIT_TINTS = Object.freeze({
  grass: FLORA.GRASS_GREEN,
  leafsGreen: FLORA.BROADLEAF_MID,
  leafsDark: FLORA.PINE_DARK,
  woodBark: FLORA.BARK,
  woodBarkDark: FLORA.BARK,
  wood: FLORA.BARK_LIGHT,
  woodDark: FLORA.BARK,
  woodInner: FLORA.DEAD_WOOD,
  dirt: GROUND.woodland.bare,
  stone: ROCK.COOL,
  cactus: FLORA.CACTUS,
  sand: GROUND.desert.flat,
});
