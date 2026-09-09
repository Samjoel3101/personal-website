import { createJourneyCamera } from './camera.js';
import { createQualityController } from './quality.js';
import { createRenderer } from './renderer.js';
import { createValleyScene } from './scene.js';

/**
 * The renderer's front door.
 *
 * Everything outside src/render talks to this and nothing else: it owns the
 * GPU context, the camera, the scene graph and the quality ladder, and exposes
 * five verbs. Swapping the whole renderer means reimplementing this interface,
 * not touching the world model.
 */
export function createStage(canvas, valley) {
  const output = createRenderer(canvas);
  const view = createJourneyCamera(valley);
  const world = createValleyScene(valley);

  const quality = createQualityController((tier) => {
    output.applyQuality(tier);
    world.setQuality(tier);
    resize();
  });

  let width = 1;
  let height = 1;

  function resize(nextWidth = width, nextHeight = height) {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    output.setSize(width, height);
    view.setAspect(width / height);
  }

  output.applyQuality(quality.tier);
  world.setQuality(quality.tier);

  return {
    resize,

    /** Advance and draw one frame. `dt` is seconds since the previous one. */
    render(controls, dt) {
      output.beginFrame();
      view.update(controls, dt);
      world.update(view.camera.position, dt);
      output.renderer.render(world.scene, view.camera);
    },

    /** Feed a frame interval in milliseconds to the quality controller. */
    sampleFrameTime(ms) {
      quality.sample(ms);
    },

    /** Upgrade a species with the models that arrived for it, if any did. */
    useModels(id, models) {
      return world.useModels(id, models);
    },

    /** Pin the quality tier, for `npm run shoot`. See render/quality.js. */
    forceQuality(name) {
      return quality.force(name);
    },

    /** Move the flight along the valley. For the tests and the console. */
    jumpTo(where) {
      view.jumpTo(where);
    },

    /** How far down the valley the camera is, 0..1. */
    get progress() {
      return view.progress;
    },

    get diagnostics() {
      return {
        quality: quality.tier.name,
        draws: output.drawInfo.calls,
        triangles: output.drawInfo.triangles,
        camera: view.state,
      };
    },

    dispose() {
      output.dispose();
    },
  };
}
