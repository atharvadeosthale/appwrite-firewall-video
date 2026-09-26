import React from "react";
import {
  Calendar,
  ChevronDown,
  Globe,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
} from "lucide-react";
import { C, rgba } from "../theme";
import { INTER, MONO } from "../fonts";
import { clamp01, lerp } from "../lib/anim";
import { R, Sweep } from "./Console";

export const PAGE_W = 1080;

// Chart series in legend order (ascending by value, as the console sorts them).
export const SERIES = [
  { key: "redirected", label: "Redirected", color: C.redirect },
  { key: "rateLimited", label: "Rate limited", color: C.rateLimit },
  { key: "challenged", label: "Challenged", color: C.challenge },
  { key: "denied", label: "Denied", color: C.deny },
  { key: "passed", label: "Passed", color: C.passed },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

const N = 48;

/** Traffic for point i. `spike` scales an attack at the live edge, `calm` is attack mode taking effect. */
export const trafficAt = (i: number, spike: number, calm: number) => {
  const t = i / (N - 1);
  const day = Math.sin(t * Math.PI * 2 - 1.2) * 0.5 + 0.5;
  const passed = 900 + day * 520 + Math.sin(i * 1.7) * 60 + Math.sin(i * 0.6) * 90;
  const denied = 40 + day * 30 + Math.max(0, Math.sin(i * 0.9 + 2)) * 40;
  const challenged = 26 + day * 20 + Math.max(0, Math.sin(i * 0.5)) * 30;
  const rateLimited = 14 + Math.max(0, Math.sin(i * 0.35 + 1)) * 60;
  const redirected = 8 + day * 6;
  // Attack at the last points.
  const edge = clamp01((i - (N - 9)) / 8);
  const surge = spike * Math.pow(edge, 1.6) * 7800;
  const challengedSurge = calm * Math.pow(edge, 1.2) * 6400;
  return {
    passed: passed + surge * (1 - calm * 0.92),
    denied: denied + surge * 0.12 * (1 - calm),
    challenged: challenged + challengedSurge,
    rateLimited: rateLimited + surge * 0.2 * (1 - calm),
    redirected,
  } as Record<SeriesKey, number>;
};

export type PageState = {
  frame: number;
  draw: number; // 0..1 chart reveal
  spike: number; // 0..1 attack surge
  calm: number; // 0..1 attack mode in effect
  count: number; // 0..1 tile counters
  attackPress: number;
  attackOn: number; // banner
  attackHover: number;
};

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const compact = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}K` : fmt(n);

const Chart: React.FC<{ s: PageState }> = ({ s }) => {
  const w = PAGE_W - 48 - 40;
  const h = 230;
  const pts = Array.from({ length: N }, (_, i) => trafficAt(i, s.spike, s.calm));
  const maxBase = 1600;
  const maxSpike = 9800;
  const max = lerp(maxBase, maxSpike, clamp01(s.spike * 1.2));
  const y = (v: number) => h - Math.min(1.02, v / max) * h;
  const x = (i: number) => (i / (N - 1)) * w;
  const path = (k: SeriesKey) => {
    let d = "";
    for (let i = 0; i < N; i++) {
      const px = x(i);
      const py = y(pts[i][k]);
      if (i === 0) d += `M${px.toFixed(1)},${py.toFixed(1)}`;
      else {
        const pxp = x(i - 1);
        const pyp = y(pts[i - 1][k]);
        const cx = (pxp + px) / 2;
        d += ` C${cx.toFixed(1)},${pyp.toFixed(1)} ${cx.toFixed(1)},${py.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}`;
      }
    }
    return d;
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelFor = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `${Math.round(v)}`);
  return (
    <svg width={w + 40} height={h + 26} style={{ overflow: "visible", display: "block" }}>
      <defs>
        {SERIES.map((se) => (
          <linearGradient key={se.key} id={`fw-grad-${se.key}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={se.color} stopOpacity={se.key === "passed" ? 0.28 : 0.22} />
            <stop offset="100%" stopColor={se.color} stopOpacity={0} />
          </linearGradient>
        ))}
        <clipPath id="fw-draw">
          <rect x={-2} y={-40} width={(w + 4) * s.draw} height={h + 60} />
        </clipPath>
      </defs>
      <g transform="translate(36,4)">
        {ticks.map((t) => (
          <g key={t}>
            <text x={-10} y={h - t * h + 3} fill={C.faint} fontSize={10} textAnchor="end" fontFamily={INTER}>
              {labelFor(t * max)}
            </text>
          </g>
        ))}
        <g clipPath="url(#fw-draw)">
          {[...SERIES].reverse().map((se) => (
            <g key={se.key}>
              <path d={`${path(se.key)} L${w},${h} L0,${h} Z`} fill={`url(#fw-grad-${se.key})`} />
              <path
                d={path(se.key)}
                fill="none"
                stroke={se.color}
                strokeWidth={2}
                style={{ filter: `drop-shadow(0 0 4px ${rgba(se.color, 0.6)})` }}
              />
            </g>
          ))}
        </g>
        {["16:00", "20:00", "6 Aug", "04:00", "08:00", "12:00", "16:00"].map((t, k) => (
          <text key={k} x={(w / 6) * k} y={h + 20} fill={C.faint} fontSize={10} textAnchor="middle" fontFamily={INTER}>
            {t}
          </text>
        ))}
        {/* Live edge marker */}
        <circle
          cx={x(N - 1) * 1}
          cy={y(pts[N - 1].passed)}
          r={4}
          fill={s.spike > 0.05 && s.calm < 0.5 ? C.deny : C.passed}
          opacity={s.draw > 0.98 ? 1 : 0}
        />
      </g>
    </svg>
  );
};

const Tile: React.FC<{ label: string; value: string; delta?: string; deltaColor?: string; sub?: string; last?: boolean }> = ({
  label,
  value,
  delta,
  deltaColor = C.muted,
  sub,
  last,
}) => (
  <div style={{ flex: 1, padding: "12px 24px", borderRight: last ? undefined : `1px solid ${C.hairline}` }}>
    <div style={{ fontSize: 12, color: C.muted }}>{label}</div>
    <div style={{ marginTop: 2, display: "flex", alignItems: "baseline", gap: 8, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 20, fontWeight: 600, color: C.fg, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      {delta ? <span style={{ fontSize: 12, fontWeight: 500, color: deltaColor }}>{delta}</span> : null}
      {sub ? <span style={{ fontSize: 12, color: C.muted }}>{sub}</span> : null}
    </div>
  </div>
);

const Toggle: React.FC<{ on: boolean }> = ({ on }) => (
  <div
    style={{
      width: 32,
      height: 18,
      borderRadius: 99,
      background: on ? C.fg : C.input,
      position: "relative",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 2,
        left: on ? 16 : 2,
        width: 14,
        height: 14,
        borderRadius: 99,
        background: on ? "#18181b" : C.muted,
      }}
    />
  </div>
);

export const RULES = [
  { name: "Allow office IP range", action: "Bypass", color: C.bypass, text: C.bypassText, priority: 10, cond: "IP address Equals 198.51.100.0/24" },
  { name: "Deny admin paths", action: "Deny", color: C.deny, text: C.denyText, priority: 100, cond: "Path Starts with /wp-" },
  { name: "Challenge sign-ups", action: "Challenge", color: C.challenge, text: C.challengeText, priority: 150, cond: "Path Starts with /signup" },
  { name: "Rate limit checkout", action: "Rate limit", sub: "30/60s", color: C.rateLimit, text: C.rateLimitText, priority: 200, cond: "Path Starts with /checkout" },
  { name: "Redirect retired pages", action: "Redirect", sub: "301", color: C.redirect, text: C.redirectText, priority: 300, cond: "Path Equals /pricing-2023" },
];

export const FirewallPage: React.FC<{ s: PageState; attackRow?: number; sweep?: number }> = ({
  s,
  attackRow = 0,
  sweep = 0,
}) => {
  const c = clamp01(s.count);
  const tp = trafficAt;
  let totals = { passed: 0, denied: 0, challenged: 0, rateLimited: 0, redirected: 0 };
  for (let i = 0; i < N; i++) {
    const p = tp(i, s.spike, s.calm);
    totals = {
      passed: totals.passed + p.passed * 22,
      denied: totals.denied + p.denied * 22,
      challenged: totals.challenged + p.challenged * 22,
      rateLimited: totals.rateLimited + p.rateLimited * 22,
      redirected: totals.redirected + p.redirected * 22,
    };
  }
  const total = totals.passed;
  const block = (totals.denied + totals.rateLimited) / Math.max(1, total);
  return (
    <div
      style={{
        position: "relative",
        width: PAGE_W,
        fontFamily: INTER,
        color: C.fg,
        background: C.bg,
        borderRadius: 18,
        overflow: "hidden",
        border: `1px solid ${C.hairline}`,
      }}
    >
      <Sweep progress={sweep} radius={18} />
      {/* Header */}
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: `1px solid ${C.hairline}`,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 600 }}>Firewall</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
          <Shield size={14} color={C.bypassText} />
          Rules <span style={{ color: C.fg, fontWeight: 500 }}>5/50</span>
        </div>
      </div>

      {/* Attack mode banner */}
      <div style={{ height: 52 * s.attackOn, overflow: "hidden" }}>
        <div
          style={{
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: rgba(C.rateLimit, 0.2),
            borderBottom: `1px solid ${rgba(C.rateLimitText, 0.22)}`,
            color: C.rateLimitText,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ShieldAlert size={16} />
            Attack mode is on. Every visitor is challenged.
          </span>
          <span
            style={{
              height: 32,
              display: "inline-flex",
              alignItems: "center",
              padding: "0 12px",
              borderRadius: R.md,
              border: `1px solid ${C.rateLimitText}`,
            }}
          >
            Turn off
          </span>
        </div>
      </div>

      {/* Overview header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: `1px solid ${C.hairline}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{compact(total * c)}</span>
          <span style={{ fontSize: 13, color: C.muted }}>requests</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: s.spike > 0.2 && s.calm < 0.5 ? C.denyText : C.passedText,
            }}
          >
            {s.spike > 0.2 && s.calm < 0.5 ? `+${Math.round(40 + s.spike * 780)}% vs previous period` : "+12% vs previous period"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", border: `1px solid ${C.input}`, borderRadius: R.md, overflow: "hidden", height: 36 }}>
            {["15m", "1h", "1d"].map((l) => (
              <span
                key={l}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  fontSize: 13,
                  color: l === "1h" ? C.fg : C.muted,
                  background: l === "1h" ? C.input : "transparent",
                }}
              >
                {l}
              </span>
            ))}
          </div>
          <div
            style={{
              height: 36,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              border: `1px solid ${C.input}`,
              borderRadius: R.md,
              fontSize: 13,
              color: C.fg,
            }}
          >
            <Calendar size={15} color={C.muted} />
            Last 24 hours
            <ChevronDown size={15} color={C.muted} style={{ marginLeft: 16 }} />
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${C.input}`,
              borderRadius: R.md,
            }}
          >
            <RefreshCw size={15} color={C.muted} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ padding: "16px 24px 16px" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          {SERIES.map((se) => (
            <span key={se.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: se.color }} />
              {se.label}
            </span>
          ))}
        </div>
        <Chart s={s} />
      </div>

      {/* Tiles */}
      <div style={{ display: "flex", borderTop: `1px solid ${C.hairline}`, borderBottom: `1px solid ${C.hairline}` }}>
        <Tile label="Passed" value={compact(totals.passed * c)} delta={s.spike > 0.2 && s.calm < 0.5 ? "+812%" : "+12%"} deltaColor={s.spike > 0.2 && s.calm < 0.5 ? C.denyText : C.passedText} />
        <Tile label="Denied" value={compact(totals.denied * c)} delta="4.1%" />
        <Tile
          label="Challenged"
          value={compact(totals.challenged * c)}
          delta={`${((totals.challenged / total) * 100).toFixed(1)}%`}
          sub={`· ${compact(totals.challenged * c * 0.94)} solved · 38ms`}
        />
        <Tile label="Rate limited" value={compact(totals.rateLimited * c)} delta="1.8%" />
        <Tile label="Redirected" value={compact(totals.redirected * c)} delta="0.6%" />
        <Tile label="Block rate" value={`${(block * 100 * c).toFixed(1)}%`} delta="-0.4%" last />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 14px" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              height: 36,
              width: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              border: `1px solid ${C.input}`,
              borderRadius: R.md,
              fontSize: 13,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Globe size={15} color={C.muted} />
              storefront
            </span>
            <ChevronDown size={15} color={C.muted} />
          </div>
          <div
            style={{
              height: 36,
              width: 230,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              borderRadius: R.md,
              background: rgba(C.input, 0.5),
              fontSize: 13,
              color: C.muted,
            }}
          >
            <Search size={15} />
            Search rules...
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div
            data-id="attack"
            style={{
              height: 32,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 12px",
              borderRadius: R.md,
              border: `1px solid ${s.attackOn > 0.5 ? rgba(C.rateLimit, 0.4) : lerp(0, 1, s.attackHover) > 0.5 ? C.muted : C.input}`,
              background: s.attackOn > 0.5 ? rgba(C.rateLimit, 0.1) : s.attackHover > 0.01 ? rgba(C.input, s.attackHover) : "transparent",
              color: s.attackOn > 0.5 ? C.rateLimitText : s.attackHover > 0.5 ? C.fg : C.muted,
              fontSize: 13,
              fontWeight: 500,
              scale: `${1 - s.attackPress * 0.06}`,
            }}
          >
            <ShieldAlert size={16} />
            Attack mode
          </div>
          <div
            style={{
              height: 32,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 12px",
              borderRadius: R.md,
              background: C.pink,
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Plus size={16} />
            Create rule
          </div>
        </div>
      </div>

      {/* Rules table */}
      <div style={{ margin: "0 24px 24px", border: `1px solid ${C.hairline}`, borderRadius: R.lg, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1.5fr 130px 100px 2fr 110px 40px",
            padding: "12px 16px",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: C.muted,
            borderBottom: `1px solid ${C.hairline}`,
          }}
        >
          <span>STATUS</span>
          <span>RULE</span>
          <span>ACTION</span>
          <span>PRIORITY</span>
          <span>CONDITIONS</span>
          <span>UPDATED</span>
          <span />
        </div>
        {[
          ...(attackRow > 0
            ? [
                {
                  name: "Attack mode",
                  action: "Challenge",
                  color: C.challenge,
                  text: C.challengeText,
                  priority: 0,
                  cond: "Path Starts with /",
                  sub: undefined as string | undefined,
                },
              ]
            : []),
          ...RULES,
        ].map((r, i) => (
          <div
            key={r.name}
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1.5fr 130px 100px 2fr 110px 40px",
              alignItems: "center",
              padding: "0 16px",
              height: 52 * (i === 0 && attackRow > 0 ? attackRow : 1),
              overflow: "hidden",
              fontSize: 13,
              borderBottom: `1px solid ${C.hairline}`,
              background: i === 0 && attackRow > 0 ? rgba(C.challenge, 0.08) : undefined,
            }}
          >
            <Toggle on />
            <span style={{ fontWeight: 500 }}>{r.name}</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  alignSelf: "flex-start",
                  padding: "2px 8px",
                  borderRadius: R.md,
                  background: rgba(r.color, 0.12),
                  color: r.text,
                  fontSize: 10,
                  fontWeight: 500,
                }}
              >
                {r.action}
              </span>
              {r.sub ? <span style={{ fontSize: 11, color: C.muted }}>{r.sub}</span> : null}
            </span>
            <span style={{ fontFamily: MONO, color: C.muted }}>{r.priority}</span>
            <span style={{ fontSize: 12, color: C.muted }}>{r.cond}</span>
            <span style={{ fontSize: 12, color: C.muted }}>{i === 0 && attackRow > 0 ? "just now" : `${8 + i * 3} minutes ago`}</span>
            <MoreHorizontal size={16} color={C.muted} />
          </div>
        ))}
      </div>
    </div>
  );
};

/** The confirm dialog, exactly as the console words it. */
export const AttackDialog: React.FC<{ press: number; hover: number }> = ({ press, hover }) => (
  <div
    style={{
      width: 448,
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: R.lg,
      overflow: "hidden",
      fontFamily: INTER,
      boxShadow: "0 40px 120px rgba(0,0,0,0.7)",
    }}
  >
    <div style={{ padding: "24px 24px 16px", position: "relative" }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: C.fg }}>Turn on attack mode</div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: C.muted }}>
        Challenge every visitor until you turn it off. Visitors must pass a challenge before they can continue. Bypass
        rules with a lower priority number still apply.
      </div>
      <div style={{ position: "absolute", right: 16, top: 16, color: C.muted, fontSize: 16 }}>✕</div>
    </div>
    <div
      style={{
        padding: "16px 24px",
        borderTop: `1px solid ${C.hairline}`,
        background: rgba(C.input, 0.3),
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
      }}
    >
      <span
        style={{
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          padding: "0 16px",
          borderRadius: R.md,
          border: `1px solid ${C.input}`,
          color: C.muted,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Cancel
      </span>
      <span
        style={{
          height: 36,
          display: "inline-flex",
          alignItems: "center",
          padding: "0 16px",
          borderRadius: R.md,
          background: hover > 0.5 ? "#e4e4e7" : C.fg,
          color: "#18181b",
          fontSize: 14,
          fontWeight: 500,
          scale: `${1 - press * 0.06}`,
        }}
      >
        Turn on
      </span>
    </div>
  </div>
);
