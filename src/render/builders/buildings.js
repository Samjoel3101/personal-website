import { BoxGeometry, Group } from 'three';
import { createFacadeMaterial } from '../facade-material.js';
import { seatOnGround } from '../ground-follow.js';
import { instancedTinted } from '../materials.js';
import { tiledInstances } from '../geometry/tiling.js';

/**
 * Every building in the city, as two instanced meshes: one with windows and
 * one without. Splitting them is what lets landmark spires, awnings and
 * floodlights stay plain while ordinary facades get glass.
 *
 * The geometry is a unit box whose base sits on y = 0, so an instance's scale
 * is its real size and its position is its footprint centre.
 */
export function buildBuildings(city) {
  const group = new Group();
  group.name = 'buildings';

  const glazed = city.buildings.filter((box) => box.windows);
  const plain = city.buildings.filter((box) => !box.windows);

  if (glazed.length > 0) {
    group.add(tiledInstances(unitBox(), createFacadeMaterial(), glazed.map(toInstance)));
  }
  if (plain.length > 0) {
    group.add(tiledInstances(unitBox(), instancedTinted(), plain.map(toInstance)));
  }

  return group;
}

/** A 1x1x1 box translated so its base is on the ground plane. */
export function unitBox() {
  const geometry = new BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);
  return geometry;
}

function toInstance(box) {
  return {
    x: box.x,
    // Seated on the heightfield. The physics still treats this as a 2-D
    // footprint at y = 0; only the picture knows about the hill.
    y: box.base + seatOnGround(box.x, box.z, box.halfWidth, box.halfDepth),
    z: box.z,
    sx: box.halfWidth * 2,
    sy: box.height,
    sz: box.halfDepth * 2,
    color: box.color,
  };
}
