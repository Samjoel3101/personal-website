/**
 * The render loop.
 *
 * There is no simulation to keep in lockstep here — nothing in this scene is
 * integrated, and the camera is the only thing that moves — so this is a plain
 * animation frame loop that hands out an elapsed time. It caps that time
 * because a backgrounded tab hands back an enormous delta on its first frame
 * back, which would fling the camera down the valley in one step.
 */
const MAX_FRAME_SECONDS = 1 / 15;

export function createLoop({ frame, onFrameTime }) {
  let running = false;
  let previous = 0;
  let handle = 0;

  function tick(now) {
    if (!running) return;
    handle = requestAnimationFrame(tick);

    const elapsedMs = now - previous;
    previous = now;
    frame(Math.min(elapsedMs / 1000, MAX_FRAME_SECONDS), now);
    onFrameTime?.(elapsedMs);
  }

  return {
    start() {
      if (running) return;
      running = true;
      previous = performance.now();
      handle = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(handle);
    },
    get running() {
      return running;
    },
  };
}
