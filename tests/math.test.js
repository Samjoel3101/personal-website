import { describe, expect, it } from 'vitest';
import { clamp, damp, lerp, rad, sign } from '../src/core/math.js';

describe('maths helpers', () => {
  it('clamps', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('interpolates', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });

  it('signs', () => {
    expect(sign(3)).toBe(1);
    expect(sign(-3)).toBe(-1);
    expect(sign(0)).toBe(0);
  });

  it('converts degrees', () => {
    expect(rad(180)).toBeCloseTo(Math.PI, 10);
  });

  /**
   * The property that matters: damping the same total time in one step or in
   * many must land in the same place, or camera smoothing behaves differently
   * at 60 and 144 Hz.
   */
  it('is frame-rate independent', () => {
    const oneStep = damp(0, 100, 5, 0.5);

    let many = 0;
    for (let i = 0; i < 50; i += 1) many = damp(many, 100, 5, 0.01);

    expect(many).toBeCloseTo(oneStep, 6);
  });

  it('approaches the target without overshooting', () => {
    let value = 0;
    for (let i = 0; i < 200; i += 1) {
      value = damp(value, 10, 8, 1 / 60);
      expect(value).toBeLessThanOrEqual(10);
    }
    expect(value).toBeCloseTo(10, 3);
  });
});
