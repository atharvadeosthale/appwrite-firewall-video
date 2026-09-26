import { clamp, ease, mix } from "../lib/anim";
import { EMAIL, color, font } from "../theme";
import { WIDTH } from "../timeline";

export const HERO_SIZE = 60;
export const CHAR_W = HERO_SIZE * 0.6; // Source Code Pro advance is 600/1000
const DOMAIN_LEN = 1 + EMAIL.functionId.length + 1 + EMAIL.zone.length; // "@" id "." zone

export type Roll = { at: number; word: string };

/** Current and previous local-part for a roll schedule at `frame`. */
export const rollState = (frame: number, rolls: Roll[]) => {
  let k = 0;
  for (let i = 0; i < rolls.length; i++) if (frame >= rolls[i].at) k = i;
  const cur = rolls[k];
  const prev = rolls[Math.max(0, k - 1)];
  const p = k === 0 ? 1 : ease.out(clamp((frame - cur.at) / 14));
  const len = mix(prev.word.length, cur.word.length, ease.out(clamp((frame - cur.at) / 14)));
  return { cur, prev, p, len, k };
};

/** Geometry of the address line for annotations (screen x). */
export const addressGeometry = (localLen: number, cx = WIDTH / 2) => {
  const total = (localLen + DOMAIN_LEN) * CHAR_W;
  const left = cx - total / 2;
  const at = left + localLen * CHAR_W;
  const idStart = at + CHAR_W;
  const idEnd = idStart + EMAIL.functionId.length * CHAR_W;
  const zoneStart = idEnd + CHAR_W;
  const zoneEnd = zoneStart + EMAIL.zone.length * CHAR_W;
  return { left, at, idStart, idEnd, zoneStart, zoneEnd, total };
};

/** The built-in address with a rolling local part. */
export const HeroAddress: React.FC<{
  frame: number;
  rolls: Roll[];
  y: number;
  colorize: number; // 0 = all foreground (matches the console chip), 1 = accent scheme
  opacity?: number;
  cx?: number;
}> = ({ frame, rolls, y, colorize, opacity = 1, cx = WIDTH / 2 }) => {
  const { cur, prev, p, len } = rollState(frame, rolls);
  const g = addressGeometry(len, cx);
  const c = (to: string) =>
    colorize <= 0 ? color.foreground : `color-mix(in oklab, ${color.foreground} ${Math.round((1 - colorize) * 100)}%, ${to})`;
  const word = (w: string, t: number, dir: 1 | -1) => (
    <span
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        whiteSpace: "pre",
        transform: `translateY(${dir * (1 - t) * 0.85}em)`,
        opacity: t,
        filter: t < 1 ? `blur(${(1 - t) * 6}px)` : undefined,
      }}
    >
      {w}
    </span>
  );
  return (
    <div
      style={{
        position: "absolute",
        left: g.left,
        top: y - HERO_SIZE * 0.75,
        height: HERO_SIZE * 1.5,
        display: "flex",
        alignItems: "center",
        fontFamily: font.mono,
        fontSize: HERO_SIZE,
        lineHeight: `${HERO_SIZE * 1.5}px`,
        fontWeight: 500,
        whiteSpace: "pre",
        opacity,
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: len * CHAR_W,
          height: HERO_SIZE * 1.5,
          color: c(color.pink),
          overflow: "hidden",
          textShadow: colorize > 0 ? `0 0 ${28 * colorize}px rgba(253,54,110,${0.45 * colorize})` : undefined,
        }}
      >
        {cur === prev ? word(cur.word, 1, 1) : (
          <>
            {word(prev.word, 1 - p, -1)}
            {word(cur.word, p, 1)}
          </>
        )}
      </span>
      <span style={{ color: c(color.mutedForeground) }}>@</span>
      <span style={{ color: color.foreground }}>{EMAIL.functionId}</span>
      <span style={{ color: c(color.mutedForeground) }}>.{EMAIL.zone}</span>
    </div>
  );
};

/** Bracket with a label under a span of the address. */
export const Bracket: React.FC<{
  x1: number;
  x2: number;
  y: number;
  label: string;
  t: number;
  tint?: string;
}> = ({ x1, x2, y, label, t, tint = color.mutedForeground }) => {
  const draw = ease.inOut(clamp(t));
  const w = x2 - x1;
  return (
    <div style={{ position: "absolute", left: x1, top: y, width: w, opacity: clamp(t * 3) }}>
      <svg width={w} height={18} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path
          d={`M 1 0 L 1 10 L ${w - 1} 10 L ${w - 1} 0`}
          fill="none"
          stroke={tint}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 26,
          left: -200,
          width: w + 400,
          textAlign: "center",
          fontFamily: font.ui,
          fontSize: 27,
          color: tint,
          opacity: clamp(t * 2 - 0.4),
          transform: `translateY(${(1 - ease.out(clamp(t * 1.5))) * 12}px)`,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
};
