import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { clamp, ease, rand } from "../lib/anim";
import { HEIGHT, WIDTH } from "../timeline";

type Props = {
  frame: number;
  start: number;
  dur: number;
  direction?: "in" | "out";
  count?: number;
  cx?: number;
  cy?: number;
  seed?: number;
  intensity?: number;
};

/** Radial light streaks converging on (direction "in") or bursting from a point. */
export const Streaks: React.FC<Props> = ({
  frame,
  start,
  dur,
  direction = "in",
  count = 160,
  cx = WIDTH / 2,
  cy = HEIGHT / 2,
  seed = 1,
  intensity = 1,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const u = (frame - start) / dur;
  const active = u > -0.05 && u < 1.05;

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (!active) return;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < count; i++) {
      const r0 = rand(i * 3.7 + seed);
      const r1 = rand(i * 9.1 + seed * 2);
      const r2 = rand(i * 1.3 + seed * 5);
      const angle = r0 * Math.PI * 2;
      const delay = r1 * 0.4;
      const local = clamp((u - delay) / 0.6);
      if (local <= 0 || local >= 1) continue;
      const far = 700 + r2 * 900;
      const near = 8 + r1 * 30;
      let head: number;
      let tail: number;
      const len = (120 + r2 * 360) * Math.sin(Math.PI * local);
      if (direction === "in") {
        head = near + (far - near) * (1 - ease.in(local));
        tail = head + len;
      } else {
        head = near + (far - near) * ease.out(local);
        tail = Math.max(near, head - len);
      }
      const a = Math.sin(Math.PI * local) * (0.35 + r0 * 0.65) * intensity;
      const x1 = cx + Math.cos(angle) * head;
      const y1 = cy + Math.sin(angle) * head;
      const x2 = cx + Math.cos(angle) * tail;
      const y2 = cy + Math.sin(angle) * tail;
      const g = ctx.createLinearGradient(x2, y2, x1, y1);
      const pink = i % 5 === 0 ? "255,230,238" : "253,54,110";
      g.addColorStop(0, `rgba(${pink},0)`);
      g.addColorStop(1, `rgba(${pink},${a})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1 + r1 * 2.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }, [u, active, count, cx, cy, direction, seed, intensity]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <canvas ref={ref} width={WIDTH} height={HEIGHT} style={{ width: WIDTH, height: HEIGHT }} />
    </AbsoluteFill>
  );
};
