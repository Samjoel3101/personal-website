/**
 * The smallest event bus that does the job.
 *
 * It exists so the simulation can announce things — a landmark reached, a wall
 * hit, a boost pad crossed — without knowing that a HUD, a sound engine or a
 * renderer are listening. That one-way dependency is what keeps the world
 * model testable in Node with no DOM.
 */
export function createEmitter() {
  /** @type {Map<string, Set<Function>>} */
  const listeners = new Map();

  return {
    /** Subscribe. Returns an unsubscribe function. */
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => this.off(event, handler);
    },

    off(event, handler) {
      listeners.get(event)?.delete(handler);
    },

    emit(event, payload) {
      const handlers = listeners.get(event);
      if (!handlers) return;
      // Copied first: a handler is allowed to unsubscribe itself.
      for (const handler of [...handlers]) handler(payload);
    },

    clear() {
      listeners.clear();
    },
  };
}
