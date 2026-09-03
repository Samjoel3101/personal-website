import { OWNER } from '../content/resume.js';
import { renderContactLinks } from './links.js';

/**
 * The full-screen panels: loading, intro, and the finale.
 *
 * They are plain hidden/shown DOM rather than a router or a state library,
 * because there are three of them and they never nest.
 */
export function createOverlays(elements, handlers) {
  elements.introName.textContent = OWNER.name;
  elements.introTagline.textContent = OWNER.tagline;

  elements.startButton.addEventListener('click', handlers.onStart);
  elements.skipButton.addEventListener('click', handlers.onSkipToResume);
  elements.completeClose.addEventListener('click', handlers.onDismissComplete);

  let completeShown = false;

  return {
    showIntro() {
      elements.loading.hidden = true;
      elements.intro.hidden = false;
    },

    hideIntro() {
      elements.intro.hidden = true;
      elements.hud.hidden = false;
    },

    /** Fires once, the first time every landmark has been read. */
    showComplete(distanceMetres) {
      if (completeShown) return;
      completeShown = true;
      elements.completeLine.textContent =
        `That is the whole tour — ${(distanceMetres / 1000).toFixed(1)} km driven. ` +
        'If any of it landed, the door is open.';
      renderContactLinks(elements.completeLinks);
      elements.complete.hidden = false;
    },

    hideComplete() {
      elements.complete.hidden = true;
    },

    get isCompleteOpen() {
      return !elements.complete.hidden;
    },
  };
}
