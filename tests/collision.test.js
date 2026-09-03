import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/config/world.js';
import { resolveAgainstBox, resolveAll } from '../src/physics/collision.js';

const box = (overrides = {}) => ({
  x: 500,
  z: 500,
  halfWidth: 20,
  halfDepth: 20,
  base: 0,
  ...overrides,
});

describe('collision', () => {
  it('ignores a circle that is clear of the box', () => {
    expect(resolveAgainstBox(600, 500, 15, box())).toBeNull();
  });

  it('pushes a circle out along the face it touched', () => {
    const hit = resolveAgainstBox(530, 500, 15, box());
    expect(hit).not.toBeNull();
    expect(hit.x).toBeCloseTo(535, 6);
    expect(hit.normalX).toBeCloseTo(1, 6);
    expect(hit.normalZ).toBeCloseTo(0, 6);
  });

  it('ejects a circle that started inside, along the shallowest axis', () => {
    // Nearer the +X face than the +Z face, so it should leave sideways.
    const hit = resolveAgainstBox(515, 502, 15, box());
    expect(hit).not.toBeNull();
    expect(Math.abs(hit.normalX)).toBe(1);
    expect(hit.normalZ).toBe(0);
  });

  it('resolves across the world seam', () => {
    const seamBox = box({ x: 4, z: 500 });
    const hit = resolveAgainstBox(WORLD.SIZE - 6, 500, 15, seamBox);
    expect(hit).not.toBeNull();
    // Pushed further negative, which wraps to just under SIZE.
    expect(hit.x).toBeGreaterThan(WORLD.SIZE - 40);
  });

  it('leaves the circle clear of every box after resolving', () => {
    const boxes = [box(), box({ x: 536, z: 500 }), box({ x: 500, z: 536 })];
    const result = resolveAll(505, 505, 15, boxes);
    for (const candidate of boxes) {
      expect(resolveAgainstBox(result.x, result.z, 15 - 0.001, candidate)).toBeNull();
    }
  });

  it('reports the landmark it is touching', () => {
    const result = resolveAll(530, 500, 15, [box({ landmarkId: 'work' })]);
    expect(result.landmarkId).toBe('work');
  });
});
