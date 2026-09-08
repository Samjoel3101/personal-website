import { Group } from 'three';
import { CANOPY, GROUND_COVER } from '../config/flora.js';
import { vertexColoured } from './materials.js';
import { instancedChunks } from './geometry/instancing.js';
import { normalisedParts } from './model-upgrade.js';
import {
  cactus,
  cactusRound,
  conifer,
  coniferTall,
  deadTree,
  palm,
} from './geometry/tree-shapes.js';
import { aspen, birch, mapleGold, mapleRed, oak } from './geometry/broadleaf-shapes.js';
import {
  bush,
  fern,
  grass,
  grassDry,
  log,
  mushroom,
  reed,
  tallGrass,
} from './geometry/cover-shapes.js';
import { boulder, pebble, shard } from './geometry/stone-shapes.js';
import {
  flowerBlue,
  flowerPink,
  flowerPurple,
  flowerWhite,
  flowerYellow,
} from './geometry/flower-shapes.js';

/**
 * Everything that grows, drawn.
 *
 * The world model decided what stands where; this decides what it looks like.
 * The only thing connecting the two is the `shape` name on each species, which
 * is why the planting can be unit-tested in Node without a single triangle
 * existing.
 *
 * Each species becomes a handful of instanced meshes — one per chunk of the
 * valley, see ./geometry/instancing.js — sharing one geometry and, for the
 * procedural shapes, one material for the entire scene.
 */
const SHAPES = {
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
  boulder,
  shard,
  log,
};

/**
 * Tile size per pass, in world units.
 *
 * Two numbers rather than one because the two passes have opposite problems.
 * The canopy is a few hundred plants per species spread over a kilometre, so
 * small tiles buy nothing and cost a draw call each; the undergrowth is tens
 * of thousands, where a tile that spans the fog is most of a frame's work
 * thrown away. These are the sizes that keep the drawn tile count in the low
 * hundreds at eye level.
 */
const TILE = { canopy: 500, cover: 550 };

/**
 * How far the fetched models reach, in world units.
 *
 * Beyond this the procedural shape is drawn instead, and that swap is what
 * makes the pack affordable at all: a Quaternius pine is five thousand
 * triangles where the procedural one is eighty, and a forest of two thousand
 * of them is fifteen million triangles a frame. Near the camera the model is
 * the whole point; at four hundred units it is thirty pixels tall behind half
 * the fog, and the silhouettes are the same.
 *
 * Chosen against the fog rather than by eye: far enough that the swap happens
 * where haze has already taken most of the detail, near enough to matter.
 */
const MODEL_DISTANCE = 420;

export function buildFlora(valley) {
  const group = new Group();
  group.name = 'flora';

  const planted = new Map();
  add(planted, group, CANOPY, valley.canopy, { shadows: true, chunk: TILE.canopy });
  add(planted, group, GROUND_COVER, valley.cover, { shadows: false, chunk: TILE.cover });

  return {
    group,

    /**
     * Adds a fetched model to a species as its near-distance form.
     *
     * The procedural meshes are kept, not replaced. Both sets are tiled the
     * same way, so each tile has a model mesh and a procedural one and exactly
     * one of them is visible — see `update` and MODEL_DISTANCE above.
     *
     * Called per asset as it lands, long after the scene is on screen. A model
     * that never arrives simply never calls this, and every tile keeps showing
     * the procedural shape at every distance.
     *
     * @returns {boolean} whether anything was taken
     */
    useModel(assetId, model) {
      const entry = [...planted.values()].find((item) =>
        (item.species.assets ?? []).includes(assetId),
      );
      if (!entry || entry.model.length > 0) return false;

      const parts = normalisedParts(model);
      if (parts.length === 0) return false;

      entry.model = parts.flatMap((part) =>
        instancedChunks(part.geometry, part.material, entry.items, entry.options),
      );
      for (const mesh of entry.model) {
        mesh.name = `${entry.species.id}:model`;
        mesh.visible = false;
      }
      group.add(...entry.model);
      return true;
    },

    /**
     * Picks the form of every tile against the camera. Once a frame.
     *
     * Each mesh knows where its own instances are — `computeBoundingSphere`
     * ran at build time — so this is one distance test per tile and no
     * traversal of anything.
     */
    update(viewer) {
      for (const entry of planted.values()) {
        if (entry.model.length === 0) continue;
        for (const mesh of entry.model) mesh.visible = isNear(mesh, viewer);
        for (const mesh of entry.meshes) mesh.visible = !isNear(mesh, viewer);
      }
    },

    get diagnostics() {
      return [...planted.values()].map((entry) => ({
        id: entry.species.id,
        count: entry.items.length,
        tiles: entry.meshes.length,
        model: entry.model.length > 0,
      }));
    },
  };
}

/** Is this tile's own bounding sphere within model range of the viewer? */
function isNear(mesh, viewer) {
  const sphere = mesh.boundingSphere;
  if (!sphere) return true;
  return sphere.center.distanceTo(viewer) - sphere.radius < MODEL_DISTANCE;
}

function add(planted, group, species, items, options) {
  const material = vertexColoured();

  for (const entry of species) {
    const list = items.get(entry.id) ?? [];
    if (list.length === 0) continue;

    const build = SHAPES[entry.shape];
    if (!build) throw new Error(`No shape "${entry.shape}" for species "${entry.id}"`);

    const meshes = instancedChunks(build(), material, list, options);
    // Named for the console and the tests: a scene of anonymous InstancedMeshes
    // is very hard to reason about from a screenshot.
    for (const mesh of meshes) mesh.name = entry.id;
    group.add(...meshes);
    planted.set(entry.id, { species: entry, items: list, meshes, model: [], options });
  }
}
