import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_FRAME_SECONDS, PHYSICS_HZ } from '../src/config/tuning.js';
import { createLoop } from '../src/core/loop.js';

/**
 * A hand-driven animation frame clock, so the fixed-timestep behaviour can be
 * asserted exactly instead of being timed.
 */
function installFakeClock() {
  let now = 0;
  let pending = null;

  globalThis.performance = { now: () => now };
  globalThis.requestAnimationFrame = (callback) => {
    pending = callback;
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {
    pending = null;
  };

  return {
    /** Advance the clock and deliver one animation frame. */
    advance(ms) {
      now += ms;
      const callback = pending;
      pending = null;
      callback?.(now);
    },
    get hasPending() {
      return pending !== null;
    },
  };
}

describe('fixed-timestep loop', () => {
  let clock;
  let originals;

  beforeEach(() => {
    originals = {
      performance: globalThis.performance,
      raf: globalThis.requestAnimationFrame,
      caf: globalThis.cancelAnimationFrame,
    };
    clock = installFakeClock();
  });

  afterEach(() => {
    globalThis.performance = originals.performance;
    globalThis.requestAnimationFrame = originals.raf;
    globalThis.cancelAnimationFrame = originals.caf;
    vi.restoreAllMocks();
  });

  it('steps physics at the configured rate regardless of frame length', () => {
    const step = vi.fn();
    const loop = createLoop({ step, render: () => {} });
    loop.start();

    clock.advance(1000 / 60); // one 60 Hz frame
    expect(step).toHaveBeenCalledTimes(PHYSICS_HZ / 60);
    expect(step).toHaveBeenCalledWith(1 / PHYSICS_HZ);
  });

  it('clamps an enormous delta, so a backgrounded tab cannot tunnel', () => {
    const step = vi.fn();
    const loop = createLoop({ step, render: () => {} });
    loop.start();

    clock.advance(60_000); // a minute in another tab
    expect(step.mock.calls.length).toBeLessThanOrEqual(MAX_FRAME_SECONDS * PHYSICS_HZ);
  });

  it('renders once per frame and reports the interval', () => {
    const render = vi.fn();
    const onFrameTime = vi.fn();
    const loop = createLoop({ step: () => {}, render, onFrameTime });
    loop.start();

    clock.advance(16);
    expect(render).toHaveBeenCalledTimes(1);
    expect(onFrameTime).toHaveBeenCalledWith(16);
  });

  it('stops and reports its state', () => {
    const step = vi.fn();
    const loop = createLoop({ step, render: () => {} });
    expect(loop.running).toBe(false);

    loop.start();
    expect(loop.running).toBe(true);
    loop.stop();
    expect(loop.running).toBe(false);

    clock.advance(16);
    expect(step).not.toHaveBeenCalled();
  });

  it('ignores a second start', () => {
    const loop = createLoop({ step: () => {}, render: () => {} });
    loop.start();
    loop.start();
    expect(loop.running).toBe(true);
  });
});
