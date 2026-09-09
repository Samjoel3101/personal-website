import { NeutralToneMapping, PCFShadowMap, WebGLRenderer } from 'three';
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
  // PCF rather than PCFSoft: the soft variant is deprecated as of three 0.185
  // and silently falls back to this anyway, having printed a warning into
  // everyone's console on the way.
  renderer.shadowMap.type = PCFShadowMap;
  /*
   * Neutral rather than filmic, and this is a look decision with a reason.
   *
   * ACES is built for photographic footage: it rolls the midtones down and
   * desaturates as it goes, which is exactly right for a rendered-real image
   * and exactly wrong here. The palette in src/config/palette.js is a
   * deliberately high-key, saturated illustration — see the note at the top of
   * it — and ACES was quietly undoing that, turning a bright green forest into
   * a slightly grey one and then inviting the palette to be pushed further to
   * compensate. Khronos' neutral curve leaves the midtones where the palette
   * put them and only rolls off the highlights, which is all that was ever
   * wanted from tone mapping in a scene with no real dynamic range.
   *
   * The exposure lift is the sunlit register of the reference art: the ground
   * is bright enough that a trunk in front of it reads pale.
   */
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.18;

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
