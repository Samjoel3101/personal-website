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
import { leafLitterMat, moss, needleMat, sedgeTussock } from './forest-floor-shapes.js';
import { bluebell, bramble, wildGarlic, woodAnemone } from './woodland-flower-shapes.js';
import { fernOpen, grassUpright, sedgeTussockLoose } from './cover-shape-variants.js';

/**
 * The only thing joining the world model to the geometry.
 *
 * A species in src/config names a `shape`; this maps that name to a builder.
 * That one string is the entire coupling, which is why the planting can be
 * unit-tested in Node without a triangle existing — and why this table lives
 * apart from the flora renderer rather than inside it.
 *
 * A value may be a builder or a list of them. A list is variants of the one
 * shape, the procedural equivalent of a species' `assets` list: flora.js
 * splits a species' items across them by a hash of where they stand, so the
 * same silhouette is not rotated and rescaled across every instance of a
 * heavily-planted species. Reserved for the shapes with the most weight on
 * the floor — see cover-shape-variants.js.
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
  grass: [grass, grassUpright],
  'tall-grass': tallGrass,
  'grass-dry': grassDry,
  'grass-mat': grassMat,
  'dry-mat': dryMat,
  clover,
  fern: [fern, fernOpen],
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
  'leaf-litter-mat': leafLitterMat,
  'needle-mat': needleMat,
  moss,
  'sedge-tussock': [sedgeTussock, sedgeTussockLoose],
  /** No new geometry: a vernal grass and a fescue are the same tuft shapes
   *  under a different species, the way a model gets swapped in without the
   *  procedural fallback changing. */
  'vernal-grass': [grass, grassUpright],
  fescue: tallGrass,
  'wild-garlic': wildGarlic,
  'wood-anemone': woodAnemone,
  bluebell,
  bramble,
});
