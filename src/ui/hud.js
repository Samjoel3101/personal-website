import { clamp } from '../core/math.js';

/**
 * The heads-up display: where you are on the journey, and how to fly it.
 *
 * Written to on every frame, so it does the one thing that matters for a DOM
 * overlay in an animation loop — it compares before it writes. Assigning the
 * same string to `textContent` sixty times a second is a style recalculation
 * sixty times a second, and it will show up in the frame budget long before
 * anything in the scene does.
 */
export function createHud(elements, controls) {
  let lastBiome = '';
  let lastProgress = -1;

  elements.pause.addEventListener('click', () => {
    setPaused(controls.togglePaused());
  });

  // Touch has no keyboard to hold, so the one on-screen control is a throttle.
  const press = (value) => (event) => {
    event.preventDefault();
    elements.fly.dataset.held = value ? 'yes' : 'no';
  };
  elements.fly.addEventListener('pointerdown', press(true));
  elements.fly.addEventListener('pointerup', press(false));
  elements.fly.addEventListener('pointercancel', press(false));

  function setPaused(paused) {
    elements.pause.textContent = paused ? 'Resume' : 'Pause';
    elements.pause.setAttribute('aria-pressed', String(paused));
  }
  setPaused(controls.paused);

  return {
    /** True while the on-screen throttle is held. */
    get flying() {
      return elements.fly.dataset.held === 'yes';
    },

    update({ biome, progress }) {
      if (biome !== lastBiome) {
        elements.biome.textContent = biome;
        lastBiome = biome;
      }
      const percent = Math.round(clamp(progress, 0, 1) * 100);
      if (percent !== lastProgress) {
        elements.progress.style.width = `${percent}%`;
        elements.progress.parentElement.setAttribute('aria-valuenow', String(percent));
        lastProgress = percent;
      }
    },
  };
}
