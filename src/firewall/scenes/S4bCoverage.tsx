import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Code2, Globe, ShieldCheck, Zap, type LucideIcon } from "lucide-react";
import { ACTIONS, C, EASE, rgba, type ActionId } from "../theme";
import { AEONIK, INTER, MONO } from "../fonts";
import { clamp01, hash01, lerp, prog, tween } from "../lib/anim";
import { Cursor, Eyebrow, Words } from "../components/Type";
import { DotGrid, Glows } from "../components/Atmosphere";

export const S4B_DURATION = 330;

// Stage geometry in screen px.
const CY = 690;
const WALL = { x: 840, w: 56, rows: 9, brickH: 40, gap: 8 };
const WALL_H = WALL.rows * (WALL.brickH + WALL.gap) - WALL.gap;
const WALL_TOP = CY - WALL_H / 2;
const CARD = { x: 1140, w: 660, h: 128, gap: 30 };
const cardY = (k: number) => CY + (k - 1) * (CARD.h + CARD.gap);

type Surface = { title: string; icon: LucideIcon; rule: { action: ActionId; match: string } };

// Each surface carries its own rule set; one example rule per card.
const SURFACES: Surface[] = [
  { title: "Appwrite API", icon: Code2, rule: { action: "rateLimit", match: "/v1/account/sessions" } },
  { title: "Appwrite Sites", icon: Globe, rule: { action: "challenge", match: "/signup" } },
  { title: "Appwrite Functions", icon: Zap, rule: { action: "deny", match: "method != POST" } },
];

const CARD_IN = 70;
const CARD_STAGGER = 12;
const BADGE_AT = 150;
const BADGE_STAGGER = 16;

const PASS_DUR = 8;
const ROUTE_DUR = 32;
const HIT_X = WALL.x - 8;

type Packet = { s: number; durA: number; y: number; k: number; bad: boolean };

const PACKETS: Packet[] = Array.from({ length: 72 }, (_, i) => ({
  s: 60 + i * 3.3 + hash01(i * 13 + 1) * 4,
  durA: 48 + hash01(i * 5 + 2) * 20,
  y: WALL_TOP + 22 + hash01(i * 11 + 4) * (WALL_H - 44),
  k: Math.floor(hash01(i * 17 + 9) * 3),
  bad: i === 1 || hash01(i * 23 + 5) < 0.3,
}));

const hitAt = (p: Packet) => p.s + p.durA;
const arriveAt = (p: Packet) => hitAt(p) + PASS_DUR + ROUTE_DUR;

const bezier = (t: number, a: number, b: number, c: number, d: number) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

/** Where a packet is at frame `f`, or null when it is not on screen. */
const posAt = (p: Packet, f: number) => {
  const a = f - p.s;
  if (a < 0) return null;
  if (a < p.durA) {
    const t = a / p.durA;
    return { x: lerp(-40, HIT_X, t * 0.7 + EASE.in(t) * 0.3), y: p.y, phase: 0 };
  }
  if (p.bad) return null;
  const b = a - p.durA;
  if (b < PASS_DUR) return { x: lerp(HIT_X, WALL.x + WALL.w + 8, b / PASS_DUR), y: p.y, phase: 1 };
  const c = b - PASS_DUR;
  if (c >= ROUTE_DUR) return null;
  const t = EASE.inOut(c / ROUTE_DUR) * 0.5 + (c / ROUTE_DUR) * 0.5;
  const x0 = WALL.x + WALL.w + 8;
  const ty = cardY(p.k);
  return {
    x: bezier(t, x0, x0 + 90, CARD.x - 110, CARD.x - 6),
    y: bezier(t, p.y, p.y, ty, ty),
    phase: 2,
  };
};

const GlowDefs: React.FC = () => (
  <defs>
    {[C.pink, C.deny, C.passed, "#d4d4dc"].map((c) => (
      <radialGradient key={c} id={`cov-glow-${c.slice(1)}`}>
        <stop offset="0%" stopColor={c} stopOpacity={0.55} />
        <stop offset="100%" stopColor={c} stopOpacity={0} />
      </radialGradient>
    ))}
    <linearGradient id="cov-brick" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stopColor={C.pink} stopOpacity={0.06} />
      <stop offset="100%" stopColor={C.pink} stopOpacity={0.24} />
    </linearGradient>
  </defs>
);

const Stage: React.FC<{ frame: number }> = ({ frame }) => {
  const wallGlow = prog(frame, 40, 60);

  // Per-row flash when a packet meets the wall.
  const rowLit = Array.from({ length: WALL.rows }, () => ({ deny: 0, pass: 0 }));
  for (const p of PACKETS) {
    const since = frame - hitAt(p);
    if (since < 0 || since > 22) continue;
    const r = Math.min(WALL.rows - 1, Math.floor((p.y - WALL_TOP) / (WALL.brickH + WALL.gap)));
    const v = 1 - since / 22;
    if (p.bad) rowLit[r].deny = Math.max(rowLit[r].deny, v);
    else rowLit[r].pass = Math.max(rowLit[r].pass, v * 0.5);
  }

  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <GlowDefs />

      {/* Routes from the wall to each surface */}
      {SURFACES.map((_, k) => {
        const draw = prog(frame, CARD_IN + 10 + k * CARD_STAGGER, 36, EASE.inOut);
        const len = CARD.x - (WALL.x + WALL.w);
        return (
          <line
            key={k}
            x1={WALL.x + WALL.w}
            y1={cardY(k)}
            x2={WALL.x + WALL.w + len * draw}
            y2={cardY(k)}
            stroke={C.pink}
            strokeOpacity={0.28}
            strokeWidth={2}
            strokeDasharray="6 10"
          />
        );
      })}

      {/* Wall glow */}
      <rect
        x={WALL.x - 160}
        y={WALL_TOP - 80}
        width={WALL.w + 320}
        height={WALL_H + 160}
        fill="url(#cov-glow-fd366e)"
        opacity={0.35 * wallGlow}
      />

      {/* Bricks assemble from the middle out */}
      {Array.from({ length: WALL.rows }, (_, r) => {
        const y = WALL_TOP + r * (WALL.brickH + WALL.gap);
        const inP = prog(frame, 14 + Math.abs(r - (WALL.rows - 1) / 2) * 5, 24, EASE.out);
        const { deny, pass } = rowLit[r];
        const fill =
          deny > 0.02 ? rgba(C.deny, 0.2 + 0.45 * deny) : pass > 0.02 ? rgba(C.passed, 0.12 + 0.3 * pass) : "url(#cov-brick)";
        const stroke = deny > 0.02 ? C.deny : pass > 0.02 ? C.passed : C.pink;
        return (
          <rect
            key={r}
            x={WALL.x + (WALL.w / 2) * (1 - inP)}
            y={y}
            width={WALL.w * inP}
            height={WALL.brickH}
            rx={8}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.5}
            strokeOpacity={(0.35 + 0.25 * (r / WALL.rows) + Math.max(deny, pass) * 0.6) * inP}
            opacity={inP}
          />
        );
      })}
      <text
        x={WALL.x + WALL.w / 2}
        y={WALL_TOP - 30}
        textAnchor="middle"
        fill={C.pink}
        fontFamily={MONO}
        fontSize={20}
        fontWeight={600}
        letterSpacing="0.18em"
        opacity={prog(frame, 50, 24)}
      >
        FIREWALL
      </text>

      {/* Packets */}
      {PACKETS.map((p, i) => {
        const pos = posAt(p, frame);
        const tail = posAt(p, frame - 3);
        const since = frame - hitAt(p);
        const burst =
          p.bad && since >= 0 && since < 36
            ? Array.from({ length: 7 }, (_, j) => {
                const ang = Math.PI * (0.55 + hash01(i * 31 + j) * 0.9);
                const sp = 2.5 + hash01(i * 17 + j * 3) * 4;
                const al = 1 - since / 36;
                return (
                  <rect
                    key={j}
                    x={HIT_X + Math.cos(ang) * sp * since - 3}
                    y={p.y - Math.sin(ang) * sp * since + 0.18 * since * since - 3}
                    width={6}
                    height={6}
                    rx={1.5}
                    fill={C.denyText}
                    opacity={al}
                  />
                );
              })
            : null;
        if (!pos) return <g key={i}>{burst}</g>;
        const color = p.bad ? C.deny : pos.phase === 0 ? "#d4d4dc" : C.passed;
        const r = p.bad ? 7 : 6;
        const alpha = pos.phase === 1 ? 0.5 : tween(frame - p.s, [0, 10], [0, 1]);
        return (
          <g key={i} opacity={alpha}>
            {tail ? (
              <line
                x1={tail.x}
                y1={tail.y}
                x2={pos.x}
                y2={pos.y}
                stroke={color}
                strokeWidth={3.5}
                strokeLinecap="round"
                opacity={0.4}
              />
            ) : null}
            <circle cx={pos.x} cy={pos.y} r={r * 3.2} fill={`url(#cov-glow-${color.slice(1)})`} />
            <circle cx={pos.x} cy={pos.y} r={r} fill={color} />
            <circle cx={pos.x} cy={pos.y} r={r * 0.45} fill="#fff" opacity={0.85} />
          </g>
        );
      })}
    </svg>
  );
};

const SurfaceCard: React.FC<{ s: Surface; k: number; frame: number }> = ({ s, k, frame }) => {
  const Icon = s.icon;
  const inP = prog(frame, CARD_IN + k * CARD_STAGGER, 34, EASE.out);
  const badge = prog(frame, BADGE_AT + k * BADGE_STAGGER, 22, EASE.back);
  const armed = prog(frame, BADGE_AT + k * BADGE_STAGGER, 30);

  let pulse = 0;
  let blocked = 0;
  for (const p of PACKETS) {
    if (p.k !== k) continue;
    if (p.bad) {
      if (frame >= hitAt(p)) blocked++;
      continue;
    }
    const since = frame - arriveAt(p);
    if (since >= 0 && since < 20) pulse = Math.max(pulse, EASE.out(1 - since / 20));
  }
  const lit = Math.max(pulse * 0.55, armed * 0.25);

  return (
    <div
      style={{
        position: "absolute",
        left: CARD.x,
        top: cardY(k) - CARD.h / 2,
        width: CARD.w,
        height: CARD.h,
        borderRadius: 22,
        background: `color-mix(in srgb, ${C.pink} ${lit * 14}%, ${C.card})`,
        border: `1.5px solid ${lit > 0.01 ? rgba("#ff8aac", 0.15 + 0.55 * lit) : "#2a2a2f"}`,
        boxShadow: `0 20px 50px rgba(0,0,0,0.35), 0 0 ${70 * lit}px ${rgba(C.pink, 0.4 * lit)}`,
        padding: "0 30px",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 24,
        opacity: inP,
        translate: `${(1 - inP) * 90}px 0`,
        fontFamily: INTER,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: rgba(C.input, 0.6),
          border: `1px solid ${armed > 0.5 ? rgba(C.pink, 0.45) : "#34343a"}`,
        }}
      >
        <Icon size={30} color={armed > 0.5 ? C.pinkHot : C.muted} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontFamily: AEONIK, fontSize: 34, letterSpacing: "-0.02em", color: C.fg, lineHeight: 1.1, whiteSpace: "nowrap" }}
        >
          {s.title}
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 600,
              background: rgba(ACTIONS[s.rule.action].color, 0.14),
              color: ACTIONS[s.rule.action].text,
            }}
          >
            {ACTIONS[s.rule.action].label}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 18, color: C.muted }}>{s.rule.match}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 10,
            fontSize: 17,
            fontWeight: 600,
            color: "#fff",
            background: rgba(C.pink, 0.22),
            border: `1px solid ${rgba(C.pink, 0.5)}`,
            opacity: clamp01(badge),
            scale: `${lerp(0.6, 1, badge)}`,
          }}
        >
          <ShieldCheck size={18} color={C.pinkHot} />
          Protected
        </span>
        <span style={{ fontFamily: MONO, fontSize: 16, color: C.denyText, opacity: armed }}>
          {`${blocked} blocked`}
        </span>
      </div>
    </div>
  );
};

export const S4bCoverage: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = tween(frame, [0, S4B_DURATION], [0, 1], EASE.linear);

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, overflow: "hidden" }}>
      <Glows
        glows={[
          { x: 88, y: -8, r: 950, color: rgba(C.indigo, 0.22), opacity: 1 },
          { x: 4, y: 104, r: 900, color: rgba(C.pink, 0.2), opacity: 1 },
        ]}
      />
      <DotGrid opacity={0.25} />

      <AbsoluteFill style={{ scale: `${lerp(1, 1.035, drift)}`, transformOrigin: "60% 60%" }}>
        <Stage frame={frame} />
        {SURFACES.map((s, k) => (
          <SurfaceCard key={s.title} s={s} k={k} frame={frame} />
        ))}
      </AbsoluteFill>

      <div style={{ position: "absolute", left: 120, top: 78 }}>
        <Eyebrow text="One firewall" start={8} size={28} />
        <div style={{ marginTop: 18, fontSize: 76, letterSpacing: "-0.045em", lineHeight: 1.0, color: C.fg }}>
          <Words
            text="Protect every entry point"
            start={16}
            stagger={5}
            style={{ whiteSpace: "nowrap" }}
            after={<Cursor size={76} appear={44} blinkFrom={80} />}
          />
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: AEONIK,
            fontSize: 28,
            color: C.muted,
            opacity: prog(frame, 40, 30),
            translate: `0 ${(1 - prog(frame, 40, 30)) * 16}px`,
          }}
        >
          Your API, every Site and every Function get their own rules.
        </div>
      </div>
    </AbsoluteFill>
  );
};
