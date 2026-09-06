import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, Vector3 } from 'three';
import { createRng, rangeFrom } from '../../core/rng.js';
import { mergeParts } from './merge.js';

/**
 * The shapes rally scenery is made of.
 *
 * Every one of these is authored in the SAME unit box: x and z in [-0.5, 0.5],
 * y in [0, 1]. That is the contract with the scenery builder — an instance's
 * scale is then just (halfWidth * 2, height, halfDepth * 2) and its position is
 * its footprint centre, exactly as the collision box describes it. Author a
 * shape outside that box and it will not line up with the thing you can crash
 * into.
 *
 * None of them carry vertex colours: they are tinted per instance. See the
 * colour trap at the top of src/render/materials.js.
 */

/** A chunky boulder: three overlapping faceted lumps, merged. */
export function rockGeometry(variant) {
  const rng = createRng(4400 + variant);
  const parts = [];

  for (let i = 0; i < 3; i += 1) {
    const radius = rangeFrom(rng, 0.24, 0.4);
    const lump = new IcosahedronGeometry(radius, 0);
    lump.scale(rangeFrom(rng, 0.8, 1.4), rangeFrom(rng, 0.6, 1.1), rangeFrom(rng, 0.8, 1.4));
    lump.translate(
      rangeFrom(rng, -0.14, 0.14),
      rangeFrom(rng, 0.1, 0.4),
      rangeFrom(rng, -0.14, 0.14),
    );
    parts.push(lump);
  }

  return fitToUnitBox(mergeParts(parts, `rock-${variant}`));
}

/** Where a barn's walls stop and its roof starts. */
const EAVES = 0.72;

/** Barn walls: a plain box, tinted per instance. */
export function barnWallsGeometry() {
  const walls = new BoxGeometry(1, EAVES, 1);
  walls.translate(0, EAVES / 2, 0);
  return walls;
}

/**
 * Barn roof: a wide overhanging eave slab with a ridge on top. Kept as its own
 * mesh so it can stay corrugated-iron grey while the walls take the instance
 * tint — a barn whose roof is the same colour as its planks reads as a crate.
 */
export function barnRoofGeometry() {
  const eave = new BoxGeometry(1.14, 0.16, 1.14);
  eave.translate(0, EAVES + 0.08, 0);
  const ridge = new BoxGeometry(0.62, 0.14, 0.62);
  ridge.translate(0, EAVES + 0.22, 0);
  return mergeParts([eave, ridge], 'barn-roof');
}

/** A stack of round bales, lying on their sides across the long axis. */
export function baleStackGeometry() {
  const parts = [];
  const bale = (x, y, radius) => {
    const cylinder = new CylinderGeometry(radius, radius, 0.86, 10);
    cylinder.rotateZ(Math.PI / 2);
    cylinder.translate(x, y, 0);
    return cylinder;
  };

  for (const x of [-0.26, 0.26]) parts.push(bale(x, 0.26, 0.26));
  parts.push(bale(0, 0.72, 0.24));
  return fitToUnitBox(mergeParts(parts, 'bale-stack'));
}

/**
 * A spectator stand: three banked steps facing -Z, with a back board.
 *
 * The steps run across Z, so the builder rotates any stand whose long axis is
 * Z by a quarter turn — which keeps the collision box exactly where it was,
 * because a 90-degree turn of an axis-aligned box is still axis-aligned.
 */
export function standGeometry() {
  const parts = [];
  const STEPS = 3;

  for (let i = 0; i < STEPS; i += 1) {
    const height = 0.3 + (i / STEPS) * 0.55;
    const step = new BoxGeometry(0.96, height, 1 / STEPS);
    step.translate(0, height / 2, -0.5 + (i + 0.5) / STEPS);
    parts.push(step);
  }

  const back = new BoxGeometry(1, 1, 0.1);
  back.translate(0, 0.5, 0.45);
  parts.push(back);

  return mergeParts(parts, 'stand');
}

/** A 1x1x1 box translated so its base is on the ground plane. */
export function unitBox() {
  const geometry = new BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);
  return geometry;
}

/**
 * Rescales a geometry into the unit box the instancing contract expects.
 *
 * Merged lumps end up wherever their parts put them, and a boulder whose
 * bounding box is 1.3 units wide would stick out of the collision box drawn
 * around it by fifteen percent — visible the moment you drive at one.
 */
function fitToUnitBox(geometry) {
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const size = bounds.getSize(new Vector3());
  const centre = bounds.getCenter(new Vector3());

  geometry.translate(-centre.x, -bounds.min.y, -centre.z);
  geometry.scale(1 / (size.x || 1), 1 / (size.y || 1), 1 / (size.z || 1));
  return geometry;
}
