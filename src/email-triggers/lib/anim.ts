import { Easing, interpolate, spring } from "remotion";
import { FPS } from "../timeline";

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const ease = {
  linear: (t: number) => t,
  out: Easing.bezier(0.16, 1, 0.3, 1), // expo-ish out
  outSoft: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  inOutSoft: Easing.bezier(0.45, 0, 0.2, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  inSoft: Easing.bezier(0.5, 0, 0.75, 0),
  backOut: Easing.bezier(0.34, 1.56, 0.64, 1),
  snap: Easing.bezier(0.2, 0.9, 0.1, 1),
} as const;

type EaseFn = (t: number) => number;

/** Clamped 0..1 progress of `frame` between `start` and `start + dur`. */
export const prog = (frame: number, start: number, dur: number, fn: EaseFn = ease.out) =>
  fn(clamp((frame - start) / Math.max(1, dur)));

/** Clamped interpolate with a single easing. */
export const tween = (
  frame: number,
  input: [number, number],
  output: [number, number],
  fn: EaseFn = ease.out,
) =>
  interpolate(frame, input, output, {
    easing: fn,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Multi-stop clamped interpolate; `fns` has one easing per segment. */
export const keys = (
  frame: number,
  input: number[],
  output: number[],
  fns?: EaseFn | EaseFn[],
) => {
  const list = Array.isArray(fns) ? fns : undefined;
  let i = 0;
  while (i < input.length - 2 && frame > input[i + 1]) i++;
  const fn = list ? list[Math.min(i, list.length - 1)] : (fns as EaseFn | undefined) ?? ease.inOut;
  return interpolate(frame, [input[i], input[i + 1]], [output[i], output[i + 1]], {
    easing: fn,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

export const springAt = (
  frame: number,
  start: number,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
) =>
  spring({
    frame: frame - start,
    fps: FPS,
    config: { damping: 18, stiffness: 140, mass: 1, ...config },
  });

/** 0 → 1 → 0 envelope for elements that enter and leave. */
export const inOut = (
  frame: number,
  start: number,
  inDur: number,
  hold: number,
  outDur: number,
  fnIn: EaseFn = ease.out,
  fnOut: EaseFn = ease.in,
) => {
  if (frame < start + inDur) return prog(frame, start, inDur, fnIn);
  const outStart = start + inDur + hold;
  return 1 - prog(frame, outStart, outDur, fnOut);
};

/** Deterministic pseudo random in [0, 1) from integer-ish seed. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

export const lerpColor = (a: [number, number, number], b: [number, number, number], t: number) =>
  `rgb(${Math.round(mix(a[0], b[0], t))}, ${Math.round(mix(a[1], b[1], t))}, ${Math.round(mix(a[2], b[2], t))})`;

/** Cubic bezier point for path motion. */
export const bezierPoint = (
  t: number,
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
): [number, number] => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
};

/** Typewriter: how many characters of `text` are visible. */
export const typed = (frame: number, start: number, cps: number, text: string) =>
  text.slice(0, Math.max(0, Math.floor(((frame - start) / FPS) * cps)));
