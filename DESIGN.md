# DESIGN.md — monopo saigon world

Editorial monochrome gallery floating on liquid light. Interface is strictly
black/white/gray; the only chromatic surface is the ambient iridescent wash
(sage → amber → oxblood), treated as media behind the hero, never as UI fill.
Replaces the 2026-09 aurora-gradient/terminal visual world; behavior, copy,
and section order are unchanged (see PRODUCT.md).

## Palette (UI — no chromatic tokens exist)

Light (default): `--bg #ffffff`, `--bg-elev #ffffff`, `--text #000000`,
`--muted #6d6d6d` (5.17:1 on paper), `--line #000000` hairlines.
Dark (obsidian inverse bands): `--bg #000000`, `--bg-elev #000000`,
`--text #ffffff`, `--muted #a8a8a8` (8.83:1 on obsidian),
`--line rgba(255,255,255,0.35)`.
Selection inverts (`var(--text)` on `var(--bg)`); scrollbar thumb is muted.

## Media (the one chromatic gesture)

A real-time Navier-Stokes fluid simulation (`js/fluid.js`, OGL) rendering
liquid iridescence in **four** anchors — sage `rgb(160,224,171)`, amber
`rgb(255,172,46)`, oxblood `rgb(165,45,37)` and cobalt `rgb(59,130,246)` — as
a cyclic ribbon (sage → amber → oxblood → cobalt → sage), so cobalt is a
co-equal resting state rather than a splash. It reads as molten silk: wide soft
splats, lazy curl, disturbances absorbed within ~1s, nothing sharp, no visible
tiling, and unseeded (every visit differs).

**Theme-variant anchors.** Media colors are not `--bg`-dependent but they are
depth-dependent: light theme uses lifted anchors, dark theme deepened ones, both
re-tuned per theme rather than dimmed by opacity. Live values are the CSS media
tokens (`--media-*`), which `js/fluid.js` reads with `getComputedStyle` at init
so the shader can never drift from this file.

**Containment and legibility.** The wash is contained to the hero: `main` and
`.footer` are opaque `var(--bg)` and `.hero` stays transparent. Two independent
guarantees keep hero type readable — a luminance/saturation clamp in the final
shader pass *and* a theme-aware scrim (`.fluid-scrim`, JS-created sibling of
`.ambient`, z-index 1). The scrim's containment depends on `main`/`.footer`
staying opaque; that dependency is load-bearing.

**The echo.** The signal board is a full-bleed obsidian band hosting a
quarter-scale second instance at 0.5 opacity, created lazily only when the band
is approached (one context exists until then). The band scopes the interface
tokens (`--bg`/`--text`/`--muted`/`--line`) to the inverse set rather than
restyling each readout.

**Fallback.** The four pre-blurred radial blobs below are the fallback, not the
implementation: they are paused (never killed) and hidden whenever the sim is
live, and resume as the hero's wash on any failure path — including reduced
motion without WebGL, module blocked, unsupported context, lowest tier missed,
and context loss mid-session.

**Retired from this world:** particle drift and the cursor-glow layer. The
canvas survives only for the `hyperdrive` and `matrix` easter eggs, whose dots
cold-start on entry; grain and cursor-glow layers stay `display:none`.

## Typography

Inter (300/400/500) for all UI: hero name 400 at `clamp(3.5rem,13vw,9rem)` /
1.02 solid (no gradient); section headings weight 300
`clamp(2.5rem,7vw,4.875rem)` / 1.1 whisper; body 18px; labels 11px uppercase
+0.12em. Raleway 400 accents exactly one heading (contact). JetBrains Mono
survives ONLY for genuine terminal output (`.boot-line`, `.term-output`,
`.term-input`) — depicted shell I/O, not costume.

## Components

- Ghost pills: transparent, 1px `var(--line)`, 75px radius, 11px/33px,
  16px/400; hover breathes border-color + letterspacing over 0.8s
  `cubic-bezier(0.19,1,0.22,1)` (the signature ease for all CSS transitions).
- Fixed nav: difference-blended wordmark + 4 underline-free 12px section
  links, clearing the theme toggle.
- Rotating scroll badge: 76px circular textPath, 16s linear rotation, frozen
  under reduced motion.
- Signal board: one solid readout panel, dashed muted dividers, tabular
  400-weight values; skeleton shimmer keeps identical dims (zero-CLS).
- Projects: borderless rows with top hairlines; starred repo leads
  full-width, rest pair up; underline-free titles.
- Terminal: solid sharp panel, gray chrome dots, theme caret; scanlines
  removed. Boot overlay follows the active theme (white editorial in light,
  obsidian in dark) with pill skip control.
- Footer: stacked 11px muted address lines, block-cursor signoff.
- Elevation: none. Radius: 75px pills/circles, 0px everything else.
- Hero type over the fluid: `var(--text)` per theme (black on the lifted
  light-theme field, white on the deep dark-theme field), never white-on-bright
  or black-on-dark.
- Nav: difference blend **scoped to the hero's scroll range** (`html.nav-blend`),
  resolving to `var(--text)` past it; the obsidian band adds `html.nav-on-dark`
  for white type. The blend is what makes the nav part of the artwork, but white
  difference-blended over the light theme's lifted terracotta and cobalt anchors
  resolves to `1.05:1` and `1.10:1` — the nav effectively disappears — so the
  blend is where it was asked for (over the fluid) and nowhere else.

## Motion

GSAP choreography (boot, SplitText reveal, orbit pin, count-ups, Lenis) is
preserved verbatim from the previous world; only CSS-transition motion speaks
the new ease. Reduced motion still strips everything to a static page.

## Dependencies

- GSAP 3.15.0 (+ ScrollTrigger, SplitText, ScrambleTextPlugin) and Lenis 1.3.26:
defer classic scripts with `sha384` integrity.
- **OGL 1.0.11 — The Unlicense** (public domain, so no attribution obligation and
no provenance signal either), imported as an ES module from a version-pinned
jsDelivr URL. It is the one third-party script **without an `integrity` hash**,
because an ESM import cannot carry one: the exact version string is the entire
supply-chain guarantee. Measured served size **≈ 38.4 KB gzip** (130.5 KB raw),
one immutable-cached request; that measurement and the revised payload cap live
in `liquid-iridescence-spec.md` §0 and §8.

## Standing detector notes (deliberate, do not "fix")

`all-caps-body` (11px uppercase labels are the mandated label style),
`overused-font: inter` (the reference names Inter as the Roobert substitute),
`clipped-overflow-container` (false positive — fixed layers ignore body
overflow-x), `gradient-text`/`glow` style findings on the fluid canvas (it is a
shader on a decorative, `aria-hidden` canvas, not a CSS gradient behind text),
and any contrast flag on the nav (its difference blend is scroll-scoped by
`html.nav-blend` and the failing per-anchor pairs are computed in
`liquid-iridescence-spec.md` §6.15). Zero contrast findings on the interface;
AA holds on every UI pair in both themes.
