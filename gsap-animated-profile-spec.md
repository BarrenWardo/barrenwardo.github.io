# Spec — GSAP Animated Profile for barrenwardo.github.io

**Status:** Revision 4 — buildable
**Date:** 2026-09-23
**Repo:** `BarrenWardo/barrenwardo.github.io` (branch `main`)
**Live domain:** `git.barren.eu.org` (via `CNAME` file — untouched)
**Reference skills:** `.agents/skills/gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-performance`, `gsap-utils` (official GreenSock, MIT, installed via `npx skills add https://github.com/greensock/gsap-skills`). `gsap-react` and `gsap-frameworks` are installed but **not applicable** — this build is vanilla JS, no framework. Implementation must follow the six applicable skills.

**How to read this document.** §0–§12 are normative — build from them. Short *Why* notes appear inline only where a decision is counterintuitive and would otherwise be "fixed" by a future reader. The full decision trail for every revision lives in the change logs below. §12 is the definition of done.

---

## Change logs

### Revision 4 — final review

| # | Finding | Fix | §|
|---|---|---|---|
| 1 | `--accent-3` dark measured **4.45:1 on `--bg-elev`** — an outright AA failure, not the "borderline" it was documented as — and §6.5 assigned it to a project card | Replaced with `#a78bfa` (7.36:1 bg / 6.92:1 elev). Palette is now verified against **both** surfaces per theme | §5.1, §6.5 |
| 2 | `SplitText`'s entrance tween fired at `create()` time — i.e. during boot — so the hero name animated **behind the overlay** and was finished before it lifted | SplitText creation moved inside `heroReveal()`; first-run guard so `autoSplit` re-splits settle instead of replaying | §6.2 |
| 3 | `heroReveal()` was called by §6.1 but never defined | Defined in §6.2 | §6.2 |
| 4 | The error path removed the CSS scroll lock but never called `lenis.start()` — leaving `.lenis-stopped { overflow: clip }` in force, so **a thrown error could leave the page permanently unscrollable** | `lenis?.start()` added to the catch | §7 |
| 5 | "the hero renders immediately" (§6.1) vs "JS hides content to opt into reveal" (§7) — mutually exclusive, and it reloaded the LCP architecture | Above-fold content is **never** pre-hidden. `js-reveal` is scoped to below-fold targets and added by the deferred `main.js` | §6.1, §7 |
| 6 | Google Fonts' stylesheet — the remaining render-blocking request — sat directly in front of the LCP candidate and was never addressed | Non-blocking font CSS + `display=swap`; the opaque overlay hides the resulting FOUT | §8 |
| 7 | `gsap.to(ring, { timeScale })` — `ring` undefined, and `timeScale` is an animation property, not an element property | `ringTl` timeline declared; single decay tween per `onUpdate` | §6.4 |
| 8 | `finish()` omitted the focus/scroll pairing §6.11 mandates | Added | §6.1 |
| 9 | Lenis ran an rAF loop on touch devices where `syncTouch:false` means it smooths nothing — pure overhead on the least capable hardware | Gated to `(pointer: fine)`, scoped via `matchMedia` with `destroy()` cleanup | §6.11 |
| 10 | `will-change: transform` on the particle canvas — the canvas repaints its own pixels, it is never transformed | Removed; blobs only | §8, §12 |
| 11 | §9's reduced-motion row contradicted §7 (which deliberately keeps Lenis constructed) | Row corrected | §9 |
| 12 | Revision history was interleaved through the normative body | Consolidated here; body keeps only short *Why* notes | all |
| 13 | `finish()` moved focus to the hero `<h1>` on the **completion timer**, interrupting a screen-reader user mid-read — the `boot` class is withheld for reduced motion but **not** for screen readers | Focus now moves **only on an explicit skip**; the timer path leaves focus untouched. `inert` on the covered content explicitly considered and rejected | §6.1, §12 |

### Revision 3 — Lenis smooth scroll

| # | Change | §|
|---|---|---|
| 1 | Lenis `1.3.26` added (SRI-verified), pinned like GSAP | §3, §6.11 |
| 2 | **ScrollToPlugin removed** — it animates `window` scroll directly and competes with Lenis for control | §3, §6.11 |
| 3 | Lenis CSS inlined into `style.css` rather than linked, so no render-blocking cross-origin request sits in front of first paint | §6.11 |
| 4 | Boot scroll lock became two-phase: CSS pre-init, `lenis.stop()`/`start()` post-init | §6.1 |
| 5 | Hero CTA became a real `<a href="#…">` (handled by `anchors: true`) instead of a JS scroll handler | §6.2 |
| 6 | Terminal `ls` scrolls via `lenis.scrollTo()`, which respects pin spacers | §6.9 |
| 7 | Reduced motion for scroll handled by Lenis' `respectReducedMotion` default | §7 |
| 8 | Lenis added as a third degradation path (page must remain scrollable without it) | §9 |

### Revision 2 — corrections to Revision 1

R1 was structurally sound but had one measurable defect, one hard architectural conflict and four GSAP API traps.

| # | R1 problem | R2 resolution | §|
|---|---|---|---|
| 1 | "Both themes must pass AA" — three light tokens failed (3.41:1, 4.36:1, 3.05:1) | Light tokens darkened; ratios stated as verified numbers | §5.1 |
| 2 | Theme from `localStorage` + all scripts `defer` → dark flash every load for light users | Inline pre-paint `<head>` script | §6.8 |
| 3 | 4–5s opaque overlay vs `LCP < 2.5s` — mutually exclusive | Overlay became a layer **over an already-painted hero** | §6.1 |
| 4 | `gsap.registerPlugin()` never mentioned — fails silently | Explicit registration with guard | §3 |
| 5 | `SplitText` with no `autoSplit`/`onSplit` and no font ordering | `autoSplit` + `onSplit` + font-load handling | §6.2 |
| 6 | Animated `filter: blur(80–120px)` forced per-frame blur re-rasterization | Pre-blurred `radial-gradient` blobs | §5.3, §6.7 |
| 7 | 5-card count-up landed on 36/12/23/5/2 — undercut §4's "credibility" goal | 3-card signal board | §6.3 |
| 8 | 6 identical placeholder cards | 3 real repos | §6.5 |
| 9 | Icon list claimed to match README stack — it did not | List corrected to the actual README stack | §6.4 |
| 10 | No SRI on third-party scripts | Exact `sha384` hashes | §3 |
| 11 | Contradictory overlay a11y (`aria-hidden` **and** `aria-live`) | Overlay decorative; skip button AT-reachable | §6.1 |
| 12 | `localStorage`, `fetch` and init all unguarded | `try/catch` everywhere + CSS-default-visible mandate | §7, §6.3 |
| 13 | Pinned `3.13.0` while calling it a "minimum" | Pinned to the tested version | §3 |
| 14 | No acceptance criteria | §12 added | §12 |

---

## 0. Verified baseline

Read from the live GitHub API and npm/jsDelivr registry on 2026-09-23, not assumed. Source of truth for §6.3 and §8.

| Fact | Value |
|---|---|
| npm `gsap` `latest` | **3.15.0** |
| npm `lenis` `latest` | **1.3.26** (MIT, zero runtime deps) |
| All GSAP plugins free since | **3.13** (29 Apr 2025, post-Webflow) |
| Pinned CDN files | all present, HTTP **200**; all SRI hashes re-verified on a second independent fetch |
| Measured payload (pinned, third-party) | **~57 KB gzip** / ~151 KB raw |
| Palette contrast | every token verified against **both** `--bg` and `--bg-elev`, both themes; tightest value **4.64:1** |
| `public_repos` | **36** (of which **24 are forks** → **12 original**) |
| Total stars across repos | **23** — top: `Fooocus-Modal` **14★**, `Py-Books` **6★** |
| Repos with 0 stars | 31 of 36 |
| `followers` / `public_gists` | **12** / **2** |
| `created_at` | **2021-06-19** → 5 years |
| `jekyll-theme-minimal` theme `_config.yml` | ships **no `defaults:` block** → a front-matter-less `index.html` is copied verbatim, no layout injected |

## 1. Goal

Replace the current README-only GitHub Pages user site with a **single-page, heavily animated mini-portfolio** driven by GSAP: a terminal-boot intro, kinetic hero, live GitHub signal board, an orbiting tech-stack visualization, three real project cards, and a contact footer — wrapped in a colorful aurora-gradient dark theme with an animated light-mode toggle, easter eggs, and full accessibility/responsive handling.

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
- **Jekyll:** add an empty `.nojekyll` at repo root. Not *required* (§0 confirms the theme injects nothing), but it removes Jekyll from the build entirely — faster deploys, no theme assets copied, no theme `_config.yml` override of `site.title`.
- **Third-party scripts:** CDN via jsDelivr, **pinned**. Every tag carries `integrity` + `crossorigin="anonymous"`:

  | Script | `integrity` (sha384) |
  |---|---|
  | `https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js` | `sha384-XmJ9SoHtVOHoQUcKvFAzVXwdkKo1Ie3bhmSoIAkcdsHGaIrVJIkmozyq0FJeb/Ly` |
  | `.../dist/ScrollTrigger.min.js` | `sha384-wl5TeDVvOWt30Pbf8aSo2ZrzsOjddu3avOBvHe+p+OhJt9gP6w9YXmDkN5DK2/dF` |
  | `.../dist/SplitText.min.js` | `sha384-SWJ0lLVRoipvHh59xj0pL7uC7Ih51F+5smaFtrG+2nr+TlDZU5SYJHmxfolbeNTr` |
  | `.../dist/ScrambleTextPlugin.min.js` | `sha384-QQ7Drnaxr6AM+cySvZNVNIFsvXLGtDLoS5tlUIt2XvIwnqtBtuD7A2KwqlSAWMi1` |
  | `https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js` | `sha384-jqpi9VmOdhyLoLURgjCn7EpnG9BbnHW57ibIZoeaIU+erWDH3k8fQQg0xH2ySjnw` |

  All five use `defer` and execute in document order, so `window.gsap`, the plugin globals and `window.Lenis` all exist before `main.js` runs.
  *Why no ScrollToPlugin:* it animates `window` scroll position directly, bypassing Lenis's smoothing — both would fight over the same scroll position. Lenis covers every case it served (§6.11).
- **Plugin registration (mandatory — absence fails silently):**
  ```js
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);
  ```
  Once, at the top of init, after a `typeof gsap !== "undefined"` guard.
- **Smooth scroll:** Lenis, desktop-only (`pointer: fine`), initialised per §6.11. Guarded on `typeof Lenis !== "undefined"` — every scroll interaction must work with native scrolling (§9).
- **Fallback if GSAP fails to load (CDN down / adblock / SRI mismatch):** `main.js` checks `typeof gsap === "undefined"` → adds `no-anim`; CSS guarantees all content is visible and static. SRI failure triggers the same path.
- **Theme + boot before first paint:** one small **inline, non-deferred** `<script>` in `<head>` (§6.8). This is the only blocking script and it is deliberate — it is what makes zero theme-flash and the §6.1 LCP design possible. It reads `localStorage.theme`, sets `document.documentElement.dataset.theme`, and sets the `boot` class. It must be wrapped in `try/catch` (§7).
- **Own files:** `index.html`, `css/style.css`, `js/main.js`, `favicon.svg`, `.nojekyll`. Single JS entry — classic script tags for the globals, one deferred `main.js`, structured as clearly-named sections in one IIFE in page order.

## 4. Section Order

Rationale: boot stuns → name lands → **the showpiece earns attention** → credibility (numbers) → proof of work → call to action. The orbit precedes the signal board: it is the most expensive thing to build and the strongest single argument for the page, ahead of three honest metric cards.

1. **Terminal boot overlay** (a layer over the hero, not a gate in front of it — §6.1)
2. **Hero** — terminal identity card + kinetic name + tagline + CTAs + scroll cue
3. **Tech Orbit** — orbiting tech icons (the scroll showpiece)
4. **Signal board** — three animated live-GitHub metrics
5. **Projects** — three real repositories
6. **Contact / Footer** — GitHub + Ko-Fi CTAs, big sign-off

**Fixed chrome (all sections):** scroll progress bar (top edge), theme toggle (top-right), ambient background layers (behind content), grain overlay (over everything, non-interactive).

Smooth scrolling (Lenis, §6.11) is page-wide on desktop and is therefore a foundation, not a section — it is what every scroll-linked animation in §6.2, §6.4 and §6.7 reads from.

## 5. Design System

### 5.1 Palette (dark default; blue present throughout)

Every token is verified against **both** surfaces in its theme, because most text on this page sits on elevated cards, not on `--bg`. All pass WCAG AA (4.5:1) for normal text; the tightest value in the palette is **4.64:1**.

| Token | Dark value | on `--bg` | on `--bg-elev` | Light value | on `--bg` | on `--bg-elev` |
|---|---|---|---|---|---|---|
| `--bg` | `#050810` | — | — | `#f3f6ff` | — | — |
| `--bg-elev` | `#0b1120` | — | — | `#ffffff` | — | — |
| `--text` | `#e6edf7` | 16.99:1 | 15.98:1 | `#0f172a` | 16.52:1 | 17.85:1 |
| `--muted` | `#8b9bb4` | 7.10:1 | 6.68:1 | `#5a6b85` | 5.01:1 | 5.42:1 |
| `--accent` (blue) | `#3b82f6` | 5.44:1 | 5.12:1 | `#2563eb` | 4.78:1 | 5.17:1 |
| `--accent-2` (cyan) | `#22d3ee` | 11.08:1 | 10.42:1 | `#0e7490` | 4.96:1 | 5.36:1 |
| `--accent-3` (violet) | **`#a78bfa`** | 7.36:1 | 6.92:1 | `#7c3aed` | 5.27:1 | 5.70:1 |
| `--accent-4` (magenta, sparing) | `#e879f9` | 8.14:1 | 7.65:1 | `#a21caf` | 5.85:1 | 6.32:1 |
| `--terminal-green` | `#4ade80` | 11.49:1 | 10.81:1 | `#15803d` | 4.64:1 | 5.02:1 |

**Two corrections landed here, both from measuring rather than eyeballing.** R1's light `--accent-2` / `--accent-4` / `--terminal-green` failed AA outright (3.41:1, 4.36:1, 3.05:1) — the green mattered most, since it is boot/terminal **body text** where the 3:1 large-text exemption never applies. Then R4 found `--accent-3` dark at **4.45:1 on `--bg-elev`**: it passed on `--bg` (4.73:1), which is why single-surface verification missed it, and §6.5 had assigned it to a project card. Replaced with `#a78bfa`.

**Verification rule:** any token change must be re-checked against *both* surfaces in *both* themes (§12 criterion 6). Verifying only against `--bg` is how the R2→R4 defect survived a revision.

- Aurora blob gradient: blue → cyan → violet (magenta only as occasional 4th blob).
- Gradients on text/borders via `background-clip: text` and pseudo-elements — **not** `border-image`, which ignores `border-radius`.

### 5.2 Typography

- **Display/headings:** Space Grotesk (Google Fonts, `display=swap`).
- **Terminal/counters/labels/eyebrows:** JetBrains Mono.
- Fallbacks: system-ui stack / ui-monospace stack. Fluid sizes with `clamp()`.

### 5.3 Texture

- **Grain:** inline SVG `feTurbulence` data-URI, `opacity ≈ 0.05`, `pointer-events: none`, `position: fixed`, `z-index` above content. Static — no animation, no per-frame cost.
- **Aurora blobs:** **pre-blurred radial gradients**, never `filter: blur()`:
  ```css
  .blob {
    background: radial-gradient(circle at 50% 50%,
                rgba(59,130,246,.55) 0%, rgba(59,130,246,.18) 35%, transparent 70%);
  }
  ```
  *Why:* animating `x`/`y`/`scale` on a large `filter`-blurred element forces the browser to re-rasterize the blur every frame on many GPUs — `filter` is a paint-time effect, not a composited texture. The soft alpha falloff gives the same glow and only `transform` animates. A baked blurred PNG is an acceptable alternative.

## 6. Feature Specifications

### 6.1 Terminal Boot Overlay (plays on EVERY load — user's explicit choice, made LCP-safe)

The overlay is **a layer over an already-painted page**, not a gate in front of one. Occluded elements are not LCP candidates, so a gate would put LCP at 4–5s and make `LCP < 2.5s` impossible.

- The hero is in the initial HTML and **paints immediately** — the page is never empty.
- The overlay's **first line lives in the initial markup** (not injected by JS) so it is a valid early paint. It becomes the LCP candidate and resolves at roughly FCP. When the overlay lifts, the hero is already rasterized, so the transition costs a compositor update, not a new paint.
- The overlay is `display: none` by default and is engaged by the inline `<head>` script adding `html.boot` **before first paint** — no flash of hero-then-overlay, and no-JS visitors never see it.
- **Nothing above the fold is ever pre-hidden.** The hero must not be given a hidden start state by the inline script — doing so would stop it painting early and break the LCP design above. Reveal animations for above-fold content are created *after* the overlay lifts (see `heroReveal()` in §6.2).
- **Scroll locking is two-phase**, because the inline script runs before Lenis exists: `html.boot` sets `overflow: hidden; overscroll-behavior: none` immediately; then once Lenis is initialised (§6.11) `lenis.stop()` is called if boot is still active. `finish()` reverses both.
- Under reduced motion the `boot` class is never set, so nothing is locked and no `stop()` is issued.

**Sequence** (total ~4–5s, skippable from 0.15s):

1. BIOS-ish lines typed character-by-character: `BARRENWARD BIOS v3.15.0`, `MEMORY: CURIOSITY OK`, `CAFFEINE LEVELS: NOMINAL`.
2. `[ OK ] mounting /dev/passion` … `[ OK ] loading module: ai_aficionado.ko` … `[ OK ] evolving…`
3. `fetch(https://barrenwardo.github.io) … 200 OK` with a thin progress-bar tween. **No network request is made** — the line is purely theatrical, so it costs no round-trip and adds no failure path.
4. `ACCESS GRANTED` flash → CRT-style flicker/fade → overlay `autoAlpha: 0` → hero reveal starts.

**Typing:** use **string-slicing** (`textContent = str.slice(0, n)` on a `{n: 0 → len}` tween) for boot lines, not `ScrambleText`. Slicing is deterministic, cheap, and behaves correctly when the timeline is jumped to its end. `ScrambleText` is reserved for the hero tagline, where a scramble jump is the desired look.

**BIOS version:** don't hardcode a version that goes stale — `const BIOS_VERSION = window.gsap?.version ?? "3.15.0";` (GSAP is deferred and executes before `main.js`).

**Skip affordance:** `[ press any key to skip ]` plus a real `<button>` labelled `Skip intro`. Any key / click / touch after 150ms calls `finish({ skipped: true })` — it is a user action, so it is one of the paths that moves focus.

```js
let bootDone = false;
function finish({ skipped = false } = {}) {
  if (bootDone) return;              // idempotent — skip must be safe to call twice
  bootDone = true;
  bootTl.progress(1).kill();         // land on the true end state, then stop
  document.documentElement.classList.remove("boot");
  lenis?.start();                    // release the Lenis-side lock (§6.11); no-op if absent
  ScrollTrigger.refresh();           // the boot lock was in effect at init
  heroReveal();                      // explicit handoff (§6.2) — NOT an onComplete inside bootTl

  // Focus moves ONLY on an explicit skip — never on automatic completion (see a11y note).
  if (skipped) {
    const h1 = document.querySelector("h1");
    h1.focus({ preventScroll: true }); // requires tabindex="-1" on the h1
    if (lenis) lenis.scrollTo(h1, { immediate: true });
    else h1.scrollIntoView();
  }
}

bootTl.eventCallback("onComplete", () => finish());           // timer path: no focus change
skipBtn.addEventListener("click", () => finish({ skipped: true }));
```

*Why the explicit handoff:* a hard `progress(1)` alone leaves the hero hidden whenever the handoff lives in `onComplete`, because killing the timeline kills its callback. `timeScale(8)` is not a skip either — on a 5s timeline it still takes ~0.6s. Hence an idempotent `heroReveal()` guarded by a boolean.

**Accessibility:** the overlay is **decorative**. `aria-hidden="true"` goes on the decorative text block only; the skip `<button>` sits outside that block so it stays reachable; there is no live region. Screen-reader users get the hero immediately, which beats hearing a fake BIOS.

**Focus moves only on an explicit skip, never on automatic completion.** The `boot` class is withheld under reduced motion but **not** for screen readers, so a SR user with ordinary motion settings starts reading the already-painted hero while the overlay is still up. Focusing the `<h1>` from the completion timer would yank them out of that read — an unrequested focus change triggered by a timer they never engaged. When the user *skips*, they acted, so landing on the hero is expected and useful; that is the one path that focuses. The `<h1>` still needs `tabindex="-1"` or `.focus()` is a no-op.

**Content behind the overlay stays keyboard-reachable for the 4–5s window — accepted deliberately.** The alternative, applying `inert` to the main content while `boot` is active, was considered and rejected: it introduces a *second* JS-dependent barrier to interactivity, and failing to remove it on any exit path would strand the page in a non-interactive state. The exposure is a few seconds at load and few users tab in that window. Do not add `inert` here without first re-solving that failure mode.

**Reduced motion:** the inline script never sets `html.boot`, so the overlay is **never rendered** — no flash, no JS-dependent hiding (§7).

### 6.2 Hero

- **Name reveal** (SplitText characters, staggered `yPercent: 100 → 0` + `rotationX` flip, `back.out(1.7)`, gradient text) — created inside `heroReveal()`, never at init:

  ```js
  let heroRevealed = false;
  function heroReveal() {
    if (heroRevealed) return;
    heroRevealed = true;

    SplitText.create(".hero-name", {
      type: "chars",
      autoSplit: true,      // re-splits on font load / width change
      smartWrap: true,      // prevents mid-word line breaks when splitting chars only
      onSplit(self) {
        if (self.__settled) return gsap.set(self.chars, { clearProps: "all" });
        self.__settled = true;
        return gsap.from(self.chars, {          // returned so SplitText can revert + time-sync
          yPercent: 100, rotationX: -90, autoAlpha: 0,
          duration: 0.8, ease: "back.out(1.7)", stagger: 0.04
        });
      }
    });

    // tagline scramble, terminal-card line typing, scroll cue, CTA setup
  }
  ```

  *Why it must not be created at init:* `onSplit` fires when `SplitText.create()` runs. Creating it during `init()` would play the entire name reveal behind the boot overlay, so the "name lands" beat of §4 would happen with the curtain down. Creating it in `heroReveal()` puts the entrance exactly where the reader sees it.

  *Why the `__settled` guard:* `autoSplit` re-splits later (font load, resize). Without the guard, every re-split replays the entrance animation mid-page. On a re-split the chars are simply settled to their final state instead.

- **Font ordering is handled by this ordering, not by a separate gate.** The split happens at boot end (~4–5s), by which point webfonts have almost always loaded. The case that remains — a 0.15s skip, where they may not have — is covered by `autoSplit: true`, which re-splits and re-syncs the returned tween. `document.fonts.ready` still drives a `ScrollTrigger.refresh()` (§8) for trigger positions, which is a separate concern from the split itself.
- **Gradient-text trap:** with `type: "chars"` each character is its own box, so giving characters `background-clip: text` makes every glyph render its own full gradient. Keep the gradient on the `<h1>` and rely on the inherited `-webkit-text-fill-color: transparent` — the parent's clipped background then shows through every descendant glyph. Do **not** set `background` on the split chars. Add `font-kerning: none; text-rendering: optimizeSpeed` to avoid kerning shift.
- **Never hide a SplitText target with `display: none`.** A `display:none` element measures zero, so the split produces broken lines and zero-width characters. Hide with `autoAlpha` (opacity + `visibility`) only; `visibility: hidden` retains layout, `display: none` does not.
- **Terminal identity card** beneath/beside the name: window chrome (dots), typed bio lines with a blinking prompt: `$ whoami` → `> AI aficionado. Forever evolving.` → `> learning, experimenting, coding — daily.` (fresh expanded copy, inspired by README bio).
- **Tagline** scrambles in with `ScrambleTextPlugin`, on an element that has **not** been through SplitText — the two plugins do not compose on the same node.
- **CTAs:** "View projects" is a real `<a href="#projects">` and "GitHub" a real external `<a>`. In-page anchors are handled by Lenis `anchors: true` (§6.11) — do not attach a JS click handler and do not re-introduce a scroll plugin. Magnetic hover via `gsap.quickTo`, gated on `pointer: fine` **and** not-reduced-motion (§7).
- **Scroll cue:** animated chevron/line loop.
- **Scroll-out behavior:** hero content parallax (`y` + `autoAlpha`, scrubbed via ScrollTrigger) as it leaves the viewport. `autoAlpha: 0` applies `visibility: hidden`, which removes the hero from the a11y tree — correct, and it also makes the terminal input unreachable while hidden.

### 6.3 Signal Board — three live metrics

§4's narrative is "boot stuns → name lands → **credibility (numbers)**". The obvious five-card build lands on `36 repos / 12 followers / 23 stars / 5 years / 2 gists` — and **24 of 36 repos are forks** with **31 of 36 carrying zero stars**. A count-up resolving to "12" and "2" undercuts the exact goal the section exists to serve, and the reader can click through and see the fork ratio. So: three cards, each honest and favorable. (User-selected.)

| Card | Value | Sub-label | Star badge |
|---|---|---|---|
| **Original repos** | `12` | "of 36 total · 24 forks" | — |
| **Top repository** | `14` | "stars · Fooocus-Modal" | ★ |
| **Years building** | `5` | "on GitHub since 2021" | — |

Keeps the count-up motion and the live-data story, drops the three figures that read as small, and volunteers the fork split rather than letting a visitor discover it.

**Data source:** GitHub REST API v3, unauthenticated, CORS-enabled. Two calls:

- `GET /users/BarrenWardo` → `created_at` → years (`floor(delta)`, recomputed at runtime).
- `GET /users/BarrenWardo/repos?per_page=100&sort=stars` → `originals = repos.filter(r => !r.fork).length`, `forks = repos.filter(r => r.fork).length`, `top = repos.reduce(max by stargazers_count)`. One page covers the 36-repo profile (documented cap: 100).

**Derive, never hardcode.** `years` comes from `createdAt`, so it advances on its own. Fallbacks carry a `verifiedOn` stamp so staleness is visible:

```js
const GITHUB_FALLBACK = {
  totalRepos: 36,
  forks: 24,
  topName: "Fooocus-Modal",
  topStars: 14,
  createdAt: "2021-06-19",
  verifiedOn: "2026-09-23"   // refresh when > 90 days old
};
const originals = GITHUB_FALLBACK.totalRepos - GITHUB_FALLBACK.forks; // 12
```

**Loading:** skeleton shimmer cards first; numbers count up with `gsap.to()` on an object + `textContent` render, `power2.out`, ~1.2s, staggered.

**Zero-CLS requirement.** Skeleton and resolved card must occupy **identical dimensions** (fixed `min-height`, fixed line heights, tabular-nums counters). Stats arrive after first paint; if the swap changes any box it shifts the whole document and moves every ScrollTrigger below it. Reserve the space, then `ScrollTrigger.refresh()` after render (§8).

**Resilience:** on success, cache `{data, ts}` in `localStorage` with a **12-hour TTL** — a 1-hour TTL meant 2 API calls per visit against a 60-req/hr-per-IP limit, which a handful of visitors on a shared/CGNAT IP can exhaust, and profile stats do not change hourly. Every `localStorage` access is `try/catch`-guarded (Safari private mode throws on `setItem`; an uncaught throw here would abort the whole stats render).

**Failure handling:** on 403/429/network error → serve cache; if no cache → `GITHUB_FALLBACK`. No error UI, and the reveal must still run — the whole path is `try/catch` with the batch reveal in a `finally`-equivalent, so the section can never be stranded at `autoAlpha: 0`.

**ScrollTrigger:** cards reveal with `ScrollTrigger.batch`; counters start when the section enters the viewport.

**A11y:** `aria-label` carries the final value on each card; counters are plain text nodes, so screen readers read the settled value.

### 6.4 Tech Orbit (GSAP showpiece)

**Icons.** Twelve README technologies: **HTML5, Markdown, Nix, Python, YAML, Cloudflare, GitHub Pages, Google Cloud, Canva, Figma, Bitwarden, Notion** (OpenSea dropped as least developer-relevant). Inline SVG paths, no hotlinking. *Re-read `README.md` before finalising the glyphs — R1's list claimed to match it and did not.*

**Structure.** Position icons absolutely via JS (`x`/`y`) around a pulsing gradient core. Rotate **only a decorative dashed circle** — it carries the "orbit" read visually and has no upright-text requirement. Icons take a slow sine `y` breathing yoyo instead of riding the ring.

```js
const ringTl = gsap.to(".orbit-ring", {
  rotation: 360, repeat: -1, ease: "none", duration: 50
});
```

*Why not counter-rotate each icon to stay upright:* a counter-tween must match the ring's duration **and** ease exactly or every glyph wobbles visibly each loop. If true orbiting glyphs are preferred, the counter-rotation must be `repeat: -1` with identical duration and `ease: "none"` — never mix eases.

**Mouse parallax** (desktop, `pointer: fine`, not reduced-motion): the whole system drifts via `gsap.quickTo` on `rotationX`/`rotationY`, max ~6°, `perspective` on the parent.

**Scroll-velocity link.** `getVelocity()` exists only inside `onUpdate`, and scrubbing a `repeat: -1` rotation fights the loop and drifts — so drive the timeline's `timeScale` explicitly:

```js
ScrollTrigger.create({
  trigger: ".orbit", start: "top bottom", end: "bottom top",
  onUpdate(self) {
    const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(self.getVelocity()) / 1200);
    gsap.to(ringTl, { timeScale: boost, duration: 0.6, ease: "power2.out", overwrite: true });
  }
});
```

One tween per update with `overwrite: true` decays back toward 1 on its own once updates stop — no second delayed tween to keep in sync.

**Pin:** the section pins briefly (`pin: true, scrub`), core scales up, then unpins. Pinning creates a spacer, so create ScrollTriggers top-to-bottom in page order, keep §6.3's zero-CLS guarantee, and `ScrollTrigger.refresh()` after fonts load and after stats render. If pins jitter under Lenis, set `pinType: "fixed"` on this trigger.

**Mobile (`gsap.matchMedia()`):** orbit collapses to a compact 2-row icon grid or slow marquee; **no pinning**.

### 6.5 Projects — three real repositories

Data array at the top of the Projects section in `main.js`:

```js
const PROJECTS = [
  { name: "Fooocus-Modal", stars: 14, lang: "Python",
    url: "https://github.com/BarrenWardo/Fooocus-Modal", accent: "var(--accent)" },
  { name: "Py-Books", stars: 6, lang: "Jupyter Notebook",
    url: "https://github.com/BarrenWardo/Py-Books", accent: "var(--accent-2)" },
  { name: "kserve-skills", stars: 0, lang: "Markdown",
    url: "https://github.com/BarrenWardo/kserve-skills", accent: "var(--accent-3)" }
];
```

Names, stars and languages are verified. All three accents now clear AA on `--bg-elev` in both themes (§5.1) — that is the surface these cards actually are.

`desc` is deliberately **omitted**: each card needs a genuine one-line description written by the author, not invented here. Add `desc` per project, or fall back to the GitHub repo `description` field (`kserve-skills` has one: "KServe Skills"). If `modal` (1★, Python, original) reads better than `kserve-skills`, swap it in — a one-line data edit. **Do not display a star badge for `kserve-skills`.**

**Micro-interactions:** hover lift (`y: -6`), per-card accent border glow, subtle 3D tilt (`rotationX`/`rotationY` via `quickTo`) — desktop `pointer: fine` only, off under reduced motion.

**Reveal:** `ScrollTrigger.batch`, stagger 0.08, `y: 40 → 0` + `autoAlpha`.

### 6.6 Contact / Footer

- Big heading: "Let's build something." (SplitText line reveal on enter).
- Buttons: **GitHub** (`github.com/BarrenWardo`) and **Ko-Fi** (`ko-fi.com/barrenwardo`) — gated magnetic hover, gradient border sweep.
- Footer line: `© <year> BarrenWardo · built with GSAP · try: help`, where `<year>` is `new Date().getFullYear()`. A hardcoded year silently rots.

### 6.7 Ambient Layer (behind content)

User selected **all four** plus "anything relevant". All four kept, made affordable:

1. **Aurora blobs:** 4 pre-blurred radial-gradient divs (§5.3 — **no `filter: blur`**); each on an infinite yoyo timeline (`x`/`y`/`scale`, 18–40s, randomized via `gsap.utils.random`, `sine.inOut`). Only 2 render on mobile.
2. **Particles:** single `<canvas>`, **24 dots desktop / 12 mobile**, drifting slowly upward, `gsap.ticker`-driven. **Pause on `visibilitychange` and when off-viewport** via `ScrollTrigger` `onToggle`.
3. **Cursor glow:** fixed radial-gradient div following the pointer via `gsap.quickTo` (`x`/`y`), `pointer-events: none`, **desktop `pointer: fine` only, off under reduced motion**. Keep `mousemove` work to the `quickTo` writes only.
4. **Grain:** static SVG-noise overlay (§5.3).
5. **Scroll progress bar:** 2–3px gradient bar, `scaleX: 0 → 1` scrubbed across the document:
   ```js
   ScrollTrigger.create({ trigger: document.body, start: "top top", end: "max", scrub: 0.3 });
   ```

This is 4 permanently-live systems plus a scrubbed bar, on top of pins and reveals. Animate transforms/opacity only, and scope `will-change: transform` to the blobs alone (§8) — the canvas repaints its own pixels and is never transformed, so promoting it buys nothing.

### 6.8 Theme Toggle (dark default → light, animated)

- Default dark; honors `prefers-color-scheme` on first visit only if no stored preference; persisted in `localStorage` (`theme`).
- **Pre-paint script (this is what prevents theme flash).** Reading the theme in a *deferred* script would run after parse **and** paint, so every light-mode visitor would see a full dark page flash on every load. The inline `<head>` script (§3) runs before first paint:

  ```html
  <script>
  (function () {
    try {
      var t = localStorage.getItem("theme");
      if (!t) t = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      document.documentElement.dataset.theme = t;
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.documentElement.classList.add("boot");
      }
    } catch (e) { /* storage blocked: dark default, no boot */ }
  })();
  </script>
  ```

  Plus `<meta name="color-scheme" content="dark light">` so the browser paints scrollbars and UA chrome correctly before CSS applies. The `try/catch` is required — a storage throw must not break the page.
- Toggle button (sun/moon morph icon) top-right.
- **Reveal mechanism.** Order matters: snapshot the outgoing palette → flip `data-theme` → wipe the old palette away. Doing it the other way round shows the user the *old* theme getting clipped for the duration of the animation, which reads as a bug.
  1. Create a fixed, full-viewport `div.theme-wipe` styled with the **outgoing** theme's colors.
  2. Set `data-theme` on `<html>` (the real theme changes instantly underneath).
  3. Animate the wipe away by driving a CSS variable. `--ox`/`--oy` come from the button's `getBoundingClientRect()` centre, in absolute px:
     ```css
     .theme-wipe {
       --reveal: 0px;
       --ox: 50%; --oy: 50%;
       clip-path: circle(var(--reveal) at var(--ox) var(--oy));
     }
     ```
     ```js
     const o = { r: 0 };
     gsap.to(o, {
       r: Math.hypot(innerWidth, innerHeight), duration: 0.7, ease: "power3.inOut",
       onUpdate: () => wipe.style.setProperty("--reveal", o.r + "px"),
       onComplete: () => wipe.remove()
     });
     ```
     Animating a proxy object and writing the custom property avoids GSAP number/unit parsing edge cases on `circle()`. The CSS defaults above matter: without them the `clip-path` is invalid until JS writes the variables.
  4. Persist to `localStorage` in `try/catch`.
- **Reduced motion / fallback:** instant attribute swap, no wipe element created.

### 6.9 Easter Eggs (both, per user choice)

- **Typed terminal commands.** The hero terminal input is focusable. Commands: `help` (lists commands), `whoami`, `ls` (lists page sections; selecting one scrolls to it), `theme` (toggles theme), `sudo make me a sandwich` (denied → then granted), `matrix`, `clear`. Unknown → witty error. Command history with ↑/↓.
  - The input needs a real `<label>` or `aria-label`.
  - While the input is focused, ↑/↓ must `preventDefault()` or they scroll the page.
  - **`ls` scrolling:** use `lenis.scrollTo(el, { offset })` when Lenis is active, falling back to `el.scrollIntoView()`. `lenis.scrollTo` resolves the element's real document position, which accounts for the pin spacer created by §6.4 — so scrolling to a section *below* the pinned orbit lands correctly. Under reduced motion Lenis makes programmatic scrolls instant on its own.
  - **Terminal scrollback:** if the command output area scrolls, mark it `data-lenis-prevent` so wheel/touch inside it behave natively.
- **Konami code** (↑↑↓↓←→←→ B A): **hyperdrive** — the particle canvas switches to a streaking starfield for ~6s, then eases back. Keyboard-only by nature; **desktop-only**, with the `matrix` command as the mobile equivalent.
- **`matrix` command / Konami variant:** canvas matrix-rain overlay (green glyphs on `--bg`), fading via `autoAlpha` after ~5s. Only one effect at a time; all effects skipped under reduced motion.

### 6.10 SEO / Meta / Favicon

- `<title>Barren Wardo — AI Aficionado & Forever Evolving</title>`, meta description, `lang="en"`, `<meta name="color-scheme" content="dark light">`.
- Canonical → `https://git.barren.eu.org/`.
- Open Graph + Twitter tags (`og:title`, `og:description`, `og:url`, `og:image`, `twitter:card`).
- **`og:image` guard.** Shipping a tag that points at a 404 is worse than omitting it. Either commit a real 1200×630 asset in the same PR, or **omit `og:image` and use `twitter:card=summary`** until it exists.
- `favicon.svg`: gradient terminal glyph with a blinking-cursor block (static SVG — browsers rasterize the first frame).

### 6.11 Smooth Scroll (Lenis) — desktop only

Foundation for §6.1, §6.2, §6.4 and §6.9.

[Lenis](https://github.com/darkroomengineering/lenis) by darkroom.engineering, **pinned to `1.3.26`** (MIT, zero runtime deps, 5.4 KB gz). Chosen over GSAP's ScrollSmoother because **Lenis drives the real scroll position** instead of transforming a content wrapper — which is precisely what keeps ScrollTrigger `pin` robust.

**Gated to `pointer: fine`.** Lenis defaults to `syncTouch: false`, so on touch devices it never smooths scroll — it would just run an rAF loop every frame doing nothing, on the hardware least able to spare it. Gating also matches the page's existing mobile discipline (halved particles, 2 blobs, no pin). On touch, scroll is fully native and anchor links jump natively; nothing is lost.

**The CSS is inlined into `css/style.css`, not linked.** A `<link>` would put a render-blocking cross-origin request in front of first paint, undermining §6.1. The file is 513 B and pinned, so copy it verbatim:

```css
html.lenis,
html.lenis body {
  height: auto;
}

.lenis:not(.lenis-autoToggle).lenis-stopped {
  overflow: clip;
}

.lenis [data-lenis-prevent],
.lenis [data-lenis-prevent-wheel],
.lenis [data-lenis-prevent-touch],
.lenis [data-lenis-prevent-vertical],
.lenis [data-lenis-prevent-horizontal] {
  overscroll-behavior: contain;
}

.lenis.lenis-smooth iframe {
  pointer-events: none;
}

.lenis.lenis-autoToggle {
  transition-property: overflow;
  transition-duration: 1ms;
  transition-behavior: allow-discrete;
}
```

That is the complete `lenis@1.3.26/dist/lenis.css` — there is nothing else in it. Only `.lenis-stopped` is load-bearing here (it backs `lenis.stop()` in §6.1); the rest is upstream hygiene, kept whole so the inlined copy stays byte-comparable on a version bump.

**Initialisation — scoped to the breakpoint, driven by `gsap.ticker`:**

```js
let lenis = null;

const scrollMM = gsap.matchMedia();
scrollMM.add("(pointer: fine)", () => {
  lenis = new Lenis({
    anchors: true,   // REQUIRED: without it Lenis suppresses every #hash anchor link
    lerp: 0.1        // default
    // respectReducedMotion: default true -> see §7. Do NOT set this to false.
  });

  lenis.on("scroll", ScrollTrigger.update);

  const raf = (time) => lenis.raf(time * 1000);   // ticker gives seconds, raf() wants ms
  gsap.ticker.add(raf);

  if (document.documentElement.classList.contains("boot")) lenis.stop();

  return () => {                 // runs when the query stops matching (e.g. tablet rotate)
    gsap.ticker.remove(raf);
    lenis.destroy();
    lenis = null;
  };
});

gsap.ticker.lagSmoothing(0);
```

Create it **before any ScrollTrigger**, so Lenis and ScrollTrigger share one frame. `lagSmoothing(0)` is required — leaving it on introduces a visible delay in scroll-linked animation. Do **not** pass `autoRaf: true`: that starts a second `requestAnimationFrame` loop that fights `gsap.ticker`.

Declare `let lenis = null;` at the top of the IIFE and assign only inside the guard, so `lenis?.start()` in §6.1 and the `catch` in §7 are safe on every path. A `const` declared further down would be in its temporal dead zone if either ran first, throwing exactly when the fallback is supposed to be saving the page.

**ScrollToPlugin is removed, not replaced.** Lenis covers both cases it served, and more correctly:

| Need | Replaced by |
|---|---|
| In-page nav / CTA | real `<a href="#id">` + `anchors: true` |
| Programmatic scroll (`ls`, skip-to-content) | `lenis.scrollTo(target, { offset, immediate })` |

`anchors` also accepts a `ScrollToOptions` object (`anchors: { offset: 80 }`) if a sticky-header offset is ever needed.

**Scroll locking — two phases**, because the inline `<head>` script runs before Lenis is constructed:

1. **Pre-init:** `html.boot { overflow: hidden }` locks native scroll (§6.1).
2. **Post-init:** if `boot` is still active, `lenis.stop()`. On finish/skip, remove the class **and** call `lenis.start()`.

Never leave `stop()`/`start()` unbalanced. An unmatched `stop()` leaves the visitor unable to scroll at all, and because `.lenis-stopped` is a CSS rule rather than a JS flag, the lock survives an exception — which is why the error path in §7 must also call `start()`.

**Teardown and lock-release semantics — read from the `1.3.26` source, not assumed:**

```js
start()   { if (this.isStopped) return; ... }   // idempotent; no-op when not stopped
stop()    { if (!this.isStopped) return; ... }  // idempotent
destroy() { /* ... */ this.cleanUpClassName(); ... }  // removes every `lenis-*` class
```

- Both guards mean **`start()` is a safe no-op if Lenis was never stopped** — which is exactly what §7's error path depends on, since it may run before Lenis is even constructed or after an exception mid-init. That path is safe by design, not by luck.
- **`destroy()` calls `cleanUpClassName()`**, so it strips `lenis-stopped` too. The `matchMedia` cleanup above therefore cannot strand the scroll lock — do not add a defensive class-removal "fix" here.
- `cleanUpClassName()` wipes **all** `lenis-*` classes on the root element, so exactly **one** Lenis instance may drive `<html>` at a time — a second instance's class update would erase the first's state. The gate creates on match and destroys on unmatch, and `lenis = null` prevents a second instance from ever being constructed over a live one.
- The source bundle contains four `destroy()` definitions (Dimensions, Emitter, VirtualScroll, Lenis); only the Lenis one touches class names. Grepping for `destroy()` in the minified bundle hits the wrong one first — check the one on the exported `Lenis` class.

**Nested scrollable regions** need `data-lenis-prevent` (§6.9). Prefer the attribute over the `allowNestedScroll: true` option: upstream documents that option as checking the DOM tree **on every scroll event**. For the same reason avoid `naiveDimensions: true` ("has a performance impact") and `autoToggle: true` (requires `transition-behavior`: Safari > 17.3, Chrome > 116, Firefox > 128).

**Known upstream limitations — reviewed and accepted:**

| Limitation | Impact here |
|---|---|
| **`position: fixed` can visibly lag on macOS Safari pre-M1** | The page has ~6 fixed layers (boot overlay, grain, aurora, cursor glow, theme wipe, progress bar). Test on that browser; mitigation is to move unaffected layers into a sticky container. Not a blocker, but do not discover it in production. |
| Capped to 60fps on Safari, 30fps in low-power mode | Accepted. |
| No CSS scroll-snap support | Not used in this design. |
| Smooth scroll stops over iframes | No iframes. |
| `syncTouch` unstable on iOS < 16 | Moot — `syncTouch` stays off and Lenis is desktop-only. |

**Verification hook:** `lenis.prefersReducedMotion` is exposed if a custom animation ever needs to branch on it, though `gsap.matchMedia()` (§7) covers the page's own animations.

## 7. Accessibility & Reduced Motion (user's explicit choice: full respect)

- **`gsap.matchMedia()`** with a three-axis conditions object:
  ```js
  const mm = gsap.matchMedia();
  mm.add({
    isDesktop: "(min-width: 800px)",
    isMobile: "(max-width: 799px)",
    reduceMotion: "(prefers-reduced-motion: reduce)"
  }, (ctx) => {
    const { isDesktop, reduceMotion } = ctx.conditions;
    // ...
  });
  ```
  `reduceMotion` is an **independent third axis**, not an alternative to the breakpoints: branch on `ctx.conditions.reduceMotion` (`duration: reduceMotion ? 0 : 2`) rather than on width alone. Do not nest `gsap.context()` inside `matchMedia` — `matchMedia` creates a context internally and `mm.revert()` is the only teardown.
- **`reduceMotion: true`** → no boot overlay (the class is never set), no ambient motion, no parallax/pinning, no count-up (instant values), no easter-egg effects, no pointer-follow effects. All content visible.
- **Scroll smoothing under reduced motion is Lenis's job.** `respectReducedMotion` defaults to `true`: Lenis forces `lerp` to `1` (scroll tracks the input device 1:1, ignoring `duration`/`easing`) and makes programmatic scrolls instant, while keeping its loop alive so ScrollTrigger sync is unaffected. It picks the preference up live, without a reload. **Do not set `respectReducedMotion: false`.** Lenis therefore stays constructed under reduced motion, unlike every other animated system on the page which `matchMedia` tears down — intentional and safe, because with smoothing off it is a pass-through, not motion.
- **Content is visible by default.** This is a hard requirement, not a preference: if `main.js` throws, or GSAP is blocked and `main.js` errors before adding `no-anim`, a JS-hidden hero means a **blank page**. So CSS ships everything visible, and JS adds `html.js-reveal` to opt into the hidden start state for **reveal targets only**.

  **Scope of `js-reveal` — above-fold content is exempt.** `js-reveal` is added by the deferred `main.js`, never by the inline pre-paint script, and it must not apply a hidden start state to the hero. Hiding above-fold content before first paint would stop the hero painting early and break §6.1's LCP design; hiding it after first paint is safe only because the opaque overlay is already covering the viewport. Reveal targets are the below-fold batch targets (§6.3, §6.5) and the contact heading.

  The whole init is wrapped:
  ```js
  try { init(); }
  catch (err) {
    console.warn("init failed, falling back to static", err);
    const h = document.documentElement;
    h.classList.remove("js-reveal", "boot");
    h.classList.add("no-anim");
    lenis?.start();   // MANDATORY: releases the CSS-side lock. Safe no-op if never stopped
  }
  ```
  **The `lenis?.start()` in that catch is not optional.** `lenis.stop()` adds the `lenis-stopped` class, and the inlined CSS rule for it (`overflow: clip`) keeps scrolling disabled even after the `boot` class is removed. Without this line, a single thrown exception leaves the page permanently unscrollable — the exact failure §9 promises will never happen.
- **Pointer effects** (magnetic hover §6.2, card tilt §6.5, cursor glow §6.7, orbit parallax §6.4) are all gated together on `pointer: fine` **and** not-reduced-motion.
- **Focus management:** the hero `<h1>` needs `tabindex="-1"` so boot completion/skip can focus it. Skip-to-content link, `:focus-visible` styles, keyboard-operable toggle and terminal.
- Semantic landmarks (`header`/`main`/`section`/`footer`); decorative layers `aria-hidden="true"`.
- **Overlay a11y:** decorative text block `aria-hidden="true"`, skip `<button>` outside it and reachable, no live region (§6.1).
- Contrast AA in both themes on **both** surfaces — values verified in §5.1.

## 8. Performance Budget

- **Transforms/opacity only.** No layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`) — per `gsap-core` and `gsap-performance`.
- **No animated `filter`.** Blobs are pre-blurred gradients (§5.3); `filter` on a moving layer re-rasterizes every frame.
- `will-change: transform` on the aurora blobs only. Not on `*`, not "just in case", and not on the particle canvas — the canvas repaints its own pixels and is never transformed, so promoting it buys nothing.
- **Particles:** 24 desktop / 12 mobile; paused when the tab is hidden and when off-viewport.
- **Fonts load off the critical path.** The Google Fonts stylesheet is the last render-blocking request on the page and sits directly in front of the LCP candidate §6.1 engineers, so load it non-blockingly and let `display=swap` paint text in the system fallback immediately:
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=...&display=swap"
        media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=...&display=swap"></noscript>
  ```
  The usual cost of this pattern is a flash of unstyled text — which is invisible here, because the opaque boot overlay covers the viewport for the first 4–5s, and the SplitText name reveal is created at boot end (§6.2), by which time fonts have normally landed. Any residual late font load is handled by `autoSplit`.
- **Measured payload:** the four pinned GSAP files plus Lenis are **~57 KB gzip / ~151 KB raw** — verified, comfortably inside the `<120 KB gz` budget with ~63 KB headroom. Breakdown: `gsap` 28.2 KB gz, `ScrollTrigger` 17.8 KB, `SplitText` 3.4 KB, `ScrambleTextPlugin` 3.9 KB, `lenis.min.js` 5.4 KB. Dropping `ScrollToPlugin` (−1.9 KB) absorbed about a third of Lenis's cost.
- **One animation loop.** Lenis is driven by `gsap.ticker`, not `autoRaf`, and `gsap.ticker.lagSmoothing(0)` is set. Two independent rAF loops is the failure mode that makes scroll-linked animation feel like it is lagging.
- **No extra render-blocking request from Lenis.** Its required CSS is inlined (§6.11) rather than fetched.
- **LCP < 2.5s on throttled 4G.** The hero paints immediately and the overlay's own first line is an early-painted LCP candidate (§6.1). Verify; if the overlay's text is not the LCP element, keep the overlay's first line as large as possible above the fold.
- No images except `favicon.svg` (and `og-image.png` if committed). Orbit icons are inline SVG — no requests.
- **`ScrollTrigger.refresh()`** after fonts load (`document.fonts.ready`) and after stats render. Create ScrollTriggers top-to-bottom in page order; use `refreshPriority` if any are created out of order (e.g. inside `matchMedia`).
- **Zero-CLS guarantee (§6.3):** skeleton and resolved cards share identical dimensions, so async stats cause no reflow and shift no trigger positions.

## 9. Degradation Matrix

| Condition | Behavior |
|---|---|
| JS disabled | `<noscript>`: overlay and ambient layers hidden, all content static and visible. The overlay is hidden by default anyway (§6.1), so no flash. |
| JS error mid-init | `try/catch` removes `js-reveal`/`boot`, adds `no-anim`, **and calls `lenis?.start()`** → complete static page that still scrolls (§7). |
| GSAP CDN blocked / SRI mismatch | `typeof gsap === "undefined"` → `no-anim`; static but complete page. |
| Lenis absent (blocked, or `pointer: coarse`) | Native scrolling, native anchor jumping. Every scroll interaction must work without Lenis: anchors are real `<a href="#id">`, and `ls` falls back to `scrollIntoView()`. **The page must never become unscrollable because a smooth-scroll library failed to load** — never call `stop()` on a Lenis instance that was not created, and always pair a `stop()` with a `start()` on every exit path. |
| GitHub API rate-limited / offline | `localStorage` cache (12h TTL) → `GITHUB_FALLBACK` (§6.3). No error UI. |
| `localStorage` blocked (private mode) | Every access `try/catch`-guarded; falls back to in-memory + `GITHUB_FALLBACK`; theme uses system preference. |
| Reduced motion | Static page, instant reveals, no boot overlay, no ambient motion, no easter eggs. Lenis is still constructed on desktop but with smoothing forced off — a pass-through, not motion (§7). |
| `pointer: fine` stops matching mid-session (tablet rotate, touchscreen toggle) | The `matchMedia` cleanup removes the ticker callback, calls `destroy()` — which also strips `lenis-stopped` (§6.11) — and nulls the reference. Scroll becomes native and anchors keep working. |
| Mobile viewport | `matchMedia`: compact orbit (no pin), 2 blobs, 12 particles, no cursor glow, shorter boot (3 lines) but still skippable. |
| Touch device | No Lenis (native scroll), no tilt/magnetic hover; tap targets ≥ 44px. Konami is desktop-only; `matrix` command covers mobile. |

## 10. File Plan

```
index.html          # semantic single-page markup, meta, favicon, inline theme/boot script,
                    # non-blocking font CSS, SRI'd CDN script tags (deferred: 4 GSAP + lenis.min.js),
                    # deferred main.js
css/style.css       # design tokens (both themes), layout, textures, inlined Lenis CSS (§6.11),
                    # no-anim/noscript fallbacks
js/main.js          # registerPlugin; Lenis init gated on pointer:fine + gsap.ticker wiring;
                    # heroReveal(); boot, stats fetch/cache, orbit, batch reveals, ambient canvases,
                    # theme toggle, easter eggs, matchMedia orchestration
favicon.svg         # gradient terminal glyph
.nojekyll           # skip Jekyll entirely (§3)
gsap-animated-profile-spec.md   # this file
```

Untouched: `README.md`, `_config.yml`, `CNAME`.

## 11. Deployment Notes

- Commit to `main` → GitHub Pages serves as-is. **Verified:** `jekyll-theme-minimal`'s own `_config.yml` contains no `defaults:` block, so a front-matter-less `index.html` is copied as a static file and no theme layout is injected. The plan is safe even without `.nojekyll`.
  - The theme still sets `site.title: "Minimal theme"`. Harmless *only because* all meta is hardcoded in `index.html` (it is). `.nojekyll` removes the theme from the build regardless.
  - The theme also copies `/assets/css/style.css`; the site's own CSS lives at `css/style.css`, so there is no path collision.
- Build on a branch; verify locally with `python3 -m http.server` (must be HTTP, not `file://`, for the deferred scripts and Fetch/CORS to behave). Then merge.
- Verify the custom domain still resolves over HTTPS after deploy (`git.barren.eu.org`).
- Commit message style in this repo is short imperative ("Update README.md") — follow it.

## 12. Acceptance Criteria

1. **Boot + LCP:** on throttled 4G, LCP < 2.5s and the hero is painted before the overlay lifts. Skipping at 0.15s lands on the final state with the hero fully revealed, and calling skip twice is harmless.
2. **No theme flash:** set light, hard-reload — zero dark frames. Same with `prefers-color-scheme: light` and no stored preference.
3. **Zero CLS:** Lighthouse CLS = 0 through the stats skeleton→data swap.
4. **Reduced motion:** with the OS setting on, no overlay is ever rendered, no motion runs, all three metrics show final values within 200ms.
5. **JS failure:** block `cdn.jsdelivr.net` and reload → complete, static, readable page. Same with a deliberately thrown error in `init()`.
6. **Contrast:** both themes pass WCAG AA for body text on every token in §5.1, checked against **both** `--bg` and `--bg-elev`.
7. **Keyboard/a11y:** skip-to-content works; theme toggle and terminal are keyboard-operable; focus reaches the hero `<h1>` after an **explicit skip** and does **not** move when boot completes on its own; overlay's decorative text is not announced; skip button is announced.
8. **Perf:** no scroll jank on a 2019 mid-range Android; no animated `filter`; `will-change` present on the blobs only.
9. **Data:** all three metrics derive from the API at runtime; with the API blocked they fall back without layout shift and without error UI.
10. **No dead links:** every card and CTA resolves. If `og-image.png` is not committed, `og:image` is not present in the HTML.
11. **Smooth scroll:** on a `pointer: fine` device, wheel scrolling is smoothed by Lenis, an in-page anchor click lands on the right section, and scrolling to a section *below* the pinned orbit lands at the correct offset (this is the check that catches a broken pin spacer). The terminal `ls` command behaves the same. On a touch device, scrolling is native and anchors still work.
12. **Scroll never locks up:** the page scrolls freely after boot completes, after a skip at 0.15s, after a skip triggered twice, and after a forced error in `init()`. Repeat the whole boot cycle several times in a row — an unbalanced `lenis.stop()`/`start()` only surfaces on a later pass, and the error path is the one that historically failed. Also force the `(pointer: fine)` query to stop matching **while boot is still active** (e.g. toggle device emulation mid-boot): the page must be scrollable once the overlay is gone, which is the check that covers the `matchMedia` teardown path.
13. **Name reveal is visible:** the hero name animation plays *after* the overlay lifts, not behind it. (Regression guard for the §6.2 timing fix.)
14. **Fonts are non-blocking:** the Google Fonts stylesheet does not appear as a render-blocking request in the Network waterfall, and text paints in the fallback stack before it arrives.

## 13. Open Items / Future

- [ ] Write the three `desc` strings for §6.5 (do not invent — use the GitHub repo description or write real copy).
- [ ] Decide `kserve-skills` vs `modal` as the third project (one-line data edit).
- [ ] Generate `og-image.png` (1200×630) — or omit `og:image` (§6.10).
- [ ] Test on macOS Safari **pre-M1** for the documented Lenis `position: fixed` lag (§6.11). This page has ~6 fixed layers, so it is the most likely place the integration shows a visual defect.
- [ ] If Lenis is ever bumped off `1.3.26`, re-diff its `lenis.css` against the rules inlined in `css/style.css` (§6.11) — inlining trades a request for that upkeep.
- [ ] Optional: split `main.js` into ES modules (`type="module"` gives defer semantics and scoping for free). Deliberately out of scope — §3 keeps a single classic script.
- [ ] Optional: analytics (none by default).
- [ ] `ScrollTrigger.clearScrollMemory` / history-restore nuance if boot + scroll interplay annoys refresh behavior.
- [x] ~~ScrollSmoother evaluation~~ — **resolved in R3.** Lenis is the smooth-scroll layer (§6.11); Lenis drives native scroll instead of transforming a wrapper, which is why pinning stays straightforward.

## 14. Source References

- Installed skills: `.agents/skills/gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-performance`, `gsap-utils` (applicable); `gsap-react`, `gsap-frameworks` (installed, not applicable).
- GSAP free-plugins announcement: https://gsap.com/blog/3-13/
- GSAP docs: https://gsap.com/docs/v3/ · https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Lenis: https://github.com/darkroomengineering/lenis · demo https://lenis.darkroom.engineering/ · the ScrollTrigger integration pattern and the `respectReducedMotion` / `anchors` / `data-lenis-prevent` / `syncTouch` behaviour in §6.11 are taken from its README.
- Verified 2026-09-23: npm `gsap@latest` = 3.15.0 and `lenis@latest` = 1.3.26; jsDelivr file listings and SRI hashes for all five pinned **script** files (4 GSAP + `lenis.min.js`), each hash re-computed on a second independent fetch; the inlined Lenis CSS byte-diffed against upstream; palette contrast computed for every token against both surfaces in both themes; GitHub API `users/BarrenWardo` and `users/BarrenWardo/repos`; `pages-themes/minimal` `_config.yml`.
