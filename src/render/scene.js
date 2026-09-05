import { Color, Fog, Group, Scene } from 'three';
import { ATMOSPHERE } from '../config/render.js';
import { SKY } from '../config/palette.js';
import { clamp, damp } from '../core/math.js';
import { slopeAt } from '../world/terrain.js';
import { buildBuildings } from './builders/buildings.js';
import { buildCars } from './builders/cars.js';
import { buildGround } from './builders/ground.js';
import { buildKart } from './builders/kart.js';
import { buildLamps } from './builders/lamps.js';
import { buildMarkers } from './builders/markers.js';
import { buildPuddles } from './builders/puddles.js';
import { buildTerrain } from './builders/terrain.js';
import { buildTrees } from './builders/trees.js';
import { createGroundFollow } from './ground-follow.js';
import { createLighting } from './lighting.js';
import { createSky } from './sky.js';

/**
 * Assembles the scene and keeps it in step with the simulation.
 *
 * The kart never moves. It sits at the origin and the entire world slides
 * underneath it, which is what lets a wrapping world work without ever
 * teleporting the player or losing float precision a long way from origin. The
 * world is built tiled 3x3 so whichever direction you drive, there is always
 * more of it ahead — see src/render/geometry/tiling.js.
 */

/** How hard the kart follows the ground. High enough to look attached. */
const KART_GROUND_LAMBDA = 12;
/** Radians of pitch or roll the kart will take from a slope. */
const MAX_TILT = 0.34;
/** How quickly it settles into a new attitude. */
const TILT_LAMBDA = 7;

export function createGameScene(city) {
  const scene = new Scene();
  scene.background = new Color(SKY.HORIZON);
  scene.fog = new Fog(new Color(SKY.HORIZON), ATMOSPHERE.FOG_NEAR, ATMOSPHERE.FOG_FAR);

  scene.add(createSky());
  const lighting = createLighting(scene);

  const worldGroup = new Group();
  worldGroup.name = 'world';
  worldGroup.add(
    buildTerrain(),
    buildGround(),
    buildPuddles(city),
    buildBuildings(city),
    buildTrees(city),
    buildLamps(city),
    buildCars(city),
    buildMarkers(),
  );
  scene.add(worldGroup);

  const kart = buildKart();
  // Heading first, then the pitch and roll the ground asks for, so a tilt is
  // read in the kart's own frame rather than the world's.
  kart.group.rotation.order = 'YXZ';
  scene.add(kart.group);

  const ground = createGroundFollow(KART_GROUND_LAMBDA);

  return {
    scene,
    kart,
    lighting,

    /** @param {{x, z, heading, steer, speed}} kartState */
    update(kartState, dt) {
      worldGroup.position.set(-kartState.x, 0, -kartState.z);
      kart.group.rotation.y = kartState.heading;
      // Cosmetic only: the physics has no third dimension and never reads
      // this. See src/render/ground-follow.js.
      kart.group.position.y = ground.update(kartState.x, kartState.z, dt);
      tiltToGround(kart.group, kartState, dt);
      kart.update(kartState, dt);
    },

    setQuality(tier) {
      lighting.setShadowsEnabled(tier.shadows);
    },
  };
}

/** Leans the kart into the hill it is standing on. */
function tiltToGround(group, kartState, dt) {
  const gradient = slopeAt(kartState.x, kartState.z);
  const sin = Math.sin(kartState.heading);
  const cos = Math.cos(kartState.heading);

  // Forward is (sin, cos); right is (cos, -sin). Nose lifts going uphill.
  const forward = gradient.dx * sin + gradient.dz * cos;
  const right = gradient.dx * cos - gradient.dz * sin;

  const pitch = clamp(-Math.atan(forward), -MAX_TILT, MAX_TILT);
  const roll = clamp(Math.atan(right), -MAX_TILT, MAX_TILT);
  group.rotation.x = damp(group.rotation.x, pitch, TILT_LAMBDA, dt);
  group.rotation.z = damp(group.rotation.z, roll, TILT_LAMBDA, dt);
}
