/* sprites.js — every bitmap in the game, drawn with canvas calls at load time.
   Nothing here loads a file.

   Art is authored in a fixed design space and rasterised through a context
   scale, so the same code produces a crisp sprite at whatever size the
   renderer needs. Billboards are authored well above their usual on-screen
   size, so filtering is nearly always a reduction rather than a blur. */

const Sprites = (function () {
  const cache = { karts: {}, kartH: 0 };
  const SS = 3;                 // supersample factor for scenery billboards

  /* Rounded rectangles are everywhere in this art; older engines lack the
     built-in, so fall back to a path rather than to sharp corners. */
  function rrect(g, x, y, w, h, r) {
    if (g.roundRect) { g.beginPath(); g.roundRect(x, y, w, h, r); return; }
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /* Author in `w` x `h`, rasterise at `scale` times that. */
  function make(w, h, scale, draw) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    const g = c.getContext('2d');
    g.scale(scale, scale);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    draw(g, w, h);
    return c;
  }

  /* ----------------------------------------------------------------- trees --
     Three silhouettes so a street is not a row of identical lollipops, each
     built from overlapping discs in four tones — shadowed underside up to a
     sunlit crown on the upper left, matching how the buildings are lit. */
  function tree(seed, kind) {
    const rng = makeRng(seed);
    return make(72, 108, SS, (g, w, h) => {
      const trunkW = kind === 2 ? 7 : 10;
      g.fillStyle = '#6b4a2a';
      rrect(g, w / 2 - trunkW / 2, h * 0.5, trunkW, h * 0.5, trunkW * 0.35);
      g.fill();
      g.fillStyle = '#8a6238';
      rrect(g, w / 2 - trunkW / 2, h * 0.5, trunkW * 0.42, h * 0.5, trunkW * 0.2);
      g.fill();

      const blob = (cx, cy, r, fill) => {
        g.fillStyle = fill;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      };

      if (kind === 2) {
        for (let i = 0; i < 6; i++) {
          const cy = h * 0.54 - i * h * 0.088;
          const r = 18 - i * 2.2;
          blob(w / 2, cy, r, '#2c7d38');
          blob(w / 2 - r * 0.2, cy - r * 0.2, r * 0.8, '#3fa845');
          blob(w / 2 - r * 0.36, cy - r * 0.36, r * 0.48, '#63cc5c');
        }
        return;
      }

      const spread = kind === 1 ? 1.15 : 0.95;
      const cx = w / 2, cy = h * 0.33;
      for (const [tone, scale, ox, oy] of [
        ['#237a30', 1.0, 0, 0],
        ['#33a03c', 0.87, -3, -4],
        ['#4fc44a', 0.62, -7, -9],
        ['#7ce069', 0.33, -10, -13]
      ]) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + rng() * 0.7;
          const rr = (14 + rng() * 5) * scale * spread;
          blob(cx + ox + Math.cos(a) * 11 * spread * scale,
               cy + oy + Math.sin(a) * 8 * scale, rr, tone);
        }
        blob(cx + ox, cy + oy, 18 * scale * spread, tone);
      }
    });
  }

  /* ----------------------------------------------------------------- lamp -- */
  const lamp = () => make(36, 144, SS, (g, w, h) => {
    const px = w / 2 - 2;
    g.fillStyle = '#3c414c';
    rrect(g, px - 5, h - 12, 14, 12, 3); g.fill();
    g.fillStyle = '#565c69';
    rrect(g, px, 16, 4.5, h - 18, 2); g.fill();
    g.fillStyle = '#727988';
    rrect(g, px + 0.3, 16, 1.6, h - 18, 1); g.fill();
    g.strokeStyle = '#565c69'; g.lineWidth = 3.6;
    g.beginPath();
    g.moveTo(px + 2, 20); g.quadraticCurveTo(px + 2, 12, px + 15, 12);
    g.stroke();
    g.fillStyle = '#454b57';
    rrect(g, px + 10, 12, 12, 5, 2.5); g.fill();
    const glow = g.createRadialGradient(px + 16, 20, 1, px + 16, 20, 17);
    glow.addColorStop(0, 'rgba(255,240,190,0.9)');
    glow.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = glow;
    g.beginPath(); g.arc(px + 16, 20, 17, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff4cc';
    rrect(g, px + 11, 16, 10, 4, 2); g.fill();
  });

  /* -------------------------------------------------------------- signpost -- */
  function sign(l) {
    return make(88, 112, SS, (g, w, h) => {
      g.fillStyle = '#4a505c';
      rrect(g, w / 2 - 4.5, 48, 9, h - 48, 3); g.fill();
      g.fillStyle = '#ffffff';
      rrect(g, 4, 4, w - 8, 52, 10); g.fill();
      g.fillStyle = l.color;
      rrect(g, 8, 8, w - 16, 44, 8); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)';
      rrect(g, 8, 8, w - 16, 18, 8); g.fill();
      g.font = '30px serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(l.icon, w / 2, 31);
    });
  }

  /* ------------------------------------------------------- floating label --
     A name plate hovering over each landmark. This is what turns the city from
     a maze into a map — you can read your next destination from two blocks out. */
  const LABEL_FONT = '600 26px "Fredoka", "Trebuchet MS", sans-serif';

  function label(l) {
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = LABEL_FONT;
    const text = l.title;
    const tw = Math.ceil(probe.measureText(text).width);
    const w = tw + 52, h = 62;
    return make(w, h, 2, (g) => {
      /* pill plate with a coloured underline and a little tail */
      g.fillStyle = 'rgba(16,22,36,0.86)';
      rrect(g, 0, 0, w, h - 14, (h - 14) / 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.14)';
      rrect(g, 6, 4, w - 12, 12, 6); g.fill();
      g.fillStyle = l.accent;
      rrect(g, 14, h - 20, w - 28, 5, 2.5); g.fill();
      g.beginPath();
      g.moveTo(w / 2 - 7, h - 15); g.lineTo(w / 2 + 7, h - 15);
      g.lineTo(w / 2, h - 3); g.closePath();
      g.fillStyle = l.accent; g.fill();

      g.font = LABEL_FONT;
      g.fillStyle = '#fff';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, (h - 14) / 2 + 1);
    });
  }

  /* ----------------------------------------------------------------- kart --
     Rear three-quarter view, the way a kart racer draws it: you see the back
     of your own kart and the whole world rotates around you. Authored at
     168x112 and rasterised at exactly the height the renderer asks for, so it
     is drawn 1:1 and never resampled. `lean` is -1, 0 or 1. */
  const KW = 168, KH = 112;

  function kart(lean, targetH) {
    return make(KW, KH, targetH / KH, (g) => {
      const cx = KW / 2 + lean * 9;
      const sq = 1 - Math.abs(lean) * 0.07;

      /* contact shadow, offset the way the sun throws everything else */
      const sh = g.createRadialGradient(KW / 2 - 6, KH - 10, 4, KW / 2 - 6, KH - 10, 64);
      sh.addColorStop(0, 'rgba(24,36,60,0.45)');
      sh.addColorStop(1, 'rgba(24,36,60,0)');
      g.fillStyle = sh;
      g.beginPath(); g.ellipse(KW / 2 - 6, KH - 10, 64, 14, 0, 0, Math.PI * 2); g.fill();

      /* rear tyres: rounded carcass, tread band, bright rim */
      for (const side of [-1, 1]) {
        const wx = cx + side * 50 * sq;
        g.fillStyle = '#22242c';
        rrect(g, wx - 16, KH - 48, 32, 40, 9); g.fill();
        g.fillStyle = '#33363f';
        rrect(g, wx - 16, KH - 48, 32, 8, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.07)';
        for (let i = 0; i < 4; i++) { rrect(g, wx - 15, KH - 40 + i * 8, 30, 2.6, 1.3); g.fill(); }
        g.fillStyle = '#c9d0dc';
        g.beginPath(); g.arc(wx, KH - 25, 9, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#8c95a6';
        g.beginPath(); g.arc(wx, KH - 24, 5.5, 0, Math.PI * 2); g.fill();
      }

      /* chassis: a rounded shell with a vertical gradient */
      const body = g.createLinearGradient(0, KH - 50, 0, KH - 8);
      body.addColorStop(0, '#ff8a6d');
      body.addColorStop(0.4, '#ef4a35');
      body.addColorStop(1, '#b52a1c');
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(cx - 50 * sq, KH - 40);
      g.quadraticCurveTo(cx - 52 * sq, KH - 50, cx - 40 * sq, KH - 50);
      g.lineTo(cx + 40 * sq, KH - 50);
      g.quadraticCurveTo(cx + 52 * sq, KH - 50, cx + 50 * sq, KH - 40);
      g.quadraticCurveTo(cx + 48 * sq, KH - 8, cx + 36 * sq, KH - 8);
      g.lineTo(cx - 36 * sq, KH - 8);
      g.quadraticCurveTo(cx - 48 * sq, KH - 8, cx - 50 * sq, KH - 40);
      g.closePath(); g.fill();

      /* sidepod decks and the cockpit opening between them */
      g.fillStyle = '#ff9c7e';
      rrect(g, cx - 47 * sq, KH - 52, 27 * sq, 8, 4); g.fill();
      rrect(g, cx + 20 * sq, KH - 52, 27 * sq, 8, 4); g.fill();
      g.fillStyle = '#7a2216';
      rrect(g, cx - 20 * sq, KH - 53, 40 * sq, 10, 5); g.fill();

      /* gloss highlight across the tail */
      g.fillStyle = 'rgba(255,255,255,0.3)';
      rrect(g, cx - 40 * sq, KH - 45, 80 * sq, 5, 2.5); g.fill();

      /* diffuser and exhaust tips */
      g.fillStyle = '#2c313c';
      rrect(g, cx - 40 * sq, KH - 17, 80 * sq, 9, 4); g.fill();
      g.fillStyle = '#b9c1cf';
      for (const o of [-16, 6]) { rrect(g, cx + o * sq, KH - 22, 11, 6, 3); g.fill(); }

      /* rear wing on two stays */
      g.fillStyle = '#2b3342';
      rrect(g, cx - 29 * sq, KH - 58, 9, 13, 3); g.fill();
      rrect(g, cx + 20 * sq, KH - 58, 9, 13, 3); g.fill();
      g.fillStyle = '#39445a';
      rrect(g, cx - 38 * sq, KH - 67, 76 * sq, 11, 5); g.fill();
      g.fillStyle = '#58688a';
      rrect(g, cx - 38 * sq, KH - 67, 76 * sq, 4, 2); g.fill();

      /* driver: shoulders, arms out to the wheel, roll hoop, helmet */
      const suit = g.createLinearGradient(0, KH - 86, 0, KH - 56);
      suit.addColorStop(0, '#5aa6ee');
      suit.addColorStop(1, '#2a6bb8');
      g.fillStyle = suit;
      g.beginPath();
      g.moveTo(cx - 21 * sq, KH - 54);
      g.quadraticCurveTo(cx - 18 * sq, KH - 84, cx, KH - 84);
      g.quadraticCurveTo(cx + 18 * sq, KH - 84, cx + 21 * sq, KH - 54);
      g.closePath(); g.fill();

      g.fillStyle = '#3479c4';
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + side * 15 * sq, KH - 78);
        g.quadraticCurveTo(cx + side * 30 * sq, KH - 74, cx + side * 26 * sq, KH - 61);
        g.lineTo(cx + side * 14 * sq, KH - 66);
        g.closePath(); g.fill();
      }

      g.fillStyle = '#39414f';
      rrect(g, cx - 14 * sq, KH - 82, 28 * sq, 7, 3.5); g.fill();

      /* Helmet, seen from behind: a dome meeting a flat rim, with a racing
         stripe up the back. A full circle with a dark band under it — the
         obvious shape — reads as a face, which is wrong from this angle. */
      const hx = cx + lean * 5, hr = 18 * sq;
      g.fillStyle = '#f0c49a';
      rrect(g, hx - 7 * sq, KH - 88, 14 * sq, 10, 4); g.fill();

      g.save();
      g.beginPath();
      g.arc(hx, KH - 90, hr, Math.PI, 0);
      g.lineTo(hx + hr, KH - 84);
      g.quadraticCurveTo(hx, KH - 77, hx - hr, KH - 84);
      g.closePath();
      g.clip();
      const box = [hx - hr - 2, KH - 114, hr * 2 + 4, 42];
      g.fillStyle = '#ffd23c'; g.fillRect(...box);
      g.fillStyle = '#ffffff'; g.fillRect(hx - 5 * sq, box[1], 10 * sq, box[3]);
      g.fillStyle = '#e8452f'; g.fillRect(hx - 1.8 * sq, box[1], 3.6 * sq, box[3]);
      g.fillStyle = 'rgba(96,64,0,0.3)';
      g.fillRect(hx - hr - 2, KH - 86, hr * 2 + 4, 12);
      const hl = g.createLinearGradient(hx - hr, KH - 110, hx + hr * 0.5, KH - 84);
      hl.addColorStop(0, 'rgba(255,255,255,0.55)');
      hl.addColorStop(0.62, 'rgba(255,255,255,0)');
      g.fillStyle = hl; g.fillRect(...box);
      g.restore();

      /* race number on the tail */
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(cx, KH - 31, 12 * sq, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c0301f';
      g.font = '600 19px "Fredoka", "Trebuchet MS", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('1', cx, KH - 30);

      /* brake lights */
      g.fillStyle = '#ff7a5e';
      for (const o of [-38, 26]) { rrect(g, cx + o * sq, KH - 33, 12, 7, 3); g.fill(); }
    });
  }

  /* Rebuild the kart at a new on-screen height. Called from the renderer's
     resize, so the sprite is always rasterised 1:1 with the canvas. */
  function setKartHeight(px) {
    const h = Math.max(24, Math.round(px));
    if (cache.kartH === h) return;
    cache.kartH = h;
    cache.karts = [kart(-1, h), kart(0, h), kart(1, h)];
    cache.flames = [0, 1, 2, 3].map((i) => flame(i, h));
  }

  /* exhaust flames, drawn behind the kart while boosting */
  const flame = (frame, targetH) => make(KW, KH, targetH / KH, (g) => {
    const rng = makeRng(frame * 97 + 5);
    for (let i = 0; i < 20; i++) {
      const r = 4 + rng() * 11;
      const x = KW / 2 + (rng() - 0.5) * 80;
      const y = KH - 14 + rng() * 16;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      const c = ['255,246,190', '255,186,70', '255,104,68'][(rng() * 3) | 0];
      grd.addColorStop(0, `rgba(${c},0.95)`);
      grd.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = grd;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  });

  /* ------------------------------------------------------------------ sky --
     One wide strip, scrolled horizontally by the camera heading. The layered
     skyline baked into the bottom does most of the work of selling distance. */
  function sky(w, h) {
    return make(w, h, 1, (g) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0f6ac4');
      grad.addColorStop(0.24, K.SKY_TOP);
      grad.addColorStop(0.6, K.SKY_MID);
      grad.addColorStop(0.87, '#aadcf6');
      grad.addColorStop(1, K.SKY_HAZE);
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);

      /* The sun, where the lighting model says it is. Nested glows so the
         falloff does not band. */
      const sx = w * (0.5 - Math.atan2(SUN.x, -SUN.z) / (Math.PI * 2));
      const sy = h * (1 - SUN.y * 0.78);
      for (const [r, a] of [[210, 0.13], [104, 0.2], [44, 0.5]]) {
        const gl = g.createRadialGradient(sx, sy, 0, sx, sy, r);
        gl.addColorStop(0, `rgba(255,250,220,${a})`);
        gl.addColorStop(1, 'rgba(255,250,220,0)');
        g.fillStyle = gl;
        g.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      g.fillStyle = 'rgba(255,255,246,0.98)';
      g.beginPath(); g.arc(sx, sy, 19, 0, Math.PI * 2); g.fill();

      /* Three cloud decks of fat, opaque, sunlit puffs. Higher decks are
         bigger and whiter; lower ones shrink and wash into the haze. */
      const rng = makeRng(4242);
      for (let deck = 0; deck < 3; deck++) {
        const yTop = h * (0.05 + deck * 0.16), yRange = h * 0.2;
        const scale = 1 - deck * 0.26;
        const alpha = 1 - deck * 0.22;
        for (let i = 0; i < 20 - deck * 4; i++) {
          const cx = rng() * w, cy = yTop + rng() * yRange;
          const puffs = 5 + ((rng() * 4) | 0);
          /* soft underside first, then the bright body on top of it */
          for (const [dy, tint] of [[6, `rgba(196,224,244,${alpha})`],
                                    [0, `rgba(255,255,255,${alpha})`]]) {
            for (let p = 0; p < puffs; p++) {
              const r = (16 + rng() * 26) * scale;
              const px = cx + (p - puffs / 2) * 20 * scale;
              const py = cy + dy * scale + Math.sin(p * 1.7) * 6 * scale;
              g.fillStyle = tint;
              g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
            }
          }
        }
      }

      /* Distant skyline in three haze layers, each closer, darker and taller
         than the last. Aerial perspective, done with alpha. */
      const rng2 = makeRng(909);
      const layers = [
        ['rgba(178,208,232,0.6)', 26, 0.34],
        ['rgba(146,183,215,0.72)', 40, 0.2],
        ['rgba(112,152,192,0.85)', 58, 0.06]
      ];
      for (const [fill, maxH, lift] of layers) {
        g.fillStyle = fill;
        let x = -30;
        while (x < w + 30) {
          const bw = 14 + rng2() * 40;
          const bh = 8 + rng2() * maxH;
          rrect(g, x, h - bh - h * lift, bw, bh + h * lift, 3);
          g.fill();
          x += bw + 2 + rng2() * 14;
        }
      }
      const hz = g.createLinearGradient(0, h * 0.72, 0, h);
      hz.addColorStop(0, 'rgba(194,226,245,0)');
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
    setKartHeight(120);
    cache.sky = sky(3000, 300);
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
