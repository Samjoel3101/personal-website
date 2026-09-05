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
 */

/** Rock variants, so a quarry is not a row of identical lumps. */
const ROCK_VARIANTS = 3;

export function buildScenery(city) {
  const group = new Group();
  group.name = 'scenery';

  const byKind = new Map();
  for (const item of city.scenery) {
    if (!byKind.has(item.kind)) byKind.set(item.kind, []);
    byKind.get(item.kind).push(item);
  }

  addRocks(group, byKind.get('rock') ?? []);
  addBarns(group, byKind.get('barn') ?? []);
  addSimple(group, byKind.get('bales') ?? [], baleStackGeometry());
  addStands(group, byKind.get('stand') ?? []);
  addLandmarks(group, byKind.get('landmark') ?? []);

  return group;
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

function addRocks(group, rocks) {
  for (let variant = 0; variant < ROCK_VARIANTS; variant += 1) {
    const slice = rocks.filter((_, index) => index % ROCK_VARIANTS === variant);
    addSimple(group, slice, rockGeometry(variant));
  }
}

/** Walls take the instance tint; the roof stays corrugated iron. */
function addBarns(group, barns) {
  if (barns.length === 0) return;
  const instances = barns.map((barn) => toInstance(barn));
  group.add(tiledInstances(barnWallsGeometry(), instancedTinted(), instances));
  group.add(tiledInstances(barnRoofGeometry(), lambert(PROPS.METAL), instances));
}

/**
 * Stands are authored with their steps running across Z. A stand whose long
 * axis is Z gets a quarter turn and its scale swapped to match, which leaves
 * the axis-aligned collision box exactly where it was.
 */
function addStands(group, stands) {
  if (stands.length === 0) return;

  const instances = stands.map((stand) => {
    const instance = toInstance(stand);
    if (stand.halfDepth <= stand.halfWidth) return instance;
    return { ...instance, rotationY: Math.PI / 2, sx: instance.sz, sz: instance.sx };
  });

  group.add(tiledInstances(standGeometry(), instancedTinted(), instances));
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
