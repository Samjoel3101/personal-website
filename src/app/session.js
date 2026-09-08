import { createValley } from '../world/valley.js';
import { createStage } from '../render/stage.js';
import { createControls } from '../input/controls.js';
import { createLoop } from '../core/loop.js';
import { createHud } from '../ui/hud.js';
import { createOverlays } from '../ui/overlays.js';

/**
 * The one module that knows about all the others.
 *
 * The world model does not import the renderer, the renderer does not import
 * the interface, and none of them import each other's state. They are wired
 * together here and nowhere else, which is why the valley can be generated and
 * tested in Node, and why the renderer could be replaced without any of it
 * being rewritten.
 */
export function createSession(elements) {
  const valley = createValley();
  const stage = createStage(elements.canvas, valley);
  const controls = createControls(elements.canvas);
  const overlays = createOverlays(elements);
  const hud = createHud(elements, controls);

  const loop = createLoop({
    frame: (dt) => {
      const snapshot = controls.snapshot(dt);
      // The on-screen throttle stands in for a key nobody on a phone has.
      if (hud.flying) snapshot.forward = 1;

      stage.render(snapshot, dt);
      hud.update({
        biome: valley.biomeAt(0, stage.diagnostics.camera.z).name,
        progress: stage.progress,
      });
    },
    onFrameTime: (ms) => stage.sampleFrameTime(ms),
  });

  function resize() {
    stage.resize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  // One frame before the title card, so the first thing behind it is the
  // valley rather than an empty canvas.
  stage.render(controls.snapshot(0), 0);

  return {
    valley,
    stage,
    overlays,

    showIntro() {
      overlays.showIntro();
      overlays.onBegin(() => {
        overlays.startFlight();
        loop.start();
      });
    },

    /** Used by the end-to-end suite, and handy in the console. */
    get debug() {
      return { running: loop.running, progress: stage.progress, ...stage.diagnostics };
    },

    dispose() {
      loop.stop();
      controls.dispose();
      stage.dispose();
      window.removeEventListener('resize', resize);
    },
  };
}
