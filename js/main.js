/* GSAP animated profile — single entry, classic script (see spec section 3/10). */
(function () {
  "use strict";

  let lenis = null;
  let bootDone = false;
  let heroRevealed = false;
  let bootTl = null;
  let ringTl = null;

  const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
  const isReduced = () =>
    typeof matchMedia === "function" && matchMedia(REDUCED_QUERY).matches;
  const isFinePointer = () =>
    typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  const GITHUB_FALLBACK = {
    totalRepos: 36,
    forks: 24,
    topName: "Fooocus-Modal",
    topStars: 14,
    createdAt: "2021-06-19",
    verifiedOn: "2026-09-23"
  };
  const CACHE_KEY = "bw-github-stats";
  const CACHE_TTL = 12 * 3600 * 1000;

  const PROJECTS = [
    { name: "Fooocus-Modal", stars: 14, lang: "Python", url: "https://github.com/BarrenWardo/Fooocus-Modal", accent: "var(--accent)" },
    { name: "Py-Books", stars: 6, lang: "Jupyter Notebook", url: "https://github.com/BarrenWardo/Py-Books", accent: "var(--accent-2)" },
    { name: "kserve-skills", stars: 0, lang: "Markdown", url: "https://github.com/BarrenWardo/kserve-skills", accent: "var(--accent-3)" }
  ];

  /* ---------- Lenis (before any ScrollTrigger) ---------- */
  function initLenis() {
    if (typeof gsap === "undefined" || typeof Lenis === "undefined") return;
    if (!isFinePointer()) return;
    const mm = gsap.matchMedia();
    mm.add("(pointer: fine)", () => {
      lenis = new Lenis({ anchors: true, lerp: 0.1 });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      if (document.documentElement.classList.contains("boot")) lenis.stop();
      return () => {
        gsap.ticker.remove(raf);
        lenis.destroy();
        lenis = null;
      };
    });
    gsap.ticker.lagSmoothing(0);
  }

  function scrollToEl(el) {
    if (lenis && typeof lenis.scrollTo === "function") {
      lenis.scrollTo(el, { offset: -20 });
    } else if (el) {
      el.scrollIntoView({ behavior: isReduced() ? "auto" : "smooth" });
    }
  }

  /* ---------- Hero reveal (created after overlay lifts, never at init) ---------- */
  function heroReveal() {
    if (heroRevealed) return;
    heroRevealed = true;
    if (typeof gsap === "undefined") return;
    const reduced = isReduced();

    if (typeof SplitText !== "undefined") {
      try {
        SplitText.create(".hero-name", {
          type: "chars",
          autoSplit: true,
          smartWrap: true,
          onSplit(self) {
            if (self.__settled) return gsap.set(self.chars, { clearProps: "all" });
            self.__settled = true;
            if (reduced) return gsap.set(self.chars, { clearProps: "all" });
            return gsap.from(self.chars, {
              yPercent: 100, rotationX: -90, autoAlpha: 0,
              duration: 0.8, ease: "back.out(1.7)", stagger: 0.04
            });
          }
        });
      } catch (e) { /* split failed: name stays readable */ }
    }

    const tagline = document.getElementById("tagline");
    if (tagline && !reduced && typeof ScrambleTextPlugin !== "undefined") {
      gsap.to(tagline, {
        duration: 1.2, ease: "none",
        scrambleText: { text: "AI aficionado. Forever evolving.", chars: "!<>-_\\/[]{}—=+*^?#", speed: 0.6 }
      });
    }

    const cue = document.querySelector(".scroll-cue span");
    if (cue && !reduced) {
      gsap.to(cue, { y: 8, opacity: 0.4, duration: 0.9, ease: "sine.inOut", repeat: -1, yoyo: true });
    }

    // Hero scroll-out parallax (scrubbed)
    if (!reduced && typeof ScrollTrigger !== "undefined" && window.innerWidth >= 800) {
      gsap.to(".hero-inner", {
        y: -80, autoAlpha: 0.25, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
      });
    }

    setupMagnetic();
    typeIdentityCard();
  }

  function setupMagnetic() {
    if (isReduced() || !isFinePointer() || typeof gsap === "undefined") return;
    document.querySelectorAll(".cta-row .btn").forEach((btn) => {
      const xTo = gsap.quickTo(btn, "x", { duration: 0.3, ease: "power2.out" });
      const yTo = gsap.quickTo(btn, "y", { duration: 0.3, ease: "power2.out" });
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.2);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.2);
      });
      btn.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Boot overlay ---------- */
  function typeLine(container, text, tl, pos) {
    const p = document.createElement("p");
    p.className = "boot-line";
    p.textContent = "";
    container.appendChild(p);
    const o = { n: 0 };
    tl.to(o, {
      n: text.length, duration: Math.max(0.25, text.length * 0.022), ease: "none",
      onUpdate: () => { p.textContent = text.slice(0, Math.round(o.n)); }
    }, pos);
  }

  function finish(opts) {
    const skipped = !!(opts && opts.skipped);
    if (bootDone) return;
    bootDone = true;
    if (bootTl) { try { bootTl.progress(1).kill(); } catch (e) { /* noop */ } }
    document.documentElement.classList.remove("boot");
    if (lenis) { try { lenis.start(); } catch (e) { /* noop */ } }
    if (typeof ScrollTrigger !== "undefined") { try { ScrollTrigger.refresh(); } catch (e) { /* noop */ } }
    const overlay = document.getElementById("boot-overlay");
    if (overlay && typeof gsap !== "undefined" && !isReduced()) {
      gsap.to(overlay, { autoAlpha: 0, duration: 0.4, ease: "power2.out", onComplete: () => { overlay.style.display = "none"; } });
    } else if (overlay) {
      overlay.style.display = "none";
    }
    heroReveal();
    if (skipped) {
      const h1 = document.querySelector("h1");
      if (h1) {
        try { h1.focus({ preventScroll: true }); } catch (e) { h1.focus(); }
        if (lenis) { try { lenis.scrollTo(h1, { immediate: true }); } catch (e) { /* noop */ } }
        else h1.scrollIntoView();
      }
    }
  }

  function initBoot() {
    const overlay = document.getElementById("boot-overlay");
    const booted = document.documentElement.classList.contains("boot");
    if (!booted || !overlay || typeof gsap === "undefined" || isReduced()) {
      bootDone = true;
      if (overlay && !booted) overlay.style.display = "none";
      heroReveal();
      return;
    }
    const linesBox = document.getElementById("boot-lines");
    // BIOS version tracks the loaded GSAP build instead of rotting hardcoded.
    try {
      const v = (window.gsap && window.gsap.version) || "3.15.0";
      const first = overlay.querySelector(".boot-line--first");
      if (first) first.textContent = "BARRENWARD BIOS v" + v;
    } catch (e) { /* keep markup fallback */ }
    const bar = document.getElementById("boot-bar");
    const granted = document.getElementById("boot-granted");
    const mobile = window.innerWidth < 800;
    const lines = mobile
      ? ["MEMORY: CURIOSITY OK", "fetch(https://barrenwardo.github.io) … 200 OK", "[ OK ] evolving…"]
      : ["MEMORY: CURIOSITY OK", "CAFFEINE LEVELS: NOMINAL", "[ OK ] mounting /dev/passion",
         "[ OK ] loading module: ai_aficionado.ko", "fetch(https://barrenwardo.github.io) … 200 OK", "[ OK ] evolving…"];
    bootTl = gsap.timeline();
    lines.forEach((ln) => typeLine(linesBox, ln, bootTl, ">"));
    if (bar) bootTl.to(bar, { scaleX: 1, duration: 0.8, ease: "power1.inOut" }, ">");
    if (granted) {
      bootTl.to(granted, { opacity: 1, duration: 0.15 }, ">");
      bootTl.to(overlay, { autoAlpha: 0, duration: 0.45, ease: "power2.in" }, "+=0.25");
    }
    bootTl.eventCallback("onComplete", () => finish());

    const t0 = Date.now();
    const skip = document.getElementById("skip-intro");
    const doSkip = () => { if (Date.now() - t0 > 150) finish({ skipped: true }); };
    if (skip) skip.addEventListener("click", doSkip);
    window.addEventListener("keydown", doSkip);
    overlay.addEventListener("touchstart", doSkip, { passive: true });
  }

  /* ---------- Signal board ---------- */
  function yearsSince(iso) {
    const then = new Date(iso).getTime();
    if (isNaN(then)) return 5;
    return Math.max(0, Math.floor((Date.now() - then) / (365.25 * 24 * 3600 * 1000)));
  }

  function readCache() {
    try {
      const raw = store.get(CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw);
      if (!c || !c.data || (Date.now() - c.ts) > CACHE_TTL) return null;
      return c.data;
    } catch (e) { return null; }
  }

  async function fetchStats() {
    const res = await fetch("https://api.github.com/users/BarrenWardo/repos?per_page=100&sort=stars");
    if (!res.ok) throw new Error("repos " + res.status);
    const repos = await res.json();
    const originals = repos.filter((r) => !r.fork).length;
    const forks = repos.filter((r) => r.fork).length;
    const top = repos.reduce((a, b) => ((b.stargazers_count || 0) > (a.stargazers_count || 0) ? b : a), repos[0] || {});
    let createdAt = GITHUB_FALLBACK.createdAt;
    try {
      const u = await fetch("https://api.github.com/users/BarrenWardo");
      if (u.ok) { const uj = await u.json(); if (uj.created_at) createdAt = uj.created_at; }
    } catch (e) { /* keep fallback */ }
    return {
      totalRepos: repos.length || GITHUB_FALLBACK.totalRepos,
      forks, originals,
      topName: top.name || GITHUB_FALLBACK.topName,
      topStars: top.stargazers_count != null ? top.stargazers_count : GITHUB_FALLBACK.topStars,
      createdAt
    };
  }

  function renderStats(d) {
    const years = yearsSince(d.createdAt);
    const year0 = new Date(d.createdAt).getFullYear() || 2021;
    const map = { originals: d.originals, topStars: d.topStars, years };
    const subs = {
      originals: "of " + d.totalRepos + " total · " + d.forks + " forks",
      top: "stars · " + d.topName,
      years: "on GitHub since " + year0
    };
    document.querySelectorAll("[data-counter]").forEach((el) => {
      el.textContent = String(map[el.dataset.key] != null ? map[el.dataset.key] : el.textContent);
    });
    document.querySelectorAll("[data-sub]").forEach((el) => {
      if (subs[el.dataset.sub]) el.textContent = subs[el.dataset.sub];
    });
    const cards = document.querySelectorAll(".signal-card");
    if (cards[0]) cards[0].setAttribute("aria-label", "Original repositories: " + d.originals);
    if (cards[1]) cards[1].setAttribute("aria-label", "Top repository " + d.topName + ": " + d.topStars + " stars");
    if (cards[2]) cards[2].setAttribute("aria-label", "Years building: " + years);
    return map;
  }

  function countUp(map) {
    if (isReduced() || typeof gsap === "undefined") return;
    document.querySelectorAll("[data-counter]").forEach((el, i) => {
      const target = map[el.dataset.key];
      if (target == null) return;
      el.textContent = "0";
      const o = { v: 0 };
      gsap.to(o, {
        v: target, duration: 1.2, delay: i * 0.12, ease: "power2.out",
        onUpdate: () => { el.textContent = String(Math.round(o.v)); },
        scrollTrigger: { trigger: "#signals", start: "top 80%", once: true }
      });
    });
  }

  async function initStats() {
    const grid = document.getElementById("signal-grid");
    if (grid) grid.classList.add("skeleton");
    let data = null;
    try {
      data = readCache();
      if (!data) {
        data = await fetchStats();
        store.set(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      }
    } catch (e) {
      data = readCache() || {
        totalRepos: GITHUB_FALLBACK.totalRepos, forks: GITHUB_FALLBACK.forks,
        originals: GITHUB_FALLBACK.totalRepos - GITHUB_FALLBACK.forks,
        topName: GITHUB_FALLBACK.topName, topStars: GITHUB_FALLBACK.topStars,
        createdAt: GITHUB_FALLBACK.createdAt
      };
    } finally {
      if (grid) grid.classList.remove("skeleton");
      let map = null;
      try { map = renderStats(data); } catch (e) { /* static markup stays */ }
      if (map) countUp(map);
      if (typeof ScrollTrigger !== "undefined") { try { ScrollTrigger.refresh(); } catch (e) { /* noop */ } }
    }
  }

  /* ---------- Orbit ---------- */
  function initOrbit() {
    const stage = document.getElementById("orbit-stage");
    const items = Array.from(document.querySelectorAll(".orbit-item"));
    if (!stage || !items.length || typeof gsap === "undefined") return;
    const reduced = isReduced();
    const desktop = window.innerWidth >= 800;

    if (desktop) {
      const cx = 50, cy = 50, rx = 42, ry = 38;
      items.forEach((el, i) => {
        const a = (i / items.length) * Math.PI * 2 - Math.PI / 2;
        el.style.left = "calc(" + (cx + rx * Math.cos(a)) + "% - 36px)";
        el.style.top = "calc(" + (cy + ry * Math.sin(a)) + "% - 24px)";
      });
    }

    if (reduced || typeof ScrollTrigger === "undefined") return;

    ringTl = gsap.to(".orbit-ring", { rotation: 360, repeat: -1, ease: "none", duration: 50 });

    if (!desktop) return; // mobile: compact grid, no pin

    // Breathing instead of riding the ring
    items.forEach((el, i) => {
      gsap.to(el, { y: 8 + (i % 3) * 3, duration: 2.4 + (i % 4) * 0.4, ease: "sine.inOut", repeat: -1, yoyo: true });
    });

    ScrollTrigger.create({
      trigger: ".orbit", start: "top bottom", end: "bottom top",
      onUpdate(self) {
        const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(self.getVelocity()) / 1200);
        gsap.to(ringTl, { timeScale: boost, duration: 0.6, ease: "power2.out", overwrite: true });
      }
    });

    ScrollTrigger.create({
      trigger: ".orbit-stage", start: "top 70%", end: "+=60%", pin: true, scrub: true,
      onUpdate(self) {
        gsap.set(".orbit-core", { scale: 1 + self.progress * 0.25 });
      }
    });

    if (isFinePointer()) {
      const rxTo = gsap.quickTo(".orbit-stage", "rotationX", { duration: 0.6, ease: "power2.out" });
      const ryTo = gsap.quickTo(".orbit-stage", "rotationY", { duration: 0.6, ease: "power2.out" });
      stage.addEventListener("mousemove", (e) => {
        const r = stage.getBoundingClientRect();
        ryTo(((e.clientX - r.left) / r.width - 0.5) * 12);
        rxTo(-((e.clientY - r.top) / r.height - 0.5) * 12);
      });
      stage.addEventListener("mouseleave", () => { rxTo(0); ryTo(0); });
    }
  }

  /* ---------- Batch reveals + contact ---------- */
  function initReveals() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined" || isReduced()) return;
    document.documentElement.classList.add("js-reveal");
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 88%",
      onEnter: (els) => gsap.to(els, {
        autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.08, overwrite: true,
        startAt: { y: 40 }
      }),
      once: true
    });
    gsap.set("[data-reveal]", { autoAlpha: 0 });
    const ch = document.querySelector("[data-reveal-heading]");
    if (ch && typeof SplitText !== "undefined") {
      try {
        SplitText.create(ch, {
          type: "lines", autoSplit: true,
          onSplit(self) {
            if (self.__settled) return gsap.set(self.lines, { clearProps: "all" });
            self.__settled = true;
            return gsap.from(self.lines, {
              yPercent: 60, autoAlpha: 0, duration: 0.7, ease: "power2.out", stagger: 0.1,
              scrollTrigger: { trigger: ch, start: "top 85%", once: true }
            });
          }
        });
      } catch (e) { gsap.set(ch, { clearProps: "all" }); }
    }
  }

  function initProjectTilt() {
    if (isReduced() || !isFinePointer() || typeof gsap === "undefined") return;
    document.querySelectorAll(".project-card").forEach((card) => {
      const rX = gsap.quickTo(card, "rotationX", { duration: 0.4, ease: "power2.out" });
      const rY = gsap.quickTo(card, "rotationY", { duration: 0.4, ease: "power2.out" });
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        rY(((e.clientX - r.left) / r.width - 0.5) * 10);
        rX(-((e.clientY - r.top) / r.height - 0.5) * 10);
      });
      card.addEventListener("mouseleave", () => { rX(0); rY(0); gsap.to(card, { y: 0, duration: 0.3 }); });
      card.addEventListener("mouseenter", () => { gsap.to(card, { y: -6, duration: 0.3 }); });
    });
  }

  /* ---------- Ambient ---------- */
  function initAmbient() {
    if (typeof gsap === "undefined") return;
    const reduced = isReduced();
    if (!reduced) {
      document.querySelectorAll(".blob").forEach((b, i) => {
        gsap.to(b, {
          x: gsap.utils.random(-90, 90), y: gsap.utils.random(-70, 70),
          scale: gsap.utils.random(0.9, 1.25),
          duration: 18 + i * 6, ease: "sine.inOut", repeat: -1, yoyo: true, repeatRefresh: true
        });
      });
    }
    initParticles();
    if (!reduced && isFinePointer()) {
      const glow = document.getElementById("cursor-glow");
      if (glow) {
        const xTo = gsap.quickTo(glow, "x", { duration: 0.4, ease: "power2.out" });
        const yTo = gsap.quickTo(glow, "y", { duration: 0.4, ease: "power2.out" });
        window.addEventListener("mousemove", (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
      }
    } else {
      const glow = document.getElementById("cursor-glow");
      if (glow) glow.style.display = "none";
    }
    if (typeof ScrollTrigger !== "undefined" && !reduced) {
      const bar = document.querySelector(".progress-bar");
      if (bar) {
        ScrollTrigger.create({
          trigger: document.body, start: "top top", end: "max", scrub: 0.3,
          onUpdate: (self) => gsap.set(bar, { scaleX: self.progress })
        });
      }
    }
  }

  let particleMode = "drift";
  function initParticles() {
    const canvas = document.getElementById("particles");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = isReduced();
    let dots = [];
    let running = !reduced;
    let visible = true;

    function resize() {
      const r = canvas.parentElement.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width));
      canvas.height = Math.max(1, Math.floor(r.height));
    }
    function seed() {
      const n = window.innerWidth < 800 ? 12 : 24;
      dots = Array.from({ length: reduced ? 0 : n }, () => ({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0006, vy: -(0.0004 + Math.random() * 0.0009),
        r: 1 + Math.random() * 1.8, sx: 0, sv: 0
      }));
    }
    resize(); seed();
    window.addEventListener("resize", () => { resize(); });

    document.addEventListener("visibilitychange", () => {
      running = !document.hidden && !reduced;
    });
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({
        trigger: ".ambient", start: "top bottom", end: "bottom top",
        onToggle: (self) => { visible = self.isActive; }
      });
    }

    function frame() {
      if (running && visible && dots.length) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const theme = document.documentElement.dataset.theme;
        ctx.fillStyle = theme === "light" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.55)";
        dots.forEach((d) => {
          if (particleMode === "hyperdrive") {
            d.sy = (d.sy || 0) + 0.9;
            ctx.fillRect(d.x * canvas.width, ((d.y * canvas.height + d.sy * 20) % canvas.height + canvas.height) % canvas.height, 1.5, 8 + d.sy);
          } else if (particleMode === "matrix") {
            ctx.fillStyle = theme === "light" ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.8)";
            ctx.fillRect(d.x * canvas.width, (d.y * canvas.height) % canvas.height, 2, 6);
            ctx.fillStyle = theme === "light" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.55)";
          } else {
            ctx.beginPath();
            ctx.arc(d.x * canvas.width, d.y * canvas.height, d.r, 0, Math.PI * 2);
            ctx.fill();
          }
          d.x += d.vx; d.y += d.vy * (particleMode === "drift" ? 1 : 6);
          if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); }
          if (d.x < -0.02) d.x = 1.02; else if (d.x > 1.02) d.x = -0.02;
        });
      }
      requestAnimationFrame(frame);
    }
    // One rAF for canvas pixels; scroll smoothing stays on gsap.ticker (single loop per spec: Lenis on ticker).
    requestAnimationFrame(frame);
  }

  function canvasEffect(mode, ms) {
    if (isReduced() || particleMode !== "drift") return;
    particleMode = mode;
    setTimeout(() => { particleMode = "drift"; }, ms);
  }

  /* ---------- Theme toggle ---------- */
  function currentTheme() { return document.documentElement.dataset.theme === "light" ? "light" : "dark"; }
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.setAttribute("aria-pressed", t === "light" ? "true" : "false");
    store.set("theme", t);
  }
  function initTheme() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", currentTheme() === "light" ? "true" : "false");
    btn.addEventListener("click", () => {
      const from = currentTheme();
      const to = from === "light" ? "dark" : "light";
      if (isReduced() || typeof gsap === "undefined") { applyTheme(to); return; }
      const wipe = document.createElement("div");
      wipe.className = "theme-wipe";
      wipe.style.background = from === "dark" ? "#050810" : "#f3f6ff";
      const r = btn.getBoundingClientRect();
      wipe.style.setProperty("--ox", (r.left + r.width / 2) + "px");
      wipe.style.setProperty("--oy", (r.top + r.height / 2) + "px");
      document.body.appendChild(wipe);
      applyTheme(to); // real theme flips instantly underneath; wipe carries outgoing palette away
      const o = { r: 0 };
      gsap.to(o, {
        r: Math.hypot(innerWidth, innerHeight), duration: 0.7, ease: "power3.inOut",
        onUpdate: () => wipe.style.setProperty("--reveal", o.r + "px"),
        onComplete: () => wipe.remove()
      });
    });
  }

  /* ---------- Terminal + easter eggs ---------- */
  const hist = [];
  let histIdx = -1;

  function termPrint(box, text) {
    const p = document.createElement("div");
    p.textContent = text;
    box.appendChild(p);
    box.scrollTop = box.scrollHeight;
  }

  function typeIdentityCard() {
    const box = document.getElementById("term-output");
    if (!box) return;
    const lines = ["$ whoami", "> AI aficionado. Forever evolving.", "> learning, experimenting, coding — daily."];
    if (isReduced() || typeof gsap === "undefined") {
      lines.forEach((l) => termPrint(box, l));
      return;
    }
    const tl = gsap.timeline({ delay: 0.2 });
    lines.forEach((ln) => {
      const p = document.createElement("div");
      p.textContent = "";
      box.appendChild(p);
      const o = { n: 0 };
      tl.to(o, {
        n: ln.length, duration: Math.max(0.3, ln.length * 0.03), ease: "none",
        onUpdate: () => { p.textContent = ln.slice(0, Math.round(o.n)); box.scrollTop = box.scrollHeight; }
      });
    });
  }

  function runCommand(raw) {
    const box = document.getElementById("term-output");
    const cmd = raw.trim();
    if (!cmd) return;
    termPrint(box, "$ " + cmd);
    const [base, ...rest] = cmd.split(/\s+/);
    const b = base.toLowerCase();
    if (b === "help") {
      termPrint(box, "commands: whoami · ls · theme · matrix · clear · sudo make me a sandwich");
    } else if (b === "whoami") {
      termPrint(box, "barrenwardo — AI aficionado. Forever evolving.");
    } else if (b === "ls") {
      termPrint(box, "hero  orbit  signals  projects  contact");
      const target = (rest[0] || "").toLowerCase();
      const ids = { hero: "top", orbit: "orbit", signals: "signals", projects: "projects", contact: "contact" };
      if (ids[target]) {
        const el = document.getElementById(ids[target]);
        if (el) scrollToEl(el);
      } else if (target) {
        termPrint(box, "ls: no such section: " + rest[0] + " — try: ls projects");
      } else {
        termPrint(box, "try: ls projects");
      }
    } else if (b === "theme") {
      const to = currentTheme() === "light" ? "dark" : "light";
      applyTheme(to);
      termPrint(box, "theme → " + to);
    } else if (b === "clear") {
      box.innerHTML = "";
    } else if (b === "matrix") {
      if (isReduced()) termPrint(box, "matrix: disabled under reduced motion.");
      else { canvasEffect("matrix", 5000); termPrint(box, "wake up, Neo… (5s)"); }
    } else if (cmd.toLowerCase() === "sudo make me a sandwich") {
      termPrint(box, "permission denied… just kidding. 🥪 here you go.");
    } else {
      termPrint(box, "command not found: " + base + " — try: help");
    }
  }

  function initTerminal() {
    const form = document.getElementById("term-form");
    const input = document.getElementById("term-input");
    if (!form || !input) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      hist.push(input.value);
      histIdx = hist.length;
      runCommand(input.value);
      input.value = "";
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault(); // must not scroll the page while focused
        if (!hist.length) return;
        histIdx = e.key === "ArrowUp"
          ? Math.max(0, histIdx - 1)
          : Math.min(hist.length, histIdx + 1);
        input.value = hist[histIdx] || "";
      }
    });
    // Konami → hyperdrive (desktop keyboard-only; matrix covers mobile)
    const seq = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let pos = 0;
    window.addEventListener("keydown", (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = (k === seq[pos]) ? pos + 1 : (k === seq[0] ? 1 : 0);
      if (pos === seq.length) {
        pos = 0;
        if (!isReduced() && isFinePointer()) {
          canvasEffect("hyperdrive", 6000);
          const box = document.getElementById("term-output");
          if (box) termPrint(box, "HYPERDRIVE engaged (6s)");
        }
      }
    });
  }

  function initFooter() {
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ---------- init ---------- */
  function init() {
    if (typeof gsap === "undefined") {
      document.documentElement.classList.add("no-anim");
      const o = document.getElementById("boot-overlay");
      if (o) o.style.display = "none";
      try { initTheme(); } catch (e) { /* noop */ }
      try { initTerminal(); } catch (e) { /* noop */ }
      try { initFooter(); } catch (e) { /* noop */ }
      try { initStats(); } catch (e) { /* noop */ }
      try { heroRevealFallback(); } catch (e) { /* static markup stays */ }
      return;
    }
    gsap.registerPlugin.apply(gsap, [ScrollTrigger, SplitText, ScrambleTextPlugin].filter(function (p) { return p; }));
    initLenis();
    initTheme();
    initTerminal();
    initFooter();
    initAmbient();
    initReveals();
    initOrbit();
    initProjectTilt();
    initBoot();
    initStats();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { try { ScrollTrigger.refresh(); } catch (e) { /* noop */ } });
    }
  }

  function heroRevealFallback() {
    const box = document.getElementById("term-output");
    if (box && !box.children.length) {
      ["$ whoami", "> AI aficionado. Forever evolving.", "> learning, experimenting, coding — daily."]
        .forEach((l) => termPrint(box, l));
    }
    const y = document.getElementById("year");
    if (y) y.textContent = String(new Date().getFullYear());
  }

  try {
    init();
  } catch (err) {
    console.warn("init failed, falling back to static", err);
    const h = document.documentElement;
    h.classList.remove("js-reveal", "boot");
    h.classList.add("no-anim");
    const o = document.getElementById("boot-overlay");
    if (o) o.style.display = "none";
    try { if (lenis) lenis.start(); } catch (e) { /* noop */ }
    try { heroRevealFallback(); } catch (e) { /* static markup stays */ }
  }
})();
