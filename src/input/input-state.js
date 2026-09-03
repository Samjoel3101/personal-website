/**
 * The one snapshot of intent the physics reads.
 *
 * Keyboard and touch both write into this, so the simulation never learns
 * which device the player is using and neither source has to know about the
 * other. Adding a gamepad means adding a writer, not touching the kart.
 */
export function createInputState() {
  const state = {
    accelerate: false,
    brake: false,
    left: false,
    right: false,
    drift: false,
  };

  return {
    state,
    set(action, value) {
      if (action in state) state[action] = value;
    },
    /** Release everything. Held keys otherwise stick when focus is lost or a
     *  modal opens, and the kart launches the moment it closes. */
    releaseAll() {
      for (const action of Object.keys(state)) state[action] = false;
    },
  };
}
