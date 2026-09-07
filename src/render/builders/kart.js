import { Box3, Group, Mesh, Vector3 } from 'three';
import { BUGGY, axleGeometry, buggyBodyGeometry, wheelGeometry } from '../geometry/buggy-shapes.js';
import { KART_COLOURS } from '../../config/palette.js';
import { clamp } from '../../core/math.js';
import { lambert, vertexColoured } from '../materials.js';

/** Target length of the buggy in world units, whatever geometry supplies it. */
const KART_LENGTH = 30;
/** Radians of body roll at full steering lock. A buggy on tall springs leans
 *  more than a go-kart did, but not far enough for the pan to reach a tyre. */
const MAX_LEAN = 0.2;

/**
 * The player's buggy.
 *
 * Built procedurally so the game is complete with no assets fetched, but
 * `useModel` will swap in a downloaded glTF and normalise it to the same
 * footprint — that is the upgrade path, and the reason the rest of the
 * renderer only ever talks to this module's interface rather than to a mesh.
 *
 * The chassis leans and the wheels spin, but only the chassis is in the
 * leaning group: axles and hubs stay level, because a stub axle that rolls
 * with the body visibly parts company with the wheel on its end.
 */
export function buildKart() {
  const group = new Group();
  group.name = 'kart';

  const chassis = new Group();
  chassis.add(new Mesh(buggyBodyGeometry(), vertexColoured()));
  chassis.castShadow = true;
  group.add(chassis);

  const procedural = buildRunningGear(group);
  let wheels = procedural.wheels;

  return {
    group,

    /**
     * @param {{steer: number, speed: number}} kart
     * @param {number} dt seconds
     */
    update(kart, dt) {
      const steer = clamp(kart.steer, -1, 1);
      chassis.rotation.z = -steer * MAX_LEAN;
      for (const pivot of procedural.steering) {
        pivot.rotation.y = steer * BUGGY.MAX_STEER_ANGLE;
      }
      for (const wheel of wheels) wheel.mesh.rotation.x += (kart.speed / wheel.radius) * dt;
    },

    /** Replace the procedural buggy with a loaded model, scaled to fit. */
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
      for (const part of procedural.parts) part.visible = false;
      // A model with no wheels named the way we expect keeps the procedural
      // ones, which is the only way an unknown glTF can still look driven.
      if (named.length === 0) for (const part of procedural.parts) part.visible = true;
      wheels = named.length > 0 ? named : procedural.wheels;
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
 * fitting a model onto our footprint. A named wheel is spun but never steered
 * — we know its name, not which way it is pointing.
 */
function namedWheels(scene) {
  const wanted = new Set(WHEEL_NAMES);
  const found = [];
  scene.traverse((child) => {
    if (wanted.has(child.name)) found.push({ mesh: child, radius: BUGGY.FRONT.RADIUS });
  });
  return found;
}

/**
 * Wheels, hubs and stub axles.
 *
 * Each front wheel hangs inside a steering pivot group so it can be turned
 * about Y and still spin about its own X. Spinning the wheel directly and then
 * steering it would roll it about a world axis, which looks like a wheel
 * falling off.
 */
function buildRunningGear(parent) {
  const tyre = lambert(KART_COLOURS.TYRE);
  const axleMaterial = lambert(KART_COLOURS.AXLE);
  const wheels = [];
  const steering = [];
  const parts = [];

  for (const station of [BUGGY.FRONT, BUGGY.REAR]) {
    const geometry = wheelGeometry(station.RADIUS, station.WIDTH);
    const steered = station === BUGGY.FRONT;

    for (const side of [-1, 1]) {
      const wheel = new Mesh(geometry, tyre);
      wheel.castShadow = true;
      wheels.push({ mesh: wheel, radius: station.RADIUS });

      const mount = steered ? new Group() : wheel;
      if (steered) mount.add(wheel);
      mount.position.set(side * station.X, station.RADIUS, station.Z);
      parent.add(mount);
      parts.push(mount);
      if (steered) steering.push(mount);

      const axle = new Mesh(axleGeometry(station.X - 6), axleMaterial);
      axle.position.set((side * (station.X + 6)) / 2, station.RADIUS, station.Z);
      parent.add(axle);
      parts.push(axle);
    }
  }

  return { wheels, steering, parts };
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
