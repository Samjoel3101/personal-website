import { Box3, BoxGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, Vector3 } from 'three';
import { mergeParts } from '../geometry/merge.js';
import { KART_COLOURS } from '../../config/palette.js';
import { clamp } from '../../core/math.js';
import { paintGeometry } from '../geometry/paint.js';
import { lambert, vertexColoured } from '../materials.js';

/** Target length of the kart in world units, whatever geometry supplies it. */
const KART_LENGTH = 30;
const WHEEL_RADIUS = 4.4;
const WHEEL_WIDTH = 3.6;
const MAX_LEAN = 0.16; // radians of body roll at full steering lock

/**
 * The player's kart.
 *
 * Built procedurally so the game is complete with no assets fetched, but
 * `useModel` will swap in a downloaded glTF and normalise it to the same
 * footprint — that is the upgrade path, and the reason the rest of the
 * renderer only ever talks to this module's interface rather than to a mesh.
 */
export function buildKart() {
  const group = new Group();
  group.name = 'kart';

  const chassis = new Group();
  chassis.add(new Mesh(bodyGeometry(), vertexColoured()));
  chassis.castShadow = true;
  group.add(chassis);

  const procedural = buildWheels(group);
  let wheels = procedural;

  return {
    group,

    /**
     * @param {{steer: number, speed: number}} kart
     * @param {number} dt seconds
     */
    update(kart, dt) {
      chassis.rotation.z = -clamp(kart.steer, -1, 1) * MAX_LEAN;
      const spin = (kart.speed / WHEEL_RADIUS) * dt;
      for (const wheel of wheels) wheel.rotation.x += spin;
    },

    /** Replace the procedural kart with a loaded model, scaled to fit. */
    useModel(scene) {
      if (!scene) return false;
      normaliseToLength(scene, KART_LENGTH);
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = false;
        }
      });
      chassis.clear();
      chassis.add(scene);

      const named = namedWheels(scene);
      for (const wheel of procedural) wheel.visible = false;
      // A model with no wheels named the way we expect keeps the procedural
      // ones, which is the only way an unknown glTF can still look driven.
      if (named.length === 0) for (const wheel of procedural) wheel.visible = true;
      wheels = named.length > 0 ? named : procedural;
      return true;
    },
  };
}

/** Node names Kenney's racing kit uses, and the convention we look for. */
const WHEEL_NAMES = [
  'wheel-front-left',
  'wheel-front-right',
  'wheel-back-left',
  'wheel-back-right',
];

/**
 * Finds the wheels of a loaded model by name so `update` can spin them.
 *
 * Kept as its own function rather than folded into useModel: the traversal is
 * about naming conventions in somebody else's art, and useModel is about
 * fitting a model onto our footprint.
 */
function namedWheels(scene) {
  const wanted = new Set(WHEEL_NAMES);
  const found = [];
  scene.traverse((child) => {
    if (wanted.has(child.name)) found.push(child);
  });
  return found;
}

function buildWheels(parent) {
  const geometry = new CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 14);
  // A cylinder stands up the Y axis; a wheel spins about X.
  geometry.rotateZ(Math.PI / 2);
  const material = lambert(KART_COLOURS.TYRE);

  const wheels = [];
  for (const front of [-1, 1]) {
    for (const side of [-1, 1]) {
      const wheel = new Mesh(geometry, material);
      wheel.position.set(side * 9, WHEEL_RADIUS, front * 9.5);
      wheel.castShadow = true;
      parent.add(wheel);
      wheels.push(wheel);
    }
  }
  return wheels;
}

/** Chassis, sidepods, wing and driver, merged into one vertex-coloured mesh. */
function bodyGeometry() {
  const parts = [];
  const add = (geometry, colour, position) => {
    geometry.translate(...position);
    parts.push(paintGeometry(geometry, colour));
  };

  add(new BoxGeometry(15, 5, 26), KART_COLOURS.BODY, [0, 6.5, 0]);
  add(new BoxGeometry(19, 3.4, 13), KART_COLOURS.BODY_LIGHT, [0, 7.5, -1]);
  add(new BoxGeometry(11, 2.6, 6), KART_COLOURS.BODY_DARK, [0, 9.6, 8]);
  // rear wing and its stays
  add(new BoxGeometry(17, 1.6, 4.5), KART_COLOURS.BODY_DARK, [0, 14, 11.5]);
  add(new BoxGeometry(1.8, 5, 1.8), KART_COLOURS.BODY_DARK, [-5.5, 11.5, 11.5]);
  add(new BoxGeometry(1.8, 5, 1.8), KART_COLOURS.BODY_DARK, [5.5, 11.5, 11.5]);
  // seat back, driver, helmet
  add(new BoxGeometry(9, 7, 1.8), KART_COLOURS.BODY_DARK, [0, 12, 5.5]);
  add(new BoxGeometry(8, 8, 5.5), KART_COLOURS.SUIT, [0, 12.5, 2.5]);
  add(new SphereGeometry(4.4, 12, 10), KART_COLOURS.HELMET, [0, 18.5, 2]);

  return mergeParts(parts, 'kart-body');
}

/**
 * Scales and centres an arbitrary model onto the kart's footprint.
 *
 * Downloaded models arrive at wildly different scales and origins — metres,
 * centimetres, pivot at the wheels or at the roof. Measuring and normalising
 * means a new model can be dropped into the manifest without anyone hand-tuning
 * a magic scale factor.
 */
function normaliseToLength(object, targetLength) {
  const bounds = new Box3().setFromObject(object);
  const size = bounds.getSize(new Vector3());
  const longest = Math.max(size.x, size.z) || 1;
  const scale = targetLength / longest;

  object.scale.setScalar(scale);
  bounds.setFromObject(object);
  const centre = bounds.getCenter(new Vector3());
  object.position.sub(new Vector3(centre.x, bounds.min.y, centre.z));

  // Models are conventionally authored facing -Z; the kart drives toward +Z.
  if (size.x > size.z) object.rotation.y = Math.PI / 2;
}
