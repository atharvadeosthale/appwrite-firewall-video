import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, FilmOverlay } from "../components/Backdrop";
import {
  ADDRESS_TEXT,
  CARD_W,
  cardHeight,
  EmailTriggerCard,
  EventsCard,
  MAILBOX,
  ScheduleCard,
  SWITCH_POS,
  updatePos,
} from "../components/EmailTriggerCard";
import { addressGeometry, Bracket, HERO_SIZE, HeroAddress, Roll, rollState } from "../components/HeroAddress";
import { Reveal } from "../components/Reveal";
import { Cursor, Toast } from "../components/ui";
import { bezierPoint, clamp, ease, keys, mix, prog } from "../lib/anim";
import { color, font } from "../theme";
import { WIDTH } from "../timeline";
import { BRAND_GRADIENT, TITLE_SIZE, TITLE_Y } from "./S2Title";

// Card heading "Email" (Inter 15px semibold) sized to match the S2 title.
// Inter SemiBold "Email" is 2.6012em wide; its cap centre sits 11px into the 22px line.
const HEADING = { x: 24 + (15 * 2.6012) / 2, y: 16 + 11 };
// Between cap-height match (10.8x) and width match (9.4x).
const S_START = 10.1;
const S_UI = 1.9;
const CARD_TOP = 150;
const FOCUS_UI = { x: CARD_W / 2, y: 190 };
const S_ADDR = HERO_SIZE / ADDRESS_TEXT.size;
const ADDR_CENTER = { x: ADDRESS_TEXT.x + (MAILBOX.length * ADDRESS_TEXT.size * 0.6) / 2, y: ADDRESS_TEXT.y };
const HERO_Y = 540;

const ROLLS: Roll[] = [
  { at: 0, word: "*" },
  { at: 270, word: "support" },
  { at: 300, word: "invoices" },
  { at: 330, word: "alerts" },
  { at: 360, word: "ticket-1042" },
  { at: 396, word: "support" },
];

const HANDOFF = 236;

const lerpLog = (a: number, b: number, t: number) => Math.exp(mix(Math.log(a), Math.log(b), t));

export const S3Address: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- camera over the console card ----
  const z1 = prog(frame, 0, 60, ease.inOut);
  const z3 = prog(frame, 176, HANDOFF - 176, ease.inOut);
  const drift = keys(frame, [60, 176], [0, 0.08], ease.linear);
  const sMid = S_UI + drift;
  const S = frame < 176 ? lerpLog(S_START, S_UI, z1) + drift * z1 : lerpLog(sMid, S_ADDR, z3);
  const focus =
    frame < 176
      ? { x: mix(HEADING.x, FOCUS_UI.x, z1), y: mix(HEADING.y, FOCUS_UI.y, z1) }
      : { x: mix(FOCUS_UI.x, ADDR_CENTER.x, z3), y: mix(FOCUS_UI.y, ADDR_CENTER.y, z3) };
  const screen =
    frame < 176
      ? { x: WIDTH / 2, y: mix(TITLE_Y, CARD_TOP + FOCUS_UI.y * S_UI, z1) }
      : { x: WIDTH / 2, y: mix(CARD_TOP + FOCUS_UI.y * S_UI, HERO_Y, z3) };
  const tx = screen.x - focus.x * S;
  const ty = screen.y - focus.y * S;

  const tiltT = keys(frame, [10, 70, 150, 176, HANDOFF - 8], [0, 1, 0.75, 0.6, 0], ease.inOut);
  const rotY = -11 * tiltT;
  const rotX = 5 * tiltT;

  // ---- interaction ----
  const on = prog(frame, 82, 10, ease.inOut);
  const expand = prog(frame, 86, 28, ease.inOut);
  const rest = prog(frame, 8, 36, ease.out) * (1 - prog(frame, 188, 30, ease.inOut));
  const addressFocus = prog(frame, 196, 30, ease.inOut);
  const neighbours = prog(frame, 24, 40, ease.out) * (1 - prog(frame, 180, 26, ease.inOut));
  const updatePress = keys(frame, [138, 142, 150], [0, 1, 0], ease.inOut);
  const dirty = frame >= 82 && frame < 142;

  // Cursor path in card coordinates
  const cStart: [number, number] = [CARD_W + 120, 420];
  const sw: [number, number] = [SWITCH_POS.x + 4, SWITCH_POS.y + 2];
  const up = updatePos(1);
  const btn: [number, number] = [up.x + 6, up.y + 4];
  let cur: [number, number];
  if (frame < 78) {
    const t = prog(frame, 50, 28, ease.inOut);
    cur = bezierPoint(t, cStart, [CARD_W + 60, 300], [SWITCH_POS.x + 60, SWITCH_POS.y + 60], sw);
  } else if (frame < 104) {
    cur = sw;
  } else {
    const t = prog(frame, 104, 32, ease.inOut);
    cur = bezierPoint(t, sw, [sw[0] - 120, sw[1] + 220], [btn[0] + 240, btn[1] + 20], btn);
  }
  const press = keys(frame, [76, 80, 88, 136, 140, 148], [0, 1, 0, 0, 1, 0], ease.inOut);
  const ripple = frame >= 80 && frame < 104 ? (frame - 80) / 24 : frame >= 140 && frame < 164 ? (frame - 140) / 24 : -1;
  const cursorOpacity = prog(frame, 48, 8) * (1 - prog(frame, 170, 14));

  // Toast
  const toastIn = prog(frame, 144, 18, ease.out) * (1 - prog(frame, 184, 16, ease.in));

  // Blur-crossfade from the S2 title word into the card heading.
  const titleFade = 1 - prog(frame, 1, 11, ease.inOut);
  const headingIn = prog(frame, 2, 12, ease.inOut);
  const headingScreen = { x: HEADING.x * S + tx, y: HEADING.y * S + ty };

  // ---- hero address ----
  const heroOn = frame >= HANDOFF - 1;
  const colorize = prog(frame, HANDOFF + 6, 30, ease.inOut);
  const { len } = rollState(frame, ROLLS);
  const g = addressGeometry(len);
  const bracketT = (at: number) => clamp((frame - at) / 26) * (1 - prog(frame, 440, 20, ease.in));
  const headlineOut = prog(frame, 446, 22, ease.in);

  const cardH = cardHeight(expand);

  return (
    <AbsoluteFill style={{ backgroundColor: color.void }}>
      <Backdrop
        grid={{ opacity: 0.04 * prog(frame, 20, 60), size: 40 }}
        glows={[
          { x: 1250, y: 380, size: 1500, color: "rgba(253,54,110,0.12)", opacity: keys(frame, [0, 60, 200, 260], [0.4, 0.7, 0.7, 1], ease.inOut) },
          { x: 600, y: 800, size: 1300, color: "rgba(155,138,255,0.10)", opacity: 0.8 },
        ]}
        grain={0}
        vignette={0}
      />

      {/* Console card layer */}
      {!heroOn || frame < HANDOFF + 2 ? (
        <AbsoluteFill style={{ perspective: 2400, perspectiveOrigin: "50% 45%" }}>
          <AbsoluteFill style={{ transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`, transformOrigin: "50% 45%" }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transformOrigin: "0 0",
                transform: `translate(${tx}px, ${ty}px) scale(${S})`,
              }}
            >
              <div style={{ position: "absolute", left: 0, top: -24 - 250, width: CARD_W, height: 250, overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0 }}>
                  <ScheduleCard opacity={neighbours} />
                </div>
              </div>
              <div style={{ position: "absolute", left: 0, top: 0 }}>
                <EmailTriggerCard
                  on={on}
                  expand={expand}
                  updatePress={updatePress}
                  dirty={dirty}
                  rest={rest}
                  titleOpacity={headingIn}
                  titleBlur={(1 - headingIn) * 1.2}
                  addressFocus={addressFocus}
                />
              </div>
              <div style={{ position: "absolute", left: 0, top: cardH + 24 }}>
                <EventsCard opacity={neighbours} />
              </div>
              <Cursor
                x={cur[0]}
                y={cur[1]}
                press={press}
                ripple={ripple}
                opacity={cursorOpacity}
                scale={1}
              />
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      ) : null}

      {/* S2 title word, dissolving into the card heading */}
      {titleFade > 0 ? (
        <div
          style={{
            position: "absolute",
            left: headingScreen.x - 400,
            width: 800,
            top: headingScreen.y - TITLE_SIZE / 2,
            height: TITLE_SIZE,
            display: "flex",
            justifyContent: "center",
            fontFamily: font.display,
            fontSize: TITLE_SIZE,
            lineHeight: `${TITLE_SIZE}px`,
            letterSpacing: "-0.035em",
            opacity: titleFade,
            filter: titleFade < 1 ? `blur(${(1 - titleFade) * 14}px)` : undefined,
            transform: `scale(${S / S_START})`,
            transformOrigin: "50% 50%",
          }}
        >
          <span
            style={{
              backgroundImage: BRAND_GRADIENT,
              backgroundSize: `${(6.05 - 14 * 0.035) * TITLE_SIZE}px ${TITLE_SIZE * 1.4}px`,
              backgroundRepeat: "no-repeat",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Email
          </span>
        </div>
      ) : null}

      {/* Toast */}
      <div
        style={{
          position: "absolute",
          right: 64,
          bottom: 64,
          transformOrigin: "100% 100%",
          transform: `scale(1.6) translateY(${(1 - toastIn) * 30}px)`,
          opacity: toastIn,
        }}
      >
        <Toast>Email trigger enabled</Toast>
      </div>

      {/* Built-in address */}
      {heroOn ? (
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              top: 330,
              width: WIDTH,
              textAlign: "center",
              fontFamily: font.display,
              fontSize: 64,
              letterSpacing: "-0.03em",
              color: color.foreground,
              opacity: 1 - headlineOut,
              transform: `translateY(${-headlineOut * 20}px)`,
            }}
          >
            <Reveal text="Every function gets its own address." start={246} stagger={3} dur={24} />
          </div>
          <HeroAddress frame={frame} rolls={ROLLS} y={HERO_Y} colorize={colorize} />
          <Bracket x1={g.left} x2={g.at} y={HERO_Y + 52} label="Any name before the @" t={bracketT(282)} tint={color.pink} />
          <Bracket x1={g.idStart} x2={g.idEnd} y={HERO_Y + 52} label="Your function ID" t={bracketT(300)} />
          <Bracket x1={g.zoneStart} x2={g.zoneEnd} y={HERO_Y + 52} label="No DNS to set up" t={bracketT(318)} />
        </AbsoluteFill>
      ) : null}

      <FilmOverlay grain={0.045} vignette={0.5} />
    </AbsoluteFill>
  );
};

export const S3_HERO_Y = HERO_Y;
