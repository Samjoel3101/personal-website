/* audio.js — every sound is synthesised. No audio files, no library.

   The engine is two detuned sawtooths through a lowpass whose cutoff tracks
   speed, which is the cheapest convincing engine you can build in a browser.
   Everything else is a short envelope on an oscillator or a noise buffer.
   Nothing starts until the first real gesture, because autoplay policy. */

const Sound = (function () {
  let ac = null, master = null, engine = null, road = null;
  let enabled = true, started = false;

  function noiseBuffer(seconds) {
    const len = ac.sampleRate * seconds;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function start() {
    if (started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { enabled = false; return; }
    ac = new AC();
    started = true;

    master = ac.createGain();
    master.gain.value = enabled ? 0.5 : 0;
    master.connect(ac.destination);

    /* --- engine --- */
    const eg = ac.createGain(); eg.gain.value = 0;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 6;
    const o1 = ac.createOscillator(), o2 = ac.createOscillator();
    o1.type = o2.type = 'sawtooth';
    o1.frequency.value = 60; o2.frequency.value = 60;
    o2.detune.value = 14;
    o1.connect(lp); o2.connect(lp); lp.connect(eg); eg.connect(master);
    o1.start(); o2.start();
    engine = { o1, o2, lp, gain: eg };

    /* --- tyre / surface noise --- */
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(2); src.loop = true;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.8;
    const rg = ac.createGain(); rg.gain.value = 0;
    src.connect(bp); bp.connect(rg); rg.connect(master);
    src.start();
    road = { gain: rg, filter: bp };
  }

  /* Called every frame with the kart state. */
  function update(kart) {
    if (!started || !ac) return;
    const t = ac.currentTime;
    const frac = Math.abs(kart.speed) / K.MAX_SPEED;
    const f = 52 + frac * 165 + (kart.boost > 0 ? 40 : 0);
    engine.o1.frequency.setTargetAtTime(f, t, 0.06);
    engine.o2.frequency.setTargetAtTime(f * 1.01, t, 0.06);
    engine.lp.frequency.setTargetAtTime(320 + frac * 1500, t, 0.08);
    engine.gain.gain.setTargetAtTime(0.06 + frac * 0.2, t, 0.1);

    const rough = kart.surface === K.SURF.GRASS ? 1 : kart.surface === K.SURF.WALK ? 0.5 : 0.08;
    road.filter.frequency.setTargetAtTime(600 + frac * 2400, t, 0.1);
    road.gain.gain.setTargetAtTime(rough * frac * 0.28, t, 0.08);
  }

  function blip(freq, when, dur, type, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol || 0.22, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(master);
    o.start(when); o.stop(when + dur + 0.02);
  }

  /* Rising arpeggio on discovering a landmark. */
  function discover() {
    if (!started) return;
    const t = ac.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, t + i * 0.075, 0.3, 'triangle', 0.2));
  }

  function chime() {
    if (!started) return;
    const t = ac.currentTime;
    [783.99, 1046.5, 1318.5].forEach((f, i) => blip(f, t + i * 0.05, 0.5, 'sine', 0.16));
  }

  /* Filtered noise burst for a wall hit. */
  function thud() {
    if (!started) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(0.2);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 320;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(t); src.stop(t + 0.2);
  }

  /* Upward whoosh for a boost pad. */
  function whoosh() {
    if (!started) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(0.5);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(400, t);
    bp.frequency.exponentialRampToValueAtTime(3800, t + 0.35);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t); src.stop(t + 0.45);
    blip(880, t, 0.25, 'square', 0.08);
  }

  function toggle() {
    enabled = !enabled;
    if (master) master.gain.setTargetAtTime(enabled ? 0.5 : 0, ac.currentTime, 0.05);
    return enabled;
  }

  return {
    start, update, discover, chime, thud, whoosh, toggle,
    get enabled() { return enabled; }
  };
})();
