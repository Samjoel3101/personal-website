/* mode7.js — the renderer.

   The ground is drawn the way the SNES did it: for every scanline below the
   horizon, work out how far away that line of the world is, then walk across
   the row sampling the city texture with a constant per-pixel step. That is
   all Mode 7 ever was — an affine texture map recomputed once per scanline.

   Verticals are not sprites. Buildings are real boxes, projected through the
   same focal length as the ground, so perspective agrees between them and the
   road. Small round things (trees, lamps, name plates) stay billboards, where
   facing the camera costs nothing.

   Everything renders into a 400x232 buffer that is then upscaled with
   smoothing off, which is where the chunky pixel look comes from. */

const R = (function () {
  let canvas, ctx, W, H, HZ, F;
  let groundImg, ground32;
  let wantWindows = false;
  const items = [];

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d', { alpha: false });
    resize(K.RW, K.RH);
  }

  /* The internal buffer tracks the viewport's shape instead of being fixed, so
     a wide monitor sees more city and a phone in portrait gets a taller strip
     of road rather than a letterboxed sliver. The focal length is always half
     the width, which pins the horizontal field of view at 90 degrees and lets
     the vertical field of view follow the buffer's shape. The horizon sits at
     a constant fraction of the height — above centre, so you see more road
     than sky, the way a chase camera should. */
  function resize(w, h) {
    W = Math.max(200, Math.round(w / 2) * 2);
    H = Math.max(180, Math.round(h / 2) * 2);
    HZ = Math.round(H * (K.HORIZON / K.RH));
    canvas.width = W; canvas.height = H;
    ctx.imageSmoothingEnabled = false;
    F = W / 2;
    groundImg = ctx.createImageData(W, H - HZ);
    ground32 = new Uint32Array(groundImg.data.buffer);
  }

  /* ---------------------------------------------------------------- ground -- */
  function drawGround(cam) {
    const tex = City.texture, N = K.WORLD, MASK = K.WORLD_MASK;
    const FR = K.FOG & 255, FG = (K.FOG >> 8) & 255, FB = (K.FOG >> 16) & 255;
    const rows = H - HZ;

    for (let row = 0; row < rows; row++) {
      const dy = row + 0.5;                    // distance below the horizon
      const z = (cam.h * F) / dy;              // world depth of this scanline
      const o = row * W;

      if (z > K.FAR) {                         // beyond the draw distance
        ground32.fill(K.FOG, o, o + W);
        continue;
      }

      /* One world-space step per screen pixel, constant along the row. */
      const step = z / F;
      const lat0 = -(W / 2) * step;
      let wx = cam.x + cam.sin * z + cam.cos * lat0;
      let wz = cam.z + cam.cos * z - cam.sin * lat0;
      const sx = cam.cos * step, sz = -cam.sin * step;

      const f = fogAt(z);
      if (f <= 0) {
        for (let x = 0; x < W; x++) {
          ground32[o + x] = tex[(wz & MASK) * N + (wx & MASK)];
          wx += sx; wz += sz;
        }
      } else {
        const fi = (f * 256) | 0, inv = 256 - fi;
        for (let x = 0; x < W; x++) {
          const c = tex[(wz & MASK) * N + (wx & MASK)];
          const r = (((c & 255) * inv + FR * fi) >> 8);
          const g = ((((c >> 8) & 255) * inv + FG * fi) >> 8);
          const b = ((((c >> 16) & 255) * inv + FB * fi) >> 8);
          ground32[o + x] = 0xff000000 | (b << 16) | (g << 8) | r;
          wx += sx; wz += sz;
        }
      }
    }
    ctx.putImageData(groundImg, 0, HZ);
  }

  /* ------------------------------------------------------------ projection -- */
  function project(cam, wx, wz, wy) {
    const dx = wrapDelta(wx - cam.x), dz = wrapDelta(wz - cam.z);
    const depth = dx * cam.sin + dz * cam.cos;
    const lat = dx * cam.cos - dz * cam.sin;
    const inv = F / depth;
    return { depth, x: W / 2 + lat * inv, y: HZ + (cam.h - wy) * inv };
  }

  function quad(a, b, c, d, style) {
    ctx.fillStyle = style;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath(); ctx.fill();
  }

  /* One wall of a box, from world edge (ax,az)-(bx,bz) between two heights. */
  function wall(cam, ax, az, bx, bz, y0, y1, hex, mul) {
    const p0 = project(cam, ax, az, y0), p1 = project(cam, bx, bz, y0);
    if (p0.depth < K.NEAR || p1.depth < K.NEAR) return;
    const p2 = project(cam, bx, bz, y1), p3 = project(cam, ax, az, y1);
    const depth = (p0.depth + p1.depth) / 2;
    const fog = fogAt(depth);
    quad(p0, p1, p2, p3, shadeFog(hex, mul, fog));
    /* A darker edge, so two faces of the same building do not merge into one
       flat silhouette. Skipped in the haze, where it would only add noise. */
    if (fog < 0.55) {
      ctx.strokeStyle = shadeFog(hex, mul * 0.6, fog);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    /* Windows, only where they will actually be legible. */
    if (!wantWindows || depth > 430) return;
    if (Math.abs(p3.y - p0.y) < 22 || Math.abs(p1.x - p0.x) < 10) return;

    const fw = Math.hypot(bx - ax, bz - az), fh = y1 - y0;
    const cols = clamp(Math.round(fw / 20), 1, 8);
    const rows = clamp(Math.round(fh / 24), 1, 12);
    const seed = ((ax * 7 + az * 13) | 0) >>> 0;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        /* Deterministic per-window lighting: same city, same lit windows. */
        const lit = (((seed + i * 131 + j * 977) * 2654435761) >>> 0) % 100 < 34;
        const u0 = (i + 0.26) / cols, u1 = (i + 0.74) / cols;
        const v0 = y0 + fh * ((j + 0.28) / rows), v1 = y0 + fh * ((j + 0.72) / rows);
        const x0 = ax + (bx - ax) * u0, z0 = az + (bz - az) * u0;
        const x1 = ax + (bx - ax) * u1, z1 = az + (bz - az) * u1;
        const w0 = project(cam, x0, z0, v0), w1 = project(cam, x1, z1, v0);
        if (w0.depth < K.NEAR) continue;
        quad(w0, w1, project(cam, x1, z1, v1), project(cam, x0, z0, v1),
          shadeFog(lit ? '#ffe6a2' : '#2b3346', 1, fog));
      }
    }
  }

  function drawBox(cam, b) {
    const y0 = b.y0, y1 = b.y0 + b.h;
    const x0 = b.x - b.hw, x1 = b.x + b.hw;
    const z0 = b.z - b.hd, z1 = b.z + b.hd;
    const rx = wrapDelta(cam.x - b.x), rz = wrapDelta(cam.z - b.z);
    wantWindows = !!b.windows;

    /* Only the faces turned toward the camera, back to front. */
    if (rz < -b.hd) wall(cam, x1, z0, x0, z0, y0, y1, b.color, 0.84);
    if (rz > b.hd) wall(cam, x0, z1, x1, z1, y0, y1, b.color, 0.98);
    if (rx < -b.hw) wall(cam, x0, z0, x0, z1, y0, y1, b.color, 0.68);
    if (rx > b.hw) wall(cam, x1, z1, x1, z0, y0, y1, b.color, 1.1);

    if (cam.h > y1) {
      wantWindows = false;
      const c = [
        project(cam, x0, z0, y1), project(cam, x1, z0, y1),
        project(cam, x1, z1, y1), project(cam, x0, z1, y1)
      ];
      if (c.every((p) => p.depth >= K.NEAR)) {
        quad(c[0], c[1], c[2], c[3], shadeFog(b.color, 1.3, fogAt(c[0].depth)));
      }
    }
  }

  /* Camera-facing sprite standing on the ground (or floating at `baseY`).
     `smooth` turns interpolation on for this one blit — the pixel look is
     right for scenery, but a name plate scaled down to twenty pixels needs
     filtering or the text turns to confetti. */
  function drawBillboard(cam, spr, wx, wz, worldH, baseY, smooth) {
    const p = project(cam, wx, wz, baseY || 0);
    if (p.depth < K.NEAR || p.depth > K.FAR) return;
    const inv = F / p.depth;
    const hpx = worldH * inv;
    const wpx = hpx * (spr.width / spr.height);
    if (hpx < 1.5) return;
    if (p.x + wpx < 0 || p.x - wpx > W) return;

    /* Anything you are almost touching would otherwise scale up to fill the
       screen and blot out the road. Fade it out over the last few metres. */
    const near = clamp((p.depth - 24) / 42, 0, 1);
    if (near <= 0) return;

    ctx.globalAlpha = (1 - fogAt(p.depth) * 0.85) * near;
    if (smooth) ctx.imageSmoothingEnabled = true;
    ctx.drawImage(spr, p.x - wpx / 2, p.y - hpx, wpx, hpx);
    if (smooth) ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ main -- */
  function render(cam, kart, t) {
    cam.sin = Math.sin(cam.a); cam.cos = Math.cos(cam.a);

    /* sky, panned by heading so it parallaxes correctly against the ground */
    const sky = Sprites.sky();
    /* 360 degrees of sky spans four screen widths at a 90 degree field of
       view, so the strip is stretched to match whatever width we are at. */
    const skyW = W * 4;
    let off = ((cam.a / (Math.PI * 2)) * skyW) % skyW;
    if (off < 0) off += skyW;
    ctx.drawImage(sky, -off, 0, skyW, HZ + 2);
    ctx.drawImage(sky, -off + skyW, 0, skyW, HZ + 2);

    drawGround(cam);

    /* Collect anything vertical that could be on screen, then paint it back to
       front. With ~90 boxes and ~600 props a flat scan is cheaper than any
       spatial index would be. */
    items.length = 0;

    for (const b of City.buildings) {
      const dx = wrapDelta(b.x - cam.x), dz = wrapDelta(b.z - cam.z);
      const depth = dx * cam.sin + dz * cam.cos;
      const span = Math.max(b.hw, b.hd) * 1.5;
      if (depth < K.NEAR - span || depth > K.FAR) continue;
      const lat = dx * cam.cos - dz * cam.sin;
      if (Math.abs(lat) > depth + span + 80) continue;
      items.push({ depth, box: b });
    }

    for (const p of City.props) {
      const dx = wrapDelta(p.x - cam.x), dz = wrapDelta(p.z - cam.z);
      const depth = dx * cam.sin + dz * cam.cos;
      if (depth < K.NEAR || depth > K.FAR) continue;
      const lat = dx * cam.cos - dz * cam.sin;
      if (Math.abs(lat) > depth + 60) continue;
      items.push({ depth, prop: p });
    }

    /* Landmark name plates, floating above their buildings. */
    for (const l of SITE.landmarks) {
      const dx = wrapDelta(l.x - cam.x), dz = wrapDelta(l.z - cam.z);
      const depth = dx * cam.sin + dz * cam.cos;
      if (depth < K.NEAR || depth > K.FAR) continue;
      items.push({ depth: depth - 1, label: l });
    }

    items.sort((a, b) => b.depth - a.depth);

    for (const it of items) {
      if (it.box) drawBox(cam, it.box);
      else if (it.label) {
        /* Just clear of the roofline. Any higher and a tall landmark's plate
           leaves the top of the screen exactly when you drive up to it. */
        const bob = Math.sin(t * 0.002 + it.label.x) * 5;
        drawBillboard(cam, Sprites.labelFor(it.label.id), it.label.x, it.label.z,
          34, it.label.structure.h + 18 + bob, true);
      } else {
        const p = it.prop;
        if (p.type === 'tree') {
          drawBillboard(cam, Sprites.tree((p.x + p.z) | 0), p.x, p.z, p.h, 0);
        } else if (p.type === 'lamp') {
          drawBillboard(cam, Sprites.lamp(), p.x, p.z, p.h, 0);
        } else {
          drawBillboard(cam, Sprites.sign(p.landmark), p.x, p.z, p.h, 0);
        }
      }
    }

    drawKart(kart, t);
  }

  function drawKart(kart, t) {
    const lean = kart.steer < -0.35 ? -1 : kart.steer > 0.35 ? 1 : 0;
    const spr = Sprites.kart(lean);
    /* Sized as a fraction of the buffer height rather than in sprite pixels,
       so it sits fully on screen at every resolution. */
    const kh = Math.round(H * 0.27);
    const kw = Math.round(kh * (spr.width / spr.height));
    const rough = kart.surface === K.SURF.GRASS ? 2.5 : kart.surface === K.SURF.WALK ? 1.2 : 0;
    const bob = Math.sin(t * 0.02) * (0.6 + rough) * (0.3 + kart.speed / K.MAX_SPEED);
    const x = Math.round(W / 2 - kw / 2 + Math.sin(t * 0.013) * rough);
    const y = Math.round(H - kh - 4 + bob);

    if (kart.boost > 0) {
      ctx.globalAlpha = clamp(kart.boost, 0, 1);
      ctx.drawImage(Sprites.flame(((t / 40) | 0) & 3), x, y + kh * 0.06, kw, kh);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(spr, x, y, kw, kh);
  }

  return { init, resize, render, get view() { return { W, H, HZ }; } };
})();
