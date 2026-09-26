import { useCurrentFrame } from "remotion";
import { clamp, ease } from "../lib/anim";

type Props = {
  text: string;
  start: number;
  /** frames between units */
  stagger?: number;
  /** frames each unit takes to settle */
  dur?: number;
  by?: "word" | "char";
  /** 0..1, when > 0 the text leaves (same stagger, reversed direction) */
  exit?: { start: number; dur?: number; stagger?: number };
  rise?: number; // em
  blur?: number; // px
  style?: React.CSSProperties;
  unitStyle?: (index: number, unit: string) => React.CSSProperties | undefined;
};

/** Staggered rise + unblur text reveal. Spaces are kept as real spaces so
 * kerning and line wrapping match the static layout. */
export const Reveal: React.FC<Props> = ({
  text,
  start,
  stagger = 3,
  dur = 26,
  by = "word",
  exit,
  rise = 0.42,
  blur = 10,
  style,
  unitStyle,
}) => {
  const frame = useCurrentFrame();
  const units = by === "word" ? text.split(/(\s+)/) : Array.from(text);
  let visibleIndex = 0;
  return (
    <span style={{ display: "inline", whiteSpace: "pre-wrap", ...style }}>
      {units.map((u, i) => {
        if (/^\s+$/.test(u)) return <span key={i}>{u}</span>;
        const k = visibleIndex++;
        const tIn = ease.out(clamp((frame - start - k * stagger) / dur));
        let tOut = 0;
        if (exit) {
          tOut = ease.in(clamp((frame - exit.start - k * (exit.stagger ?? 1)) / (exit.dur ?? 14)));
        }
        const y = (1 - tIn) * rise - tOut * rise * 0.6;
        const b = (1 - tIn) * blur + tOut * blur * 0.6;
        const o = tIn * (1 - tOut);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: o,
              transform: `translateY(${y}em)`,
              filter: b > 0.05 ? `blur(${b}px)` : undefined,
              ...unitStyle?.(k, u),
            }}
          >
            {u}
          </span>
        );
      })}
    </span>
  );
};
