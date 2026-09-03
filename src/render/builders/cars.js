import { BoxGeometry, Group } from 'three';
import { instancedTinted, lambert } from '../materials.js';
import { tiledInstances } from '../geometry/tiling.js';

/**
 * Parked cars.
 *
 * They are collidable in the physics, which is the whole point: a driving lane
 * bounded by parked cars feels like a lane, where an empty strip of asphalt
 * feels like a runway. Two instanced meshes, body and glasshouse.
 */
export function buildCars(city) {
  const group = new Group();
  group.name = 'cars';
  if (city.cars.length === 0) return group;

  const bodies = city.cars.map((car) => ({
    x: car.x,
    z: car.z,
    sx: car.halfWidth * 2,
    sy: car.height,
    sz: car.halfDepth * 2,
    color: car.color,
  }));

  const cabins = city.cars.map((car) => {
    const alongZ = car.halfDepth > car.halfWidth;
    return {
      x: car.x,
      y: car.height,
      z: car.z,
      sx: car.halfWidth * 2 * (alongZ ? 0.86 : 0.55),
      sy: car.cabinHeight,
      sz: car.halfDepth * 2 * (alongZ ? 0.55 : 0.86),
    };
  });

  group.add(tiledInstances(baseBox(), instancedTinted(), bodies));
  group.add(tiledInstances(baseBox(), lambert('#38445c'), cabins));
  return group;
}

/** Unit box with its base on the ground plane. */
function baseBox() {
  const geometry = new BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);
  return geometry;
}
