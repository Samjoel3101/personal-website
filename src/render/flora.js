import { Group } from 'three';
import { CANOPY, GROUND_COVER } from '../config/flora.js';
import { LOD } from '../config/render.js';
import { vertexColoured } from './materials.js';
import { instancedChunks } from './geometry/instancing.js';
import { SHAPES } from './geometry/shape-registry.js';
import { normalisedParts } from './model-upgrade.js';

/**
 * Everything that grows, drawn.
 *
 * The world model decided what stands where; this decides what it looks like.
 * The only thing connecting the two is the `shape` name on each species, which
 * is why the planting can be unit-tested in Node without a single triangle
 * existing.
 *
 * Each species becomes a handful of instanced meshes — one per tile of the
 * valley, see ./geometry/instancing.js — sharing one geometry and, for the
 * procedural shapes, one material for the entire scene.
 *
 * ---------------------------------------------------------------------------
 * TWO RINGS, NOT ONE.
 *
 * Every species with models has two forms and a distance test picks between
 * them per tile, per frame. The radius differs by pass, and the reason is
 * arithmetic rather than taste: instance count grows with the square of the
 * radius, and there are three hundred times more plants than trees.
 *
 * A tree is worth a model at 340 units — there are 3,100 of them in the whole
 * valley and only ~200 within that disc, so the pack costs 700k triangles and
 * buys the silhouettes you walk between. Ground cover at the same radius is
 * 7,200 instances, and the pack forms are five times the procedural ones, so
 * the same generosity costs three million triangles for detail that is four
 * pixels tall.
 *
 * At 150 units it is ~1,400 instances — a fifth of the cost, in the band where
 * you can actually see a blade of grass. That is the whole trick, and it is
 * what makes the pack's grasses, clovers and pebbles affordable at all.
 * ---------------------------------------------------------------------------
 */

/**
 * Tile size per pass and per form, in world units.
 *
 * The model form is tiled far more finely than the procedural one, and that is
 * load-bearing rather than tidy. The near/far test is per tile against the
 * tile's own bounding sphere, so a tile is the resolution of the ring: a
 * 420-unit cover tile straddling a 150-unit radius is drawn as models in its
 * entirety, which puts pack geometry three hundred units away and throws away
 * everything the tight radius was for.
 */
const TILE = Object.freeze({
  canopy: { far: 400, near: 200 },
  cover: { far: 420, near: 90 },
});

export function buildFlora(valley) {
  const group = new Group();
  group.name = 'flora';

  const planted = new Map();
  add(planted, group, CANOPY, valley.canopy, {
    shadows: true,
    chunk: TILE.canopy.far,
    modelChunk: TILE.canopy.near,
    reach: LOD.CANOPY_MODELS,
  });
  add(planted, group, GROUND_COVER, valley.cover, {
    shadows: false,
    chunk: TILE.cover.far,
    modelChunk: TILE.cover.near,
    reach: LOD.COVER_MODELS,
  });

  let detail = 1;

  return {
    group,

    /**
     * Gives a species its fetched models as its near-distance form.
     *
     * Takes a *list*, because one model everywhere is most of why a forest
     * reads as synthetic: 275 pines all sharing a silhouette is a texture, not
     * a wood. Items are split between the forms by a hash of where they stand,
     * so a tree's shape is a property of its position — stable across reloads,
     * across tests, and independent of the order the downloads happened to
     * finish in.
     *
     * The procedural meshes are kept, not replaced: both forms are tiled and
     * exactly one is visible — see `update` and the note above.
     *
     * @param {string} id species id
     * @param {import('three').Object3D[]} models in the species' declared order
     * @returns {boolean} whether anything was taken
     */
    useModels(id, models) {
      const entry = planted.get(id);
      if (!entry || entry.model.length > 0) return false;

      const forms = models.map(normalisedParts).filter((parts) => parts.length > 0);
      if (forms.length === 0) return false;

      const buckets = forms.map(() => []);
      for (const item of entry.items) buckets[variantOf(item, forms.length)].push(item);

      entry.model = forms.flatMap((parts, index) =>
        parts.flatMap((part) =>
          instancedChunks(part.geometry, part.material, buckets[index], {
            ...entry.options,
            chunk: entry.options.modelChunk,
            scale: entry.species.modelScale ?? 1,
          }),
        ),
      );
      for (const mesh of entry.model) {
        mesh.name = `${id}:model`;
        mesh.visible = false;
      }
      if (entry.model.length > 0) group.add(...entry.model);
      return true;
    },

    /**
     * Scales both rings, for the quality ladder. 0 turns models off entirely
     * and the valley draws from procedural geometry — which is exactly what a
     * fresh clone does, so it is a tested path rather than a fallback.
     */
    setDetail(scale) {
      detail = scale;
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
        const reach = entry.options.reach * detail;
        for (const mesh of entry.model) mesh.visible = isNear(mesh, viewer, reach);
        for (const mesh of entry.meshes) mesh.visible = !isNear(mesh, viewer, reach);
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

/**
 * Which form of a species stands here.
 *
 * A hash of the tile-free world position rather than an index into the item
 * list, so that thinning the undergrowth for a lower quality tier does not
 * reshuffle every plant that survived it.
 */
function variantOf(item, count) {
  if (count < 2) return 0;
  const hash = Math.imul(Math.round(item.x * 8) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.round(item.z * 8);
  return (Math.imul(hash, 0xc2b2ae35) >>> 17) % count;
}

/** Is this tile's own bounding sphere within model range of the viewer? */
function isNear(mesh, viewer, reach) {
  if (reach <= 0) return false;
  const sphere = mesh.boundingSphere;
  if (!sphere) return true;
  return sphere.center.distanceTo(viewer) - sphere.radius < reach;
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
