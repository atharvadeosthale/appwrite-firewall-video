import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { C, EASE, rgba } from "../theme";
import { AEONIK, MONO } from "../fonts";
import { lerp, prog } from "../lib/anim";
import { Cursor, Eyebrow, Words } from "../components/Type";
import { WallCanvas } from "../three/WallCanvas";
import type { WallWorldOptions } from "../three/WallWorld";

export const S7_DURATION = 492;

export const CHALLENGE_AT = 12;
export const OUTRO_AT = 252;

const WORLD: WallWorldOptions = {
  assembleAt: 0,
  assembleDur: 1,
  prebuilt: true,
  duration: S7_DURATION + 60,
  density: 0.85,
  badRatio: 0.09,
  surgeAt: -200,
  surgeDur: 50,
  surgeGain: 3.2,
  surgeBad: 0.62,
  surgeEnd: 150,
  challengeAt: CHALLENGE_AT,
  challengeEnd: 290,
  shake: [
    [0, 0.16],
    [CHALLENGE_AT, 0.18],
    [CHALLENGE_AT + 3, 0.42],
    [CHALLENGE_AT + 24, 0.06],
    [CHALLENGE_AT + 80, 0],
  ],
  camera: [
    { f: 0, pos: [-7.1, 1.3, 13.2], target: [-2.3, 0.3, 0] },
    { f: CHALLENGE_AT, pos: [-6.6, 1.35, 12.0], target: [-2.1, 0.3, 0] },
    { f: 196, pos: [-7.8, 1.7, 15.8], target: [-2.8, 0.3, 0] },
    { f: S7_DURATION, pos: [-10.8, 2.6, 23], target: [-0.6, 0.4, 0] },
  ],
};

export const S7Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = frame >= CHALLENGE_AT ? Math.exp(-(frame - CHALLENGE_AT) / 7) : 0;
  const outro = prog(frame, OUTRO_AT, 60, EASE.inOut);
  const endFade = prog(frame, S7_DURATION - 24, 24, EASE.in);

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <AbsoluteFill
        style={{
          filter: outro > 0.01 ? `blur(${outro * 7}px) brightness(${1 - outro * 0.42})` : undefined,
          scale: `${lerp(1, 1.04, outro)}`,
        }}
      >
        <WallCanvas options={WORLD} />
      </AbsoluteFill>

      {/* Attack-mode flash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 70% at 64% 50%, ${rgba("#c4b5fd", 0.35)} 0%, ${rgba(C.challenge, 0.18)} 40%, transparent 75%)`,
          opacity: flash,
          mixBlendMode: "screen",
        }}
      />

      {/* Payoff copy */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 16% 60%, rgba(11,11,14,0.8) 0%, rgba(11,11,14,0.45) 50%, transparent 80%)",
          opacity: prog(frame, CHALLENGE_AT, 30) * (1 - prog(frame, 200, 30)),
        }}
      />
      <div style={{ position: "absolute", left: 124, top: 380 }}>
        <Eyebrow text="Attack mode" start={CHALLENGE_AT + 4} color="#c4b5fd" exit={192} />
        <div style={{ marginTop: 24, fontSize: 128, letterSpacing: "-0.05em", lineHeight: 1.0, color: C.fg }}>
          <Words text="One click." start={CHALLENGE_AT + 12} stagger={6} exit={194} />
          <Words
            text="Every visitor challenged"
            start={CHALLENGE_AT + 36}
            stagger={5}
            exit={198}
            style={{ fontSize: 72, letterSpacing: "-0.04em", marginTop: 18, color: "#e7e2ff" }}
            after={<Cursor size={72} appear={CHALLENGE_AT + 60} blinkFrom={CHALLENGE_AT + 90} color={C.pink} />}
          />
        </div>
      </div>

      {/* End card */}
      {frame >= OUTRO_AT ? (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <AbsoluteFill
            style={{
              background: "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(11,11,14,0.7) 0%, rgba(11,11,14,0.3) 60%, transparent 100%)",
              opacity: outro,
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              translate: "0 -30px",
              scale: `${lerp(1, 1.035, prog(frame, OUTRO_AT, S7_DURATION - OUTRO_AT, EASE.linear))}`,
              textShadow: `0 0 50px ${rgba(C.pink, 0.22 * prog(frame, OUTRO_AT + 40, 60))}`,
            }}
          >
            <Eyebrow text="Available now on Appwrite Cloud" start={OUTRO_AT + 12} />
            <div style={{ marginTop: 30, fontSize: 168, letterSpacing: "-0.05em", lineHeight: 1, color: C.fg }}>
              <Words
                text="Appwrite Firewall"
                start={OUTRO_AT + 24}
                stagger={7}
                dur={40}
                after={<Cursor size={168} appear={OUTRO_AT + 56} blinkFrom={OUTRO_AT + 96} />}
              />
            </div>
            <div
              style={{
                marginTop: 34,
                fontFamily: AEONIK,
                fontSize: 40,
                color: C.muted,
                opacity: prog(frame, OUTRO_AT + 72, 30),
                translate: `0 ${(1 - prog(frame, OUTRO_AT + 72, 30)) * 16}px`,
              }}
            >
              Control traffic before it reaches your app.
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 92,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
              opacity: prog(frame, OUTRO_AT + 120, 36),
              translate: `0 ${(1 - prog(frame, OUTRO_AT + 120, 36)) * 12}px`,
            }}
          >
            <Img src={staticFile("appwrite-wordmark.svg")} style={{ height: 40 }} />
            <div style={{ fontFamily: MONO, fontSize: 20, color: C.faint, letterSpacing: "0.04em" }}>
              appwrite.io/products/firewall
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      <AbsoluteFill style={{ backgroundColor: "#000", opacity: endFade }} />
    </AbsoluteFill>
  );
};
