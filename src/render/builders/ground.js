import { Group } from 'three';
import { mergeParts } from '../geometry/merge.js';
import { LANDMARKS } from '../../content/resume.js';
import { LOT_HALF, WORLD } from '../../config/world.js';
import { TERRAIN } from '../../config/palette.js';
import { GROUND_LAYER, flatQuad } from '../geometry/flat.js';
import { everyTrackRibbon } from '../geometry/ribbon.js';
import { tiledSlab } from '../geometry/tiling.js';
import { lambert } from '../materials.js';
import { buildTrackDressing } from './track-dressing.js';

/**
 * The flat ground layers: track, verge and paddock, merged into one geometry
 * per material and instanced across the 3x3 tiling.
 *
 * The rough ground underneath them is no longer a quad — it is the heightfield
 * in ./terrain.js, which is exactly zero wherever these layers sit. So these
 * stay flat and stay valid; they are the corridor the terrain leaves alone.
 *
 * Built as geometry rather than as a texture on a plane, because marks drawn as
 * strips stay razor sharp at any distance and any resolution — the thing a
 * baked ground texture can never quite manage up close.
 */
export function buildGround() {
  const group = new Group();
  group.name = 'ground';

  group.add(slab(paddocks(), TERRAIN.SAND, true));
  group.add(slab(verges(), TERRAIN.VERGE, true));
  group.add(slab(tracks(), TERRAIN.TRACK, true));

  for (const layer of buildTrackDressing()) {
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

/** Landmark blocks are packed service areas, which is what makes them drivable. */
function paddocks() {
  return LANDMARKS.map((landmark) =>
    flatQuad(LOT_HALF * 2, LOT_HALF * 2, landmark.x, landmark.z, GROUND_LAYER.PADDOCK),
  );
}

/** Packed dirt: a strip down every track line, in both axes. */
function tracks() {
  return everyTrackRibbon({ halfWidth: WORLD.ROAD_HALF, y: GROUND_LAYER.TRACK });
}

/**
 * Grass verges either side of every track. Wider than the dirt they flank, so
 * they sit BELOW it on the layer ladder — see GROUND_LAYER.
 */
function verges() {
  return everyTrackRibbon({
    halfWidth: WORLD.ROAD_HALF + WORLD.WALK,
    y: GROUND_LAYER.VERGE,
  });
}
