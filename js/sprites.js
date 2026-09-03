/* sprites.js — every bitmap in the game, drawn with canvas calls at load time.
   Nothing here loads a file. Each function returns an offscreen canvas that the
   renderer blits as a billboard (or, for the kart and sky, straight to screen). */

const Sprites = (function () {
  const cache = {};

  function make(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    draw(g, w, h);
    return c;
  }

  /* ----------------------------------------------------------------- tree -- */
  function tree(seed) {
    const rng = makeRng(seed);
    return make(48, 72, (g, w, h) => {
      g.fillStyle = '#4a3524';
      g.fillRect(w / 2 - 4, h * 0.55, 8, h * 0.45);
      /* three overlapping blobs, darkest first, so it reads as lit from the left */
      const greens = ['#245c2c', '#2f7a38', '#43a04a'];
      for (let i = 0; i < 3; i++) {
        g.fillStyle = greens[i];
        const r = 20 - i * 4;
        const cx = w / 2 - i * 3 + (rng() - 0.5) * 4;
        const cy = h * 0.36 - i * 4;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      }
    });
  }

  /* ----------------------------------------------------------------- lamp -- */
  const lamp = () => make(24, 96, (g, w, h) => {
    g.fillStyle = '#4c4f57';
    g.fillRect(w / 2 - 2, 10, 4, h - 10);
    g.fillRect(w / 2 - 2, 8, 12, 4);
    g.fillStyle = '#ffe9a8';
    g.fillRect(w / 2 + 6, 10, 8, 6);
    g.globalAlpha = 0.35;
    g.beginPath(); g.arc(w / 2 + 10, 14, 9, 0, Math.PI * 2); g.fill();
  });

  /* -------------------------------------------------------------- signpost -- */
  function sign(l) {
    return make(64, 80, (g, w, h) => {
      g.fillStyle = '#3b3f46';
      g.fillRect(w / 2 - 3, 34, 6, h - 34);
      g.fillStyle = l.color;
      g.fillRect(6, 6, w - 12, 34);
      g.strokeStyle = l.accent; g.lineWidth = 3;
      g.strokeRect(6, 6, w - 12, 34);
      g.font = '22px serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(l.icon, w / 2, 24);
    });
  }

  /* ------------------------------------------------------- floating label --
     A name plate hovering over each landmark. This is what turns the city from
     a maze into a map — you can read your next destination from two blocks out. */
  function label(l) {
    const text = l.title.toUpperCase();
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = '10px "Press Start 2P", monospace';
    const tw = Math.ceil(probe.measureText(text).width);
    return make(tw + 26, 30, (g, w, h) => {
      g.fillStyle = 'rgba(12,14,22,0.85)';
      g.fillRect(0, 0, w, h - 6);
      g.fillStyle = l.accent;
      g.fillRect(0, h - 8, w, 2);
      g.font = '10px "Press Start 2P", monospace';
      g.fillStyle = '#fff';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, (h - 6) / 2 + 1);
      /* stem down toward the building */
      g.fillStyle = l.accent;
      g.fillRect(w / 2 - 1, h - 6, 2, 6);
    });
  }

  /* ----------------------------------------------------------------- kart --
     Rear three-quarter view, the way Super Mario Kart drew it: the player sees
     the back of their own kart, and the whole world rotates around them.
     `lean` is -1 (hard left), 0 (straight) or 1 (hard right). */
  function kart(lean) {
    return make(120, 84, (g, w, h) => {
      const cx = w / 2 + lean * 7;
      const squash = 1 - Math.abs(lean) * 0.08;

      /* shadow */
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.ellipse(w / 2, h - 8, 44, 8, 0, 0, Math.PI * 2); g.fill();

      /* rear wheels */
      g.fillStyle = '#17181c';
      for (const s of [-1, 1]) {
        const wx = cx + s * 36 * squash;
        g.fillRect(wx - 11, h - 34, 22, 28);
        g.fillStyle = '#3a3d45';
        g.fillRect(wx - 6, h - 26, 12, 12);
        g.fillStyle = '#17181c';
      }

      /* chassis */
      g.fillStyle = '#c0392b';
      g.beginPath();
      g.moveTo(cx - 34 * squash, h - 34);
      g.lineTo(cx + 34 * squash, h - 34);
      g.lineTo(cx + 28 * squash, h - 8);
      g.lineTo(cx - 28 * squash, h - 8);
      g.closePath(); g.fill();
      g.fillStyle = '#e74c3c';
      g.fillRect(cx - 30 * squash, h - 34, 60 * squash, 6);

      /* rear spoiler */
      g.fillStyle = '#2c3e50';
      g.fillRect(cx - 24 * squash, h - 46, 48 * squash, 7);
      g.fillRect(cx - 20 * squash, h - 40, 5, 8);
      g.fillRect(cx + 15 * squash, h - 40, 5, 8);

      /* driver: back, then helmet, tilting into the corner */
      g.fillStyle = '#2e6fb7';
      g.fillRect(cx - 12 * squash, h - 58, 24 * squash, 18);
      g.fillStyle = '#f2c9a0';
      g.fillRect(cx - 7 * squash + lean * 3, h - 64, 14 * squash, 8);
      g.fillStyle = '#f1c40f';
      g.beginPath();
      g.arc(cx + lean * 4, h - 64, 10 * squash, Math.PI, 0);
      g.fill();
      g.fillStyle = '#e0b30c';
      g.fillRect(cx - 10 * squash + lean * 4, h - 65, 20 * squash, 3);

      /* brake lights */
      g.fillStyle = '#ff5d4a';
      g.fillRect(cx - 26 * squash, h - 24, 8, 5);
      g.fillRect(cx + 18 * squash, h - 24, 8, 5);
    });
  }

  /* exhaust flames, drawn behind the kart while boosting */
  const flame = (frame) => make(120, 84, (g, w, h) => {
    const rng = makeRng(frame * 97 + 5);
    for (let i = 0; i < 14; i++) {
      const s = 4 + rng() * 9;
      const x = w / 2 + (rng() - 0.5) * 56;
      const y = h - 8 + rng() * 12;
      g.fillStyle = ['#fff2a8', '#ffb03c', '#ff5a3c'][(rng() * 3) | 0];
      g.fillRect(x - s / 2, y - s / 2, s, s);
    }
  });

  /* ------------------------------------------------------------------ sky --
     One wide strip, scrolled horizontally by the camera heading. The distant
     skyline baked into it does most of the work of selling the horizon. */
  function sky(w, h) {
    return make(w, h, (g) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, K.SKY_TOP);
      grad.addColorStop(0.62, K.SKY_MID);
      grad.addColorStop(1, K.SKY_HAZE);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);

      /* sun with a soft halo */
      const sx = w * 0.22, sy = h * 0.3;
      g.globalAlpha = 0.18; g.fillStyle = '#fff6d0';
      g.beginPath(); g.arc(sx, sy, 52, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1; g.fillStyle = '#fff8dd';
      g.beginPath(); g.arc(sx, sy, 20, 0, Math.PI * 2); g.fill();

      /* chunky clouds */
      const rng = makeRng(4242);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 26; i++) {
        const cx = rng() * w, cy = 8 + rng() * (h * 0.5);
        for (let p = 0; p < 4; p++) {
          const r = 7 + rng() * 13;
          g.beginPath();
          g.arc(cx + p * 11 - 16, cy + (rng() - 0.5) * 6, r, 0, Math.PI * 2);
          g.fill();
        }
      }

      /* distant skyline silhouette sitting on the horizon line */
      const rng2 = makeRng(909);
      for (let pass = 0; pass < 2; pass++) {
        g.fillStyle = pass === 0 ? 'rgba(120,150,185,0.75)' : 'rgba(86,112,150,0.9)';
        let x = -20;
        while (x < w + 20) {
          const bw = 12 + rng2() * 34;
          const bh = (8 + rng2() * (pass === 0 ? 30 : 46)) * (1 - pass * 0.1);
          g.fillRect(x, h - bh, bw, bh);
          x += bw + 3 + rng2() * 10;
        }
      }
    });
  }

  /* ----------------------------------------------------------------- init -- */
  function init() {
    cache.trees = [tree(1), tree(2), tree(3), tree(4)];
    cache.lamp = lamp();
    cache.karts = [kart(-1), kart(0), kart(1)];
    cache.flames = [flame(0), flame(1), flame(2), flame(3)];
    /* Generated once at a generous size and stretched to whatever the current
       buffer needs; 360 degrees of sky spans four screen widths at a 90 degree
       field of view. */
    cache.sky = sky(2480, 200);
    cache.signs = {}; cache.labels = {};
    for (const l of SITE.landmarks) {
      cache.signs[l.id] = sign(l);
      cache.labels[l.id] = label(l);
    }
  }

  return {
    init,
    tree: (i) => cache.trees[i & 3],
    lamp: () => cache.lamp,
    sign: (id) => cache.signs[id],
    labelFor: (id) => cache.labels[id],
    kart: (lean) => cache.karts[lean + 1],
    flame: (i) => cache.flames[i & 3],
    sky: () => cache.sky
  };
})();
