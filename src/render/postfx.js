import { Vector2, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/** Restrained: enough to make lamp heads and landmark rings glow, not enough
 *  to turn a white building into a light source. */
const BLOOM = { strength: 0.42, radius: 0.6, threshold: 0.86 };

/**
 * Bloom, and the multisampling that has to come with it.
 *
 * Routing through a composer bypasses the WebGL context's own antialiasing, so
 * without a multisampled render target here, turning bloom on would visibly
 * make every edge in the scene worse. The target carries `samples` to put the
 * MSAA back.
 */
export function createPostProcessing(renderer, scene, camera) {
  const size = renderer.getSize(new Vector2());
  const target = new WebGLRenderTarget(size.x, size.y, { samples: 4 });
  const composer = new EffectComposer(renderer, target);

  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(size, BLOOM.strength, BLOOM.radius, BLOOM.threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let enabled = true;

  return {
    setSize(width, height) {
      composer.setSize(width, height);
      bloom.setSize(width, height);
    },

    setEnabled(value) {
      enabled = value;
    },

    get enabled() {
      return enabled;
    },

    render() {
      composer.render();
    },

    dispose() {
      composer.dispose();
      target.dispose();
    },
  };
}
