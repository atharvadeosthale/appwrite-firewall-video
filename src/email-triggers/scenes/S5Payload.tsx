import { Braces, Check } from "lucide-react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, FilmOverlay } from "../components/Backdrop";
import { Reveal } from "../components/Reveal";
import { CODE_LINES, colOf, JSON_LINES, Kind, Line } from "../data/code";
import { clamp, ease, keys, mix, prog } from "../lib/anim";
import { code, color, font } from "../theme";
import { WIDTH } from "../timeline";

// ---- layout --------------------------------------------------------------
const FS = 18; // mono font size
const CW = FS * 0.6; // char width
const LH = 29; // line height
const PANEL_W = 772;
const HEADER = 54;
const PAD_Y = 22;
const PAD_X = 26;
const GUTTER = 42;
const PANEL_TOP = 238;
const LINES = 20;
const FOOTER = 50;
const PANEL_H = HEADER + PAD_Y * 2 + LINES * LH + FOOTER;
const GAP = 112;
const JSON_X = (WIDTH - PANEL_W * 2 - GAP) / 2;
const CODE_X = JSON_X + PANEL_W + GAP;

const lineY = (i: number) => PANEL_TOP + HEADER + PAD_Y + i * LH + LH / 2;
const jsonColX = (col: number) => JSON_X + PAD_X + col * CW;
const codeColX = (col: number) => CODE_X + PAD_X + GUTTER + col * CW;

const KIND_COLOR: Record<Kind, string> = {
  key: code.property,
  str: code.string,
  num: code.number,
  punc: code.punctuation,
  kw: code.keyword,
  fn: code.fn,
  id: code.plain,
  prop: code.property,
  com: code.comment,
  plain: code.punctuation,
};

// Field links: JSON line/key ↔ code line/token
const LINKS = [
  { at: 146, json: 1, key: '"id"', codeLine: 10, token: "email.id" },
  { at: 170, json: 6, key: '"from"', codeLine: 12, token: "email.from" },
  { at: 190, json: 7, key: '"subject"', codeLine: 13, token: "email.subject" },
  { at: 210, json: 8, key: '"text"', codeLine: 14, token: "email.text" },
];
const HEADER_AT = 96;
const BODYJSON_AT = 122;
const PAYOFF_AT = 262;
const DONE_AT = 300;
const EXIT_AT = 450;

const LineView: React.FC<{ line: Line }> = ({ line }) => (
  <>
    {line.map(([t, kind], i) => (
      <span key={i} style={{ color: KIND_COLOR[kind] }}>
        {t}
      </span>
    ))}
  </>
);

/** Rounded highlight behind a column span of one line. */
const Mark: React.FC<{ x: number; y: number; chars: number; t: number; strong?: boolean }> = ({ x, y, chars, t, strong }) => (
  <div
    style={{
      position: "absolute",
      left: x - 5,
      top: y - LH / 2 + 1,
      width: (chars * CW + 10) * ease.out(clamp(t)),
      height: LH - 2,
      borderRadius: 7,
      backgroundColor: `rgba(253,54,110,${strong ? 0.22 : 0.14})`,
      boxShadow: `inset 0 0 0 1px rgba(253,54,110,${strong ? 0.75 : 0.45})`,
      opacity: clamp(t * 3),
    }}
  />
);

export const S5Payload: React.FC = () => {
  const frame = useCurrentFrame();

  // entrance: JSON panel resolves out of the S4 whip, code panel slides in
  const jsonIn = prog(frame, -1, 26, ease.out);
  const codeIn = prog(frame, 12, 30, ease.out);
  const exit = prog(frame, EXIT_AT, 30, ease.in);

  const headlineA = 1 - prog(frame, 114, 12, ease.in);
  const bodyGlow = keys(frame, [BODYJSON_AT, BODYJSON_AT + 8, BODYJSON_AT + 60], [0, 1, 0.35], [ease.out, ease.inOut]);
  const done = prog(frame, DONE_AT, 16, ease.out);
  const headerHot = keys(frame, [HEADER_AT, HEADER_AT + 8, HEADER_AT + 50], [0, 1, 0.3], [ease.out, ease.inOut]);
  const doneGlow = keys(frame, [DONE_AT, DONE_AT + 8, DONE_AT + 60], [0, 1, 0], [ease.out, ease.inOut]);

  // Guided camera: close on the payload, pull back, push into the links,
  // pull back for the payoff, then drift toward the result.
  const driftY = mix(10, -10, prog(frame, 0, 480, ease.linear));
  const jsonCx = JSON_X + PANEL_W / 2;
  const midY = PANEL_TOP + PANEL_H / 2;
  const camT = [0, 70, 118, 160, 236, 266, 330, 450];
  const camFx = keys(frame, camT, [jsonCx, 960, 960, 1000, 1000, 960, 960, 1080], ease.inOutSoft);
  const camFy = keys(frame, camT, [midY, midY - 2, midY - 2, midY + 30, midY + 30, midY - 2, midY - 2, midY + 30], ease.inOutSoft);
  const camS = keys(frame, camT, [1.42, 1, 1, 1.14, 1.19, 1, 1, 1.07], ease.inOutSoft);
  const camera = `translate(${WIDTH / 2}px, ${540 + (midY - 540)}px) scale(${camS}) translate(${-camFx}px, ${-camFy}px)`;

  const panelStyle = (x: number, glow: number): React.CSSProperties => ({
    position: "absolute",
    left: x,
    top: PANEL_TOP,
    width: PANEL_W,
    height: PANEL_H,
    borderRadius: 24,
    background: "linear-gradient(180deg, #19191d 0%, #131316 100%)",
    border: `1.5px solid ${glow > 0.02 ? `rgba(253,54,110,${0.25 + 0.5 * glow})` : "rgba(255,255,255,0.08)"}`,
    boxShadow: `0 50px 100px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)${glow > 0.02 ? `, 0 0 ${70 * glow}px rgba(253,54,110,${0.22 * glow})` : ""}`,
    overflow: "hidden",
    boxSizing: "border-box",
  });

  const header = (title: string, icon: React.ReactNode, right: React.ReactNode) => (
    <div
      style={{
        height: HEADER,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: `0 ${PAD_X}px`,
        borderBottom: `1px solid ${color.border}`,
        backgroundColor: "rgba(255,255,255,0.015)",
        boxSizing: "border-box",
      }}
    >
      {icon}
      <span style={{ flex: 1, fontFamily: font.ui, fontSize: 17, fontWeight: 600, color: color.foreground }}>{title}</span>
      {right}
    </div>
  );

  const chip = (text: string, tone: "pink" | "muted") => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 28,
        padding: "0 11px",
        borderRadius: 8,
        fontFamily: font.mono,
        fontSize: 13,
        flexShrink: 0,
        backgroundColor: tone === "pink" ? "rgba(253,54,110,0.12)" : color.muted,
        color: tone === "pink" ? color.pink : color.mutedForeground,
      }}
    >
      {text}
    </span>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: color.void }}>
      <Backdrop
        grid={{ opacity: 0.04, size: 44, y: driftY * 0.5 }}
        glows={[
          { x: 520, y: 600, size: 1300, color: "rgba(253,54,110,0.12)", opacity: 0.9 },
          { x: 1420, y: 520, size: 1300, color: "rgba(155,138,255,0.10)", opacity: 0.8 },
        ]}
        grain={0}
        vignette={0}
      />

      <AbsoluteFill
        style={{
          transform: `translateY(${driftY - exit * 420}px)`,
          opacity: 1 - ease.in(exit),
          filter: exit > 0.02 ? `blur(${exit * 10}px)` : undefined,
        }}
      >
        {/* headlines */}
        <div
          style={{
            position: "absolute",
            top: 96,
            width: WIDTH,
            textAlign: "center",
            fontFamily: font.display,
            fontSize: 66,
            letterSpacing: "-0.03em",
            color: color.foreground,
            opacity: headlineA,
          }}
        >
          <Reveal text="Your function receives clean JSON." start={44} stagger={3} dur={24} />
        </div>
        {frame >= PAYOFF_AT - 8 ? (
          <div
            style={{
              position: "absolute",
              top: 96,
              width: WIDTH,
              textAlign: "center",
              fontFamily: font.display,
              fontSize: 66,
              letterSpacing: "-0.03em",
              color: color.foreground,
            }}
          >
            <Reveal
              text="No MIME parser. No mail server."
              start={PAYOFF_AT}
              stagger={3}
              dur={22}
              unitStyle={(k) => (k === 0 || k === 3 ? { color: color.pink } : undefined)}
            />
          </div>
        ) : null}

        <div style={{ position: "absolute", left: 0, top: 0, width: WIDTH, height: 1080, transformOrigin: "0 0", transform: camera }}>
        {/* JSON panel */}
        <div
          style={{
            ...panelStyle(JSON_X, bodyGlow),
            opacity: mix(0.65, 1, jsonIn),
            transformOrigin: "50% 40%",
            transform: `scale(${mix(1.6, 1, jsonIn)})`,
            filter: jsonIn < 1 ? `blur(${(1 - jsonIn) * 22}px)` : undefined,
          }}
        >
          {header(
            "Request body",
            <Braces size={20} color={color.pink} strokeWidth={2} />,
            chip("req.bodyJson", "pink"),
          )}
          <div style={{ padding: `${PAD_Y}px ${PAD_X}px`, fontFamily: font.mono, fontSize: FS, lineHeight: `${LH}px`, whiteSpace: "pre" }}>
            {JSON_LINES.map((l, i) => (
              <div key={i} style={{ height: LH }}>
                <LineView line={l} />
              </div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: FOOTER,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: `0 ${PAD_X}px`,
              borderTop: `1px solid ${color.border}`,
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontFamily: font.ui, fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", color: color.mutedForeground, marginRight: 6 }}>
              HEADERS
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 30,
                padding: "0 12px",
                borderRadius: 8,
                fontFamily: font.mono,
                fontSize: 14,
                whiteSpace: "pre",
                backgroundColor: `rgba(253,54,110,${0.08 + 0.14 * headerHot})`,
                boxShadow: `inset 0 0 0 1px rgba(253,54,110,${0.25 + 0.5 * headerHot})`,
                color: color.foreground,
              }}
            >
              x-appwrite-trigger: <span style={{ color: color.pink }}>email</span>
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 30,
                padding: "0 12px",
                borderRadius: 8,
                fontFamily: font.mono,
                fontSize: 14,
                whiteSpace: "pre",
                backgroundColor: color.muted,
                color: color.mutedForeground,
              }}
            >
              x-appwrite-email-id: 5f0c2a9e…
            </span>
          </div>
        </div>

        {/* code panel */}
        <div
          style={{
            ...panelStyle(CODE_X, 0),
            opacity: codeIn,
            transform: `translateX(${(1 - codeIn) * 140}px)`,
            borderColor: doneGlow > 0.02 ? `oklch(0.696 0.17 162.48 / ${0.2 + 0.5 * doneGlow})` : undefined,
            boxShadow: `0 50px 100px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 ${80 * doneGlow}px oklch(0.696 0.17 162.48 / ${0.25 * doneGlow})`,
          }}
        >
          {header(
            "src/main.js",
            <Img src={staticFile("email-triggers/icons/node.svg")} style={{ width: 20, height: 20 }} />,
            chip("Node.js", "muted"),
          )}
          <div style={{ padding: `${PAD_Y}px ${PAD_X}px`, fontFamily: font.mono, fontSize: FS, lineHeight: `${LH}px`, whiteSpace: "pre" }}>
            {CODE_LINES.map((l, i) => {
              const t = prog(frame, 30 + i * 3.4, 12, ease.out);
              return (
                <div key={i} style={{ height: LH, display: "flex", opacity: t, transform: `translateX(${(1 - t) * 14}px)` }}>
                  <span style={{ width: GUTTER, flexShrink: 0, color: "#4b4b54" }}>{String(i + 1).padStart(2, " ")}</span>
                  <span>
                    <LineView line={l} />
                  </span>
                </div>
              );
            })}
          </div>
          {/* status bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: FOOTER,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: `0 ${PAD_X}px`,
              borderTop: `1px solid ${color.border}`,
              backgroundColor: `rgba(16,185,129,${0.06 * done})`,
              fontFamily: font.mono,
              fontSize: 15,
              color: color.mutedForeground,
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: done > 0.5 ? "oklch(0.696 0.17 162.48 / 0.18)" : color.muted,
              }}
            >
              {done > 0.5 ? <Check size={13} color="oklch(0.765 0.177 163.223)" strokeWidth={3} /> : null}
            </span>
            <span style={{ color: done > 0.5 ? "oklch(0.765 0.177 163.223)" : color.mutedForeground }}>
              {done > 0.5 ? "Completed" : "Waiting for email"}
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ opacity: done }}>log: Saved email 5f0c2a9e…</span>
          </div>
        </div>

        {/* highlights */}
        {frame >= HEADER_AT ? (
          <Mark
            x={codeColX(colOf(CODE_LINES[1], "req.headers"))}
            y={lineY(1)}
            chars={"req.headers['x-appwrite-trigger'] !== 'email'".length}
            t={prog(frame, HEADER_AT, 12)}
          />
        ) : null}
        {frame >= BODYJSON_AT ? (
          <Mark x={codeColX(colOf(CODE_LINES[5], "req.bodyJson"))} y={lineY(5)} chars={12} t={prog(frame, BODYJSON_AT, 10)} strong />
        ) : null}
        {LINKS.map((l) => {
          const t = prog(frame, l.at, 12);
          if (t <= 0) return null;
          const jl = JSON_LINES[l.json];
          const jCol = colOf(jl, l.key);
          const jText = jl.map((s) => s[0]).join("");
          const jLen = jText.length - jCol - (jText.endsWith(",") ? 1 : 0);
          const cCol = colOf(CODE_LINES[l.codeLine], l.token);
          return (
            <div key={l.key}>
              <Mark x={jsonColX(jCol)} y={lineY(l.json)} chars={jLen} t={t} />
              <Mark x={codeColX(cCol)} y={lineY(l.codeLine)} chars={l.token.length} t={prog(frame, l.at + 8, 12)} strong />
            </div>
          );
        })}

        {/* connectors across the gap */}
        <svg width={WIDTH} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <defs>
            <linearGradient id="linkGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fd366e" stopOpacity={0.5} />
              <stop offset="1" stopColor="#fd366e" stopOpacity={1} />
            </linearGradient>
          </defs>
          {LINKS.map((l) => {
            const draw = prog(frame, l.at + 2, 16, ease.inOut);
            if (draw <= 0) return null;
            const x1 = JSON_X + PANEL_W + 4;
            const x2 = CODE_X - 4;
            const y1 = lineY(l.json);
            const y2 = lineY(l.codeLine);
            const d = `M ${x1} ${y1} C ${x1 + GAP * 0.6} ${y1}, ${x2 - GAP * 0.6} ${y2}, ${x2} ${y2}`;
            const settled = keys(frame, [l.at + 18, l.at + 60], [1, 0.55], ease.inOut);
            return (
              <g key={l.key} opacity={settled}>
                <path d={d} fill="none" stroke="url(#linkGrad)" strokeWidth={2.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
                <circle cx={x1} cy={y1} r={4.5} fill="#fd366e" opacity={clamp(draw * 4)} />
                <circle cx={x2} cy={y2} r={4.5} fill="#fd366e" opacity={draw > 0.95 ? 1 : 0} />
              </g>
            );
          })}
        </svg>
        </div>
      </AbsoluteFill>

      <FilmOverlay grain={0.045} vignette={0.5} />
    </AbsoluteFill>
  );
};
