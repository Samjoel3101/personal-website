/**
 * Owns the AudioContext and the master gain.
 *
 * Nothing starts until a real user gesture, because every browser blocks
 * autoplay — so the whole audio system is built lazily on the first call to
 * `start()`, which the intro screen's button provides.
 */
export function createMixer() {
  let context = null;
  let master = null;
  let enabled = true;

  return {
    /** Idempotent. Safe to call on every gesture. */
    start() {
      if (context) return context;
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContextClass) return null;

      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = enabled ? 0.5 : 0;
      master.connect(context.destination);
      return context;
    },

    get context() {
      return context;
    },

    get destination() {
      return master;
    },

    get enabled() {
      return enabled;
    },

    toggle() {
      enabled = !enabled;
      if (master) master.gain.setTargetAtTime(enabled ? 0.5 : 0, context.currentTime, 0.05);
      return enabled;
    },
  };
}
