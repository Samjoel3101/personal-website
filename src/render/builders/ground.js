import { Group } from 'three';
import { mergeParts } from '../geometry/merge.js';
import { LANDMARKS } from '../../content/resume.js';
import { LOT_HALF, WORLD } from '../../config/world.js';
import { TERRAIN } from '../../config/palette.js';
import { GROUND_LAYER, flatQuad } from '../geometry/flat.js';
import { tiledSlab } from '../geometry/tiling.js';
import { lambert } from '../materials.js';
import { buildRoadMarkings } from './road-markings.js';

/**
 * The flat ground layers: track, verge and paddock, merged into one geometry
 * per material and instanced across the 3x3 tiling.
 *
 * The rough ground underneath them is no longer a quad — it is the heightfield
 * in ./terrain.js, which is exactly zero wherever these layers sit. So these
 * stay flat and stay valid; they are the corridor the terrain leaves alone.
 *
 * Built as geometry rather than as a texture on a plane, because marks drawn
 * as quads stay razor sharp at any distance and any resolution — the thing a
 * baked road texture can never quite manage up close.
 */
export function buildGround() {
  const group = new Group();
  group.name = 'ground';

  group.add(slab(plazas(), TERRAIN.SAND, true));
  group.add(slab(pavements(), TERRAIN.VERGE, true));
  group.add(slab(roads(), TERRAIN.TRACK, true));

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
