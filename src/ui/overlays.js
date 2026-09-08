/**
 * The two full-screen panels: the loading card and the title card.
 *
 * They are plain DOM with a `hidden` attribute rather than a state machine.
 * There are two of them, they are shown once each, and anything more
 * elaborate would be a framework in search of a problem.
 */
export function createOverlays(elements) {
  return {
    /** Called while the valley is being generated. */
    setLoadingNote(text) {
      elements.loadingNote.textContent = text;
    },

    showIntro() {
      elements.loading.hidden = true;
      elements.intro.hidden = false;
    },

    /** @param {() => void} onBegin */
    onBegin(handler) {
      elements.begin.addEventListener('click', handler, { once: true });
    },

    startFlight() {
      elements.intro.hidden = true;
      elements.hud.hidden = false;
    },

    fail(message) {
      elements.loading.hidden = false;
      elements.loading.classList.add('failed');
      elements.loadingNote.textContent = message;
    },
  };
}
