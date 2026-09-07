import { Group } from 'three';
import { PROPS } from '../../config/palette.js';
import { createFacadeMaterial } from '../facade-material.js';
import {
  baleStackGeometry,
  barnRoofGeometry,
  barnWallsGeometry,
  rockGeometry,
  standGeometry,
  unitBox,
} from '../geometry/scenery-shapes.js';
import { seatOnGround } from '../ground-follow.js';
import { tiledInstances } from '../geometry/tiling.js';
import { instancedTinted, lambert } from '../materials.js';
import { instancedModel } from '../model-instances.js';
import { createRng } from '../../core/rng.js';
import { WORLD } from '../../config/world.js';

/**
 * Everything solid on the stage that is not the kart: boulders, barns, bale
 * stacks, spectator stands and the six landmark structures.
 *
 * One instanced mesh per kind, which is one draw call per kind however many
 * there are. Each shape is authored in the unit box described in
 * ../geometry/scenery-shapes.js, so an instance's scale is the collision box
 * the physics already knows about — the picture and the thing you crash into
 * cannot drift apart.
 *
 * Every mesh here tints PER INSTANCE. None of these geometries carries a
 * `color` attribute, so none of these materials may set vertexColors: see the
 * colour trap at the top of ../materials.js.
 *
 * @returns {{group: Group, useModel: (id: string, model: object|null) => boolean}}
 */

/** Rock variants, so a quarry is not a row of identical lumps. */
const ROCK_VARIANTS = 3;

/**
 * Which downloaded model stands in for which procedural slice.
 *
 * The index is load-bearing: model N replaces variant N and hides that
 * variant's group alone. That is what lets one model arrive, or three, or none
 * — each slice falls back independently, so a half-fetched assets directory
 * gives a mixed stage rather than a hole in it.
 */
const ROCK_MODELS = ['kit.nature.rock.large', 'kit.nature.rock.small', 'kit.nature.rock.tall'];
const HOUSE_MODELS = ['kit.farm.house.a', 'kit.farm.house.b'];

export function buildScenery(city) {
  const group = new Group();
  group.name = 'scenery';

  const byKind = new Map();
  for (const item of city.scenery) {
    if (!byKind.has(item.kind)) byKind.set(item.kind, []);
    byKind.get(item.kind).push(item);
  }

  const stands = byKind.get('stand') ?? [];
  const rocks = byKind.get('rock') ?? [];
  const barns = byKind.get('barn') ?? [];
  const rockSlices = addRocks(group, rocks);
  const barnSlices = addBarns(group, barns);
  addSimple(group, byKind.get('bales') ?? [], baleStackGeometry());
  const procedural = addStands(group, stands);
  addLandmarks(group, byKind.get('landmark') ?? []);

  return {
    group,

    /**
     * Upgrade one kind of scenery with a downloaded model.
     *
     * Both paths must no-op cleanly when the model is null or has no meshes:
     * deleting public/assets has to leave a site that still looks finished.
     */
    useModel(id, model) {
      if (id === 'kit.rally.tents') return useTents(group, procedural, stands, model);
      if (id === 'kit.rally.gantry') return useGantry(group, model);

      const rock = ROCK_MODELS.indexOf(id);
      if (rock !== -1)
        return useSlice(group, rockSlices[rock], slice(rocks, rock, ROCK_MODELS.length), model, 0);

      const house = HOUSE_MODELS.indexOf(id);
      if (house !== -1)
        return useSlice(
          group,
          barnSlices[house],
          slice(barns, house, HOUSE_MODELS.length),
          model,
          900 + house,
        );
      return false;
    },
  };
}

/** Spectator camps replace the procedural stands, at the same sites. */
function useTents(group, procedural, stands, model) {
  if (!procedural || stands.length === 0) return false;

  const meshes = instancedModel(
    model,
    stands.map((stand) => ({
      x: stand.x,
      y: seatOnGround(stand.x, stand.z, stand.halfWidth, stand.halfDepth),
      z: stand.z,
      size: Math.max(stand.halfWidth, stand.halfDepth) * 2,
      rotationY: stand.halfDepth > stand.halfWidth ? Math.PI / 2 : 0,
    })),
  );
  if (meshes.length === 0) return false;

  procedural.visible = false;
  for (const mesh of meshes) group.add(mesh);
  return true;
}

/**
 * The gantry stands over the chequered start line at the origin junction.
 *
 * It has no procedural counterpart to hide — the start line is already painted
 * on the dirt — so this is a pure addition and its absence costs nothing.
 */
function useGantry(group, model) {
  const meshes = instancedModel(model, [
    { x: 0, y: 0, z: 0, size: WORLD.ROAD_HALF * 2 + 24, rotationY: 0 },
  ]);
  if (meshes.length === 0) return false;
  for (const mesh of meshes) group.add(mesh);
  return true;
}

/** Instance description for a box-shaped thing, seated on the terrain. */
function toInstance(item) {
  return {
    x: item.x,
    // Seated on the heightfield. The physics still treats this as a 2-D
    // footprint at y = 0; only the picture knows about the hill.
    y: item.base + seatOnGround(item.x, item.z, item.halfWidth, item.halfDepth),
    z: item.z,
    sx: item.halfWidth * 2,
    sy: item.height,
    sz: item.halfDepth * 2,
    color: item.color,
  };
}

function addSimple(group, items, geometry, material = instancedTinted()) {
  if (items.length === 0) return;
  group.add(
    tiledInstances(
      geometry,
      material,
      items.map((item) => toInstance(item)),
    ),
  );
}

/** Every Nth item, so a slice's model can replace exactly its own share. */
function slice(items, index, count) {
  return items.filter((_, at) => at % count === index);
}

/**
 * Swaps one procedural slice for a downloaded model at the same sites.
 *
 * The model is sized to the footprint of the collision box it replaces and
 * given a seeded quarter-turn, so a farm is not six identical houses all
 * facing the same way. Returns false — leaving the procedural slice visible —
 * whenever the model is missing or carries no meshes.
 */
function useSlice(group, procedural, items, model, seed) {
  if (!procedural || items.length === 0) return false;

  const rng = createRng(seed);
  const meshes = instancedModel(
    model,
    items.map((item) => ({
      x: item.x,
      y: item.base + seatOnGround(item.x, item.z, item.halfWidth, item.halfDepth),
      z: item.z,
      size: Math.max(item.halfWidth, item.halfDepth) * 2,
      rotationY: Math.floor(rng() * 4) * (Math.PI / 2),
    })),
  );
  if (meshes.length === 0) return false;

  procedural.visible = false;
  for (const mesh of meshes) group.add(mesh);
  return true;
}

/** @returns {Group[]} one holder per variant, so each can be hidden alone. */
function addRocks(group, rocks) {
  const holders = [];
  for (let variant = 0; variant < ROCK_VARIANTS; variant += 1) {
    const holder = new Group();
    holder.name = `rocks-${variant}`;
    addSimple(holder, slice(rocks, variant, ROCK_VARIANTS), rockGeometry(variant));
    group.add(holder);
    holders.push(holder);
  }
  return holders;
}

/**
 * Walls take the instance tint; the roof stays corrugated iron.
 *
 * Split into one holder per house model so a downloaded farmhouse can replace
 * its own share and leave the rest standing.
 *
 * @returns {Group[]}
 */
function addBarns(group, barns) {
  const holders = [];
  for (let variant = 0; variant < HOUSE_MODELS.length; variant += 1) {
    const holder = new Group();
    holder.name = `barns-${variant}`;
    const instances = slice(barns, variant, HOUSE_MODELS.length).map((barn) => toInstance(barn));
    if (instances.length > 0) {
      holder.add(tiledInstances(barnWallsGeometry(), instancedTinted(), instances));
      holder.add(tiledInstances(barnRoofGeometry(), lambert(PROPS.METAL), instances));
    }
    group.add(holder);
    holders.push(holder);
  }
  return holders;
}

/**
 * Stands are authored with their steps running across Z. A stand whose long
 * axis is Z gets a quarter turn and its scale swapped to match, which leaves
 * the axis-aligned collision box exactly where it was.
 */
function addStands(group, stands) {
  if (stands.length === 0) return null;

  const instances = stands.map((stand) => {
    const instance = toInstance(stand);
    if (stand.halfDepth <= stand.halfWidth) return instance;
    return { ...instance, rotationY: Math.PI / 2, sx: instance.sz, sz: instance.sx };
  });

  const holder = new Group();
  holder.name = 'stands';
  holder.add(tiledInstances(standGeometry(), instancedTinted(), instances));
  group.add(holder);
  return holder;
}

/**
 * The six landmarks, still stacks of boxes. Split into glazed and plain so a
 * lodge gets windows while a mast, an awning or a gantry beam stays flat.
 */
function addLandmarks(group, boxes) {
  const glazed = boxes.filter((box) => box.windows);
  const plain = boxes.filter((box) => !box.windows);

  if (glazed.length > 0) {
    group.add(
      tiledInstances(
        unitBox(),
        createFacadeMaterial(),
        glazed.map((box) => toInstance(box)),
      ),
    );
  }
  if (plain.length > 0) {
    group.add(
      tiledInstances(
        unitBox(),
        instancedTinted(),
        plain.map((box) => toInstance(box)),
      ),
    );
  }
}
