import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { color } from "./theme";
import { bars } from "./timeline";
import { S1Inbox } from "./scenes/S1Inbox";
import { S2Title } from "./scenes/S2Title";
import { S3Address } from "./scenes/S3Address";
import { S4Journey } from "./scenes/S4Journey";
import { S5Payload } from "./scenes/S5Payload";
import { S6Executions } from "./scenes/S6Executions";
import { S7Domains } from "./scenes/S7Domains";
import { S8UseCases } from "./scenes/S8UseCases";
import { S9Finale } from "./scenes/S9Finale";

// Scenes cut on bar lines of the 120 BPM soundtrack (1 bar = 120 frames).
export const EmailTriggersTrailer: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: color.void }}>
      <Audio src={staticFile("email-triggers/soundtrack.wav")} />
      <Sequence name="S1 Inbox" from={bars(0)} durationInFrames={bars(4)}>
        <S1Inbox />
      </Sequence>
      <Sequence name="S2 Title" from={bars(4)} durationInFrames={bars(2)}>
        <S2Title />
      </Sequence>
      <Sequence name="S3 Address" from={bars(6)} durationInFrames={bars(4)}>
        <S3Address />
      </Sequence>
      <Sequence name="S4 Journey" from={bars(10)} durationInFrames={bars(6)}>
        <S4Journey />
      </Sequence>
      <Sequence name="S5 Payload" from={bars(16)} durationInFrames={bars(4)}>
        <S5Payload />
      </Sequence>
      <Sequence name="S6 Executions" from={bars(20)} durationInFrames={bars(2)}>
        <S6Executions />
      </Sequence>
      <Sequence name="S7 Domains" from={bars(22)} durationInFrames={bars(4)}>
        <S7Domains />
      </Sequence>
      <Sequence name="S8 Use cases" from={bars(26)} durationInFrames={bars(3)}>
        <S8UseCases />
      </Sequence>
      <Sequence name="S9 Finale" from={bars(29)} durationInFrames={bars(3)}>
        <S9Finale />
      </Sequence>
    </AbsoluteFill>
  );
};
