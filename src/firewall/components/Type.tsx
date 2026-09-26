import React from "react";
import { useCurrentFrame } from "remotion";
import { C, EASE } from "../theme";
import { AEONIK, MONO } from "../fonts";
import { prog, tween } from "../lib/anim";

/**
 * The Appwrite pink underscore that closes every headline.
 * Solid until `blinkFrom`, then blinks at ~1 Hz.
 */
export const Cursor: React.FC<{
  size: number;
  blinkFrom?: number;
  appear?: number;
  color?: string;
  gap?: number;
}> = ({ size, blinkFrom = 0, appear = 0, color = C.pink, gap = 0.06 }) => {
  const frame = useCurrentFrame();
  const visible = frame >= appear;
  const blinkOn = frame < blinkFrom || Math.floor((frame - blinkFrom) / 30) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: size * 0.42,
        height: size * 0.075,
        marginLeft: size * gap,
        background: color,
        borderRadius: size * 0.01,
        verticalAlign: "baseline",
        opacity: visible && blinkOn ? 1 : 0,
        boxShadow: `0 0 ${size * 0.25}px ${color}66`,
      }}
    />
  );
};

/** Characters revealed one by one, like typing. */
export const Typed: React.FC<{
  text: string;
  start: number;
  cps?: number; // characters per frame
  style?: React.CSSProperties;
  cursor?: boolean;
  cursorColor?: string;
}> = ({ text, start, cps = 1, style, cursor = false, cursorColor = C.pink }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - start) * cps)));
  const typing = n < text.length && frame >= start;
  return (
    <span style={{ whiteSpace: "pre", ...style }}>
      {text.slice(0, n)}
      {cursor ? (
        <span
          style={{
            display: "inline-block",
            width: "0.55em",
            height: "0.09em",
            background: cursorColor,
            marginLeft: "0.08em",
            verticalAlign: "baseline",
            opacity:
              frame < start ? (Math.floor(frame / 15) % 2 === 0 ? 1 : 0) : typing || Math.floor((frame - start) / 30) % 2 === 0 ? 1 : 0,
          }}
        />
      ) : null}
    </span>
  );
};

/** Mono, uppercase, wide-tracked label with a pink cursor. */
export const Eyebrow: React.FC<{
  text: string;
  start: number;
  size?: number;
  color?: string;
  exit?: number;
  style?: React.CSSProperties;
}> = ({ text, start, size = 32, color = "#dcdce2", exit, style }) => {
  const frame = useCurrentFrame();
  const out = exit === undefined ? 0 : prog(frame, exit, 16, EASE.in);
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - start) * 1.2)));
  const done = n >= text.length;
  const blinkOn = !done || Math.floor((frame - start) / 30) % 2 === 0;
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        textShadow: "0 2px 14px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.9)",
        whiteSpace: "pre",
        opacity: frame >= start ? 1 - out : 0,
        filter: out > 0 ? `blur(${out * 6}px)` : undefined,
        ...style,
      }}
    >
      {text.slice(0, n)}
      <span style={{ color: C.pink, opacity: blinkOn ? 1 : 0 }}>_</span>
    </div>
  );
};

/**
 * Words rise out of a mask with a short blur, staggered.
 * `exit` sends them up and out.
 */
export const Words: React.FC<{
  text: string;
  start: number;
  stagger?: number;
  dur?: number;
  exit?: number;
  exitDur?: number;
  style?: React.CSSProperties;
  wordStyle?: (i: number, word: string) => React.CSSProperties | undefined;
  after?: React.ReactNode;
  /** RGB-split punch as each word lands. */
  glitch?: boolean;
}> = ({ text, start, stagger = 4, dur = 34, exit, exitDur = 22, style, wordStyle, after, glitch }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div style={{ fontFamily: AEONIK, ...style }}>
      {words.map((w, i) => {
        const s = start + i * stagger;
        const p = prog(frame, s, dur, EASE.out);
        const e = exit === undefined ? 0 : prog(frame, exit + i * (stagger * 0.5), exitDur, EASE.in);
        const y = (1 - p) * 105 - e * 105;
        const blur = (1 - p) * 10 + e * 8;
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: "inline-block",
                overflow: "hidden",
                verticalAlign: "top",
                paddingBottom: "0.12em",
                marginBottom: "-0.12em",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  translate: `0 ${y}%`,
                  filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
                  opacity: tween(frame, [s, s + dur * 0.6], [0, 1]) * (1 - e),
                  textShadow: (() => {
                    if (!glitch) return undefined;
                    const g = Math.max(0, 1 - Math.abs(frame - s - 3) / 6);
                    if (g <= 0.01) return undefined;
                    const dx = 12 * g;
                    return `${-dx}px 0 rgba(255,40,90,${0.8 * g}), ${dx}px 0 rgba(40,210,255,${0.65 * g})`;
                  })(),
                  ...wordStyle?.(i, w),
                }}
              >
                {w}
                {i === words.length - 1 ? after : null}
              </span>
            </span>
            {i < words.length - 1 ? " " : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};
