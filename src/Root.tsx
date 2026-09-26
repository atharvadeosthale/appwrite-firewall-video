import "./index.css";
import "./firewall/fonts";
import { Composition, Folder } from "remotion";
import { FirewallTrailer, TRAILER_DURATION } from "./firewall/FirewallTrailer";
import { S1Hook, S1_DURATION } from "./firewall/scenes/S1Hook";
import { S2Reveal, S2_DURATION } from "./firewall/scenes/S2Reveal";
import { S3Rule, S3_DURATION } from "./firewall/scenes/S3Rule";
import { S4Actions, S4_DURATION } from "./firewall/scenes/S4Actions";
import { S5UseCases, S5_DURATION } from "./firewall/scenes/S5UseCases";
import { S6Overview, S6_DURATION } from "./firewall/scenes/S6Overview";
import { S7Finale, S7_DURATION } from "./firewall/scenes/S7Finale";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FirewallTrailer"
        component={FirewallTrailer}
        durationInFrames={TRAILER_DURATION}
        fps={60}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="S1-Hook"
          component={S1Hook}
          durationInFrames={S1_DURATION}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="S2-Reveal"
          component={S2Reveal}
          durationInFrames={S2_DURATION}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="S3-Rule"
          component={S3Rule}
          durationInFrames={S3_DURATION}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="S4-Actions"
          component={S4Actions}
          durationInFrames={S4_DURATION}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="S5-UseCases"
          component={S5UseCases}
          durationInFrames={S5_DURATION}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="S6-Overview"
          component={S6Overview}
          durationInFrames={S6_DURATION}
          fps={60}
          width={1920}
          height={1080}
        />
        <Composition
          id="S7-Finale"
          component={S7Finale}
          durationInFrames={S7_DURATION}
          fps={60}
          width={1920}
          height={1080}
        />
      </Folder>
    </>
  );
};
