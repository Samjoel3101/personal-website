import { describe, expect, it } from 'vitest';
import { SURFACE, WORLD } from '../src/config/world.js';
import { wrapDistance } from '../src/core/torus.js';
import { CLEARANCE, buildPuddles, createPuddleSampler } from '../src/world/puddles.js';
import { distanceToTrack } from '../src/world/track.js';
import { createCity } from '../src/world/city.js';

const puddles = buildPuddles();

/**
 * A puddle across the racing line would be a grip bug rather than a feature:
 * you would lose the back end on a straight with no warning and nothing on
 * screen to read. The clearance test is the one that matters here.
 */
describe('puddles', () => {
  it('is deterministic', () => {
    expect(JSON.stringify(buildPuddles())).toBe(JSON.stringify(puddles));
  });

  it('differs when seeded differently', () => {
    expect(JSON.stringify(buildPuddles(99))).not.toBe(JSON.stringify(puddles));
  });

  it('places enough of them to matter', () => {
    expect(puddles.length).toBeGreaterThanOrEqual(30);
  });

  it('never touches the track', () => {
    for (const puddle of puddles) {
      expect(distanceToTrack(puddle.x, puddle.z) - puddle.radius).toBeGreaterThanOrEqual(CLEARANCE);
    }
  });

  it('never overlaps another puddle', () => {
    for (let i = 0; i < puddles.length; i += 1) {
      for (let j = i + 1; j < puddles.length; j += 1) {
        const a = puddles[i];
        const b = puddles[j];
        // wrapDistance, not raw subtraction: two puddles either side of the
        // seam are neighbours, and a raw hypot would call them half a world
        // apart and pass over the one overlap this test exists to catch.
        expect(wrapDistance(a.x, a.z, b.x, b.z)).toBeGreaterThan(a.radius + b.radius);
      }
    }
  });

  it('is what the surface sampler reports as mud', () => {
    const city = createCity();
    const inPuddle = createPuddleSampler(city.puddles);

    for (const puddle of city.puddles) {
      expect(inPuddle(puddle.x, puddle.z)).toBe(true);
      expect(city.surfaceAt(puddle.x, puddle.z)).toBe(SURFACE.MUD);
      // And just outside it, the ground is dry again.
      expect(city.surfaceAt(puddle.x + puddle.radius + 2, puddle.z)).not.toBe(SURFACE.MUD);
    }
  });

  it('stays inside the world', () => {
    for (const puddle of puddles) {
      expect(puddle.x).toBeGreaterThanOrEqual(0);
      expect(puddle.x).toBeLessThan(WORLD.SIZE);
      expect(puddle.z).toBeGreaterThanOrEqual(0);
      expect(puddle.z).toBeLessThan(WORLD.SIZE);
    }
  });
});
