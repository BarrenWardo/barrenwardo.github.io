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

Four fixed pre-blurred radial blobs — sage `rgb(160,224,171)`, amber
`rgb(255,172,46)`, oxblood `rgb(165,45,37)` — drifting on 18–40s yoyo
timelines, `will-change` only. Dimmed to 0.55 opacity in dark. The wash is
contained to the first viewport: `main` and `.footer` are opaque `var(--bg)`,
`.hero` stays transparent. Canvas particles are monochrome per theme; matrix
and hyperdrive modes render in theme text tones. Grain and cursor-glow layers
are removed from this world (`display:none`).

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

## Motion

GSAP choreography (boot, SplitText reveal, orbit pin, count-ups, Lenis) is
preserved verbatim from the previous world; only CSS-transition motion speaks
the new ease. Reduced motion still strips everything to a static page.

## Standing detector notes (deliberate, do not "fix")

`all-caps-body` (11px uppercase labels are the mandated label style),
`overused-font: inter` (the reference names Inter as the Roobert substitute),
`clipped-overflow-container` (false positive — fixed layers ignore body
overflow-x). Zero contrast findings;AA holds on every UI pair in both themes.
