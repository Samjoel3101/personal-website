import { KART } from '../config/tuning.js';
import { SURFACE } from '../config/world.js';

/**
 * The engine and tyre noise, synthesised.
 *
 * Two detuned sawtooths through a lowpass whose cutoff tracks speed is the
 * cheapest convincing engine a browser can make, and it needs no audio file,
 * no decode, and no bytes over the wire.
 */
export function createEngineSound(mixer) {
  let nodes = null;

  function build(context, destination) {
    const gain = context.createGain();
    gain.gain.value = 0;

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 400;
    lowpass.Q.value = 6;

    const oscA = context.createOscillator();
    const oscB = context.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'sawtooth';
    oscA.frequency.value = 60;
    oscB.frequency.value = 60;
    oscB.detune.value = 14;
    oscA.connect(lowpass);
    oscB.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(destination);
    oscA.start();
    oscB.start();

    const road = context.createBufferSource();
    road.buffer = noiseBuffer(context, 2);
    road.loop = true;
    const bandpass = context.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1200;
    bandpass.Q.value = 0.8;
    const roadGain = context.createGain();
    roadGain.gain.value = 0;
    road.connect(bandpass);
    bandpass.connect(roadGain);
    roadGain.connect(destination);
    road.start();

    return { oscA, oscB, lowpass, gain, bandpass, roadGain };
  }

  return {
    /** Call once per frame with the kart state. */
    update(kart) {
      const context = mixer.context;
      if (!context) return;
      if (!nodes) nodes = build(context, mixer.destination);

      const now = context.currentTime;
      const fraction = Math.abs(kart.speed) / KART.MAX_SPEED;
      const pitch = 52 + fraction * 165 + (kart.boost > 0 ? 40 : 0);

      nodes.oscA.frequency.setTargetAtTime(pitch, now, 0.06);
      nodes.oscB.frequency.setTargetAtTime(pitch * 1.01, now, 0.06);
      nodes.lowpass.frequency.setTargetAtTime(320 + fraction * 1500, now, 0.08);
      nodes.gain.gain.setTargetAtTime(0.06 + fraction * 0.2, now, 0.1);

      const roughness =
        kart.surface === SURFACE.GRASS ? 1 : kart.surface === SURFACE.WALK ? 0.5 : 0.08;
      nodes.bandpass.frequency.setTargetAtTime(600 + fraction * 2400, now, 0.1);
      nodes.roadGain.gain.setTargetAtTime(roughness * fraction * 0.28, now, 0.08);
    },
  };
}

export function noiseBuffer(context, seconds) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}
