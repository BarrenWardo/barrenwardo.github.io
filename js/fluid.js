/* js/fluid.js — Liquid iridescence: a real-time GPU fluid wash (OGL + GLSL).
 *
 * Spec: liquid-iridescence-spec.md (Revision 3). Section refs in comments map to it.
 * Loaded as an ES module AFTER js/main.js (spec §3): main.js owns the boot path and
 * must never wait on this file's remote import graph.
 *
 * Public surface (spec §6.14), attached to window.Fluid:
 *   Fluid.status                      "pending" | "ready" | "unsupported" | "lost" | "destroyed"
 *   Fluid.init(instance, opts)        instance: "hero" | "echo"
 *   Fluid.inject(splat)               one queued injection (transport for the §6.4 couplings)
 *   Fluid.setVisible(instance, bool)  off-viewport pause, driven by main.js's ScrollTrigger
 *   Fluid.stir({ intensity, durationMs, radius })
 *   Fluid.tint({ color, rampMs, holdMs })
 *   Fluid.setTheme(to)               "light" | "dark"
 *   Fluid.freeze()                    reduced-motion single-frame path
 *   Fluid.destroy(instance?)          per-instance; no argument = destroy all
 *   Fluid.palette()                   current four anchors, for diagnostics
 *
 * Events: "fluid:ready", "fluid:first-frame" (detail.instance), "fluid:fallback" (detail.instance).
 * main.js owns the blob layer and the couplings. The scrim is created HERE (it is
 * a property of the canvas) and removed on every path where the hero canvas does
 * not survive, including construction failure, context loss, terminal downgrade
 * and destroy — see removeScrim().
 *
 * Deliberately does NOT depend on window.gsap: it must initialise on its own terms,
 * and must still work when GSAP is blocked but OGL loaded fine (spec §6.4).
 */

import { Renderer, Program, Mesh, Triangle, RenderTarget, Vec2 } from "https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm";

/* ------------------------------------------------------------------ shaders */

/* Fullscreen triangle. OGL's Triangle supplies position (-1,-1 → 3,-1 → -1,3)
 * and uv (0,0 → 2,0 → 0,2), so uv spans the viewport correctly. */
const VERT = /* glsl */ `
precision highp float;
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 uTexel;
void main () {
  vUv = uv;
  vL = uv - vec2(uTexel.x, 0.0);
  vR = uv + vec2(uTexel.x, 0.0);
  vT = uv + vec2(0.0, uTexel.y);
  vB = uv - vec2(0.0, uTexel.y);
  gl_Position = vec4(position, 0.0, 1.0);
}`;

/* Dispersion: multiply a field toward zero by `uValue` (spec §6.1 steps 2 and 9). */
const FRAG_CLEAR = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uValue;
void main () {
  gl_FragColor = uValue * texture2D(uTexture, vUv);
}`;

/* Additive Gaussian splat, used for both velocity (uColor = force.xy) and
 * density (uColor = phase/energy). Wide by construction — see spec §6.5. */
const FRAG_SPLAT = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;
void main () {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}`;

/* Semi-Lagrangian advection. Dissipation is a separate pass per spec §6.1, so
 * this pass carries no decay of its own. */
const FRAG_ADVECTION = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform vec2 uVelocityTexel;
uniform float dt;
void main () {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * uVelocityTexel;
  gl_FragColor = texture2D(uSource, coord);
}`;

const FRAG_DIVERGENCE = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const FRAG_CURL = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  float vorticity = R - L - T + B;
  gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
}`;

/* Vorticity confinement. `uCurlStrength` stays low on purpose: above ~25 the
 * field turns filamentary and stops reading as molten silk (spec §6.1, §6.5). */
const FRAG_VORTICITY = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStrength;
uniform float dt;
void main () {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= uCurlStrength * C;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity += force * dt;
  velocity = min(max(velocity, -1000.0), 1000.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

const FRAG_PRESSURE = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - divergence) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}`;

const FRAG_GRADIENT_SUBTRACT = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity.xy -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`;

/* One-time seeding of the density grid so the first frame is a composed field
 * rather than an empty one (spec §6.12 uses the same shader for its frozen
 * frame). Two octaves of sines — organic, low-frequency, no visible tiling. */
const FRAG_SEED = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uSeed;
void main () {
  vec2 p = vUv;
  float phase = p.x * 0.55 + p.y * 0.75
    + 0.16 * sin(p.y * 6.2831 + uSeed)
    + 0.11 * sin(p.x * 9.4248 - uSeed * 0.7)
    + 0.07 * sin((p.x + p.y) * 12.566);
  gl_FragColor = vec4(fract(phase), 0.6, 0.0, 1.0);
}`;

/* Display: phase → four-anchor palette ribbon → theme crossfade → luminance
 * band + saturation cap (spec §6.7) → tint overlay → bloom → dither (§6.8).
 *
 * The density grid stores a *phase* (0–1) and an energy, NOT a baked RGB — which
 * is what makes the theme crossfade possible: only uniforms move, so the whole
 * existing field recolours instead of only newly-injected liquid (spec §6.9). */
const FRAG_DISPLAY = /* glsl */ `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform vec3 uA0;
uniform vec3 uA1;
uniform vec3 uA2;
uniform vec3 uA3;
uniform vec3 uB0;
uniform vec3 uB1;
uniform vec3 uB2;
uniform vec3 uB3;
uniform float uMix;
uniform float uBloom;
uniform vec3 uTintColor;
uniform float uTintAmount;
uniform float uLumFloor;
uniform float uLumCeil;
uniform float uSatMax;
uniform float uDither;

vec3 srgb2lin (vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
vec3 lin2srgb (vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
float luma (vec3 lin) {
  return dot(lin, vec3(0.2126, 0.7152, 0.0722));
}
/* Cyclic four-stop ribbon: sage → amber → oxblood → cobalt → sage, so cobalt is a
 * co-equal resting state and blends back round instead of dead-ending. */
vec3 palette (float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  float s = fract(t) * 4.0;
  if (s < 1.0) { return mix(a, b, s); }
  if (s < 2.0) { return mix(b, c, s - 1.0); }
  if (s < 3.0) { return mix(c, d, s - 2.0); }
  return mix(d, a, s - 3.0);
}

void main () {
  vec2 field = texture2D(uTexture, vUv).rg;
  float phase = field.x;
  float energy = clamp(field.y, 0.0, 1.0);

  vec3 col = palette(phase, uA0, uA1, uA2, uA3);
  vec3 incoming = palette(phase, uB0, uB1, uB2, uB3);
  col = mix(col, incoming, clamp(uMix, 0.0, 1.0));

  /* Local warmth: active regions read hotter without leaving the AA band. */
  col = mix(col, col * 1.22, energy * 0.30);

  /* Luminance band, enforced in linear light so the spec's relative-luminance
   * floor/ceiling mean what they say. Smooth scaling, never a hard clip. */
  vec3 lin = srgb2lin(clamp(col, 0.0, 1.0));
  float L = luma(lin);
  if (L < uLumFloor) { lin *= uLumFloor / max(L, 0.0001); }
  if (L > uLumCeil) { lin *= uLumCeil / max(L, 0.0001); }
  vec3 outCol = lin2srgb(clamp(lin, 0.0, 1.0));

  float mx = max(max(outCol.r, outCol.g), outCol.b);
  float mn = min(min(outCol.r, outCol.g), outCol.b);
  float sat = mx <= 0.0001 ? 0.0 : (mx - mn) / mx;
  if (sat > uSatMax) {
    outCol = mix(outCol, vec3(luma(outCol)), 1.0 - uSatMax / sat);
  }

  if (uTintAmount > 0.0) { outCol = mix(outCol, uTintColor, uTintAmount); }

  outCol *= uBloom;

  /* Static dither — mandatory (spec §6.8): four anchors across a full viewport
   * produce exactly the wide low-contrast gradients that band at 8-bit. */
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  outCol += (n - 0.5) * (uDither / 255.0);

  gl_FragColor = vec4(clamp(outCol, 0.0, 1.0), 1.0);
}`;

/* ------------------------------------------------------------------ config */

/* Quality tiers — spec §6.10. */
const TIERS = {
  high:   { dpr: 1.5,  sim: 256, density: 512, iterations: 20, emitterRate: 1.0 },
  medium: { dpr: 1.0,  sim: 128, density: 256, iterations: 12, emitterRate: 0.8 },
  low:    { dpr: 0.75, sim: 64,  density: 128, iterations: 8,  emitterRate: 0.6 }
};
const TIER_ORDER = ["high", "medium", "low"];

/* Normative constants — spec §6.1. Provisional; tune on rendered output. */
const VELOCITY_DISSIPATION = 0.985;   // pow(base, dt) per second
const DENSITY_DISSIPATION = 0.992;
const CURL_STRENGTH = 14;             // deliberately low: filaments start ~25
const FORCE_SCALE = 4200;             // dx = deltaPx / simLong * FORCE_SCALE
const FORCE_CLAMP = 10;               // grid units per frame
const SPLAT_RADIUS = 0.20;            // aspect-corrected UV; floor 0.005
const DT_MAX = 1 / 30;
const SPLAT_BATCH_CAP = 8;
/* Shared with the CSS opacity transition on both canvases (0.6s) and with main.js's
 * blob handoff, so the scrim leaves exactly when the cross-fade lands. */
const CROSSFADE_MS = 600;
const RESEED_FLOOR = 0.02;            // mean energy, provisional
const ENERGY_SAMPLE_MS = 5000;
const PROBE_WINDOW = 90;
const PROBE_SKIP = 15;                // first 10–20 frames: compile + reveal
const FRAME_BUDGET_MS = 22;

/* Reduced-motion frozen frame: exactly 30 committed literals (spec §6.12).
 * [x, y, phase, dx, dy, radius, energy] — the four anchors all appear. */
const FROZEN_SPLATS = [
  [0.18, 0.30, 0.02,  1.8,  0.6, 0.30, 0.9],
  [0.42, 0.22, 0.18, -1.2,  1.4, 0.26, 0.8],
  [0.70, 0.34, 0.33,  1.4, -0.9, 0.28, 0.85],
  [0.30, 0.55, 0.48, -0.8, -1.3, 0.24, 0.7],
  [0.58, 0.62, 0.62,  1.1,  1.0, 0.30, 0.9],
  [0.84, 0.52, 0.76, -1.5,  0.4, 0.26, 0.8],
  [0.12, 0.70, 0.90,  1.6, -0.7, 0.28, 0.85],
  [0.36, 0.82, 0.10,  0.9,  1.5, 0.24, 0.75],
  [0.64, 0.80, 0.25, -1.3, -0.5, 0.30, 0.9],
  [0.90, 0.74, 0.40,  0.7, -1.1, 0.26, 0.8],
  [0.05, 0.42, 0.55,  1.9,  0.9, 0.28, 0.7],
  [0.50, 0.10, 0.70, -1.0,  1.6, 0.24, 0.85],
  [0.76, 0.14, 0.85,  1.2, -1.4, 0.26, 0.8],
  [0.24, 0.12, 0.08, -1.7,  0.5, 0.30, 0.9],
  [0.46, 0.44, 0.22,  1.5,  1.2, 0.28, 0.75],
  [0.66, 0.48, 0.37, -0.9, -1.6, 0.24, 0.85],
  [0.88, 0.30, 0.52,  1.3,  0.3, 0.30, 0.9],
  [0.14, 0.52, 0.66, -1.1, -1.0, 0.26, 0.8],
  [0.34, 0.36, 0.80,  1.7, -0.6, 0.28, 0.7],
  [0.54, 0.28, 0.94, -1.4,  1.1, 0.24, 0.85],
  [0.78, 0.68, 0.14,  0.8,  1.3, 0.30, 0.9],
  [0.02, 0.88, 0.29, -1.8, -0.8, 0.26, 0.75],
  [0.28, 0.90, 0.44,  1.0, -1.5, 0.28, 0.85],
  [0.60, 0.94, 0.59, -1.2,  0.7, 0.24, 0.8],
  [0.86, 0.90, 0.73,  1.4,  1.0, 0.30, 0.9],
  [0.40, 0.68, 0.88, -1.6, -0.4, 0.26, 0.7],
  [0.68, 0.06, 0.05,  0.6,  1.7, 0.24, 0.85],
  [0.92, 0.18, 0.20, -1.0, -1.2, 0.28, 0.8],
  [0.08, 0.06, 0.35,  1.8,  0.2, 0.30, 0.9],
  [0.52, 0.52, 0.50, -0.7,  1.4, 0.26, 0.75]
];

/* Frozen-frame simulation steps run synchronously at init. */
const FROZEN_STEPS = 36;
/* Resize mini-reseed count (spec §4/§6.6). */
const RESIZE_SPLATS = 5;

/* ------------------------------------------------------------------ helpers */

const isReduced = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const isFinePointer = () =>
  typeof matchMedia === "function" && matchMedia("(pointer: fine)").matches;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

/* Parse a CSS colour token ("rgb(160, 224, 171)" or "#3b82f6") into 0–1 vec3. */
function parseColor(raw, fallback) {
  const s = String(raw || "").trim();
  let m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.every((n) => !isNaN(n))) {
      return [clamp(parts[0] / 255, 0, 1), clamp(parts[1] / 255, 0, 1), clamp(parts[2] / 255, 0, 1)];
    }
  }
  m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  return fallback.slice();
}

/* Read the four media anchors from CSS custom properties — the shader can then
 * never drift from the stylesheet contract (spec §5.4). */
function readMediaPalette(deep) {
  const cs = getComputedStyle(document.documentElement);
  const suffix = deep ? "-deep" : "";
  const get = (name, fallback) => parseColor(cs.getPropertyValue("--media-" + name + suffix), fallback);
  return {
    sage: get("sage", [160 / 255, 224 / 255, 171 / 255]),
    amber: get("amber", [255 / 255, 172 / 255, 46 / 255]),
    oxblood: get("oxblood", [201 / 255, 106 / 255, 88 / 255]),
    cobalt: get("cobalt", [59 / 255, 130 / 255, 246 / 255])
  };
}

/* Flatten a palette object into the four vec3 uniform slots, in ribbon order. */
function paletteSlots(p) {
  return [p.sage, p.amber, p.oxblood, p.cobalt];
}

/* ------------------------------------------------------------------ targets */

function createDoubleFBO(gl, w, h, fmt) {
  const make = () => new RenderTarget(gl, {
    width: w, height: h,
    minFilter: gl.LINEAR, magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE,
    internalFormat: fmt.internalFormat,
    format: fmt.format,
    type: fmt.type,
    depth: false,
    stencil: false
  });
  return { read: make(), write: make(), swap() { const t = this.read; this.read = this.write; this.write = t; } };
}

/* Detect renderable float support (spec §6.1). Never assumed, always detected
 * from the context OGL actually handed us. */
function detectFloat(gl) {
  const gl2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
  if (gl2) {
    if (gl.getExtension("EXT_color_buffer_float")) {
      return { internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT, isFloat: true };
    }
    return { format: gl.RGBA, type: gl.UNSIGNED_BYTE, isFloat: false };
  }
  const half = gl.getExtension("OES_texture_half_float");
  const cbHalf = gl.getExtension("EXT_color_buffer_half_float");
  if (half && cbHalf) {
    // WebGL1 needs the extension's own type constant, not gl.HALF_FLOAT.
    return { format: gl.RGBA, type: half.HALF_FLOAT_OES, isFloat: true };
  }
  return { format: gl.RGBA, type: gl.UNSIGNED_BYTE, isFloat: false };
}

/* ------------------------------------------------------------------ instance */

class FluidInstance {
  constructor(name, container, opts) {
    this.name = name;
    this.container = container;
    this.opts = opts || {};
    this.kind = this.opts.kind || "hero";
    this.fixedPalette = this.opts.fixedPalette || null;

    const tierName = TIER_ORDER.includes(this.opts.quality) ? this.opts.quality : this.pickInitialTier();
    this.setTier(tierName, true);

    /* Canvas. Created here, never in markup (spec §6.2/§6.12) — so a failed
     * module can never leave an empty hero, and the no-JS path is untouched. */
    const canvas = document.createElement("canvas");
    canvas.className = this.kind === "echo" ? "fluid-echo" : "fluid-canvas";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);
    this.canvas = canvas;

    /* OGL creates the context. A thrown constructor IS the unsupported signal —
     * no probe context is burned (spec §6.1, §6.11). */
    this.renderer = new Renderer({
      canvas: canvas,
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
      autoClear: false
    });
    const gl = this.renderer.gl;
    this.gl = gl;
    if (!gl || (gl.isContextLost && gl.isContextLost())) { throw new Error("fluid: no usable context"); }

    canvas.addEventListener("webglcontextcreationerror", () => { this.fail("unsupported"); });
    this._onLost = (e) => {
      // preventDefault only suppresses the browser's default blanking while we
      // cross-fade away; it is NOT a restore intent (spec §6.11).
      if (e && e.preventDefault) { e.preventDefault(); }
      this.fail("lost");
    };
    canvas.addEventListener("webglcontextlost", this._onLost, false);

    this.fmt = detectFloat(gl);
    this.simFmt = this.fmt;                                   // velocity + pressure need float
    this.densityFmt = this.fmt;                               // density drops later if partial
    this.reduced = isReduced();
    this.visible = false;
    this.running = false;
    this.status = "pending";
    this.bloom = this.kind === "echo" || this.reduced ? 1 : 0;
    this.mix = 1;
    this.mixFrom = null;
    this.mixTo = null;
    this.tint = { amount: 0, color: [0.2, 1.0, 0.35], phase: "idle", t0: 0, rampMs: 500, holdMs: 4500 };
    this.stir = { until: 0, intensity: 0 };
    this.queue = [];
    this.energy = 0.6;
    this.energyAccum = 0;
    this.energyClock = 0;
    this.lowSamples = 0;
    this.emitters = this.kind === "echo"
      ? [{ x: 0.3, y: 0.45, tx: 0.7, ty: 0.5, next: rand(3, 8), leg: 6, dir: 1 }]
      : [{ x: 0.25, y: 0.35, tx: 0.7, ty: 0.4, next: rand(3, 6), leg: 7, dir: 1 },
         { x: 0.75, y: 0.6, tx: 0.3, ty: 0.7, next: rand(4, 7), leg: 9, dir: 1 }];
    this.pointer = null;
    this.pointerActive = 0;
    this.probe = { frames: 0, total: 0, values: [], done: false, started: false };
    this.frameCount = 0;
    this.lastFrameAt = 0;
    this.stirClock = 0;
    this.crossfadeEnd = 0;
    /* Crossfade must ride the wipe's own clock, owned by main.js and published
     * before fluid:ready can fire (spec §6.9). */
    this.wipeMs = (window.THEME_WIPE && window.THEME_WIPE.duration)
      ? window.THEME_WIPE.duration * 1000
      : 700;

    this.buildPrograms();
    this.resize(true);
    this.seedField(this.reduced ? 1 : 1234);
    if (this.reduced) {
      this.runFrozenFrame();
    } else {
      this.warmUp();
    }
    this.status = "ready";
    /* Fade in only now that a real frame exists, so a broken sim can never be
     * the reason the hero is empty (spec §6.2). */
    canvas.classList.add("is-live");
  }

  /* Cheap device hint only — the frame-time probe does the real work (§6.10). */
  pickInitialTier() {
    const w = window.innerWidth || 1280;
    const cores = navigator.hardwareConcurrency || 4;
    const mem = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : null;
    if (w < 800 || cores <= 2) { return "medium"; }
    if (w < 1400 || cores <= 4 || mem === 1) { return "medium"; }
    return "high";
  }

  setTier(name, initial) {
    this.tierName = name;
    this.tier = TIERS[name];
    this.tierIndex = TIER_ORDER.indexOf(name);
    if (!initial) { this.probe = { frames: 0, total: 0, values: [], done: false, started: true }; }
  }

  /* One Program per pass (spec §6.1), all sharing ONE fullscreen Triangle. Each
   * program gets its own Mesh — OGL resolves the program through the mesh during
   * render, so swapping `mesh.program` after construction is not a supported path. */
  buildPrograms() {
    const gl = this.gl;
    const geometry = new Triangle(gl);
    const P = (fragment) => new Program(gl, { vertex: VERT, fragment, depthTest: false, depthWrite: false });
    this.clearProg = P(FRAG_CLEAR);
    this.splatProg = P(FRAG_SPLAT);
    this.advectProg = P(FRAG_ADVECTION);
    this.divergenceProg = P(FRAG_DIVERGENCE);
    this.curlProg = P(FRAG_CURL);
    this.vorticityProg = P(FRAG_VORTICITY);
    this.pressureProg = P(FRAG_PRESSURE);
    this.gradientProg = P(FRAG_GRADIENT_SUBTRACT);
    this.seedProg = P(FRAG_SEED);
    this.displayProg = P(FRAG_DISPLAY);

    this.meshes = new Map();
    [this.clearProg, this.splatProg, this.advectProg, this.divergenceProg, this.curlProg,
     this.vorticityProg, this.pressureProg, this.gradientProg, this.seedProg, this.displayProg]
      .forEach((p) => { this.meshes.set(p, new Mesh(gl, { geometry: geometry, program: p })); });

    this.paletteNow = this.fixedPalette
      ? { a: paletteSlots(this.fixedPalette), b: paletteSlots(this.fixedPalette) }
      : { a: paletteSlots(readMediaPalette(false)), b: paletteSlots(readMediaPalette(false)) };
  }

  /* Allocate / reallocate every simulation target for the current size. */
  resize(initial) {
    const gl = this.gl;
    const rect = (this.container || this.canvas.parentElement || this.canvas).getBoundingClientRect();
    const cw = Math.max(1, Math.round(rect.width) || window.innerWidth || 1);
    const ch = Math.max(1, Math.round(rect.height) || window.innerHeight || 1);
    const aspect = cw / ch;

    const simLong = this.tier.sim;
    const denLong = this.tier.density;
    const grid = (long) => (aspect >= 1
      ? { w: long, h: Math.max(1, Math.round(long / aspect)) }
      : { w: Math.max(1, Math.round(long * aspect)), h: long });

    const sim = grid(simLong);
    const den = grid(denLong);

    /* Drawing buffer via OGL — never by writing canvas.width directly. The third
     * argument suppresses OGL's inline style write so CSS keeps owning layout. */
    this.renderer.dpr = Math.min(window.devicePixelRatio || 1, this.tier.dpr);
    this.renderer.setSize(cw, ch, false);

    this.aspect = aspect;
    this.simTexel = new Vec2(1 / sim.w, 1 / sim.h);
    this.denTexel = new Vec2(1 / den.w, 1 / den.h);
    this.velTexel = new Vec2(1 / sim.w, 1 / sim.h);

    this.velocity = createDoubleFBO(gl, sim.w, sim.h, this.simFmt);
    this.density = createDoubleFBO(gl, den.w, den.h, this.densityFmt);
    this.pressure = createDoubleFBO(gl, sim.w, sim.h, this.simFmt);
    this.divergence = new RenderTarget(gl, {
      width: sim.w, height: sim.h, minFilter: gl.LINEAR, magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE,
      internalFormat: this.simFmt.internalFormat, format: this.simFmt.format, type: this.simFmt.type,
      depth: false, stencil: false
    });
    this.curl = new RenderTarget(gl, {
      width: sim.w, height: sim.h, minFilter: gl.LINEAR, magFilter: gl.LINEAR,
      wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE,
      internalFormat: this.simFmt.internalFormat, format: this.simFmt.format, type: this.simFmt.type,
      depth: false, stencil: false
    });

    if (!initial) { this.needsReseed = true; }
  }

  draw(program, target) {
    const mesh = this.meshes.get(program);
    if (!mesh) { return; }
    this.renderer.render({ scene: mesh, target: target || null });
  }

  /* Fill the density grid with a smooth phase field. */
  seedField(seed) {
    this.seedProg.uniforms.uSeed.value = seed;
    this.draw(this.seedProg, this.density.write, null);
    this.density.swap();
  }

  /* Compile + one presented frame, so the first visible frame is not a warm-up
   * (spec Risk 2). Called at init only. */
  warmUp() {
    for (let i = 0; i < 2; i++) { this.stepSim(1 / 60); }
    this.drawDisplay();
  }

  /* Reduced-motion path: deterministic seeded composition, K steps, one draw.
   * No motion thereafter — but "frozen" means no *animation*, not never drawn
   * again, so resize/visibility can call this again (spec §6.12). */
  runFrozenFrame(reseed) {
    if (reseed) { this.seedField(1234); }
    for (const s of FROZEN_SPLATS) {
      this.splat(s[0], s[1], s[3], s[4], s[5], { phase: s[2], energy: s[6] });
    }
    for (let i = 0; i < FROZEN_STEPS; i++) { this.stepSim(1 / 60); }
    this.drawDisplay();
  }

  redrawOnly() {
    if (this.status !== "ready") { return; }
    this.drawDisplay();
  }

  /* Queue one injection. Batched into the single injection stage, max 8 per
   * frame with the §6.1 drop order (reveal → scroll → pointer → autonomous). */
  queueSplat(s) {
    this.queue.push(s);
    if (this.queue.length > SPLAT_BATCH_CAP * 2) { this.queue.length = SPLAT_BATCH_CAP * 2; }
  }

  splat(x, y, dx, dy, radius, opts) {
    const o = opts || {};
    if (!this.velocity) { return; }
    const phase = o.phase != null ? o.phase : Math.random();
    const energy = o.energy != null ? o.energy : 0.8;
    const r = clamp(radius || SPLAT_RADIUS, 0.005, 0.6);

    this.splatProg.uniforms.uAspect.value = this.aspect;
    this.splatProg.uniforms.uPoint.value = [x, y];
    this.splatProg.uniforms.uRadius.value = r;

    // Velocity
    this.splatProg.uniforms.uTarget.value = this.velocity.read.texture;
    this.splatProg.uniforms.uColor.value = [dx, dy, 0];
    this.draw(this.splatProg, this.velocity.write);
    this.velocity.swap();

    // Density (phase + energy, never baked RGB — see FRAG_DISPLAY's note)
    this.splatProg.uniforms.uTarget.value = this.density.read.texture;
    this.splatProg.uniforms.uColor.value = [phase, energy, 0];
    this.draw(this.splatProg, this.density.write);
    this.density.swap();

    this.energyAccum += Math.abs(dx) + Math.abs(dy) + energy * 0.5;
  }

  /* One simulation step, honouring the §6.1 pass order exactly. */
  stepSim(dt) {
    const iterations = this.tier.iterations;

    // 1. Advect velocity
    this.advectProg.uniforms.uVelocity.value = this.velocity.read.texture;
    this.advectProg.uniforms.uSource.value = this.velocity.read.texture;
    this.advectProg.uniforms.uTexel.value = this.simTexel;
    this.advectProg.uniforms.uVelocityTexel.value = this.velTexel;
    this.advectProg.uniforms.dt.value = dt;
    this.draw(this.advectProg, this.velocity.write);
    this.velocity.swap();

    // 2. Dissipate velocity — time-correct: pow(base, dt)
    this.clearProg.uniforms.uTexture.value = this.velocity.read.texture;
    this.clearProg.uniforms.uValue.value = Math.pow(VELOCITY_DISSIPATION, dt);
    this.draw(this.clearProg, this.velocity.write);
    this.velocity.swap();

    // 3. Curl
    this.curlProg.uniforms.uVelocity.value = this.velocity.read.texture;
    this.draw(this.curlProg, this.curl);

    // 4. Vorticity confinement
    this.vorticityProg.uniforms.uVelocity.value = this.velocity.read.texture;
    this.vorticityProg.uniforms.uCurl.value = this.curl.texture;
    this.vorticityProg.uniforms.uCurlStrength.value = CURL_STRENGTH + (this.stir.intensity || 0) * 20;
    this.vorticityProg.uniforms.dt.value = dt;
    this.draw(this.vorticityProg, this.velocity.write);
    this.velocity.swap();

    // 5. Divergence
    this.divergenceProg.uniforms.uVelocity.value = this.velocity.read.texture;
    this.draw(this.divergenceProg, this.divergence);

    // 6. Pressure solve (Jacobi)
    this.clearProg.uniforms.uTexture.value = this.pressure.read.texture;
    this.clearProg.uniforms.uValue.value = 0.8;
    this.draw(this.clearProg, this.pressure.write);
    this.pressure.swap();
    for (let i = 0; i < iterations; i++) {
      this.pressureProg.uniforms.uPressure.value = this.pressure.read.texture;
      this.pressureProg.uniforms.uDivergence.value = this.divergence.texture;
      this.draw(this.pressureProg, this.pressure.write);
      this.pressure.swap();
    }

    // 7. Gradient subtract
    this.gradientProg.uniforms.uPressure.value = this.pressure.read.texture;
    this.gradientProg.uniforms.uVelocity.value = this.velocity.read.texture;
    this.draw(this.gradientProg, this.velocity.write);
    this.velocity.swap();

    // 8. Advect density (samples the velocity grid with its own texel)
    this.advectProg.uniforms.uVelocity.value = this.velocity.read.texture;
    this.advectProg.uniforms.uSource.value = this.density.read.texture;
    this.advectProg.uniforms.uTexel.value = this.denTexel;
    this.advectProg.uniforms.uVelocityTexel.value = this.velTexel;
    this.advectProg.uniforms.dt.value = dt;
    this.draw(this.advectProg, this.density.write);
    this.density.swap();

    // 9. Dissipate density
    this.clearProg.uniforms.uTexture.value = this.density.read.texture;
    this.clearProg.uniforms.uValue.value = Math.pow(DENSITY_DISSIPATION, dt);
    this.draw(this.clearProg, this.density.write);
    this.density.swap();
  }

  /* 10. Injections — one stage, priority-ordered, capped. */
  flushInjections() {
    if (!this.queue.length) { return; }
    const priority = { autonomous: 3, pointer: 2, scroll: 1, reveal: 0 };
    const batch = this.queue
      .slice()
      .sort((a, b) => (priority[b.kind] || 0) - (priority[a.kind] || 0))
      .slice(0, SPLAT_BATCH_CAP);
    this.queue.length = 0;
    for (const s of batch) { this.splat(s.x, s.y, s.dx, s.dy, s.radius, s); }
  }

  /* Autonomous emitters: the hero must be alive with the cursor untouched
   * (§6.4). Two wandering emitters, one splat each every 3–6s. */
  tickEmitters(dt, now) {
    if (this.reduced) { return; }
    const rate = this.tier.emitterRate;
    for (const e of this.emitters) {
      e.next -= dt * rate;
      const k = clamp(dt / e.leg, 0, 1);
      e.x += (e.tx - e.x) * k;
      e.y += (e.ty - e.y) * k;
      if (e.next <= 0) {
        e.next = rand(3, 6) / Math.max(rate, 0.2);
        e.tx = rand(0.12, 0.88);
        e.ty = rand(0.12, 0.88);
        e.leg = rand(6, 11);
        const dx = clamp((e.tx - e.x) * 8, -4, 4);
        const dy = clamp((e.ty - e.y) * 8, -4, 4);
        this.queueSplat({
          x: e.x, y: e.y, dx, dy,
          radius: rand(0.15, 0.25),
          phase: Math.random(),
          energy: 0.7,
          kind: "autonomous"
        });
      }
    }
    /* Idle reseed — CPU-side energy proxy by default (spec §6.6). */
    this.energyClock += dt * 1000;
    if (this.energyClock >= ENERGY_SAMPLE_MS) {
      this.energyClock = 0;
      this.energy = this.energy * 0.5 + this.energyAccum * 0.5;
      this.energyAccum = 0;
      if (this.energy < RESEED_FLOOR) {
        this.lowSamples++;
        if (this.lowSamples >= 2) {
          this.lowSamples = 0;
          this.queueSplat({
            x: rand(0.2, 0.8), y: rand(0.2, 0.8), dx: rand(-2, 2), dy: rand(-2, 2),
            radius: 0.3, phase: Math.random(), energy: 1.0, kind: "autonomous"
          });
        }
      } else {
        this.lowSamples = 0;
      }
    }

    /* A stir is a sustained event, not a single impulse (§6.14): keep feeding
     * the field while it is active so the 6s reads as violence, not a poke. */
    if (this.stir.until > now) {
      this.stirClock += dt;
      if (this.stirClock >= 0.14) {
        this.stirClock = 0;
        this.queueSplat({
          x: rand(0.1, 0.9), y: rand(0.1, 0.9),
          dx: rand(-FORCE_CLAMP, FORCE_CLAMP), dy: rand(-FORCE_CLAMP, FORCE_CLAMP),
          radius: rand(0.18, 0.3), phase: Math.random(), energy: 1.0, kind: "pointer"
        });
      }
    } else {
      this.stirClock = 0;
    }
  }

  /* Pointer drive: fluid.js owns it because the canvas is pointer-events:none,
   * so the listener lives on window (§6.4). Throttled to one per frame. */
  onPointer(e) {
    if (this.reduced || this.kind !== "hero" || !this.running) { return; }
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / Math.max(1, rect.width);
    const y = 1 - (e.clientY - rect.top) / Math.max(1, rect.height);
    if (x < 0 || x > 1 || y < 0 || y > 1) { return; }
    const prev = this.pointer;
    this.pointer = { x, y, nx: prev ? x : x, ny: prev ? y : y, dx: prev ? x - prev.x : 0, dy: prev ? y - prev.y : 0 };
    this.pointerActive = 1;
  }

  flushPointer() {
    if (!this.pointer || this.reduced || this.kind !== "hero") { return; }
    const p = this.pointer;
    if (Math.abs(p.dx) > 0.0001 || Math.abs(p.dy) > 0.0001) {
      const simLong = this.tier.sim;
      const dxPx = p.dx * (this.canvas.clientWidth || 1);
      const dyPx = p.dy * (this.canvas.clientHeight || 1);
      const scale = FORCE_SCALE / simLong;
      this.queueSplat({
        x: p.x, y: p.y,
        dx: clamp(dxPx * scale, -FORCE_CLAMP, FORCE_CLAMP),
        dy: clamp(dyPx * scale, -FORCE_CLAMP, FORCE_CLAMP),
        radius: rand(0.15, 0.25),
        phase: Math.random(), energy: 0.85, kind: "pointer"
      });
    }
    this.pointer.dx = 0;
    this.pointer.dy = 0;
  }

  /* 11. Display */
  drawDisplay() {
    const u = this.displayProg.uniforms;
    u.uTexture.value = this.density.read.texture;
    const a = this.paletteNow.a;
    const b = this.paletteNow.b;
    u.uA0.value = a[0]; u.uA1.value = a[1]; u.uA2.value = a[2]; u.uA3.value = a[3];
    u.uB0.value = b[0]; u.uB1.value = b[1]; u.uB2.value = b[2]; u.uB3.value = b[3];
    u.uMix.value = this.mix;
    u.uBloom.value = this.bloom;
    u.uTintColor.value = this.tint.color;
    u.uTintAmount.value = this.tint.amount;
    /* Light theme holds a luminance floor (black type); dark theme a ceiling
     * (white type). Verified numbers in spec §6.7. */
    const light = document.documentElement.dataset.theme !== "dark";
    u.uLumFloor.value = light ? 0.19 : 0.0;
    u.uLumCeil.value = light ? 1.0 : 0.15;
    u.uSatMax.value = light ? 0.55 : 0.85;
    u.uDither.value = this.kind === "echo" ? 1.1 : 0.6;
    this.draw(this.displayProg, null);
  }

  /* Per-frame entry point, called by the shared driver. `ms` is the wall-clock
   * interval since this instance's previous stepped frame — the watchdog's
   * "frame time" (§6.10), not the cost of our own passes. */
  frame(now, ms) {
    if (this.status !== "ready" || this.reduced) { return; }
    const dt = clamp(this.lastT ? (now - this.lastT) / 1000 : 1 / 60, 0.0001, DT_MAX);
    this.lastT = now;

    /* uBloom starts only once a frame has actually been submitted (Risk 2), so
     * the ignite never competes with shader compilation. */
    if (this.frameCount >= 2 && this.bloom < 1) {
      this.bloom = Math.min(1, this.bloom + dt / 1.5);
    }

    this.flushPointer();
    this.tickEmitters(dt, now);
    this.stepSim(dt);
    this.flushInjections();
    this.advanceTintAndStir(dt, now);
    this.drawDisplay();
    this.frameCount++;
    this.probeFrame(ms);
    this.lastFrameAt = now;
  }

  advanceTintAndStir(dt, now) {
    // Stir: ~6s of elevated vorticity + force, easing back to calm.
    if (this.stir.until && now >= this.stir.until) { this.stir = { until: 0, intensity: 0 }; }
    // Tint: independent overlay uniform, ramps up, holds, releases onto the
    // *current* palette (so a theme change mid-effect still releases correctly).
    const t = this.tint;
    if (t.phase === "ramp") {
      t.amount = Math.min(1, t.amount + (dt * 1000) / Math.max(1, t.rampMs));
      if (t.amount >= 1) { t.phase = "hold"; t.t0 = now; }
    } else if (t.phase === "hold") {
      if (now - t.t0 >= t.holdMs) { t.phase = "release"; }
    } else if (t.phase === "release") {
      t.amount = Math.max(0, t.amount - (dt * 1000) / 400);
      if (t.amount <= 0) { t.phase = "idle"; }
    }
  }

  /* Frame-time watchdog (spec §6.10). */
  probeFrame(ms) {
    if (this.probe.done) { return; }
    const coVisible = this.opts.coVisible ? this.opts.coVisible() : false;
    if (!this.probe.started) {
      this.probeSkip = PROBE_SKIP;
      this.probe.started = true;
      return;
    }
    if (this.probeSkip > 0) { this.probeSkip--; return; }
    this.probe.values.push(ms);
    this.probe.total += ms;
    this.probe.frames++;
    if (this.probe.frames >= PROBE_WINDOW) {
      const avg = this.probe.total / this.probe.frames;
      const sorted = this.probe.values.slice().sort((x, y) => x - y);
      const median = sorted[Math.floor(sorted.length / 2)];
      const budget = coVisible ? FRAME_BUDGET_MS : FRAME_BUDGET_MS;
      if (avg > budget && median > budget) { this.downgrade(); }
      this.probe.done = true;
    }
  }

  downgrade() {
    if (this.tierIndex >= TIER_ORDER.length - 1) {
      // Low + still over budget → cross-fade to the blob wash and release the
      // context deliberately (spec §6.10 terminal state).
      this.fail("destroyed");
      return;
    }
    const next = TIER_ORDER[this.tierIndex + 1];
    this.setTier(next, false);
    this.resize(true);
    this.seedField(777);
    this.probeDone = true;
  }

  /* Fatal-for-this-instance path: stop stepping, fade out, tell main.js. */
  fail(reason) {
    if (this.status === "lost" || this.status === "destroyed") { return; }
    this.status = reason;
    this.running = false;
    this.visible = false;
    this.probe.done = true;
    /* The scrim exists to make a live canvas legible, so it leaves with the
       canvas it was built for: over the blob wash a raw scrim would veil a media
       layer that was never designed to sit under one (light theme core is 72%
       white). Deferred to the END of the 600ms cross-fade so the veil lifts as
       the blob wash settles rather than flashing the un-veiled fluid first. */
    if (this.kind === "hero") { setTimeout(removeScrim, CROSSFADE_MS + 20); }
    const canvas = this.canvas;
    if (canvas && canvas.style) {
      canvas.style.transition = "opacity 600ms cubic-bezier(0.19, 1, 0.22, 1)";
      canvas.style.opacity = "0";
    }
    window.dispatchEvent(new CustomEvent("fluid:fallback", { detail: { instance: this.name, reason: reason } }));
  }

  destroy() {
    if (this.status === "destroyed") { return; }
    this.status = "destroyed";
    this.running = false;
    this.visible = false;
    if (this.kind === "hero") { removeScrim(); }
    try {
      const lose = this.gl && this.gl.getExtension("WEBGL_lose_context");
      if (lose) { lose.loseContext(); }
    } catch (e) { /* context already gone */ }
    if (this.canvas && this.canvas.parentNode) { this.canvas.parentNode.removeChild(this.canvas); }
    if (this._onLost && this.canvas) { this.canvas.removeEventListener("webglcontextlost", this._onLost); }
    this.velocity = this.density = this.pressure = null;
    window.dispatchEvent(new CustomEvent("fluid:fallback", { detail: { instance: this.name, reason: "destroyed" } }));
  }
}

/* ------------------------------------------------------------------ module */

const instances = {};
let driverStarted = false;

/* One rAF for both sims; never two loops. rAF already stops while the tab is
 * hidden — visibility is handled by flags, not by re-scheduling inside a hidden
 * branch (spec §4). */
function driver(now) {
  if (!document.hidden) {
    for (const name in instances) {
      const inst = instances[name];
      if (!inst || !inst.visible || !inst.running) { continue; }
      /* Wall-clock interval since *this instance's* last stepped frame. When both
       * instances are visible they share the interval, which is exactly the
       * combined measurement §6.10 asks for. */
      const ms = inst.lastFrameAt ? now - inst.lastFrameAt : 0;
      inst.frame(now, ms);
    }
  }
  requestAnimationFrame(driver);
}

/* Mini-reseed after a reallocation: one splat is not a composed field (§4/§6.6). */
function reseedInstance(inst, count) {
  const n = count || RESIZE_SPLATS;
  for (let i = 0; i < n; i++) {
    inst.queueSplat({
      x: rand(0.15, 0.85), y: rand(0.15, 0.85),
      dx: rand(-2, 2), dy: rand(-2, 2),
      radius: rand(0.2, 0.3), phase: Math.random(), energy: 0.9, kind: "autonomous"
    });
  }
}

/* The scrim is created by JS, never markup, and sits as a sibling of `.ambient`
 * so the existing <noscript> rule can hide it (spec §3, §4). */
/* The scrim belongs to a live hero canvas and leaves with it: it is removed on
 * construction failure, on context loss, on the tier terminal state, on destroy,
 * and (below) the moment those paths are known. Over the blob wash a raw scrim
 * would wash the hero out — the fallback must look like the fallback, not like a
 * veiled version of it. */
function removeScrim() {
  const scrim = document.querySelector(".fluid-scrim");
  if (scrim && scrim.parentNode) { scrim.parentNode.removeChild(scrim); }
}

function ensureScrim() {
  if (document.querySelector(".fluid-scrim")) { return; }
  const scrim = document.createElement("div");
  scrim.className = "fluid-scrim";
  scrim.setAttribute("aria-hidden", "true");
  const ambient = document.querySelector(".ambient");
  if (ambient && ambient.parentNode) { ambient.parentNode.insertBefore(scrim, ambient.nextSibling); }
  else { document.body.appendChild(scrim); }
}

/* ResizeObserver on the container, rAF-throttled, with a zero-size guard (§4). */
function observeResize(inst) {
  if (typeof ResizeObserver === "undefined" || !inst.container) { return; }
  let pending = false;
  const ro = new ResizeObserver(() => {
    if (pending) { return; }
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const el = inst.container;
      if (!el || inst.status !== "ready") { return; }
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) { return; }
      const px = r.width * r.height;
      const prev = inst.pixels || px;
      const jump = Math.abs(px - prev) / Math.max(prev, 1);
      inst.pixels = px;
      inst.resize(false);
      if (inst.reduced) {
        inst.runFrozenFrame(true);
      } else if (inst.running && inst.visible) {
        reseedInstance(inst);
        /* One re-probe is allowed on a >25% pixel jump (portrait ↔ landscape). */
        if (jump > 0.25) { inst.probe = { frames: 0, total: 0, values: [], done: false, started: false }; }
      } else {
        inst.needsReseed = true;   // deferred to resume (§4)
      }
    });
  });
  ro.observe(inst.container);
}

const status = () => {
  const live = Object.keys(instances).filter((k) => instances[k]);
  if (!live.length) { return "pending"; }
  if (live.some((k) => instances[k].status === "ready")) { return "ready"; }
  if (live.some((k) => instances[k].status === "lost")) { return "lost"; }
  if (live.some((k) => instances[k].status === "destroyed")) { return "destroyed"; }
  return "unsupported";
};

function containerFor(instance) {
  if (instance === "echo") {
    // The band itself: the canvas spans it, clipped by the band's own CSS.
    return document.querySelector(".signals") || null;
  }
  return document.querySelector(".ambient") || null;
}

function init(instance, opts) {
  const name = instance === "echo" ? "echo" : "hero";
  if (instances[name]) { return instances[name]; }   // idempotent

  const container = containerFor(name);
  if (!container) { return null; }

  if (name === "hero") { ensureScrim(); }

  try {
    const inst = new FluidInstance(name, container, {
      kind: name,
      quality: opts && opts.quality,
      fixedPalette: name === "echo" ? readMediaPalette(true) : null,
      coVisible: () => {
        const h = instances.hero;
        const e = instances.echo;
        return !!(h && e && h.visible && e.visible);
      }
    });
    instances[name] = inst;
    if (name === "hero") {
      // Pointer drive lives here: the canvas is pointer-events:none, so the
      // listener must be on window (spec §6.4).
      if (isFinePointer() && !isReduced()) {
        window.addEventListener("pointermove", (e) => inst.onPointer(e), { passive: true });
        window.addEventListener("pointerleave", () => { inst.pointerActive = 0; }, { passive: true });
      }
    }
    observeResize(inst);
    window.dispatchEvent(new CustomEvent("fluid:first-frame", { detail: { instance: name } }));
  } catch (err) {
    /* No canvas was created, so the scrim ensureScrim() just added would sit
       alone over the blob wash. Removed synchronously, before paint. */
    if (name === "hero") { removeScrim(); }
    window.dispatchEvent(new CustomEvent("fluid:fallback", { detail: { instance: name, reason: "unsupported" } }));
    return null;
  }

  if (!driverStarted) { driverStarted = true; requestAnimationFrame(driver); }
  return instances[name];
}

function inject(s) {
  const inst = instances.hero;
  if (!inst || inst.status !== "ready") { return; }
  inst.queueSplat(s);
}

function setVisible(instance, visible) {
  const inst = instances[instance === "echo" ? "echo" : "hero"];
  if (!inst) { return; }
  const wasVisible = inst.visible;
  inst.visible = !!visible;
  inst.running = !!visible && inst.status === "ready" && !inst.reduced;
  if (inst.running && !wasVisible) {
    inst.probe = { frames: 0, total: 0, values: [], done: false, started: false };
  }
  /* A resize while paused reallocated but deferred its reseed to resume (§4). */
  if (inst.running && inst.needsReseed) {
    inst.needsReseed = false;
    reseedInstance(inst);
  }
  if (!inst.running) { inst.lastT = 0; inst.lastFrameAt = 0; }
}

function stir(o) {
  const opts = o || {};
  const intensity = clamp(opts.intensity != null ? opts.intensity : 1, 0, 2);
  const durationMs = opts.durationMs || 6000;
  const radius = opts.radius || 0.25;
  const inst = instances.hero;
  if (!inst || inst.status !== "ready" || inst.reduced) { return; }
  inst.stir = { until: performance.now() + durationMs, intensity };
  for (let i = 0; i < 4; i++) {
    inst.queueSplat({
      x: rand(0.15, 0.85), y: rand(0.15, 0.85),
      dx: rand(-FORCE_CLAMP, FORCE_CLAMP), dy: rand(-FORCE_CLAMP, FORCE_CLAMP),
      radius, phase: Math.random(), energy: 1.0, kind: "pointer"
    });
  }
}

function tint(o) {
  const opts = o || {};
  const inst = instances.hero;
  if (!inst || inst.status !== "ready" || inst.reduced) { return; }
  if (opts.color) { inst.tint.color = opts.color; }
  inst.tint.rampMs = opts.rampMs || 500;
  inst.tint.holdMs = opts.holdMs || 4500;
  inst.tint.phase = "ramp";
}

/* Theme crossfade. main.js has already flipped data-theme and painted the wipe;
 * this reads the *incoming* palette and ramps from the cached outgoing one, so
 * the whole existing field recolours rather than only new liquid (spec §6.9).
 * An in-flight ramp is restarted from its interpolated state, never snapped. */
function setTheme(to) {
  const inst = instances.hero;
  if (!inst || inst.status !== "ready") { return; }
  const incoming = paletteSlots(readMediaPalette(false));
  const current = inst.paletteNow;
  const eased = smoothstep(inst.mix);
  const from = current.a.map((c, i) => [
    c[0] + (current.b[i][0] - c[0]) * eased,
    c[1] + (current.b[i][1] - c[1]) * eased,
    c[2] + (current.b[i][2] - c[2]) * eased
  ]);
  inst.paletteNow = { a: from, b: incoming };
  inst.mix = 0;
  inst.crossfadeEnd = performance.now() + (inst.wipeMs || 700);
  inst.reduced = isReduced();
  if (inst.reduced) {
    inst.paletteNow = { a: incoming, b: incoming };
    inst.mix = 1;
    inst.redrawOnly();
  }
  void to;
}

function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/* The crossfade clock lives in the driver so it stays independent of the sim's
 * dt clamp, and stops exactly when the wipe does. */
function tickCrossfade(now) {
  const inst = instances.hero;
  if (!inst || !inst.crossfadeEnd) { return; }
  const total = inst.wipeMs || 700;
  const remaining = inst.crossfadeEnd - now;
  const m = clamp(1 - remaining / total, 0, 1);
  inst.mix = m;
  if (remaining <= 0) {
    inst.mix = 1;
    inst.paletteNow = { a: inst.paletteNow.b, b: inst.paletteNow.b };
    inst.crossfadeEnd = 0;
  }
  if (inst.visible && !inst.reduced) { inst.redrawOnly(); }
}

function freeze() {
  for (const name in instances) {
    const inst = instances[name];
    if (!inst || inst.status !== "ready") { continue; }
    inst.reduced = true;
    inst.running = false;
    inst.visible = false;
    inst.runFrozenFrame(true);
  }
}

function destroy(instance) {
  if (instance) {
    const inst = instances[instance];
    if (inst) { inst.destroy(); delete instances[instance]; }
    return;
  }
  for (const name in instances) {
    if (instances[name]) { instances[name].destroy(); delete instances[name]; }
  }
  driverStarted = false;
}

/* Injected into the driver on every tick, whether or not the sims are stepping. */
const crossfadeDriver = (now) => { tickCrossfade(now); requestAnimationFrame(crossfadeDriver); };

const Fluid = {
  get status() { return status(); },
  init: init,
  inject: inject,
  setVisible: setVisible,
  stir: stir,
  tint: tint,
  setTheme: setTheme,
  freeze: freeze,
  destroy: destroy,
  palette: () => (instances.hero ? instances.hero.paletteNow : null),
  // Extra surface used by main.js for the §6.4 couplings' timing.
  resize: (instance) => {
    const inst = instances[instance === "echo" ? "echo" : "hero"];
    if (inst && inst.status === "ready") { inst.resize(false); }
  },
  redraw: (instance) => {
    const inst = instances[instance === "echo" ? "echo" : "hero"];
    if (inst) { inst.redrawOnly(); }
  }
};

window.Fluid = Fluid;

/* Fallback for environments without ResizeObserver — window resize only. */
if (typeof ResizeObserver === "undefined") {
  window.addEventListener("resize", () => {
    for (const name in instances) {
      const inst = instances[name];
      if (!inst || inst.status !== "ready") { continue; }
      inst.resize(false);
      if (inst.reduced) { inst.runFrozenFrame(true); }
      else if (inst.running && inst.visible) { reseedInstance(inst); }
    }
  }, { passive: true });
}

/* A frozen frame can lose its surface across a tab restore, so redisplay it
 * rather than trusting the front buffer (spec §6.12). */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { return; }
  for (const name in instances) {
    const inst = instances[name];
    if (inst && inst.status === "ready" && inst.reduced) { inst.redrawOnly(); }
  }
});

requestAnimationFrame(crossfadeDriver);

/* main.js may already be waiting for this (it runs first — spec §3). */
window.dispatchEvent(new Event("fluid:ready"));
