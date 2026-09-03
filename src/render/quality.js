import { DEFAULT_QUALITY_INDEX, QUALITY_TIERS } from '../config/render.js';
import { clamp } from '../core/math.js';

/**
 * Picks a quality tier from measured frame intervals.
 *
 * Timing the renderer's own work is misleading — draw calls are queued and the
 * GPU finishes them after the function returns, so the number comes back small
 * on a machine that is visibly struggling. The frame interval is what the
 * viewer actually experiences, so that is what drives this.
 *
 * Coming back up is deliberately slow: without a cooldown the tier oscillates,
 * because raising it costs exactly the frames that made raising it look safe.
 */
const SAMPLE_FRAMES = 45;
const DROP_ABOVE_MS = 21;
const RAISE_BELOW_MS = 17.2;
const RAISE_COOLDOWN_SAMPLES = 12;

export function createQualityController(onChange) {
  let index = DEFAULT_QUALITY_INDEX;
  let sum = 0;
  let count = 0;
  let cooldown = 0;

  function moveTo(next) {
    const clamped = clamp(next, 0, QUALITY_TIERS.length - 1);
    if (clamped === index) return;
    index = clamped;
    onChange(QUALITY_TIERS[index]);
  }

  return {
    get tier() {
      return QUALITY_TIERS[index];
    },

    /** Feed one frame interval, in milliseconds. */
    sample(ms) {
      if (ms > 200) return; // a tab that was backgrounded
      sum += ms;
      count += 1;
      if (count < SAMPLE_FRAMES) return;

      const average = sum / count;
      sum = 0;
      count = 0;
      if (cooldown > 0) cooldown -= 1;

      if (average > DROP_ABOVE_MS && index > 0) {
        cooldown = RAISE_COOLDOWN_SAMPLES;
        moveTo(index - 1);
      } else if (average < RAISE_BELOW_MS && cooldown === 0) {
        moveTo(index + 1);
      }
    },
  };
}
