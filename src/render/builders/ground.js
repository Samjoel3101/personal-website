import { Group } from 'three';
import { mergeParts } from '../geometry/merge.js';
import { LANDMARKS } from '../../content/resume.js';
import { LOT_HALF, WORLD } from '../../config/world.js';
import { GROUND } from '../../config/palette.js';
import { GROUND_LAYER, flatQuad } from '../geometry/flat.js';
import { tiledSlab } from '../geometry/tiling.js';
import { lambert } from '../materials.js';
import { buildRoadMarkings } from './road-markings.js';

/**
 * The ground: one 2048x2048 tile of base, asphalt, pavement and plaza, merged
 * into one geometry per material and instanced across the 3x3 tiling.
 *
 * Built as geometry rather than as a texture on a plane, because painted lines
 * drawn as quads stay razor sharp at any distance and any resolution — the
 * thing a baked road texture can never quite manage up close.
 */
export function buildGround() {
  const group = new Group();
  group.name = 'ground';

  group.add(slab([lotBase()], GROUND.LOT, false));
  group.add(slab(plazas(), GROUND.PLAZA, true));
  group.add(slab(pavements(), GROUND.PAVEMENT, true));
  group.add(slab(roads(), GROUND.ROAD, true));

  for (const layer of buildRoadMarkings()) {
    group.add(slab(layer.geometries, layer.color, true));
  }

  return group;
}

function slab(geometries, color, receiveShadow) {
  const merged = mergeParts(geometries, `ground:${color}`);
  const mesh = tiledSlab(merged, lambert(color));
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

/** The rough ground every block sits on, before anything is paved over it. */
function lotBase() {
  const half = WORLD.SIZE / 2;
  return flatQuad(WORLD.SIZE, WORLD.SIZE, half, half, GROUND_LAYER.BASE);
}

/** Landmark blocks are paved, which is also what makes them drivable. */
function plazas() {
  return LANDMARKS.map((landmark) =>
    flatQuad(LOT_HALF * 2, LOT_HALF * 2, landmark.x, landmark.z, GROUND_LAYER.PLAZA),
  );
}

/** Asphalt: a strip down every grid line, in both axes. */
function roads() {
  const width = WORLD.ROAD_HALF * 2;
  return eachRoadLine((line) => [
    flatQuad(width, WORLD.SIZE, line, WORLD.SIZE / 2, GROUND_LAYER.ROAD),
    flatQuad(WORLD.SIZE, width, WORLD.SIZE / 2, line, GROUND_LAYER.ROAD),
  ]);
}

/** Pavement bands either side of every road. */
function pavements() {
  const width = (WORLD.ROAD_HALF + WORLD.WALK) * 2;
  return eachRoadLine((line) => [
    flatQuad(width, WORLD.SIZE, line, WORLD.SIZE / 2, GROUND_LAYER.PAVEMENT),
    flatQuad(WORLD.SIZE, width, WORLD.SIZE / 2, line, GROUND_LAYER.PAVEMENT),
  ]);
}

/** Runs `make` for every road centre line and flattens the result. */
function eachRoadLine(make) {
  const out = [];
  for (let g = 0; g < WORLD.GRID; g += 1) out.push(...make(g * WORLD.BLOCK));
  return out;
}
