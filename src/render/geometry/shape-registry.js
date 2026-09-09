import { cactus, cactusRound, conifer, coniferTall, deadTree, palm } from './tree-shapes.js';
import { aspen, birch, mapleGold, mapleRed, oak } from './broadleaf-shapes.js';
import {
  bush,
  clover,
  dryMat,
  fern,
  grass,
  grassDry,
  grassMat,
  log,
  mushroom,
  reed,
  tallGrass,
} from './cover-shapes.js';
import { boulder, flatStone, pebble, shard } from './stone-shapes.js';
import {
  flowerBlue,
  flowerPink,
  flowerPurple,
  flowerWhite,
  flowerYellow,
} from './flower-shapes.js';

/**
 * The only thing joining the world model to the geometry.
 *
 * A species in src/config names a `shape`; this maps that name to a builder.
 * That one string is the entire coupling, which is why the planting can be
 * unit-tested in Node without a triangle existing — and why this table lives
 * apart from the flora renderer rather than inside it.
 */
export const SHAPES = Object.freeze({
  conifer,
  'conifer-tall': coniferTall,
  birch,
  aspen,
  oak,
  'maple-red': mapleRed,
  'maple-gold': mapleGold,
  'dead-tree': deadTree,
  palm,
  cactus,
  'cactus-round': cactusRound,
  grass,
  'tall-grass': tallGrass,
  'grass-dry': grassDry,
  'grass-mat': grassMat,
  'dry-mat': dryMat,
  clover,
  fern,
  bush,
  'flower-blue': flowerBlue,
  'flower-purple': flowerPurple,
  'flower-pink': flowerPink,
  'flower-yellow': flowerYellow,
  'flower-white': flowerWhite,
  mushroom,
  reed,
  rock: pebble,
  'flat-stone': flatStone,
  boulder,
  shard,
  log,
});
