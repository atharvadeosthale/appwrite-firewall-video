import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { hash01, rng } from "../lib/anim";

const makeNoiseTile = (size: number, seed: number) => {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(size, size);
  const rand = rng(seed);
  for (let i = 0; i < size * size; i++) {
    const v = Math.floor(rand() * 255);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
};

/** Animated film grain. The tile is fixed, only its offset changes per frame. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  const tile = useMemo(() => makeNoiseTile(256, 7), []);
  // Grain refreshes at 30 fps so it reads as film, not static.
  const f = Math.floor(frame / 2);
  const x = Math.floor(hash01(f * 2 + 1) * 256);
  const y = Math.floor(hash01(f * 2 + 2) * 256);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${tile})`,
        backgroundPosition: `${x}px ${y}px`,
        backgroundSize: "256px 256px",
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.7 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

type Glow = {
  x: number;
  y: number;
  r: number;
  color: string;
  opacity: number;
};

/**
 * Soft light pools. Positions are in percent of the frame, radius in px.
 * A slow drift keeps the backdrop alive between beats.
 */
export const Glows: React.FC<{ glows: Glow[]; drift?: number }> = ({ glows, drift = 1 }) => {
  const frame = useCurrentFrame();
  const t = frame / 60;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {glows.map((g, i) => {
        const dx = Math.sin(t * 0.35 + i * 1.7) * 40 * drift;
        const dy = Math.cos(t * 0.29 + i * 2.3) * 30 * drift;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${g.x}%`,
              top: `${g.y}%`,
              width: g.r * 2,
              height: g.r * 2,
              marginLeft: -g.r,
              marginTop: -g.r,
              translate: `${dx}px ${dy}px`,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${g.color} 0%, transparent 68%)`,
              opacity: g.opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Dot grid like the Firewall blog covers, faded at the edges. */
export const DotGrid: React.FC<{
  gap?: number;
  opacity?: number;
  offsetX?: number;
  offsetY?: number;
  mask?: string;
  color?: string;
}> = ({
  gap = 32,
  opacity = 0.5,
  offsetX = 0,
  offsetY = 0,
  mask = "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)",
  color = "rgba(255,255,255,0.14)",
}) => (
  <AbsoluteFill
    style={{
      backgroundImage: `radial-gradient(circle at center, ${color} 1.2px, transparent 1.6px)`,
      backgroundSize: `${gap}px ${gap}px`,
      backgroundPosition: `${offsetX}px ${offsetY}px`,
      opacity,
      maskImage: mask,
      WebkitMaskImage: mask,
      pointerEvents: "none",
    }}
  />
);
