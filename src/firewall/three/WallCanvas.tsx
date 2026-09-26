import { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { WallWorld, type WallWorldOptions } from "./WallWorld";

/**
 * Hosts a WallWorld on a canvas and renders it for the current frame.
 * `frameOffset` lets a parent scene drive the world with its own clock.
 */
export const WallCanvas: React.FC<{
  options: WallWorldOptions;
  frameOffset?: number;
  style?: React.CSSProperties;
}> = ({ options, frameOffset = 0, style }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WallWorld | null>(null);
  const [initHandle] = useState(() => delayRender("Building Firewall wall world"));

  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    const world = new WallWorld(canvasRef.current, width, height, options);
    worldRef.current = world;
    continueRender(initHandle);
    return () => {
      worldRef.current = null;
      world.dispose();
    };
    // The world is built once per mount; options are static per scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    const handle = delayRender("Rendering Firewall wall frame");
    world.render(frame + frameOffset);
    requestAnimationFrame(() => continueRender(handle));
  }, [frame, frameOffset]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style }}
    />
  );
};
