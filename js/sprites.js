/* sprites.js — every bitmap in the game, drawn with canvas calls at load time.
   Nothing here loads a file. Each function returns an offscreen canvas that the
   renderer blits as a billboard (or, for the kart and sky, straight to screen).

   Art is authored in a fixed design space and the context is scaled to the
   size actually needed, so a sprite is rasterised once at its final pixel size
   rather than being resampled every frame. */

const Sprites = (function () {
  const cache = { karts: {}, kartH: 0 };

  function make(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    const g = c.getContext('2d');
    draw(g, c.width, c.height);
    return c;
  }

  /* ----------------------------------------------------------------- trees --
     Three silhouettes so a street is not a row of identical lollipops. Each is
     built from overlapping discs in three tones — shadowed underside, body,
     and a sunlit cap on the upper left, matching the direction the buildings
     are lit from. */
  function tree(seed, kind) {
    const rng = makeRng(seed);
    return make(72, 108, (g, w, h) => {
      const trunkW = kind === 2 ? 6 : 9;
      /* trunk, with a lit edge down one side */
      g.fillStyle = '#3d2b1c';
      g.fillRect(w / 2 - trunkW / 2, h * 0.52, trunkW, h * 0.48);
      g.fillStyle = '#5a4029';
      g.fillRect(w / 2 - trunkW / 2, h * 0.52, trunkW * 0.4, h * 0.48);

      const blob = (cx, cy, r, fill) => {
        g.fillStyle = fill;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      };

      if (kind === 2) {
        /* narrow poplar: a stack of shrinking discs */
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          const cy = h * 0.56 - i * h * 0.085;
          const r = 17 - i * 2.1;
          blob(w / 2, cy, r, '#1f4d26');
          blob(w / 2 - r * 0.22, cy - r * 0.22, r * 0.78, '#2d6d34');
          blob(w / 2 - r * 0.36, cy - r * 0.36, r * 0.46, '#43933f');
          if (t > 0.9) break;
        }
        return;
      }

      const spread = kind === 1 ? 1.15 : 0.95;
      const cx = w / 2, cy = h * 0.34;
      /* shadowed mass first, then the body, then the sunlit crown */
      for (const [tone, scale, ox, oy] of [
        ['#1c4623', 1.0, 0, 0],
        ['#2b6b33', 0.86, -3, -4],
        ['#3f8f3d', 0.6, -7, -9],
        ['#5cb04d', 0.32, -10, -13]
      ]) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + rng() * 0.7;
          const rr = (13 + rng() * 5) * scale * spread;
          blob(cx + ox + Math.cos(a) * 11 * spread * scale,
               cy + oy + Math.sin(a) * 8 * scale, rr, tone);
        }
        blob(cx + ox, cy + oy, 17 * scale * spread, tone);
      }
    });
  }

  /* ----------------------------------------------------------------- lamp -- */
  const lamp = () => make(36, 144, (g, w, h) => {
    const px = w / 2 - 2;
    g.fillStyle = '#2f333b';                        // base plinth
    g.fillRect(px - 4, h - 10, 12, 10);
    g.fillStyle = '#454a54';                        // column
    g.fillRect(px, 16, 4, h - 16);
    g.fillStyle = '#5c626e';                        // lit edge of the column
    g.fillRect(px, 16, 1.4, h - 16);
    g.fillStyle = '#454a54';                        // arm out to the head
    g.fillRect(px, 14, 15, 3.5);
    /* housing and the glow it throws */
    g.fillStyle = '#3a3e47';
    g.fillRect(px + 11, 16, 10, 4);
    const glow = g.createRadialGradient(px + 16, 22, 1, px + 16, 22, 15);
    glow.addColorStop(0, 'rgba(255,236,176,0.85)');
    glow.addColorStop(1, 'rgba(255,236,176,0)');
    g.fillStyle = glow;
    g.beginPath(); g.arc(px + 16, 22, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffeeb4';
    g.fillRect(px + 12, 19, 8, 3);
  });

  /* -------------------------------------------------------------- signpost -- */
  function sign(l) {
    return make(88, 112, (g, w, h) => {
      g.fillStyle = '#33373f';
      g.fillRect(w / 2 - 4, 48, 8, h - 48);
      g.fillStyle = '#454a54';
      g.fillRect(w / 2 - 4, 48, 2.5, h - 48);
      /* board: dark plate, coloured field, bevel */
      g.fillStyle = '#1a1d24';
      g.fillRect(6, 6, w - 12, 48);
      g.fillStyle = l.color;
      g.fillRect(9, 9, w - 18, 42);
      g.strokeStyle = l.accent; g.lineWidth = 3;
      g.strokeRect(9, 9, w - 18, 42);
      g.fillStyle = 'rgba(255,255,255,0.13)';
      g.fillRect(9, 9, w - 18, 12);
      g.font = '28px serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(l.icon, w / 2, 31);
    });
  }

  /* ------------------------------------------------------- floating label --
     A name plate hovering over each landmark. This is what turns the city from
     a maze into a map — you can read your next destination from two blocks out. */
  function label(l) {
    const text = l.title.toUpperCase();
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = '14px "Press Start 2P", monospace';
    const tw = Math.ceil(probe.measureText(text).width);
    return make(tw + 36, 44, (g, w, h) => {
      g.fillStyle = 'rgba(10,12,20,0.88)';
      g.fillRect(0, 0, w, h - 9);
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(0, 0, w, 3);
      g.fillStyle = l.accent;
      g.fillRect(0, h - 12, w, 3);
      g.font = '14px "Press Start 2P", monospace';
      g.fillStyle = '#fff';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, (h - 9) / 2 + 1);
      g.fillStyle = l.accent;
      g.fillRect(w / 2 - 1.5, h - 9, 3, 9);
    });
  }

  /* ----------------------------------------------------------------- kart --
     Rear three-quarter view, the way Super Mario Kart drew it: you see the
     back of your own kart and the whole world rotates around you. Authored at
     168x112 and rasterised at whatever height the renderer asks for, so it is
     never resampled at draw time. `lean` is -1, 0 or 1. */
  const KW = 168, KH = 112;

  function kart(lean, targetH) {
    const s = targetH / KH;
    return make(KW * s, KH * s, (g) => {
      g.scale(s, s);
      const cx = KW / 2 + lean * 9;
      const sq = 1 - Math.abs(lean) * 0.07;

      /* contact shadow, offset the way the sun throws everything else */
      const sh = g.createRadialGradient(KW / 2 - 6, KH - 10, 4, KW / 2 - 6, KH - 10, 62);
      sh.addColorStop(0, 'rgba(12,18,32,0.5)');
      sh.addColorStop(1, 'rgba(12,18,32,0)');
      g.fillStyle = sh;
      g.beginPath(); g.ellipse(KW / 2 - 6, KH - 10, 62, 13, 0, 0, Math.PI * 2); g.fill();

      /* rear tyres: carcass, tread band, rim */
      for (const side of [-1, 1]) {
        const wx = cx + side * 50 * sq;
        g.fillStyle = '#0e0f13';
        g.fillRect(wx - 15, KH - 46, 30, 38);
        g.fillStyle = '#1b1d23';
        g.fillRect(wx - 15, KH - 46, 30, 5);
        g.fillStyle = '#26282f';                       // tread
        for (let i = 0; i < 4; i++) g.fillRect(wx - 15, KH - 40 + i * 8, 30, 2.5);
        g.fillStyle = '#6a707d';                       // rim
        g.fillRect(wx - 7, KH - 32, 14, 14);
        g.fillStyle = '#9aa2b0';
        g.fillRect(wx - 7, KH - 32, 14, 4);
      }

      /* chassis, with a vertical gradient standing in for a curved shell */
      const body = g.createLinearGradient(0, KH - 48, 0, KH - 10);
      body.addColorStop(0, '#f0604a');
      body.addColorStop(0.45, '#cf3b2c');
      body.addColorStop(1, '#8e2418');
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(cx - 48 * sq, KH - 46);
      g.lineTo(cx + 48 * sq, KH - 46);
      g.lineTo(cx + 40 * sq, KH - 10);
      g.lineTo(cx - 40 * sq, KH - 10);
      g.closePath(); g.fill();

      /* Sidepod decks either side of the cockpit, and the dark opening
         between them. Without these the kart is one flat red trapezoid;
         with them you can see you are sitting down inside something. */
      g.fillStyle = '#f2705a';
      g.fillRect(cx - 46 * sq, KH - 50, 27 * sq, 6);
      g.fillRect(cx + 19 * sq, KH - 50, 27 * sq, 6);
      g.fillStyle = '#5c1c12';
      g.fillRect(cx - 19 * sq, KH - 50, 38 * sq, 7);

      /* engine cover highlight and the dark diffuser under the tail */
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.fillRect(cx - 42 * sq, KH - 46, 84 * sq, 4);
      g.fillStyle = '#25272e';
      g.fillRect(cx - 40 * sq, KH - 16, 80 * sq, 7);
      g.fillStyle = '#4a4e58';                          // exhaust tips
      g.fillRect(cx - 16 * sq, KH - 21, 10, 5);
      g.fillRect(cx + 6 * sq, KH - 21, 10, 5);

      /* rear wing on two stays */
      g.fillStyle = '#242a36';
      g.fillRect(cx - 28 * sq, KH - 56, 8, 12);
      g.fillRect(cx + 20 * sq, KH - 56, 8, 12);
      g.fillStyle = '#2f3846';
      g.fillRect(cx - 36 * sq, KH - 64, 72 * sq, 9);
      g.fillStyle = '#465065';
      g.fillRect(cx - 36 * sq, KH - 64, 72 * sq, 3);

      /* driver: shoulders, then helmet leaning into the corner */
      const suit = g.createLinearGradient(0, KH - 84, 0, KH - 56);
      suit.addColorStop(0, '#3f86d4');
      suit.addColorStop(1, '#22568f');
      g.fillStyle = suit;
      g.beginPath();
      g.moveTo(cx - 20 * sq, KH - 56);
      g.lineTo(cx - 15 * sq, KH - 82);
      g.lineTo(cx + 15 * sq, KH - 82);
      g.lineTo(cx + 20 * sq, KH - 56);
      g.closePath(); g.fill();

      /* arms out to the wheel, and the roll hoop behind the head */
      g.fillStyle = '#2b5f9c';
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + side * 15 * sq, KH - 78);
        g.lineTo(cx + side * 27 * sq, KH - 72);
        g.lineTo(cx + side * 25 * sq, KH - 62);
        g.lineTo(cx + side * 14 * sq, KH - 66);
        g.closePath(); g.fill();
      }
      g.fillStyle = '#343a46';
      g.fillRect(cx - 13 * sq, KH - 80, 26 * sq, 6);

      const hx = cx + lean * 5;
      g.fillStyle = '#e8b98d';                          // neck
      g.fillRect(hx - 8 * sq, KH - 88, 16 * sq, 8);
      g.fillStyle = '#d9a400';                          // helmet shell
      g.beginPath(); g.arc(hx, KH - 88, 17 * sq, Math.PI, 0); g.fill();
      g.fillRect(hx - 17 * sq, KH - 88, 34 * sq, 5);
      const hl = g.createLinearGradient(hx - 17, KH - 105, hx + 17, KH - 88);
      hl.addColorStop(0, 'rgba(255,255,255,0.55)');
      hl.addColorStop(0.6, 'rgba(255,255,255,0)');
      g.fillStyle = hl;
      g.beginPath(); g.arc(hx, KH - 88, 17 * sq, Math.PI, 0); g.fill();
      g.fillStyle = '#2a2f3a';                          // visor band
      g.fillRect(hx - 17 * sq, KH - 92, 34 * sq, 4);

      /* race number on the tail */
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.beginPath(); g.arc(cx, KH - 30, 11 * sq, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8e2418';
      g.font = 'bold 15px sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('1', cx, KH - 29);

      /* brake lights */
      g.fillStyle = '#ff6a52';
      g.fillRect(cx - 36 * sq, KH - 30, 11, 6);
      g.fillRect(cx + 25 * sq, KH - 30, 11, 6);
      g.fillStyle = 'rgba(255,150,130,0.6)';
      g.fillRect(cx - 36 * sq, KH - 30, 11, 2);
      g.fillRect(cx + 25 * sq, KH - 30, 11, 2);
    });
  }

  /* Rebuild the kart at a new on-screen height. Called from the renderer's
     resize, so the sprite is always rasterised 1:1 with the buffer. */
  function setKartHeight(px) {
    const h = Math.max(24, Math.round(px));
    if (cache.kartH === h) return;
    cache.kartH = h;
    cache.karts = [kart(-1, h), kart(0, h), kart(1, h)];
    cache.flames = [0, 1, 2, 3].map((i) => flame(i, h));
  }

  /* exhaust flames, drawn behind the kart while boosting */
  const flame = (frame, targetH) => {
    const s = targetH / KH;
    return make(KW * s, KH * s, (g) => {
      g.scale(s, s);
      const rng = makeRng(frame * 97 + 5);
      for (let i = 0; i < 18; i++) {
        const r = 3 + rng() * 9;
        const x = KW / 2 + (rng() - 0.5) * 78;
        const y = KH - 14 + rng() * 16;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        const c = ['255,242,168', '255,176,60', '255,90,60'][(rng() * 3) | 0];
        grd.addColorStop(0, `rgba(${c},0.95)`);
        grd.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = grd;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    });
  };

  /* ------------------------------------------------------------------ sky --
     One wide strip, scrolled horizontally by the camera heading. Drawn with
     smoothing on at blit time, so it reads as atmosphere rather than as a
     band of dithered pixels. The layered skyline baked into the bottom does
     most of the work of selling distance. */
  function sky(w, h) {
    return make(w, h, (g) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1e3f80');
      grad.addColorStop(0.22, K.SKY_TOP);
      grad.addColorStop(0.58, K.SKY_MID);
      grad.addColorStop(0.86, '#9dbdda');
      grad.addColorStop(1, K.SKY_HAZE);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);

      /* The sun, sitting where the lighting model says it is. Three nested
         glows so the falloff does not band. */
      const sx = w * (0.5 - Math.atan2(SUN.x, -SUN.z) / (Math.PI * 2));
      const sy = h * (1 - SUN.y * 0.78);
      for (const [r, a] of [[190, 0.1], [96, 0.16], [40, 0.42]]) {
        const gl = g.createRadialGradient(sx, sy, 0, sx, sy, r);
        gl.addColorStop(0, `rgba(255,246,214,${a})`);
        gl.addColorStop(1, 'rgba(255,246,214,0)');
        g.fillStyle = gl;
        g.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      g.fillStyle = 'rgba(255,252,236,0.95)';
      g.beginPath(); g.arc(sx, sy, 17, 0, Math.PI * 2); g.fill();

      /* Three cloud decks. Higher decks are bigger, whiter and more opaque;
         lower ones shrink and wash out toward the haze at the horizon. */
      const rng = makeRng(4242);
      for (let deck = 0; deck < 3; deck++) {
        const yTop = h * (0.04 + deck * 0.17), yRange = h * 0.2;
        const scale = 1 - deck * 0.26;
        const alpha = 0.9 - deck * 0.26;
        for (let i = 0; i < 22 - deck * 4; i++) {
          const cx = rng() * w, cy = yTop + rng() * yRange;
          const puffs = 5 + ((rng() * 4) | 0);
          for (let p = 0; p < puffs; p++) {
            const r = (12 + rng() * 26) * scale;
            const px = cx + (p - puffs / 2) * 18 * scale + rng() * 8;
            const py = cy + (rng() - 0.5) * 12 * scale;
            const cg = g.createRadialGradient(px, py - r * 0.2, r * 0.15, px, py, r);
            cg.addColorStop(0, `rgba(255,255,255,${alpha})`);
            cg.addColorStop(0.55, `rgba(244,249,255,${alpha * 0.75})`);
            cg.addColorStop(1, 'rgba(226,238,250,0)');
            g.fillStyle = cg;
            g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
          }
        }
      }

      /* Distant skyline in three haze layers, each one closer, darker and
         taller than the last. Aerial perspective, done with alpha. */
      const rng2 = makeRng(909);
      const layers = [
        ['rgba(150,177,205,0.55)', 26, 0.34],
        ['rgba(118,148,183,0.7)', 40, 0.2],
        ['rgba(88,116,155,0.85)', 58, 0.06]
      ];
      for (const [fill, maxH, lift] of layers) {
        g.fillStyle = fill;
        let x = -30;
        while (x < w + 30) {
          const bw = 14 + rng2() * 40;
          const bh = 8 + rng2() * maxH;
          g.fillRect(x, h - bh - h * lift, bw, bh + h * lift);
          x += bw + 2 + rng2() * 14;
        }
      }
      /* haze wash so the skyline dissolves into the horizon line */
      const hz = g.createLinearGradient(0, h * 0.72, 0, h);
      hz.addColorStop(0, 'rgba(168,196,220,0)');
      hz.addColorStop(1, K.SKY_HAZE);
      g.fillStyle = hz;
      g.fillRect(0, h * 0.72, w, h * 0.28);
    });
  }

  /* ----------------------------------------------------------------- init -- */
  function init() {
    cache.trees = [tree(1, 0), tree(2, 1), tree(3, 2), tree(4, 0),
                   tree(5, 1), tree(6, 0), tree(7, 2), tree(8, 1)];
    cache.lamp = lamp();
    setKartHeight(90);
    cache.sky = sky(2600, 260);
    cache.signs = {}; cache.labels = {};
    for (const l of SITE.landmarks) {
      cache.signs[l.id] = sign(l);
      cache.labels[l.id] = label(l);
    }
  }

  return {
    init, setKartHeight,
    tree: (i) => cache.trees[i & 7],
    lamp: () => cache.lamp,
    sign: (id) => cache.signs[id],
    labelFor: (id) => cache.labels[id],
    kart: (lean) => cache.karts[lean + 1],
    flame: (i) => cache.flames[i & 3],
    sky: () => cache.sky
  };
})();
