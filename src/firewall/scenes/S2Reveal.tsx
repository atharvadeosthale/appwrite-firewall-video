import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, EASE, rgba } from "../theme";
import { AEONIK } from "../fonts";
import { lerp, prog, tween } from "../lib/anim";
import { Cursor, Eyebrow, Words } from "../components/Type";
import { WallCanvas } from "../three/WallCanvas";
import type { WallWorldOptions } from "../three/WallWorld";

export const S2_DURATION = 384;

const WALL_OPTIONS: WallWorldOptions = {
  assembleAt: 36,
  assembleDur: 108,
  duration: S2_DURATION + 60,
  density: 0.85,
  badRatio: 0.09,
  camera: [
    { f: 0, pos: [-13.5, 0.3, 4.4], target: [-2.5, 0.1, 0] },
    { f: 170, pos: [-8.6, 1.4, 16.2], target: [-3.5, 0.35, 0] },
    { f: S2_DURATION - 58, pos: [-7.6, 1.9, 17.2], target: [-3.1, 0.25, 0] },
    { f: S2_DURATION, pos: [-1.35, 0.22, 0.75], target: [0.4, 0.2, 0.25], ease: "in" },
  ],
};

const TITLE_AT = 192;

export const S2Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeIn = tween(frame, [0, 14], [0, 1], EASE.outSoft);

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <AbsoluteFill style={{ opacity: fadeIn }}>
        <WallCanvas options={WALL_OPTIONS} />
      </AbsoluteFill>

      {/* Legibility wash behind the title */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 55% 60% at 12% 88%, rgba(11,11,14,0.82) 0%, rgba(11,11,14,0.5) 45%, transparent 75%)",
          opacity: prog(frame, TITLE_AT - 30, 40),
        }}
      />

      <div style={{ position: "absolute", left: 128, bottom: 150 }}>
        <Eyebrow text="Built into Appwrite Cloud" start={TITLE_AT - 16} size={22} color="#b4b4bd" exit={S2_DURATION - 70} />
        <div
          style={{
            marginTop: 26,
            fontSize: 136,
            fontWeight: 400,
            letterSpacing: "-0.045em",
            lineHeight: 0.98,
            color: C.fg,
            textShadow: `0 0 ${lerp(60, 26, prog(frame, TITLE_AT + 20, 50))}px ${rgba(C.pink, 0.45 * prog(frame, TITLE_AT + 8, 20) * (1 - 0.6 * prog(frame, TITLE_AT + 30, 60)))}`,
          }}
        >
          <Words
            text="Appwrite Firewall"
            start={TITLE_AT}
            stagger={6}
            dur={36}
            exit={S2_DURATION - 66}
            after={<Cursor size={136} appear={TITLE_AT + 22} blinkFrom={TITLE_AT + 60} />}
          />
        </div>
        <div
          style={{
            marginTop: 30,
            fontFamily: AEONIK,
            fontSize: 38,
            fontWeight: 400,
            letterSpacing: "-0.01em",
            color: C.muted,
            opacity: prog(frame, TITLE_AT + 30, 30) * (1 - prog(frame, S2_DURATION - 70, 18, EASE.in)),
            translate: `0 ${tween(frame, [TITLE_AT + 30, TITLE_AT + 66], [18, 0])}px`,
          }}
        >
          Control traffic before it reaches your app.
        </div>
      </div>
    </AbsoluteFill>
  );
};
