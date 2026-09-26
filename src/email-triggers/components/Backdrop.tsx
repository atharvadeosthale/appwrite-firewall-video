import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { color } from "../theme";
import { rand } from "../lib/anim";

export type Glow = {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity?: number;
};

type Props = {
  glows?: Glow[];
  grid?: { opacity?: number; x?: number; y?: number; size?: number; fade?: number } | false;
  vignette?: number;
  grain?: number;
  base?: string;
  children?: React.ReactNode;
};

/** Stage background: deep base, parallax dot grid, colored light, grain, vignette. */
export const Backdrop: React.FC<Props> = ({
  glows = [],
  grid = {},
  vignette = 0.62,
  grain = 0.05,
  base = color.stage,
  children,
}) => {
  const g = grid === false ? null : { opacity: 0.08, x: 0, y: 0, size: 36, fade: 0.78, ...grid };
  return (
    <AbsoluteFill style={{ backgroundColor: base, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 45%, rgba(40,40,46,0.55) 0%, rgba(17,17,19,0) 70%)`,
        }}
      />
      {g ? (
        <AbsoluteFill
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,${g.opacity}) 1.1px, transparent 1.6px)`,
            backgroundSize: `${g.size}px ${g.size}px`,
            backgroundPosition: `${g.x}px ${g.y}px`,
            maskImage: `radial-gradient(ellipse ${g.fade * 100}% ${g.fade * 100}% at 50% 50%, black 30%, transparent 100%)`,
            WebkitMaskImage: `radial-gradient(ellipse ${g.fade * 100}% ${g.fade * 100}% at 50% 50%, black 30%, transparent 100%)`,
          }}
        />
      ) : null}
      {glows.map((glow, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: glow.x - glow.size / 2,
            top: glow.y - glow.size / 2,
            width: glow.size,
            height: glow.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${glow.color} 0%, transparent 68%)`,
            opacity: glow.opacity ?? 0.35,
            mixBlendMode: "screen",
          }}
        />
      ))}
      {children}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 85% 80% at 50% 50%, transparent 52%, rgba(0,0,0,${vignette}) 100%)`,
          pointerEvents: "none",
        }}
      />
      {grain > 0 ? <Grain opacity={grain} /> : null}
    </AbsoluteFill>
  );
};

/** Grain + vignette only, for layering above scene content. */
export const FilmOverlay: React.FC<{ grain?: number; vignette?: number }> = ({
  grain = 0.05,
  vignette = 0.5,
}) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 85% 80% at 50% 50%, transparent 52%, rgba(0,0,0,${vignette}) 100%)`,
      }}
    />
    <Grain opacity={grain} />
  </AbsoluteFill>
);

/** Tiled film grain that jumps every 2 frames. The hidden Img makes the
 * renderer wait for the texture before capturing a frame. */
export const Grain: React.FC<{ opacity: number }> = ({ opacity }) => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2);
  const gx = Math.round(rand(step * 3.1) * 256);
  const gy = Math.round(rand(step * 7.7) * 256);
  const src = staticFile("email-triggers/grain.png");
  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden", pointerEvents: "none" }}>
      <Img src={src} style={{ display: "none" }} />
      <div
        style={{
          position: "absolute",
          left: -256 + gx,
          top: -256 + gy,
          width: 1920 + 512,
          height: 1080 + 512,
          backgroundImage: `url(${src})`,
          backgroundSize: "256px 256px",
        }}
      />
    </AbsoluteFill>
  );
};
