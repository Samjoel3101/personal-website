/**
 * Every colour in the world, in one place.
 *
 * The register is a muddy backcountry rally stage: saturated earth, moss and
 * timber under a low warm sun. The lighting model is flat Lambert, so it never
 * pushes a surface toward grey on its own — the palette has to carry the
 * contrast itself, which is why the earth tones here are darker and the greens
 * more olive than they look listed out.
 */
export const SKY = Object.freeze({
  TOP: '#2e6ea8',
  MIDDLE: '#79b6dd',
  /** Must match the scene fog exactly, or the far hills end at a visible line.
   *  Hazy sage rather than the near-white it was: fog this pale bleaches
   *  whatever it touches, and a rally stage should go soft in the distance,
   *  not go blank. */
  HORIZON: '#cad3bd',
});

/** The ground you drive on and the ground you look at. */
export const TERRAIN = Object.freeze({
  /** Packed dirt and gravel: the racing line. */
  TRACK: '#8a6a44',
  /** Darker dirt where the ruts hold water. */
  TRACK_WET: '#6f5334',
  /** The ragged edge where the track frays into the verge. */
  MUD: '#4f3b26',
  /** Standing water. The one surface you do not want to be on. */
  PUDDLE: '#35301f',
  /** Grass shoulder, mown short by tyres. */
  VERGE: '#6f8f3f',
  FIELD: '#7ba244',
  FIELD_DARK: '#4c7233',
  ROCK: '#8a8577',
  ROCK_DARK: '#615d53',
  SAND: '#c2a878',
});

/**
 * Rally structures: barns, lookouts, service garages, spectator stands. Timber,
 * corrugated iron and painted board rather than a pastel facade.
 */
export const STRUCTURES = Object.freeze([
  '#8a5a33',
  '#a97b45',
  '#6f5f4c',
  '#9c8d6d',
  '#7d4a38',
  '#b39262',
  '#5f6b52',
  '#a3654a',
  '#8f8271',
  '#6b4c34',
]);

export const GLASS = Object.freeze({
  DARK: '#3f4a44',
  LIT: '#ffd98f',
});

/** Support vehicles: service trucks, marshal cars, the odd abandoned wreck. */
export const VEHICLES = Object.freeze([
  '#c8452f',
  '#3a6fa8',
  '#e2ddcb',
  '#4f5548',
  '#3f8f5e',
  '#e0af35',
  '#8a9188',
  '#7a5b8c',
  '#e07a34',
  '#4aa5a8',
]);

export const FOLIAGE = Object.freeze({
  TRUNK: '#5b4029',
  DARK: '#2b5a2a',
  MID: '#3d7a33',
  LIGHT: '#6aa03f',
});

/** Trackside dressing: bales, marker poles, tyre walls, bunting. */
export const PROPS = Object.freeze({
  TIMBER: '#7b5230',
  HAY: '#d8b451',
  TYRE: '#2a2a2c',
  FLAG_RED: '#d94b3a',
  FLAG_WHITE: '#f0ece0',
  METAL: '#6b7069',
});

export const KART_COLOURS = Object.freeze({
  BODY: '#d9482f',
  BODY_LIGHT: '#f08a5c',
  BODY_DARK: '#8f2a1c',
  TYRE: '#22242c',
  RIM: '#c9d0dc',
  SUIT: '#3a5f8c',
  HELMET: '#ffd23c',
  BOOST_FLAME: '#ffb03c',
});
