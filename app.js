(() => {
  "use strict";

  const FRAME_COUNT = 121;
  const FRAME_PATH = (i) => `frames/f_${String(i).padStart(3, "0")}.webp`;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const ramp = (p, a, b) => smooth(clamp((p - a) / (b - a), 0, 1));

  /* ---------- Frame loading ---------- */
  const preloader = document.getElementById("preloader");
  const preFill = document.getElementById("preloaderFill");
  const prePct = document.getElementById("preloaderPct");

  const canBitmap = typeof createImageBitmap === "function";
  const lowMemory = (navigator.deviceMemory || 8) < 8;
  const useBitmaps = canBitmap && !lowMemory;

  const frames = new Array(FRAME_COUNT).fill(null);
  let loaded = 0;
  const startTs = performance.now();

  const poster = new Image();
  poster.src = "frames/poster.jpg";

  function loadFrame(i) {
    return new Promise((resolve) => {
      const done = (node) => {
        frames[i] = node;
        loaded++;
        const pct = Math.round((loaded / FRAME_COUNT) * 100);
        preFill.style.width = pct + "%";
        prePct.textContent = pct + "%";
        resolve();
      };
      if (useBitmaps) {
        fetch(FRAME_PATH(i))
          .then((r) => r.blob())
          .then((b) => createImageBitmap(b))
          .then((bmp) => done(bmp))
          .catch(() => {
            const img = new Image();
            img.src = FRAME_PATH(i);
            img.onload = () => done(img);
            img.onerror = () => resolve();
          });
      } else {
        const img = new Image();
        img.src = FRAME_PATH(i);
        img.onload = () => done(img);
        img.onerror = () => resolve();
      }
    });
  }

  const loadAll = Promise.all(Array.from({ length: FRAME_COUNT }, (_, i) => loadFrame(i)));

  /* ---------- Canvas ---------- */
  const storyEl = document.getElementById("story");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  let cw = 0, ch = 0, dpr = 1, dirty = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = canvas.clientWidth;
    ch = canvas.clientHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    dirty = true;
  }

  function draw(node) {
    if (!node || !node.width) return;
    const iw = node.width, ih = node.height;
    const scale = Math.max((cw * dpr) / iw, (ch * dpr) / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(node, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  }

  /* ---------- Frame timeline (explode -> peak -> reassemble) ---------- */
  const KEYS = [
    [0.0, 0],
    [0.1, 4],
    [0.16, 12],
    [0.38, 78],
    [0.56, 120],
    [0.63, 120],
    [0.85, 54],
    [1.0, 0],
  ];

  function frameAt(p) {
    for (let i = 0; i < KEYS.length - 1; i++) {
      const [p0, f0] = KEYS[i];
      const [p1, f1] = KEYS[i + 1];
      if (p >= p0 && p <= p1) {
        const t = smooth((p - p0) / (p1 - p0));
        return f0 + (f1 - f0) * t;
      }
    }
    return KEYS[KEYS.length - 1][1];
  }

  function scrollProgress() {
    const total = storyEl.offsetHeight - window.innerHeight;
    const top = storyEl.getBoundingClientRect().top;
    return clamp(-top / total, 0, 1);
  }

  /* ---------- Story beats ---------- */
  const BEAT_CFG = [
    { sel: "#beat-1", in: [0.0, 0.0], out: [0.1, 0.145] },
    { sel: "#beat-2", in: [0.165, 0.215], out: [0.335, 0.385] },
    { sel: "#beat-3", in: [0.42, 0.47], out: [0.56, 0.61] },
    { sel: "#beat-4", in: [0.645, 0.695], out: [0.8, 0.85] },
    { sel: "#beat-5", in: [0.885, 0.945], out: [1.2, 1.3] },
  ];
  const beats = BEAT_CFG.map((c) => ({ ...c, el: document.querySelector(c.sel) }));
  const scrollhintEl = document.getElementById("scrollhint");

  function updateBeats(p) {
    for (const b of beats) {
      const [i0, i1] = b.in;
      const [o0, o1] = b.out;
      let o, shift;
      if (p <= i1) {
        const t = i1 === i0 ? 1 : ramp(p, i0, i1);
        o = t;
        shift = (1 - t) * 38;
      } else if (p >= o0) {
        const t = ramp(p, o0, o1);
        o = 1 - t;
        shift = -t * 38;
      } else {
        o = 1;
        shift = 0;
      }
      b.el.style.setProperty("--o", o.toFixed(3));
      b.el.style.setProperty("--shift", shift.toFixed(1) + "px");
      b.el.style.visibility = o <= 0.001 ? "hidden" : "visible";
    }
    const hint = 1 - ramp(p, 0.012, 0.05);
    scrollhintEl.style.opacity = hint.toFixed(3);
    scrollhintEl.style.visibility = hint <= 0.001 ? "hidden" : "visible";
  }

  /* ---------- Progress rail ---------- */
  const railProgress = document.getElementById("railProgress");
  const railDots = document.getElementById("railDots");
  const DOT_ANCHORS = [0.02, 0.28, 0.515, 0.74, 0.97];
  const dots = DOT_ANCHORS.map((a, i) => {
    const d = document.createElement("button");
    d.className = "rail__dot";
    d.setAttribute("aria-label", "Go to section " + (i + 1));
    d.addEventListener("click", () => {
      const total = storyEl.offsetHeight - window.innerHeight;
      window.scrollTo({ top: storyEl.offsetTop + a * total, behavior: "smooth" });
    });
    railDots.appendChild(d);
    return d;
  });

  function updateRail(p) {
    railProgress.style.setProperty("--p", p.toFixed(4));
    let active = 0;
    let best = Infinity;
    DOT_ANCHORS.forEach((a, i) => {
      const d = Math.abs(p - a);
      if (d < best) { best = d; active = i; }
    });
    dots.forEach((d, i) => d.classList.toggle("rail__dot--active", i === active));
  }

  /* ---------- Main loop ---------- */
  let renderedFrame = 0;
  let lastDrawn = -1;

  function tick(now) {
    requestAnimationFrame(tick);
    const p = scrollProgress();

    const target = frameAt(p);
    if (REDUCED) {
      renderedFrame = target;
    } else {
      const dt = Math.min((now - (tick.last || now)) / 1000, 0.05);
      tick.last = now;
      const k = 1 - Math.exp(-dt * 7.5);
      renderedFrame += (target - renderedFrame) * k;
      if (Math.abs(target - renderedFrame) < 0.002) renderedFrame = target;
    }

    if (dirty || Math.abs(renderedFrame - lastDrawn) > 0.001) {
      const i = clamp(Math.round(renderedFrame), 0, FRAME_COUNT - 1);
      const node = frames[i] || (frames[i] === null && poster.complete ? poster : null);
      if (node) draw(node);
      lastDrawn = renderedFrame;
      dirty = false;
    }

    updateBeats(p);
    updateRail(p);
  }

  /* ---------- Nav ---------- */
  const nav = document.getElementById("nav");

  function smoothToStory(v) {
    const total = storyEl.offsetHeight - window.innerHeight;
    window.scrollTo({ top: storyEl.offsetTop + v * total, behavior: "smooth" });
  }

  document.querySelectorAll("[data-nav-to]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const v = parseFloat(a.dataset.navTo);
      if (a.dataset.navTo === "0") window.scrollTo({ top: 0, behavior: "smooth" });
      else smoothToStory(v);
    });
  });
  document.querySelectorAll('a[href="#story"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      smoothToStory(0);
    });
  });

  /* ---------- Reveals ---------- */
  document.querySelectorAll(".specs__grid, .section-head, .buy__inner").forEach((group) => {
    group.querySelectorAll(".reveal").forEach((el, i) => el.style.setProperty("--d", (i % 3) * 0.08 + "s"));
  });
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("reveal--in");
        io.unobserve(en.target);
      }
    }),
    { threshold: 0.18 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ---------- Boot ---------- */
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);

  window.addEventListener("scroll", () => {
    nav.classList.toggle("nav--scrolled", window.scrollY > 24);
  }, { passive: true });
  nav.classList.toggle("nav--scrolled", window.scrollY > 24);

  const MIN_SPLASH = 900;
  loadAll.then(() => {
    const wait = Math.max(0, MIN_SPLASH - (performance.now() - startTs));
    setTimeout(() => {
      preloader.classList.add("preloader--done");
      dirty = true;
    }, wait);
  });
})();
