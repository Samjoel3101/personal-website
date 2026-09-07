import { BoxGeometry, Group } from 'three';
import { seatOnGround } from '../ground-follow.js';
import { instancedTinted, lambert } from '../materials.js';
import { normalisedParts } from '../model-instances.js';
import { tiledInstances, updateInstances } from '../geometry/tiling.js';

/** Glasshouse tint, dark enough to read as glass against every body colour. */
const GLASS = '#38445c';

/** Which downloaded model dresses which pool. Parked ones read as service
 *  vehicles pulled over; the moving ones are lighter road cars. */
const PARKED_MODEL = 'kit.car.parked';
const TRAFFIC_MODEL = 'kit.car.traffic';

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
 * to animate a corner of it. A downloaded model swaps in per pool through
 * `useModel`, and the procedural boxes for that pool are hidden, not removed —
 * so a half-fetched assets directory still gives a full stage.
 *
 * @returns {{group: Group, update: () => void, useModel: (id: string, model: object|null) => boolean}}
 */
export function buildCars(city) {
  const group = new Group();
  group.name = 'cars';

  const parked = city.cars.filter((car) => !car.moving);
  const moving = city.cars.filter((car) => car.moving);

  const proceduralParked = new Group();
  const proceduralMoving = new Group();
  group.add(proceduralParked, proceduralMoving);

  if (parked.length > 0) {
    proceduralParked.add(tiledInstances(baseBox(), instancedTinted(), parked.map(bodyItem)));
    proceduralParked.add(tiledInstances(baseBox(), lambert(GLASS), parked.map(cabinItem)));
  }

  const bodies = moving.map(bodyItem);
  const cabins = moving.map(cabinItem);
  let bodyMesh = null;
  let cabinMesh = null;
  if (moving.length > 0) {
    bodyMesh = tiledInstances(baseBox(), instancedTinted(), bodies);
    cabinMesh = tiledInstances(baseBox(), lambert(GLASS), cabins);
    proceduralMoving.add(bodyMesh, cabinMesh);
  }

  // Set by useModel(TRAFFIC_MODEL): { meshes, items, aspect } for the loaded car.
  let modelMoving = null;

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
      if (modelMoving) {
        for (let i = 0; i < moving.length; i += 1) seatModelCar(modelMoving.items[i], moving[i]);
        for (const mesh of modelMoving.meshes) updateInstances(mesh, modelMoving.items);
        return;
      }
      if (!bodyMesh) return;
      for (let i = 0; i < moving.length; i += 1) {
        const car = moving[i];
        const height = seatOnGround(car.x, car.z);
        reseat(bodies[i], car, height);
        reseat(cabins[i], car, height + car.height);
      }
      updateInstances(bodyMesh, bodies);
      updateInstances(cabinMesh, cabins);
    },

    /** Swap one vehicle pool for a downloaded model. */
    useModel(id, model) {
      if (id === PARKED_MODEL) return usePool(model, parked, proceduralParked, false);
      if (id === TRAFFIC_MODEL) return usePool(model, moving, proceduralMoving, true);
      return false;
    },
  };

  /**
   * One instanced copy of `model` per vehicle in a pool, at the pool's sites.
   *
   * The model is sized to the length of the box it replaces and seated on the
   * heightfield. For the moving pool the scaled item objects are kept so
   * `update` can rewrite them in place; the parked pool never moves.
   */
  function usePool(model, cars, procedural, isMoving) {
    if (!model || cars.length === 0) return false;
    const { parts } = normalisedParts(model);
    if (parts.length === 0) return false;

    const items = cars.map((car) => (isMoving ? seatModelCar({}, car) : parkedModelItem(car)));
    const meshes = parts.map((part) => {
      const mesh = tiledInstances(part.geometry, part.material, items);
      mesh.receiveShadow = false;
      return mesh;
    });
    for (const mesh of meshes) group.add(mesh);

    procedural.visible = false;
    if (isMoving) modelMoving = { meshes, items };
    return true;
  }
}

/** Length the model is scaled to: the longer half-extent of its collision box,
 *  doubled. Sizing by length keeps a car the right size down the road; it comes
 *  out a little wider than the skinny box, which reads better, not worse. */
const carLength = (car) => Math.max(halfAcrossX(car), halfAlongZ(car)) * 2;

/** A parked model, seated once. Parked boxes are axis-aligned, so the model
 *  takes the same quarter-turn: a lay-by on an X line runs across Z. */
function parkedModelItem(car) {
  const alongZ = halfAlongZ(car) >= halfAcrossX(car);
  const size = carLength(car);
  return {
    x: car.x,
    y: seatOnGround(car.x, car.z),
    z: car.z,
    sx: size,
    sy: size,
    sz: size,
    rotationY: alongZ ? 0 : Math.PI / 2,
  };
}

/**
 * Writes a moving car's model instance in place from its simulation state.
 *
 * `heading` is the way the car travels; the models are authored nose toward
 * +Z, so heading is the rotation. The box path uses `yaw` and swapped extents
 * instead — a model cannot swap its extents, so it actually turns.
 */
function seatModelCar(item, car) {
  const size = carLength(car);
  item.x = car.x;
  item.y = seatOnGround(car.x, car.z);
  item.z = car.z;
  item.rotationY = car.heading ?? 0;
  item.sx = size;
  item.sy = size;
  item.sz = size;
  return item;
}

function reseat(item, car, y) {
  item.x = car.x;
  item.y = y;
  item.z = car.z;
  item.rotationY = car.yaw ?? 0;
}

/**
 * The body as drawn, which is the vehicle's own box — never `halfWidth` and
 * `halfDepth`, because a moving vehicle's collision box is the bounding box of
 * this one yawed, and drawing THAT would swell the truck as it turned.
 */
function bodyItem(car) {
  return {
    x: car.x,
    y: seatOnGround(car.x, car.z),
    z: car.z,
    sx: halfAcrossX(car) * 2,
    sy: car.height,
    sz: halfAlongZ(car) * 2,
    rotationY: car.yaw ?? 0,
    color: car.color,
  };
}

/**
 * The glasshouse, narrowed across the vehicle and shortened along it — which
 * way round depends on which way the vehicle is pointing.
 */
function cabinItem(car) {
  const alongZ = halfAlongZ(car) > halfAcrossX(car);
  return {
    x: car.x,
    y: car.height + seatOnGround(car.x, car.z),
    z: car.z,
    sx: halfAcrossX(car) * 2 * (alongZ ? 0.86 : 0.55),
    sy: car.cabinHeight,
    sz: halfAlongZ(car) * 2 * (alongZ ? 0.55 : 0.86),
    rotationY: car.yaw ?? 0,
  };
}

/** A parked vehicle is drawn at its collision box; a moving one carries its
 *  own, because the two are no longer the same thing. */
const halfAcrossX = (car) => car.bodyHalfWidth ?? car.halfWidth;
const halfAlongZ = (car) => car.bodyHalfDepth ?? car.halfDepth;

/** Unit box with its base on the ground plane. */
function baseBox() {
  const geometry = new BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);
  return geometry;
}
