const BINDINGS = {
  ArrowUp: 'accelerate',
  KeyW: 'accelerate',
  ArrowDown: 'brake',
  KeyS: 'brake',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'drift',
  ShiftRight: 'drift',
  Space: 'drift',
};

/**
 * Binds the keyboard to the input state.
 *
 * `shortcuts` handles keys that are commands rather than controls — mute,
 * close a card — and is kept separate so the driving bindings stay a plain
 * lookup table anyone can extend.
 *
 * @returns {() => void} unbind
 */
export function bindKeyboard(input, shortcuts = {}) {
  const onKeyDown = (event) => {
    const action = BINDINGS[event.code];
    if (action) {
      input.set(action, true);
      event.preventDefault();
      return;
    }
    const shortcut = shortcuts[event.code];
    if (shortcut) shortcut(event);
  };

  const onKeyUp = (event) => {
    const action = BINDINGS[event.code];
    if (!action) return;
    input.set(action, false);
    event.preventDefault();
  };

  const onBlur = () => input.releaseAll();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}
