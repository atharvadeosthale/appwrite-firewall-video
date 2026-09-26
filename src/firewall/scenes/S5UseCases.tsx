import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import {
  Bot,
  Building2,
  Code2,
  Database,
  Globe,
  Globe2,
  KeyRound,
  Lock,
  MessageSquareWarning,
  Route,
  ShieldCheck,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { C, EASE, rgba } from "../theme";
import { AEONIK, INTER, MONO } from "../fonts";
import { lerp, prog, tween } from "../lib/anim";
import { Cursor, Eyebrow, Words } from "../components/Type";
import { Glows } from "../components/Atmosphere";

export const S5_DURATION = 312;

type UseCase = {
  title: string;
  desc: string;
  action: "Deny" | "Bypass" | "Challenge" | "Rate limit" | "Redirect";
  scope: "API" | "Function" | "Site";
  icon: LucideIcon;
};

const CASES: UseCase[] = [
  { title: "OTP abuse", desc: "Cap phone and email codes per IP", action: "Rate limit", scope: "API", icon: MessageSquareWarning },
  { title: "Scrapers", desc: "Slow bulk reads on your tables", action: "Rate limit", scope: "API", icon: Database },
  { title: "Regional access", desc: "Serve only the markets you operate in", action: "Deny", scope: "API", icon: Globe2 },
  { title: "Webhooks", desc: "Only POST reaches your function", action: "Deny", scope: "Function", icon: Zap },
  { title: "Office allowlist", desc: "Trusted networks skip every rule", action: "Bypass", scope: "API", icon: Building2 },
  { title: "Brute force", desc: "10 sign-in attempts per minute", action: "Rate limit", scope: "API", icon: KeyRound },
  { title: "Bots on forms", desc: "Challenge /signup and /login", action: "Challenge", scope: "Site", icon: Bot },
  { title: "Datacenter traffic", desc: "Deny hosting-provider networks", action: "Deny", scope: "API", icon: Globe },
  { title: "Admin paths", desc: "Deny /wp-admin and /.env probes", action: "Deny", scope: "Site", icon: Lock },
  { title: "Retired pages", desc: "Send /old-docs to /docs", action: "Redirect", scope: "Site", icon: Route },
  { title: "Maintenance", desc: "Every path to /maintenance", action: "Redirect", scope: "Site", icon: Wrench },
  { title: "Per-user quotas", desc: "A separate limit for every user", action: "Rate limit", scope: "API", icon: ShieldCheck },
];

const ACTION_COLOR: Record<UseCase["action"], [string, string]> = {
  Deny: [C.deny, C.denyText],
  Bypass: [C.bypass, C.bypassText],
  Challenge: [C.challenge, C.challengeText],
  "Rate limit": [C.rateLimit, C.rateLimitText],
  Redirect: [C.redirect, C.redirectText],
};

const SCOPE_ICON: Record<UseCase["scope"], LucideIcon> = { API: Code2, Function: Zap, Site: Globe };

const COLS = 4;
const CW = 400;
const CH = 236;
const GAP = 28;

// Highlight order and timing (the pink sweep across the grid).
const SWEEP = [0, 9, 3, 4, 10, 1, 7, 8, 2, 11, 5, 6];
const SWEEP_START = 72;
const SWEEP_STEP = 12;

const Card: React.FC<{ c: UseCase; i: number; frame: number; contentFade: number }> = ({ c, i, frame, contentFade }) => {
  const row = Math.floor(i / COLS);
  const col = i % COLS;
  const inAt = 4 + (row + col) * 5;
  const p = prog(frame, inAt, 34, EASE.out);
  const order = SWEEP.indexOf(i);
  const litAt = SWEEP_START + order * SWEEP_STEP;
  const isFinal = order === SWEEP.length - 1;
  const lit = prog(frame, litAt, 6, EASE.out) * (isFinal ? 1 : 1 - prog(frame, litAt + 20, 26, EASE.inOut));
  const [dot, text] = ACTION_COLOR[c.action];
  const Icon = c.icon;
  const ScopeIcon = SCOPE_ICON[c.scope];
  return (
    <div
      style={{
        position: "absolute",
        left: col * (CW + GAP),
        top: row * (CH + GAP),
        width: CW,
        height: CH,
        borderRadius: 22,
        background: lit > 0.001 ? `color-mix(in srgb, ${C.pink} ${lit * 100}%, ${C.card})` : C.card,
        border: `1.5px solid ${lit > 0.01 ? rgba("#ff8aac", 0.6 * lit + 0.1) : "#2a2a2f"}`,
        boxShadow: lit > 0.01 ? `0 0 ${80 * lit}px ${rgba(C.pink, 0.45 * lit)}` : "0 20px 50px rgba(0,0,0,0.35)",
        padding: 28,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        opacity: p,
        translate: `0 ${(1 - p) * 60}px`,
        scale: `${lerp(0.92, 1, p) + lit * 0.02}`,
        fontFamily: INTER,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", opacity: contentFade }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: lit > 0.5 ? "rgba(255,255,255,0.18)" : rgba(C.input, 0.6),
            border: `1px solid ${lit > 0.5 ? "rgba(255,255,255,0.25)" : "#34343a"}`,
          }}
        >
          <Icon size={24} color={lit > 0.5 ? "#fff" : C.muted} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              background: lit > 0.5 ? "rgba(255,255,255,0.18)" : rgba(dot, 0.12),
              color: lit > 0.5 ? "#fff" : text,
            }}
          >
            {c.action}
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 15,
              color: lit > 0.5 ? "#fff" : C.muted,
              border: `1px solid ${lit > 0.5 ? "rgba(255,255,255,0.3)" : "#34343a"}`,
            }}
          >
            <ScopeIcon size={14} />
            {c.scope}
          </span>
        </div>
      </div>
      <div style={{ opacity: contentFade }}>
        <div style={{ fontFamily: AEONIK, fontSize: 34, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.1 }}>
          {c.title}
        </div>
        <div style={{ marginTop: 8, fontSize: 18, color: lit > 0.5 ? "rgba(255,255,255,0.85)" : C.muted }}>{c.desc}</div>
      </div>
    </div>
  );
};

export const S5UseCases: React.FC = () => {
  const frame = useCurrentFrame();
  const gridW = COLS * CW + (COLS - 1) * GAP;
  const gridH = 3 * CH + 2 * GAP;
  const drift = tween(frame, [0, S5_DURATION], [0, 1], EASE.linear);
  // Push through the last highlighted card ("Bots on forms") into the next scene.
  const outP = prog(frame, S5_DURATION - 70, 50, EASE.linear);
  const flat = prog(frame, S5_DURATION - 78, 42, EASE.inOut);
  const target = SWEEP[SWEEP.length - 1];
  const tCol = target % COLS;
  const tRow = Math.floor(target / COLS);
  const originX = tCol * (CW + GAP) + CW / 2;
  const originY = tRow * (CH + GAP) + CH / 2;
  const titleIn = prog(frame, 16, 30);

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, overflow: "hidden" }}>
      <Glows
        glows={[
          { x: 84, y: 8, r: 950, color: rgba(C.indigo, 0.22), opacity: 1 },
          { x: 30, y: 96, r: 900, color: rgba(C.pink, 0.2), opacity: 1 },
        ]}
      />
      <AbsoluteFill style={{ perspective: 2200, perspectiveOrigin: "60% 40%" }}>
        <div
          style={{
            position: "absolute",
            left: 960 - gridW / 2 + 330,
            top: 540 - gridH / 2 + 40,
            width: gridW,
            height: gridH,
            transformStyle: "preserve-3d",
            transformOrigin: `${originX}px ${originY}px`,
            transform: (() => {
              // Screen offset that brings the target card to the centre.
              const cardScreenX = 960 - gridW / 2 + 330 + originX;
              const cardScreenY = 540 - gridH / 2 + 40 + originY;
              const tx = lerp(lerp(140, -330, drift), 960 - cardScreenX, flat);
              const ty = lerp(lerp(30, -30, drift), 540 - cardScreenY, flat);
              const tz = lerp(lerp(-160, 40, drift), 0, flat);
              const k = 1 - flat;
              const sc = Math.pow(9, Math.pow(outP, 1.6));
              return `translate3d(${tx}px, ${ty}px, ${tz}px) rotateX(${lerp(26, 22, drift) * k}deg) rotateY(${lerp(-24, -16, drift) * k}deg) rotateZ(${lerp(6, 4, drift) * k}deg) scale(${sc})`;
            })(),
          }}
        >
          {CASES.map((c, i) => (
            <Card key={c.title} c={c} i={i} frame={frame} contentFade={1 - prog(outP, 0.45, 0.25, EASE.inOut)} />
          ))}
        </div>
      </AbsoluteFill>

      {/* Legibility wash for the title */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(11,11,14,0.96) 0%, rgba(11,11,14,0.92) 33%, rgba(11,11,14,0.5) 46%, transparent 60%)",
          opacity: titleIn * (1 - flat),
        }}
      />
      <div style={{ position: "absolute", left: 124, top: 330, width: 640, opacity: 1 - flat }}>
        <Eyebrow text="Presets" start={10} size={22} color="#b4b4bd" />
        <div style={{ marginTop: 26, fontSize: 96, letterSpacing: "-0.045em", lineHeight: 1.0, color: C.fg }}>
          <Words
            text="Stop real attacks"
            start={20}
            stagger={5}
            after={<Cursor size={96} appear={46} blinkFrom={80} />}
          />
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: AEONIK,
            fontSize: 30,
            lineHeight: 1.35,
            color: C.muted,
            opacity: prog(frame, 44, 30),
            translate: `0 ${(1 - prog(frame, 44, 30)) * 16}px`,
          }}
        >
          Start from ready-made rules for OTP abuse, scraping and regional access.
        </div>
        <div
          style={{
            marginTop: 34,
            display: "flex",
            gap: 12,
            opacity: prog(frame, 70, 24),
            fontFamily: MONO,
            fontSize: 18,
            color: C.muted,
          }}
        >
          {(["API", "Functions", "Sites"] as const).map((s, k) => {
            const Icon = [Code2, Zap, Globe][k];
            return (
              <span
                key={s}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1px solid #34343a`,
                  background: rgba(C.card, 0.8),
                  opacity: prog(frame, 70 + k * 6, 16),
                  translate: `0 ${(1 - prog(frame, 70 + k * 6, 16)) * 10}px`,
                }}
              >
                <Icon size={16} />
                {s}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
