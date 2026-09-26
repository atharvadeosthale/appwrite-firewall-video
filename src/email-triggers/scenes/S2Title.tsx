import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, FilmOverlay } from "../components/Backdrop";
import { AppwriteMark } from "../components/Logo";
import { Streaks } from "../components/Streaks";
import { clamp, ease, keys, mix, prog } from "../lib/anim";
import { color, font } from "../theme";
import { BEAT, HEIGHT, WIDTH } from "../timeline";

// vibes .text-gradient-brand (dark variant)
export const BRAND_GRADIENT =
  "linear-gradient(145deg, color-mix(in oklch, #fd366e 55%, #fafafa) 0%, color-mix(in oklch, #fd366e 88%, #fafafa) 28%, #fafafa 62%)";

export const TITLE_SIZE = 168;
export const TITLE_Y = 500; // vertical center of the title line
// Advance widths from AeonikPro-Regular (upm 1000) with -0.035em tracking.
const EM = TITLE_SIZE;
const W_EMAIL = (2.352 - 5 * 0.035) * EM;
const W_SPACE = (0.262 - 0.035) * EM;
const W_TRIGGERS = (3.436 - 8 * 0.035) * EM;
const W_TOTAL = W_EMAIL + W_SPACE + W_TRIGGERS;

const gradientText = (offset: number): React.CSSProperties => ({
  // Flex items are only one line tall; pad so descenders stay inside the box
  // that background-clip: text paints.
  paddingBottom: EM * 0.3,
  backgroundImage: BRAND_GRADIENT,
  backgroundSize: `${W_TOTAL}px ${EM * 1.4}px`,
  backgroundPosition: `${-offset}px 0px`,
  backgroundRepeat: "no-repeat",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
});

export const S2Title: React.FC = () => {
  const frame = useCurrentFrame();

  // Explosion from the point S1 collapsed into.
  const flash = keys(frame, [0, 3, 18], [0.9, 1, 0], [ease.out, ease.outSoft]);
  const shock = prog(frame, 0, 56, ease.out);

  // Title sweep reveal
  const sweep = mix(-14, 114, prog(frame, 6, 34, ease.inOutSoft));
  const titleBlur = mix(16, 0, prog(frame, 6, 30, ease.out));
  const titleScale = mix(1.1, 1, prog(frame, 4, 50, ease.out));
  const glint = mix(-30, 130, prog(frame, 118, 40, ease.inOut));

  // Subtitle
  const sub = prog(frame, 30, 26, ease.out);

  // Exit into S3: "triggers" folds away, Email centers.
  const collapse = prog(frame, 192, 40, ease.inOut);
  const subOut = prog(frame, 186, 20, ease.in);
  const bgOut = prog(frame, 196, 40, ease.inOut);

  const rings = [0, 1, 2, 3, 4, 5].map((i) => {
    const at = 2 * BEAT + i * BEAT;
    const t = clamp((frame - at) / 90);
    return { t, on: frame >= at };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: color.void }}>
      <Backdrop
        grid={{ opacity: 0.045 * (1 - bgOut), size: 40 }}
        glows={[
          { x: WIDTH / 2, y: TITLE_Y, size: 1500, color: "rgba(253,54,110,0.22)", opacity: keys(frame, [0, 20, 190, 236], [1, 0.6, 0.55, 0], ease.inOut) },
          { x: WIDTH / 2 - 380, y: TITLE_Y - 60, size: 900, color: "rgba(155,138,255,0.16)", opacity: keys(frame, [0, 40, 190, 236], [0, 0.6, 0.6, 0], ease.inOut) },
        ]}
        grain={0}
        vignette={0}
      />

      {/* Shockwave rings */}
      <AbsoluteFill style={{ opacity: 1 - bgOut }}>
        <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
          <circle
            cx={WIDTH / 2}
            cy={HEIGHT / 2}
            r={10 + shock * 1300}
            fill="none"
            stroke="#fd366e"
            strokeWidth={mix(10, 1, shock)}
            opacity={(1 - shock) * 0.8}
          />
          <circle
            cx={WIDTH / 2}
            cy={HEIGHT / 2}
            r={10 + prog(frame, 4, 70, ease.out) * 900}
            fill="none"
            stroke="#ffe3ec"
            strokeWidth={mix(3, 0.5, prog(frame, 4, 70))}
            opacity={(1 - prog(frame, 4, 70)) * 0.5}
          />
          {rings.map((r, i) =>
            r.on && r.t < 1 ? (
              <circle
                key={i}
                cx={WIDTH / 2}
                cy={TITLE_Y}
                r={220 + ease.out(r.t) * 820}
                fill="none"
                stroke="rgba(253,54,110,1)"
                strokeWidth={1.2}
                opacity={(1 - r.t) * 0.16}
              />
            ) : null,
          )}
        </svg>
      </AbsoluteFill>

      <Streaks frame={frame} start={0} dur={46} direction="out" count={180} cy={HEIGHT / 2} seed={4} intensity={1.1} />

      <AbsoluteFill style={{ transform: `scale(${mix(1, 1.06, prog(frame, 20, 170, ease.inOutSoft))})`, transformOrigin: `50% ${TITLE_Y}px` }}>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: WIDTH,
          top: TITLE_Y - EM / 2,
          height: EM * 1.35,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          fontFamily: font.display,
          fontSize: EM,
          lineHeight: `${EM}px`,
          letterSpacing: "-0.035em",
          whiteSpace: "nowrap",
          transform: `scale(${titleScale})`,
          transformOrigin: `50% ${EM / 2}px`,
          filter: titleBlur > 0.2 ? `blur(${titleBlur}px)` : undefined,
          maskImage: `linear-gradient(90deg, black ${sweep - 12}%, transparent ${sweep + 12}%)`,
          WebkitMaskImage: `linear-gradient(90deg, black ${sweep - 12}%, transparent ${sweep + 12}%)`,
        }}
      >
        <span style={{ display: "inline-block", width: W_EMAIL, ...gradientText(0) }}>Email</span>
        <span
          style={{
            display: "inline-block",
            overflow: "hidden",
            paddingBottom: EM * 0.3,
            width: (W_SPACE + W_TRIGGERS) * (1 - collapse),
            opacity: 1 - ease.in(clamp(collapse * 1.6)),
          }}
        >
          <span
            style={{
              display: "inline-block",
              paddingLeft: W_SPACE,
              filter: collapse > 0.02 ? `blur(${collapse * 10}px)` : undefined,
              ...gradientText(W_EMAIL),
            }}
          >
            triggers
          </span>
        </span>
      </div>

      {/* Glint across the title */}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: WIDTH,
          top: TITLE_Y - EM / 2,
          height: EM * 1.35,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          fontFamily: font.display,
          fontSize: EM,
          lineHeight: `${EM}px`,
          letterSpacing: "-0.035em",
          whiteSpace: "nowrap",
          color: "#fff",
          opacity: 0.85 * (1 - collapse),
          maskImage: `linear-gradient(105deg, transparent ${glint - 8}%, black ${glint}%, transparent ${glint + 8}%)`,
          WebkitMaskImage: `linear-gradient(105deg, transparent ${glint - 8}%, black ${glint}%, transparent ${glint + 8}%)`,
          mixBlendMode: "plus-lighter",
        }}
      >
        <span style={{ display: "inline-block", width: W_EMAIL }}>Email</span>
        <span style={{ display: "inline-block", width: (W_SPACE + W_TRIGGERS) * (1 - collapse), overflow: "hidden", paddingBottom: EM * 0.3 }}>
          <span style={{ paddingLeft: W_SPACE }}>triggers</span>
        </span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          top: TITLE_Y + 118,
          width: WIDTH,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 18,
          fontFamily: font.display,
          fontSize: 50,
          letterSpacing: "-0.02em",
          color: color.mutedForeground,
          opacity: sub * (1 - subOut),
          transform: `translateY(${(1 - sub) * 24 + subOut * 16}px)`,
          filter: sub < 1 ? `blur(${(1 - sub) * 8}px)` : undefined,
        }}
      >
        <span>for</span>
        <AppwriteMark size={44} style={{ marginLeft: 4 }} />
        <span style={{ color: color.foreground }}>Appwrite Functions</span>
      </div>

      </AbsoluteFill>

      {/* Flash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,228,236,${flash}) 0%, rgba(253,54,110,${flash * 0.5}) 18%, transparent 55%)`,
          mixBlendMode: "screen",
        }}
      />

      <FilmOverlay grain={0.045} vignette={0.5} />
    </AbsoluteFill>
  );
};
