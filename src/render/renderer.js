import { ACESFilmicToneMapping, PCFSoftShadowMap, WebGLRenderer } from 'three';
import { clamp } from '../core/math.js';

/** Above this the extra pixels cost frames and buy nothing anyone can see. */
const MAX_PIXEL_RATIO = 2;

/**
 * Owns the WebGL context and nothing else: creation, sizing, quality knobs,
 * teardown. Scene contents, cameras and passes all live elsewhere so that this
 * stays the one place that talks to the GPU directly.
 */
export function createRenderer(canvas) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  // Filmic tone mapping keeps the bright sky from clipping to flat white
  // without desaturating the pastel facades the palette depends on.
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // Post-processing renders several passes per frame, and info resets on every
  // one of them. Manual reset makes `drawInfo` the whole frame's cost rather
  // than the last pass's, which is the number worth looking at.
  renderer.info.autoReset = false;

  let cap = MAX_PIXEL_RATIO;

  function applyPixelRatio() {
    const device = window.devicePixelRatio || 1;
    renderer.setPixelRatio(clamp(device, 0.5, cap));
  }

  return {
    renderer,

    setSize(width, height) {
      applyPixelRatio();
      renderer.setSize(width, height, false);
    },

    /** Called by the quality controller when the tier changes. */
    applyQuality(tier) {
      cap = Math.min(MAX_PIXEL_RATIO, tier.pixelRatio);
      renderer.shadowMap.enabled = tier.shadows;
      renderer.shadowMap.needsUpdate = true;
      applyPixelRatio();
    },

    /** Call once at the top of each frame, before any pass runs. */
    beginFrame() {
      renderer.info.reset();
    },

    get drawInfo() {
      return renderer.info.render;
    },

    dispose() {
      renderer.dispose();
    },
  };
}
