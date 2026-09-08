/** Small numeric helpers. No domain knowledge lives here. */

export const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);

export const lerp = (a, b, t) => a + (b - a) * t;

/** Where `value` sits between `a` and `b`, clamped to 0..1. */
export const inverseLerp = (a, b, value) => (a === b ? 0 : clamp((value - a) / (b - a), 0, 1));

/** Hermite ease between two edges. The workhorse of every blend here. */
export function smoothstep(edge0, edge1, value) {
  const t = inverseLerp(edge0, edge1, value);
  return t * t * (3 - 2 * t);
}

/**
 * Frame-rate independent exponential approach. `lambda` is the rate of decay
 * per second: higher converges faster. Using this instead of `lerp(a, b, 0.1)`
 * is what stops camera smoothing behaving differently at 60 and 144 Hz.
 */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const sign = (value) => (value > 0 ? 1 : value < 0 ? -1 : 0);

/** Degrees to radians. */
export const rad = (degrees) => (degrees * Math.PI) / 180;
