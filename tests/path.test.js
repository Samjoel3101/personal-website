import { describe, expect, it } from 'vitest';
import { PATH, POOLS, WORLD } from '../src/config/world.js';
import {
  distanceToPath,
  flattenFactor,
  pathCentre,
  pathFactor,
  vergeFactor,
} from '../src/world/path.js';
import { heightAt } from '../src/world/terrain.js';

/**
 * The trail is the thing that makes this a place someone could walk rather
 * than a field of trees seen from above, and almost everything else in the
 * world model reads it. These are the properties it has to hold to stay
 * walkable: it stays in the valley, it never doubles back, it does not walk
 * into a lake, and the ground across it is level.
 */
describe('the trail', () => {
  it('stays well inside the valley', () => {
    for (let z = 0; z <= WORLD.LENGTH; z += 10) {
      expect(Math.abs(pathCentre(z))).toBeLessThan(WORLD.HALF_WIDTH * 0.6);
    }
  });

  it('never swerves harder than a path could', () => {
    let steepest = 0;
    for (let z = 2; z <= WORLD.LENGTH; z += 2) {
      steepest = Math.max(steepest, Math.abs(pathCentre(z) - pathCentre(z - 2)) / 2);
    }
    // Sideways units per unit forward. Past about one this stops being a path
    // and starts being a slalom the camera has to sprint sideways to follow.
    expect(steepest).toBeLessThan(1);
  });

  it('keeps out of the water', () => {
    for (const pool of POOLS) {
      let closest = Infinity;
      for (let z = 0; z <= WORLD.LENGTH; z += 5) {
        closest = Math.min(closest, Math.hypot(pathCentre(z) - pool.x, z - pool.z));
      }
      // Clear of the water, but close enough to walk past: both halves matter.
      expect(closest, `pool ${pool.id}`).toBeGreaterThan(pool.radius + PATH.HALF_WIDTH);
      expect(closest, `pool ${pool.id}`).toBeLessThan(pool.radius * 2.5);
    }
  });

  it('is bare earth in the middle and undergrowth outside the verge', () => {
    const z = 1700;
    expect(pathFactor(pathCentre(z), z)).toBe(1);
    expect(pathFactor(pathCentre(z) + PATH.HALF_WIDTH * 0.5, z)).toBe(1);
    expect(pathFactor(pathCentre(z) + PATH.HALF_WIDTH + PATH.VERGE + 1, z)).toBe(0);
  });

  it('peaks its verge just outside the earth, and fades into the trees', () => {
    const z = 2600;
    const centre = pathCentre(z);
    expect(vergeFactor(centre, z)).toBe(0);
    expect(vergeFactor(centre + PATH.HALF_WIDTH, z)).toBeGreaterThan(0.8);

    // Reaches well past the band that keeps the ground clear — that is the
    // point of having two — but it does end.
    expect(vergeFactor(centre + PATH.HALF_WIDTH + PATH.VERGE * 2, z)).toBeGreaterThan(0);
    expect(vergeFactor(centre + PATH.HALF_WIDTH + PATH.VERGE * 4, z)).toBe(0);
  });

  it('measures distance from the centre line, wherever the line has got to', () => {
    for (const z of [400, 1500, 3300, 5100]) {
      expect(distanceToPath(pathCentre(z), z)).toBeCloseTo(0, 6);
      expect(distanceToPath(pathCentre(z) + 25, z)).toBeCloseTo(25, 6);
    }
  });

  it('levels the ground across itself', () => {
    for (const z of [600, 1900, 3400, 4800]) {
      const centre = pathCentre(z);
      const camber = Math.abs(
        heightAt(centre - PATH.HALF_WIDTH, z) - heightAt(centre + PATH.HALF_WIDTH, z),
      );
      const beside = Math.abs(heightAt(centre - 120, z) - heightAt(centre + 120, z));
      // Level across the trail, and the land either side of it is not — a
      // trail that is flat because the whole valley is flat proves nothing.
      expect(camber, `camber at z=${z}`).toBeLessThan(1);
      expect(beside).toBeGreaterThan(camber);
    }
  });

  it('takes a gentler line than the ground it crosses', () => {
    // The trail follows a smoothed profile, so it cuts humps and fills
    // hollows: what it must never do is climb faster than the land around it —
    // measured against the ground at the same z, either side of the trail.
    //
    // The pool surrounds are left out: `carveBasins` deliberately raises a
    // bank there to hold the water in, and the trail rides up it. That is
    // engineered relief, not the hill-walking this test is about.
    const nearPool = (z) =>
      POOLS.some((pool) => Math.hypot(pathCentre(z) - pool.x, z - pool.z) < pool.radius * 2.5);

    let steepestTrail = 0;
    let steepestLand = 0;
    for (let z = 300; z < WORLD.LENGTH - 300; z += 10) {
      if (nearPool(z) || nearPool(z - 10)) continue;
      const trail = Math.abs(heightAt(pathCentre(z), z) - heightAt(pathCentre(z - 10), z - 10));
      let land = 0;
      for (const offset of [-150, -100, 100, 150]) {
        land = Math.max(
          land,
          Math.abs(
            heightAt(pathCentre(z) + offset, z) - heightAt(pathCentre(z - 10) + offset, z - 10),
          ),
        );
      }
      steepestTrail = Math.max(steepestTrail, trail);
      steepestLand = Math.max(steepestLand, land);
    }
    expect(steepestTrail).toBeLessThan(steepestLand);
    // And in absolute terms: steep in places — it is a footpath over hills,
    // not a towpath — but never a step you would have to climb.
    expect(steepestTrail).toBeLessThan(5);
  });

  it('eases the levelling out rather than leaving a kerb', () => {
    const z = 2200;
    const centre = pathCentre(z);
    expect(flattenFactor(centre, z)).toBe(1);
    expect(flattenFactor(centre + PATH.HALF_WIDTH * 2, z)).toBeGreaterThan(0);
    expect(flattenFactor(centre + PATH.HALF_WIDTH * 2, z)).toBeLessThan(1);
    expect(flattenFactor(centre + PATH.HALF_WIDTH * PATH.FLATTEN + 1, z)).toBe(0);
  });
});
