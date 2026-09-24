/* GSAP animated profile — single entry, classic script (see spec section 3/10). */
(function () {
  "use strict";

  /* Owned here, published before fluid:ready can fire, and read by BOTH the theme
     wipe and the fluid's palette crossfade so the two clocks cannot drift apart
     (spec §6.9). */
  window.THEME_WIPE = { duration: 0.7, ease: "power3.inOut" };

  let lenis = null;
  let bootDone = false;
  let heroRevealed = false;
  let bootTl = null;
  let ringTl = null;
  let blobTweens = [];
  let heroFluidStarted = false;
  let heroFluidReady = false;
  let echoFluidStarted = false;
  let fluidCommitted = false;
  let fluidDeadline = 0;
  let fluidVisibilityInstalled = false;
  let seedDots = null;
  let dotsExist = () => false;

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

  /* ---------- Fluid handshake (spec §3) ---------- */

  /* Named handler with teardown on BOTH arms: a module that never loads fires no
     event, and a module that loads late must not swap the media layer. */
  function onFluidReady() {
    if (fluidCommitted) return;
    fluidCommitted = true;
    window.removeEventListener("fluid:ready", onFluidReady);
    startHeroFluidOnce();
    initFluidVisibility();   // module arrived late: install pausing now (§4)
  }

  /* The only entry point that may create the hero sim — guarded, so boot
     completion, a skip, and a late module can all call it harmlessly. */
  function startHeroFluidOnce() {
    if (heroFluidStarted || !window.Fluid) return;
    heroFluidStarted = true;
    window.Fluid.init("hero", {});
  }

  /* Deadline is anchored to the reveal, not to script init: init runs under the
     opaque boot overlay, where a 3s window would already have expired (spec §3). */
  function beginFluidWindow() {
    if (fluidCommitted) return;
    if (window.Fluid) {
      fluidCommitted = true;
      window.removeEventListener("fluid:ready", onFluidReady);
      startHeroFluidOnce();
      initFluidVisibility();   // module was already here: install pausing now
      return;
    }
    fluidDeadline = performance.now() + 3000;
    window.addEventListener("fluid:ready", onFluidReady, { once: true });
    setTimeout(() => {
      if (fluidCommitted) return;
      fluidCommitted = true;            // permanent for this page load
      window.removeEventListener("fluid:ready", onFluidReady);
    }, Math.max(0, fluidDeadline - performance.now()));
  }

  function fluidInject(splat) {
    if (!heroFluidReady || !window.Fluid || typeof window.Fluid.inject !== "function") return;
    window.Fluid.inject(splat);
  }

  /* Screen → sim UV. The hero canvas spans `.ambient` (fixed, inset 0), so
     viewport coordinates are already canvas coordinates; only normalization and
     the y-flip are missing — the shader's uv origin is bottom-left (spec §4). */
  function heroUV(clientX, clientY) {
    /* Plain clamp, not gsap.utils: the terminal path can reach this under the
       no-GSAP early exit (spec §6.4's own reason for banning gsap.utils.random
       inside fluid.js). Prefer the live canvas rect so a future layout change
       cannot silently mis-map couplings; viewport dims are the fallback. */
    const clamp01 = (n) => Math.min(1, Math.max(0, n));
    try {
      const c = document.querySelector(".ambient .fluid-canvas");
      if (c) {
        const r = c.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return { x: clamp01((clientX - r.left) / r.width), y: clamp01(1 - (clientY - r.top) / r.height) };
        }
      }
    } catch (e) { /* fall through to viewport math */ }
    return {
      x: clamp01(clientX / Math.max(1, innerWidth)),
      y: clamp01(1 - clientY / Math.max(1, innerHeight))
    };
  }

  /* The palette ribbon is sage → amber → oxblood → cobalt, so amber sits at ¼ of
     the cycle and cobalt at ¾ (spec §6.4). */
  const PHASE_AMBER = 0.25;

  function fluidStir(opts) {
    if (!heroFluidReady || !window.Fluid) return;
    try { window.Fluid.stir(opts); } catch (e) { /* degrades to the starfield */ }
  }

  function fluidTint(opts) {
    if (!heroFluidReady || !window.Fluid) return;
    try { window.Fluid.tint(opts); } catch (e) { /* tint is optional */ }
  }

  /* Blobs are paused, never killed, so the fallback is a resume rather than a
     rebuild (spec §6.11). */
  function setBlobsLive(live) {
    document.querySelectorAll(".ambient .blob").forEach((b) => {
      b.style.display = live ? "" : "none";
    });
    blobTweens.forEach((t) => { if (live) { t.resume(); } else { t.pause(); } });
  }

  function initFluidBridge() {
    window.addEventListener("fluid:first-frame", (e) => {
      const name = e.detail && e.detail.instance;
      if (name !== "hero") return;
      try { initFluidVisibility(); } catch (err) { /* ScrollTrigger may still be missing */ }
      heroFluidReady = true;
      /* Hide the blobs only after the canvas has faded in, so the handoff reads as
         a cross-fade rather than a dip through the page background. */
      setTimeout(() => { if (heroFluidReady) setBlobsLive(false); }, 620);
    });
    window.addEventListener("fluid:fallback", (e) => {
      const name = e.detail && e.detail.instance;
      if (name !== "hero") return;
      heroFluidReady = false;
      setBlobsLive(true);
    });
  }

  function startEchoFluidOnce() {
    if (echoFluidStarted || !window.Fluid) return;
    echoFluidStarted = true;
    window.Fluid.init("echo", { quality: "low" });
  }

  /* Off-viewport pausing is mandatory, not an optimisation (spec §4). The echo is
     also created lazily here, so only one WebGL context exists until the band is
     actually approached — which keeps the likeliest iOS failure from happening. */
  function initFluidVisibility() {
    if (fluidVisibilityInstalled) return;
    if (!window.Fluid) return;
    // Partial-CDN path (GSAP core without ScrollTrigger, or ScrollTrigger late):
    // an IntersectionObserver enforces the same §4 pausing without the plugin.
    if (typeof ScrollTrigger === "undefined") {
      if (typeof IntersectionObserver === "undefined") return;   // retried on first-frame
      fluidVisibilityInstalled = true;
      const set = (inst, on) => { try { window.Fluid.setVisible(inst, on); } catch (e) { /* noop */ } };
      const hero = document.querySelector(".hero");
      const band = document.querySelector(".signals");
      if (hero) {
        new IntersectionObserver((es) => {
          es.forEach((en) => { set("hero", en.isIntersecting); });
        }, { threshold: 0 }).observe(hero);
      }
      if (band) {
        new IntersectionObserver((es) => {
          es.forEach((en) => {
            if (en.isIntersecting) { startEchoFluidOnce(); set("echo", true); }
            else { set("echo", false); }
          });
        }, { threshold: 0 }).observe(band);
      }
      return;
    }
    fluidVisibilityInstalled = true;
    ScrollTrigger.create({
      trigger: ".hero", start: "top top", end: "bottom top",
      onToggle: (self) => { try { window.Fluid.setVisible("hero", self.isActive); } catch (e) { /* noop */ } }
    });
    ScrollTrigger.create({
      trigger: ".signals", start: "top bottom", end: "bottom top",
      onToggle: (self) => {
        try {
          if (self.isActive) { startEchoFluidOnce(); window.Fluid.setVisible("echo", true); }
          else { window.Fluid.setVisible("echo", false); }
        } catch (e) { /* noop */ }
      }
    });
  }

  /* ---------- Nav blending (spec §6.15) ---------- */
  /* Difference keeps the nav part of the artwork over the fluid and is scoped to
     the hero's scroll range; past it the nav resolves to var(--text). The
     obsidian signal band is black in both themes, so it gets its own white state
     rather than trusting the light theme's --text. Runs even under reduced
     motion: this is a contrast fix, not an animation. */
  function initNavBlend() {
    const root = document.documentElement;
    const hero = document.querySelector(".hero");
    if (!hero) return;
    const signals = document.querySelector(".signals");
    const NAV_BAND = 96; // nav height + breathing room

    /* Deterministic first paint — never wait for a ScrollTrigger's first refresh
       to decide whether the nav is legible. */
    const heroRect = hero.getBoundingClientRect();
    root.classList.toggle("nav-blend", heroRect.top <= 0 && heroRect.bottom > NAV_BAND);

    if (typeof ScrollTrigger === "undefined") return;
    ScrollTrigger.create({
      trigger: hero, start: "top top", end: "bottom " + NAV_BAND + "px",
      onToggle: (self) => root.classList.toggle("nav-blend", self.isActive)
    });
    if (signals) {
      ScrollTrigger.create({
        trigger: signals, start: "top " + NAV_BAND + "px", end: "bottom " + NAV_BAND + "px",
        onToggle: (self) => root.classList.toggle("nav-on-dark", self.isActive)
      });
    }
  }

  /* ---------- Hero reveal (created after overlay lifts, never at init) ---------- */
  function heroReveal() {
    if (heroRevealed) return;
    heroRevealed = true;
    beginFluidWindow();
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
      /* Coupling 1: one warm, diffuse bloom beneath the element's center on
         enter only — never per mousemove. Physically it should read as a warm
         hand held near the liquid, not a sharp poke (spec §6.4). */
      btn.addEventListener("mouseenter", () => {
        if (!heroFluidReady) return;
        const r = btn.getBoundingClientRect();
        const uv = heroUV(r.left + r.width / 2, r.top + r.height * 0.75);
        fluidInject({
          x: uv.x, y: uv.y,
          dx: (Math.random() - 0.5) * 6, dy: (Math.random() - 0.5) * 6,
          radius: 0.25,
          phase: PHASE_AMBER + (Math.random() - 0.5) * 0.08,
          energy: 0.9, kind: "pointer"
        });
      });
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
        const v = self.getVelocity();
        const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(v) / 1200);
        gsap.to(ringTl, { timeScale: boost, duration: 0.6, ease: "power2.out", overwrite: true });
        /* Drive 3: scroll velocity pushes the fluid while scrolling. The sim's
           own splat cap absorbs the event rate; this only gates the threshold. */
        if (heroFluidReady && Math.abs(v) > 250) {
          fluidInject({
            x: 0.5, y: 0.42,
            dx: gsap.utils.clamp(-6, 6, v / 700), dy: gsap.utils.clamp(-6, 6, v / 1400),
            radius: 0.26, phase: Math.random(), energy: 0.9, kind: "scroll"
          });
        }
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
      onEnter: (els) => {
        /* Coupling 3: each reveal batch sends ONE slow, wide impulse — it batches
           into the same single splat pass as scroll velocity, never a second
           pass (spec §6.4, §6.1). */
        const first = els[0];
        if (heroFluidReady && first) {
          const r = first.getBoundingClientRect();
          const uv = heroUV(r.left + r.width / 2, r.top + Math.min(r.height, innerHeight) / 2);
          fluidInject({
            x: uv.x, y: uv.y,
            dx: (Math.random() - 0.5) * 6, dy: (Math.random() - 0.5) * 6,
            radius: 0.3,
            phase: Math.random(),
            energy: gsap.utils.clamp(0.4, 1, r.height / Math.max(1, innerHeight) + 0.3),
            kind: "reveal"
          });
        }
        return gsap.to(els, {
          autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out", stagger: 0.08, overwrite: true,
          startAt: { y: 40 }
        });
      },
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
    const fluidLive = !!(window.Fluid && window.Fluid.status === "ready" && heroFluidStarted);
    if (!reduced && !fluidLive) {
      /* Plain per-blob tweens (not a timeline), kept in an array so the fluid
         handoff can PAUSE and RESUME them. Never killed: that is what makes the
         fallback a resume instead of a rebuild (spec §6.11). */
      blobTweens = Array.from(document.querySelectorAll(".blob")).map((b, i) => gsap.to(b, {
        x: gsap.utils.random(-90, 90), y: gsap.utils.random(-70, 70),
        scale: gsap.utils.random(0.9, 1.25),
        duration: 18 + i * 6, ease: "sine.inOut", repeat: -1, yoyo: true, repeatRefresh: true
      }));
    }
    initParticles();
    /* The cursor glow is retired: the fluid answers the pointer directly, and a
       second pointer-following layer would only advertise it twice (§6.13). */
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
    /* Drift is retired (spec §6.13): the canvas starts empty and allocates dots
       only when an easter-egg mode asks for them. Modes must therefore be able
       to cold-start their own state — visibility pausing gates stepping, never
       mode entry. */
    seedDots = function seed() {
      const n = window.innerWidth < 800 ? 12 : 24;
      dots = Array.from({ length: reduced ? 0 : n }, () => ({
        x: Math.random(), y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0006, vy: -(0.0004 + Math.random() * 0.0009),
        r: 1 + Math.random() * 1.8, sx: 0, sv: 0
      }));
    };
    dotsExist = () => dots.length > 0;
    resize();
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
      /* Drift no longer renders at all — the fluid is the ambient layer. The
         canvas exists purely for the two easter-egg modes. */
      if (running && visible && dots.length && particleMode !== "drift") {
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
          }
          d.x += d.vx; d.y += d.vy * 6;
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
    /* Cold-start dot state on entry — never gated on visibility (spec §6.13). */
    if (!dotsExist() && seedDots) seedDots();
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
  /* One path for every theme change, so the button and the terminal command can
     never diverge, and the fluid crossfade always rides the wipe's own clock
     (spec §6.9). Returns the new theme. */
  function switchTheme(originEl) {
    const from = currentTheme();
    const to = from === "light" ? "dark" : "light";
    const notify = () => {
      if (window.Fluid && typeof window.Fluid.setTheme === "function") {
        try { window.Fluid.setTheme(to); } catch (e) { /* keep the static palette */ }
      }
    };
    if (isReduced() || typeof gsap === "undefined") { applyTheme(to); notify(); return to; }

    const wipe = document.createElement("div");
    wipe.className = "theme-wipe";
    /* Paint from the OUTGOING theme's real background. The previous literals
       (#050810 / #f3f6ff) were the retired aurora palette, and against the new
       fluid they read as a colour cast crossing the page. */
    const outgoing = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    wipe.style.background = outgoing || (from === "dark" ? "#000000" : "#ffffff");

    const el = originEl || document.getElementById("theme-toggle");
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: 0, width: 0, height: 0 };
    wipe.style.setProperty("--ox", (r.left + r.width / 2) + "px");
    wipe.style.setProperty("--oy", (r.top + r.height / 2) + "px");
    document.body.appendChild(wipe);

    applyTheme(to); // the real theme flips instantly underneath; the wipe carries the old palette away
    notify();

    const o = { r: 0 };
    gsap.to(o, {
      r: Math.hypot(innerWidth, innerHeight),
      duration: window.THEME_WIPE.duration,
      ease: window.THEME_WIPE.ease,
      onUpdate: () => wipe.style.setProperty("--reveal", o.r + "px"),
      onComplete: () => wipe.remove()
    });
    return to;
  }

  function initTheme() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", currentTheme() === "light" ? "true" : "false");
    btn.addEventListener("click", () => { switchTheme(btn); });
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
      termPrint(box, "theme → " + switchTheme());
    } else if (b === "clear") {
      box.innerHTML = "";
    } else if (b === "matrix") {
      if (isReduced()) termPrint(box, "matrix: disabled under reduced motion.");
      else {
        /* Tint clock lives inside the stir clock: ~5s tint within ~6s stir, and
           the tint releases onto whatever palette is current (spec §6.14). */
        canvasEffect("matrix", 5000);
        fluidStir({ intensity: 1, durationMs: 6000 });
        fluidTint({ color: [0.2, 1.0, 0.35], rampMs: 500, holdMs: 4500 });
        termPrint(box, "wake up, Neo… (5s)");
      }
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
        return;
      }
      /* Coupling 2: a key that actually inserts a character stirs the field.
         IME composition, paste and mobile predictive text do not count (§6.4). */
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && heroFluidReady && !isReduced()) {
        const r = input.getBoundingClientRect();
        const uv = heroUV(r.left + r.width / 2, r.top + r.height / 2);
        fluidInject({
          x: uv.x, y: uv.y,
          dx: (Math.random() - 0.5) * 4, dy: (Math.random() - 0.5) * 4,
          radius: 0.125, phase: Math.random(), energy: 0.7, kind: "pointer"
        });
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
          /* The page's best easter egg, now reaching its largest surface. */
          fluidStir({ intensity: 1, durationMs: 6000 });
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
      // The sim must work when GSAP is blocked but OGL loaded fine (§6.4, §7):
      // the bridge + window + visibility wiring below are all GSAP-free.
      try { initFluidBridge(); } catch (e) { /* noop */ }
      try { beginFluidWindow(); } catch (e) { /* noop */ }
      try { initFluidVisibility(); } catch (e) { /* noop */ }
      return;
    }
    gsap.registerPlugin.apply(gsap, [
      typeof ScrollTrigger !== "undefined" ? ScrollTrigger : null,
      typeof SplitText !== "undefined" ? SplitText : null,
      typeof ScrambleTextPlugin !== "undefined" ? ScrambleTextPlugin : null
    ].filter(function (p) { return p; }));
    initLenis();
    initTheme();
    initTerminal();
    initFooter();
    initAmbient();
    initReveals();
    initOrbit();
    initProjectTilt();
    initNavBlend();
    /* The fluid bridge must be listening before `heroReveal()` opens the 3s
       window, which `finish()` triggers inside `initBoot()`. */
    initFluidBridge();
    initFluidVisibility();
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
