import { Group } from 'three';
import { CANOPY, GROUND_COVER } from '../config/flora.js';
import { vertexColoured } from './materials.js';
import { instancedChunks } from './geometry/instancing.js';
import { normalisedParts } from './model-upgrade.js';
import {
  birch,
  broadleaf,
  cactus,
  cactusRound,
  conifer,
  coniferTall,
  deadTree,
  palm,
} from './geometry/tree-shapes.js';
import {
  boulder,
  bush,
  fern,
  flower,
  grass,
  grassDry,
  log,
  mushroom,
  reed,
  rock,
} from './geometry/cover-shapes.js';

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
  broadleaf,
  'dead-tree': deadTree,
  palm,
  cactus,
  'cactus-round': cactusRound,
  grass,
  'grass-dry': grassDry,
  fern,
  bush,
  flower,
  mushroom,
  reed,
  rock,
  boulder,
  log,
};

export function buildFlora(valley) {
  const group = new Group();
  group.name = 'flora';

  const planted = new Map();
  add(planted, group, CANOPY, valley.canopy, true);
  add(planted, group, GROUND_COVER, valley.cover, false);

  return {
    group,

    /**
     * Replaces a species' procedural shape with a fetched model.
     *
     * Called per asset as it lands, long after the scene is already on screen,
     * so it has to swap in place: the old meshes come out of the group and are
     * disposed, and the same item list is instanced again against the model's
     * parts. A model that never arrives simply never calls this.
     *
     * @returns {boolean} whether anything was replaced
     */
    useModel(assetId, model) {
      const entry = [...planted.values()].find((item) => item.species.asset === assetId);
      const parts = entry ? normalisedParts(model) : [];
      if (!entry || parts.length === 0) return false;

      for (const mesh of entry.meshes) {
        group.remove(mesh);
        mesh.dispose();
      }
      entry.meshes = parts.flatMap((part) =>
        instancedChunks(part.geometry, part.material, entry.items, { shadows: entry.shadows }),
      );
      for (const mesh of entry.meshes) mesh.name = entry.species.id;
      group.add(...entry.meshes);
      return true;
    },

    get diagnostics() {
      return [...planted.values()].map((entry) => ({
        id: entry.species.id,
        count: entry.items.length,
        meshes: entry.meshes.length,
      }));
    },
  };
}

function add(planted, group, species, items, shadows) {
  const material = vertexColoured();

  for (const entry of species) {
    const list = items.get(entry.id) ?? [];
    if (list.length === 0) continue;

    const build = SHAPES[entry.shape];
    if (!build) throw new Error(`No shape "${entry.shape}" for species "${entry.id}"`);

    const meshes = instancedChunks(build(), material, list, { shadows });
    // Named for the console and the tests: a scene of anonymous InstancedMeshes
    // is very hard to reason about from a screenshot.
    for (const mesh of meshes) mesh.name = entry.id;
    group.add(...meshes);
    planted.set(entry.id, { species: entry, items: list, meshes, shadows });
  }
}
