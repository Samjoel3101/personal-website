/** Small numeric helpers. No domain knowledge lives here. */

export const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);

export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Frame-rate independent exponential approach. `lambda` is the rate of decay
 * per second: higher converges faster. Using this instead of `lerp(a, b, 0.1)`
 * is what stops camera smoothing behaving differently at 60 and 144 Hz.
 */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const sign = (value) => (value > 0 ? 1 : value < 0 ? -1 : 0);

/** Degrees to radians. */
export const rad = (degrees) => (degrees * Math.PI) / 180;
