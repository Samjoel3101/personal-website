/* game.js — glue: boot sequence, input, the fixed-timestep loop, and all the
   DOM that sits over the canvas (compass, minimap, landmark cards, and the
   plain-text résumé that reads the same SITE data). */

(function () {
  const $ = (id) => document.getElementById(id);

  const el = {
    screen: $('screen'), hud: $('hud'), loading: $('loading'), intro: $('intro'),
    card: $('card'), cardIcon: $('card-icon'), cardTitle: $('card-title'),
    cardSub: $('card-sub'), cardBody: $('card-body'), cardLinks: $('card-links'),
    complete: $('complete'), completeLinks: $('complete-links'), completeLine: $('complete-line'),
    progress: $('progress'), compassArrow: $('compass-arrow'),
    compassName: $('compass-name'), compassDist: $('compass-dist'),
    kph: $('kph'), boostBar: $('boost-bar').firstElementChild,
    minimap: $('minimap'), hint: $('hint'),
    resumeView: $('resume-view'), resumeInner: $('resume-inner'),
    mute: $('mute')
  };

  const input = { left: false, right: false, gas: false, brake: false, drift: false };
  const found = new Set();
  const inZone = new Set();          // latch, so a card fires on entry only
  let state = 'loading';             // loading | intro | drive | card | done
  let mapBase = null;
  let last = 0, acc = 0, clock = 0;
  let shake = 0;

  /* Dynamic resolution. The renderer draws at the display's own pixel count,
     which is right on hardware that can afford it and far too ambitious on
     hardware that cannot — including any browser that has fallen back to a
     software canvas. Rather than pick a resolution for the worst machine, the
     loop measures how long its own work takes and moves the render scale up
     or down to suit. The canvas is stretched by CSS either way, so the only
     thing that changes is sharpness. */
  let renderScale = 1;
  let frameSum = 0, frameCount = 0, upCooldown = 0;

  /* ------------------------------------------------------------------ boot -- */
  function boot() {
    el.hint.textContent = 'Follow the arrow. Drive into a glowing ring to read a stop.';
    el.progress.textContent = `FOUND 0/${SITE.landmarks.length}`;
    $('intro-name').textContent = SITE.owner.name;
    $('intro-tagline').textContent = SITE.owner.tagline;
    document.title = `Kart Résumé — ${SITE.owner.name}`;
    buildResumeView();
    wireEvents();

    /* The name-plate sprites bake text into a bitmap, so they need the UI
       font to have arrived or they come out with fallback metrics. Wait for
       it, but never for long — the font is a nicety, not a dependency. */
    fontsReady().then(() => requestAnimationFrame(() => setTimeout(() => {
      Sprites.init();
      City.init();
      R.init(el.screen);
      Kart.reset();
      buildMapBase();
      fitScreen();
      el.loading.hidden = true;
      el.intro.hidden = false;
      state = 'intro';
      /* Draw one frame behind the intro so it is not sitting on a blank canvas. */
      drawFrame(0);
    }, 30)));
  }

  function fontsReady() {
    if (!document.fonts) return Promise.resolve();
    const want = Promise.all([
      document.fonts.load('600 26px "Fredoka"'),
      document.fonts.load('400 16px "Fredoka"')
    ]).catch(() => {});
    return Promise.race([
      Promise.all([want, document.fonts.ready]),
      new Promise((r) => setTimeout(r, 1500))
    ]);
  }

  /* ------------------------------------------------------------------ view -- */
  function fitScreen() {
    const vw = window.innerWidth, vh = window.innerHeight;
    /* Render at the display's real pixel density, capped: past a certain
       point extra pixels cost frames and buy nothing visible. */
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    /* The canvas takes the viewport's shape, but only within a range. A phone
       held upright is far taller than any sensible field of view, and matching
       it exactly would stretch the world; clamping instead leaves a thin band
       above and below, which the HUD sits in. */
    const aspect = clamp(vw / vh, 0.72, 2.4);
    let h = Math.round(vh * dpr * renderScale);
    let w = Math.round(h * aspect);
    if (w > K.MAX_W) { w = K.MAX_W; h = Math.round(w / aspect); }
    if (h > K.MAX_H) { h = K.MAX_H; w = Math.round(h * aspect); }
    R.resize(w, h);

    /* The displayed box comes from the clamped aspect, not from the rounded
       render dimensions — otherwise a resolution change nudges the canvas a
       pixel or two sideways and the whole frame appears to twitch. */
    let cw = vw, ch = vw / aspect;
    if (ch > vh) { ch = vh; cw = vh * aspect; }
    el.screen.style.width = Math.round(cw) + 'px';
    el.screen.style.height = Math.round(ch) + 'px';
    if (state !== 'loading') drawFrame(clock);
  }

  /* ---------------------------------------------------------------- events -- */
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'gas', KeyW: 'gas',
    ArrowDown: 'brake', KeyS: 'brake',
    ShiftLeft: 'drift', ShiftRight: 'drift', Space: 'drift'
  };

  function wireEvents() {
    addEventListener('keydown', (e) => {
      if (KEYMAP[e.code]) { input[KEYMAP[e.code]] = true; e.preventDefault(); }
      if (e.code === 'KeyM') setMute(Sound.toggle());
      if (e.code === 'Escape' || e.code === 'Enter') {
        if (state === 'intro') startDriving();
        else if (state === 'card') closeCard();
        else if (state === 'done') { el.complete.hidden = true; resume(); }
        else if (!el.resumeView.hidden) hideResume();
      }
    });
    addEventListener('keyup', (e) => {
      if (KEYMAP[e.code]) { input[KEYMAP[e.code]] = false; e.preventDefault(); }
    });
    /* Held keys would otherwise stick when the tab loses focus. */
    addEventListener('blur', () => { for (const k in input) input[k] = false; });

    addEventListener('resize', fitScreen);
    addEventListener('orientationchange', () => setTimeout(fitScreen, 120));

    $('start').onclick = startDriving;
    $('skip').onclick = () => { showResume(); };
    $('card-close').onclick = closeCard;
    el.card.onclick = (e) => { if (e.target === el.card) closeCard(); };
    $('complete-close').onclick = () => { el.complete.hidden = true; resume(); };
    $('open-resume').onclick = showResume;
    $('resume-back').onclick = hideResume;
    el.mute.onclick = () => setMute(Sound.toggle());

    /* Touch: pointer events so a finger sliding off the button releases it. */
    for (const b of document.querySelectorAll('.tbtn')) {
      const key = b.dataset.key;
      const on = (e) => { input[key] = true; e.preventDefault(); };
      const off = (e) => { input[key] = false; e.preventDefault(); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointercancel', off);
      b.addEventListener('pointerleave', off);
    }
  }

  function setMute(on) { el.mute.textContent = on ? 'SOUND ON' : 'SOUND OFF'; }

  function startDriving() {
    Sound.start();
    el.intro.hidden = true;
    el.hud.hidden = false;
    state = 'drive';
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function resume() {
    state = 'drive';
    last = performance.now();
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------ loop -- */
  function loop(now) {
    if (state !== 'drive') return;
    const rawDt = now - last;
    let dt = rawDt / 1000;
    last = now;
    /* A backgrounded tab hands back a huge dt; clamp it so nothing tunnels
       through a wall on the first frame after you come back. */
    if (dt > 0.1) dt = 0.1;

    /* Fixed 120 Hz physics keeps the handling identical on any refresh rate. */
    acc += dt;
    const STEP = 1 / 120;
    let guard = 0;
    while (acc >= STEP && guard++ < 12) {
      Kart.update(STEP, input);
      acc -= STEP;
    }

    clock = now;
    checkZones();
    Sound.update(Kart);

    if (Kart.bumped) { Kart.bumped = 0; Sound.thud(); shake = 1; }
    if (Kart.boosted) { Kart.boosted = 0; Sound.whoosh(); }
    if (shake > 0) shake = Math.max(0, shake - dt * 4);

    drawFrame(now);
    updateHud();
    tuneResolution(rawDt);
    requestAnimationFrame(loop);
  }

  /* Timing our own work is misleading — canvas calls are queued and rasterised
     after the function returns, so the number comes back small on a machine
     that is visibly struggling. The frame interval is what the viewer actually
     experiences, so that is what drives the scale.

     Coming back up is deliberately slow. Without the cooldown the scale
     oscillates: raising it costs exactly the frames that made raising it look
     safe, and the viewer sees the picture breathe. */
  function tuneResolution(ms) {
    if (ms > 200) return;                  // a tab that was backgrounded
    frameSum += ms;
    if (++frameCount < 45) return;
    const avg = frameSum / frameCount;
    frameSum = 0; frameCount = 0;
    if (upCooldown > 0) upCooldown--;

    if (avg > 20.5 && renderScale > 0.55) {           // below roughly 49 fps
      renderScale = Math.max(0.55, renderScale - 0.12);
      upCooldown = 12;                                 // ~9 seconds of calm
      fitScreen();
    } else if (avg < 17.2 && renderScale < 1 && upCooldown === 0) {
      renderScale = Math.min(1, renderScale + 0.08);
      fitScreen();
    }
  }

  function drawFrame(now) {
    /* Camera trails the kart, and leans out of the corner slightly — the lag
       is what makes cornering feel like cornering. */
    const sin = Math.sin(Kart.a), cos = Math.cos(Kart.a);
    const cam = {
      x: wrap(Kart.x - sin * K.CAM_BACK - cos * Kart.slide * 0.35),
      z: wrap(Kart.z - cos * K.CAM_BACK + sin * Kart.slide * 0.35),
      a: Kart.a - Kart.steer * 0.055,
      h: K.CAM_H + (shake > 0 ? Math.sin(now * 0.09) * shake * 3 : 0)
    };
    R.render(cam, Kart, now);
  }

  /* --------------------------------------------------------------- discover -- */
  function checkZones() {
    for (const l of SITE.landmarks) {
      const near = wrapDist(Kart.x, Kart.z, l.x, l.z) < K.DISCOVER_R
        || Kart.hitLandmark === l.id;
      if (near && !inZone.has(l.id)) {
        inZone.add(l.id);
        openCard(l);
        return;
      }
      /* Leave a hysteresis band so idling on the boundary does not flicker. */
      if (!near && inZone.has(l.id)
        && wrapDist(Kart.x, Kart.z, l.x, l.z) > K.DISCOVER_R + 45) {
        inZone.delete(l.id);
      }
    }
  }

  function openCard(l) {
    const isNew = !found.has(l.id);
    found.add(l.id);
    state = 'card';
    /* Release everything, or a throttle held while reading launches the kart
       into a wall the moment the card closes. */
    for (const k in input) input[k] = false;

    el.cardIcon.textContent = l.icon;
    el.cardTitle.textContent = l.title;
    el.cardSub.textContent = l.subtitle;
    el.cardBody.innerHTML = '';

    for (const s of l.sections) {
      const wrapEl = document.createElement('div');
      /* A section of bare one-liners (skills) reads better as chips than as
         another bulleted list. */
      const chips = !s.meta && s.items.every((i) => i.length < 26);
      wrapEl.className = 'section' + (chips ? ' tags' : '');
      if (s.heading) {
        const h = document.createElement('h3');
        h.textContent = s.heading;
        wrapEl.appendChild(h);
      }
      if (s.meta) {
        const m = document.createElement('p');
        m.className = 'meta';
        m.textContent = s.meta;
        wrapEl.appendChild(m);
      }
      const ul = document.createElement('ul');
      for (const it of s.items) {
        const li = document.createElement('li');
        li.textContent = it;
        ul.appendChild(li);
      }
      wrapEl.appendChild(ul);
      el.cardBody.appendChild(wrapEl);
    }

    if (l.showContactLinks) {
      el.cardLinks.hidden = false;
      el.cardLinks.innerHTML = '';
      el.cardLinks.appendChild(link(`EMAIL ME`, `mailto:${SITE.owner.email}`));
      for (const lk of SITE.owner.links) {
        el.cardLinks.appendChild(link(lk.label.toUpperCase(), lk.url));
      }
    } else {
      el.cardLinks.hidden = true;
    }

    el.card.hidden = false;
    $('card-close').focus();
    if (isNew) Sound.discover(); else Sound.chime();
    updateHud();
  }

  function link(text, href) {
    const a = document.createElement('a');
    a.textContent = text;
    a.href = href;
    if (!href.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  function closeCard() {
    el.card.hidden = true;
    if (found.size === SITE.landmarks.length && !el.complete.dataset.shown) {
      el.complete.dataset.shown = '1';
      el.completeLine.textContent =
        `That is the whole tour — ${(Kart.distance / 1000).toFixed(1)} km driven. `
        + `If any of it landed, the door is open.`;
      el.completeLinks.innerHTML = '';
      el.completeLinks.appendChild(link('EMAIL ME', `mailto:${SITE.owner.email}`));
      for (const lk of SITE.owner.links) {
        el.completeLinks.appendChild(link(lk.label.toUpperCase(), lk.url));
      }
      el.complete.hidden = false;
      state = 'done';
      Sound.chime();
      return;
    }
    resume();
  }

  /* ------------------------------------------------------------------- HUD -- */
  function updateHud() {
    const total = SITE.landmarks.length;
    el.progress.textContent = `FOUND ${found.size}/${total}`;
    el.kph.textContent = Kart.kph;
    el.boostBar.style.width = Math.round((Kart.boost / 1.15) * 100) + '%';

    /* Compass points at the nearest stop you have not read yet. */
    let target = null, best = Infinity;
    for (const l of SITE.landmarks) {
      if (found.has(l.id)) continue;
      const d = wrapDist(Kart.x, Kart.z, l.x, l.z);
      if (d < best) { best = d; target = l; }
    }
    if (!target) {
      el.compassName.textContent = 'ALL FOUND';
      el.compassDist.textContent = 'free roam';
      el.compassArrow.style.transform = 'rotate(0deg)';
    } else {
      const dx = wrapDelta(target.x - Kart.x), dz = wrapDelta(target.z - Kart.z);
      /* Bearing relative to where the kart is pointing, so up means straight on. */
      const bearing = Math.atan2(dx, dz) - Kart.a;
      el.compassArrow.style.transform = `rotate(${(bearing * 180) / Math.PI}deg)`;
      el.compassName.textContent = target.title.toUpperCase();
      el.compassDist.textContent = `${Math.round(best)} m away`;
    }
    drawMinimap();
  }

  /* The static part of the minimap: streets and blocks, drawn once. */
  function buildMapBase() {
    const S = 132, s = S / K.WORLD;
    mapBase = document.createElement('canvas');
    mapBase.width = mapBase.height = S;
    const g = mapBase.getContext('2d');
    g.fillStyle = '#12172a'; g.fillRect(0, 0, S, S);
    g.fillStyle = '#1c2440';
    for (const b of City.buildings) {
      if (b.y0 > 0) continue;
      g.fillRect((b.x - b.hw) * s, (b.z - b.hd) * s, b.hw * 2 * s, b.hd * 2 * s);
    }
    g.strokeStyle = '#39456b';
    g.lineWidth = Math.max(1, K.ROAD_HALF * 2 * s);
    for (let i = 0; i < K.WORLD / K.BLOCK; i++) {
      const p = i * K.BLOCK * s;
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke();
    }
  }

  function drawMinimap() {
    const S = 132, s = S / K.WORLD;
    const g = el.minimap.getContext('2d');
    g.clearRect(0, 0, S, S);
    g.drawImage(mapBase, 0, 0);

    for (const l of SITE.landmarks) {
      const x = l.x * s, y = l.z * s;
      g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2);
      if (found.has(l.id)) { g.fillStyle = l.accent; g.fill(); }
      else { g.strokeStyle = l.accent; g.lineWidth = 2; g.stroke(); }
    }

    /* kart, as a triangle pointing where it is heading */
    const kx = Kart.x * s, ky = Kart.z * s;
    g.save();
    g.translate(kx, ky);
    g.rotate(Kart.a);
    g.fillStyle = '#ffd23c';
    g.beginPath();
    g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(-4.5, 5);
    g.closePath(); g.fill();
    g.restore();
  }

  /* ---------------------------------------------------- plain résumé view -- */
  function buildResumeView() {
    const o = SITE.owner;
    const parts = [
      `<h1>${esc(o.name)}</h1>`,
      `<p class="sub">${esc(o.tagline)}</p>`,
      `<p class="sub">${esc(o.location)} · <a href="mailto:${esc(o.email)}" style="color:var(--accent2)">${esc(o.email)}</a></p>`,
      `<div class="card-links" style="justify-content:flex-start">`
      + o.links.map((l) =>
        `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label.toUpperCase())}</a>`).join('')
      + `</div>`
    ];

    for (const l of SITE.landmarks) {
      parts.push(`<h2>${esc(l.icon)} ${esc(l.title)}</h2>`);
      for (const s of l.sections) {
        const chips = !s.meta && s.items.every((i) => i.length < 26);
        parts.push(`<div class="section${chips ? ' tags' : ''}">`);
        if (s.heading) parts.push(`<h3>${esc(s.heading)}</h3>`);
        if (s.meta) parts.push(`<p class="meta">${esc(s.meta)}</p>`);
        parts.push('<ul>' + s.items.map((i) => `<li>${esc(i)}</li>`).join('') + '</ul>');
        parts.push('</div>');
      }
    }
    el.resumeInner.innerHTML = parts.join('');
  }

  const esc = (s) => String(s).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function showResume() {
    el.resumeView.hidden = false;
    el.resumeView.scrollTop = 0;
    if (state === 'drive') state = 'paused';
  }

  function hideResume() {
    el.resumeView.hidden = true;
    if (state === 'paused') resume();
  }

  boot();
})();
