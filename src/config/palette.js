/**
 * Every colour in the scene.
 *
 * The register is the low-poly nature look: flat, saturated, unshaded by
 * anything but a single warm sun. The lighting model is Lambert, which never
 * pushes a surface toward grey on its own, so the palette has to carry the
 * contrast itself — the greens are darker and the sands warmer than they look
 * listed out here.
 *
 * Anything keyed by biome id is blended by the same weights that drive the
 * terrain, so a colour only ever has to be right at the middle of its band.
 */

/** The sky gradient. The horizon stop is blended toward the fog at runtime. */
export const SKY = Object.freeze({
  TOP: '#2f7fc4',
  MIDDLE: '#8ac2e4',
  HORIZON: '#dfe7dc',
});

/** Horizon and fog, per biome. The far distance is where the journey reads. */
export const HAZE = Object.freeze({
  forest: '#c9dcd0',
  woodland: '#d8e0c6',
  scrub: '#e6ddb6',
  desert: '#f2dcab',
});

/** Ground, per biome: the flat, the slope, and the bare rock under both. */
export const GROUND = Object.freeze({
  forest: { flat: '#3f6f33', slope: '#345c2f', bare: '#5c4a32' },
  woodland: { flat: '#5c8438', slope: '#4a6b30', bare: '#6b5535' },
  scrub: { flat: '#93964b', slope: '#7d7b44', bare: '#9c7b4b' },
  desert: { flat: '#d9b676', slope: '#c49a5c', bare: '#b0794c' },
});

/**
 * Exposed rock: on anything too steep to hold soil, and on every boulder.
 *
 * Neutral rather than olive. An earlier grey-green here made every lit
 * boulder top read as a mossy plateau — under a warm sun a stone with any
 * green in it stops being a stone.
 */
export const ROCK = Object.freeze({
  COOL: '#8b8578',
  WARM: '#9c6a45',
});

/** Sand ring around standing water, and the water itself. */
export const WATER = Object.freeze({
  SHALLOW: '#4f9c92',
  DEEP: '#1f5f66',
  BANK: '#b9a173',
});

/** Plant life. Species pick from here rather than inventing their own greens. */
export const FLORA = Object.freeze({
  PINE_DARK: '#22503a',
  PINE_MID: '#2f6b43',
  PINE_LIGHT: '#3f8a4c',
  BROADLEAF_DARK: '#3c7233',
  BROADLEAF_MID: '#549140',
  BROADLEAF_LIGHT: '#77ab4a',
  BARK: '#4a3524',
  BARK_LIGHT: '#6b503a',
  BIRCH_BARK: '#d5cfbe',
  DEAD_WOOD: '#8d7250',
  GRASS_GREEN: '#5f9b3d',
  GRASS_DRY: '#b9a95e',
  CACTUS: '#3d7a4e',
  CACTUS_DARK: '#2d5c3c',
  PALM_FROND: '#4f8f45',
  PALM_TRUNK: '#8a6a44',
  FLOWER_A: '#e2685f',
  FLOWER_B: '#efc75e',
  MUSHROOM_CAP: '#c04b3c',
  MUSHROOM_STEM: '#e8ddc4',
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
