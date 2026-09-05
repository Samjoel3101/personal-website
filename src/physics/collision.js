import { clamp, sign } from '../core/math.js';
import { wrap, wrapDelta } from '../core/torus.js';

/**
 * Circle-versus-box collision on a torus.
 *
 * A flat scan over every ground-level box beats the bookkeeping of a
 * broadphase at this scale — there are a couple of hundred of them and the
 * early-out on the bounding test rejects almost all of them in two compares.
 *
 * Coordinates wrap, so every difference goes through wrapDelta. Comparing raw
 * coordinates here would make the scenery either side of the seam invisible
 * to the solver.
 */

/**
 * @returns {{x, z, normalX, normalZ, penetration}|null} the corrected position
 *   and contact normal, or null if the circle is clear of the box
 */
export function resolveAgainstBox(x, z, radius, box) {
  const dx = wrapDelta(x - box.x);
  const dz = wrapDelta(z - box.z);

  if (Math.abs(dx) > box.halfWidth + radius) return null;
  if (Math.abs(dz) > box.halfDepth + radius) return null;

  const closestX = clamp(dx, -box.halfWidth, box.halfWidth);
  const closestZ = clamp(dz, -box.halfDepth, box.halfDepth);

  let normalX = dx - closestX;
  let normalZ = dz - closestZ;
  const distance = Math.hypot(normalX, normalZ);
  let penetration;

  if (distance === 0) {
    // The centre is inside the box: eject along the shallowest axis.
    const overlapX = box.halfWidth - Math.abs(dx);
    const overlapZ = box.halfDepth - Math.abs(dz);
    if (overlapX < overlapZ) {
      normalX = sign(dx) || 1;
      normalZ = 0;
      penetration = radius + overlapX;
    } else {
      normalX = 0;
      normalZ = sign(dz) || 1;
      penetration = radius + overlapZ;
    }
  } else {
    if (distance >= radius) return null;
    normalX /= distance;
    normalZ /= distance;
    penetration = radius - distance;
  }

  return {
    x: wrap(x + normalX * penetration),
    z: wrap(z + normalZ * penetration),
    normalX,
    normalZ,
    penetration,
  };
}

/**
 * Pushes a circle out of every box it overlaps.
 *
 * @returns {{x, z, contact: object|null, landmarkId: string|null}}
 */
export function resolveAll(x, z, radius, colliders) {
  let px = x;
  let pz = z;
  let deepest = null;
  let landmarkId = null;

  for (const box of colliders) {
    const hit = resolveAgainstBox(px, pz, radius, box);
    if (!hit) continue;

    px = hit.x;
    pz = hit.z;
    if (!deepest || hit.penetration > deepest.penetration) deepest = hit;
    if (box.landmarkId) landmarkId = box.landmarkId;
  }

  return { x: px, z: pz, contact: deepest, landmarkId };
}
