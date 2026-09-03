/**
 * Every colour in the world, in one place. Light and saturated: the flat
 * lighting model used here never pushes a facade toward grey, so the palette
 * has to carry the contrast itself.
 */
export const SKY = Object.freeze({
  TOP: '#1f7fd4',
  MIDDLE: '#6cc2f2',
  HORIZON: '#c2e2f5',
});

export const GROUND = Object.freeze({
  ROAD: '#4b505b',
  PAVEMENT: '#cdc8bc',
  PLAZA: '#ded6c3',
  LOT: '#9c9377',
  GRASS: '#57b04a',
  LINE_WHITE: '#fbfaf4',
  LINE_YELLOW: '#ffd64a',
  KERB: '#f2efe6',
});

/** Pastel facades. Ten tones so a street never repeats obviously. */
export const BUILDINGS = Object.freeze([
  '#ecdfc2',
  '#8fd4c8',
  '#f2a684',
  '#accbee',
  '#f4dc86',
  '#d6acd9',
  '#a4d684',
  '#eeb4a4',
  '#c3ccd8',
  '#f0c9a0',
]);

export const GLASS = Object.freeze({
  DARK: '#4d7ba8',
  LIT: '#ffe9a8',
});

export const CARS = Object.freeze([
  '#ef5544',
  '#3d84d8',
  '#f2f0e8',
  '#5c6472',
  '#3fb87a',
  '#f5c73c',
  '#a9b2c0',
  '#b062c0',
  '#ff9a4d',
  '#57d0d8',
]);

export const FOLIAGE = Object.freeze({
  TRUNK: '#6b4a2a',
  DARK: '#237a30',
  MID: '#33a03c',
  LIGHT: '#4fc44a',
});

export const KART_COLOURS = Object.freeze({
  BODY: '#ef4a35',
  BODY_LIGHT: '#ff8a6d',
  BODY_DARK: '#b52a1c',
  TYRE: '#22242c',
  RIM: '#c9d0dc',
  SUIT: '#3479c4',
  HELMET: '#ffd23c',
  BOOST_FLAME: '#ffb03c',
});
