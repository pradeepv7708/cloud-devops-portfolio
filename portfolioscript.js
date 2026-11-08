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
        photo.style.transform = `scale(${lerp(1.3, 1, easeO(range(p, 0, 0.8)))})`;

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
