import { createEmitter } from '../core/emitter.js';
import { createLoop } from '../core/loop.js';
import { createKart } from '../physics/kart.js';
import { createSound } from '../audio/sound.js';
import { createInputState } from '../input/input-state.js';
import { createStage } from '../render/stage.js';
import { createCard } from '../ui/cards.js';
import { createHud } from '../ui/hud.js';
import { createMinimap } from '../ui/minimap.js';
import { createOverlays } from '../ui/overlays.js';
import { createResumeView } from '../ui/resume-view.js';
import { bindSession } from './bindings.js';
import { createDiscovery } from './discovery.js';

/**
 * Wires the pieces together and owns the run/pause state.
 *
 * Everything it composes is independently testable: the world model knows
 * nothing of the DOM, the renderer knows nothing of the resume, and the UI
 * knows nothing of the physics. This module is the only place that knows all
 * three exist, which is why it is worth keeping small.
 */
export function createSession(elements, city) {
  const emitter = createEmitter();
  const input = createInputState();
  const kart = createKart({ city, emitter });
  const discovery = createDiscovery(emitter);
  const stage = createStage(elements.canvas, city);
  const sound = createSound(emitter);
  const hud = createHud(elements, discovery);
  const minimap = createMinimap(elements.minimap, city, discovery);
  const resumeView = createResumeView(elements);

  let pendingComplete = false;

  const loop = createLoop({
    step: (dt) => {
      kart.update(dt, input.state);
      discovery.check(kart.state);
    },
    render: (dt) => {
      stage.render(kart.state, dt);
      hud.update(kart.state, kart.speedKph());
      minimap.update(kart.state);
      sound.update(kart.state);
    },
    onFrameTime: (ms) => stage.sampleFrameTime(ms),
  });

  const card = createCard(elements, { onClose: () => closeCard() });

  const overlays = createOverlays(elements, {
    onStart: () => {
      sound.start();
      overlays.hideIntro();
      loop.start();
    },
    onSkipToResume: () => resumeView.show(),
    onDismissComplete: () => {
      overlays.hideComplete();
      loop.start();
    },
  });

  function openCard(landmark) {
    loop.stop();
    input.releaseAll();
    card.open(landmark);
  }

  function closeCard() {
    card.close();
    // The finale waits for the last card to be dismissed, so the two panels
    // never stack on top of each other.
    if (pendingComplete) {
      pendingComplete = false;
      overlays.showComplete(kart.state.distance);
      return;
    }
    loop.start();
  }

  const controls = {
    toggleMute() {
      elements.muteButton.textContent = sound.toggle() ? 'Sound on' : 'Sound off';
    },
    openResume() {
      loop.stop();
      resumeView.show();
    },
    closeResume() {
      resumeView.hide();
      if (elements.intro.hidden && elements.card.hidden && elements.complete.hidden) loop.start();
    },
    dismissTopmost() {
      if (resumeView.isOpen) controls.closeResume();
      else if (card.isOpen) closeCard();
      else if (overlays.isCompleteOpen) elements.completeClose.click();
      else if (!elements.intro.hidden) elements.startButton.click();
    },
    resize() {
      stage.resize(window.innerWidth, window.innerHeight);
      stage.render(kart.state, 0);
    },
  };

  emitter.on('landmark:discovered', openCard);
  emitter.on('landmark:revisited', openCard);
  emitter.on('tour:complete', () => {
    pendingComplete = true;
  });

  bindSession(elements, input, controls);
  controls.resize();

  return {
    stage,
    showIntro: () => overlays.showIntro(),
    /** Exposed for the end-to-end suite to drive and assert on. */
    debug: { kart, discovery, city, input, loop },
  };
}
