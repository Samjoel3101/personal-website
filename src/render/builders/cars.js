import { BoxGeometry, Group } from 'three';
import { seatOnGround } from '../ground-follow.js';
import { instancedTinted, lambert } from '../materials.js';
import { tiledInstances, updateInstances } from '../geometry/tiling.js';

/** Glasshouse tint, dark enough to read as glass against every body colour. */
const GLASS = '#38445c';

/**
 * Service vehicles: the ones parked in the lay-bys and the ones driving.
 *
 * They are collidable in the physics, which is the whole point: a racing line
 * bounded by vehicles feels like a line, where an empty strip of dirt feels
 * like a runway.
 *
 * Parked and moving are separate meshes rather than one, because the parked
 * ones are the overwhelming majority and their matrices never change. Rewriting
 * all of them every frame to move a dozen would be paying for the whole stage
 * to animate a corner of it.
 *
 * @returns {{group: Group, update: () => void}}
 */
export function buildCars(city) {
  const group = new Group();
  group.name = 'cars';

  const parked = city.cars.filter((car) => !car.moving);
  const moving = city.cars.filter((car) => car.moving);

  if (parked.length > 0) {
    group.add(tiledInstances(baseBox(), instancedTinted(), parked.map(bodyItem)));
    group.add(tiledInstances(baseBox(), lambert(GLASS), parked.map(cabinItem)));
  }
  if (moving.length === 0) return { group, update() {} };

  const bodies = moving.map(bodyItem);
  const cabins = moving.map(cabinItem);
  const bodyMesh = tiledInstances(baseBox(), instancedTinted(), bodies);
  const cabinMesh = tiledInstances(baseBox(), lambert(GLASS), cabins);
  group.add(bodyMesh, cabinMesh);

  return {
    group,

    /**
     * Re-seats the moving vehicles on the ground they have driven onto.
     *
     * There are tens of them, not hundreds, which is what makes a terrain
     * sample each per frame affordable. Every item object here is written in
     * place: the whole point of updateInstances is that a frame allocates
     * nothing.
     */
    update() {
      for (let i = 0; i < moving.length; i += 1) {
        const car = moving[i];
        const height = seatOnGround(car.x, car.z);
        reseat(bodies[i], car, height);
        reseat(cabins[i], car, height + car.height);
      }
      updateInstances(bodyMesh, bodies);
      updateInstances(cabinMesh, cabins);
    },
  };
}

function reseat(item, car, y) {
  item.x = car.x;
  item.y = y;
  item.z = car.z;
  item.rotationY = car.yaw;
}

function bodyItem(car) {
  return {
    x: car.x,
    y: seatOnGround(car.x, car.z),
    z: car.z,
    sx: car.halfWidth * 2,
    sy: car.height,
    sz: car.halfDepth * 2,
    rotationY: car.yaw ?? 0,
    color: car.color,
  };
}

/**
 * The glasshouse, narrowed across the vehicle and shortened along it — which
 * way round depends on which way the vehicle is pointing.
 */
function cabinItem(car) {
  const alongZ = car.halfDepth > car.halfWidth;
  return {
    x: car.x,
    y: car.height + seatOnGround(car.x, car.z),
    z: car.z,
    sx: car.halfWidth * 2 * (alongZ ? 0.86 : 0.55),
    sy: car.cabinHeight,
    sz: car.halfDepth * 2 * (alongZ ? 0.55 : 0.86),
    rotationY: car.yaw ?? 0,
  };
}

/** Unit box with its base on the ground plane. */
function baseBox() {
  const geometry = new BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);
  return geometry;
}
