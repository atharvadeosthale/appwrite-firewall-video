import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, EASE, rgba } from "../theme";
import { AEONIK, MONO } from "../fonts";
import { clamp01, lerp, prog, tween } from "../lib/anim";
import { makeLogs, type Flag, type LogRow } from "../data/logs";
import { Cursor, Words } from "../components/Type";
import { Glows } from "../components/Atmosphere";

// Beat grid: 24 frames per beat (150 BPM at 60 fps).
export const S1_DURATION = 336;

const ROW_H = 40;
const ANCHOR_Y = 1010; // top of the newest row, in stage px
const LEFT = 150;
const CH = 13.2; // Source Code Pro advance at 22px
const HISTORY = 30; // rows already in the log before the first request

const COLS = { time: 0, method: 14, path: 21, ip: 66, cc: 83, ua: 88, status: 112, ms: 117 };

const FLAG_COLOR: Record<Flag, string> = {
  none: C.muted,
  brute: C.deny,
  scraper: C.rateLimit,
  bot: C.challenge,
  sms: C.rateLimit,
  flood: C.pink,
};

const statusColor = (s: number) =>
  s === 429 ? C.rateLimitText : s >= 400 ? C.denyText : s >= 300 ? C.redirectText : C.passedText;

const BEATS: Array<{ at: number; word: string; flags: Flag[]; color: string }> = [
  { at: 120, word: "Scrapers", flags: ["scraper"], color: C.rateLimit },
  { at: 144, word: "Bots", flags: ["bot"], color: C.challenge },
  { at: 168, word: "Brute force", flags: ["brute"], color: C.deny },
  { at: 192, word: "Floods", flags: ["flood", "sms"], color: C.pink },
];
const BEAT_LEN = 24;
const HEADLINE_AT = 216;
const COLLAPSE_AT = 306;
const TYPE_AT = 22;
const FIRST = HISTORY; // index of the typed request

const arrivals = (n: number) => {
  const a: number[] = [];
  for (let i = 0; i < HISTORY; i++) a.push(-1000 + i);
  a.push(TYPE_AT);
  let t = 62;
  for (let i = HISTORY + 1; i < n; i++) {
    a.push(t);
    const k = i - HISTORY;
    t += 1.1 + 7.5 * Math.exp(-k / 8);
  }
  return a;
};

const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

const REQUEST = "GET    /v1/account";

const Row: React.FC<{
  row: LogRow;
  y: number;
  opacity: number;
  highlight: number;
  dim: number;
  typed?: { chars: number; cursorOn: boolean; rest: number };
  collapse: number;
}> = ({ row, y, opacity, highlight, dim, typed, collapse }) => {
  const flagColor = FLAG_COLOR[row.flag];
  const hl = row.flag !== "none" ? highlight : 0;
  const fade = lerp(1, 0.3, dim * (1 - hl));
  const cell = (col: number, text: string, color: string, weight = 400) => (
    <span style={{ position: "absolute", left: col * CH, color, fontWeight: weight, whiteSpace: "pre" }}>
      {text}
    </span>
  );
  const rest = typed ? typed.rest : 1;
  const methodPath = `${row.method.padEnd(7, " ")}${row.path}`;
  const shown = typed ? methodPath.slice(0, typed.chars) : methodPath;
  return (
    <div
      style={{
        position: "absolute",
        left: LEFT,
        top: y,
        width: 1640,
        height: ROW_H,
        lineHeight: `${ROW_H}px`,
        fontFamily: MONO,
        fontSize: 22,
        opacity: opacity * fade * (1 - collapse),
        translate: `${collapse * 90}px 0`,
        scale: `${1 - collapse * 0.7} 1`,
        transformOrigin: "left center",
      }}
    >
      {hl > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: -18,
            right: -18,
            top: 3,
            bottom: 3,
            borderRadius: 6,
            background: rgba(flagColor, 0.16 * hl),
            boxShadow: `inset 3px 0 0 ${rgba(flagColor, hl)}`,
          }}
        />
      ) : null}
      <span style={{ opacity: rest }}>{cell(COLS.time, row.time, C.faint)}</span>
      <span
        style={{
          position: "absolute",
          left: COLS.method * CH,
          whiteSpace: "pre",
          color: hl > 0.5 ? flagColor : C.text,
        }}
      >
        {shown.slice(0, 7)}
        <span style={{ color: hl > 0.5 ? flagColor : "#d4d4d8" }}>{shown.slice(7)}</span>
        {typed ? (
          <span
            style={{
              display: "inline-block",
              width: CH * 0.9,
              height: 3,
              marginLeft: 2,
              background: C.pink,
              boxShadow: `0 0 10px ${C.pink}`,
              verticalAlign: "baseline",
              opacity: typed.cursorOn ? 1 - rest : 0,
            }}
          />
        ) : null}
      </span>
      <span style={{ opacity: rest }}>
        {cell(COLS.ip, row.ip, "#8b8b94")}
        {cell(COLS.cc, row.cc, C.faint)}
        {cell(COLS.ua, row.ua.length > 22 ? row.ua.slice(0, 21) + "…" : row.ua, C.faint)}
        {cell(COLS.status, String(row.status), statusColor(row.status), 600)}
        {cell(COLS.ms, `${row.ms}ms`, C.faint)}
      </span>
    </div>
  );
};

export const S1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const rows = useMemo(() => {
    const r = makeLogs(240, 11);
    // The typed request is a clean one.
    r[FIRST] = { ...r[FIRST], method: "GET", path: "/v1/account", status: 200, flag: "none", ua: "Mozilla/5.0 (Macintosh)" };
    return r;
  }, []);
  const arr = useMemo(() => arrivals(rows.length), [rows.length]);

  let S = 0;
  let Sprev = 0;
  for (let i = 0; i < arr.length; i++) {
    S += smooth((frame - arr[i]) / 7);
    Sprev += smooth((frame - 1 - arr[i]) / 7);
  }

  // Camera: tight on the first request, then pull back to reveal the flood.
  const zoom = tween(frame, [50, 132], [0, 1], EASE.inOut);
  const scale = lerp(3.4, 1, zoom);
  const reqCenterX = LEFT + (COLS.method + REQUEST.length / 2) * CH;
  const firstRowY = ANCHOR_Y + (FIRST + 1 - Math.min(S, FIRST + 1)) * ROW_H - ROW_H;
  const focusX = lerp(reqCenterX, 960, zoom);
  const focusY = lerp(firstRowY + ROW_H / 2, 540, zoom);

  let hlFlags: Flag[] = [];
  let hlAmt = 0;
  for (const b of BEATS) {
    if (frame >= b.at - 2 && frame < b.at + BEAT_LEN) {
      hlFlags = b.flags;
      hlAmt = tween(frame, [b.at - 2, b.at + 3], [0, 1]) * tween(frame, [b.at + BEAT_LEN - 6, b.at + BEAT_LEN], [1, 0]);
    }
  }
  const inBeats = frame >= BEATS[0].at - 2 && frame < BEATS[3].at + BEAT_LEN ? 1 : 0;

  // Impact shake on each beat word.
  let shake = 0;
  for (const bt of BEATS) {
    const d = frame - bt.at;
    if (d >= 0 && d < 10) shake = Math.max(shake, 1 - d / 10);
  }
  const shakeX = (Math.sin(frame * 12.9) * 9 + Math.sin(frame * 5.3) * 5) * shake;
  const shakeY = (Math.cos(frame * 11.1) * 6 + Math.sin(frame * 7.7) * 3) * shake;

  const headIn = prog(frame, HEADLINE_AT - 6, 30);
  const logBlur = lerp(0, 10, headIn);
  const logDim = lerp(1, 0.3, headIn);

  const typedChars = Math.floor(Math.max(0, frame - TYPE_AT) * 0.9);
  const typingDone = typedChars >= REQUEST.length;
  const cursorOn = frame < TYPE_AT ? Math.floor(frame / 12) % 2 === 0 : !typingDone || Math.floor((frame - TYPE_AT) / 12) % 2 === 0;
  const restIn = prog(frame, TYPE_AT + 26, 18);

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, overflow: "hidden" }}>
      <Glows
        glows={[
          { x: 10, y: 110, r: 950, color: rgba(C.pink, 0.24), opacity: tween(frame, [60, 200], [0, 1]) },
          { x: 94, y: -12, r: 820, color: rgba(C.indigo, 0.22), opacity: tween(frame, [80, 220], [0, 1]) },
        ]}
      />

      {/* Vertical motion blur, proportional to scroll speed (180° shutter). */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="s1-vblur" x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation={`0 ${Math.min(14, (S - Sprev) * ROW_H * scale * 0.22).toFixed(2)}`} />
        </filter>
      </svg>
      <AbsoluteFill
        style={{
          filter:
            [
              (S - Sprev) * ROW_H * scale > 2 ? "url(#s1-vblur)" : "",
              logBlur > 0.1 ? `blur(${logBlur}px)` : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined,
          opacity: logDim,
          translate: `${shakeX}px ${shakeY}px`,
        }}
      >
        <AbsoluteFill
          style={{
            transformOrigin: "0 0",
            translate: `${960 - focusX * scale}px ${540 - focusY * scale}px`,
            scale: `${scale}`,
          }}
        >
          {rows.map((row, i) => {
            if (frame < arr[i] - 1 && i !== FIRST) return null;
            const y = ANCHOR_Y + (i + 1 - S) * ROW_H - ROW_H;
            if (y < -ROW_H * 2 || y > 1080 + ROW_H) return null;
            let opacity: number;
            if (i < FIRST) {
              // History is revealed by the pull-back, nearest rows first.
              const dist = FIRST - i;
              opacity = prog(frame, 58 + dist * 2.2, 26) * 0.9;
            } else if (i === FIRST) {
              opacity = 1;
            } else {
              opacity = smooth((frame - arr[i]) / 5);
            }
            const hl = hlFlags.includes(row.flag) ? hlAmt : 0;
            const rowCollapse = prog(frame, COLLAPSE_AT + (1 - y / 1080) * 14 + (i % 7), 18, EASE.in);
            return (
              <Row
                key={i}
                row={row}
                y={y}
                opacity={opacity}
                highlight={hl}
                dim={inBeats}
                typed={i === FIRST ? { chars: typedChars, cursorOn, rest: restIn } : undefined}
                collapse={rowCollapse}
              />
            );
          })}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Rows burst into light streaks that hand over to the traffic streams */}
      {frame >= COLLAPSE_AT - 2 ? (
        <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
          {(() => {
            let Sc = 0;
            for (let k = 0; k < arr.length; k++) Sc += smooth((COLLAPSE_AT - arr[k]) / 7);
            const out: React.ReactNode[] = [];
            rows.forEach((row, i) => {
              const y0 = ANCHOR_Y + (i + 1 - Sc) * ROW_H - ROW_H + ROW_H / 2;
              if (frame < arr[i] || y0 < -20 || y0 > 1100) return;
              for (let j = 0; j < 2; j++) {
                const y = y0 + (j === 0 ? -6 : 7);
                const delay = (1 - y0 / 1080) * 10 + ((i * 3 + j * 5) % 9) * 1.1;
                const t = frame - (COLLAPSE_AT + delay);
                if (t < 0) continue;
                const speed = j === 0 ? 11 : 7.5;
                const head = LEFT + 60 + j * 180 + Math.pow(t, 1.85) * speed;
                const tailLen = Math.min(head + 40, 160 + t * (j === 0 ? 70 : 48));
                const color = row.flag !== "none" ? FLAG_COLOR[row.flag] : "#ff7aa2";
                const alpha = Math.min(1, t / 3) * (1 - prog(t, 16, 16, EASE.in));
                out.push(
                  <div
                    key={`${i}-${j}`}
                    style={{
                      position: "absolute",
                      left: head - tailLen,
                      top: y - (j === 0 ? 2 : 1.5),
                      width: tailLen,
                      height: j === 0 ? 4 : 3,
                      borderRadius: 4,
                      background: `linear-gradient(90deg, transparent 0%, ${rgba(color, 0.55)} 65%, #ffffff 100%)`,
                      boxShadow: `0 0 16px ${rgba(color, 0.9)}`,
                      opacity: alpha,
                    }}
                  />,
                );
              }
            });
            return out;
          })()}
        </AbsoluteFill>
      ) : null}

      {BEATS.map((b, i) => {
        if (frame < b.at || frame >= b.at + BEAT_LEN) return null;
        const local = frame - b.at;
        const inP = prog(local, 0, 6, EASE.out);
        const outP = prog(local, BEAT_LEN - 5, 5, EASE.in);
        return (
          <AbsoluteFill key={i} style={{ justifyContent: "center", alignItems: "center" }}>
            <div
              style={{
                position: "absolute",
                width: 1500,
                height: 560,
                background:
                  "radial-gradient(ellipse at center, rgba(11,11,14,0.88) 0%, rgba(11,11,14,0.62) 42%, transparent 70%)",
              }}
            />
            <div
              style={{
                fontFamily: AEONIK,
                fontSize: 216,
                fontWeight: 500,
                letterSpacing: "-0.045em",
                color: C.fg,
                scale: `${lerp(1.07, 1, inP) + outP * 0.025}`,
                opacity: inP * (1 - outP),
                filter: `blur(${(1 - inP) * 14 + outP * 10}px)`,
                textShadow: (() => {
                  const g = Math.max(0, 1 - local / 7);
                  if (g <= 0) return undefined;
                  const dx = 14 * g;
                  return `${-dx}px 0 rgba(255,40,90,${0.85 * g}), ${dx}px 0 rgba(40,210,255,${0.7 * g})`;
                })(),
                translate: `${local < 4 ? (local % 2 === 0 ? 6 : -5) : 0}px 0`,
              }}
            >
              {b.word}
              <span style={{ color: b.color }}>.</span>
            </div>
          </AbsoluteFill>
        );
      })}

      {frame >= HEADLINE_AT - 8 ? (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              textAlign: "center",
              fontSize: 128,
              fontWeight: 400,
              letterSpacing: "-0.04em",
              lineHeight: 1.04,
              color: C.fg,
            }}
          >
            <Words text="Every app gets traffic" start={HEADLINE_AT} stagger={4} dur={30} exit={COLLAPSE_AT - 8} exitDur={18} />
            <Words
              text="it never asked for"
              start={HEADLINE_AT + 14}
              stagger={4}
              dur={30}
              exit={COLLAPSE_AT - 4}
              exitDur={18}
              after={<Cursor size={128} blinkFrom={HEADLINE_AT + 54} appear={HEADLINE_AT + 30} />}
            />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
