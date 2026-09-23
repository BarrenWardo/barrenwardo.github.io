# Spec — GSAP Animated Profile for barrenwardo.github.io

**Status:** Draft (no code written yet)
**Date:** 2026-09-23
**Repo:** `BarrenWardo/barrenwardo.github.io` (branch `main`, remote `https://github.com/BarrenWardo/barrenwardo.github.io`)
**Live domain:** `git.barren.eu.org` (via `CNAME` file — untouched)
**Reference skills:** `.agents/skills/gsap-*` (official GreenSock skills, installed via `npx skills add https://github.com/greensock/gsap-skills` — 8 skills: gsap-core, gsap-timeline, gsap-scrolltrigger, gsap-plugins, gsap-performance, gsap-utils, gsap-frameworks, gsap-react). Implementation must follow these skills' best practices.

---

## 1. Goal

Replace the current README-only GitHub Pages user site with a **single-page, heavily animated mini-portfolio** driven by GSAP: a terminal-boot intro, kinetic hero, live GitHub stat counters, an orbiting tech-stack visualization, placeholder project cards, and a contact footer — wrapped in a colorful aurora-gradient dark theme with an animated light-mode toggle, easter eggs, and full accessibility/responsive handling.

## 2. Current State (audited)

| File | Content |
|---|---|
| `README.md` | GPRM-generated profile: bio ("AI Aficionado", "Forever Evolving"), shield badges, catppuccin_latte stats/trophy images, Ko-Fi link |
| `_config.yml` | `theme: jekyll-theme-minimal` |
| `CNAME` | `git.barren.eu.org` |
| `index.html` | **Does not exist** — Pages currently renders README |

No JS, no build tooling, no packages. Deployment is plain GitHub Pages from `main`.

**Decision: README stays exactly as-is** (it remains the repo's GitHub-facing profile card). `_config.yml` and `CNAME` untouched.

## 3. Constraints & Delivery Decisions

- **Hosting:** GitHub Pages, as configured today. **No build step, no Actions workflow, no package.json.** Static files at repo root.
- **GSAP loading (recommended & accepted):** CDN via jsDelivr, **pinned version** (e.g. `gsap@3.13.0` minimum — 3.13 is the release where all plugins became free; latest is 3.15.x). Scripts:
  - `https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js`
  - `.../dist/ScrollTrigger.min.js`
  - `.../dist/SplitText.min.js` (free since 3.13)
  - `.../dist/ScrambleTextPlugin.min.js` (free since 3.13)
  - `.../dist/ScrollToPlugin.min.js` (for nav/CTA smooth scrolling)
  - Preconnect to `cdn.jsdelivr.net` and `fonts.googleapis.com`/`fonts.gstatic.com`.
- **Fallback if GSAP fails to load (CDN down/adblock):** `main.js` checks `typeof gsap === "undefined"` → adds `no-anim` class; CSS guarantees all content is visible/static in that state. `<noscript>` equivalent.
- **Own files:** `index.html`, `css/style.css`, `js/main.js`, `favicon.svg`. Single JS entry (classic script tags for GSAP globals, one deferred `main.js`; no modules needed).

## 4. Section Order (chosen for maximum impact)

Rationale: boot stuns → name lands → credibility (numbers) → skills (motion showpiece) → proof of work → call to action. Front-loads the "wow" and keeps the scroll narrative escalating.

1. **Terminal boot overlay** (pre-page, fixed, full-screen)
2. **Hero** — terminal identity card + kinetic name + tagline + CTAs + scroll cue
3. **Stats** — animated count-up cards (live GitHub data)
4. **Tech Orbit** — orbiting tech icons (the scroll showpiece)
5. **Projects** — 6 placeholder cards
6. **Contact / Footer** — GitHub + Ko-Fi CTAs, big sign-off

**Fixed chrome (all sections):** scroll progress bar (top edge), theme toggle (top-right), ambient background layers (behind content), grain overlay (over everything, non-interactive).

## 5. Design System

### 5.1 Palette (dark default; user explicitly wants blue present)

| Token | Dark value | Light value |
|---|---|---|
| `--bg` | `#050810` (void navy) | `#f3f6ff` (blue-tinted paper) |
| `--bg-elev` | `#0b1120` | `#ffffff` |
| `--text` | `#e6edf7` | `#0f172a` |
| `--muted` | `#8b9bb4` | `#5a6b85` |
| `--accent` (primary blue) | `#3b82f6` | `#2563eb` |
| `--accent-2` (cyan) | `#22d3ee` | `#0891b2` |
| `--accent-3` (violet) | `#8b5cf6` | `#7c3aed` |
| `--accent-4` (magenta, sparing) | `#e879f9` | `#c026d3` |
| `--terminal-green` | `#4ade80` | `#16a34a` |

- Aurora blob gradient: blue → cyan → violet (magenta only as occasional 4th blob).
- Gradients on text/borders via `background-clip: text` and `border-image`/pseudo-elements.
- Both themes must pass WCAG AA for body text (verify contrast when implementing).

### 5.2 Typography

- **Display/headings:** Space Grotesk (Google Fonts, `display=swap`).
- **Terminal/counters/labels/eyebrows:** JetBrains Mono.
- Fallbacks: system-ui stack / ui-monospace stack. Fluid sizes with `clamp()`.

### 5.3 Texture

- **Grain:** inline SVG `feTurbulence` data-URI, `opacity ≈ 0.05`, `pointer-events: none`, `position: fixed`, `z-index` above content.
- **Aurora blobs:** 3–4 large `filter: blur(80–120px)` radial-gradient divs, `position: fixed`, behind content.

## 6. Feature Specifications

### 6.1 Terminal Boot Overlay (plays on EVERY load — user's explicit choice)

- Full-screen fixed overlay, `--bg` background, JetBrains Mono.
- Sequence (total target ~4–5s, skippable from ~0.5s):
  1. BIOS-ish lines typed char-by-char with `ScrambleText`/string-slicing: e.g. `BARRENWARD BIOS v3.15.0`, `MEMORY: CURIOSITY OK`, `CAFFEINE LEVELS: NOMINAL`.
  2. `[ OK ] mounting /dev/passion` … `[ OK ] loading module: ai_aficionado.ko` … `[ OK ] evolving…`
  3. `fetch(https://barrenwardo.github.io) … 200 OK` with a thin progress bar tween.
  4. `ACCESS GRANTED` flash → CRT-style flicker/fade → overlay autoAlpha to 0 → hero timeline starts.
- **Skip affordance:** `[ press any key to skip ]` line + tappable SKIP button; any key/click/touch during boot jumps to the end state instantly (`tl.progress(1)` / `tl.timeScale(8)` fallback).
- Cursor blink loop (`step-end` repeat) during typing.
- Accessibility: `aria-hidden="true"` on decorative lines; overlay is `role="status"`/`aria-live="polite"` or visually-hidden summary; on skip/complete, focus moves to hero `h1`.
- **prefers-reduced-motion: overlay is skipped entirely** (never rendered) — full-respect policy (see §7).

### 6.2 Hero

- **Name reveal:** `SplitText` (chars) on "Barren Wardo" — staggered `yPercent: 100 → 0` + `rotationX` flip, `back.out(1.7)`, gradient text.
- **Terminal identity card** beneath/beside name: window chrome (dots), typed bio lines with blinking prompt: `$ whoami` → `> AI aficionado. Forever evolving.` → `> learning, experimenting, coding — daily.` (fresh expanded copy, inspired by README bio).
- **Tagline** scrambles in with `ScrambleTextPlugin`.
- **CTAs:** "View projects" (ScrollToPlugin → smooth scroll to #projects) + "GitHub" (external). Magnetic hover via `gsap.quickTo`.
- **Scroll cue:** animated chevron/line loop.
- **Scroll-out behavior:** hero content parallax (`y` + `autoAlpha` scrub via ScrollTrigger) as it leaves viewport.

### 6.3 Stats — Live Count-up Cards

- **Data source:** GitHub REST API v3, unauthenticated.
  - `GET /users/BarrenWardo` → `public_repos`, `followers`, `public_gists`, `created_at` (→ "Years on GitHub", floor of delta, recomputed at runtime).
  - `GET /users/BarrenWardo/repos?per_page=100&sort=stars` → sum `stargazers_count` (first page only, documented cap of 100 repos — acceptable for 36-repo profile).
- **Five cards:** Repos, Followers, Total Stars, Years on GitHub, Gists.
- **Loading:** skeleton shimmer cards first; numbers count up with `gsap.to()` on an object + `snap`/`textContent` render, `power2.out`, ~1.2s, staggered; optional ScrambleText flourish on the suffix.
- **Resilience (user choice):** on success, cache values + timestamp in `localStorage` (TTL 1 hour). On rate-limit (403) / network failure → serve cached values; if no cache exists → show hardcoded fallbacks (`36` repos etc.) with no visual break, no error UI.
- **ScrollTrigger:** cards reveal with `ScrollTrigger.batch` (staggered rise + fade); counters start when section enters viewport.
- **A11y:** `aria-label` with the final value; counters are text nodes (screen-reader friendly after settle).

### 6.4 Tech Orbit (GSAP showpiece)

- **Content:** 10–12 inline SVG icons (simple-icons paths, no hotlinking): HTML5, CSS3, JavaScript, TypeScript, Python, Markdown, Nix, Git, GitHub, Cloudflare, Google Cloud, Figma (matching README stack).
- **Structure:** 1–2 concentric rings positioned around a pulsing gradient core; rings rotate continuously via a GSAP timeline (`rotation: 360`, `repeat: -1`, `ease: "none"`, ~40–60s per revolution); **counter-rotate each icon** so glyphs stay upright; slight `y` breathing via sine yoyo.
- **Mouse parallax (desktop, pointer:fine only):** whole system drifts subtly with `gsap.quickTo` on `rotationX/rotationY` (max ~6°, perspective on parent).
- **Scroll integration:** section pinned briefly (`pin: true, scrub`) — core scales up and ring rotation speed linked to scroll velocity, then unpins. Created top-to-bottom with other ScrollTriggers (or `refreshPriority` if not).
- **Mobile (`gsap.matchMedia()`):** orbit collapses to a compact 2-row icon grid or slow marquee; no pinning.

### 6.5 Projects — Placeholder Cards

- **6 cards, placeholders** (user's explicit choice): gradient-shimmer covers, generic titles (`Project 01`…), one-line placeholder description, arrow link → `https://github.com/BarrenWardo?tab=repositories`.
- **Structured for later:** each card driven by a JS array of objects (`title`, `desc`, `url`, `accent`) at the top of `main.js` — swapping real projects later is data-only.
- **Micro-interactions:** hover lift (`y: -6`), border glow (accent per card), subtle 3D tilt (`rotationX/rotationY` via quickTo, desktop only).
- **Reveal:** `ScrollTrigger.batch`, stagger 0.08, `y: 40 → 0` + `autoAlpha`.

### 6.6 Contact / Footer

- Big heading: "Let's build something." (SplitText line reveal on enter).
- Buttons: **GitHub** (`github.com/BarrenWardo`) and **Ko-Fi** (`ko-fi.com/barrenwardo`) — magnetic hover, gradient border sweep.
- Footer line: `© 2026 BarrenWardo · built with GSAP · [terminal hint]` (hint nudges easter egg, e.g. `try: help`).

### 6.7 Ambient Layer (always running, behind content)

User selected **all four** + "anything relevant":
1. **Aurora blobs:** 4 blurred gradient divs; each on an infinite yoyo timeline (`x/y/scale`, 18–40s, randomized durations, `sine.inOut`). Only ~2 blobs render on mobile.
2. **Particles:** single `<canvas>` layer, ~40 small dots drifting slowly upward, `gsap.ticker`-driven; pauses on `visibilitychange`; density halves on mobile.
3. **Cursor glow:** fixed radial-gradient div following pointer via `gsap.quickTo` (x/y), `pointer-events: none`, **desktop pointer:fine only**.
4. **Grain:** static SVG-noise overlay (§5.3).
5. *(Relevant extra)* **Scroll progress bar:** 2–3px gradient bar, `scaleX: 0 → 1` scrubbed across whole document via `ScrollTrigger.create({ trigger: document.body, start: "top top", end: "max", scrub: 0.3 })`.

### 6.8 Theme Toggle (dark default → light, animated)

- Default dark; honors `prefers-color-scheme` on first visit only if no stored preference; persisted in `localStorage` (`theme`).
- Toggle button (sun/moon morph icon) top-right.
- **Animation:** circular clip-path reveal expanding from the button position overlaying the new theme (GSAP `clipPath` tween, ~0.7s, `power3.inOut`), then swap `data-theme` attribute; CSS custom properties (§5.1) carry the change. Fallback (reduced motion): instant swap.

### 6.9 Easter Eggs (both, per user choice)

- **Typed terminal commands:** hero terminal input is focusable; supported commands: `help` (lists commands), `whoami`, `ls` (lists page sections; clicking/entering one scrolls to it via ScrollToPlugin), `theme` (toggles theme), `sudo make me a sandwich` (denied → then granted), `matrix` (effect below), `clear`. Unknown → witty error. Command history with ↑/↓.
- **Konami code** (↑↑↓↓←→←→ B A): triggers **hyperdrive mode** — particle canvas switches to streaking starfield for ~6s, then eases back.
- **`matrix` / Konami variant:** canvas-based matrix-rain overlay (green glyphs on `--bg`), fades out via autoAlpha after ~5s. Only one effect at a time; both are skipped under reduced motion.

### 6.10 SEO / Meta / Favicon

- `<title>Barren Wardo — AI Aficionado & Forever Evolving</title>`, meta description (fresh copy), `lang="en"`.
- Canonical → `https://git.barren.eu.org/`.
- Open Graph + Twitter card tags (`og:title`, `og:description`, `og:url`, `og:image`, `twitter:card=summary_large_image`). `og-image.png` is an **open item** (generate later; use a 1200×630 gradient/terminal mock).
- `favicon.svg`: gradient terminal glyph with blinking-cursor block (static SVG; keep first frame presentable — browsers rasterize statically).

## 7. Accessibility & Reduced Motion (full respect — user's explicit choice)

- **`gsap.matchMedia()`** with conditions object:
  ```js
  mm.add({
    isDesktop: "(min-width: 800px)",
    isMobile: "(max-width: 799px)",
    reduceMotion: "(prefers-reduced-motion: reduce)"
  }, (ctx) => { /* ... */ });
  ```
- `reduceMotion: true` → **no boot overlay, no ambient motion, no parallax/pinning, no count-up (instant values), no easter-egg effects**; all content set visible via `gsap.set(autoAlpha)` (or CSS default-visible + animation opt-in).
- Semantic landmarks (`header/main/section/footer`), skip-to-content link, focus-visible styles, keyboard-operable toggle & terminal, decorative layers `aria-hidden="true"`.
- Contrast AA in both themes.

## 8. Performance Budget

- Transforms/opacity only (no layout props) — per gsap-core skill.
- `will-change` used sparingly; blobs use `filter: blur` on GPU-composited fixed layers.
- Particle cap (40 desktop / 20 mobile), pause when tab hidden.
- Fonts `display=swap`; GSAP CDN scripts `defer` in dependency order, then `main.js`.
- Target: LCP < 2.5s on 4G; JS payload ~<120KB gz from CDN (shared browser cache); no images except favicon/og.
- Create ScrollTriggers top-to-bottom in source order (per gsap-scrolltrigger skill); `ScrollTrigger.refresh()` after fonts load (`document.fonts.ready`) and after any dynamic content injection (stats).

## 9. Degradation Matrix

| Condition | Behavior |
|---|---|
| JS disabled | `<noscript>` CSS: hide boot overlay + ambient layers, show all content statically |
| GSAP CDN blocked | `no-anim` class; static but complete page |
| GitHub API rate-limited | localStorage cache → hardcoded fallbacks (§6.3) |
| Reduced motion | Static page, instant reveals, no boot (§7) |
| Mobile viewport | matchMedia: compact orbit, fewer blobs/particles, no cursor glow, shorter boot (3 lines) but still skippable |
| Touch device | No tilt/magnetic hover; tap targets ≥ 44px |

## 10. File Plan (to be implemented later — nothing written yet)

```
index.html          # semantic single-page markup, meta, favicon link, CDN script tags
css/style.css       # design tokens (both themes), layout, textures, no-anim/noscript fallbacks
js/main.js          # boot sequence, hero, stats fetch/cache, orbit, batch reveals,
                    # ambient canvases, theme toggle, easter eggs, matchMedia orchestration
favicon.svg         # gradient terminal glyph
gsap-animated-profile-spec.md   # this file
```

Untouched: `README.md`, `_config.yml`, `CNAME`.

## 11. Deployment Notes

- Commit to `main` → GitHub Pages serves as-is (Jekyll passes through static HTML/CSS/JS; no front-matter needed).
- Verify custom domain still resolves over HTTPS after deploy (`git.barren.eu.org`).
- Commit message style in this repo is short imperative ("Update README.md"); follow it.

## 12. Open Items / Future

- [ ] Generate `og-image.png` (1200×630).
- [ ] Replace placeholder projects with real data (later: GitHub API card mode or curated list).
- [ ] Optional: ScrollSmoother evaluation (not in v1 — native scroll is more robust with pinning).
- [ ] Optional: analytics (none by default).
- [ ] Consider `ScrollTrigger.clearScrollMemory` / history restore nuance if boot + scroll interplay annoys refresh behavior.

## 13. Source References

- Installed skills: `.agents/skills/gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-performance`, `gsap-utils`, `gsap-frameworks`, `gsap-react` (official GreenSock, MIT).
- GSAP free-plugins announcement: https://gsap.com/blog/3-13/
- Docs: https://gsap.com/docs/v3/ · https://gsap.com/docs/v3/Plugins/ScrollTrigger/
