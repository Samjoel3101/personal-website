/**
 * Binds on-screen buttons to the input state.
 *
 * Pointer events rather than touch events, so a finger that slides off a
 * button releases it — with touchstart/touchend alone the kart keeps
 * accelerating after your thumb has wandered.
 *
 * @param {HTMLElement} root container holding [data-action] buttons
 * @returns {() => void} unbind
 */
export function bindTouchControls(input, root) {
  if (!root) return () => {};

  const buttons = [...root.querySelectorAll('[data-action]')];
  const cleanups = [];

  for (const button of buttons) {
    const action = button.dataset.action;
    const press = (event) => {
      input.set(action, true);
      event.preventDefault();
    };
    const release = (event) => {
      input.set(action, false);
      event.preventDefault();
    };

    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('pointerleave', release);

    cleanups.push(() => {
      button.removeEventListener('pointerdown', press);
      button.removeEventListener('pointerup', release);
      button.removeEventListener('pointercancel', release);
      button.removeEventListener('pointerleave', release);
    });
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}
