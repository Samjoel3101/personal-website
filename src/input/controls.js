import { clamp } from '../core/math.js';

/**
 * Keyboard, mouse and touch, all writing one snapshot.
 *
 * The camera never asks what device it is being flown with: it reads
 * `forward`, `strafe`, a look delta and a paused flag, and those four things
 * are all any of the three inputs produce. Adding a gamepad would mean adding
 * a writer here and changing nothing else.
 *
 * The look delta is consumed rather than read: `snapshot()` returns the
 * movement accumulated since the last call and resets it. A pointer produces
 * deltas, not a position, and integrating one twice is a camera that spins.
 */
const KEY_ACTIONS = {
  ArrowUp: 'forward',
  KeyW: 'forward',
  ArrowDown: 'back',
  KeyS: 'back',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyQ: 'lookLeft',
  KeyE: 'lookRight',
};

/** Radians per second held on a look key, and per pixel of pointer drag. */
const KEY_LOOK_RATE = 0.9;
const DRAG_RATE = 0.0022;

export function createControls(canvas) {
  const held = new Set();
  const look = { x: 0, y: 0 };
  let paused = false;
  let dragging = false;
  let last = null;

  const onKeyDown = (event) => {
    if (event.code === 'Space') {
      paused = !paused;
      event.preventDefault();
      return;
    }
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    held.add(action);
    event.preventDefault();
  };
  const onKeyUp = (event) => held.delete(KEY_ACTIONS[event.code]);

  const onPointerDown = (event) => {
    dragging = true;
    last = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!dragging || !last) return;
    look.x -= (event.clientX - last.x) * DRAG_RATE;
    look.y += (event.clientY - last.y) * DRAG_RATE;
    last = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = () => {
    dragging = false;
    last = null;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  return {
    /** The state since the previous call. Safe to call once per frame. */
    snapshot(dt) {
      const keyLook = (held.has('lookLeft') ? 1 : 0) - (held.has('lookRight') ? 1 : 0);
      const snapshot = {
        forward: (held.has('forward') ? 1 : 0) - (held.has('back') ? 1 : 0),
        strafe: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
        look: {
          x: clamp(look.x + keyLook * KEY_LOOK_RATE * dt, -0.4, 0.4),
          y: clamp(look.y, -0.4, 0.4),
        },
        paused,
      };
      look.x = 0;
      look.y = 0;
      return snapshot;
    },

    /** Used by the interface for its play/pause affordance. */
    togglePaused() {
      paused = !paused;
      return paused;
    },
    get paused() {
      return paused;
    },

    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
