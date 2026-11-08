/* ==================================================
   ZOOM INTRO – scroll driven cross-mask animation
================================================== */
(() => {
    const hero    = document.getElementById('intro');
    if (!hero) return;

    const stage   = hero.querySelector('.zoom-stage');
    const photo   = document.getElementById('zoomPhoto');
    const shade   = document.getElementById('zoomShade');
    const title   = document.getElementById('zoomTitle');
    const hint    = document.getElementById('zoomHint');
    const outSvg  = document.getElementById('zoomOutline');
    const outPath = outSvg.querySelector('path');
    const nav     = document.querySelector('nav');

    /* ---------- helpers ---------- */
    const clamp  = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const lerp   = (a, b, t) => a + (b - a) * t;
    const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeO  = t => 1 - Math.pow(1 - t, 3);
    const range  = (p, s, e) => clamp((p - s) / (e - s));

    /* natural size of the photo – used to fit the WHOLE picture inside the cross */
    let imgW = 4, imgH = 5;                       // fallback ratio until the image loads
    const probe = new Image();
    probe.onload = () => { imgW = probe.naturalWidth; imgH = probe.naturalHeight; update(); };
    probe.src = 'images/profile.png';

    /* closed path through pts with rounded corners of radius r */
    function roundedPath(pts, r) {
        const n = pts.length;
        let d = '';
        for (let i = 0; i < n; i++) {
            const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
            const v1 = [p0[0] - p1[0], p0[1] - p1[1]];
            const v2 = [p2[0] - p1[0], p2[1] - p1[1]];
            const l1 = Math.hypot(v1[0], v1[1]), l2 = Math.hypot(v2[0], v2[1]);
            const rr = Math.min(r, l1 / 2, l2 / 2);
            const a = [p1[0] + v1[0] / l1 * rr, p1[1] + v1[1] / l1 * rr];
            const b = [p1[0] + v2[0] / l2 * rr, p1[1] + v2[1] / l2 * rr];
            d += (i ? 'L' : 'M') + a[0].toFixed(1) + ' ' + a[1].toFixed(1);
            d += 'Q' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
        }
        return d + 'Z';
    }

    /* 12-point cross: a/b = half arm lengths, th/tv = half arm thickness */
    function cross(cx, cy, a, b, th, tv) {
        return [
            [cx - th, cy - b], [cx + th, cy - b], [cx + th, cy - tv],
            [cx + a,  cy - tv], [cx + a,  cy + tv], [cx + th, cy + tv],
            [cx + th, cy + b], [cx - th, cy + b], [cx - th, cy + tv],
            [cx - a,  cy + tv], [cx - a,  cy - tv], [cx - th, cy - tv]
        ];
    }

    /* ---------- update on scroll ---------- */
    function update() {
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        const cx = W / 2, cy = H / 2;

        // progress 0 → 1 while the stage is pinned
        const navH  = nav ? nav.offsetHeight : 0;
        const total = hero.offsetHeight - H;
        const p = clamp((navH - hero.getBoundingClientRect().top) / total);

        const g1 = easeIO(range(p, 0.00, 0.55));   // small cross → big cross
        const g2 = easeIO(range(p, 0.45, 0.80));   // big cross  → fullscreen

        const m = Math.min(W, H);
        let a  = lerp(m * 0.20, W * 0.42, g1);
        let b  = lerp(m * 0.23, H * 0.50, g1);
        let th = lerp(m * 0.095, W * 0.15, g1);
        let tv = lerp(m * 0.095, H * 0.30, g1);

        a  = lerp(a,  W / 2, g2);
        b  = lerp(b,  H / 2, g2);
        th = lerp(th, W / 2, g2);
        tv = lerp(tv, H / 2, g2);

        const radius = lerp(lerp(8, 28, g1), 0, g2);

        photo.style.clipPath  = `path('${roundedPath(cross(cx, cy, a, b, th, tv), radius)}')`;

        /* Fit the full picture to the cross's bounding box (a, b are half-sizes).
           Small cross  -> whole photo visible inside the plus.
           Big cross    -> photo covers the full screen (same final result as before). */
        const boxW = a * 2, boxH = b * 2;
        const fit  = Math.max(boxW / imgW, boxH / imgH);
        const pw   = imgW * fit, ph = imgH * fit;
        photo.style.backgroundSize     = `${pw}px ${ph}px`;
        photo.style.backgroundPosition = `${cx - pw / 2}px ${cy - b - (ph - boxH) * 0.22}px`;
        photo.style.transform          = 'none';

        // glowing outline
        outSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        outPath.setAttribute('d', roundedPath(
            cross(cx + W * 0.03, cy - H * 0.02, a * 1.1, b * 1.06, th * 1.12, tv * 1.12), radius));
        outSvg.style.opacity = range(p, 0.05, 0.2) * (1 - range(p, 0.5, 0.85));

        // scroll hint
        hint.style.opacity = 1 - range(p, 0, 0.08);

        // shade + title
        const t = easeO(range(p, 0.72, 0.92));
        shade.style.opacity   = t;
        title.style.opacity   = t;
        title.style.transform = `translateY(${(1 - t) * 40}px)`;
    }

    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { update(); ticking = false; });
    };

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', update);
    update();
})();

/* ==================================================
   SCROLL REVEAL – elements appear one by one
================================================== */
(() => {
    /* [ selector, direction, stagger step in seconds ] */
    const rules = [
        /* HOME (below the zoom intro) */
        ['#home .small-title',      '',           0],
        ['#home h1',                '',           0.12],
        ['#home .home-content h2',  '',           0.24],
        ['#home .home-skills',      '',           0.36],
        ['#home .home-button',      'zoom',       0.48],
        ['#home .home-photo',       'from-right', 0.2],

        /* section headings (About, Skills, Projects, Education, Contact) */
        ['section .section-label',  '',           0],
        ['section:not(#home) > h2', '',           0.1],
        ['section .section-line',   '',           0.2],

        /* ABOUT */
        ['.about-text p',           'from-left',  0.15],
        ['.personal-info',          'from-right', 0],

        /* SKILLS */
        ['.skills-scene',           'zoom',       0],
        ['.skills-quote',           '',           0.1],

        /* PROJECTS */
        ['.project-card',           'zoom',       0.2],

        /* EDUCATION */
        ['.education-card',         'zoom',       0.2],

        /* CONTACT */
        ['.contact-description',    '',           0],
        ['.contact-info p',         'from-left',  0.12],

        /* FOOTER */
        ['footer p',                '',           0]
    ];

    const items = [];

    rules.forEach(([selector, dir, step]) => {
        const nodes = document.querySelectorAll(selector);
        nodes.forEach((el, i) => {
            if (el.classList.contains('reveal')) return;
            el.classList.add('reveal');
            if (dir) el.classList.add(dir);
            el.style.setProperty('--delay', (i * step).toFixed(2) + 's');
            items.push(el);
        });
    });

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            el.classList.add('in');
            io.unobserve(el);

            /* when finished, drop the reveal classes so your own
               hover / transition styles work normally again */
            const delay = parseFloat(el.style.getPropertyValue('--delay')) || 0;
            setTimeout(() => {
                el.classList.remove('reveal', 'in', 'from-left', 'from-right', 'zoom');
                el.style.removeProperty('--delay');
            }, (delay + 1) * 1000 + 100);
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    items.forEach(el => io.observe(el));
})();





























/* ==================================================
   SCROLL REVEAL – elements appear one by one
================================================== */
(() => {
    /* [ selector, direction, stagger step in seconds ] */
    const rules = [
        /* HOME (below the zoom intro) */
        ['#home .small-title',      '',           0],
        ['#home h1',                '',           0.12],
        ['#home .home-content h2',  '',           0.24],
        ['#home .home-skills',      '',           0.36],
        ['#home .home-button',      'zoom',       0.48],
        ['#home .home-photo',       'from-right', 0.2],

        /* section headings (About, Skills, Projects, Education, Contact) */
        ['section .section-label',  '',           0],
        ['section:not(#home) > h2', '',           0.1],
        ['section .section-line',   '',           0.2],

        /* ABOUT */
        ['.about-text p',           'from-left',  0.15],
        ['.personal-info',          'from-right', 0],

        /* SKILLS */
        ['.skills-scene',           'zoom',       0],
        ['.skills-quote',           '',           0.1],

        /* PROJECTS */
        ['.project-card',           'zoom',       0.2],

        /* EDUCATION */
        ['.education-card',         'zoom',       0.2],

        /* CONTACT */
        ['.contact-description',    '',           0],
        ['.contact-info p',         'from-left',  0.12],

        /* FOOTER */
        ['footer p',                '',           0]
    ];

    const items = [];

    rules.forEach(([selector, dir, step]) => {
        const nodes = document.querySelectorAll(selector);
        nodes.forEach((el, i) => {
            if (el.classList.contains('reveal')) return;
            el.classList.add('reveal');
            if (dir) el.classList.add(dir);
            el.style.setProperty('--delay', (i * step).toFixed(2) + 's');
            items.push(el);
        });
    });

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            el.classList.add('in');
            io.unobserve(el);

            /* when finished, drop the reveal classes so your own
               hover / transition styles work normally again */
            const delay = parseFloat(el.style.getPropertyValue('--delay')) || 0;
            setTimeout(() => {
                el.classList.remove('reveal', 'in', 'from-left', 'from-right', 'zoom');
                el.style.removeProperty('--delay');
            }, (delay + 1) * 1000 + 100);
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    items.forEach(el => io.observe(el));
})();


/* ==================================================
   INTERACTIVE MOUSE-REPULSION DOT GRID
   Runs inside the sections listed below (each gets its own canvas).
   To add it to another section, add that section's id to the list.
================================================== */
(() => {
  ['home', 'skills', 'education'].forEach(id => {
    const el = document.getElementById(id);
    if (el) initDotGrid(el);
  });

  function initDotGrid(host) {
    if (host.querySelector('#' + host.id + '-dots')) return;   // never create a second canvas

  const canvas = document.createElement('canvas');
  canvas.id = host.id + '-dots';
  canvas.setAttribute('aria-hidden', 'true');
  host.insertBefore(canvas, host.firstChild);

  /* Self-contained styles: no extra CSS needed.
     - the section becomes its own stacking context (isolation) so the canvas at
       z-index:-1 sits above the section background but behind all its content
     - position:absolute keeps the canvas out of the section's layout (flex/grid) */
  host.style.isolation = 'isolate';
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block;' +
    '-webkit-mask-image:linear-gradient(to bottom,transparent 0%,#000 14%,#000 86%,transparent 100%);' +
    'mask-image:linear-gradient(to bottom,transparent 0%,#000 14%,#000 86%,transparent 100%);';
  const ctx = canvas.getContext('2d');

  /* ---------- Settings (tweak freely) ---------- */
  const CFG = {
    spacing: 34,            // gap between dots (px); auto-scaled on small screens
    maxDots: 2200,          // performance cap
    dotRadius: 1.4,
    colors: ['#00A6FF', '#20D6C7'],
    cyanRatio: 0.22,        // share of cyan dots
    baseAlpha: 0.55,
    lineAlpha: 0.07,        // resting line opacity
    lineAlphaNear: 0.22,    // line opacity near the cursor
    repelRadius: 160,
    repelStrength: 11,
    spring: 0.07,           // pull back to home position
    damping: 0.80,
    rippleSpeed: 0.0035,
    rippleWave: 0.045,
    rippleAmp: 3.2,
    idleWaveAmp: 1.2        // very gentle ambient motion
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raw   = { x: 0, y: 0, active: false };      // pointer in viewport coordinates
  const mouse = { x: -9999, y: -9999, active: false }; // pointer relative to the section
  let dpr = 1, W = 0, H = 0, cols = 0, rows = 0, spacing = CFG.spacing;
  let dots = [];
  let rafId = null, resizeTimer = null;
  let inView = true, tabVisible = !document.hidden;

  /* ---------- Pre-rendered glow sprites (faster than shadowBlur) ---------- */
  function makeSprite(color) {
    const size = 24, c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.18, color);
    grad.addColorStop(0.4, color + '55');
    grad.addColorStop(1, color + '00');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }
  const sprites = CFG.colors.map(makeSprite);

  /* ---------- Build grid (sized to the Home section) ---------- */
  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = host.clientWidth;
    H = host.clientHeight;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    spacing = W < 600 ? 28 : W < 1024 ? 31 : CFG.spacing;
    while (((W / spacing) + 2) * ((H / spacing) + 2) > CFG.maxDots) spacing += 2;

    cols = Math.ceil(W / spacing) + 2;
    rows = Math.ceil(H / spacing) + 2;
    const offX = (W - (cols - 1) * spacing) / 2;
    const offY = (H - (rows - 1) * spacing) / 2;

    dots = new Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ox = offX + c * spacing, oy = offY + r * spacing;
        const h = Math.abs(Math.sin(c * 12.9898 + r * 78.233) * 43758.5453) % 1;
        dots[r * cols + c] = { ox, oy, x: ox, y: oy, vx: 0, vy: 0, s: h < CFG.cyanRatio ? 1 : 0, glow: 0 };
      }
    }
  }

  /* ---------- Physics ---------- */
  function update(t) {
    const R = CFG.repelRadius, R2 = R * R;
    const mx = mouse.x, my = mouse.y;

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];

      let ax = (d.ox - d.x) * CFG.spring;
      let ay = (d.oy - d.y) * CFG.spring;

      ax += Math.sin(t * 0.0007 + d.oy * 0.012) * CFG.idleWaveAmp * 0.02;
      ay += Math.cos(t * 0.0008 + d.ox * 0.012) * CFG.idleWaveAmp * 0.02;

      let glow = 0;
      if (mouse.active) {
        const dx = d.x - mx, dy = d.y - my;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < R2 && dist2 > 0.01) {
          const dist = Math.sqrt(dist2);
          const f = 1 - dist / R;
          const push = f * f * CFG.repelStrength;
          const nx = dx / dist, ny = dy / dist;
          ax += nx * push;
          ay += ny * push;

          const wave = Math.sin(dist * CFG.rippleWave - t * CFG.rippleSpeed * 6) * CFG.rippleAmp * f;
          ax += nx * wave * 0.35 - ny * wave * 0.12;
          ay += ny * wave * 0.35 + nx * wave * 0.12;

          glow = f;
        }
      }
      d.glow += (glow - d.glow) * 0.15;

      d.vx = (d.vx + ax) * CFG.damping;
      d.vy = (d.vy + ay) * CFG.damping;
      d.x += d.vx;
      d.y += d.vy;
    }
  }

  /* ---------- Render ---------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.lineWidth = 0.6;
    const maxLen = spacing * 1.9;
    const base = new Path2D(), near = new Path2D();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = dots[r * cols + c];
        if (a.x < -spacing || a.x > W + spacing || a.y < -spacing || a.y > H + spacing) continue;
        const neighbors = [];
        if (c < cols - 1) neighbors.push(dots[r * cols + c + 1]);
        if (r < rows - 1) neighbors.push(dots[(r + 1) * cols + c]);
        for (const b of neighbors) {
          const dx = a.x - b.x, dy = a.y - b.y;
          if (dx * dx + dy * dy > maxLen * maxLen) continue;
          const p = (a.glow + b.glow) > 0.12 ? near : base;
          p.moveTo(a.x, a.y);
          p.lineTo(b.x, b.y);
        }
      }
    }
    ctx.strokeStyle = `rgba(0,166,255,${CFG.lineAlpha})`;
    ctx.stroke(base);
    ctx.strokeStyle = `rgba(32,214,199,${CFG.lineAlphaNear})`;
    ctx.stroke(near);

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.x < -20 || d.x > W + 20 || d.y < -20 || d.y > H + 20) continue;
      const scale = 1 + d.glow * 0.9;
      const gs = 14 * scale;
      ctx.globalAlpha = Math.min(1, CFG.baseAlpha * 0.55 + d.glow * 0.5);
      ctx.drawImage(sprites[d.s], d.x - gs / 2, d.y - gs / 2, gs, gs);
      ctx.globalAlpha = Math.min(1, CFG.baseAlpha + d.glow * 0.45);
      ctx.fillStyle = CFG.colors[d.s];
      ctx.beginPath();
      ctx.arc(d.x, d.y, CFG.dotRadius * scale, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Loop (runs only while Home is visible) ---------- */
  function frame(t) {
    // pointer position relative to the Home section (handles scrolling too)
    const r = canvas.getBoundingClientRect();
    if (raw.active && raw.x >= r.left && raw.x <= r.right && raw.y >= r.top && raw.y <= r.bottom) {
      mouse.x = raw.x - r.left;
      mouse.y = raw.y - r.top;
      mouse.active = true;
    } else {
      mouse.active = false;
    }
    update(t);
    draw();
    rafId = requestAnimationFrame(frame);
  }
  function sync() {
    const shouldRun = inView && tabVisible && !reduceMotion;
    if (shouldRun && !rafId) rafId = requestAnimationFrame(frame);
    if (!shouldRun && rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  /* ---------- Events ---------- */
  window.addEventListener('mousemove', e => { raw.x = e.clientX; raw.y = e.clientY; raw.active = true; }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { raw.active = false; });
  window.addEventListener('mouseout', e => { if (!e.relatedTarget) raw.active = false; });

  window.addEventListener('touchstart', e => { const t = e.touches[0]; raw.x = t.clientX; raw.y = t.clientY; raw.active = true; }, { passive: true });
  window.addEventListener('touchmove',  e => { const t = e.touches[0]; raw.x = t.clientX; raw.y = t.clientY; raw.active = true; }, { passive: true });
  window.addEventListener('touchend', () => { raw.active = false; }, { passive: true });

  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { build(); if (reduceMotion) draw(); }, 150);
  }).observe(host);

  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }).observe(host);
  document.addEventListener('visibilitychange', () => { tabVisible = !document.hidden; sync(); });

  /* ---------- Init ---------- */
  build();
  if (reduceMotion) draw();
  sync();
  }
})();