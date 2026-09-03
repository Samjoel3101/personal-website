/* tilemap.js — builds the city.
   Two outputs, both generated at load time from a fixed seed so the city is
   byte-identical on every visit:
     1. a 2048x2048 colour texture, sampled per-pixel by the Mode 7 renderer
     2. a 2048x2048 surface-id map, sampled by the kart physics for grip
   The same drawing pass produces both — `mode` decides whether an operation is
   decorative (skipped for the id map) or structural. */

const City = (function () {
  const N = K.WORLD, GRID = N / K.BLOCK;      // 4 x 4 blocks
  const LOT = K.BLOCK / 2 - K.ROAD_HALF - K.WALK;  // 192: lot half-size

  const buildings = [];   // collidable boxes, also what the renderer draws
  const props = [];       // billboard decorations (trees, lamps, signs)
  const boosts = [];      // boost pad centres, for the HUD/minimap only

  let texture = null;     // Uint32Array, N*N
  let surface = null;      // Uint8Array,  N*N

  /* ---------------------------------------------------------------- noise --
     One small tile per material, turned into a repeating pattern. Far cheaper
     than per-pixel noise across four million pixels, and the 64px repeat is
     invisible once the ground is being sampled at Mode 7 scale. */
  function noiseTile(baseHex, amount, seed) {
    const S = 64, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S);
    const [br, bg, bb] = hexToRgb(baseHex), rng = makeRng(seed);
    for (let i = 0; i < S * S; i++) {
      const n = (rng() - 0.5) * 2 * amount;
      img.data[i * 4] = clamp(br + n, 0, 255);
      img.data[i * 4 + 1] = clamp(bg + n, 0, 255);
      img.data[i * 4 + 2] = clamp(bb + n, 0, 255);
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* Run a draw callback nine times, offset by one world in each direction, so
     shapes that straddle the wrap seam (every road at x=0 or z=0) come out
     whole. Generation-time only, so the brute force costs nothing. */
  function wrapDraw(ctx, fn) {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        ctx.save();
        ctx.translate(ox * N, oz * N);
        fn(ctx);
        ctx.restore();
      }
    }
  }

  const idStyle = (id) => `rgb(${id},0,0)`;

  /* ------------------------------------------------------------- layout --- */
  function isLandmarkBlock(bi, bj) {
    const cx = bi * K.BLOCK + K.BLOCK / 2, cz = bj * K.BLOCK + K.BLOCK / 2;
    return SITE.landmarks.find((l) => l.x === cx && l.z === cz) || null;
  }

  /* A landmark's silhouette, as a stack of boxes. Distinct shapes matter more
     than detail here — you navigate by recognising them from three blocks away. */
  function landmarkBoxes(l) {
    const { w, d, h, style } = l.structure;
    const hw = w / 2, hd = d / 2, out = [];
    const base = (o = {}) => Object.assign(
      { x: l.x, z: l.z, hw, hd, y0: 0, h, color: l.color, windows: true }, o);

    switch (style) {
      case 'tower':
        out.push(base({ h: h * 0.9 }));
        out.push(base({ hw: hw * 0.6, hd: hd * 0.6, y0: h * 0.9, h: h * 0.18, windows: false }));
        out.push(base({ hw: 6, hd: 6, y0: h * 1.08, h: 60, color: l.accent, windows: false }));
        break;
      case 'campus':
        out.push(base({ h: h * 0.7 }));
        out.push(base({ hw: hw * 0.34, hd: hd * 1.15, h: h * 1.05 }));
        out.push(base({ hw: hw * 0.2, hd: hd * 0.2, y0: h * 1.05, h: h * 0.3, color: l.accent, windows: false }));
        break;
      case 'workshop':
        out.push(base({ h: h * 0.8 }));
        out.push(base({ x: l.x - hw * 0.5, hw: hw * 0.45, hd: hd * 0.7, h: h * 1.25 }));
        out.push(base({ x: l.x + hw * 0.55, hw: 14, hd: 14, h: h * 1.9, windows: false }));
        break;
      case 'stadium':
        /* Four low stands around an open pitch, deliberately short of the
           corners so there is a diagonal gap wide enough to drive through. */
        out.push(base({ z: l.z - hd * 0.82, hw: hw * 0.55, hd: hd * 0.18, h, windows: false }));
        out.push(base({ z: l.z + hd * 0.82, hw: hw * 0.55, hd: hd * 0.18, h, windows: false }));
        out.push(base({ x: l.x - hw * 0.82, hw: hw * 0.18, hd: hd * 0.55, h, windows: false }));
        out.push(base({ x: l.x + hw * 0.82, hw: hw * 0.18, hd: hd * 0.55, h, windows: false }));
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          out.push(base({
            x: l.x + sx * hw * 0.8, z: l.z + sz * hd * 0.8,
            hw: 7, hd: 7, y0: h, h: 78, color: l.accent, windows: false
          }));
        }
        break;
      case 'cafe':
        out.push(base({ h: h * 0.85 }));
        out.push(base({ y0: h * 0.85, h: 12, hw: hw * 1.2, hd: hd * 1.2, color: l.accent, windows: false }));
        break;
      default: /* post */
        out.push(base());
        out.push(base({ y0: h, h: 14, hw: hw * 1.1, hd: hd * 1.1, color: l.accent, windows: false }));
    }
    return out;
  }

  /* Pastel city block colours. Kept light so the flat lighting model never
     pushes a facade toward grey. */
  const PALETTE = ['#ecdfc2', '#8fd4c8', '#f2a684', '#accbee', '#f4dc86',
                   '#d6acd9', '#a4d684', '#eeb4a4', '#c3ccd8', '#f0c9a0'];

  function buildLayout() {
    const rng = makeRng(20260903);

    for (let bi = 0; bi < GRID; bi++) {
      for (let bj = 0; bj < GRID; bj++) {
        const cx = bi * K.BLOCK + K.BLOCK / 2, cz = bj * K.BLOCK + K.BLOCK / 2;
        const lm = isLandmarkBlock(bi, bj);

        if (lm) {
          for (const b of landmarkBoxes(lm)) buildings.push(Object.assign(b, { landmark: lm.id }));
          /* Ring the plaza with trees and put a signpost by the kerb. */
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            props.push({
              x: cx + Math.cos(a) * (LOT - 26), z: cz + Math.sin(a) * (LOT - 26),
              type: 'tree', h: 46 + rng() * 14
            });
          }
          props.push({ x: cx, z: cz - LOT + 24, type: 'sign', h: 54, landmark: lm.id });
          continue;
        }

        /* Ordinary block: a 3x3 lattice of lots with alleys between them.
           A couple of lots are left empty as pocket parks so the city has
           somewhere to breathe (and somewhere to cut through). */
        const cells = 3, span = (LOT * 2) / cells, pad = 16;
        for (let i = 0; i < cells; i++) {
          for (let j = 0; j < cells; j++) {
            const lx = cx - LOT + span * (i + 0.5), lz = cz - LOT + span * (j + 0.5);
            if (rng() < 0.16) {
              for (let t = 0; t < 3; t++) {
                props.push({
                  x: lx + (rng() - 0.5) * span * 0.7, z: lz + (rng() - 0.5) * span * 0.7,
                  type: 'tree', h: 40 + rng() * 20
                });
              }
              continue;
            }
            const shrink = 0.7 + rng() * 0.3;
            buildings.push({
              x: lx, z: lz,
              hw: (span / 2 - pad) * shrink, hd: (span / 2 - pad) * shrink,
              y0: 0, h: 70 + rng() * 240,
              color: PALETTE[(rng() * PALETTE.length) | 0], windows: true
            });
          }
        }
      }
    }

    /* Street lamps down both kerbs of every road. */
    for (let g = 0; g < GRID; g++) {
      const line = g * K.BLOCK;
      for (let t = 0; t < N; t += 160) {
        for (const side of [-1, 1]) {
          const off = side * (K.ROAD_HALF + K.WALK * 0.5);
          props.push({ x: wrap(line + off), z: wrap(t + 40), type: 'lamp', h: 78 });
          props.push({ x: wrap(t + 120), z: wrap(line + off), type: 'lamp', h: 78 });
        }
      }
    }

    /* Parked cars down the kerbside. Two boxes each — body and cabin — so
       they read as vehicles rather than crates, and collidable like anything
       else, which is what makes the driving lane feel like a lane. Bays near
       intersections and boost pads are left empty. */
    const CARS = ['#ef5544', '#3d84d8', '#f2f0e8', '#5c6472', '#3fb87a',
                  '#f5c73c', '#a9b2c0', '#b062c0', '#ff9a4d', '#57d0d8'];
    const parkCar = (x, z, along, color) => {
      const hw = along === 'z' ? 8 : 20, hd = along === 'z' ? 20 : 8;
      buildings.push({ x, z, hw, hd, y0: 0, h: 11, color, windows: false, car: true });
      buildings.push({
        x, z, hw: hw * (along === 'z' ? 0.86 : 0.55), hd: hd * (along === 'z' ? 0.55 : 0.86),
        y0: 11, h: 7, color: '#2b3140', windows: false, car: true
      });
    };
    for (let g = 0; g < GRID; g++) {
      const line = g * K.BLOCK;
      for (let seg = 0; seg < GRID; seg++) {
        for (const off of [130, 380]) {
          const t = seg * K.BLOCK + off;
          for (const side of [-1, 1]) {
            const lane = side * 35;
            if (rng() > 0.5) {
              parkCar(wrap(line + lane), wrap(t), 'z', CARS[(rng() * CARS.length) | 0]);
            }
            if (rng() > 0.5) {
              parkCar(wrap(t), wrap(line + lane), 'x', CARS[(rng() * CARS.length) | 0]);
            }
          }
        }
      }
    }

    /* Boost pads, one on each approach to the middle of every road segment. */
    for (let g = 0; g < GRID; g++) {
      const line = g * K.BLOCK;
      for (let s = 0; s < GRID; s++) {
        const mid = s * K.BLOCK + K.BLOCK / 2;
        boosts.push({ x: line, z: mid, dir: 'v' });
        boosts.push({ x: mid, z: line, dir: 'h' });
      }
    }
  }

  /* ------------------------------------------------------------ painting --- */
  function paint(ctx, mode) {
    const deco = mode === 'color';
    const rng = makeRng(777);

    /* Bright, clean materials with only enough grain to stop them reading as
       flat swatches. A cartoon racer's world is saturated and legible, not
       weathered. */
    const pat = deco
      ? {
          grass: ctx.createPattern(noiseTile('#57b04a', 9, 11), 'repeat'),
          road: ctx.createPattern(noiseTile('#565b66', 6, 22), 'repeat'),
          walk: ctx.createPattern(noiseTile('#cdc8bc', 5, 33), 'repeat'),
          plaza: ctx.createPattern(noiseTile('#ded6c3', 5, 44), 'repeat'),
          dirt: ctx.createPattern(noiseTile('#9c9377', 7, 55), 'repeat')
        }
      : null;

    const fill = (kind, id) => (deco ? pat[kind] : idStyle(id));

    /* 1. everything is grass until proven otherwise */
    ctx.fillStyle = fill('grass', K.SURF.GRASS);
    ctx.fillRect(0, 0, N, N);

    /* 2. block interiors */
    for (let bi = 0; bi < GRID; bi++) {
      for (let bj = 0; bj < GRID; bj++) {
        const cx = bi * K.BLOCK + K.BLOCK / 2, cz = bj * K.BLOCK + K.BLOCK / 2;
        const lm = isLandmarkBlock(bi, bj);
        ctx.fillStyle = lm ? fill('plaza', K.SURF.PLAZA) : fill('dirt', K.SURF.GRASS);
        ctx.fillRect(cx - LOT, cz - LOT, LOT * 2, LOT * 2);

        if (lm && deco) {
          /* A coloured target ring so a landmark reads as a destination from
             far away, plus a paler inner disc for the trigger zone. */
          wrapDraw(ctx, (c) => {
            c.strokeStyle = lm.accent;
            c.globalAlpha = 0.9; c.lineWidth = 10;
            c.beginPath(); c.arc(cx, cz, K.DISCOVER_R, 0, Math.PI * 2); c.stroke();
            c.globalAlpha = 0.22; c.fillStyle = lm.accent;
            c.beginPath(); c.arc(cx, cz, K.DISCOVER_R - 6, 0, Math.PI * 2); c.fill();
            c.globalAlpha = 0.5; c.lineWidth = 3;
            c.beginPath(); c.arc(cx, cz, LOT - 12, 0, Math.PI * 2); c.stroke();
            c.globalAlpha = 1;
          });
        }
      }
    }

    /* 3. sidewalks: a band either side of every road */
    for (let g = 0; g < GRID; g++) {
      const line = g * K.BLOCK, o = K.ROAD_HALF + K.WALK;
      ctx.fillStyle = fill('walk', K.SURF.WALK);
      wrapDraw(ctx, (c) => {
        c.fillRect(line - o, 0, o * 2, N);
        c.fillRect(0, line - o, N, o * 2);
      });
    }

    /* 4. asphalt */
    for (let g = 0; g < GRID; g++) {
      const line = g * K.BLOCK;
      ctx.fillStyle = fill('road', K.SURF.ROAD);
      wrapDraw(ctx, (c) => {
        c.fillRect(line - K.ROAD_HALF, 0, K.ROAD_HALF * 2, N);
        c.fillRect(0, line - K.ROAD_HALF, N, K.ROAD_HALF * 2);
      });
    }

    /* 5. road surface detail and markings — decorative, so the id map skips
          all of it. Wear along the wheel paths, kerb lines, paving joints and
          the odd manhole are what stop a road being a flat grey ribbon. */
    if (deco) {
      for (let g = 0; g < GRID; g++) {
        const line = g * K.BLOCK;
        wrapDraw(ctx, (c) => {
          /* Seeded per road, not per wrap copy: wrapDraw runs this nine times
             and every copy has to come out identical or the seam shows. */
          const wear = makeRng(4100 + g);
          /* polished wheel tracks, two per lane */
          c.fillStyle = 'rgba(255,255,255,0.05)';
          for (const o of [-32, -14, 14, 32]) {
            c.fillRect(line + o - 5, 0, 10, N);
            c.fillRect(0, line + o - 5, N, 10);
          }
          /* darker grime down the crown and the gutters */
          c.fillStyle = 'rgba(0,0,0,0.07)';
          for (const o of [-K.ROAD_HALF + 4, K.ROAD_HALF - 4]) {
            c.fillRect(line + o - 3, 0, 6, N);
            c.fillRect(0, line + o - 3, N, 6);
          }
          /* kerb: a bright top edge against a dark shadow line */
          c.fillStyle = 'rgba(248,246,238,0.9)';
          for (const s of [-1, 1]) {
            c.fillRect(line + s * K.ROAD_HALF - 1, 0, 2.5, N);
            c.fillRect(0, line + s * K.ROAD_HALF - 1, N, 2.5);
          }
          c.fillStyle = 'rgba(0,0,0,0.18)';
          for (const s of [-1, 1]) {
            c.fillRect(line + s * (K.ROAD_HALF - 2) - 1, 0, 2, N);
            c.fillRect(0, line + s * (K.ROAD_HALF - 2) - 1, N, 2);
          }
          /* paving joints across the sidewalk */
          c.fillStyle = 'rgba(0,0,0,0.09)';
          for (let t = 0; t < N; t += 34) {
            for (const s of [-1, 1]) {
              c.fillRect(line + s * K.ROAD_HALF, t, s * K.WALK, 1.6);
              c.fillRect(t, line + s * K.ROAD_HALF, 1.6, s * K.WALK);
            }
          }
          /* lane lines */
          c.fillStyle = 'rgba(255,255,255,0.82)';
          for (const s of [-1, 1]) {
            c.fillRect(line + s * (K.ROAD_HALF - 7) - 1.5, 0, 3, N);
            c.fillRect(0, line + s * (K.ROAD_HALF - 7) - 1.5, N, 3);
          }
          c.fillStyle = 'rgba(255,214,74,0.95)';
          for (let t = 0; t < N; t += 46) {
            c.fillRect(line - 2, t, 4, 24);
            c.fillRect(t, line - 2, 24, 4);
          }
          /* manholes and patched repairs */
          for (let t = 24; t < N; t += 190) {
            c.fillStyle = 'rgba(0,0,0,0.20)';
            c.beginPath(); c.arc(line - 20, t, 7, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(t, line + 20, 7, 0, Math.PI * 2); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.06)';
            c.beginPath(); c.arc(line - 20, t - 1, 5.5, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.arc(t, line + 19, 5.5, 0, Math.PI * 2); c.fill();
          }
          c.fillStyle = 'rgba(0,0,0,0.055)';
          for (let i = 0; i < 26; i++) {
            const t = wear() * N, w = 12 + wear() * 40, l = 20 + wear() * 70;
            c.fillRect(line - K.ROAD_HALF + wear() * (K.ROAD_HALF * 2 - w), t, w, l);
            c.fillRect(t, line - K.ROAD_HALF + wear() * (K.ROAD_HALF * 2 - w), l, w);
          }
        });
      }
      /* crosswalk ladders on every intersection approach */
      for (let gi = 0; gi < GRID; gi++) {
        for (let gj = 0; gj < GRID; gj++) {
          const ax = gi * K.BLOCK, az = gj * K.BLOCK;
          wrapDraw(ctx, (c) => {
            c.fillStyle = 'rgba(255,255,255,0.85)';
            for (let i = -4; i <= 4; i++) {
              const o = i * 9;
              c.fillRect(ax + o - 3, az - K.ROAD_HALF - 2, 6, 14);
              c.fillRect(ax + o - 3, az + K.ROAD_HALF - 12, 6, 14);
              c.fillRect(ax - K.ROAD_HALF - 2, az + o - 3, 14, 6);
              c.fillRect(ax + K.ROAD_HALF - 12, az + o - 3, 14, 6);
            }
          });
        }
      }
    }

    /* 6. boost pads — structural, they change how the kart behaves */
    for (const b of boosts) {
      wrapDraw(ctx, (c) => {
        c.save();
        c.translate(b.x, b.z);
        if (b.dir === 'h') c.rotate(Math.PI / 2);
        const pw = K.ROAD_HALF - 12, ph = 26;   // half-extents
        if (deco) {
          c.fillStyle = '#2e3442';
          c.fillRect(-pw, -ph, pw * 2, ph * 2);
          for (let i = 0; i < 3; i++) {
            c.fillStyle = ['#ff6a3c', '#ffb03c', '#ffef7a'][i];
            c.beginPath();
            const y = -20 + i * 15;
            c.moveTo(-pw + 4, y + 9); c.lineTo(0, y); c.lineTo(pw - 4, y + 9);
            c.lineTo(pw - 4, y + 13); c.lineTo(0, y + 4); c.lineTo(-pw + 4, y + 13);
            c.closePath(); c.fill();
          }
        } else {
          c.fillStyle = idStyle(K.SURF.BOOST);
          c.fillRect(-pw, -ph, pw * 2, ph * 2);
        }
        c.restore();
      });
    }

    /* 7. ground weathering. Building shadows are no longer painted here —
          the renderer projects them from the real sun direction, so they move
          around the geometry properly instead of being a fixed dark offset. */
    if (deco) {
      /* Soft, broad tonal variation over the open ground so plazas and lots
         are not one flat swatch. Deliberately gentle — grime would fight the
         palette rather than sit under it. */
      for (let i = 0; i < 360; i++) {
        const s = 40 + rng() * 130;
        ctx.fillStyle = rng() < 0.5 ? 'rgba(150,140,100,0.045)' : 'rgba(220,235,245,0.05)';
        ctx.beginPath();
        ctx.ellipse(rng() * N, rng() * N, s, s * (0.5 + rng() * 0.6), rng() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /* ---------------------------------------------------------------- init --- */
  function init() {
    buildLayout();

    const cc = document.createElement('canvas');
    cc.width = cc.height = N;
    const cg = cc.getContext('2d', { willReadFrequently: true });
    paint(cg, 'color');
    texture = new Uint32Array(cg.getImageData(0, 0, N, N).data.buffer);

    const sc = document.createElement('canvas');
    sc.width = sc.height = N;
    const sg = sc.getContext('2d', { willReadFrequently: true });
    sg.imageSmoothingEnabled = false;
    paint(sg, 'id');
    const sdata = sg.getImageData(0, 0, N, N).data;
    surface = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) surface[i] = sdata[i * 4];

    /* Free the big scratch canvases; only the typed arrays are kept. */
    cc.width = cc.height = sc.width = sc.height = 1;
  }

  function surfaceAt(x, z) {
    const ix = wrap(x) | 0, iz = wrap(z) | 0;
    return surface[(iz & K.WORLD_MASK) * N + (ix & K.WORLD_MASK)];
  }

  return {
    init, surfaceAt, buildings, props, boosts,
    get texture() { return texture; }
  };
})();
