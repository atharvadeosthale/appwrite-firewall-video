import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, EASE, rgba } from "../theme";
import { clamp01, hash01, lerp, prog } from "../lib/anim";
import { Cursor, Words } from "../components/Type";
import { DotGrid, Glows } from "../components/Atmosphere";
import { Pointer } from "../ui/Console";
import { AttackDialog, FirewallPage } from "../ui/FirewallPage";

export const S6_DURATION = 396;

const Z = 1.5;
const PAGE_X = 330;
const PAGE_Y = 250;

export const F = {
  spike: 196,
  headB: 216,
  toButton: 272,
  attackClick: 312,
  dialog: 320,
  turnOn: 384,
  banner: 392,
};

// Attack mode button centre in page 1x px (measured from the layout).
const ATTACK_BTN = { x: 887, y: 541 };

const camAt = (frame: number) => {
  const toRules = prog(frame, 150, 60, EASE.inOut) * (1 - prog(frame, 206, 56, EASE.inOut));
  const toAttack = prog(frame, 206, 56, EASE.inOut);
  const intro = prog(frame, 0, 70, EASE.out);
  const scale = lerp(0.92, 1, intro) + 0.06 * toAttack;
  const camX = lerp(80, 0, intro) - 20 * toRules - 170 * toAttack;
  const camY = lerp(60, 0, intro) - 430 * toRules - 180 * toAttack;
  return { scale, camX, camY };
};

export const S6Overview: React.FC = () => {
  const frame = useCurrentFrame();
  const { scale, camX, camY } = camAt(frame);

  const enter = prog(frame, 0, 50, EASE.out);
  const flat = prog(frame, 180, 60, EASE.inOut);
  const rotX = lerp(18, 8, enter) * (1 - flat);
  const rotY = lerp(-16, -8, enter) * (1 - flat);

  const spike = prog(frame, F.spike, 80, EASE.in);
  const shakeAmt = spike * (1 - prog(frame, F.dialog, 40));
  const shakeX = (hash01(frame * 7 + 1) - 0.5) * 10 * shakeAmt;
  const shakeY = (hash01(frame * 7 + 2) - 0.5) * 8 * shakeAmt;

  const attackHover = prog(frame, F.attackClick - 12, 8);
  const attackPress = prog(frame, F.attackClick - 3, 4) * (1 - prog(frame, F.attackClick + 2, 10));
  const dialogIn = prog(frame, F.dialog, 16, EASE.out) * (1 - prog(frame, F.banner, 14, EASE.in));
  const turnOnPress = prog(frame, F.turnOn - 3, 4) * (1 - prog(frame, F.turnOn + 2, 10));
  const attackOn = 0;

  // Screen position of the attack button.
  const btnX = (PAGE_X + ATTACK_BTN.x * Z) * scale + camX + (1 - scale) * 960;
  const btnY = (PAGE_Y + ATTACK_BTN.y * Z) * scale + camY + (1 - scale) * 540;
  // Dialog "Turn on" in screen space.
  const turnOnX = 960 + (448 / 2 - 24 - 40) * 1.5;
  const turnOnY = 540 + (104 - 34) * 1.5 - 16;

  const pts: Array<[number, number, number]> = [
    [F.toButton - 30, 1700, 1180],
    [F.attackClick - 6, btnX - 6, btnY - 4],
    [F.dialog + 16, btnX - 6, btnY - 4],
    [F.turnOn - 6, turnOnX, turnOnY],
    [S6_DURATION, turnOnX, turnOnY],
  ];
  let pointer: [number, number] = [pts[0][1], pts[0][2]];
  for (let i = 0; i < pts.length - 1; i++) {
    if (frame >= pts[i][0] && frame <= pts[i + 1][0]) {
      const t = EASE.inOut(clamp01((frame - pts[i][0]) / (pts[i + 1][0] - pts[i][0])));
      pointer = [lerp(pts[i][1], pts[i + 1][1], t), lerp(pts[i][2], pts[i + 1][2], t)];
    }
  }
  const press = Math.max(attackPress, turnOnPress);

  const redPulse = spike * (1 - attackOn) * (0.55 + 0.45 * Math.sin(frame / 5));

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, overflow: "hidden" }}>
      <Glows
        glows={[
          { x: 88, y: -8, r: 950, color: rgba(C.indigo, 0.22), opacity: 1 },
          { x: 4, y: 104, r: 900, color: rgba(C.pink, 0.2), opacity: 1 },
          { x: 60, y: 40, r: 900, color: rgba(C.deny, 0.22), opacity: redPulse },
        ]}
      />
      <DotGrid opacity={0.25} offsetY={camY * 0.2} />

      <AbsoluteFill style={{ perspective: 2600, perspectiveOrigin: "50% 40%" }}>
        <AbsoluteFill
          style={{
            transformStyle: "preserve-3d",
            transform: `translate3d(${camX + shakeX}px, ${camY + shakeY}px, 0) scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transformOrigin: "50% 50%",
            opacity: enter,
            filter: (() => {
              const beat = prog(frame, F.headB - 4, 12) * (1 - prog(frame, F.toButton - 6, 20));
              const b = Math.max(dialogIn, beat * 0.9);
              return b > 0.01 ? `blur(${b * 6}px) brightness(${1 - b * 0.45})` : undefined;
            })(),
          }}
        >
          <div style={{ position: "absolute", left: PAGE_X, top: PAGE_Y }}>
            <div style={{ zoom: Z, boxShadow: "0 60px 160px rgba(0,0,0,0.6)", borderRadius: 18 }}>
              <FirewallPage
                s={{
                  frame,
                  draw: prog(frame, 16, 110, EASE.inOut),
                  spike,
                  calm: 0,
                  count: prog(frame, 20, 90, EASE.out),
                  attackPress,
                  attackOn,
                  attackHover,
                }}
                attackRow={prog(frame, F.banner + 10, 20, EASE.out)}
                sweep={prog(frame, 26, 60, EASE.inOut)}
              />
            </div>
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* Red edge vignette while under attack */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 75% at 50% 50%, transparent 55%, ${rgba(C.deny, 0.35)} 100%)`,
          opacity: redPulse,
        }}
      />

      {dialogIn > 0.001 ? (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              zoom: 1.5,
              opacity: dialogIn,
              scale: `${lerp(0.94, 1, dialogIn)}`,
            }}
          >
            <AttackDialog press={turnOnPress} hover={prog(frame, F.turnOn - 12, 6)} />
          </div>
        </AbsoluteFill>
      ) : null}

      <Pointer
        x={pointer[0]}
        y={pointer[1]}
        press={press}
        opacity={prog(frame, F.toButton - 30, 12) * (1 - prog(frame, F.banner + 16, 10))}
      />

      {/* Headline for the overview part */}
      <div style={{ position: "absolute", left: 120, top: 84 }}>
        <Words
          text="See every decision"
          start={14}
          exit={140}
          style={{ fontSize: 84, letterSpacing: "-0.045em", color: C.fg, whiteSpace: "nowrap" }}
          after={<Cursor size={84} appear={40} blinkFrom={70} />}
        />
      </div>

      {/* "Under attack?" beat over the blurred page */}
      {frame >= F.headB - 4 && frame < F.toButton + 16 ? (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <AbsoluteFill
            style={{
              background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(11,11,14,0.75) 0%, rgba(11,11,14,0.35) 60%, transparent 100%)",
              opacity: prog(frame, F.headB - 4, 10) * (1 - prog(frame, F.toButton, 14)),
            }}
          />
          <Words
            text="Under attack?"
            start={F.headB}
            stagger={5}
            dur={24}
            glitch
            exit={F.toButton - 4}
            exitDur={16}
            style={{ fontSize: 168, letterSpacing: "-0.05em", color: C.fg, whiteSpace: "nowrap" }}
            after={<Cursor size={168} appear={F.headB + 18} blinkFrom={F.headB + 30} />}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
