import { bindKeyboard } from '../input/keyboard.js';
import { bindTouchControls } from '../input/touch.js';

/**
 * Attaches every listener the session needs.
 *
 * Kept apart from src/game/session.js so that composing the game and reacting
 * to a click stay two separate readings. `controls` is the small verb surface
 * the session exposes; nothing here reaches past it.
 */
export function bindSession(elements, input, controls) {
  bindKeyboard(input, {
    KeyM: () => controls.toggleMute(),
    Escape: () => controls.dismissTopmost(),
    Enter: () => controls.dismissTopmost(),
  });
  bindTouchControls(input, elements.touch);

  elements.muteButton.addEventListener('click', () => controls.toggleMute());
  elements.resumeButton.addEventListener('click', () => controls.openResume());
  elements.resumeBack.addEventListener('click', () => controls.closeResume());
  window.addEventListener('resize', () => controls.resize());
}
