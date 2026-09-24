# Spec — Liquid Iridescence (real-time WebGL fluid) for git.barren.eu.org

**Status:** Revision 4 — **implemented** (`js/fluid.js`, `index.html`, `css/style.css`, `js/main.js`; §12 is the remaining manual checklist)
**Date:** 2026-09-24
**Repo:** `BarrenWardo/barrenwardo.github.io` (branch `main`, GitHub Pages, no build step)
**Live domain:** `git.barren.eu.org` (via `CNAME` — untouched)
**Supersedes:** the ambient-media half of the existing "monopo saigon world"
(`DESIGN.md` media section, `css/style.css` `.blob` block, `js/main.js` `initAmbient()` drift timeline)
**Reference skills:** `.agents/skills/gsap-*` (motion, ticker, performance), `impeccable` (visual craft, critique, `harden`, `audit`)
**House style:** this document deliberately mirrors `gsap-animated-profile-spec.md` — numbered § sections, normative requirements, inline *Why* notes, change log, definition of done.

**How to read this.** §1–§12 are normative. Inline *Why* notes mark decisions a future reader would otherwise "fix". §12 is the definition of done. §2 is the full interview decision record — every choice below traces to it.

---

## Change log

### Revision 4 — implementation record

Revision 3's contract is now built. This revision records only what could not be known from the spec: the measured payload, the strategy that was actually shipped where two were viable, and the review items still owed by hand.

| # | §0 obligation | Result | § |
|---|---|---|---|
| 1 | Exact served size of the OGL import | **≈ 38.4 KB gzip / 130.5 KB raw** (`+esm` bundle, HTTP 200, `application/javascript`, 133,629 B decompressed, 39,284 B gzip). **Breaches §8's ~35 KB cap by ~3.4 KB** — cap revised below with reasons. | §0, §8 |
| 2 | That `+esm` is genuinely 1.0.11 | Satisfied: the path is version-pinned (`ogl@1.0.11`), and the served banner names `Original file: /npm/ogl@1.0.11/src/index.js`. | §0 |
| 3 | GitHub Pages serves `js/fluid.js` as `application/javascript` | **Outstanding — needs a deploy.** A wrong MIME type fails the module with a console error and the blob wash stays; this is the first thing to check after the next publish. | §0 |
| 4 | Measured frame time per tier | **Outstanding — needs the target machine and a browser.** Review-gated by §8, not CI-gated. | §0, §12 |
| 5 | Contrast over rendered fluid pixels | **Outstanding — needs a browser.** The nominal-anchor table in §6.15 is the arithmetic pre-check, not this measurement. | §0, §12 |

**What was verified, and how.** Both JS files pass `node --check`. A structural check of the eleven shader sources confirmed braces balance, every GLSL uniform is assigned in JS (34 names — a declared-but-unused uniform is an inactive location, and assigning it throws), every fragment varying is output by `VERT`, and uniform arrays are indexed in range. A headless load of the page (local server, `--headless=new`) reached a complete page with `nav-blend`, `js-reveal` and Lenis present, which means the whole fluid-era `main.js` path ran without throwing.

**One defect came out of that probe, and it is fixed.** WebGL is unavailable in that headless configuration, so `Fluid.init("hero")` threw and the blob fallback took over — and it left `.fluid-scrim` in the DOM. Nothing else would have caught it: the fallback path keeps the blobs visible, but under a 72% white veil (light theme) the hero reads as a washed-out version of the fallback rather than the fallback. The scrim now leaves with the canvas it was built for, on all four paths where the hero canvas does not survive. Recorded here because the *next* person to trust a green checklist should know which path was exercised.

**Audit pass (two agents, code vs Revision 3 contract) — fixed, with three deliberate non-fixes.** Behavioral gaps closed: destroy-all stops the rAF loops (generation bump) and `status` reaches `unsupported`/`destroyed` globally; the Low-tier terminal path and every `fail()` path now release the context and drop GL refs while keeping the faded canvas element; tier downgrades and resizes dispose the previous target set; the probe runs once (no reset on scroll resume), measures timed step+draw cost — summed across both instances when co-visible — and the echo is fixed at sim 64 / DPR 1 / 8 iterations with a 6–12s emitter and no ladder; bloom and crossfade progress on the wipe's curve family; `stir`/`tint` honor their IDL defaults and ranges with retrigger-from-zero; the splat batch defers (never drops) autonomous overflow with priority-aware truncation; pointerleave decays over ~2s; the energy proxy follows the spec formula with a normalized accumulator the floor can actually trip; the handshake no longer depends on GSAP, installs visibility pausing on late module arrival, and carries the spec's deadline shape; blob tweens are skipped when the fluid is already live. Non-fixes, recorded so nobody re-reports them: (1) the GPU-readback alternative (§6.6/§8.7) is **withdrawn** — the CPU proxy is the sole path, because a float→byte reduction needs an extra shader plus a dedicated target for a 0.2 Hz signal and the proxy proved representative; §8 rule 7's readback permission is therefore moot and §6.6 stands as written minus the opt-in. (2) One `Mesh` per `Program` stays: OGL resolves programs through the mesh at render time, so the spec's literal shared mesh is not a supported path — the pass structure is unchanged. (3) The frozen-frame "two seeds" are one image: both paths run `seedField(1234)` + the 30 literals + 36 steps. The Jacobi 0.8 initial-guess decay is documented as part of step 6, not an extra pass.

**Import strategy — measured alternatives, so this is a decision and not a shrug.** Obligation 1's answer is worse than the cap, and three strategies were measured against each other:

| Strategy | Served gzip | Requests | Note |
|---|---|---|---|
| **`+esm` bundle (shipped)** | **38.4 KB** | **1** | Minified rollup of the whole package; one immutable, cache-forever request; classes exist exactly once |
| Native ESM from `src/**` | 89.4 KB | 64 | The package's own source graph, unminified — what the bundle is saving you from |
| Subset of `src/**` (the six used modules + closure) | 33.5 KB | 21 | Under the cap, unminified, and 21 requests of serial module discovery |
| Per-file `+esm` bundles of those six | 19.8 KB | 6 | Smallest, but each bundle inlines its own copy of shared classes — six distinct `Transform`/`Geometry` identities in one page |

The bundle was kept: it is one request on the critical path of a module that has a **3-second deadline from `heroReveal()`** (§3), and 21 sequential requests under a slow connection is how the fluid silently stops appearing on the connections least able to afford a retry. The per-file bundles would trade 18 KB for six copies of the library's class identity, which is the kind of cleverness that breaks silently on a patch release. **3.4 KB over a tilde-approximated cap is the cheaper error**, so the cap is revised rather than the import.

### Revision 3 — second multi-angle review corrections

A four-agent review (baseline verification against `index.html` / `css/style.css` / `js/main.js`, WebGL/OGL implementability, load-order + performance + accessibility + contrast, internal consistency + docs + design) of Revision 2 found twenty-six further defects. **Interview decisions are unchanged** — corrections only.

| # | Revision 2 defect | Class | Fix | § |
|---|---|---|---|---|
| 1 | Blob drift quoted as 18–40s; code is `18 + i*6` = **18–36s**. Signature transitions quoted as 0.8s–1.25s; no 1.25s exists in `style.css`. Line numbers drifted throughout §0. | Factual errors | Corrected (§0). | §0 |
| 2 | §12 checkbox "JS disabled: blob wash" contradicts §0/§7/§13 and the shipped `<noscript>` rule (hero is plain `var(--bg)`). | Internal contradiction | Checkbox corrected to plain hero. | §12 |
| 3 | Readiness sketch leaked the `fluid:ready` listener past the deadline, allowing the forbidden late swap; 3s deadline anchored to `main.js` init expires under the boot overlay. | Load-order bug | Named handler + teardown on both arms + `committed` guard; deadline anchored to `heroReveal()` (reveal + 3s). Never add `async` to either script. | §3 |
| 4 | `Fluid.init("hero", …)` signature and double-init guard asserted but never defined. | Unspecified behaviour | Normative `heroFluidStarted` guard + `init(instance, opts)` + `status` enum + full `window.Fluid` IDL. | §3, §6.14 |
| 5 | OGL float recipe unimplementable ("RGBA16F" is not a constructor arg); depth buffers, `HALF_FLOAT_OES`, filtering, aspect derivation, two-resolution advection, one-Program-per-pass, dissipation time-base, splat units, alpha/compositing all missing. | Unimplementable spec | Full constructor recipes, `depth:false`, LINEAR-everywhere, aspect math, per-pass programs, `pow(base, dt)` dissipation, aspect-corrected splat units, opaque renderer. | §6.1 |
| 6 | Energy readback targets a half-float surface (unreadable); 1×1 reduction in one pass unspecified; `RESEED_FLOOR` unitless; extra pass every frame contradicts §8. | Technical error | 1×1 target is RGBA8/UNSIGNED_BYTE; reduction runs only on sample frames; CPU accumulator is the default with readback opt-in; floor units defined. | §6.6 |
| 7 | "Two instances never on screen together" false during scroll transitions; 90-frame probe start undefined; DPR-0.75 path unnamed; `destroy()` semantics missing. | Wrong assumption / gaps | Combined-load watchdog rule; probe starts after first presented frame post-lift, first 10–20 frames excluded; OGL `setSize` named; `destroy()` defined. | §6.10 |
| 8 | §6.11 cites `getContext()` failure after §6.1 established OGL owns creation; `preventDefault` + "never restore" unexplained; shared-rAF stop ambiguous; echo fallback and `status` values undefined. | Contradiction / gaps | Failure = thrown `Renderer` constructor / `isContextLost()`; `preventDefault` kept only to suppress default blanking during cross-fade; per-instance `visible=false`; echo = fade canvas to 0, pause, leave obsidian; status enum defined. | §6.11 |
| 9 | Resize "one wide splat" leaves an empty field; tier frozen across orientation change; bloom start contradicts Risk 2; reduced-motion "re-render on visibility" over-specified. | Gaps | Mini-reseed (4–6 splats) on resize when running; one re-probe allowed on >25% pixel jump; `uBloom` starts after first submit, echo exempt; frozen = redisplay on visibility, re-seed only on resize/theme. | §4, §6.2, §6.12 |
| 10 | Fixed scrim cannot stay headline-centred while scrolling; echo has no scrim (unstated); `.fluid-scrim` element origin never specified; `#cursor-glow` still in §4 stack after retirement. | Internal contradictions | Centring valid at `scrollY≈0`; echo relies on obsidian + 0.5 opacity (stated); scrim div is JS-created sibling (specified); cursor-glow removed from table. | §4, §6.3, §6.7 |
| 11 | Echo deep palette unreadable in light theme; `--muted-on-fluid` used but never declared; "lifted versions" false for 3/4 anchors. | Gaps / factual error | Theme-invariant `--media-*-deep` tokens; provisional `--muted-on-fluid` pair; reworded lift claim. | §5.4, §6.7 |
| 12 | Scroll velocity + reveal impulses double-inject; amplitudes qualitative; keystroke predicate undefined; shared wipe constant across script boundary undefined; interrupted-ramp restart unimplementable; bloom/crossfade overlap; `matrix` stir/tint clocks conflict; tint-vs-theme composition undefined. | Gaps | Single batched splat pass with cap + priority-drop; provisional ranges; `e.key.length===1 && !meta/ctrl/alt` predicate; `window.THEME_WIPE` named; interrupt lerp formula; tint is overlay uniform; `matrix = stir(6s) + tint(5s)`. | §6.4, §6.9, §6.14 |
| 13 | Edge-fade method + full-bleed technique unspecified (CLS claim unprovable); forced-colors, focus ring, flash-rate, per-instance failure, RGBA8 fallback, pre-ready theme toggle rows missing; budget unenforceable; checklist overreach (console errors, cobalt-only nav, "no blob flash"). | Gaps | Overlay-only fade + full-bleed pattern; forced-colors hide rule; focus/flash checks; new degradation rows; budget labelled review-gated with numeric caps; checklist corrected. | §6.3, §7, §8, §9, §12 |
| 14 | `index.html` noscript/scrim change and this spec's own measurement record unowned in §10; `gsap-animated-profile-spec.md` list partial; normative MUST/SHOULD, constants table, resize-vs-pause, batching cap unspecified. | Gaps | §10 extended; constants table added (§6.1); resize gated on running; batch cap 8 with drop order; RFC-keyword convention added. | §10, §6.1 |

### Revision 2 — multi-angle review corrections

A technical, internal-consistency, accessibility and feasibility review of Revision 1 found nineteen defects. All are fixed below. **The interview decisions themselves are unchanged** — this revision corrects facts, code reading and internal contradictions, not intent.

| # | Revision 1 defect | Class | Fix | §|
|---|---|---|---|---|
| 1 | The module script was placed **before** `main.js`. A deferred module with a remote import must finish evaluating before a following deferred script runs, so a slow OGL fetch would delay `main.js` — and therefore the boot choreography and the LCP path. | Load-order bug | Module moved **after** `main.js`. The readiness contract is what makes that safe. | §3 |
| 2 | The readiness contract never defined what happens when `fluid:ready` arrives *after* `heroReveal()` — which is the normal case on a skipped boot. The blob-vs-fluid decision was unspecified. | Unspecified behaviour | 3s deadline; the one permitted blob→fluid cross-fade is now defined. | §3 |
| 3 | §4 claimed "five layers, only layer 3 is new" while listing z 0–5, put the blobs *above* the fluid when they are siblings inside `.ambient`, and contradicted §6.7's scrim `z-index`. | Internal contradiction | Rewritten as a real z-index stack with the new layers named. | §4 |
| 4 | OGL was described as **MIT**. It is **The Unlicense** (public domain). | Factual error | Corrected, including the documentation and risk entries. | §0, §10, §11 |
| 5 | OGL's size was left entirely unmeasured when the package README publishes author figures (Core 8 KB, Math 6 KB, Extras 15 KB, total **29 KB** minzipped). | Missing evidence | Recorded; the served-payload measurement is still required. | §0 |
| 6 | All three **white-text** contrast figures were wrong (`sage 1.65`, `amber 2.08`, `cobalt 4.45`). | Factual error | Recomputed: **1.53 / 1.88 / 3.68**. | §5.1 |
| 7 | The dark-theme anchors carried no contrast evidence at all — against this spec's own measurement rule. | Missing evidence | Computed for all four (9.85 / 9.52 / 15.01 / 11.96 : 1). | §5.1 |
| 8 | `EXT_color_buffer_half_float` was named unconditionally — that is the **WebGL1** extension. The OGL "WebGL2-only" assumption was also unverified (upstream never states it). | Technical error | Version-detected branch; the context flavour is detected at runtime, never asserted. | §6.1 |
| 9 | A capability-probe WebGL context would have silently consumed one of the browser's context slots. | Resource leak | Explicit `WEBGL_lose_context` release on the probe. | §6.1, §6.10 |
| 10 | The float/texture guidance assumed the implementation would see `getContext('webgl2')` return null — but OGL owns context creation, so that is not the failure mode that occurs. | Wrong mental model | Rewritten around OGL's actual construction path. | §7 |
| 11 | `fluid.js` was specified to use `gsap.utils.random`, coupling the module to `window.gsap` and re-introducing exactly the load-order dependency the module design exists to avoid. | Avoidable coupling | Replaced with a local PRNG. | §6.4 |
| 12 | **The theme wipe is 0.7s `power3.inOut`, not 0.8s.** The crossfade as specified would have visibly desynchronised from the wipe it exists to hide behind. | Factual error | Matched to the wipe's real timing and ease. | §6.9 |
| 13 | The crossfade was **unimplementable as written**: reading the theme tokens *after* the `data-theme` flip only ever yields the new palette, so there was nothing to interpolate *from*. | Unimplementable spec | Cache the outgoing palette at toggle time, then ramp from cache → new. | §6.9 |
| 14 | §6.7 called the scrim's core "the darkest region" — wrong in light theme, where it is the lightest. | Factual error | "Most consistent region". | §6.7 |
| 15 | Vignette strength was a single value for both themes, so the light theme darkened the very edges §6.7 promised would stay bright. | Internal contradiction | Theme-specific strength and tint. | §6.8 |
| 16 | §7 (and its hard rule) claimed the blob wash is "the CSS-visible default that JS opts *out of*". It is not: an existing `<noscript>` rule sets `.ambient { display: none !important }`, so with JS disabled the hero is plain `var(--bg)`. | Factual error | Corrected and explicitly left as unchanged behaviour. | §0, §7 |
| 17 | §6.12 relied on the frozen frame surviving in the canvas front buffer — not guaranteed across a tab restore or a device resize. | Fragile assumption | Re-render on resize and visibility restore from the same deterministic seed. | §6.12 |
| 18 | §6.15 named amber as the nav's danger and called cobalt merely "risky". Computed: the light theme fails catastrophically on **two** anchors (**1.05:1** and **1.10:1**), amber fails outright at 3.54:1, and the dark theme passes everywhere. | Wrong risk model | Full computed table; the scroll-scoped blend becomes the expected default rather than a last resort. | §6.15 |
| 19 | **Incidental defect found in shipped code:** the theme wipe is painted `#050810` / `#f3f6ff` (`js/main.js` 537) — the **retired aurora palette**, not the current `var(--bg)`. The fluid's crossfade will make this mismatch obvious. | Existing bug | Added as a required fix in the same change. | §6.9, §10, §12 |

### Revision 1 — from a nine-round design interview

| # | Decision | §|
|---|---|---|
| 1 | Technique is a **real Navier-Stokes fluid simulation**, not shader noise and not the current drifting blobs | §4, §6.1 |
| 2 | **OGL 1.0.11** is the one new dependency, loaded as an **ESM module** from jsDelivr's `+esm` build — the first dependency in this repo that cannot carry an `integrity` hash | §3, §11 |
| 3 | The existing four blobs **survive as the no-WebGL / failed-sim fallback**, hidden entirely while the sim is healthy | §6.11 |
| 4 | **Two live instances**: hero (full quality, fixed ambient layer) and a quieter quarter-res instance behind the signal board | §6.2, §6.3 |
| 5 | The signal board becomes a **full-bleed obsidian band**, giving the page its mid-page dark contrast beat | §6.3 |
| 6 | The sim is driven by **all three of autonomous emitters, pointer splats and scroll velocity**, layered | §6.4 |
| 7 | Character is **molten silk / liquid light** — wide, soft, patient; never filamentary | §6.5 |
| 8 | Palette keeps the sage/amber/oxblood triad **and adds cobalt `#3b82f6` as a co-equal fourth anchor** | §5.1 |
| 9 | Legibility is solved by **both** a theme-aware luminance/saturation cap in the shader **and** a scrim layer | §6.7 |
| 10 | Dark theme gets a **re-tuned palette**, not just reduced opacity | §6.9 |
| 11 | Quality is **three auto-cull tiers** with a frame-time watchdog; terminal state is the blob wash | §6.10 |
| 12 | **Cold start on boot lift** with an emissive bloom-in (~1.5s); nothing runs behind the boot overlay | §6.2 |
| 13 | Idle decay is countered by **periodic reseed when field energy drops** | §6.6 |
| 14 | Reduced motion gets **one static frame**, rendered once then frozen | §6.12 |
| 15 | The hero's **particle drift and cursor glow are retired**; the particle canvas keeps only its easter-egg modes | §6.13 |
| 16 | Konami/`hyperdrive` **violently stirs the fluid**; `matrix` additionally **tints it monochrome green** | §6.14 |
| 17 | Hero type stays **theme-dependent** (black on light, white on dark) with a matching theme-aware scrim and palette | §6.9 |
| 18 | Determinism: **unseeded**, a fresh flow every visit | §6.5 |
| 19 | A dither term in the shader plus a very subtle vignette | §6.8 |
| 20 | The fixed nav **keeps `mix-blend-mode: difference`**, verified against all four anchors, with a stated contingency | §6.15 |
| 21 | `PRODUCT.md` principle 4's budget is **replaced wholesale** by a WebGL-aware one; `DESIGN.md` and `gsap-animated-profile-spec.md` are updated in the same change | §8, §10 |

---

## 0. Verified baseline

Read from the repository, the npm/jsDelivr registry and OGL's own repository on 2026-09-24 — measured, not assumed. Line numbers refer to the files as they stand at Revision 3 (`index.html` 22–33/35–40/52–63/65–73/194–198; `css/style.css` 11/97–101/128–145/342–347; `js/main.js` 416–436/448–518/536–549).

| Fact | Value | Source |
|---|---|---|
| Existing ambient implementation | 4 `div.blob`, pre-blurred `radial-gradient`, `will-change: transform`, GSAP yoyo `x`/`y`/`scale`, 18–36s (`18 + i*6`), `sine.inOut`, `repeatRefresh` | `css/style.css` 129–137, `js/main.js` 417–423 |
| Blob containment | `.ambient { position: fixed; inset: 0; z-index: 0 }`; `main` + `.footer` opaque `var(--bg)`; `.hero` transparent | `css/style.css` 128, 143–145 |
| Dark theme handling today | `:root[data-theme="dark"] .blob { opacity: 0.55 }` | `css/style.css` 137 |
| Particle canvas | 2D, 24 dots desktop / 12 mobile, `drift` + `hyperdrive` + `matrix` modes | `js/main.js` 448–518 |
| Cursor glow | currently `display: none` in CSS, only optionally wired | `css/style.css` 139, `js/main.js` 426–436 |
| Grain layer | currently `display: none` in CSS | `css/style.css` 140 |
| Pinned third-party scripts | GSAP 3.15.0 (`gsap`, `ScrollTrigger`, `SplitText`, `ScrambleTextPlugin`) + Lenis 1.3.26, all `defer`, all five vendor URLs with `sha384` integrity (`js/main.js` itself correctly has none) | `index.html` 35–40 |
| Measured third-party payload today | ~57 KB gzip | `gsap-animated-profile-spec.md` §0 |
| Theme wipe | fixed `.theme-wipe` div, `clip-path: circle(var(--reveal) at var(--ox) var(--oy))`, animated **0.7s `power3.inOut`**; `data-theme` flips *before* the wipe animates; painted from hardcoded `#050810` / `#f3f6ff` — **the retired aurora palette, not the current `var(--bg)`** | `css/style.css` 97–101, `js/main.js` 536–549 (paint 538, flip 543, ease 546) |
| Signature ease | `cubic-bezier(0.19, 1, 0.22, 1)` as `--ease`; transitions at 0.8s | `css/style.css` 11, 20 |
| `ogl` latest | **1.0.11**, **The Unlicense** (public domain — no attribution obligation, and no provenance signal either), entrypoint `/src/index.min.js` (**ESM**) | jsDelivr package API, OGL README |
| `ogl` size (author-reported) | Core 8 KB, Math 6 KB, Extras 15 KB — **total 29 KB minzipped** for the entire package; this build imports a subset | OGL README size table |
| `ogl` exports used here | `Renderer`, `Program`, `Mesh`, `RenderTarget` (core); `Triangle` (extras, 382 B); `Vec2` (math) — all confirmed present in 1.0.11 | jsDelivr package file listing |
| `ogl@1.0.11/+esm` | Resolves **HTTP 200**, served as `application/javascript; charset=utf-8` — the module will parse | Verified 2026-09-24 |
| `ogl@1.0.11/+esm` served size (obligation 1) | **133,629 B raw (130.5 KB) / 39,284 B gzip (38.4 KB)** — the full-package rollup of `src/index.js`, including the loaders this build never calls | Measured 2026-09-24 (see Revision 4) |
| `ogl` source graph, for comparison | `src/index.js` closure = 348,106 B raw (340 KB) / 89.4 KB gzip across **64** files. A subset import of the six modules used here = 148,175 B raw / **33.5 KB gzip across 21 files** | Measured 2026-09-24 |
| `js/fluid.js` MIME on GitHub Pages (obligation 3) | **Not yet verified** — no deploy has run since the module was added. A `text/plain` response fails the module and the page keeps the blob wash; check the Network tab on the next publish | Outstanding |
| `three` latest | 0.186.1 (rejected — see §2) | jsDelivr package API |
| Boot overlay | opaque, `display: none` unless `html.boot`, set pre-paint, ~4–5s, skippable from 0.15s | markup `index.html` 52–63, `js/main.js` boot section |
| Inline pre-paint script | sets `data-theme` and (unless reduced motion) `html.boot`; the reduced-motion check is line 28 | `index.html` 22–33 |
| Ambient layer markup | `.ambient` holds the 4 blobs, `#particles` and `#cursor-glow`; `.grain` is a sibling | `index.html` 65–73 |
| Reduced motion today | `html.boot` never set; all GSAP timelines skipped; **blobs stay visible but static**; CSS kills every animation and transition globally | `index.html` 28, `css/style.css` 342–347, `js/main.js` `isReduced()` |
| **No-JS path** | `<noscript>` sets `#boot-overlay, .ambient, .grain, .cursor-glow, .scroll-cue { display: none !important }` — **so with JS disabled there is no wash at all; the hero is plain `var(--bg)`** | `index.html` 194–198 |

**Pin-and-measure obligations** (this spec does not invent numbers it has not verified; the implementation must confirm each of these and record the result in the change log):

1. Exact minified size of `ogl@1.0.11` as served by the jsDelivr `+esm` endpoint, raw and gzip — the author-reported 29 KB covers the *whole* package, and this build imports a subset.
2. That the served `+esm` build is genuinely `1.0.11` and not a floating or stale artifact. *(The endpoint's existence and content type are already verified — see the baseline table above.)*
3. That GitHub Pages serves `js/fluid.js` as `application/javascript` so the module script parses.
4. Measured frame time at each of the three tiers on the target desktop machine.
5. Contrast of hero type measured over **actual rendered fluid pixels**, not over the palette's nominal values (§6.7).

---

## 1. Goal

Replace the static-ish drifting blob wash with a **genuine real-time fluid simulation rendering liquid iridescence** in sage, amber, oxblood and cobalt — a molten, patient, always-moving river of light behind the hero and, quietly, behind the signal board. The interface remains strictly monochrome; the fluid is media, never UI fill.

Success is that a visitor lands on the hero and reads the moving color as *liquid light*, not as *gradient blobs*, and that it does so under `git.barren.eu.org` on GitHub Pages, after a CDN block, on a phone, on a reduced-motion machine, and on a 10-year-old laptop.

**Deliberate departure from the reference.** monopo.vn's own hero is GLSL noise on three.js. This build goes heavier — a real solver — because a full Navier-Stokes fluid was the explicit selection. Where the reference's restraint and this spec conflict, the reference's *look* wins; the reference's *technique* does not.

---

## 2. Interview decision record

Every normative choice traces to one of these. "Why" is the reasoning that must survive a future reader.

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | Technique | **Real WebGL fluid simulation** (Navier-Stokes, curl/vorticity, ping-pong passes) | Chosen over hand-written noise shaders (closest to monopo's own approach) and over CSS/SVG `feTurbulence` displacement. The user wanted the real thing, and accepted the cost. |
| 2 | Dependency policy | **OGL 1.0.11, pinned, via jsDelivr `+esm`** (The Unlicense, public domain) | OGL is shader-first and small relative to three.js — the author reports **Core 8 KB + Math 6 KB + Extras 15 KB = 29 KB minzipped for the whole package**, and this build imports a subset of it. A full-screen quad plus FBO ping-pong is exactly its wheelhouse. three.js was rejected because a screen-space sim uses no scene graph, no materials and no loaders — you would pay for a large core to draw two triangles. |
| 3 | Relationship to existing blobs | **Blobs kept as the no-WebGL fallback**, hidden while the sim is healthy | Preserves today's composition for every degraded path while letting the new tech own the primary path. |
| 4 | Drive | **Autonomous + pointer + scroll velocity, layered** | A portfolio cannot depend on the visitor moving a mouse: the hero must be alive with the cursor untouched. Pointer then takes over when present and decays back to idle; scroll velocity injects turbulence. |
| 5 | Placement | **Hero-contained, exactly as today's architecture**, **plus** a quieter echo instance | Keeps the `main`/`.footer` opaque containment rule that makes the wash legible against content, and adds the mid-page color recurrence the reference implies. |
| 6 | Mobile | **Attempt everywhere, auto-cull on slow devices** | Consistent look across devices, with a measured escape hatch rather than a blanket device veto. |
| 7 | Character | **Molten silk / liquid light** | "Deeply submerged, slow billowing; splats wide and soft, curl reads as lazy dust, nothing forms sharp filaments." Chosen over reactive-ink trails (would look like every WebGL fluid demo) and over oil-slick sheen. |
| 8 | Palette | **Triad + cobalt `#3b82f6` as a co-equal fourth anchor** (user: "it should have blue because I like it") | Blue is a first-class anchor, not a rare accent: the field has four resting states. The monochrome interface rule is untouched — this is media. |
| 9 | Legibility | **Both** a luminance/saturation cap and a scrim | Belt and braces: the sim is inherently safe *and* the composition has a focus. A saturated amber bloom under a headline would otherwise fail AA outright. |
| 10 | Dark theme | **Re-tuned palette, not opacity** | Dark mode reads as a deeper, cooler, more nocturnal liquid — oxblood/sage dominant, amber largely dropped — rather than the light palette turned down. |
| 11 | Performance stance | **Replace PRODUCT.md principle 4 with a WebGL-aware budget** | The old rule ("transforms only, capped particles, one loop") and DESIGN.md's "never animate filter" are structurally incompatible with a solver. Rewriting the rule honestly beats quietly violating it or pretending a sim fits the old one. |
| 12 | Boot interaction | **Cold start on boot lift, emissive bloom-in ~1.5s** | No GPU spend behind an opaque overlay on every load; the reveal becomes a moment, and the fluid's birth is part of the hero choreography rather than a thing that already happened. |
| 13 | Idle decay | **Periodic reseed when curl energy drops below a floor** | Fluid sims characteristically diffuse to a flat muddy average; a slow wide re-energizing burst keeps the hero a living thing without paying for constant high-amplitude emitters. |
| 14 | Reduced motion | **One static frame of the sim, rendered at init then frozen** | The visitor still receives the actual aesthetic — held still, like a photograph of the liquid — instead of losing the new look entirely. A static frame is the most literal possible reading of "no motion". |
| 15 | Echo construction | **Signal board, second live lower-res instance** | A genuinely live recurrence rather than a still; accepted at the cost of a second context and roughly double the GPU budget for the window where both are visible. |
| 16 | Dither | **Static dither in the shader + very subtle vignette** | Large smooth gradients band badly at 8-bit; a per-pixel noise term costs nothing (the pixel is already being shaded) and the vignette reinforces the centered composition and complements the scrim. |
| 17 | Easter eggs | **`hyperdrive` stirs the fluid; `matrix` tints it green** | The largest surface on the page finally registers the page's best easter egg. The starfield stays on top as-is. |
| 18 | File layout | **`js/fluid.js`, its own module script** (user delegated: "do whatever feels best, just make sure it loads properly on GitHub Pages") | Keeps a ~720-line `main.js` from doubling, keeps shaders and solver readable, and confines all WebGL knowledge to one file. GitHub Pages compatibility is a hard constraint on how it is loaded (§3). |
| 19 | Docs | **Spec covers code and doc edits** | `PRODUCT.md`, `DESIGN.md` and `gsap-animated-profile-spec.md` would otherwise actively contradict the shipped code. |
| 20 | Acceptance | **Code-complete plus a manual checklist** | No screenshot set and no enforced FPS gate; the spec ends with states to eyeball. |
| 21 | Signal band | **Full-bleed obsidian band** | The echo needs a dark host, and the page finally gets the alternating white/dark rhythm DESIGN.md describes. |
| 22 | OGL loading | **`<script type="module">` importing jsDelivr's `+esm` build** | Modules are deferred by default so load order stays safe; the price is stated up front in §11 — an ESM import **cannot carry an `integrity` hash**, so pinning the exact version string is the only guarantee. |
| 23 | Determinism | **Unseeded, fresh every visit** | Suits a playful personal site; repeat visits feel alive. (Cost: the composition is not guaranteed good — mitigated by the emitters' bounded amplitude, §6.4.) |
| 24 | Theme switch | **Crossfade the palette in-shader during the wipe** (`uMix` 0→1 over the wipe's real 0.7s `power3.inOut`) | The liquid changes temperature in sync with the page instead of popping under a covering wipe. |
| 25 | Nav blend | **Keep `mix-blend-mode: difference`**, verify over all four anchors | The blend is what makes the nav feel like part of the artwork. A failure contingency is specified in §6.15 because difference over cobalt is genuinely risky. |
| 26 | Quality tiers | **Three tiers, one-step downgrades, no upgrade back mid-session** | Avoids oscillation, and gives mid-tier hardware a reduced version instead of an all-or-nothing veto. |
| 27 | Context loss | **Fall back immediately; do not attempt in-session restore; try fresh on the next page load** | A lost context is a graceful change of weather, not a black rectangle. A one-off loss must not permanently downgrade the site for that visitor. |
| 28 | Blobs while live | **Hidden entirely** (`display: none`, their four tweens paused — not killed) | No double-painting and no wasted compositing; the fallback handoff stays a `.resume()` rather than a rebuild. |
| 29 | Interactions | **CTA ghost-pill hover, terminal keystrokes, scroll-linked section reveals** all disturb the fluid — and **nothing beyond these** | Interpreted from a multi-select where the "bare pointer + scroll velocity only" option was also selected; read as "all listed couplings, no further ones". Every coupling is enumerated in §6.4 and none may be added without a spec revision. |
| 30 | Hero type | **Theme-dependent** — light theme keeps black type on a light-field fluid (light scrim, lifted palette); dark theme gets white type on a dark core (dark scrim, deep palette) | Preserves the current light-theme identity exactly rather than converting the hero into a permanent dark chamber. Black-on-light also has the better AA margin, which is why the light-theme palette is *lifted* rather than the type inverted. |

---

## 3. Constraints & delivery decisions

- **Hosting is unchanged and is a hard constraint.** Static files served by GitHub Pages from `main`, custom domain via `CNAME`. No build step, no Actions workflow, no `package.json`, no bundler, no server. Everything the browser needs is a committed file or a pinned CDN URL.
- **GitHub Pages compatibility checklist** (the reason the user flagged this):
  - All own-file references are **relative** (`js/fluid.js`, `css/style.css`) — never origin-absolute, so the custom domain and any future rename both work.
  - `js/fluid.js` is served as `application/javascript`; a response served as `text/plain` would make the module fail to parse. Verify once after the first deploy.
  - HTTPS only (jsDelivr `+esm` and the GitHub API are both HTTPS).
  - **No shader files are fetched.** All GLSL lives in template literals inside `js/fluid.js` so there is no extra request, no CORS surface and no MIME risk.
  - No service worker, no `importmap` (unnecessary — one import), no `type="module"` anywhere except the one new script.
  - The page must remain a complete, readable, scrollable document with JS disabled, with the module blocked, and with the CDN blocked — see §7.
- **New file:** `js/fluid.js` — an ES module, `import { Renderer, Program, Mesh, Triangle, RenderTarget, Vec2 } from "https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm"`.
  - *Why `+esm` and not the bare `src/index.min.js`:* jsDelivr's `+esm` endpoint returns a single-file bundle with the correct MIME type and permissive CORS, whereas the raw source path is an unbundled module graph (~60 relative imports) that would trigger a cascade of requests. Upstream's own README recommends exactly this route *and* recommends pinning an explicit version.
  - Pin **the exact version** (`1.0.11`). Never `ogl@latest`, never an unversioned `/npm/ogl` path — with no integrity hash available, the version string is the entire supply-chain guarantee.
  - **License: The Unlicense** (public domain). No attribution obligation, no notice file to carry — and, correspondingly, no upstream provenance signal of any kind. Record it in `DESIGN.md`'s standing notes (§10).
- **Script wiring in `index.html`**, in this order:
  ```html
  <script defer src=".../gsap.min.js" integrity="..." crossorigin="anonymous"></script>
  <!-- ... ScrollTrigger, SplitText, ScrambleTextPlugin ... -->
  <script defer src=".../lenis.min.js" integrity="..." crossorigin="anonymous"></script>
  <script defer src="js/main.js"></script>
  <script type="module" src="js/fluid.js"></script>
  ```
  - *Why the module sits **after** `main.js` and not before it:* both classic `defer` scripts and module scripts are deferred, and deferred scripts **execute in document order** — so a module placed before `main.js` must finish fetching and evaluating its entire remote import graph before `main.js` runs at all. `main.js` owns the boot choreography, the hero reveal and the LCP path; making any of that wait on a third-party CDN fetch would reintroduce exactly the render-blocking dependency §6.1 of the original build spec went to great lengths to remove. Placed last, the module loads in parallel and `main.js` starts immediately. The readiness contract below is what absorbs the resulting asynchrony.
  - The consequence is real and must be handled rather than wished away: `window.Fluid` **will not exist** when `main.js` first runs. Nothing in `main.js` may assume otherwise.
- **Readiness contract (the load-order trap).** `fluid.js` may fail — CDN blocked, MIME wrong, OGL broken, no WebGL. `main.js` must therefore never assume `window.Fluid` exists, and with the module placed last it genuinely will not exist yet when `main.js` first runs. Never add `async` to either script — it breaks document order:
  ```js
  // fluid.js, last statement:
  window.Fluid = { init, stir, tint, setTheme, freeze, destroy, status };
  window.dispatchEvent(new Event("fluid:ready"));
  // main.js — normative shape (named handler, teardown on both arms):
  //   let fluidCommitted = false, fluidDeadline = 0, heroFluidStarted = false;
  //   function onFluidReady() {
  //     if (fluidCommitted) return;
  //     fluidCommitted = true;
  //     window.removeEventListener("fluid:ready", onFluidReady);
  //     startHeroFluidOnce();
  //   }
  //   function startHeroFluidOnce() {
  //     if (heroFluidStarted || !window.Fluid) return;
  //     heroFluidStarted = true;
  //     window.Fluid.init("hero", {});
  //   }
  //   // at heroReveal(): fluidDeadline = performance.now() + 3000;
  //   //   if (window.Fluid && Fluid.status === "ready") startHeroFluidOnce();
  //   //   else window.addEventListener("fluid:ready", onFluidReady, { once: true });
  //   //   setTimeout(() => {
  //   //     if (fluidCommitted) return;
  //   //     fluidCommitted = true;
  //   //     window.removeEventListener("fluid:ready", onFluidReady);
  //   //   }, <ms remaining until fluidDeadline>);
  ```
  A module that never loads fires no event — hence the deadline, not just the listener. `status` is one of `"pending" | "ready" | "unsupported" | "lost" | "destroyed"`.
- **Resolution rule — the one place a blob→fluid handoff is allowed.** When `heroReveal()` runs (boot completion, or a skip 0.15s in), set `fluidDeadline = performance.now() + 3000` and decide once:
  1. If `window.Fluid` exists and `status === "ready"` → `startHeroFluidOnce()` now.
  2. Else → leave the blob wash **visible and animated** as the interim state, and keep waiting. If `fluid:ready` arrives before the deadline, `onFluidReady()` initialises then and cross-fades the blobs out over 0.6s (the same mechanism, reversed, as §6.11's fallback).
  3. Else (deadline expires first) → commit to the blob path **permanently for this page load**: set `fluidCommitted = true` and `removeEventListener("fluid:ready", onFluidReady)` so a late module can never swap the media layer.

  *Why a deadline rather than "wait for it":* a skip can land at 0.15s, long before a cold CDN fetch completes; waiting indefinitely would leave a blank, undecided hero. *Why permanently:* the alternative — swapping the media layer in at an arbitrary later moment — is a visible change of weather the visitor did not ask for.
- **The hero canvas lives inside the existing `.ambient` layer**, which means the existing `<noscript>` rule (`index.html` 194–198) hides it on the no-JS path for free. The scrim div is created by `fluid.js` as a sibling of `.ambient` (not inside it), so `.fluid-scrim` MUST be added to that same `<noscript>` hide rule. Do not create a new top-level container for the hero fluid.
- **Unchanged:** `README.md`, `_config.yml`, `CNAME`, `.nojekyll`, the GSAP/Lenis pins and their SRI hashes, the CDN-first (no local vendor) policy, and the "own files only" file list — now five: `index.html`, `css/style.css`, `js/main.js`, `js/fluid.js`, `favicon.svg`.

---

## 4. Architecture

The stack, using the **real z-index values already in the build**. The two new pieces are the hero fluid inside the existing `.ambient` layer and the scrim that sits above it.

| z-index | Layer | Implementation | New? |
|---|---|---|---|
| 0 | `.ambient` (fixed, `inset: 0`, `overflow: hidden`, `pointer-events: none`) | hero `canvas.fluid-canvas`, the 4 `.blob` divs, `#particles` — **all siblings inside one layer** (`#cursor-glow` is removed by §6.13 and MUST NOT appear here). The fluid canvas and the blobs are mutually exclusive: whichever is live, the other is `display: none`. | canvas is new |
| 1 | `.fluid-scrim` (fixed, `inset: 0`, `pointer-events: none`, created by `fluid.js` as a sibling of `.ambient`, `aria-hidden="true"`) | theme-aware radial scrim + vignette (§6.7, §6.8). Centring on the headline is viewport centring valid at `scrollY≈0`; it does not track the hero while scrolling. | new |
| 2 | Content | `.hero`, `main`, `.footer` — unchanged containment: `main`/`.footer` are opaque `var(--bg)`, `.hero` is transparent. **These opaque backgrounds are what contain the wash (and the scrim) to the hero** — they are load-bearing, not decorative. | unchanged |
| 2 (local) | Echo instance | `canvas.fluid-echo` absolutely positioned inside the obsidian signal band, clipped by it. It is *inside* the content layer, not in the global stack, so the band's own content paints above it locally. | new |
| 95–200 | Fixed chrome | nav 95 (difference blend), theme-wipe 110, progress bar 120, theme toggle 130, boot overlay 150, skip link 200 | unchanged |

**Canvas sizing.** CSS gives both canvases `position: absolute; inset: 0; width: 100%; height: 100%`. The **drawing buffer** is sized via OGL `renderer.setSize(clientWidth, clientHeight)` with `renderer.dpr` capped per tier (§6.10) — never by writing `canvas.width` directly — and the **simulation FBOs** are sized from the sim resolution with aspect derivation (§6.1) — three different resolutions, deliberately. Never size the solver from the display buffer.

**Resize handling.** Use a `ResizeObserver` on each canvas's parent (not `window.resize` alone — the signal band can change height without the window changing), rAF-throttled, with a `clientWidth/Height === 0` guard. On resize, when the instance is running and visible: reallocate the simulation targets (updating every `uTexel`/`uAspect`), then **fire a mini-reseed of 4–6 wide splats** before the next render. A resize must never present an empty field, and reallocating clears the density target by definition — one splat is not a composed field. When paused, `document.hidden`, or reduced-motion: reallocate and re-render deterministically without the reseed (§6.12); defer the splat to resume. The tier decision is made once (§6.10) and is not revisited on resize, except one re-probe is allowed when total pixel count jumps >25% (e.g. portrait→landscape).

**Two instances, two contexts.** Browsers cap live WebGL contexts (commonly ~8–16); two is safe. Both must share **one** step driver:

```js
// one rAF for both sims; never two loops
// rAF already stops when the tab is hidden; visibility is handled by flags,
// not by re-scheduling inside a hidden branch.
function frame(t) {
  if (!document.hidden) {
    if (hero.visible) hero.step(t);
    if (echo.visible) echo.step(t);
  }
  requestAnimationFrame(frame);
}
```

*Why not drive the fluid from `gsap.ticker` like Lenis:* Lenis owns the ticker for scroll sync, and mixing a second consumer that can be paused (per-instance visibility) into the same ticker makes the pause logic ambiguous. A dedicated rAF that early-returns is simpler to reason about and cheaper to bail out of. It must still respect the single-loop rule — one rAF, two steppers, never one per instance.

**Visibility discipline (mandatory).** The hero instance pauses via `ScrollTrigger` `onToggle` (or `IntersectionObserver`) once `.hero` leaves the viewport — a full-viewport sim must never keep simulating under the projects list. The echo instance pauses the same way. Both pause on `document.hidden` and on `visibilitychange`.

---

## 5. Design system

### 5.1 Media palette

The interface palette is **unchanged** (§5.2). The four anchors below are media-only and may never be used for text, borders, buttons, badges or fills.

| Anchor | Base value | Role in the field |
|---|---|---|
| Sage | `rgb(160, 224, 171)` | Cool, bright rest state |
| Amber | `rgb(255, 172, 46)` | Warm mid-tone; the field's energy source |
| Oxblood | `rgb(165, 45, 37)` | Deep anchor; the chromatic floor |
| **Cobalt** | `#3b82f6` | Cool counterweight to oxblood; the blue that must always be findable |

These four are injected as density at splat/emitter sites and blended by the solver. They are not a `linear-gradient` anywhere.

**Per-theme variants are required** (§6.9) — the light theme *lifts oxblood to terracotta* while sage, amber and cobalt carry over unchanged (they already clear black-text AA); the dark-theme values are *deepened* versions, because the base values cannot meet AA for black text (oxblood **3.00:1**) or for white text (sage **1.53:1**, amber **1.88:1**, cobalt **3.68:1**). Sample targets, to be tuned on rendered pixels:

| Anchor | Light theme (for black type) | Dark theme (for white type) |
|---|---|---|
| Sage | `rgb(160, 224, 171)` — **13.74:1** on black ✓ | deep sage ≈ `rgb(43, 74, 51)` — **9.85:1** on white ✓ |
| Amber | `rgb(255, 172, 46)` — **11.19:1** on black ✓ | deep umber ≈ `rgb(97, 62, 18)` — **9.52:1** ✓ |
| Oxblood | lifted terracotta ≈ `rgb(201, 106, 88)` — **5.69:1** on black ✓ | deep oxblood ≈ `rgb(74, 20, 16)` — **15.01:1** ✓ |
| Cobalt | `#3b82f6` — **5.71:1** on black ✓ | deep cobalt ≈ `rgb(24, 52, 110)` — **11.96:1** ✓ |

Ratios are computed with the WCAG 2.x relative-luminance formula against each anchor's own color. They are a **starting point, not proof** — the solver blends, clamps and advects, so the real measurement happens on rendered pixels (§6.7).

The dark anchors are designed to sit below the 0.15 luminance ceiling of §6.7 (verify on rendered pixels; nominal white-on-anchor ratios above are not proof of field luminance). the ceiling is a safety bound, not a target. Staying well under it is what keeps the dark field nocturnal and keeps the brighter blended regions of the field safely inside it. Do not raise the dark anchors to "use the headroom" — the headroom exists precisely so that intermediate blend states can never reach a value that breaks white text.

*Why the light theme lifts oxblood instead of forcing a permanent dark scrim:* the user chose theme-dependent hero type with a *light* scrim in light mode (§2 #30). A light scrim over a dark oxblood field would have to do all the work alone; lifting the anchor means the field is inherently black-text-safe and the scrim is decorative rather than load-bearing.

### 5.2 Interface palette — unchanged, non-negotiable

Light: `--bg #ffffff`, `--bg-elev #ffffff`, `--text #000000`, `--muted #6d6d6d`, `--line #000000`.
Dark: `--bg #000000`, `--bg-elev #000000`, `--text #ffffff`, `--muted #a8a8a8`, `--line rgba(255,255,255,0.35)`.
No chromatic token is added to this list. **Rule: the fluid is never a UI fill** — DESIGN.md's "never introduce a chromatic UI color" survives this change intact.

### 5.3 Type, spacing, radius, elevation

Unchanged from `DESIGN.md`: Inter 300/400/500 (hero `clamp(3.5rem, 13vw, 9rem)`/1.02, section headings weight 300, body 18px, labels 11px uppercase +0.12em), Raleway 400 for exactly one heading, JetBrains Mono only for real terminal output, 4px spacing base, 0px radius everywhere except 75px pills/circles, and **no elevation, ever**.

### 5.4 New CSS tokens

```css
:root {
  /* Media palette — light theme variants. Media only: never text/border/fill. */
  --media-sage:   rgb(160, 224, 171);
  --media-amber:  rgb(255, 172, 46);
  --media-oxblood: rgb(201, 106, 88);
  --media-cobalt: #3b82f6;

  /* Hero scrim: light theme lightens the core so black type holds. */
  --scrim-core: rgba(255, 255, 255, 0.72);
  --scrim-edge: rgba(255, 255, 255, 0);

  /* Vignette strength (unitless opacity 0–1) — deliberately small, and weaker in
     light theme: the edges of a bright pastel field must not be visibly
     darkened (see §6.7). `--vignette-tint` is a comma-triplet RGB. */
  --vignette: 0.06;
  --vignette-tint: 0, 0, 0;
}
:root[data-theme="dark"] {
  --media-sage:   rgb(43, 74, 51);
  --media-amber:  rgb(97, 62, 18);
  --media-oxblood: rgb(74, 20, 16);
  --media-cobalt: rgb(24, 52, 110);

  --scrim-core: rgba(0, 0, 0, 0.68);
  --scrim-edge: rgba(0, 0, 0, 0);

  --vignette: 0.15;
  --vignette-tint: 0, 0, 0;
}

/* Theme-invariant deep palette for the echo instance (§6.3), which always
   renders on obsidian regardless of theme. In light theme these values are
   NOT readable from the theme-scoped --media-* tokens, so the echo MUST read
   these (or cache the dark values at init). */
:root {
  --media-sage-deep:   rgb(43, 74, 51);
  --media-amber-deep:  rgb(97, 62, 18);
  --media-oxblood-deep: rgb(74, 20, 16);
  --media-cobalt-deep: rgb(24, 52, 110);

  /* Provisional tagline token, created ONLY if rendered-pixel measurement
     (§6.7) shows --muted failing over the fluid. Light  #545454 (~7.5:1 on the
     lightest field); dark #c9c9c9 (~8:1 on the deepest field). Tune on pixels. */
  --muted-on-fluid: #545454;
}
:root[data-theme="dark"] {
  --muted-on-fluid: #c9c9c9;
}
```

These tokens are the **single source of truth**. `js/fluid.js` reads them with `getComputedStyle(document.documentElement).getPropertyValue("--media-sage")` (trimmed, then parsed) at init, so the shader can never drift from the CSS contract. *Why not a JS constant object:* two copies of a palette is how a design system rots.

**Reading both palettes — the trap.** The media tokens are theme-scoped, so **a read performed after `data-theme` flips returns only the new palette**: there is no way to interpolate from a value you can no longer read. §6.9 specifies the fix (cache the outgoing palette at toggle time). Anyone who instead tries to "read both themes at init" by flipping the attribute on `<html>` should not: that repaints the whole page twice and defeats the pre-paint theme script the build depends on.

**Scoping a dark band cheaply.** The obsidian signal band (§6.3) does not need its rules rewritten. Scope the interface tokens on the band itself and the existing components invert for free:

```css
.signals {
  --bg: #000000; --bg-elev: #000000;
  --text: #ffffff; --muted: #a8a8a8;
  --line: rgba(255, 255, 255, 0.35);
}
```

**`--page-bg` is an alias, not a new color.** Inside the band scope `var(--bg)` resolves to obsidian, but the edge fades must melt into the *page* background — so `--page-bg` carries the outer `--bg` value per theme (light `#ffffff`, dark `#000000`) for exactly the two `::before`/`::after` fade overlays. No new hue enters the interface palette; §12's "no new UI color token" stands.

---

## 6. Feature specification

### 6.1 Sim core

A GPU Navier-Stokes solver on a screen-space quad: **one OGL `Program` per pass** (advect, curl, vorticity, divergence, pressure, gradient-subtract, splat-add, display) sharing **one** `Mesh(new Triangle(gl))` and one fullscreen vertex shader, with ping-pong `RenderTarget`s. `Vec2` carries the per-grid `uTexel` / `uCenter` uniforms. Passes per frame:

1. **Advect** velocity (semi-Lagrangian, bilinear).
2. **Dissipate** velocity (multiply toward zero by the per-second factor).
3. **Curl** → scalar curl field.
4. **Vorticity confinement** → force along the curl gradient.
5. **Divergence**.
6. **Pressure solve** — Jacobi, `PRESSURE_ITERATIONS`.
7. **Gradient subtract**.
8. **Advect** density (the color field).
9. **Dissipate** density.
10. **Inject** emissions — autonomous emitters, pointer splats, scroll and event impulses (§6.4). Injections are additive splat passes writing to **both** the velocity and the density targets; a color injected without a matching velocity contribution sits dead in the field and is exactly what makes a fluid look like a painted gradient instead of liquid.
11. **Render** to screen: density → palette mapping → luminance/saturation clamp (§6.7) → vignette (§6.8) → dither (§6.8).

Steps 1–9 are fixed-count; step 10 is data-dependent but never adds a pass (all injections inside one frame are batched into the same splat pass, max 8 splats/frame; beyond 8, drop in this order: reveal impulses, scroll, pointer, autonomous — autonomous emitters are never dropped entirely, at most deferred one frame).

**Normative constants (provisional; tune on rendered output, then freeze in the change log):**

| Parameter | High tier | Note |
|---|---|---|
| Sim resolution (long side) | 256 | Density grid long side 512. Derive W×H per grid from canvas aspect: if `aspect >= 1`, `W = LONG, H = round(LONG / aspect)`; else `H = LONG, W = round(LONG * aspect)`. Pass per-grid `uTexel = Vec2(1/W, 1/H)`; aspect-correct splats (`dx *= aspect`). Velocity/curl/divergence/pressure run at sim res; density advection samples the velocity texture with its own texel + linear filtering; display samples density. |
| Pressure iterations (`PRESSURE_ITERATIONS`) | 20 | 12 at Medium, 8 at Low. Iteration count only — no new programs. |
| Velocity dissipation base | 0.985 /s | Applied time-correct: `factor = pow(0.985, dt)` with `dt` clamped to ≤ 1/30. Slow decay — patient motion. |
| Density dissipation base | 0.992 /s | Applied as `pow(0.992, dt)`. Color must linger: the field is the artwork. |
| Curl (vorticity) | 14 | *Deliberately low.* Above ~25 the field becomes filamentary and stops reading as molten silk (§6.5) |
| Splat radius | 0.15–0.25 aspect-corrected UV (floor 0.005 per §6.5) | Wide and soft; a small radius is what makes fluids look like ink. Gaussian profile, no hard edge. |
| Splat force | `dx = deltaPx / simLong * forceScale`, `|dx|` clamped to 8–12 grid units/frame | Clamped so a fast flick cannot blow the field apart. `deltaPx` = CSS px pointer delta; `simLong` = sim grid long side. |
| Velocity/pressure texel format | `RGBA16F` when renderable, else `RGBA8` (a documented quality apology) | Velocity + pressure need float; density alone may stay `RGBA8` longer. On partial support, keep velocity/pressure at 16F even if density drops. Half-float is what keeps the gradients smooth. |
| Density texel format | `RGBA16F` when renderable, else `RGBA8` | The energy-reduction target (§6.6) is ALWAYS `RGBA8`/`UNSIGNED_BYTE` — half-float surfaces are not `readPixels`-readable. |
| DPR cap | 1.5 | Medium 1.0, Low 0.75 |
| Renderer construction | `new Renderer({ alpha: false, depth: false, stencil: false, antialias: false, premultipliedAlpha: false, powerPreference: "low-power" })` | Opaque canvas: display shader outputs opaque. `depth: false` on every sim `RenderTarget` — no depth buffer per ping-pong pair. |
| Sim `RenderTarget` recipe (WebGL2 + float) | `{ width: W, height: H, internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT, minFilter: gl.LINEAR, magFilter: gl.LINEAR, depth: false, stencil: false }` | 16F is filterable in WebGL2 core — use 16F precisely because of this; never 32F (would need `OES_texture_float_linear`). |
| Sim `RenderTarget` recipe (fallback) | `{ width: W, height: H, format: gl.RGBA, type: gl.UNSIGNED_BYTE, minFilter: gl.LINEAR, magFilter: gl.LINEAR, depth: false, stencil: false }` | Under WebGL1 the half-float type MUST be the extension's `HALF_FLOAT_OES`, not `gl.HALF_FLOAT`; if that path cannot be satisfied, fall to `RGBA8`. |

**Float support must be version-detected, never assumed.** The renderability requirement differs by context type, and the previous revision named only the WebGL1 extension:

| Context | Required for renderable `RGBA16F` | Also needed for linear filtering |
|---|---|---|
| **WebGL2** | `EXT_color_buffer_float` | automatic for 16F (hence 16F-only, never 32F) |
| **WebGL1** | `OES_texture_half_float` **+** `EXT_color_buffer_half_float` (type = extension's `HALF_FLOAT_OES`) | `OES_texture_half_float_linear` |
| Neither | — | fall back to `RGBA8` |

*Why `RGBA8` remains an acceptable (but degraded) fallback:* plenty of mobile GPUs render without float color buffers. The sim still runs; the gradients step slightly, and §6.8's dither exists partly to soften that. **Detect once at init, never per frame.**

**Never assume the context flavour.** OGL creates the context itself, and upstream's documentation does **not** state a WebGL version requirement — so "this is a WebGL2 build" is an assumption, not a fact. Derive it at runtime from the context OGL hands back (`gl instanceof WebGL2RenderingContext`, or the `VERSION` string) and branch the table above accordingly.

**A probe context must be released.** If the implementation pre-flights support with a throwaway `canvas.getContext("webgl2") || canvas.getContext("webgl")` before constructing OGL's renderer, it **must** release it with `WEBGL_lose_context` immediately. Browsers cap live contexts (commonly 8–16) and this page needs two; leaking a probe quietly burns one of the few slots the effect depends on. Better still: let OGL create the context and treat a thrown constructor as the unsupported signal — no probe needed, no slot consumed.

### 6.2 Hero instance

- Canvas lives in `.ambient` (fixed, full viewport, `z-index: 0`, `pointer-events: none`, `aria-hidden="true"`). Containment of the wash to the hero is achieved exactly as today: `main` and `.footer` are opaque `var(--bg)`, `.hero` is transparent.
- **Cold start.** The sim does not exist during boot. `main.js` calls `startHeroFluidOnce()` (which calls `window.Fluid.init("hero", {})`) from its existing `heroReveal()` handoff — the same idempotent function boot completion and skip already share — **or** from the `fluid:ready` handler if the hero reveal has already run by the time the module arrives (§3's resolution rule). The `heroFluidStarted` guard means neither entry point can run it twice. Nothing runs behind the opaque overlay: no GPU spend while the first 4–5s are covered.
- **Bloom-in.** On init, a `uBloom` display-shader multiplier ramps 0→1 over ~1.5s on the project's signature ease `cubic-bezier(0.19, 1, 0.22, 1)`, started only after the first frame has actually been submitted (Risk 2), so the fluid appears to ignite from the center outward as the overlay lifts. If the fluid arrives late (CDN slow), the ramp starts whenever `init` actually runs — never a hard cut. The echo instance is exempt from bloom.
- **Pause** when `.hero` leaves the viewport.
- **Reduced motion:** §6.12 — one frame, then frozen; the bloom-in is skipped (a frozen frame has nothing to ramp).
- *Failure is silent here:* if `init` fails, `.blob` keeps its current `display` and the hero is simply today's hero. No error UI, no empty state, no user-visible difference beyond the absence of the effect.
- **Both canvases are created by `fluid.js` and appended into their containers** (`.ambient` for the hero, the signal band for the echo). They are **not** in `index.html` markup. This keeps the no-JS path byte-identical to today's, means the `<noscript>` rule needs no change for the fluid itself, and keeps the blobs as the default media layer whenever JS is running — JS hides them only *after* the fluid's first verified frame, so a failed module can never leave an empty hero. (With JS disabled outright, the existing `<noscript>` rule hides the whole ambient layer; see §7.)

### 6.3 Echo instance — signal board

- The signal board section becomes a **full-bleed obsidian band** in both themes. Implement it by scoping the interface tokens on the band (§5.4) rather than rewriting each rule: `--bg`/`--bg-elev` `#000000`, `--text` `#ffffff`, `--muted` `#a8a8a8` (8.83:1 on obsidian, already verified in DESIGN.md), `--line` `rgba(255,255,255,0.35)`. Every existing signal-board component then inverts correctly for free; the dashed-muted dividers become dashed-light dividers with no markup change. Full-bleed inside the constrained `main`: `width: 100%; margin-inline: calc(50% - 50vw)` on the band with an `overflow-x: clip` guard on `body` (already present, `css/style.css` 34) — no other box-model change.
- Behind it, `canvas.fluid-echo`, absolutely positioned to the band and clipped by it (`overflow: clip` on the band), running at **quarter scale** (sim 64, DPR 1, pressure iterations 8), with:
  - no pointer splats,
  - half the autonomous emitter rate (one splat per 6–12s),
  - a fixed deep palette read from the theme-invariant `--media-*-deep` tokens (not theme-tuned — the band is obsidian in both themes),
  - canvas opacity ~0.5 and a heavier dither term,
  - **no scrim**: the echo relies on obsidian + 0.5 opacity, not the global `.fluid-scrim` (which sits at z-index 1 below all content and therefore never covers the echo).
- The band's own top/bottom edges get a short gradient fade into `var(--bg)` so the obsidian block reads as an intentional band, not a rectangle pasted on the page. Implement the fade as a background/`::before`/`::after` overlay only — no padding, margin or height change. Verify zero-CLS by comparing `getBoundingClientRect()` of the cards pre/post change.
- Pauses when off-viewport (mandatory — this is the instance most likely to be running while nothing else is).
- The section's existing zero-CLS guarantee is unchanged: the band is a pure background change, no box moves, no card dimensions change.

### 6.4 Drives and couplings

**Three drives, layered, in priority order:**

| Drive | Behavior | Amplitude |
|---|---|---|
| Autonomous | 2 emitters on slow wandering paths (6–11s per leg, targets from a **local PRNG inside `fluid.js`**), each firing a wide soft splat (radius 0.15–0.25 UV, `|dx|` ≤ 4 grid units) every 3–6s, plus a permanent low-amplitude curl floor so the field never sits still | Low — must never dominate |
| Pointer | `pointermove` (throttled to one injection per frame) injects a wide soft splat (radius 0.15–0.25 UV) along the movement delta; intensity scales with speed up to the §6.1 clamp. On `pointerleave`, decay to autonomous over ~2s | Medium — visible but never a scribble |
| Scroll | `ScrollTrigger` `onUpdate` `getVelocity()` maps to a turbulence injection: `|dx|` ≤ 6 grid units, radius 0.2–0.3 UV. Fast scrolling visibly stirs; stopping lets it settle. Scroll velocity and section-reveal impulses in the same frame batch into the single splat pass (§6.1); combined injections still obey the 8-splat cap. | Medium, clamped |

**Three event couplings, and no others:**

1. **Ghost pill hover** — hovering `.btn` injects one warm, diffuse bloom (radius 0.2–0.3 UV, `|dx|` ≤ 3 grid units, amber-weighted) beneath the element's center (read via `getBoundingClientRect()`). No sharp splat: physically it should read as a warm hand held near the liquid. Gated on `pointer: fine` and not-reduced-motion, matching the existing magnetic-hover gate.
2. **Terminal keystrokes** — a `keydown` on `.term-input` stirs the field iff `e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey` (IME composition / paste / mobile predictive text do not count; one impulse per key event, radius 0.1–0.15 UV, `|dx|` ≤ 2). Character keys only: ignore modifiers, navigation keys, `Tab`, `Enter`. (Command history with ↑/↓ already has `preventDefault` handling; those keys must not stir the field.)
3. **Section reveals** — each `ScrollTrigger` reveal batch (signal cards, project rows, contact heading) sends one slow, wide impulse (radius 0.25–0.35 UV, `|dx|` ≤ 3), batched with scroll-velocity injection per §6.1 — never a second pass.

*Why a local PRNG and not `gsap.utils.random`:* `fluid.js` is loaded as a module and must be able to initialise on its own terms. Reaching for `window.gsap` re-introduces the exact load-order dependency the module placement and readiness contract exist to remove — and it would fail outright if GSAP were blocked while OGL loaded fine. `Math.random()` is sufficient; the emitters do not need GSAP's seeded distribution.

*Why exactly three couplings:* the multi-select answer included both "all three couplings" and "bare pointer + scroll only" (§2 #29). The reading adopted here is **all listed couplings, nothing more**. Adding a fourth requires a spec revision, because each coupling is a permanent per-frame cost on every device.

**Reduced motion:** autonomous drift off, all couplings off, no pointer/scroll injection — one static frame (§6.12). **No-WebGL:** all drives are moot; blobs handle the hero as they do today.

### 6.5 Character — "molten silk"

The look, expressed as constraints the implementation must not violate:

- **Splats are wide and soft.** Radius ≥ 0.005 UV; the velocity profile has no hard edge. If you can see the circular boundary of a splat, it is wrong.
- **Curl is lazy dust, not filaments.** Vorticity confinement stays low (≤ ~16). High curl produces the thread-like structure of every fluid demo and reads as ink, not light.
- **Disturbances diffuse within ~1s.** A single splat must be absorbed into the field fast — the visitor should feel the field move, not track a persistent shape.
- **Nothing is sharp.** No cellular patterns, no visible solver artifacts, no ring-shaped pressure residue.
- **No visible tiling or seam.** Emitter paths must not create a repeating pattern the eye can lock onto.
- **Unseeded.** Each visit differs (§2 #23). The amplitude ceilings above are what keep a random start from ever producing an ugly frame; do not raise them to make the field "more interesting".

**Forbidden:** screen-space reflected splats, sharp additive highlights, bloom-if-it-washes-out-the-scrim, and any effect that makes the hero look like a lava lamp rather than liquid light.

### 6.6 Idle reseed

- Sole path: a **CPU-side energy proxy** — a decaying accumulator of injection magnitudes (`energy = energy * pow(0.5, dt/10) + |injection|`, sampled once every 5s, accumulator normalized before comparison with `RESEED_FLOOR`). No GPU readback anywhere. (A `readPixels` alternative was considered and withdrawn during implementation: a float→byte reduction needs an extra shader plus a dedicated target for a 0.2 Hz signal, and the proxy proved representative.)
- If energy < `RESEED_FLOOR` (mean curl magnitude in normalized 0–1 density units; provisional 0.02) for two consecutive samples, fire one **wide, slow, gentle** burst (radius ~0.3 UV, `|dx|` ≤ 2 grid units, no velocity spike) at a random off-center point — enough to re-energize, gentle enough to be invisible as an event.
- *Why the CPU proxy is the default:* it is free, synchronous, and cannot hitch. The readback is 4 bytes at 0.2 Hz but still stalls one frame; use it only if the proxy proves unrepresentative on real hardware.
- Reseed never runs when the instance is paused or `document.hidden`.
- **A resize forces a mini-reseed when running.** Reallocating the simulation targets clears density by definition (§4), so the resize handler fires 4–6 wide splats immediately after reallocation rather than waiting for the energy floor to trip. When paused/hidden, defer per §4.

### 6.7 Legibility — cap *and* scrim

Two independent guarantees, both required. Neither alone is sufficient: the cap keeps the palette survivable, the scrim makes the composition's center deliberate.

**Guarantee 1 — luminance/saturation clamp in the final shader pass:**

- Light theme: enforce a **relative-luminance floor of ~0.19** and cap saturation (~0.55) so black type clears 4.5:1 in every region — not just on average.
- Dark theme: enforce a **relative-luminance ceiling of ~0.15** so white type clears 4.5:1 (the AA floor for white is L ≤ 0.183).
- Clamping is a smooth tone operation, never a hard clip — a hard clip produces flat-topped blobs, the visual signature of an amateur shader.

**Guarantee 2 — scrim layer** (`.fluid-scrim`, fixed, `inset: 0`, `z-index: 1`, `pointer-events: none`):

```css
.fluid-scrim {
  background:
    radial-gradient(60% 55% at 50% 42%, var(--scrim-core), var(--scrim-edge) 72%),
    radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(var(--vignette-tint), var(--vignette)));
}
```

Light theme core is white-ish, dark theme core is black-ish (§5.4). The core is centered on the hero headline, so the **most consistent region of the frame sits exactly under the type at the top of the page** — and the fluid stays **as bright and saturated at the viewport edges as the composition allows** (light-theme vignette ≤ 0.06, §6.8), where nothing needs to be read. *In light theme the core is the lightest region, not the darkest; the point is consistency under the type, not darkness.*

**Containment depends on the content layer.** Like the wash itself, this fixed scrim is contained to the hero only because `main` and `.footer` are opaque and painted above it (content `z-index: 2` > scrim `1`). If a future change makes either background transparent, the scrim will cover the entire document. That dependency is deliberate and is recorded here so it is not discovered by accident.

**Measurement obligation.** Nominal palette math (§5.1) is *not* proof — the solver blends and clamps values, so both text colors must be measured against **rendered pixels** at the worst-case frame: the brightest amber bloom under the headline (light theme) and the brightest sage/cobalt region under the headline (dark theme). Tightest acceptable: 4.5:1. If hero `.tagline` (`--muted` #6d6d6d, 5.17:1 on paper) fails over the fluid, activate the provisional `--muted-on-fluid` (§5.4) — do **not** dim the fluid further.

### 6.8 Dither and vignette

- **Dither (required).** A per-pixel noise term added to the final color, amplitude ~0.6/255:
  ```glsl
  float d = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  color += (d - 0.5) * (0.6 / 255.0);
  ```
  Static (not time-varying) — an animated dither would be motion, and would also need reduced-motion handling. *Why it is mandatory:* four anchors interpolated across a full viewport produce large low-contrast gradients, exactly the case where 8-bit quantization bands visibly. This costs nothing (the pixel is already being shaded) and is the standard fix.
- **Vignette (required, very subtle, and theme-specific).** `--vignette: 0.15` in dark theme, **`0.06` in light theme**; folded into the scrim layer above via `rgba(var(--vignette-tint), var(--vignette))`. It reinforces the centered headline composition and complements the cap. Vignette and scrim share one layer and one containment dependency (§6.7) by construction — turning the scrim off turns the vignette off; tune them as a pair.
  - *Why the light theme needs a weaker vignette:* §6.7 promises the fluid stays bright at the viewport edges, where nothing needs to be read. A 0.15 dark overlay at those edges would directly contradict that promise on the one theme where the field is supposed to be luminous. Above 0.2 the vignette starts reading as a dark overlay rather than an atmosphere — in light theme that threshold is much lower.
- The existing `.grain { display: none }` stays `display: none`. The SVG `feTurbulence` overlay is **not** resurrected — DESIGN.md removed it from this world deliberately, and the in-shader dither covers the same need for free.

### 6.9 Theme behavior

**Per-theme palettes, crossfaded in-shader.** `uMix` is a `float` uniform ramping `0 → 1` (or `1 → 0`) over **0.7s on `power3.inOut`** — **exactly the wipe's timing and ease, not the page's 0.8s CSS signature ease** — interpolating all four anchors between the light and deep sets.

*Why the wipe's numbers and not `--ease`:* the existing wipe runs `duration: 0.7, ease: "power3.inOut"` (`js/main.js` 545–549). The crossfade exists to hide inside that wipe; if it finished 0.1s later on a different curve, the fluid would visibly complete *after* the wipe had gone, which is precisely the seam the crossfade was chosen to prevent. Both read from one shared constant owned by `main.js` and set before `fluid:ready` can fire: `window.THEME_WIPE = { duration: 0.7, ease: "power3.inOut" }`. The module reads `window.THEME_WIPE`; GSAP's `power3.inOut` is approximated in-shader by `smoothstep`-shaped easing over the same duration.

**The palette-caching requirement — this is the part that is easy to get wrong.** The media tokens are theme-scoped (§5.4), so a `getComputedStyle` read performed *after* `data-theme` flips returns only the new palette. There is nothing left to interpolate *from*. The sequence must therefore be:

1. On toggle, **before** touching `data-theme`, read and cache the four outgoing anchor values.
2. Flip the theme (the existing handler already calls `applyTheme(to)` before the wipe animates — hook the crossfade start to that same point).
3. Read the four incoming anchors.
4. Set `uFrom`/`uTo` uniforms and ramp `uMix` 0→1 over 0.7s `power3.inOut`.
5. On completion, copy `uTo` into `uFrom` so the next toggle has a valid starting point even if the theme is flipped twice in quick succession.

An in-flight crossfade interrupted by a second toggle must restart from the *current interpolated* state, not from `uFrom`: snapshot `m = uMix` at interrupt, compute `current = lerp(uFrom, uTo, ease(m))` on the CPU, use `current` as the new `uFrom` with the fresh `uTo`, and ramp `uMix` 0→1 again. Snapping mid-ramp is more visible than a slightly faster second ramp. `window.Fluid.setTheme(to)` owns this entire sequence — signature in §6.14.

*Why this fits the existing wipe:* the wipe reveals the new theme through an expanding circle from the toggle button. Crossfading the fluid on the same clock means the boundary the user sees is the wipe's boundary, not a visible palette seam inside the liquid. The wipe does the concealing; the crossfade does the continuity. Do not add a second overlapping reveal.

**Incidental defect to fix in this same change.** The wipe is painted from hardcoded `#050810` / `#f3f6ff` (`js/main.js` 538) — the **retired aurora palette**, not the current `--bg` (`#000000` / `#ffffff`). Today that mismatch is nearly invisible because the wipe is an off-black — against the new fluid it will read as a colour cast crossing the page. The wipe must be painted from the outgoing theme's actual background (`getComputedStyle` of `--bg`, matching the snapshot already required in step 1 above) rather than a literal.

**Hero type stays theme-dependent (§2 #30):**

| | Light theme | Dark theme |
|---|---|---|
| Hero name / headings | `var(--text)` = `#000000` | `var(--text)` = `#ffffff` |
| Tagline | `--muted` or `--muted-on-fluid` if measurement demands (§6.7) | `--muted` #a8a8a8 |
| Scrim core | `rgba(255,255,255,0.72)` | `rgba(0,0,0,0.68)` |
| Fluid palette | lifted anchors (§5.1) | deep anchors (§5.1) |

**The echo instance is exempt from theme tuning** — its host band is obsidian in both themes, so it always renders the deep palette.

**Theme change during a running sim** must not reset velocity, clear density, or restart `uBloom`. Only the four palette uniforms move. If a `matrix` tint (§6.14) is active, the theme crossfade composes underneath the independent `uTint` overlay — the tint releases onto the *current* theme palette.

### 6.10 Quality tiers and auto-cull

| Tier | DPR cap | Sim res | Density res | Pressure iters | Emitter rate |
|---|---|---|---|---|---|
| **High** | 1.5 | 256 | 512 | 20 | 1.0× |
| **Medium** | 1.0 | 128 | 256 | 12 | 0.8× |
| **Low** | 0.75 | 64 | 128 | 8 | 0.6× |

- Start at the tier implied by a cheap device hint (viewport size, `devicePixelRatio`, `navigator.hardwareConcurrency` where available), then **probe** the first ~90 frames **starting after the first presented frame post-boot-lift** and compute average frame time, **excluding the first 10–20 frames** (compile + reveal + font/stats fetch) and using median as a tiebreak on noisy devices.
- Budget: **22 ms** average over the window (a ~45 fps floor with headroom, deliberately looser than 16.7 ms so a single hitch does not trigger a downgrade).
- Miss the budget → **step down exactly one tier** (dispose + recreate `RenderTarget`s, reset the clock) and re-probe after a further 90 frames. Never step down twice from one window.
- **Never step back up mid-session.** Oscillation is worse than running slightly below the device's ceiling — a visible quality pop every few seconds is a bug, not an optimization.
- **Low + still missing the budget → cross-fade to the blob wash over 0.6s, then per-instance `destroy()`** — cancel stepping for that instance, `WEBGL_lose_context.loseContext()`, remove the canvas, drop GL refs, set `status: "destroyed"` (plus a global `destroyAll()`). Losing the context deliberately is what actually releases GPU memory. The handoff is one-way for the session.
- The echo instance is exempt from its own tier logic: it is fixed at quarter scale and simply pauses when off-viewport.
- **One ladder covers steady state; transitions are combined.** The mandatory off-viewport pause (§4) means steady state is a single live instance, but during hero→band scroll transitions both can be partially visible — the worst case the probe never measures. Whenever both `visible` flags are true in one frame, the watchdog MUST measure combined `hero.step + echo.step` wall time against the same 22 ms budget. If co-visibility becomes common (e.g. hero shortened, third instance), split the ladders — do not keep a single-instance probe.
- The probe must not consume a context slot. Let OGL construct the context and treat a thrown constructor as the unsupported signal; if a pre-flight probe is used anyway, release it (§6.1).
- *Why the probe is once:* re-probing on scroll (a rejected alternative) doubles the state machine for a case the off-viewport pause already covers.

### 6.11 Context loss and fallback handoff

- `canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); … }, false)` — `preventDefault()` is kept ONLY to suppress the browser's default blanking during the 0.6s cross-fade; it does not signal a restore intent:
  1. Set that instance's `visible = false` (the shared rAF in §4 keeps running while the other instance is alive).
  2. Hero: cross-fade to the blob wash over 0.6s — fade the canvas `opacity` to 0, set the blobs back to `display: block`, and `.resume()` their four tweens. Because those tweens were **paused, never killed** (last bullet below), no restart path has to exist — which is the entire reason for pausing rather than destroying them. Echo: fade its canvas to 0, pause, and leave the plain obsidian band (the "static band" terminal state).
  3. Do **not** attempt an in-session restore. A lost context is a graceful change of weather, and a restore attempt on a memory-pressured iOS device is how you lose the second context too. Set `status: "lost"`.
- **No persistent downgrade.** Nothing about the failure is written to `localStorage` or `sessionStorage`; the next page load attempts the fluid fresh. A transient loss must never permanently downgrade the site for that visitor.
- Construction failure takes the same path — blobs, silently. The failure signal is a **thrown OGL `Renderer` constructor** (or `renderer.gl.isContextLost()` true immediately after); OGL owns context creation (§6.1), so a bare `getContext()` returning null is not the failure mode. Attach `webglcontextcreationerror` on the canvas OGL creates, inside the same try/catch → `status: "unsupported"`.
- **Blobs while the sim is healthy:** `display: none` on `.ambient .blob`, and the four per-blob tweens — **plain `gsap.to()` tweens, not a timeline** — **paused** with `.pause()`. Never `kill()`, never `destroy()`, or §6.11 step 2 becomes a rebuild instead of a `.resume()`. *Why hidden rather than 0-opacity:* a second full-viewport compositing layer drifting invisibly is pure waste, and the cross-fade handoff is a single explicit transition rather than a permanent hidden cost.

### 6.12 Reduced motion

- `prefers-reduced-motion: reduce` → **render exactly one frame of the sim at init, then stop the loop permanently.** No autonomous drift, no pointer injection, no scroll injection, no couplings, no bloom-in, no reseed, no theme crossfade (instant palette swap).
- The static frame must be **representative**, not the empty field it would otherwise be at t=0: seed it with a deterministic set of wide splats (**exactly 30 committed literals** — positions, radii, amplitudes — in `fluid.js`, delegated to the builder's eye and verified via the §12 frozen-frame check in both themes) before the single render, so the frozen image shows a composed liquid rather than one lonely blob. *Why:* the frozen frame is the entire experience for these visitors — it has to be a good photograph of the liquid, not a screenshot of a cold start.
- **This is a deliberate exception to §2 #23's "unseeded" rule.** A random single frame could be a bad photograph, and there is no second frame to correct it; determinism is the only way to guarantee the reduced-motion visitor gets a composed image. The frozen frame is therefore identical on every visit by design.
- **The context is kept but idle** (never stepped, never `destroy()`ed — destroying it blanks the canvas). Do **not** rely on the front buffer surviving, though: a tab restore, a device resize, or a driver-level surface loss can leave the canvas blank. Therefore "frozen" means *no animation*, not *never drawn again*: on `resize` (via the `ResizeObserver`) re-seed deterministically + run a fixed K steps synchronously + single display draw; on `visibilitychange` → visible, do a display-only re-draw from the live FBOs without re-simulating. The frozen path is exempt from the §6.10 watchdog.
- Theme change under reduced motion updates `uFrom`/`uTo` instantly + one display draw (no reseed), then returns to idle.
- *Consistency with the CSS:* the existing reduced-motion block (`css/style.css` 342–347) force-disables every animation and transition. That is already compatible with the instant palette swap required here, and it is another reason the frozen-path palette change must be instant rather than ramped. Note also that this block does **not** hide `.ambient` — under reduced motion the blobs are visible-but-static today, so the frozen fluid frame occupying the same layer is a behaviour change only in *what* is shown, not in *whether* the layer exists.
- This is the *only* path where a visitor with reduced motion sees the new aesthetic at all (§2 #14); it must not be treated as "the static fallback" and left as the least-tested path.

### 6.13 Retiring the particle drift and cursor glow

- **Particle canvas:** the `drift` mode is **retired**. The canvas element and its loop survive for the `hyperdrive` and `matrix` easter-egg modes only (§6.14), and must no longer render 24 drifting dots. Implementation: keep the canvas, skip the drift render and skip `seed()`'s dot generation while `particleMode === "drift"`, and only allocate/step dots when a mode is active. Initial canvas state in drift is empty/transparent.
  - *Consequence to verify:* the canvas's existing "pause when off-viewport / hidden" wiring MUST NOT gate mode entry — `hyperdrive`/`matrix` entry MUST cold-start dot state, and visibility-pausing applies to stepping only, never to mode entry.
- **Cursor glow:** remove entirely — the DOM node, its `display: none` rule, and the `quickTo` wiring in `initAmbient()`. The fluid now answers the pointer directly; a second pointer-following layer is redundant and, worse, it is the one ambient layer that would sit *above* the fluid and advertise the pointer twice.
- *Why retire rather than keep:* the fluid is now the page's single visual gesture (DESIGN.md: "one hero-sized visual gesture per page"). Keeping three ambient systems in the same viewport would not only clutter the composition but also compete for the same GPU budget the sim needs. Retiring them buys real headroom: two fewer live systems for zero loss of concept.

### 6.14 Easter eggs

**`window.Fluid` IDL (normative):**

```js
Fluid.status; // "pending" | "ready" | "unsupported" | "lost" | "destroyed"
Fluid.init(instance, opts); // instance: "hero" | "echo"; opts: { quality?: "high"|"medium"|"low" }
Fluid.stir({ intensity, durationMs, radius }); // intensity 0..1 (default 1), durationMs (default 6000), radius UV (default 0.25)
Fluid.tint({ color, rampMs, holdMs }); // color [r,g,b] 0..1 (matrix green default [0.2,1.0,0.35]), rampMs default 500, holdMs default 4500
Fluid.setTheme(to); // to: "light" | "dark" — owns the §6.9 cache/flip/read/ramp/copy sequence
Fluid.freeze();   // reduced-motion path: render one deterministic frame, stop stepping
Fluid.destroy(instance?); // per-instance or destroyAll(): cancel stepping, lose context, remove canvas
```

- **Konami code → `hyperdrive`:** in addition to the existing starfield on the particle canvas, the fluid receives a ~6s violent stirring: splat force and vorticity temporarily spike, the emitters are pushed outward, and the color field smears into directional streaks. It then decays back to calm over ~1.5s. Implementation: `window.Fluid.stir({ intensity: 1, durationMs: 6000 })` — a single documented API call, not a shader mode. The starfield stays exactly as it is, on top.
- **`matrix` command:** the same stir, **plus** a monochrome-green tint defined as `stir({ intensity: 1, durationMs: 6000 }) + tint({ color: matrixGreen, rampMs: 500, holdMs: 4500 })` — the tint clock lives inside the stir clock (~5s tint within ~6s stir). `tint` ramps the independent `uTint` overlay uniform (amount 0→1 + color) that pulls the field to a single green, holds, then releases onto the *current* theme palette. The palette is restored exactly; the tint must not persist past its duration even if the theme changes mid-effect (§6.9: theme crossfade composes underneath `uTint`).
- Both effects are **skipped entirely** under reduced motion and wherever no live sim exists (blob fallback, WebGL unsupported, context lost, or before the module has arrived). Being on the Low *tier* is not a reason to skip — the sim is live at every tier. A command must still print its terminal output in every case: the easter egg degrades, it does not vanish.
- Only one effect at a time (unchanged existing rule): `canvasEffect()`'s `particleMode !== "drift"` guard extends to the fluid calls too.

### 6.15 Fixed nav over the fluid

- **Keep `mix-blend-mode: difference` with white text.** This is what makes the nav feel like part of the artwork, and the user explicitly chose to keep it (§2 #25).
- **What difference blending actually does to white text:** the glyph resolves to `|backdrop − white|` — the exact inverse of the backdrop. The glyph's colour therefore *changes with the fluid*, and its legibility is the contrast between that inverse and the backdrop still behind it. Computed per anchor (WCAG 2.x relative luminance, verified by calculation, to be re-confirmed on rendered pixels):

| Anchor | Light theme | | Anchor | Dark theme | |
|---|---|---|---|---|---|
| Sage | glyph `rgb(95,31,84)` on `rgb(160,224,171)` | **7.59:1** ✓ | Deep sage | `rgb(212,181,204)` on `rgb(43,74,51)` | **5.29:1** ✓ |
| Amber | `rgb(0,83,209)` on `rgb(255,172,46)` | **3.54:1** ✗ | Deep umber | `rgb(158,193,237)` on `rgb(97,62,18)` | **5.12:1** ✓ |
| Lifted terracotta | `rgb(54,149,167)` on `rgb(201,106,88)` | **1.05:1** ✗✗ | Deep oxblood | `rgb(181,235,239)` on `rgb(74,20,16)` | **11.50:1** ✓ |
| Cobalt | `rgb(196,125,9)` on `rgb(59,130,246)` | **1.10:1** ✗✗ | Deep cobalt | `rgb(231,203,145)` on `rgb(24,52,110)` | **7.60:1** ✓ |

**Read the table before planning any work here.** The danger is the **light theme**, not cobalt in particular: two anchors fail at roughly 1:1 — the glyph and its backdrop are the same brightness, so the nav effectively disappears over the terracotta and cobalt regions — and amber fails outright at 3.54:1. The dark theme passes everywhere with margin, because deep anchors invert to *light* glyphs. This is a near-certain failure, not a risk to be discovered later, and the plan must reflect that. The table assumes flat-anchor backdrops as a worst-case illustration; the real backdrop is blended fluid + scrim + vignette, so the §6.7 rendered-pixel re-confirmation governs.

- **Decision (locked): scope the difference blend to the hero's scroll range** and resolve the nav to `var(--text)` once it is over opaque content. This keeps the blend *exactly where it was asked for* — over the fluid, which is the whole reason the blend is charming — and gives deterministic contrast over the light and obsidian bands. Nudging the light-theme anchors is a partial mitigation only (a nudge large enough to fix 1.05:1 would destroy the anchor's identity). Dropping the blend entirely remains the last resort.
- **Do not ship a legibility failure because the blend is charming.** The user's instruction was to keep the blend *and verify it* — the verification above is the answer, and acting on it is completing that instruction, not overriding it.
- The nav is `position: fixed` and unaffected by the canvas; no z-index or blend change is otherwise required.

---

## 7. Degradation matrix

Every row must end in a complete, readable, scrollable page. This table is the contract.

| Condition | Hero | Echo | Mechanism |
|---|---|---|---|
| Everything works | Fluid (tier per §6.10) | Fluid, quarter scale | Primary path |
| Playable but slow module (blocked/3G) | Blob wash until `fluid:ready`, then 0.6s cross-fade to fluid if inside the 3s deadline from `heroReveal()` | Follows the hero | §3 resolution rule 2 — the one permitted blob→fluid handoff |
| Reduced motion | One static frame, frozen | One static frame, frozen | §6.12 — context kept, never stepped; display-only re-draw on visibility, deterministic re-seed on resize/theme. Visible because the CSS reduced-motion block does **not** hide `.ambient` |
| Reduced motion × no WebGL | Blob wash, static | Plain band | Blobs are visible-but-static under the CSS reduced-motion block; no canvas exists |
| JS disabled | **Plain `var(--bg)` hero — no wash** | Plain band | Unchanged existing behaviour: the `<noscript>` rule hides `.ambient` entirely. No canvas exists (JS creates them). |
| Module blocked / MIME wrong / OGL 404 | Blob wash, animated | Plain band | `fluid:ready` never fires → 3s deadline → blob path, permanent for the session (§3) |
| WebGL unavailable or context creation error | Blob wash, animated | Plain band | Thrown OGL `Renderer` constructor → `status: "unsupported"`. No probe context is left live (§6.1) |
| Float render targets unsupported (RGBA8 fallback) | Fluid, reduced gradient fidelity | Fluid, quarter scale | §6.1 fallback row — still the primary path, not a blob row; heavier dither covers banding |
| Hero OK, echo context dropped (likeliest iOS 2-context failure) | Fluid | Plain obsidian band | **Hero wins**: the echo yields its context first and never contends with the hero; per-instance `visible=false` + canvas fade (§6.11); hero unaffected |
| Theme toggled before `fluid:ready` | Blob wash, then fluid in current theme | Follows the hero | `setTheme` is a no-op until `init`; `init` reads live tokens |
| Device misses Low tier | Blob wash (0.6s cross-fade) | Plain obsidian band | §6.10 terminal state + deliberate context loss |
| Context lost mid-session | Blob wash (0.6s cross-fade) | Plain obsidian band | §6.11, no restore attempt, no persistent downgrade |
| `main.js` throws during init | Blob wash, static | Static band | existing `catch` adds `no-anim`, removes `js-reveal`/`boot`, calls `lenis?.start()` |
| CDN fully blocked (GSAP too) | Today's static page | Static band | existing `no-anim` path, unchanged |
| Tab hidden / hero off-viewport | Paused (iOS sleep may additionally drop contexts → blob fallback on restore) | Paused | §4 visibility discipline — mandatory, not an optimization |

**Hard rule:** nothing in the fluid path may ever be the reason content is hidden. Both canvases are decorative (`aria-hidden="true"`, `pointer-events: none`, created by JS), the scrim is decorative, and **the content is the CSS-visible default** — the wash, with or without JS, is never load-bearing for readability.

**Correction to a Revision 1 claim, deliberately preserved here.** Revision 1 asserted that "the blob wash remains the CSS-visible default that JS opts *out of*". That is not true of the shipped build: the `<noscript>` block hides `.ambient` outright, so with JS disabled there is no wash and the hero is plain `var(--bg)`. This change **does not alter that** — making the wash available without JS would be a product decision (it is currently a plain, complete, readable hero, which satisfies `PRODUCT.md` principle 3). The important consequence is architectural: because the hero canvas is created by JS inside `.ambient`, it inherits exactly the same no-JS hiding for free.

---

## 8. Performance budget (replaces `PRODUCT.md` principle 4)

The old principle — *"animation must stay inside a strict performance budget (transforms only, capped particles, one loop)"* — cannot hold a solver and must not be pretended into compliance. It is **replaced** by this WebGL-aware budget, and `DESIGN.md`'s media paragraph and `filter` prohibition are amended to match (§10).

**Mandated:**
1. **Two WebGL contexts maximum, ever.** One hero, one quarter-scale echo. A third is forbidden.
2. **One `requestAnimationFrame` driver** stepping both instances, early-returning per instance visibility and on `document.hidden`.
3. **Paused when not visible** — off-viewport (both instances) and hidden-tab (both). No simulation work is ever done for pixels nobody can see.
4. **DPR capped at 1.5** (High tier), and **sim resolution separated from display resolution** — the solver never runs at device pixels.
5. **Fixed pass count per frame.** No pass may be added conditionally at runtime. The §6.6 energy reduction runs only on 0.2 Hz sample frames, never every frame.
6. **Frame-time watchdog with a documented ladder** (§6.10): 22 ms budget over a 90-frame window post-lift (first 10–20 frames excluded), one-step downgrades, no upgrade-back, combined measurement when both instances are visible, and a defined terminal state.
7. **No `readPixels` anywhere.** Field energy comes from the §6.6 CPU-side proxy (zero readback). Any GPU readback is a spec violation.
8. **Third-party payload stays pinned and measured.** OGL is pinned to `1.0.11`; its measured served size is **38.4 KB gzip / 130.5 KB raw** (§0, Revision 4). Cap: served gzip MUST NOT exceed **40 KB** without a new spec revision — raised from the provisional ~35 KB when the measurement landed 3.4 KB over it, because the alternatives that fit under 35 KB cost either 21 requests on a 3-second-deadline module or six duplicate copies of the library's class identity (Revision 4 records all four measurements). LCP MUST NOT regress vs the blob baseline on the target desktop machine (measure once, record).
9. **The old rules still apply to everything non-WebGL:** transforms/opacity only, no animated `filter`, no layout properties, `will-change` only where genuinely transformed — and **never on either fluid canvas**. A canvas repaints its own pixels and is never transformed, so promoting it buys nothing and costs memory. This is the same conclusion the original build spec already reached for the particle canvas; do not regress it.
10. **The blob fallback must remain cheaper than the sim it replaces.** It is the degraded path; it may not become a second heavy system. Metric: 4 tweens, opacity/transform only, no new layers.

**Enforcement note:** §13 forbids a test runner, so this budget is review-gated, not CI-gated — every item above is a §12 checklist line, not an automated gate.

**Explicitly accepted, and therefore not a defect to "fix":** a real-time fluid simulation is structurally the heaviest thing this page does. It costs a sustained GPU tick while visible. That is the price of the effect the user chose, bounded by tier, pause and watchdog discipline. It is not a regression to be optimized away by quietly reducing quality below the tiers.

---

## 9. Accessibility

- **`prefers-reduced-motion: reduce`** → the static-frame path (§6.12). No motion of any kind from the fluid. All pre-existing reduced-motion behavior (no boot overlay, no parallax, no pin, no count-up, no easter-egg effects, instant values) is unchanged.
- **Decorative layers are hidden from AT:** `aria-hidden="true"` on both canvases and the scrim; `pointer-events: none`; never focusable; no live region.
- **The fluid adds no focusable element, no ARIA role, and no keyboard interaction.** It must not appear in the tab order or the accessibility tree at all.
- **Contrast:** measured over rendered fluid at the worst-case frame in both themes, ≥ 4.5:1 for hero type and nav (§6.7, §6.15). The signal band's white type on obsidian and `#a8a8a8` muted text on obsidian are both already verified (8.83:1 for muted).
- **Forced colors:** `@media (forced-colors: active) { .fluid-canvas, .fluid-echo, .fluid-scrim { display: none; } }` — the canvas cannot honor system-color guarantees, so it yields. Shipping without this rule is a known gap, not an oversight.
- **Focus over the fluid:** `:focus-visible` keeps its existing `2px solid var(--text)` ring; over the difference-blended nav the ring MUST be verified on rendered pixels alongside the glyph (§6.15).
- **Motion intensity:** the sim is slow and low-amplitude by design (§6.5) — no strobing, no rapid luminance oscillation, and the dither is static. The `hyperdrive` stir is the only fast effect, it lasts ~6s, it requires an explicit user gesture (the Konami sequence or a typed command), and it is disabled entirely under reduced motion. Verify by eyeball that no effect exceeds 3 flashes/sec (WCAG 2.3.1) — record the check in §12.
- **The reduced-motion frame is not a degraded corner.** It is the only way a reduced-motion visitor receives the new aesthetic (§2 #14), so it is verified in both themes explicitly in §12 rather than assumed.
- **No new keyboard trap, no scroll hijack.** The sim reads scroll velocity; it never drives scroll.
- **`prefers-reduced-transparency` / `prefers-contrast: more`:** out of scope for this revision, but note the scrim is the natural place to hook them if a future change wants to. Do not build it now without a spec revision.

---

## 10. Documentation updates (same change, not later)

**`PRODUCT.md`**
- Principle 4 is **replaced** with a WebGL-aware performance principle pointing at §8 of this spec (bounded contexts, one loop, visibility pausing, watchdog ladder, terminal fallback).
- Capabilities & Constraints gains a line: the ambient media is a real-time WebGL fluid with a documented blob fallback; the page must still degrade to a complete static page in every path of §7.
- "Nothing is frozen" still applies — this change is not a freeze.

**`DESIGN.md`**
- **Media section rewritten.** Four pre-blurred radial blobs on yoyo timelines is no longer the description of the wash. New text: a real-time fluid simulation in sage/amber/oxblood/**cobalt**, theme-tuned, hero-contained with a quarter-scale echo behind an obsidian signal band, with the blobs documented as the fallback rather than the implementation.
- **Palette** gains cobalt as the fourth media anchor and records that media colors are theme-variant (lifted in light, deepened in dark), with the computed contrast rationale from §5.1.
- **Explicit `filter: blur` paragraph** rewritten from "never animate filter" to "gradients are rendered in-shader; `filter` is still never animated" — the spirit survives, the letter has to change.
- **Components:** the signal board becomes an obsidian band implemented by token scoping; the scrim and its containment dependency on opaque `main`/`.footer` get a sentence; the nav's difference blend is recorded **with the computed per-anchor table and whichever contingency was actually applied** (§6.15) — a bare "verified" note would hide the fact that two light-theme anchors failed at 1:1.
- **Standing detector notes:** record the **OGL 1.0.11 / The Unlicense** dependency and that it is the one third-party script **without an SRI hash** (imported as ESM), so it is a known accepted exception rather than an oversight; note that `--muted-on-fluid` (if it exists) is an intentional second muted token; and add `overused-font`-style notes for anything the new work trips deliberately.

**`index.html`**
- Exactly one `<script type="module" src="js/fluid.js">` after `main.js`; add `.fluid-scrim` to the existing `<noscript>` hide rule. No canvas markup (JS-created).

**This spec**
- Append the §0 measurement rows (OGL raw+gzip, tier frame times, rendered-pixel contrast) to the change log once known.

**`js/main.js`**
- The theme-wipe colour is painted from the retired aurora palette (`#050810` / `#f3f6ff`, line 538) — repaint it from the outgoing theme's actual `--bg` (§6.9).
- The wipe's duration and ease (`0.7` / `power3.inOut`) become `window.THEME_WIPE = { duration: 0.7, ease: "power3.inOut" }`, set at init before `fluid:ready` can fire, and read by both the wipe and the fluid crossfade, so they cannot drift.
- `initAmbient()` stops starting the blob tweens on the primary path (it already gates on `!reduced`, `js/main.js` 416 — extend the gate to fluid-live), removes the cursor-glow node wiring, and stops seeding particle drift — while leaving the easter-egg modes cold-startable (§6.13).

**`gsap-animated-profile-spec.md`**
- Header gains **Revision 5 — liquid iridescence** with a changelog row per changed section.
- §5.3 (Texture / aurora blobs) rewritten: the blobs are now the fallback, and the `filter` rule is scoped.
- §6.7 (Ambient layer) rewritten: items 1 (blobs) and 3 (cursor glow) are retired/repurposed; the fluid is documented as the primary ambient system with its own tier ladder.
- §8 (Performance Budget) rewritten to point at this spec's §8.
- §9 (degradation paths) gains the fluid's rows from §7 here.
- §12 (definition of done) gains the checklist items from §12 here.
- Any other section asserting blob-primary ambient, old principle 4, or SRI-everywhere gets a conforming note (sweep §0 baselines, §3 load order, §10 doc-pointer).

---

## 11. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **OGL is imported as ESM and therefore cannot carry an `integrity` hash** — the one dependency in this repo without SRI. A jsDelivr compromise or a hijacked package version is not detectable by the browser. | Low | High | Pin the exact version string (`1.0.11`) and never a floating tag; jsDelivr treats pinned-version artifacts as immutable; note it in `DESIGN.md`'s standing notes so it is a known, accepted exception. Note also that OGL is **The Unlicense** — public domain, so there is no licence text or attribution obligation to rely on as a provenance check either. If SRI parity is ever wanted, the escape hatch is vendoring a local build (§2 #22, alternative rejected). |
| 2 | **Cold start means the first visible frame is a warm-up** — WebGL program compilation, texture allocation and the first splat can stutter exactly when the hero reveal is happening. | Medium | Medium | Compile shaders and allocate targets *inside* `init()` before the bloom ramp begins; only start the ramp once the first frame has actually been drawn. Budget the compile inside the 1.5s ignite rather than after it. |
| 3 | **Thermal and battery behavior on laptops.** A sustained full-viewport GPU load in a portfolio tab is a real cost to a visitor who leaves the page open. | Medium | Medium | Off-viewport and hidden-tab pausing (mandatory); the tier ladder; the CPU energy proxy keeps idle cost low rather than relying on continuous high-amplitude emitters. Consider (not required) pausing the hero instance when the tab has been hidden for > 60s and requiring a scroll to resume. |
| 4 | **Second context memory pressure on iOS Safari.** Two contexts plus float render targets is where mobile WebKit starts dropping contexts. | Medium | High | Echo runs at quarter scale with RGBA8 if float renderability is absent; both instances pause aggressively; per-instance context loss falls back cleanly (§6.11) with no restore attempt; the 3s post-reveal deadline means a device that cannot handle two contexts still shows a complete page. |
| 5 | **Banding** across large low-contrast gradients — the classic failure of a four-anchor field at 8-bit. | High | Low | Mandatory shader dither (§6.8); RGBA16F where available; the vignette also masks the corners where gradients are flattest. |
| 6 | **Difference-blend legibility over terracotta and cobalt** — white text difference-blended over the lifted-terracotta and cobalt anchors resolves to similar-luminance glyphs (§6.15: 1.05:1, 1.10:1). | Medium | Medium | Locked decision: scroll-scoped blend (§6.15). Do not ship full-page blend on the assumption that it will be fine. |
| 7 | **Light-theme AA over a bright fluid** — amber at 11.1:1 on black is comfortable, but blended mid-tones and the tagline's `--muted` are not automatically safe. | Medium | Medium | Both the luminance floor and the light scrim are required (§6.7); measure rendered pixels, not palette values; `--muted-on-fluid` exists precisely for this. |
| 8 | **Idle reseed readback stall** — a `readPixels` stall once per 5s could read as a periodic micro-hitch on slower devices. | Low | Low | CPU-side proxy is the default (zero readback); the 1×1 RGBA8 readback is opt-in only, sample frames only. |
| 9 | **Scope creep in couplings** — §6.4 fixes the coupling list at three; every addition is a permanent per-frame cost on every device. | Medium | Low | The list is normative; a fourth coupling requires a spec revision. |
| 10 | **Hidden-cost regression: the boot overlay's 4–5s window.** Cold start is the chosen design, but any future "warm it up behind boot" change silently adds seconds of GPU work to every load. | Low | Medium | Recorded as a deliberate consequence of **§2 #12**; a future reader must see that it was chosen, not missed. |
| 11 | **Retiring particle drift breaks the easter eggs** if `seed()` and the mode functions co-depend on dot state that no longer exists (§6.13). | Medium | Low | Explicitly called out as a verification item; modes must cold-start their own state. |
| 12 | **Tier probe false negatives** — a slow first 90 frames (font loading, stats fetch, reveal choreography) could downgrade a capable machine. | Medium | Medium | Probe starts after the first presented frame post-lift with the first 10–20 frames excluded (§6.10); 22 ms is deliberately loose; downgrades are one step and never reversible in-session, so a single false negative costs one tier, not the effect. |
| 13 | **The blob→fluid handoff is a visible change of weather.** On a skipped boot with a slow module, the visitor sees the blob wash, then a 0.6s cross-fade to the fluid. | Medium | Low | Bounded to one occurrence per page load, gated by the 3s post-reveal deadline, and it is a cross-fade rather than a cut. The alternative — waiting indefinitely on a blank hero — is worse. If it proves distracting in practice, the fix is to raise the initial tier's splat amplitude so the incoming field is immediately legible, not to remove the handoff. |
| 14 | **Crossfade desynchronisation from the wipe** — the two use different timing sources (CSS ease vs GSAP) today. | Medium | Low | `window.THEME_WIPE` shared constant read by both (§6.9). This is exactly the defect Revision 1 had on paper. |
| 15 | **The wipe's stale colours** become visible against the new fluid (`#050810` over a cobalt/sage field reads as a colour cast). | High | Low | Fixed in the same change: paint the wipe from the outgoing theme's `--bg` (§6.9, §10). |

---

## 12. Definition of done

**Normative keywords.** MUST = verification gate (ship-blocker); SHOULD = default with a recorded exception in the change log. Present-tense prose in §§1–12 reads as MUST unless marked otherwise.

**Code-complete** — status as of Revision 4. Every box below was verified by reading the shipped code, not assumed; the manual checklist underneath has **not** been run yet, because it needs a browser and a deploy.

- [x] `js/fluid.js` exists as an ES module, imports OGL `1.0.11` from the pinned `+esm` URL, exposes the §6.14 `window.Fluid` IDL (`init`, `stir`, `tint`, `setTheme`, `freeze`, `destroy`, `status`), and dispatches `fluid:ready`.
- [x] `index.html` gains exactly one `<script type="module" src="js/fluid.js">`, **placed after `main.js`** (last deferred script in document order). No other head change, other than adding `.fluid-scrim` to the existing `<noscript>` hide rule.
- [x] Neither canvas appears in `index.html` markup — both are created and appended by `fluid.js`, as is the `.fluid-scrim` div (sibling of `.ambient`).
- [x] The theme-wipe duration/ease live in `window.THEME_WIPE` used by both the wipe and the fluid crossfade, and the wipe is painted from the outgoing theme's `--bg`.
- [x] `css/style.css` gains the §5.4 tokens (including `--media-*-deep` and provisional `--muted-on-fluid`), the `.fluid-canvas` / `.fluid-echo` / `.fluid-scrim` rules, the forced-colors hide rule, and the obsidian signal band (token scoping, not rewritten rules). The `.blob` block stays as the fallback, and its four per-blob tweens are paused — never killed — while the sim is live.
- [x] `js/main.js` integrates through the readiness contract (§3: named handler, both-arm teardown, `fluidCommitted` guard, post-reveal 3s deadline, `heroFluidStarted` guard), drives the hero instance from `heroReveal()`, and wires the three couplings in §6.4. `initAmbient()` no longer starts the blob tweens on the primary path, the `#cursor-glow` node is removed from markup/CSS/wiring, and particle drift is no longer seeded.
- [x] The particle canvas no longer runs `drift`; `hyperdrive` and `matrix` cold-start their own dot state and still work.
- [x] `PRODUCT.md`, `DESIGN.md` and `gsap-animated-profile-spec.md` updated per §10.
- [x] No new UI color token. No chromatic text, border, badge or fill anywhere.
- [x] *(Added during implementation — §6.15's locked decision made concrete.)* The nav's difference blend is scoped by `html.nav-blend` to the hero's scroll range, with `html.nav-on-dark` giving the always-obsidian signal band white type in *both* themes. Without that second state the light theme would put black nav text on the black band, which §6.15 does not cover.

**Manual checklist** (the accepted verification standard — eyeball each, in a real browser, on `git.barren.eu.org` after deploy). **Nothing here has been run yet**, and the probe above does not change that: it exercised the *fallback* path, because the test environment has no WebGL. Every item that requires a live sim — molten-silk character, the four anchors, ignition on lift, the couplings, the tier ladder, GLSL compiling on real hardware — is still owed.

- [ ] **Hero, light theme:** liquid is visibly moving and reads as molten silk, not blobs. Four anchors all findable, blue unmistakable. Hero name and tagline clearly legible at the brightest moment of a full loop.
- [ ] **Hero, dark theme:** the deep palette reads nocturnal and cooler; amber is largely absent; white type legible throughout.
- [ ] **Boot → lift:** no fluid exists behind the overlay; on lift it ignites from the center over ~1.5s with no stutter or pop.
- [ ] **Idle for 5 minutes:** the field is still alive and composed — never a flat muddy average.
- [ ] **Pointer:** moving the mouse stirs the field with soft, wide, non-filamentary splats; leaving returns it to autonomous drift within ~2s.
- [ ] **Scroll:** fast scrolling visibly stirs, stopping lets it settle. Scrolling past the hero stops the hero instance (verify in DevTools that frame work drops).
- [ ] **Signal band:** obsidian in both themes; the echo reads as a quiet recurrence, never a competing effect; the cards still sit on identical box dimensions (zero CLS).
- [ ] **Theme toggle:** the fluid's palette changes in sync with the wipe, with no visible seam and no reset of the flow.
- [ ] **Nav:** wordmark and links legible over each of the four anchors in the hero range; nav resolves to `var(--text)` past the hero (locked §6.15 decision) and to white over the obsidian band in the light theme. Focus ring verified on rendered pixels too.
- [ ] **Ghost pill hover:** hovering a CTA produces one soft warm bloom beneath it, not a splat.
- [ ] **Terminal:** typing ripples the fluid.
- [ ] **Konami:** starfield plus a violent stir that decays back to calm. **`matrix`:** stir plus a green tint that fully releases afterwards. No effect exceeds 3 flashes/sec.
- [ ] **Reduced motion:** exactly one frozen frame of a *composed* liquid (not an empty field) in both themes; nothing animates; scrolling is smooth and nothing is blocked.
- [ ] **JS disabled:** plain `var(--bg)` hero (no wash — unchanged behaviour), complete page.
- [ ] **Module blocked** (block `js/fluid.js` in DevTools): blob wash, complete page, no uncaught exception breaks the page (network 404 noise in the console is expected).
- [ ] **OGL CDN blocked** (block `cdn.jsdelivr.net/npm/ogl*`): blob wash, complete page.
- [ ] **WebGL forced off** (launch flag or `--disable-webgl`): blob wash, complete page.
- [ ] **Context loss:** trigger via `WEBGL_lose_context` → clean 0.6s cross-fade to blobs, no black canvas, no error dialog, page fully usable.
- [ ] **Echo-only failure:** drop the echo context → plain obsidian band, hero unaffected.
- [ ] **Mobile (real device, both themes):** either the sim runs at an acceptable frame rate or it lands on the blob wash — never a stuttery sim, never a blank hero. Scroll stays native.
- [ ] **Tab hidden** for several minutes then restored: no runaway CPU, sim resumes correctly (or clean blob fallback on iOS sleep).
- [ ] **Fast connection:** hero reaches the fluid on boot lift with no prolonged blob flash — a single clean handoff at most (zero-frame handoff is ideal but not guaranteed since viability is unknowable pre-`fluid:ready`).
- [ ] **Throttled connection** (DevTools "Slow 3G"): blob wash (not a blank hero) is visible, then either one clean 0.6s cross-fade to the fluid inside the 3s post-reveal deadline, or the blob wash persists for the whole session. Never a blank hero, never a late unexplained swap.
- [ ] **Double theme-toggle mid-crossfade:** no snap, no stuck palette; second ramp restarts from the interpolated state.
- [ ] **Resize:** never a blank field; running instances mini-reseed, frozen instances re-render deterministically.
- [ ] **Low-tier terminal state:** cross-fade to blobs, context actually released, one-way for the session.
- [ ] **Keyboard-only:** tab order and focus visibility unchanged; no new focusable node.
- [ ] **Wipe colour:** toggling theme shows a wipe painted in the *outgoing* theme's background colour — no navy-vs-black colour cast crossing the page.
- [ ] **Payload record:** OGL's measured size is recorded (Revision 4: 38.4 KB gzip / 130.5 KB raw); the measured average frame time at each tier the dev machine can reach (§0 obligation 4) is **still owed**, as is obligation 3 (GitHub Pages serves `js/fluid.js` as `application/javascript`) and obligation 5 (contrast over rendered pixels).

---

## 13. Explicitly out of scope

- Any chromatic color entering the **interface** palette (text, borders, buttons, badges, fills) — refused by DESIGN.md and unchanged.
- Replacing GSAP, Lenis, or the pinned-script architecture.
- `prefers-reduced-transparency` / `prefers-contrast: more` support (§9 — a future revision).
- Any change to copy, section order, the terminal command set, the GitHub stats logic, `README.md`, `_config.yml`, `CNAME`, or the deploy process.
- A GPU-tier detection library, feature-detection service, or analytics on the fluid's performance.
- Vendoring OGL locally (rejected in §2 #22 in favour of the module script).
- **Making the blob wash available with JavaScript disabled.** The corrected §7 behaviour stands: with JS off the hero is plain `var(--bg)`, exactly as shipped today. Changing that is a product decision, not a fluid-iridescence one.
- Raising the diagnostic burden: no build step, no test runner, no `package.json` may be introduced by this change.
