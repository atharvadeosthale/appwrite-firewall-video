import { Easing } from "remotion";

// Tokens from the Appwrite console dark theme (vibes/src/styles.css) and the
// Firewall action palette (vibes/src/lib/firewall/actions.ts).
export const C = {
  ink: "#0b0b0e",
  bg: "#19191c",
  card: "#1d1d21",
  sidebar: "#141416",
  input: "#2d2d31",
  border: "#2a2a2e",
  hairline: "#222224",
  fg: "#fafafa",
  text: "#ededf0",
  muted: "#9f9fa9",
  faint: "#6c6c75",
  dim: "#46464d",
  pink: "#fd366e",
  pinkHot: "#ff5a8a",
  indigo: "#7c67fe",

  deny: "#ef4444",
  denyText: "#f87171",
  bypass: "#3b82f6",
  bypassText: "#60a5fa",
  challenge: "#8b5cf6",
  challengeText: "#a78bfa",
  rateLimit: "#f59e0b",
  rateLimitText: "#fbbf24",
  redirect: "#64748b",
  redirectText: "#94a3b8",
  passed: "#10b981",
  passedText: "#34d399",
} as const;

export type ActionId = "deny" | "bypass" | "challenge" | "rateLimit" | "redirect";

export const ACTIONS: Record<
  ActionId,
  { label: string; color: string; text: string; outcome: string }
> = {
  deny: { label: "Deny", color: C.deny, text: C.denyText, outcome: "403" },
  bypass: { label: "Bypass", color: C.bypass, text: C.bypassText, outcome: "Continue" },
  challenge: { label: "Challenge", color: C.challenge, text: C.challengeText, outcome: "Challenge" },
  rateLimit: { label: "Rate limit", color: C.rateLimit, text: C.rateLimitText, outcome: "429" },
  redirect: { label: "Redirect", color: C.redirect, text: C.redirectText, outcome: "3xx" },
};

export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  outSoft: Easing.bezier(0.25, 1, 0.5, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  snap: Easing.bezier(0.85, 0, 0.15, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  linear: Easing.linear,
};

export const FPS = 60;
export const W = 1920;
export const H = 1080;

/** Hex color to rgba() with alpha. */
export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
