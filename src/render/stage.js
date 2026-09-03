import { createChaseCamera } from './camera.js';
import { createPostProcessing } from './postfx.js';
import { createQualityController } from './quality.js';
import { createRenderer } from './renderer.js';
import { createGameScene } from './scene.js';

/**
 * The renderer's front door.
 *
 * Everything outside src/render talks to this and nothing else: it owns the
 * GPU context, the camera, the scene graph, the post chain and the quality
 * ladder, and exposes four verbs. Swapping the whole renderer means
 * reimplementing this interface, not touching the game.
 */
export function createStage(canvas, city) {
  const output = createRenderer(canvas);
  const view = createChaseCamera();
  const world = createGameScene(city);
  const post = createPostProcessing(output.renderer, world.scene, view.camera);

  const quality = createQualityController((tier) => {
    output.applyQuality(tier);
    world.setQuality(tier);
    post.setEnabled(tier.bloom);
    resize();
  });

  let width = 1;
  let height = 1;

  function resize(nextWidth = width, nextHeight = height) {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    output.setSize(width, height);
    post.setSize(width, height);
    view.setAspect(width / height);
  }

  output.applyQuality(quality.tier);
  post.setEnabled(quality.tier.bloom);

  return {
    resize,

    /** Advance the visuals. `dt` is seconds since the previous frame. */
    render(kartState, dt) {
      output.beginFrame();
      world.update(kartState, dt);
      view.update(kartState, dt);
      if (post.enabled) post.render();
      else output.renderer.render(world.scene, view.camera);
    },

    /** Feed a frame interval in milliseconds to the quality controller. */
    sampleFrameTime(ms) {
      quality.sample(ms);
    },

    /** Swap the procedural kart for a loaded glTF, if one arrived. */
    useKartModel(model) {
      return world.kart.useModel(model);
    },

    get diagnostics() {
      return { quality: quality.tier.name, draws: output.drawInfo.calls };
    },

    dispose() {
      post.dispose();
      output.dispose();
    },
  };
}
