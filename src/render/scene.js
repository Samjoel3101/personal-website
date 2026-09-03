import { Color, Fog, Group, Scene } from 'three';
import { ATMOSPHERE } from '../config/render.js';
import { SKY } from '../config/palette.js';
import { buildBuildings } from './builders/buildings.js';
import { buildCars } from './builders/cars.js';
import { buildGround } from './builders/ground.js';
import { buildKart } from './builders/kart.js';
import { buildLamps } from './builders/lamps.js';
import { buildMarkers } from './builders/markers.js';
import { buildTrees } from './builders/trees.js';
import { createLighting } from './lighting.js';
import { createSky } from './sky.js';

/**
 * Assembles the scene and keeps it in step with the simulation.
 *
 * The kart never moves. It sits at the origin and the entire city slides
 * underneath it, which is what lets a wrapping world work without ever
 * teleporting the player or losing float precision a long way from origin. The
 * city is built tiled 3x3 so whichever direction you drive, there is always
 * more of it ahead — see src/render/geometry/tiling.js.
 */
export function createGameScene(city) {
  const scene = new Scene();
  scene.background = new Color(SKY.HORIZON);
  scene.fog = new Fog(new Color(SKY.HORIZON), ATMOSPHERE.FOG_NEAR, ATMOSPHERE.FOG_FAR);

  scene.add(createSky());
  const lighting = createLighting(scene);

  const cityGroup = new Group();
  cityGroup.name = 'city';
  cityGroup.add(
    buildGround(),
    buildBuildings(city),
    buildTrees(city),
    buildLamps(city),
    buildCars(city),
    buildMarkers(),
  );
  scene.add(cityGroup);

  const kart = buildKart();
  scene.add(kart.group);

  return {
    scene,
    kart,
    lighting,

    /** @param {{x, z, heading, steer, speed}} kartState */
    update(kartState, dt) {
      cityGroup.position.set(-kartState.x, 0, -kartState.z);
      kart.group.rotation.y = kartState.heading;
      kart.update(kartState, dt);
    },

    setQuality(tier) {
      lighting.setShadowsEnabled(tier.shadows);
    },
  };
}
