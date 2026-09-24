# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

No target audience. The site is personal expression — built because it is fun to build (user-confirmed). Incidental visitors are anyone who lands on the custom domain: curious developers, GitHub profile visitors, or passers-by. There is no hiring funnel, client pipeline, or conversion goal behind it.

## Product Purpose

A single-page animated mini-portfolio for BarrenWardo that exists as creative expression. Success means a visitor enjoys the visit: plays with the terminal, watches the show, and remembers the name. No action (contact, follow, donate) is required for a visit to count.

## Positioning

A personality-driven developer portfolio where the interface itself is the artifact: a terminal-boot intro, kinetic typography, live GitHub numbers, and hidden easter eggs. Neighboring portfolio templates can copy the section order; they cannot copy the playfulness without rebuilding it.

## Operating Context

Static site served by GitHub Pages from `main` at `https://git.barren.eu.org/` (via `CNAME`). No build step, no backend, no analytics. Content is a fixed section order: terminal boot overlay → hero → tech orbit → live signal board → projects → contact/footer. Live data comes from the unauthenticated GitHub REST API at runtime with a local cache and a stamped fallback.

## Capabilities and Constraints

- Static files at repo root (`index.html`, `css/style.css`, `js/main.js`, `js/fluid.js`); third-party animation/scroll libraries pinned on CDN with integrity hashes. `js/fluid.js` is the one exception: it is an ES module importing a version-pinned OGL from jsDelivr, because an ESM import cannot carry an `integrity` attribute — the exact version string is the whole guarantee there.
- The ambient media layer is a real-time WebGL fluid simulation with a documented fallback: if WebGL is unavailable, the module is blocked or slow, the device misses the lowest quality tier, or the context is lost, the page falls back to the pre-existing CSS blob wash and never leaves a blank hero.
- The page must degrade to a complete, readable, scrollable static page with JavaScript disabled, with the CDN blocked, or after any init error.
- Motion respects `prefers-reduced-motion` fully (no boot overlay, no ambient motion, instant values); body text meets WCAG AA in both themes.
- Explicitly undecided product facts: the `Py-Books` card description is a neutral placeholder (no GitHub description exists); third project pick (`kserve-skills` vs `modal`) is open; no `og-image` asset exists so no `og:image` is shipped.
- Nothing is frozen: the user confirmed future work may change anything, including the boot intro, copy, and visual identity.

## Brand Commitments

Current facts, not binding constraints: the name Barren Wardo; the lines "AI aficionado" and "Forever evolving"; GitHub (`github.com/BarrenWardo`) and Ko-Fi (`ko-fi.com/barrenwardo`) links; the `git.barren.eu.org` domain. All may change in future work.

## Evidence on Hand

- Live GitHub profile data (36 repos / 24 forks / 12 originals, top repo `Fooocus-Modal` 14★, account since 2021-06-19), re-derivable at runtime.
- Three real project cards linking to real repositories (`Fooocus-Modal`, `Py-Books`, `kserve-skills`).
- Absences future work must not fabricate: no testimonials, no clients, no metrics beyond the GitHub API, no claims about employment or services.

## Product Principles

1. Honesty over hype — show real numbers and volunteer the unflattering split (e.g. fork ratio) rather than letting visitors discover it.
2. Play is the point — the terminal, Konami code, and matrix effects are first-class features, not decoration.
3. Never a blank page — every failure path (no JS, blocked CDN, thrown error, rate limit) still leaves a complete, readable site.
4. Motion is earned — animation must respect reduced-motion settings and stay inside a WebGL-aware performance budget: at most two WebGL contexts (hero fluid + quarter-scale echo), one rAF driver stepping both, paused off-viewport and on hidden tabs, a frame-time watchdog with documented downgrade tiers, and a defined terminal fallback. Non-WebGL motion keeps the old rule (transforms/opacity only, no animated `filter`, no layout properties). Full budget and tier ladder: `liquid-iridescence-spec.md` §8, §6.10.
5. No rot by default — derived values (years on GitHub, footer year, BIOS version) compute at runtime; fallbacks carry visible freshness stamps.

## Accessibility & Inclusion

Full reduced-motion respect, WCAG AA body-text contrast in both themes, keyboard-operable controls and terminal, screen-reader-safe overlay (decorative, focus moves only on explicit skip). Established in the build spec and implementation; future work must not regress it.
