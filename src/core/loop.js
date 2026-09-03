import { MAX_FRAME_SECONDS, PHYSICS_HZ } from '../config/tuning.js';

/**
 * Fixed-timestep game loop.
 *
 * Physics steps at a constant rate regardless of display refresh, so a kart
 * handles identically on a 60 Hz laptop and a 144 Hz monitor, and so a replay
 * of the same inputs produces the same drive. Rendering happens once per
 * animation frame with whatever time is left over.
 */
export function createLoop({ step, render, onFrameTime }) {
  const STEP_SECONDS = 1 / PHYSICS_HZ;
  const MAX_STEPS_PER_FRAME = 12;

  let running = false;
  let previous = 0;
  let accumulator = 0;
  let frameHandle = 0;

  function tick(now) {
    if (!running) return;
    frameHandle = requestAnimationFrame(tick);

    const elapsedMs = now - previous;
    previous = now;

    // A backgrounded tab hands back an enormous delta; integrating it would
    // tunnel the kart through a wall on the first frame after returning.
    const elapsed = Math.min(elapsedMs / 1000, MAX_FRAME_SECONDS);

    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP_SECONDS && steps < MAX_STEPS_PER_FRAME) {
      step(STEP_SECONDS);
      accumulator -= STEP_SECONDS;
      steps += 1;
    }

    render(elapsed, now);
    onFrameTime?.(elapsedMs);
  }

  return {
    start() {
      if (running) return;
      running = true;
      previous = performance.now();
      accumulator = 0;
      frameHandle = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frameHandle);
    },
    get running() {
      return running;
    },
  };
}
