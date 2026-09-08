import { Color, Fog, Scene } from 'three';
import { ATMOSPHERE } from '../config/render.js';
import { HAZE } from '../config/palette.js';
import { BIOME_IDS } from '../world/biome.js';
import { blendHex } from '../core/colour.js';
import { buildFlora } from './flora.js';
import { buildTerrainMesh } from './terrain-mesh.js';
import { buildWater } from './water.js';
import { createLighting } from './lighting.js';
import { createSky } from './sky.js';

/**
 * The scene graph, and the one thing in it that changes.
 *
 * Everything is built once: the ground, the water, every plant. What updates
 * per frame is the weather. The fog colour, the scene background and the sky
 * dome's horizon stop are all mixed from the biome haze under the camera and
 * eased toward it, so flying south takes you from a cool, damp grey-green
 * horizon to a hot sand one without a boundary you could point at.
 *
 * All three have to agree exactly, or the far hills end at a visible line
 * where the fog stops and the dome begins.
 */
export function createValleyScene(valley) {
  const scene = new Scene();
  const haze = new Color(HAZE.forest);
  const wanted = new Color();

  scene.background = haze;
  scene.fog = new Fog(haze, ATMOSPHERE.FOG_NEAR, ATMOSPHERE.FOG_FAR);

  const sky = createSky();
  const lighting = createLighting(scene);
  const flora = buildFlora(valley);

  scene.add(sky.dome, buildTerrainMesh(valley), buildWater(valley.pools), flora.group);

  return {
    scene,
    flora,

    /** @param {import('three').Vector3} viewer where the camera is now */
    update(viewer, dt) {
      const weights = valley.weightsAt(viewer.x, viewer.z);
      wanted.set(blendHex(BIOME_IDS.map((id) => [HAZE[id], weights[id]])));
      haze.lerp(wanted, 1 - Math.exp(-ATMOSPHERE.BLEND_LAMBDA * dt));
      sky.setHaze(haze);
      lighting.follow(viewer);
    },

    setQuality(tier) {
      lighting.setShadowsEnabled(tier.shadows);
    },

    /** Swap a species' procedural shape for a fetched model. */
    useModel(assetId, model) {
      return flora.useModel(assetId, model);
    },
  };
}
