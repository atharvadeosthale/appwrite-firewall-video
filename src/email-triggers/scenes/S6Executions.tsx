import { Copy, ListFilter, X } from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, FilmOverlay } from "../components/Backdrop";
import { Reveal } from "../components/Reveal";
import { Badge } from "../components/ui";
import { clamp, ease, mix, prog } from "../lib/anim";
import { color, font } from "../theme";
import { WIDTH } from "../timeline";

// Executions tab rebuilt from vibes LogsListView (PR #451 adds the Email
// trigger badge and filter). Drawn at 1x and scaled.
const K0 = 1.6;
const TABLE_W = 1000;
const ROW_H = 50;
const HEAD_H = 42;
const VISIBLE = 7;

const COLS = [
  { key: "id", label: "Execution ID", w: 196 },
  { key: "status", label: "Status", w: 128 },
  { key: "trigger", label: "Trigger", w: 108 },
  { key: "code", label: "Status code", w: 130 },
  { key: "method", label: "Method", w: 96 },
  { key: "path", label: "Path", w: 76 },
  { key: "duration", label: "Duration", w: 110 },
  { key: "created", label: "Created", w: 156 },
] as const;

type Row = { id: string; duration: string; created: string; at: number };

// Newest first. `at` is when the row lands at the top of the table.
const INCOMING: Row[] = [
  { id: "68a5f3c19d02", duration: "812ms", created: "just now", at: 150 },
  { id: "68a5f3b7e41a", duration: "764ms", created: "just now", at: 128 },
  { id: "68a5f3a02c9f", duration: "1.1s", created: "just now", at: 110 },
  { id: "68a5f39b5e13", duration: "903ms", created: "just now", at: 94 },
  { id: "68a5f391a7c4", duration: "847ms", created: "just now", at: 76 },
  { id: "68a5f37d0b58", duration: "926ms", created: "just now", at: 56 },
];
const OLDER: Row[] = [
  { id: "68a4d2e19a44", duration: "890ms", created: "45m ago", at: -1 },
  { id: "68a4c90f3e21", duration: "1.2s", created: "1h ago", at: -1 },
  { id: "68a4b7aa6d90", duration: "781ms", created: "2h ago", at: -1 },
  { id: "68a4a1c83f07", duration: "955ms", created: "3h ago", at: -1 },
  { id: "68a48e2b71c5", duration: "872ms", created: "5h ago", at: -1 },
  { id: "68a47b90e6d2", duration: "1.0s", created: "Yesterday", at: -1 },
  { id: "68a4690c4ab8", duration: "799ms", created: "Yesterday", at: -1 },
];

const insert = (frame: number, at: number) => ease.out(clamp((frame - at) / 14));

const Cell: React.FC<{ w: number; children: React.ReactNode; first?: boolean }> = ({ w, children, first }) => (
  <div
    style={{
      width: w,
      flexShrink: 0,
      paddingLeft: first ? 24 : 12,
      paddingRight: 12,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
    }}
  >
    {children}
  </div>
);

export const S6Executions: React.FC = () => {
  const frame = useCurrentFrame();

  const enter = prog(frame, -8, 30, ease.out);
  const K = mix(K0, K0 * 1.035, prog(frame, 0, 240, ease.linear));
  const exit = prog(frame, 214, 26, ease.in);

  // How many rows have been pushed in (smooth)
  const pushed = INCOMING.reduce((n, r) => n + insert(frame, r.at), 0);
  const counter = INCOMING.filter((r) => frame >= r.at).length;

  const rows: { r: Row; y: number; fresh: number; alpha: number; key: string }[] = [];
  INCOMING.forEach((r) => {
    if (frame < r.at) return;
    const newer = INCOMING.filter((o) => o.at > r.at).reduce((n, o) => n + insert(frame, o.at), 0);
    const t = insert(frame, r.at);
    rows.push({ r, y: newer * ROW_H, fresh: 1 - clamp((frame - r.at) / 60), alpha: t, key: r.id });
  });
  OLDER.forEach((r, i) => {
    const y = (i + pushed) * ROW_H;
    rows.push({ r, y, fresh: 0, alpha: 1 - clamp((y - (VISIBLE - 1) * ROW_H) / ROW_H), key: r.id });
  });

  const tableH = HEAD_H + VISIBLE * ROW_H;
  const panelH = 64 + tableH + 1;

  return (
    <AbsoluteFill style={{ backgroundColor: color.void }}>
      <Backdrop
        grid={{ opacity: 0.04, size: 44 }}
        glows={[
          { x: 960, y: 640, size: 1600, color: "rgba(253,54,110,0.10)", opacity: 0.9 },
          { x: 1500, y: 300, size: 1100, color: "rgba(155,138,255,0.09)", opacity: 0.8 },
        ]}
        grain={0}
        vignette={0}
      />

      <AbsoluteFill
        style={{
          transform: `translateY(${(1 - enter) * 380 - exit * 60}px)`,
          opacity: clamp(enter * 1.5) * (1 - exit),
          filter: exit > 0.02 ? `blur(${exit * 10}px)` : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 92,
            width: WIDTH,
            textAlign: "center",
            fontFamily: font.display,
            fontSize: 66,
            letterSpacing: "-0.03em",
            color: color.foreground,
          }}
        >
          <Reveal text="Every email is an execution." start={10} stagger={3} dur={22} unitStyle={(k) => (k === 1 ? { color: color.pink } : undefined)} />
        </div>

        {/* console panel, tilted in depth */}
        <div
          style={{
            position: "absolute",
            left: (WIDTH - TABLE_W * K) / 2,
            top: 236,
            width: TABLE_W,
            height: panelH,
            transformOrigin: "0 0",
            transform: `perspective(${2600 / K}px) translate(${(TABLE_W / 2) * K * 0}px, 0px) scale(${K}) rotateX(${mix(16, 5, prog(frame, 0, 240, ease.outSoft))}deg) rotateY(${mix(-14, -4, prog(frame, 0, 240, ease.outSoft))}deg)`,
            borderRadius: 14,
            border: `1px solid ${color.border}`,
            backgroundColor: color.background,
            boxShadow: "0 40px 80px rgba(0,0,0,0.55)",
            overflow: "hidden",
            fontFamily: font.ui,
          }}
        >
          {/* filter bar */}
          <div
            style={{
              height: 64,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 24px",
              borderBottom: `1px solid ${color.border}`,
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 32,
                padding: "0 12px",
                borderRadius: 8,
                border: `1px solid ${color.muted}`,
                color: color.mutedForeground,
                fontSize: 13,
              }}
            >
              <ListFilter size={14} />
              Filters
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 32,
                padding: "0 10px 0 12px",
                borderRadius: 8,
                backgroundColor: "rgba(253,54,110,0.1)",
                border: "1px solid rgba(253,54,110,0.4)",
                color: color.foreground,
                fontSize: 13,
                opacity: prog(frame, 20, 12),
                transform: `scale(${mix(0.9, 1, prog(frame, 20, 14, ease.backOut))})`,
              }}
            >
              <span style={{ color: color.mutedForeground }}>Trigger is</span>
              <span style={{ fontWeight: 600 }}>Email</span>
              <X size={13} color={color.mutedForeground} />
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 13, color: color.mutedForeground, fontVariantNumeric: "tabular-nums" }}>
              <span style={{ color: color.foreground, fontWeight: 600 }}>{128 + counter}</span> executions today
            </span>
          </div>

          {/* table header */}
          <div style={{ display: "flex", height: HEAD_H, borderBottom: `1px solid ${color.border}` }}>
            {COLS.map((c, i) => (
              <Cell key={c.key} w={c.w} first={i === 0}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: color.mutedForeground }}>
                  {c.label}
                </span>
              </Cell>
            ))}
          </div>

          {/* rows */}
          <div style={{ position: "relative", height: VISIBLE * ROW_H, overflow: "hidden" }}>
            {rows.map(({ r, y, fresh, alpha, key }) => (
              <div
                key={key}
                style={{
                  position: "absolute",
                  left: 0,
                  top: y,
                  width: TABLE_W,
                  height: ROW_H,
                  display: "flex",
                  borderBottom: `1px solid ${color.border}`,
                  boxSizing: "border-box",
                  opacity: alpha,
                  backgroundColor: fresh > 0 ? `rgba(253,54,110,${0.1 * fresh})` : undefined,
                  boxShadow: fresh > 0 ? `inset 3px 0 0 rgba(253,54,110,${fresh})` : undefined,
                }}
              >
                <Cell w={COLS[0].w} first>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: font.mono, fontSize: 13, color: color.foreground }}>
                    {r.id}
                    <Copy size={12} color="rgba(159,159,169,0.6)" />
                  </span>
                </Cell>
                <Cell w={COLS[1].w}>
                  <Badge variant="completed" size={11}>
                    Completed
                  </Badge>
                </Cell>
                <Cell w={COLS[2].w}>
                  <Badge variant="secondary" size={11}>
                    Email
                  </Badge>
                </Cell>
                <Cell w={COLS[3].w}>
                  <Badge variant="success" size={11} style={{ fontFamily: font.mono }}>
                    200
                  </Badge>
                </Cell>
                <Cell w={COLS[4].w}>
                  <span style={{ fontFamily: font.mono, fontSize: 13, color: color.foreground }}>POST</span>
                </Cell>
                <Cell w={COLS[5].w}>
                  <span style={{ fontFamily: font.mono, fontSize: 13, color: color.foreground }}>/</span>
                </Cell>
                <Cell w={COLS[6].w}>
                  <span style={{ fontSize: 13, color: color.foreground }}>{r.duration}</span>
                </Cell>
                <Cell w={COLS[7].w}>
                  <span style={{ fontSize: 13, color: r.created === "just now" ? color.foreground : color.mutedForeground }}>{r.created}</span>
                </Cell>
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>

      <FilmOverlay grain={0.045} vignette={0.5} />
    </AbsoluteFill>
  );
};
