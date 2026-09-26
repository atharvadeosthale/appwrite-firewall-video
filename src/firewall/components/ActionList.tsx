import React from "react";
import { C, EASE, rgba } from "../theme";
import { AEONIK, INTER, MONO } from "../fonts";
import { clamp01, lerp } from "../lib/anim";
import { menuGeometry, ACTION_ITEMS } from "../scenes/s3layout";

export const ACTION_COPY = [
  { desc: "Reject matching requests before they reach your project.", outcome: "403 Forbidden" },
  { desc: "Let trusted traffic through and skip every later rule.", outcome: "Skips later rules" },
  { desc: "Make visitors prove they are human before they continue.", outcome: "Proof of work" },
  { desc: "Throttle clients that go over a quota, per IP or per user.", outcome: "429 Too Many Requests" },
  { desc: "Send matching clients somewhere else with a 3xx status.", outcome: "302 Found" },
];

const LIST_X = 124;
const ACTIVE_FONT = 104;
const INACTIVE_FONT = 40;
const ACTIVE_DOT = 22;
const INACTIVE_DOT = 12;
const DESC_H = 150;

/** Accordion layout of the action list for a fractional active index. */
const listLayout = (active: number) => {
  const amt = ACTION_ITEMS.map((_, i) => clamp01(1 - Math.abs(active - i)));
  const size = amt.map((a) => lerp(INACTIVE_FONT, ACTIVE_FONT, EASE.inOut(a)));
  const heights = size.map((s, i) => s * 1.22 + DESC_H * EASE.inOut(amt[i]));
  const total = heights.reduce((a, b) => a + b, 0);
  let y = 548 - total / 2;
  return ACTION_ITEMS.map((_, i) => {
    const top = y;
    y += heights[i];
    return { top, size: size[i], amt: amt[i] };
  });
};

/**
 * The five Firewall actions. At morph 0 it sits exactly where the console's
 * action dropdown was in the rule builder; at morph 1 it is the chapter list.
 */
export const ActionList: React.FC<{
  morph: number;
  /** Morph value one frame earlier, for motion blur. */
  morphPrev?: number;
  active: number;
  menuHighlight?: number;
  surface: number;
}> = ({ morph, morphPrev, active, menuHighlight = -1, surface }) => {
  const g = menuGeometry();
  const layout = listLayout(active);
  // Screen position of item i at a given morph value (for velocity).
  const posAt = (i: number, mv: number) => {
    const m = EASE.inOut(clamp01(mv * 1.35 - i * 0.07));
    const L = layout[i];
    return {
      x: lerp(g.items[i].textX, LIST_X + lerp(INACTIVE_DOT, ACTIVE_DOT, L.amt) + lerp(18, 30, L.amt), m),
      y: lerp(g.items[i].cy, L.top + (L.size * 1.22) / 2, m),
    };
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {surface > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: g.left,
            top: g.top,
            width: g.width,
            height: g.height,
            borderRadius: 8 * g.z,
            background: C.card,
            border: `${g.z}px solid ${C.border}`,
            boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
            opacity: surface,
          }}
        />
      ) : null}
      {menuHighlight >= 0 && surface > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: g.left + 5 * g.z,
            top: g.items[menuHighlight].rowTop,
            width: (320 - 10) * g.z,
            height: 32 * g.z,
            borderRadius: 6 * g.z,
            background: C.input,
            opacity: surface,
          }}
        />
      ) : null}

      {ACTION_ITEMS.map((item, i) => {
        // Items leave the menu in a short cascade.
        const m = EASE.inOut(clamp01(morph * 1.35 - i * 0.07));
        const L = layout[i];
        const dotSize = lerp(g.dot, lerp(INACTIVE_DOT, ACTIVE_DOT, EASE.inOut(L.amt)), m);
        const fontSize = lerp(g.fontSize, L.size, m);
        const lineH = fontSize * 1.22;
        const cy = lerp(g.items[i].cy, L.top + (L.size * 1.22) / 2, m);
        const dotX = lerp(g.items[i].dotX, LIST_X, m);
        const textX = lerp(g.items[i].textX, LIST_X + lerp(INACTIVE_DOT, ACTIVE_DOT, L.amt) + lerp(18, 30, L.amt), m);
        const color = m < 0.001 ? C.fg : lerp(0, 1, L.amt) > 0.5 ? C.fg : C.fg;
        const inactiveDim = lerp(1, lerp(0.34, 1, EASE.inOut(L.amt)), m);
        const glow = L.amt * m;
        const fontSwap = clamp01((m - 0.1) / 0.35);
        const descIn = EASE.out(clamp01((L.amt - 0.45) / 0.55)) * clamp01((m - 0.8) / 0.2);
        const p1 = posAt(i, morph);
        const p0 = morphPrev === undefined ? p1 : posAt(i, morphPrev);
        const vx = Math.abs(p1.x - p0.x) * 0.3;
        const vy = Math.abs(p1.y - p0.y) * 0.3;
        const blurId = `al-mb-${i}`;
        const blurOn = vx + vy > 0.6;
        return (
          <React.Fragment key={item.label}>
            {blurOn ? (
              <svg width={0} height={0} style={{ position: "absolute" }}>
                <filter id={blurId} x="-30%" y="-60%" width="160%" height="220%">
                  <feGaussianBlur stdDeviation={`${Math.min(18, vx).toFixed(2)} ${Math.min(18, vy).toFixed(2)}`} />
                </filter>
              </svg>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: dotX + (lerp(INACTIVE_DOT, ACTIVE_DOT, L.amt) - dotSize) / 2 * m,
                top: cy - dotSize / 2,
                width: dotSize,
                height: dotSize,
                borderRadius: 999,
                background: item.color,
                opacity: lerp(1, lerp(0.55, 1, L.amt), m),
                filter: blurOn ? `url(#${blurId})` : undefined,
                boxShadow: glow > 0.01 ? `0 0 ${28 * glow}px ${rgba(item.color, 0.9 * glow)}, 0 0 ${70 * glow}px ${rgba(item.color, 0.45 * glow)}` : undefined,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: textX,
                top: cy - lineH / 2,
                height: lineH,
                lineHeight: `${lineH}px`,
                fontSize,
                whiteSpace: "nowrap",
                color,
                opacity: inactiveDim,
                filter: blurOn ? `url(#${blurId})` : undefined,
              }}
            >
              <span style={{ position: "absolute", left: 0, top: 0, fontFamily: INTER, opacity: 1 - fontSwap }}>
                {item.label}
              </span>
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  fontFamily: AEONIK,
                  fontWeight: 400,
                  letterSpacing: `${lerp(0, -0.045, fontSwap)}em`,
                  opacity: fontSwap,
                }}
              >
                {item.label}
              </span>
            </div>
            {descIn > 0.001 ? (
              <div
                style={{
                  position: "absolute",
                  left: LIST_X + ACTIVE_DOT + 30,
                  top: L.top + L.size * 1.22 + 6,
                  width: 560,
                  opacity: descIn,
                  translate: `0 ${(1 - descIn) * 14}px`,
                }}
              >
                <div style={{ fontFamily: AEONIK, fontSize: 30, lineHeight: 1.32, color: C.muted }}>
                  {ACTION_COPY[i].desc}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    marginTop: 18,
                    padding: "6px 14px",
                    borderRadius: 10,
                    background: rgba(item.color, 0.12),
                    color: [C.denyText, C.bypassText, C.challengeText, C.rateLimitText, C.redirectText][i],
                    fontFamily: MONO,
                    fontSize: 20,
                    fontWeight: 500,
                  }}
                >
                  {ACTION_COPY[i].outcome}
                </div>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};
