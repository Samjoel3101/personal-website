/* mode7.js — the renderer.

   The ground is drawn the way the SNES did it: for every scanline below the
   horizon, work out how far away that line of the world is, then walk across
   the row sampling the city texture with a constant per-pixel step. That is
   all Mode 7 ever was — an affine texture map recomputed once per scanline.

   Everything vertical is real geometry rather than sprites. Buildings are
   boxes projected through the same focal length as the ground, so perspective
   agrees between them and the road; they are shaded from a fixed sun and cast
   ground shadows computed from that same sun direction. Only things that are
   roughly radially symmetric — trees, lamps, name plates — stay billboards,
   where facing the camera costs nothing.

   It all renders into a small buffer that is upscaled with smoothing off. */

const R = (function () {
  let canvas, ctx, W, H, HZ, F;
  let groundImg, ground32;
  let detail = null;          // fine grain layered over the ground up close
  let wantWindows = false;
  const items = [];
  const casters = [];

  /* Which rectangle corner is furthest from the sun decides where the swept
     shadow hexagon starts. The sun never moves, so this is resolved once. */
  let shadowStart = 0;

  const DETAIL_N = 128, DETAIL_MASK = 127;

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d', { alpha: false });

    /* Fine luminance grain, tiled in world space at a few times the density
       of the city texture. Up close a 1-texel-per-unit texture magnifies into
       flat blocks; this breaks them up into something that reads as asphalt
       aggregate rather than as a low-resolution image. */
    detail = new Int8Array(DETAIL_N * DETAIL_N);
    const rng = makeRng(31337);
    for (let i = 0; i < detail.length; i++) detail[i] = (rng() - 0.5) * 26;

    /* Corner whose dot product with the shadow offset is smallest, over the
       corner order (x0,z0) (x1,z0) (x1,z1) (x0,z1). */
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    let best = Infinity;
    corners.forEach((c, k) => {
      const d = c[0] * K.SHADOW.x + c[1] * K.SHADOW.z;
      if (d < best) { best = d; shadowStart = k; }
    });

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
    /* Re-rasterise the kart at the size it will actually be drawn, so it is
       never resampled and never softens. */
    Sprites.setKartHeight(H * 0.27);
  }

  /* ---------------------------------------------------------------- ground -- */
  const DETAIL_FADE = 340;   // grain is gone by this depth

  function drawGround(cam) {
    const tex = City.texture, N = K.WORLD, MASK = K.WORLD_MASK;
    const FR = FOG_RGB[0], FG = FOG_RGB[1], FB = FOG_RGB[2];
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

      /* Grain runs on its own accumulators at a higher spatial frequency. */
      const gAmt = z < DETAIL_FADE ? 1 - z / DETAIL_FADE : 0;
      let gx = wx * 3, gz = wz * 3;
      const gsx = sx * 3, gsz = sz * 3;

      const f = fogAt(z);
      const fi = (f * 256) | 0, inv = 256 - fi;

      for (let x = 0; x < W; x++) {
        const c = tex[(wz & MASK) * N + (wx & MASK)];
        let r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255;

        if (gAmt > 0) {
          const n = detail[((gz & DETAIL_MASK) << 7) | (gx & DETAIL_MASK)] * gAmt;
          r += n; g += n; b += n;
          if (r < 0) r = 0; else if (r > 255) r = 255;
          if (g < 0) g = 0; else if (g > 255) g = 255;
          if (b < 0) b = 0; else if (b > 255) b = 255;
          gx += gsx; gz += gsz;
        }

        if (fi > 0) {
          r = (r * inv + FR * fi) >> 8;
          g = (g * inv + FG * fi) >> 8;
          b = (b * inv + FB * fi) >> 8;
        }

        ground32[o + x] = 0xff000000 | (b << 16) | (g << 8) | r;
        wx += sx; wz += sz;
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

  /* --------------------------------------------------------------- shadows --
     A box's shadow is its footprint swept along the sun direction: the convex
     hull of the base rectangle and that rectangle shifted by the roof height.
     For a rectangle swept by a translation the hull is always a hexagon, and
     which corner it starts at depends only on the sign of the sweep — so
     there is no hull algorithm here, just six points in a fixed order.

     Every shadow goes into one path and is filled once, so overlapping
     shadows merge instead of stacking into darker patches. */
  function addShadow(path, cam, b) {
    const dy = b.y0 + b.h;
    const dx = dy * K.SHADOW.x, dz = dy * K.SHADOW.z;
    const x0 = b.x - b.hw, x1 = b.x + b.hw;
    const z0 = b.z - b.hd, z1 = b.z + b.hd;
    const cx = [x0, x1, x1, x0], cz = [z0, z0, z1, z1];

    /* base[i-1], base[i], base[i+1], then the shifted copy of the far three */
    const pts = [];
    for (let k = 0; k < 3; k++) {
      const i = (shadowStart + 3 + k) % 4;
      pts.push(project(cam, cx[i], cz[i], 0));
    }
    for (let k = 0; k < 3; k++) {
      const i = (shadowStart + 1 + k) % 4;
      pts.push(project(cam, cx[i] + dx, cz[i] + dz, 0));
    }
    for (const p of pts) if (p.depth < K.NEAR) return;

    path.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < 6; k++) path.lineTo(pts[k].x, pts[k].y);
    path.closePath();
  }

  function addPropShadow(path, cam, p) {
    /* Trees get a simple offset ellipse. Anything more would be invisible. */
    const g = project(cam, p.x + p.h * K.SHADOW.x * 0.5, p.z + p.h * K.SHADOW.z * 0.5, 0);
    if (g.depth < K.NEAR || g.depth > 700) return;
    const rx = (p.h * 0.30) * (F / g.depth);
    if (rx < 1) return;
    path.moveTo(g.x + rx, g.y);
    path.ellipse(g.x, g.y, rx, rx * 0.38, 0, 0, Math.PI * 2);
  }

  /* ----------------------------------------------------------------- walls -- */
  const PARAPET = 5;   // world units of coping along the top of a facade

  /* One wall of a box, from world edge (ax,az)-(bx,bz) between two heights. */
  function wall(cam, ax, az, bx, bz, y0, y1, hex, mul) {
    const p0 = project(cam, ax, az, y0), p1 = project(cam, bx, bz, y0);
    if (p0.depth < K.NEAR || p1.depth < K.NEAR) return;
    const p2 = project(cam, bx, bz, y1), p3 = project(cam, ax, az, y1);
    const depth = (p0.depth + p1.depth) / 2;
    const fog = fogAt(depth);

    /* A vertical gradient down the face: darker where the wall meets the
       ground (ambient occlusion) and slightly cooler at the top where it
       sees more sky. Flat fill once it is far enough away for the gradient
       to be a single pixel of difference. */
    if (depth < 520) {
      const g = ctx.createLinearGradient(
        (p0.x + p1.x) / 2, (p0.y + p1.y) / 2,
        (p2.x + p3.x) / 2, (p2.y + p3.y) / 2);
      g.addColorStop(0, shadeFog(hex, mul * 0.68, fog));
      g.addColorStop(0.28, shadeFog(hex, mul * 0.94, fog));
      g.addColorStop(1, shadeFog(hex, mul * 1.1, fog));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = shadeFog(hex, mul, fog);
    }
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();

    /* A darker edge, so two faces of the same building do not merge into one
       flat silhouette. Skipped in the haze, where it would only add noise. */
    if (fog < 0.55) {
      ctx.strokeStyle = shadeFog(hex, mul * 0.55, fog);
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (!wantWindows) return;

    /* Coping along the roofline. Cheap, and it stops every building from
       ending in a bare cut against the sky. */
    if (depth < 700 && y1 - y0 > 40) {
      const c0 = project(cam, ax, az, y1 - PARAPET), c1 = project(cam, bx, bz, y1 - PARAPET);
      quad(c0, c1, p2, p3, shadeFog(hex, mul * 1.28, fog));
    }

    if (depth > 460) return;
    if (Math.abs(p3.y - p0.y) < 26 || Math.abs(p1.x - p0.x) < 12) return;

    drawWindows(cam, ax, az, bx, bz, y0, y1, depth, fog, mul, hex);
  }

  /* Glass. Near enough to matter, each window is a recessed frame, a pane,
     and — on unlit panes — a bright wedge across the top where the sky is
     reflected. Further out it collapses to a single pane, because at eight
     pixels tall the frame is the same colour as the wall anyway. */
  function drawWindows(cam, ax, az, bx, bz, y0, y1, depth, fog, mul, hex) {
    const fw = Math.hypot(bx - ax, bz - az), fh = y1 - y0 - PARAPET;
    const cols = clamp(Math.round(fw / 21), 1, 7);
    const rows = clamp(Math.round(fh / 26), 1, 11);
    const seed = ((ax * 7 + az * 13) | 0) >>> 0;
    const detailed = depth < 190;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        /* Deterministic per-window lighting: same city, same lit windows. */
        const hash = (((seed + i * 131 + j * 977) * 2654435761) >>> 0);
        const lit = hash % 100 < 32;

        const u0 = (i + 0.22) / cols, u1 = (i + 0.78) / cols;
        const v0 = y0 + fh * ((j + 0.24) / rows), v1 = y0 + fh * ((j + 0.76) / rows);
        const x0 = ax + (bx - ax) * u0, z0 = az + (bz - az) * u0;
        const x1 = ax + (bx - ax) * u1, z1 = az + (bz - az) * u1;

        const a0 = project(cam, x0, z0, v0);
        if (a0.depth < K.NEAR) continue;
        const a1 = project(cam, x1, z1, v0);
        const a2 = project(cam, x1, z1, v1);
        const a3 = project(cam, x0, z0, v1);

        if (detailed) {
          /* The reveal is the wall's own colour in shadow, not a black
             outline — a window is a recess in the facade, not a sticker. */
          quad(a0, a1, a2, a3, shadeFog(hex, mul * 0.42, fog));
          const iu0 = (i + 0.27) / cols, iu1 = (i + 0.73) / cols;
          const iv0 = y0 + fh * ((j + 0.29) / rows), iv1 = y0 + fh * ((j + 0.71) / rows);
          const ix0 = ax + (bx - ax) * iu0, iz0 = az + (bz - az) * iu0;
          const ix1 = ax + (bx - ax) * iu1, iz1 = az + (bz - az) * iu1;
          const b0 = project(cam, ix0, iz0, iv0), b1 = project(cam, ix1, iz1, iv0);
          const b2 = project(cam, ix1, iz1, iv1), b3 = project(cam, ix0, iz0, iv1);
          quad(b0, b1, b2, b3, shadeFog(lit ? '#ffe2a0' : '#39485f', mul, fog));
          if (!lit) {
            /* A slanted glint of sky across the pane. Cutting it on the
               diagonal rather than straight across is what separates glass
               from a rectangle painted two shades of blue. */
            const rl = iv0 + (iv1 - iv0) * 0.62, rr = iv0 + (iv1 - iv0) * 0.26;
            quad(project(cam, ix0, iz0, rl), project(cam, ix1, iz1, rr), b2, b3,
              shadeFog('#89a6c6', mul, fog));
          }
        } else {
          quad(a0, a1, a2, a3, shadeFog(lit ? '#ffe2a0' : '#2b3346', mul, fog));
        }
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
    if (rz < -b.hd) wall(cam, x1, z0, x0, z0, y0, y1, b.color, K.FACE.NZ);
    if (rz > b.hd) wall(cam, x0, z1, x1, z1, y0, y1, b.color, K.FACE.PZ);
    if (rx < -b.hw) wall(cam, x0, z0, x0, z1, y0, y1, b.color, K.FACE.NX);
    if (rx > b.hw) wall(cam, x1, z1, x1, z0, y0, y1, b.color, K.FACE.PX);

    if (cam.h > y1) {
      wantWindows = false;
      const c = [
        project(cam, x0, z0, y1), project(cam, x1, z0, y1),
        project(cam, x1, z1, y1), project(cam, x0, z1, y1)
      ];
      if (c.every((p) => p.depth >= K.NEAR)) {
        quad(c[0], c[1], c[2], c[3], shadeFog(b.color, Math.min(1.35, K.FACE.TOP), fogAt(c[0].depth)));
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

    /* sky, panned by heading so it parallaxes correctly against the ground.
       360 degrees spans four screen widths at a 90 degree field of view. */
    const sky = Sprites.sky();
    const skyW = W * 4;
    let off = ((cam.a / (Math.PI * 2)) * skyW) % skyW;
    if (off < 0) off += skyW;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sky, -off, 0, skyW, HZ + 2);
    ctx.drawImage(sky, -off + skyW, 0, skyW, HZ + 2);
    ctx.imageSmoothingEnabled = false;

    drawGround(cam);

    /* Collect anything vertical that could be on screen. With ~200 boxes and
       ~300 props a flat scan is cheaper than any spatial index would be. */
    items.length = 0;
    casters.length = 0;

    for (const b of City.buildings) {
      const dx = wrapDelta(b.x - cam.x), dz = wrapDelta(b.z - cam.z);
      const depth = dx * cam.sin + dz * cam.cos;
      const span = Math.max(b.hw, b.hd) * 1.5;
      if (depth < K.NEAR - span || depth > K.FAR) continue;
      const lat = dx * cam.cos - dz * cam.sin;
      if (Math.abs(lat) > depth + span + 80) continue;
      items.push({ depth, box: b });
      if (b.y0 === 0 && depth < 780 && depth > 0) casters.push({ depth, box: b });
    }

    for (const p of City.props) {
      const dx = wrapDelta(p.x - cam.x), dz = wrapDelta(p.z - cam.z);
      const depth = dx * cam.sin + dz * cam.cos;
      if (depth < K.NEAR || depth > K.FAR) continue;
      const lat = dx * cam.cos - dz * cam.sin;
      if (Math.abs(lat) > depth + 60) continue;
      items.push({ depth, prop: p });
      if (p.type === 'tree' && depth < 700) casters.push({ depth, prop: p });
    }

    /* Landmark name plates, floating above their buildings. */
    for (const l of SITE.landmarks) {
      const dx = wrapDelta(l.x - cam.x), dz = wrapDelta(l.z - cam.z);
      const depth = dx * cam.sin + dz * cam.cos;
      if (depth < K.NEAR || depth > K.FAR) continue;
      items.push({ depth: depth - 1, label: l });
    }

    drawShadows(cam);

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

  /* Shadows darken what is under them proportionally, via a multiply blend —
     blending toward a fixed dark colour instead would be invisible on asphalt
     and far too heavy on a pale plaza. The tint is slightly blue because a
     shadow outdoors is lit by sky rather than by nothing.

     Two depth bands, so shadows fade into the haze instead of staying full
     strength to the horizon. Each band is one path filled once, so overlapping
     shadows merge rather than stacking into darker patches. */
  const SHADOW_BANDS = [[0, 340, '#8e97ab'], [340, 800, '#bcc3d1']];

  function drawShadows(cam) {
    for (const [lo, hi, tint] of SHADOW_BANDS) {
      const path = new Path2D();
      let any = false;
      for (const c of casters) {
        if (c.depth < lo || c.depth >= hi) continue;
        if (c.box) addShadow(path, cam, c.box); else addPropShadow(path, cam, c.prop);
        any = true;
      }
      if (!any) continue;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = tint;
      ctx.fill(path, 'nonzero');
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawKart(kart, t) {
    const lean = kart.steer < -0.35 ? -1 : kart.steer > 0.35 ? 1 : 0;
    const spr = Sprites.kart(lean);
    /* Sized as a fraction of the buffer height rather than in sprite pixels,
       so it sits fully on screen at every resolution. */
    const kh = spr.height, kw = spr.width;
    const rough = kart.surface === K.SURF.GRASS ? 2.5 : kart.surface === K.SURF.WALK ? 1.2 : 0;
    const bob = Math.sin(t * 0.02) * (0.6 + rough) * (0.3 + kart.speed / K.MAX_SPEED);
    const x = Math.round(W / 2 - kw / 2 + Math.sin(t * 0.013) * rough);
    const y = Math.round(H - kh - 4 + bob);

    if (kart.boost > 0) {
      ctx.globalAlpha = clamp(kart.boost, 0, 1);
      ctx.drawImage(Sprites.flame(((t / 40) | 0) & 3), x, y + kh * 0.06);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(spr, x, y);
  }

  return { init, resize, render, get view() { return { W, H, HZ }; } };
})();
