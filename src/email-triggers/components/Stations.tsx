// Pipeline station cards for S4, laid out on one spacing system (world px):
// card 600 x 400, 32 padding, 64 header, 28 gap, 536 x 244 body.
// Inset panels use 16/22 padding; nothing sits closer than 16px to an edge.
import { ArrowRight, Braces, Check, Database, Inbox, Lock, Play, Route } from "lucide-react";
import { Img, staticFile } from "remotion";
import { clamp, ease, mix, prog, typed } from "../lib/anim";
import { code, color, EMAIL, font } from "../theme";

export const CARD_W = 600;
export const CARD_H = 400;
export const PAD = 32;
export const HEADER_H = 64;
export const BODY_GAP = 28;
export const BODY_TOP = PAD + HEADER_H + BODY_GAP; // 124
export const BODY_W = CARD_W - PAD * 2; // 536
export const BODY_H = CARD_H - BODY_TOP - PAD; // 244

const EMERALD = "oklch(0.765 0.177 163.223)";
const EMERALD_BG = "oklch(0.696 0.17 162.48 / 0.12)";

export const STATIONS = [
  { n: "01", title: "Receive", sub: "over SMTP", icon: Inbox },
  { n: "02", title: "Match", sub: "address to function", icon: Route },
  { n: "03", title: "Store", sub: "email and attachments", icon: Database },
  { n: "04", title: "Parse", sub: "headers, text and HTML", icon: Braces },
  { n: "05", title: "Execute", sub: "your function", icon: Play },
];

const Inset: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      borderRadius: 18,
      backgroundColor: "#0f0f12",
      border: "1px solid rgba(255,255,255,0.06)",
      boxShadow: "inset 0 1px 0 rgba(0,0,0,0.4)",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {children}
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; tone: "emerald" | "blue" | "pink" | "muted"; size?: number; style?: React.CSSProperties }> = ({
  children,
  tone,
  size = 14,
  style,
}) => {
  const tones = {
    emerald: { bg: EMERALD_BG, fg: EMERALD },
    blue: { bg: "oklch(0.623 0.214 259.815 / 0.14)", fg: "oklch(0.707 0.165 254.624)" },
    pink: { bg: "rgba(253,54,110,0.14)", fg: color.pink },
    muted: { bg: color.muted, fg: color.mutedForeground },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: size * 2,
        padding: `0 ${size * 0.8}px`,
        borderRadius: size * 0.6,
        backgroundColor: tones.bg,
        color: tones.fg,
        fontFamily: font.ui,
        fontSize: size,
        fontWeight: 500,
        whiteSpace: "nowrap",
        flexShrink: 0,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const RuntimeTile: React.FC<{ size?: number }> = ({ size = 52 }) => (
  <div
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      borderRadius: size * 0.28,
      backgroundColor: color.muted,
      border: "1px solid rgba(255,255,255,0.07)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxSizing: "border-box",
    }}
  >
    <Img src={staticFile("email-triggers/icons/node.svg")} style={{ width: size * 0.5, height: size * 0.5 }} />
  </div>
);

// ---- 01 Receive ----------------------------------------------------------
const SMTP = [
  { c: "EHLO mail.example.net", r: "250" },
  { c: `MAIL FROM:<${EMAIL.fromAddress}>`, r: "250" },
  { c: "RCPT TO:<support@6a51…>", r: "250" },
  { c: "DATA", r: "354" },
];

const ReceiveBody: React.FC<{ t: number }> = ({ t }) => (
  <Inset style={{ height: BODY_H, padding: "16px 22px" }}>
    <div style={{ height: 30, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontFamily: font.mono, fontSize: 15, color: color.mutedForeground }}>
        mail.example.net <span style={{ color: color.pink }}>→</span> Appwrite
      </span>
      <Pill tone="emerald" size={13} style={{ opacity: prog(t, 2, 10) }}>
        <Lock size={12} strokeWidth={2.2} />
        TLS
      </Pill>
    </div>
    <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.06)", margin: "10px 0 8px" }} />
    {SMTP.map((l, i) => {
      const at = 6 + i * 9;
      const reply = prog(t, at + 7, 8, ease.backOut);
      return (
        <div
          key={i}
          style={{
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: font.mono,
            fontSize: 18,
            opacity: t >= at ? 1 : 0,
          }}
        >
          <span style={{ color: color.foreground, whiteSpace: "pre" }}>
            <span style={{ color: color.pink }}>› </span>
            {typed(t, at, 110, l.c)}
          </span>
          <Pill tone="emerald" size={13} style={{ fontFamily: font.mono, opacity: reply, transform: `scale(${mix(0.6, 1, reply)})` }}>
            {l.r}
          </Pill>
        </div>
      );
    })}
  </Inset>
);

// ---- 02 Match -------------------------------------------------------------
const MATCH_FONT = 19;
const MATCH_CW = MATCH_FONT * 0.6;
const MATCH_ID_PAD = 6;
const MATCH_LINE_W = 43 * MATCH_CW + MATCH_ID_PAD * 2;
const MATCH_ID_CX = (BODY_W - MATCH_LINE_W) / 2 + 8 * MATCH_CW + (20 * MATCH_CW + MATCH_ID_PAD * 2) / 2;

const MatchBody: React.FC<{ t: number }> = ({ t }) => {
  const hi = prog(t, 4, 14, ease.out);
  const drop = prog(t, 14, 16, ease.inOut);
  const fn = prog(t, 24, 16, ease.backOut);
  const ok = prog(t, 36, 12, ease.backOut);
  return (
    <div style={{ position: "relative", height: BODY_H }}>
      <div
        style={{
          position: "absolute",
          top: 26,
          left: 0,
          width: BODY_W,
          textAlign: "center",
          fontFamily: font.mono,
          fontSize: MATCH_FONT,
          lineHeight: "34px",
          color: color.mutedForeground,
          whiteSpace: "pre",
        }}
      >
        support@
        <span
          style={{
            color: color.foreground,
            backgroundColor: `rgba(253,54,110,${0.18 * hi})`,
            boxShadow: `0 0 0 1px rgba(253,54,110,${0.65 * hi})`,
            borderRadius: 7,
            padding: `4px ${MATCH_ID_PAD}px`,
          }}
        >
          {EMAIL.functionId}
        </span>
        .appwrite.email
      </div>
      <svg width={BODY_W} height={BODY_H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={MATCH_ID_CX} y1={68} x2={MATCH_ID_CX} y2={68 + 64 * drop} stroke={color.pink} strokeWidth={2} strokeDasharray="4 6" />
        {drop > 0.95 ? <circle cx={MATCH_ID_CX} cy={132} r={4.5} fill={color.pink} /> : null}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 132,
          height: 100,
          borderRadius: 20,
          backgroundColor: "#1c1c20",
          border: `1px solid ${ok > 0.5 ? "oklch(0.696 0.17 162.48 / 0.45)" : "rgba(255,255,255,0.08)"}`,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "0 24px",
          boxSizing: "border-box",
          opacity: fn,
          transform: `translateY(${(1 - fn) * 16}px) scale(${mix(0.94, 1, fn)})`,
        }}
      >
        <RuntimeTile />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: font.ui, fontSize: 20, fontWeight: 600, color: color.foreground, lineHeight: "26px" }}>
            Support inbox
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 14, color: color.mutedForeground, lineHeight: "22px", marginTop: 2 }}>
            {EMAIL.functionId}
          </div>
        </div>
        <Pill tone="emerald" size={14} style={{ opacity: ok, transform: `scale(${mix(0.7, 1, ok)})` }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: EMERALD }} />
          Active deployment
        </Pill>
      </div>
    </div>
  );
};

// ---- 03 Store -------------------------------------------------------------
export const STORE = {
  panelTop: (BODY_H - 210) / 2,
  rowH: 88,
  padX: 22,
  iconW: 44,
  /** land frames relative to station arrival */
  clipLand: 20,
  emlLand: 30,
};
/** Centre of each file icon, relative to the card's top-left. */
export const storeIconCenter = (row: 0 | 1) => ({
  x: PAD + STORE.padX + STORE.iconW / 2,
  y: BODY_TOP + STORE.panelTop + 16 + row * (STORE.rowH + 1) + STORE.rowH / 2,
});

const FileRow: React.FC<{ name: string; type: string; size: string; tag: string; tint: string; t: number; divider?: boolean }> = ({
  name,
  type,
  size,
  tag,
  tint,
  t,
  divider,
}) => {
  const on = ease.out(clamp(t));
  const flash = t > 0 && t < 1 ? 1 - t : 0;
  return (
    <div
      style={{
        height: STORE.rowH,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: `0 ${STORE.padX}px`,
        borderTop: divider ? "1px solid rgba(255,255,255,0.06)" : undefined,
        backgroundColor: `rgba(253,54,110,${0.08 * flash})`,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: STORE.iconW,
          height: 52,
          flexShrink: 0,
          borderRadius: 10,
          backgroundColor: `color-mix(in oklab, ${tint} 16%, transparent)`,
          border: `1px solid color-mix(in oklab, ${tint} 30%, transparent)`,
          color: tint,
          fontFamily: font.ui,
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.04em",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 8,
          boxSizing: "border-box",
          opacity: on,
          transform: `scale(${mix(0.6, 1, ease.backOut(clamp(t)))})`,
        }}
      >
        {tag}
      </div>
      <div style={{ flex: 1, minWidth: 0, opacity: on, transform: `translateX(${(1 - on) * -12}px)` }}>
        <div style={{ fontFamily: font.mono, fontSize: 18, color: color.foreground, lineHeight: "26px" }}>{name}</div>
        <div style={{ fontFamily: font.mono, fontSize: 14, color: color.mutedForeground, lineHeight: "22px", marginTop: 2 }}>{type}</div>
      </div>
      <span style={{ fontFamily: font.ui, fontSize: 16, color: color.mutedForeground, flexShrink: 0, opacity: on }}>{size}</span>
    </div>
  );
};

const StoreBody: React.FC<{ t: number }> = ({ t }) => (
  <div style={{ height: BODY_H, paddingTop: STORE.panelTop, boxSizing: "border-box" }}>
    <Inset style={{ padding: "16px 0" }}>
      <FileRow name={EMAIL.attachment.name} type="application/pdf" size="47 KB" tag="PDF" tint={color.pink} t={prog(t, STORE.clipLand - 2, 18)} />
      <FileRow name="original.eml" type="message/rfc822" size="66 KB" tag="EML" tint={color.violet} t={prog(t, STORE.emlLand - 2, 18)} divider />
    </Inset>
  </div>
);

// ---- 04 Parse -------------------------------------------------------------
const RAW = ["From: Walter O'Brien <…>", "Subject: Order 1042 did…", "Content-Type: text/plain", "Hi, my order 1042 did…"];
const PARSED: [string, string][] = [
  ['"from"', '"Walter O\'Brien…"'],
  ['"subject"', '"Order 1042…"'],
  ['"text"', '"Hi, my order…"'],
  ['"attachments"', "[1]"],
];
const PARSE_PANEL_W = 236;

const ParseBody: React.FC<{ t: number }> = ({ t }) => {
  const arrow = prog(t, 16, 12, ease.backOut);
  const panel = (label: string, children: React.ReactNode) => (
    <Inset style={{ width: PARSE_PANEL_W, height: 206, padding: "14px 16px" }}>
      <div style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.12em", color: color.mutedForeground, height: 20 }}>{label}</div>
      <div style={{ marginTop: 6 }}>{children}</div>
    </Inset>
  );
  return (
    <div style={{ height: BODY_H, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {panel(
        "RAW MIME",
        RAW.map((l, i) => {
          const hot = prog(t, 20 + i * 9, 6) * (1 - prog(t, 28 + i * 9, 12));
          return (
            <div
              key={i}
              style={{
                height: 36,
                display: "flex",
                alignItems: "center",
                fontFamily: font.mono,
                fontSize: 13.5,
                whiteSpace: "pre",
                color: hot > 0.1 ? color.foreground : color.mutedForeground,
                backgroundColor: `rgba(253,54,110,${0.16 * hot})`,
                borderRadius: 6,
                margin: "0 -6px",
                padding: "0 6px",
              }}
            >
              {l}
            </div>
          );
        }),
      )}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          flexShrink: 0,
          backgroundColor: `rgba(253,54,110,${0.16 * arrow})`,
          border: `1px solid rgba(253,54,110,${0.5 * arrow})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${mix(0.6, 1, arrow)})`,
          opacity: 0.3 + 0.7 * arrow,
        }}
      >
        <ArrowRight size={18} color={color.pink} strokeWidth={2.2} />
      </div>
      {panel(
        "JSON",
        PARSED.map(([k, v], i) => {
          const on = prog(t, 24 + i * 9, 10, ease.out);
          return (
            <div
              key={i}
              style={{
                height: 36,
                display: "flex",
                alignItems: "center",
                fontFamily: font.mono,
                fontSize: 13.5,
                whiteSpace: "pre",
                opacity: on,
                transform: `translateX(${(1 - on) * -12}px)`,
              }}
            >
              <span style={{ color: code.property }}>{k}</span>
              <span style={{ color: code.punctuation }}>: </span>
              <span style={{ color: v.startsWith("[") ? code.number : code.string }}>{v}</span>
            </div>
          );
        }),
      )}
    </div>
  );
};

// ---- 05 Execute -----------------------------------------------------------
const ExecuteBody: React.FC<{ t: number }> = ({ t }) => {
  const bar = prog(t, 10, 26, ease.inOut);
  const done = prog(t, 36, 10, ease.backOut);
  const log = prog(t, 38, 12, ease.out);
  return (
    <div style={{ height: BODY_H, display: "flex", flexDirection: "column", justifyContent: "space-between", paddingTop: 4, boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <RuntimeTile />
        <div style={{ flex: 1, fontFamily: font.mono, fontSize: 26, color: color.foreground }}>
          <span style={{ color: code.keyword }}>POST</span> /
        </div>
        <div style={{ position: "relative", display: "flex" }}>
          <Pill tone="blue" size={14} style={{ opacity: 1 - done }}>
            Processing
          </Pill>
          <Pill tone="emerald" size={14} style={{ position: "absolute", right: 0, top: 0, opacity: done, transform: `scale(${mix(0.7, 1, done)})` }}>
            <Check size={14} strokeWidth={2.6} />
            Completed
          </Pill>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            height: 38,
            padding: "0 14px",
            borderRadius: 10,
            fontFamily: font.mono,
            fontSize: 16,
            backgroundColor: "rgba(253,54,110,0.1)",
            border: "1px solid rgba(253,54,110,0.35)",
            color: color.foreground,
            whiteSpace: "pre",
            boxSizing: "border-box",
          }}
        >
          x-appwrite-trigger: <span style={{ color: color.pink }}>email</span>
        </span>
        <Pill tone="muted" size={14}>
          async
        </Pill>
      </div>
      <div style={{ height: 8, borderRadius: 4, backgroundColor: color.muted, overflow: "hidden" }}>
        <div style={{ width: `${bar * 100}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${color.pink}, #ff8fb0)` }} />
      </div>
      <Inset style={{ height: 52, padding: "0 18px", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: 0.35 + 0.65 * log }}>
        <span style={{ fontFamily: font.mono, fontSize: 15, color: color.mutedForeground, whiteSpace: "pre" }}>
          <span style={{ color: EMERALD }}>log</span>  Saved email 5f0c2a9e…
        </span>
        <span style={{ fontFamily: font.mono, fontSize: 15, color: color.mutedForeground }}>890ms</span>
      </Inset>
    </div>
  );
};

const BODIES = [ReceiveBody, MatchBody, StoreBody, ParseBody, ExecuteBody];

/** One station card at world 1x. */
export const StationCard: React.FC<{
  i: number;
  t: number; // frames since arrival (negative before)
  active: boolean;
  done: number; // 0..1 check mark
  glow: number;
  appear: number;
}> = ({ i, t, active, done, glow, appear }) => {
  const st = STATIONS[i];
  const Body = BODIES[i];
  const Icon = st.icon;
  const bodyOn = prog(t, -4, 12, ease.out);
  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 30,
        background: "linear-gradient(180deg, #1b1b1f 0%, #141417 100%)",
        border: `1.5px solid ${glow > 0.02 ? `rgba(253,54,110,${0.22 + 0.5 * glow})` : "rgba(255,255,255,0.08)"}`,
        boxShadow: [
          "0 40px 90px rgba(0,0,0,0.55)",
          "inset 0 1px 0 rgba(255,255,255,0.06)",
          glow > 0.02 ? `0 0 ${80 * glow}px rgba(253,54,110,${0.22 * glow})` : "",
        ]
          .filter(Boolean)
          .join(", "),
        padding: PAD,
        boxSizing: "border-box",
        opacity: appear,
        transform: `translateY(${(1 - appear) * 40}px)`,
      }}
    >
      <div style={{ height: HEADER_H, display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 56,
            height: 56,
            flexShrink: 0,
            borderRadius: 16,
            backgroundColor: active ? "rgba(253,54,110,0.14)" : color.muted,
            border: `1px solid ${active ? "rgba(253,54,110,0.35)" : "rgba(255,255,255,0.06)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
          }}
        >
          <Icon size={26} color={active ? color.pink : color.mutedForeground} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, height: 38 }}>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: 14,
                height: 26,
                padding: "0 9px",
                borderRadius: 8,
                display: "inline-flex",
                alignItems: "center",
                backgroundColor: active ? "rgba(253,54,110,0.14)" : color.muted,
                color: active ? color.pink : color.mutedForeground,
              }}
            >
              {st.n}
            </span>
            <span style={{ fontFamily: font.display, fontSize: 36, lineHeight: "38px", letterSpacing: "-0.025em", color: color.foreground }}>
              {st.title}
            </span>
          </div>
          <div style={{ fontFamily: font.ui, fontSize: 17, lineHeight: "24px", color: color.mutedForeground, marginTop: 2 }}>{st.sub}</div>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            flexShrink: 0,
            backgroundColor: EMERALD_BG,
            border: "1px solid oklch(0.696 0.17 162.48 / 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: clamp(done * 2),
            transform: `scale(${mix(0.5, 1, ease.backOut(clamp(done)))})`,
            boxSizing: "border-box",
          }}
        >
          <Check size={20} color={EMERALD} strokeWidth={2.6} />
        </div>
      </div>
      <div style={{ marginTop: BODY_GAP, height: BODY_H, opacity: bodyOn }}>
        <Body t={Math.max(0, t)} />
      </div>
    </div>
  );
};
