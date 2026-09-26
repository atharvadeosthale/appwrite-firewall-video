import "./index.css";
import "./firewall/fonts";
import "./email-triggers/fonts";
import { Composition, Folder } from "remotion";
import { FirewallTrailer, TRAILER_DURATION } from "./firewall/FirewallTrailer";
import { S1Hook, S1_DURATION } from "./firewall/scenes/S1Hook";
import { S2Reveal, S2_DURATION } from "./firewall/scenes/S2Reveal";
import { S3Rule, S3_DURATION } from "./firewall/scenes/S3Rule";
import { S4Actions, S4_DURATION } from "./firewall/scenes/S4Actions";
import { S4bCoverage, S4B_DURATION } from "./firewall/scenes/S4bCoverage";
import { S5UseCases, S5_DURATION } from "./firewall/scenes/S5UseCases";
import { S6Overview, S6_DURATION } from "./firewall/scenes/S6Overview";
import { S7Finale, S7_DURATION } from "./firewall/scenes/S7Finale";

import { EmailTriggersTrailer } from "./email-triggers/EmailTriggersTrailer";
import { TOTAL_DURATION as EMAIL_TRAILER_DURATION, sceneDuration } from "./email-triggers/timeline";
import { S1Inbox } from "./email-triggers/scenes/S1Inbox";
import { S2Title } from "./email-triggers/scenes/S2Title";
import { S3Address } from "./email-triggers/scenes/S3Address";
import { S4Journey } from "./email-triggers/scenes/S4Journey";
import { S5Payload } from "./email-triggers/scenes/S5Payload";
import { S6Executions } from "./email-triggers/scenes/S6Executions";
import { S7Domains } from "./email-triggers/scenes/S7Domains";
import { S8UseCases } from "./email-triggers/scenes/S8UseCases";
import { S9Finale } from "./email-triggers/scenes/S9Finale";

const emailScenes = [
  { id: "S1-Inbox", component: S1Inbox },
  { id: "S2-Title", component: S2Title },
  { id: "S3-Address", component: S3Address },
  { id: "S4-Journey", component: S4Journey },
  { id: "S5-Payload", component: S5Payload },
  { id: "S6-Executions", component: S6Executions },
  { id: "S7-Domains", component: S7Domains },
  { id: "S8-UseCases", component: S8UseCases },
  { id: "S9-Finale", component: S9Finale },
] as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EmailTriggersTrailer"
        component={EmailTriggersTrailer}
        durationInFrames={EMAIL_TRAILER_DURATION}
        fps={60}
        width={1920}
        height={1080}
      />
      <Folder name="EmailTriggers-Scenes">
        {emailScenes.map((s) => (
          <Composition
            key={s.id}
            id={`ET-${s.id}`}
            component={s.component}
            durationInFrames={sceneDuration(s.id)}
            fps={60}
            width={1920}
            height={1080}
          />
        ))}
      </Folder>
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
          id="S4b-Coverage"
          component={S4bCoverage}
          durationInFrames={S4B_DURATION}
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
