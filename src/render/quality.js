import { DEFAULT_QUALITY_INDEX, QUALITY_TIERS } from '../config/render.js';

/**
 * Holds the render quality tier.
 *
 * Every visitor gets `DEFAULT_QUALITY_INDEX` — full detail, models and
 * shadows, regardless of their hardware. This used to adapt down from
 * measured frame intervals on a struggling machine; that traded a slow scene
 * for an invisible one; a site that quietly stops showing the thing it was
 * built to show is a worse trade than a slow one, so `force` (below) is now
 * the only way the tier changes.
 */
export function createQualityController(onChange) {
  let index = DEFAULT_QUALITY_INDEX;

  return {
    get tier() {
      return QUALITY_TIERS[index];
    },

    /** Pin to a specific tier. For `npm run shoot`, and nothing else. */
    force(name) {
      const next = QUALITY_TIERS.findIndex((tier) => tier.name === name);
      if (next < 0) return false;
      index = next;
      onChange(QUALITY_TIERS[index]);
      return true;
    },
  };
}
