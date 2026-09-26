import React from "react";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { C, EASE } from "./theme";
import { prog } from "./lib/anim";
import { Grain, Vignette } from "./components/Atmosphere";
import { S1Hook, S1_DURATION } from "./scenes/S1Hook";
import { S2Reveal, S2_DURATION } from "./scenes/S2Reveal";
import { S3Rule, S3_DURATION } from "./scenes/S3Rule";
import { S4Actions, S4_DURATION } from "./scenes/S4Actions";
import { S5UseCases, S5_DURATION } from "./scenes/S5UseCases";
import { S6Overview, S6_DURATION } from "./scenes/S6Overview";
import { S7Finale, S7_DURATION } from "./scenes/S7Finale";

// Scene placement. `fade` is how many frames the scene crossfades in over the previous one.
const s1 = { from: 0, dur: S1_DURATION, fade: 0 };
const s2 = { from: s1.from + s1.dur - 24, dur: S2_DURATION, fade: 24 };
const s3 = { from: s2.from + s2.dur - 24, dur: S3_DURATION, fade: 24 };
// S4 continues S3's action-menu handoff, so it starts exactly where S3 ends.
const s4 = { from: s3.from + s3.dur, dur: S4_DURATION, fade: 0 };
const s5 = { from: s4.from + s4.dur - 24, dur: S5_DURATION, fade: 24 };
const s6 = { from: s5.from + s5.dur - 24, dur: S6_DURATION, fade: 24 };
const s7 = { from: s6.from + s6.dur, dur: S7_DURATION, fade: 0 };

export const TRAILER_DURATION = s7.from + s7.dur;
export const SCENES = { s1, s2, s3, s4, s5, s6, s7 };

const FadeIn: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: frames > 0 ? prog(frame, 0, frames, EASE.inOut) : 1 }}>{children}</AbsoluteFill>;
};

const scene = (name: string, s: { from: number; dur: number; fade: number }, node: React.ReactNode) => (
  <Sequence name={name} from={s.from} durationInFrames={s.dur} premountFor={90}>
    <FadeIn frames={s.fade}>{node}</FadeIn>
  </Sequence>
);

/** A light burst that sits above both scenes of a cut. */
const Flash: React.FC<{ at: number; rise: number; fall: number; color: string; peak?: number }> = ({
  at,
  rise,
  fall,
  color,
  peak = 1,
}) => {
  const frame = useCurrentFrame();
  const o = prog(frame, at - rise, rise, EASE.in) * (1 - prog(frame, at, fall, EASE.out)) * peak;
  if (o <= 0.001) return null;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 80% 80% at 50% 50%, ${color} 0%, ${color}cc 35%, ${color}33 75%, transparent 100%)`,
        opacity: o,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};

export const FirewallTrailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      {scene("Hook", s1, <S1Hook />)}
      {scene("Reveal", s2, <S2Reveal />)}
      {scene("Rule", s3, <S3Rule />)}
      {scene("Actions", s4, <S4Actions />)}
      {scene("Use cases", s5, <S5UseCases />)}
      {scene("Overview", s6, <S6Overview />)}
      {scene("Finale", s7, <S7Finale />)}
      <Flash at={s3.from + 24} rise={22} fall={34} color="#ff7aa2" />
      <Flash at={s6.from + 16} rise={16} fall={30} color="#ff7aa2" peak={0.7} />
      <Flash at={s7.from} rise={3} fall={24} color="#c4b5fd" peak={0.85} />
      <Vignette strength={0.5} />
      <Grain opacity={0.06} />
      <Audio src={staticFile("audio/trailer.wav")} />
    </AbsoluteFill>
  );
};
