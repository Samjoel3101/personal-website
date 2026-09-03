import { createEngineSound } from './engine.js';
import { createMixer } from './mixer.js';
import { createSoundEffects } from './sfx.js';

/**
 * The audio front door. Wires the simulation's events to one-shot sounds so no
 * other module has to know an AudioContext exists.
 */
export function createSound(emitter) {
  const mixer = createMixer();
  const engine = createEngineSound(mixer);
  const effects = createSoundEffects(mixer);

  emitter.on('kart:bump', () => effects.thud());
  emitter.on('kart:boost', () => effects.whoosh());
  emitter.on('landmark:discovered', () => effects.discover());
  emitter.on('landmark:revisited', () => effects.chime());
  emitter.on('tour:complete', () => effects.chime());

  return {
    start: () => mixer.start(),
    update: (kart) => engine.update(kart),
    toggle: () => mixer.toggle(),
    get enabled() {
      return mixer.enabled;
    },
  };
}
