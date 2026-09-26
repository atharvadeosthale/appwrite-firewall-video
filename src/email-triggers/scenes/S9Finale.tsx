import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, FilmOverlay } from "../components/Backdrop";
import { hexA } from "../components/EmailNotice";
import { AppwriteMark } from "../components/Logo";
import { Streaks } from "../components/Streaks";
import { clamp, ease, keys, mix, prog, rand } from "../lib/anim";
import { color, font } from "../theme";
import { HEIGHT, WIDTH } from "../timeline";
import { BRAND_GRADIENT } from "./S2Title";

// Finale: every kind of email from the film spirals into the @ seal, which
// resolves into the Appwrite mark above the title lockup.
const IMPACT = 60;
const TINTS = [color.pink, color.orange, color.amber400, color.violet];

const TITLE = 176;
const W_TITLE = (6.05 - 14 * 0.035) * TITLE;

const MiniEnvelope: React.FC<{ tint: string; s: number }> = ({ tint, s }) => (
  <div
    style={{
      position: "relative",
      width: 56 * s,
      height: 40 * s,
      borderRadius: 7 * s,
      backgroundColor: "#26262c",
      border: `${1.6 * s}px solid ${tint}`,
      boxShadow: `0 0 ${22 * s}px ${hexA(tint, 0.55)}`,
      boxSizing: "border-box",
      overflow: "hidden",
    }}
  >
    <svg width={56 * s} height={40 * s} viewBox="0 0 56 40" style={{ position: "absolute", left: -1.6 * s, top: -1.6 * s }}>
      <path d="M 4 5 L 28 24 L 52 5" fill="none" stroke={tint} strokeWidth={2.2} />
    </svg>
  </div>
);

const VORTEX = Array.from({ length: 46 }, (_, i) => ({
  tint: TINTS[i % 4],
  a0: rand(i * 2.7) * Math.PI * 2,
  r0: 700 + rand(i * 5.3) * 700,
  delay: rand(i * 9.1) * 16,
  spin: 1.4 + rand(i * 1.9) * 1.2,
  s: 0.7 + rand(i * 3.1) * 0.8,
}));

const ORBIT = Array.from({ length: 14 }, (_, i) => ({ tint: TINTS[i % 4], phase: (i / 14) * Math.PI * 2 }));

export const S9Finale: React.FC = () => {
  const frame = useCurrentFrame();

  const flash = keys(frame, [IMPACT - 2, IMPACT + 2, IMPACT + 24], [0, 1, 0], [ease.out, ease.outSoft]);
  const seal = keys(frame, [0, IMPACT - 6, IMPACT, IMPACT + 18], [0.5, 1.15, 1.35, 0], [ease.inSoft, ease.out, ease.in]);
  const markIn = prog(frame, IMPACT + 4, 26, ease.backOut);
  const titleIn = prog(frame, IMPACT + 10, 34, ease.out);
  const subIn = prog(frame, IMPACT + 30, 24, ease.out);
  const pillIn = prog(frame, IMPACT + 52, 22, ease.backOut);
  const logoIn = prog(frame, IMPACT + 80, 30, ease.out);
  const orbitIn = prog(frame, IMPACT + 20, 60, ease.out);
  const outro = prog(frame, 330, 30, ease.inOut);
  const sweep = mix(-30, 130, prog(frame, 200, 50, ease.inOut));
  const push = mix(1.0, 1.045, prog(frame, IMPACT, 300, ease.linear));

  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: color.void }}>
      <Backdrop
        grid={{ opacity: 0.035 * clamp(frame / 60), size: 44 }}
        glows={[
          { x: cx, y: cy, size: 1700, color: "rgba(253,54,110,0.2)", opacity: keys(frame, [0, IMPACT, IMPACT + 40, 360], [0.5, 1, 0.75, 0.7], ease.inOut) },
          { x: cx - 420, y: cy - 120, size: 1000, color: "rgba(155,138,255,0.14)", opacity: orbitIn * 0.8 },
          { x: cx + 460, y: cy + 160, size: 1000, color: "rgba(255,176,136,0.10)", opacity: orbitIn * 0.7 },
        ]}
        grain={0}
        vignette={0}
      />

      <AbsoluteFill style={{ transform: `scale(${push})`, opacity: 1 - outro }}>
        {/* vortex of emails */}
        {frame < IMPACT + 4
          ? VORTEX.map((v, i) => {
              const t = clamp((frame - v.delay) / (IMPACT - v.delay));
              if (t <= 0) return null;
              const e = ease.in(t);
              const r = v.r0 * (1 - e);
              const a = v.a0 + e * v.spin * Math.PI;
              const x = cx + Math.cos(a) * r * 1.2;
              const y = cy + Math.sin(a) * r * 0.7;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    transform: `translate(-50%, -50%) rotate(${(a * 180) / Math.PI + 90}deg) scale(${v.s * (1 - e * 0.85)})`,
                    opacity: clamp(t * 4) * (1 - clamp((e - 0.85) / 0.15)),
                    filter: e > 0.5 ? `blur(${(e - 0.5) * 6}px)` : undefined,
                  }}
                >
                  <MiniEnvelope tint={v.tint} s={1.2} />
                </div>
              );
            })
          : null}
        <Streaks frame={frame} start={IMPACT - 30} dur={34} direction="in" count={120} seed={9} intensity={0.9} />
        <Streaks frame={frame} start={IMPACT} dur={44} direction="out" count={160} seed={12} intensity={1} />

        {/* the @ seal at the centre */}
        {seal > 0.01 ? (
          <div
            style={{
              position: "absolute",
              left: cx - 70,
              top: cy - 70,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: color.pink,
              boxShadow: `0 0 ${80 * seal}px ${30 * seal}px rgba(253,54,110,0.65)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: font.display,
              fontWeight: 500,
              fontSize: 92,
              lineHeight: "140px",
              transform: `scale(${seal})`,
            }}
          >
            @
          </div>
        ) : null}

        {/* orbit of envelopes (behind half) */}
        {ORBIT.map((o, i) => {
          const a = o.phase + frame * 0.012;
          const depth = Math.sin(a);
          if (depth > 0) return null;
          const x = cx + Math.cos(a) * 840;
          const y = cy + 20 + depth * 170;
          const s = mix(0.55, 0.9, (depth + 1) / 2);
          const clear = clamp((Math.abs(x - cx) - 560) / 160);
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${s})`, opacity: orbitIn * clear * mix(0.25, 0.6, (depth + 1) / 2), filter: "blur(1.5px)" }}>
              <MiniEnvelope tint={o.tint} s={1} />
            </div>
          );
        })}

        {/* lockup */}
        <div
          style={{
            position: "absolute",
            left: cx - 46,
            top: 236,
            opacity: clamp(markIn * 2),
            transform: `scale(${mix(0.4, 1, markIn)})`,
            filter: `drop-shadow(0 0 ${30 * markIn}px rgba(253,54,110,0.5))`,
          }}
        >
          <AppwriteMark size={92} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            width: WIDTH,
            top: 360,
            height: TITLE,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            fontFamily: font.display,
            fontSize: TITLE,
            lineHeight: `${TITLE}px`,
            letterSpacing: "-0.035em",
            whiteSpace: "nowrap",
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 40}px) scale(${mix(0.94, 1, titleIn)})`,
            filter: titleIn < 1 ? `blur(${(1 - titleIn) * 14}px)` : undefined,
          }}
        >
          <span
            style={{
              paddingBottom: TITLE * 0.3,
              backgroundImage: BRAND_GRADIENT,
              backgroundSize: `${W_TITLE}px ${TITLE * 1.4}px`,
              backgroundRepeat: "no-repeat",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Email triggers
          </span>
        </div>
        {/* light sweep */}
        <div
          style={{
            position: "absolute",
            left: 0,
            width: WIDTH,
            top: 360,
            height: TITLE * 1.35,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            fontFamily: font.display,
            fontSize: TITLE,
            lineHeight: `${TITLE}px`,
            letterSpacing: "-0.035em",
            whiteSpace: "nowrap",
            color: "#ffffff",
            opacity: 0.8 * titleIn,
            maskImage: `linear-gradient(105deg, transparent ${sweep - 8}%, black ${sweep}%, transparent ${sweep + 8}%)`,
            WebkitMaskImage: `linear-gradient(105deg, transparent ${sweep - 8}%, black ${sweep}%, transparent ${sweep + 8}%)`,
            mixBlendMode: "plus-lighter",
          }}
        >
          Email triggers
        </div>
        <div
          style={{
            position: "absolute",
            top: 568,
            width: WIDTH,
            textAlign: "center",
            fontFamily: font.display,
            fontSize: 54,
            letterSpacing: "-0.02em",
            color: color.mutedForeground,
            opacity: subIn,
            transform: `translateY(${(1 - subIn) * 20}px)`,
          }}
        >
          for <span style={{ color: color.foreground }}>Appwrite Functions</span>
        </div>
        <div style={{ position: "absolute", top: 690, width: WIDTH, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              height: 64,
              padding: "0 30px",
              borderRadius: 32,
              backgroundColor: "rgba(253,54,110,0.12)",
              border: "1.5px solid rgba(253,54,110,0.5)",
              fontFamily: font.ui,
              fontSize: 26,
              fontWeight: 500,
              color: color.foreground,
              opacity: clamp(pillIn * 2),
              transform: `scale(${mix(0.8, 1, pillIn)})`,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color.pink, boxShadow: `0 0 12px ${color.pink}` }} />
            Available on Appwrite Cloud
          </div>
        </div>

        {/* orbit of envelopes (front half) */}
        {ORBIT.map((o, i) => {
          const a = o.phase + frame * 0.012;
          const depth = Math.sin(a);
          if (depth <= 0) return null;
          const x = cx + Math.cos(a) * 840;
          const y = cy + 20 + depth * 170;
          const s = mix(0.9, 1.25, depth);
          const clear = clamp((Math.abs(x - cx) - 560) / 160);
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${s})`, opacity: orbitIn * clear * 0.85 }}>
              <MiniEnvelope tint={o.tint} s={1} />
            </div>
          );
        })}

        <div style={{ position: "absolute", bottom: 86, width: WIDTH, display: "flex", justifyContent: "center", opacity: logoIn * 0.9 }}>
          <Img src={staticFile("email-triggers/appwrite-logotype-dark.svg")} style={{ height: 34 }} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,228,236,${flash}) 0%, rgba(253,54,110,${flash * 0.5}) 20%, transparent 58%)`,
          mixBlendMode: "screen",
        }}
      />
      <FilmOverlay grain={0.045} vignette={0.5} />
    </AbsoluteFill>
  );
};
