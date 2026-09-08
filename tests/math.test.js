import { describe, expect, it } from 'vitest';
import { clamp, damp, inverseLerp, lerp, rad, sign, smoothstep } from '../src/core/math.js';

describe('math helpers', () => {
  it('clamps into range', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it('interpolates and inverts', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(inverseLerp(10, 20, 15)).toBe(0.5);
    expect(inverseLerp(10, 20, 99)).toBe(1);
    expect(inverseLerp(4, 4, 4)).toBe(0);
  });

  it('eases with a flat start and finish', () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    // The point of the curve: it leaves and arrives slowly.
    expect(smoothstep(0, 1, 0.1)).toBeLessThan(0.1);
    expect(smoothstep(0, 1, 0.9)).toBeGreaterThan(0.9);
  });

  it('damps at the same rate whatever the frame rate', () => {
    const oneStep = damp(0, 100, 4, 0.1);
    let twoSteps = damp(0, 100, 4, 0.05);
    twoSteps = damp(twoSteps, 100, 4, 0.05);
    expect(twoSteps).toBeCloseTo(oneStep, 10);
  });

  it('has a three-way sign and degrees', () => {
    expect([sign(-3), sign(0), sign(3)]).toEqual([-1, 0, 1]);
    expect(rad(180)).toBeCloseTo(Math.PI);
  });
});
