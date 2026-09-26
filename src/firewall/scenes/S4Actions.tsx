import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { getLength, getPointAtLength } from "@remotion/paths";
import { C, EASE, rgba } from "../theme";
import { AEONIK, INTER, MONO } from "../fonts";
import { clamp01, hash01, lerp, prog, tween } from "../lib/anim";
import { ActionList } from "../components/ActionList";
import { DotGrid, Glows } from "../components/Atmosphere";
import { HANDOFF_DUR, HANDOFF_START } from "./s3layout";

export const S4_DURATION = 744;
const FIRST = 24;
const PER = 144;

const COLORS = [C.deny, C.bypass, C.challenge, C.rateLimit, C.redirect];

// Stage geometry (stage-local px). The stage sits at STAGE_X/STAGE_Y on screen.
const STAGE_X = 790;
const STAGE_Y = 118;
const STAGE_Z = 1.1;
const CY = 440;
const PILL = { x: 20, w: 380, h: 68 };
const WALL = { x: 540, w: 66, rows: 9, brickH: 38, gap: 7 };
const WALL_H = WALL.rows * (WALL.brickH + WALL.gap) - WALL.gap;
const WALL_TOP = CY - WALL_H / 2;
const PROJ = { x: 772, w: 228, h: 124 };
const LINE_A = { x0: PILL.x + PILL.w, x1: WALL.x };
const LINE_B = { x0: WALL.x + WALL.w, x1: PROJ.x };

type Vignette = {
  method: string;
  path: string;
  from?: string;
  rule: Array<{ k: string; v?: string; code?: boolean }>;
};

const VIGNETTES: Vignette[] = [
  {
    method: "GET",
    path: "/wp-login.php",
    from: "45.83.64.12",
    rule: [{ k: "Path" }, { k: "Starts with", v: "badge" }, { k: "/wp-", code: true }],
  },
  {
    method: "POST",
    path: "/webhooks/stripe",
    from: "203.0.113.10",
    rule: [{ k: "IP address" }, { k: "Equals", v: "badge" }, { k: "203.0.113.10", code: true }],
  },
  {
    method: "GET",
    path: "/signup",
    from: "Browser",
    rule: [{ k: "Path" }, { k: "Starts with", v: "badge" }, { k: "/signup", code: true }],
  },
  {
    method: "POST",
    path: "/v1/account/sessions",
    from: "198.51.100.7",
    rule: [{ k: "Path" }, { k: "Starts with", v: "badge" }, { k: "/v1/account/sessions", code: true }],
  },
  {
    method: "GET",
    path: "/pricing-2023",
    from: "Browser",
    rule: [{ k: "Path" }, { k: "Equals", v: "badge" }, { k: "/pricing-2023", code: true }],
  },
];

const RULE_ACTION = ["Deny", "Bypass", "Challenge", "Rate limit · 10/60s", "Redirect · 302"];

/** A glowing request packet with a short trail. */
const Packet: React.FC<{ x: number; y: number; color: string; alpha?: number; r?: number; tx?: number; ty?: number }> = ({
  x,
  y,
  color,
  alpha = 1,
  r = 9,
  tx,
  ty,
}) => (
  <g opacity={alpha}>
    {tx !== undefined && ty !== undefined ? (
      <line x1={tx} y1={ty} x2={x} y2={y} stroke={color} strokeWidth={4} strokeLinecap="round" opacity={0.45} />
    ) : null}
    <circle cx={x} cy={y} r={r * 3.2} fill={`url(#glow-${color.slice(1)})`} />
    <circle cx={x} cy={y} r={r} fill={color} />
    <circle cx={x} cy={y} r={r * 0.45} fill="#fff" opacity={0.85} />
  </g>
);

const GlowDefs: React.FC = () => (
  <defs>
    {[...COLORS, C.pink, C.passed].map((c) => (
      <radialGradient key={c} id={`glow-${c.slice(1)}`}>
        <stop offset="0%" stopColor={c} stopOpacity={0.55} />
        <stop offset="100%" stopColor={c} stopOpacity={0} />
      </radialGradient>
    ))}
    <linearGradient id="brick-fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stopColor={C.pink} stopOpacity={0.05} />
      <stop offset="100%" stopColor={C.pink} stopOpacity={0.22} />
    </linearGradient>
  </defs>
);

/** Packet position travelling pill → wall along the center line. */
const travelA = (a: number, start: number, dur: number) => {
  const t = clamp01((a - start) / dur);
  return { x: lerp(LINE_A.x0 + 6, LINE_A.x1 - 12, EASE.in(t) * 0.35 + t * 0.65), t };
};
const travelB = (a: number, start: number, dur: number) => {
  const t = clamp01((a - start) / dur);
  return { x: lerp(LINE_B.x0 + 8, LINE_B.x1 - 4, EASE.out(t)), t };
};

// ---------------------------------------------------------------- vignettes

const DenyFx: React.FC<{ a: number }> = ({ a }) => {
  const shots = [24, 72, 96];
  return (
    <g>
      {shots.map((s, k) => {
        const hit = s + 24;
        const { x } = travelA(a, s, 24);
        const alive = a >= s && a < hit;
        const since = a - hit;
        const main = k === 0;
        return (
          <g key={k}>
            {alive ? <Packet x={x} y={CY} tx={x - 60} ty={CY} color={C.deny} r={main ? 10 : 8} /> : null}
            {since >= 0 && since < 44
              ? Array.from({ length: 11 }, (_, j) => {
                  const ang = Math.PI * (0.55 + hash01(k * 31 + j) * 0.9);
                  const sp = 3 + hash01(k * 17 + j * 3) * 5;
                  const px = WALL.x - 6 + Math.cos(ang) * sp * since;
                  const py = CY - Math.sin(ang) * sp * since + 0.22 * since * since;
                  const al = 1 - since / 44;
                  return (
                    <rect
                      key={j}
                      x={px - 3}
                      y={py - 3}
                      width={6}
                      height={6}
                      rx={1.5}
                      fill={C.denyText}
                      opacity={al}
                      transform={`rotate(${since * 12 + j * 40} ${px} ${py})`}
                    />
                  );
                })
              : null}
            {since >= 0 && since < 26 ? (
              <circle
                cx={WALL.x - 4}
                cy={CY}
                r={12 + EASE.out(since / 26) * (main ? 90 : 60)}
                fill="none"
                stroke={C.denyText}
                strokeWidth={main ? 3 : 2}
                opacity={(1 - since / 26) * (main ? 0.9 : 0.6)}
              />
            ) : null}
            {since >= 0 ? (
              <g
                transform={`translate(${WALL.x - 4} ${CY}) scale(${
                  main ? lerp(0.5, 1.6, EASE.back(clamp01(since / 12))) : lerp(0.6, 1.1, EASE.back(clamp01(since / 10)))
                })`}
                opacity={main ? 1 - prog(a, 120, 16) : Math.max(0, 1 - since / 26)}
              >
                <circle r={34} fill={`url(#glow-${C.deny.slice(1)})`} />
                <path d="M -13 -13 L 13 13 M 13 -13 L -13 13" stroke={C.denyText} strokeWidth={6} strokeLinecap="round" />
              </g>
            ) : null}
          </g>
        );
      })}
      {a >= 48 ? (
        <g opacity={prog(a, 48, 10) * (1 - prog(a, 128, 14))}>
          <text x={WALL.x + WALL.w + 34} y={CY - 58} fill={C.denyText} fontFamily={MONO} fontSize={40} fontWeight={600}>
            403
          </text>
          <text x={WALL.x + WALL.w + 36} y={CY - 26} fill={rgba(C.denyText, 0.7)} fontFamily={INTER} fontSize={18}>
            Forbidden
          </text>
        </g>
      ) : null}
    </g>
  );
};

const BYPASS_ARC = `M ${LINE_A.x0 + 10} ${CY} C ${LINE_A.x0 + 100} ${CY} ${WALL.x - 80} ${WALL_TOP - 104} ${WALL.x + WALL.w / 2} ${WALL_TOP - 104} C ${WALL.x + WALL.w + 110} ${WALL_TOP - 104} ${PROJ.x - 70} ${CY - 40} ${PROJ.x} ${CY - 40}`;
const BYPASS_LEN = getLength(BYPASS_ARC);

const BypassFx: React.FC<{ a: number }> = ({ a }) => {
  const draw = prog(a, 18, 50, EASE.inOut);
  const t = prog(a, 22, 50, EASE.inOut);
  const p = getPointAtLength(BYPASS_ARC, BYPASS_LEN * t) ?? { x: 0, y: 0 };
  const pt = getPointAtLength(BYPASS_ARC, Math.max(0, BYPASS_LEN * t - 60)) ?? p;
  const arrived = a >= 72;
  return (
    <g>
      <defs>
        <mask id="bypass-reveal">
          <path
            d={BYPASS_ARC}
            stroke="#fff"
            strokeWidth={12}
            fill="none"
            strokeDasharray={BYPASS_LEN}
            strokeDashoffset={BYPASS_LEN * (1 - draw)}
          />
        </mask>
      </defs>
      <path
        d={BYPASS_ARC}
        stroke={C.bypassText}
        strokeWidth={3}
        fill="none"
        strokeDasharray="9 10"
        mask="url(#bypass-reveal)"
        opacity={1 - prog(a, 128, 14)}
      />
      <text
        x={WALL.x + WALL.w / 2}
        y={WALL_TOP - 128}
        textAnchor="middle"
        fill={C.bypassText}
        fontFamily={MONO}
        fontSize={20}
        fontWeight={600}
        letterSpacing="0.3em"
        opacity={prog(a, 38, 14) * (1 - prog(a, 128, 14))}
      >
        BYPASS
      </text>
      {a >= 22 && !arrived ? <Packet x={p.x} y={p.y} tx={pt.x} ty={pt.y} color={C.bypass} r={10} /> : null}
    </g>
  );
};

const ChallengeFx: React.FC<{ a: number }> = ({ a }) => {
  const { x } = travelA(a, 24, 24);
  const waiting = a >= 48 && a < 100;
  const pass = travelB(a, 100, 24);
  const solved = a >= 96;
  const cardIn = prog(a, 46, 14, EASE.out) * (1 - prog(a, 126, 16));
  const spin = (a - 46) * 14;
  const hex = "0123456789abcdef";
  const scramble = Array.from({ length: 10 }, (_, j) => hex[Math.floor(hash01(Math.floor(a / 2) * 13 + j) * 16)]).join("");
  const nonce = 48213 + Math.floor(Math.max(0, a - 48) * 997);
  const cardX = WALL.x + WALL.w + 30;
  const cardY = WALL_TOP - 70;
  return (
    <g>
      {a >= 24 && a < 48 ? <Packet x={x} y={CY} tx={x - 60} ty={CY} color={C.challenge} r={10} /> : null}
      {waiting ? (
        <Packet x={WALL.x - 14} y={CY} color={C.challenge} r={10 + Math.sin(a / 3) * 1.5} />
      ) : null}
      {a >= 100 && pass.t < 1 ? <Packet x={pass.x} y={CY} tx={pass.x - 60} ty={CY} color={C.challenge} r={10} /> : null}
      {cardIn > 0.001 ? (
        <g opacity={cardIn} transform={`translate(0 ${(1 - cardIn) * 14})`}>
          <path
            d={`M ${WALL.x + WALL.w + 4} ${CY} C ${WALL.x + WALL.w + 40} ${CY} ${cardX - 30} ${cardY + 64} ${cardX} ${cardY + 64}`}
            stroke={rgba(C.challengeText, 0.55)}
            strokeWidth={2}
            strokeDasharray="4 5"
            fill="none"
          />
          <rect x={cardX} y={cardY} width={340} height={128} rx={16} fill={C.card} stroke={C.border} strokeWidth={1.5} />
          <g transform={`translate(${cardX + 44} ${cardY + 48})`}>
            {solved ? (
              <g transform={`scale(${lerp(0.6, 1, EASE.back(prog(a, 96, 12)))})`}>
                <circle r={18} fill={rgba(C.challenge, 0.2)} stroke={C.challengeText} strokeWidth={2.5} />
                <path d="M -7 0 L -2 5 L 8 -6" stroke={C.challengeText} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ) : (
              <g>
                <circle r={17} fill="none" stroke="#3a3a40" strokeWidth={3.5} />
                <path
                  d="M 0 -17 A 17 17 0 0 1 16.2 -5.3"
                  stroke={C.pink}
                  strokeWidth={3.5}
                  fill="none"
                  strokeLinecap="round"
                  transform={`rotate(${spin})`}
                />
              </g>
            )}
          </g>
          <text x={cardX + 78} y={cardY + 44} fill={C.fg} fontFamily={INTER} fontSize={19} fontWeight={500}>
            {solved ? "Verified in 38 ms" : "Checking your browser…"}
          </text>
          <text x={cardX + 78} y={cardY + 70} fill={C.muted} fontFamily={MONO} fontSize={14}>
            {solved ? "difficulty 3 · cleared for 30 min" : `nonce ${nonce}`}
          </text>
          <text x={cardX + 28} y={cardY + 106} fill={solved ? C.challengeText : C.faint} fontFamily={MONO} fontSize={14}>
            {solved ? "sha256 0000c41e9a…  ✓" : `sha256 ${scramble}…`}
          </text>
        </g>
      ) : null}
    </g>
  );
};

const RateFx: React.FC<{ a: number }> = ({ a }) => {
  const N = 13;
  const LIMIT = 10;
  const shots = Array.from({ length: N }, (_, k) => 8 + k * 6);
  const filled = shots.filter((s, k) => k < LIMIT && a >= s + 16).length;
  const meterX = WALL.x + WALL.w / 2 - (LIMIT * 16 - 5) / 2;
  const meterY = WALL_TOP - 74;
  const meterIn = prog(a, 6, 14) * (1 - prog(a, 128, 14));
  const over = a >= shots[LIMIT] + 16;
  return (
    <g>
      <g opacity={meterIn}>
        <text x={meterX} y={meterY - 16} fill={C.rateLimitText} fontFamily={MONO} fontSize={18} fontWeight={500}>
          {`${Math.min(filled, LIMIT)} / 10 per 60s`}
        </text>
        {Array.from({ length: LIMIT }, (_, k) => (
          <rect
            key={k}
            x={meterX + k * 16}
            y={meterY}
            width={11}
            height={30}
            rx={3}
            fill={k < filled ? C.rateLimit : "#2d2d31"}
            opacity={k < filled ? 1 : 0.9}
          />
        ))}
      </g>
      {shots.map((s, k) => {
        const inA = travelA(a, s, 16);
        const allowed = k < LIMIT;
        const els: React.ReactNode[] = [];
        if (a >= s && inA.t < 1) {
          els.push(<Packet key="a" x={inA.x} y={CY} tx={inA.x - 40} ty={CY} color={C.rateLimit} r={8} />);
        } else if (a >= s + 16) {
          if (allowed) {
            const b = travelB(a, s + 16, 16);
            if (b.t < 1) els.push(<Packet key="b" x={b.x} y={CY} tx={b.x - 40} ty={CY} color={C.rateLimit} r={8} />);
          } else {
            const since = a - (s + 16);
            if (since < 30) {
              const bx = WALL.x - 12 - EASE.out(since / 30) * 150;
              const by = CY + (k - 11) * 34 * EASE.out(since / 30);
              els.push(<Packet key="c" x={bx} y={by} color={C.deny} r={8} alpha={1 - since / 30} />);
            }
          }
        }
        return <g key={k}>{els}</g>;
      })}
      {over ? (
        <g opacity={prog(a, shots[LIMIT] + 16, 10) * (1 - prog(a, 128, 14))}>
          <text x={(LINE_B.x0 + LINE_B.x1) / 2} y={CY - 58} textAnchor="middle" fill={C.rateLimitText} fontFamily={MONO} fontSize={40} fontWeight={600}>
            429
          </text>
          <text x={(LINE_B.x0 + LINE_B.x1) / 2} y={CY - 26} textAnchor="middle" fill={rgba(C.rateLimitText, 0.7)} fontFamily={INTER} fontSize={15}>
            Retry-After: 42s
          </text>
        </g>
      ) : null}
    </g>
  );
};

const REDIRECT_BOX = { x: PROJ.x, y: CY + 150, w: PROJ.w, h: 86 };
const REDIRECT_PATH = `M ${LINE_B.x0 + 4} ${CY} C ${LINE_B.x0 + 110} ${CY} ${REDIRECT_BOX.x - 100} ${REDIRECT_BOX.y + REDIRECT_BOX.h / 2} ${REDIRECT_BOX.x} ${REDIRECT_BOX.y + REDIRECT_BOX.h / 2}`;
const REDIRECT_LEN = getLength(REDIRECT_PATH);

const RedirectFx: React.FC<{ a: number }> = ({ a }) => {
  const { x } = travelA(a, 24, 24);
  const draw = prog(a, 46, 30, EASE.inOut);
  const t = prog(a, 48, 36, EASE.inOut);
  const p = getPointAtLength(REDIRECT_PATH, REDIRECT_LEN * t) ?? { x: 0, y: 0 };
  const pt = getPointAtLength(REDIRECT_PATH, Math.max(0, REDIRECT_LEN * t - 50)) ?? p;
  const boxIn = prog(a, 26, 16, EASE.out) * (1 - prog(a, 128, 14));
  const land = prog(a, 84, 8) * (1 - prog(a, 104, 30));
  return (
    <g>
      <g opacity={boxIn} transform={`translate(0 ${(1 - boxIn) * 16})`}>
        <rect
          x={REDIRECT_BOX.x}
          y={REDIRECT_BOX.y}
          width={REDIRECT_BOX.w}
          height={REDIRECT_BOX.h}
          rx={16}
          fill={C.card}
          stroke={land > 0.01 ? C.redirectText : C.border}
          strokeWidth={1.5 + land * 1.5}
        />
        <text
          x={REDIRECT_BOX.x + REDIRECT_BOX.w / 2}
          y={REDIRECT_BOX.y + REDIRECT_BOX.h / 2 + 8}
          textAnchor="middle"
          fill={C.fg}
          fontFamily={MONO}
          fontSize={22}
        >
          /pricing
        </text>
      </g>
      <path
        d={REDIRECT_PATH}
        stroke={C.redirectText}
        strokeWidth={3}
        fill="none"
        strokeDasharray={REDIRECT_LEN}
        strokeDashoffset={REDIRECT_LEN * (1 - draw)}
        opacity={1 - prog(a, 128, 14)}
      />
      <text
        x={LINE_B.x0 + 58}
        y={CY + 108}
        fill={C.redirectText}
        fontFamily={MONO}
        fontSize={24}
        fontWeight={600}
        opacity={prog(a, 58, 12) * (1 - prog(a, 128, 14))}
      >
        302
      </text>
      {a >= 24 && a < 48 ? <Packet x={x} y={CY} tx={x - 60} ty={CY} color={C.redirectText} r={10} /> : null}
      {a >= 48 && t < 1 ? <Packet x={p.x} y={p.y} tx={pt.x} ty={pt.y} color={C.redirectText} r={10} /> : null}
    </g>
  );
};

// ---------------------------------------------------------------- stage

const Stage: React.FC<{ frame: number }> = ({ frame }) => {
  const idx = Math.max(0, Math.min(4, Math.floor((frame - FIRST) / PER)));
  const a = frame - (FIRST + idx * PER);
  const stageIn = prog(frame, 6, 40, EASE.out);
  const color = COLORS[idx];
  const v = VIGNETTES[idx];

  // Which element lights up per action.
  const gateHit =
    idx === 0
      ? Math.max(...[48, 96, 120].map((h) => prog(a, h, 3) * (1 - prog(a, h + 3, 22))))
      : idx === 2
        ? prog(a, 48, 6) * (1 - prog(a, 100, 20)) * (0.6 + 0.4 * Math.sin(a / 3))
        : idx === 3
          ? Math.max(0, ...[84, 90, 96].map((h) => prog(a, h, 3) * (1 - prog(a, h + 3, 14))))
          : 0;
  const lineAOn = idx === 1 ? 0 : prog(a, 24, 20) * (1 - prog(a, 128, 14));
  const lineBOn =
    idx === 2 ? prog(a, 100, 20) * (1 - prog(a, 128, 14)) : idx === 3 ? prog(a, 26, 14) * (1 - prog(a, 128, 14)) : 0;
  const projGlow =
    idx === 1
      ? prog(a, 70, 6) * (1 - prog(a, 104, 36))
      : idx === 2
        ? prog(a, 122, 6) * (1 - prog(a, 136, 10))
        : idx === 3
          ? prog(a, 40, 6) * (1 - prog(a, 112, 20))
          : 0;
  const swap = (k: number) => prog(a, k, 9, EASE.out) * (idx === 4 ? 1 : 1 - prog(a, PER - 9, 9, EASE.in));

  return (
    <div
      style={{
        position: "absolute",
        left: STAGE_X,
        top: STAGE_Y,
        opacity: stageIn,
        translate: `${(1 - stageIn) * 60}px 0`,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 1060,
          height: 800,
          zoom: STAGE_Z,
          scale: `${1 + 0.035 * (frame / S4_DURATION)}`,
          translate: `${-24 * (frame / S4_DURATION)}px ${Math.sin(frame / 120) * 4}px`,
          transformOrigin: "40% 55%",
        }}
      >
      {/* Rule summary */}
      <div
        style={{
          position: "absolute",
          left: PILL.x,
          top: 8,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 18px",
          borderRadius: 14,
          background: rgba(C.card, 0.9),
          border: `1px solid ${C.border}`,
          fontFamily: INTER,
          fontSize: 20,
          color: C.fg,
          opacity: swap(0),
          translate: `0 ${(1 - swap(0)) * 10}px`,
        }}
      >
        <span style={{ color: C.muted, fontWeight: 600 }}>If</span>
        <span>{v.rule[0].k}</span>
        <span style={{ padding: "3px 10px", borderRadius: 8, background: C.input, color: C.muted, fontSize: 16 }}>
          {v.rule[1].k}
        </span>
        <span
          style={{
            padding: "3px 10px",
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            background: rgba(C.input, 0.35),
            fontFamily: MONO,
            fontSize: 18,
          }}
        >
          {v.rule[2].k}
        </span>
        <span style={{ color: C.muted, fontWeight: 600, marginLeft: 8 }}>Then</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: color, boxShadow: `0 0 10px ${color}` }} />
          {RULE_ACTION[idx]}
        </span>
      </div>

      <svg width={1100} height={800} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <GlowDefs />
        {/* Lines */}
        <line x1={LINE_A.x0} y1={CY} x2={LINE_A.x1} y2={CY} stroke="#34343a" strokeWidth={3} />
        <line x1={LINE_A.x0} y1={CY} x2={LINE_A.x1} y2={CY} stroke={color} strokeWidth={3} opacity={lineAOn * 0.9} />
        <line x1={LINE_B.x0} y1={CY} x2={LINE_B.x1} y2={CY} stroke="#34343a" strokeWidth={3} />
        <line x1={LINE_B.x0} y1={CY} x2={LINE_B.x1} y2={CY} stroke={color} strokeWidth={3} opacity={lineBOn * 0.9} />
        <circle cx={LINE_B.x1} cy={CY} r={6} fill={lineBOn > 0.1 ? color : "#46464d"} />

        {/* Wall */}
        {Array.from({ length: WALL.rows }, (_, r) => {
          const y = WALL_TOP + r * (WALL.brickH + WALL.gap);
          const gate = r === Math.floor(WALL.rows / 2);
          const lit = gate ? gateHit : 0;
          const stroke = lit > 0.02 ? color : C.pink;
          return (
            <g key={r}>
              <rect
                x={WALL.x}
                y={y}
                width={WALL.w}
                height={WALL.brickH}
                rx={8}
                fill={lit > 0.02 ? rgba(color, 0.18 + 0.4 * lit) : "url(#brick-fill)"}
                stroke={stroke}
                strokeOpacity={0.35 + 0.25 * (r / WALL.rows) + lit * 0.6}
                strokeWidth={2}
              />
            </g>
          );
        })}
        <rect x={WALL.x - 30} y={CY - 60} width={WALL.w + 60} height={120} fill={`url(#glow-${color.slice(1)})`} opacity={gateHit * 0.9} />

        {/* Project box */}
        <rect
          x={PROJ.x}
          y={CY - PROJ.h / 2}
          width={PROJ.w}
          height={PROJ.h}
          rx={20}
          fill={C.card}
          stroke={projGlow > 0.02 ? color : C.border}
          strokeWidth={1.5 + projGlow * 1.5}
        />
        <rect
          x={PROJ.x - 40}
          y={CY - PROJ.h / 2 - 40}
          width={PROJ.w + 80}
          height={PROJ.h + 80}
          rx={40}
          fill={`url(#glow-${color.slice(1)})`}
          opacity={projGlow * 0.7}
        />
        <g transform={`translate(${PROJ.x + PROJ.w / 2 - 12} ${CY - 34}) scale(1)`}>
          <path
            d="M24.4429 16.4322V21.9096H10.7519C6.76318 21.9096 3.28044 19.7067 1.4171 16.4322C1.14622 15.9561 0.909137 15.4567 0.710264 14.9383C0.319864 13.9225 0.0744552 12.8325 0 11.6952V10.2143C0.0161646 9.96089 0.0416361 9.70942 0.0749451 9.46095C0.143032 8.95105 0.245898 8.45211 0.381093 7.96711C1.66006 3.36909 5.81877 0 10.7519 0C15.6851 0 19.8433 3.36909 21.1223 7.96711H15.2682C14.3072 6.4683 12.6437 5.4774 10.7519 5.4774C8.86017 5.4774 7.19668 6.4683 6.23562 7.96711C5.9427 8.42274 5.71542 8.92516 5.56651 9.46095C5.43425 9.93599 5.36371 10.4369 5.36371 10.9548C5.36371 12.5248 6.01324 13.94 7.05463 14.9383C8.01961 15.865 9.32061 16.4322 10.7519 16.4322H24.4429Z"
            fill={C.pink}
          />
          <path
            d="M24.4429 9.46094V14.9383H14.4492C15.4906 13.94 16.1401 12.5248 16.1401 10.9548C16.1401 10.4369 16.0696 9.93598 15.9373 9.46094H24.4429Z"
            fill={C.pink}
          />
        </g>
        <text x={PROJ.x + PROJ.w / 2} y={CY + 32} textAnchor="middle" fill={C.fg} fontFamily={AEONIK} fontSize={25}>
          Your project
        </text>

        {/* Action effects */}
        <g opacity={swap(0)}>
          {idx === 0 ? <DenyFx a={a} /> : null}
          {idx === 1 ? <BypassFx a={a} /> : null}
          {idx === 2 ? <ChallengeFx a={a} /> : null}
          {idx === 3 ? <RateFx a={a} /> : null}
          {idx === 4 ? <RedirectFx a={a} /> : null}
        </g>
      </svg>

      {/* Request pill */}
      <div
        style={{
          position: "absolute",
          left: PILL.x,
          top: CY - PILL.h / 2,
          width: PILL.w,
          height: PILL.h,
          borderRadius: 16,
          background: rgba(C.card, 0.95),
          border: `1.5px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 22px",
          boxSizing: "border-box",
          fontFamily: MONO,
          fontSize: 23,
          overflow: "hidden",
        }}
      >
        <div style={{ opacity: swap(0), translate: `0 ${(1 - swap(0)) * 24}px`, whiteSpace: "nowrap" }}>
          <span style={{ color: C.muted }}>{v.method}</span>
          <span style={{ color: C.fg }}>{` ${v.path}`}</span>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: PILL.x + 4,
          top: CY + PILL.h / 2 + 14,
          fontFamily: MONO,
          fontSize: 17,
          color: C.faint,
          opacity: swap(4),
        }}
      >
        {`from ${v.from}`}
      </div>
      </div>
    </div>
  );
};

export const S4Actions: React.FC = () => {
  const frame = useCurrentFrame();
  // Continue the morph S3 started; S3 is 432 frames long.
  const s3Frame = 432 + frame;
  const morph = prog(s3Frame, HANDOFF_START, HANDOFF_DUR, EASE.linear);
  let active = 0;
  for (let i = 0; i < 4; i++) {
    active += prog(frame, FIRST + i * PER + PER - 14, 26, EASE.inOut);
  }
  const idx = Math.max(0, Math.min(4, Math.floor((frame - FIRST) / PER)));
  const tint = COLORS[idx];

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, overflow: "hidden" }}>
      <Glows
        glows={[
          { x: 90, y: -10, r: 950, color: rgba(C.indigo, 0.2), opacity: 1 },
          { x: 2, y: 106, r: 900, color: rgba(C.pink, 0.18), opacity: 1 },
          { x: 68, y: 56, r: 640, color: rgba(tint, 0.12), opacity: tween(frame, [10, 50], [0, 1]) },
        ]}
      />
      <DotGrid opacity={0.28} />
      <Stage frame={frame} />
      <ActionList
        morph={morph}
        morphPrev={prog(s3Frame - 1, HANDOFF_START, HANDOFF_DUR, EASE.linear)}
        active={active}
        menuHighlight={-1}
        surface={1 - prog(s3Frame, HANDOFF_START, 26, EASE.inOut)}
      />
    </AbsoluteFill>
  );
};
