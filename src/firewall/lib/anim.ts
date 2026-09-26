import { interpolate } from "remotion";
import { EASE } from "../theme";

type EasingFn = (t: number) => number;

/** Clamped interpolate with a single easing. */
export const tween = (
  frame: number,
  range: [number, number],
  out: [number, number],
  ease: EasingFn = EASE.out,
) =>
  interpolate(frame, range, out, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

/** 0 → 1 progress over a frame range. */
export const prog = (frame: number, start: number, dur: number, ease: EasingFn = EASE.out) =>
  tween(frame, [start, start + dur], [0, 1], ease);

/** In, hold, out envelope: 0 → 1 → 0. */
export const envelope = (
  frame: number,
  inStart: number,
  inDur: number,
  outStart: number,
  outDur: number,
  easeIn: EasingFn = EASE.out,
  easeOut: EasingFn = EASE.in,
) => {
  if (frame < outStart) return prog(frame, inStart, inDur, easeIn);
  return 1 - prog(frame, outStart, outDur, easeOut);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Deterministic PRNG (mulberry32). */
export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Stateless hash noise in [0, 1) for an integer key. */
export const hash01 = (n: number) => {
  let t = (n * 0x9e3779b1) >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x85ebca6b) >>> 0;
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35) >>> 0;
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
};
