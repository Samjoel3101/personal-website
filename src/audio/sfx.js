import { noiseBuffer } from './engine.js';

/** One-shot sounds: discovery, impacts, boost. All synthesised. */
export function createSoundEffects(mixer) {
  function blip(frequency, when, duration, type, volume) {
    const context = mixer.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(mixer.destination);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  function arpeggio(notes, duration, type, volume) {
    if (!mixer.context) return;
    const now = mixer.context.currentTime;
    notes.forEach((note, index) => blip(note, now + index * 0.075, duration, type, volume));
  }

  function filteredBurst({ type, frequency, sweepTo, duration, volume }) {
    const context = mixer.context;
    if (!context) return;
    const now = context.currentTime;

    const source = context.createBufferSource();
    source.buffer = noiseBuffer(context, duration + 0.05);
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, now);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, now + duration * 0.7);
    if (type === 'bandpass') filter.Q.value = 1.4;

    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(mixer.destination);
    source.start(now);
    source.stop(now + duration + 0.05);
  }

  return {
    /** Rising arpeggio for a landmark seen for the first time. */
    discover: () => arpeggio([523.25, 659.25, 783.99, 1046.5], 0.3, 'triangle', 0.2),
    /** Softer chime for revisiting one, or for finishing the tour. */
    chime: () => arpeggio([783.99, 1046.5, 1318.5], 0.5, 'sine', 0.16),
    thud: () => filteredBurst({ type: 'lowpass', frequency: 320, duration: 0.18, volume: 0.3 }),
    whoosh: () =>
      filteredBurst({
        type: 'bandpass',
        frequency: 400,
        sweepTo: 3800,
        duration: 0.4,
        volume: 0.22,
      }),
  };
}
