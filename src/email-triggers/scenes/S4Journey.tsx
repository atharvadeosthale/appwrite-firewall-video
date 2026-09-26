import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, FilmOverlay } from "../components/Backdrop";
import { Compose, COMPOSE_K, COMPOSE_SCREEN, SEND_BTN, TO_TEXT } from "../components/Compose";
import { Envelope, ENV_H, ENV_W, LETTER_OUT_OFFSET, LETTER_W, TAG, TAG_OFFSET } from "../components/Envelope";
import { Reveal } from "../components/Reveal";
import { CARD_H, CARD_W, StationCard, STATIONS } from "../components/Stations";
import { Cursor } from "../components/ui";
import { bezierPoint, clamp, ease, keys, mix, prog, typed } from "../lib/anim";
import { code, color, EMAIL, font } from "../theme";
import { HEIGHT, WIDTH } from "../timeline";

// ---------------------------------------------------------------------------
// World layout for the pipeline (world origin = screen centre at camera 0,0,1)
const SPACING = 820;
const ST_X = [1300, 1300 + SPACING, 1300 + SPACING * 2, 1300 + SPACING * 3, 1300 + SPACING * 4];
const RAIL_Y = -300;
const CARD_TOP = -200;
const FOLD = { x: 0, y: COMPOSE_SCREEN.y + COMPOSE_SCREEN.h / 2 - HEIGHT / 2 };
const CAM_Y = -60;
const CAM_S = [1.26, 1.36]; // slow push across the stations

// Arrival / departure per station (24 frames of travel between them)
const ARRIVE = [240, 324, 398, 478, 572];
const LEAVE = [300, 374, 454, 548, 632];
const PULLBACK = 632;
const WHIP = 686;

const lerpLog = (a: number, b: number, t: number) => Math.exp(mix(Math.log(a), Math.log(b), t));

/** Where the traveller (envelope, later JSON) is in world space. */
const travellerPos = (f: number): { x: number; y: number; s: number } => {
  if (f < 176) return { x: FOLD.x, y: FOLD.y, s: 1.35 };
  if (f < ARRIVE[0]) {
    const t = prog(f, 176, ARRIVE[0] - 176, ease.inOut);
    const [x, y] = bezierPoint(t, [FOLD.x, FOLD.y], [FOLD.x - 120, FOLD.y + 160], [ST_X[0] - 700, RAIL_Y - 260], [ST_X[0], RAIL_Y]);
    return { x, y, s: mix(1.35, 0.9, t) };
  }
  for (let i = 0; i < 4; i++) {
    if (f < LEAVE[i]) return { x: ST_X[i], y: RAIL_Y + Math.sin((f - ARRIVE[i]) / 9) * 3, s: 0.9 };
    if (f < ARRIVE[i + 1]) {
      const t = prog(f, LEAVE[i], ARRIVE[i + 1] - LEAVE[i], ease.inOut);
      return { x: mix(ST_X[i], ST_X[i + 1], t), y: RAIL_Y - Math.sin(t * Math.PI) * 70, s: 0.9 };
    }
  }
  return { x: ST_X[4], y: RAIL_Y + Math.sin((f - ARRIVE[4]) / 9) * 3, s: 0.9 };
};

const stationScale = (f: number) => mix(CAM_S[0], CAM_S[1], prog(f, ARRIVE[0], PULLBACK - ARRIVE[0], ease.linear));

const OVERVIEW = { x: (ST_X[0] + ST_X[4]) / 2, y: -70, s: 0.44 };

const camera = (f: number) => {
  if (f < 176) return { x: 0, y: 0, s: 1 };
  if (f < ARRIVE[0] + 6) {
    const t = prog(f, 176, ARRIVE[0] + 6 - 176, ease.inOut);
    return { x: mix(0, ST_X[0], t), y: mix(0, CAM_Y, t), s: lerpLog(1, CAM_S[0], t) };
  }
  if (f < PULLBACK) {
    const p = travellerPos(f - 5);
    const x = Math.min(ST_X[4], Math.max(ST_X[0], p.x));
    return { x, y: CAM_Y, s: stationScale(f) };
  }
  if (f < WHIP) {
    const t = prog(f, PULLBACK, 52, ease.inOut);
    return { x: mix(ST_X[4], OVERVIEW.x, t), y: mix(CAM_Y, OVERVIEW.y, t), s: lerpLog(CAM_S[1], OVERVIEW.s, t) };
  }
  // whip into the parsed JSON so it fills the frame on the cut to S5
  const t = prog(f, WHIP, 34, ease.inOut);
  return { x: mix(OVERVIEW.x, ST_X[4], ease.out(t)), y: mix(OVERVIEW.y, RAIL_Y, ease.out(t)), s: lerpLog(OVERVIEW.s, 7.5, t) };
};

/** Tiny JSON document that replaces the envelope after parsing. */
export const JsonDoc: React.FC = () => (
  <div
    style={{
      width: 230,
      height: 164,
      borderRadius: 16,
      backgroundColor: "#141417",
      border: "1.5px solid rgba(253,54,110,0.6)",
      boxShadow: "0 0 44px rgba(253,54,110,0.35), 0 20px 40px rgba(0,0,0,0.5)",
      padding: "16px 18px",
      boxSizing: "border-box",
      fontFamily: font.mono,
      fontSize: 13,
      lineHeight: "22px",
      whiteSpace: "pre",
      overflow: "hidden",
    }}
  >
    <div style={{ color: code.punctuation }}>{"{"}</div>
    {[
      ['"from"', '"Walter…"'],
      ['"subject"', '"Order 1042…"'],
      ['"text"', '"Hi, my…"'],
      ['"attachments"', "[1]"],
    ].map(([k, v]) => (
      <div key={k} style={{ paddingLeft: 14 }}>
        <span style={{ color: code.property }}>{k}</span>
        <span style={{ color: code.punctuation }}>: </span>
        <span style={{ color: v.startsWith("[") ? code.number : code.string }}>{v}</span>
      </div>
    ))}
    <div style={{ color: code.punctuation }}>{"}"}</div>
  </div>
);

// ---------------------------------------------------------------------------
export const S4Journey: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- compose ----
  const handoff = prog(frame, 0, 34, ease.inOut);
  const composeIn = prog(frame, 6, 26, ease.out);
  const subject = typed(frame, 40, 42, EMAIL.subject);
  const body = typed(frame, 72, 48, EMAIL.text);
  const caret = frame < 40 ? null : frame < 70 ? "subject" : frame < 132 ? "body" : null;
  const caretOn = Math.floor(frame / 12) % 2 === 0 || (frame > 40 && frame < 120);
  const attachment = prog(frame, 112, 18, ease.backOut);
  const sendPress = keys(frame, [136, 140, 150], [0, 1, 0], ease.inOut);
  const fold = prog(frame, 142, 30, ease.inOut);
  const composeVisible = frame < 172;

  // address flying into the To field
  const toSize = mix(60, TO_TEXT.size, handoff);
  const addrW = 43 * toSize * 0.6;
  const addrX = mix(WIDTH / 2 - addrW / 2, TO_TEXT.x, handoff);
  const addrY = mix(540, TO_TEXT.y, handoff);

  // cursor to Send
  const cStart: [number, number] = [1660, 1000];
  const cT = prog(frame, 112, 22, ease.inOut);
  const cur = bezierPoint(cT, cStart, [1420, 1010], [SEND_BTN.x + 200, SEND_BTN.y + 60], [SEND_BTN.x + 4, SEND_BTN.y + 4]);
  const cursorPress = keys(frame, [134, 138, 146], [0, 1, 0], ease.inOut);
  const cursorOpacity = prog(frame, 108, 8) * (1 - prog(frame, 150, 10));

  // ---- world ----
  const cam = camera(frame);
  const tp = travellerPos(frame);
  const envelopeIn = prog(frame, 150, 24, ease.backOut);

  // Store: the attachment tag and a copy of the email drop into the file list.
  const A2 = ARRIVE[2];
  const clipGone = frame >= A2 + 6;
  const cardLeft = (i: number) => ST_X[i] - CARD_W / 2;

  // Parse: the envelope opens, the letter comes out and flips into JSON.
  const A3 = ARRIVE[3];
  const openT = prog(frame, A3 + 6, 16, ease.inOut);
  const letterT = prog(frame, A3 + 14, 18, ease.out);
  const paperOn = frame >= A3 + 32;
  const flipT = prog(frame, A3 + 34, 18, ease.inOut);
  const envDrop = prog(frame, A3 + 36, 20, ease.in);
  const settle = prog(frame, A3 + 50, 16, ease.inOut);
  const whipBlur = frame >= WHIP ? prog(frame, WHIP + 8, 26, ease.in) * 22 : 0;

  const w2s = (x: number, y: number) => ({
    x: (x - cam.x) * cam.s + WIDTH / 2,
    y: (y - cam.y) * cam.s + HEIGHT / 2,
  });

  const railLit = frame < ARRIVE[0] ? 0 : Math.max(ST_X[0], tp.x);

  const trail: string[] = [];
  if (frame >= 176) {
    for (let k = 0; k <= 14; k++) {
      const p = travellerPos(frame - k * 1.5);
      trail.push(`${p.x},${p.y}`);
    }
  }

  const overview = prog(frame, PULLBACK + 30, 20, ease.out) * (1 - prog(frame, WHIP, 14, ease.in));

  return (
    <AbsoluteFill style={{ backgroundColor: color.void }}>
      <Backdrop
        grid={{ opacity: 0.05, x: -cam.x * cam.s * 0.25, y: -cam.y * cam.s * 0.25, size: 44 }}
        glows={[
          { x: 960, y: 520, size: 1600, color: "rgba(253,54,110,0.12)", opacity: 0.8 },
          { x: 1500, y: 900, size: 1200, color: "rgba(155,138,255,0.10)", opacity: 0.7 },
        ]}
        grain={0}
        vignette={0}
      />

      {/* ---------- pipeline world ---------- */}
      <AbsoluteFill style={{ filter: whipBlur > 0.2 ? `blur(${whipBlur}px)` : undefined }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: `translate(${WIDTH / 2 - cam.x * cam.s}px, ${HEIGHT / 2 - cam.y * cam.s}px) scale(${cam.s})`,
          }}
        >
          {/* rail */}
          <svg width={10} height={10} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: prog(frame, 180, 40) }}>
            <line x1={ST_X[0] - 380} y1={RAIL_Y} x2={ST_X[4] + 380} y2={RAIL_Y} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
            <line
              x1={ST_X[0] - 380}
              y1={RAIL_Y}
              x2={ST_X[4] + 380}
              y2={RAIL_Y}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={2}
              strokeDasharray="2 14"
              strokeDashoffset={-frame * 1.2}
            />
            {railLit > 0 ? <line x1={ST_X[0]} y1={RAIL_Y} x2={railLit} y2={RAIL_Y} stroke={color.pink} strokeWidth={3} opacity={0.85} /> : null}
            {frame >= PULLBACK
              ? [0, 1, 2, 3, 4, 5].map((k) => {
                  const u = ((frame - PULLBACK + k * 14) % 84) / 84;
                  const x = mix(ST_X[0], ST_X[4], u);
                  return <circle key={k} cx={x} cy={RAIL_Y} r={9} fill="#ffd1de" opacity={Math.sin(u * Math.PI) * 0.9 * clamp((frame - PULLBACK) / 20)} />;
                })
              : null}
            {ST_X.map((x, i) => {
              const active = frame >= ARRIVE[i];
              const ring = prog(frame, ARRIVE[i], 30);
              return (
                <g key={i}>
                  <circle cx={x} cy={RAIL_Y} r={active ? 12 : 9} fill={active ? color.pink : "#2d2d31"} />
                  {active && ring < 1 ? <circle cx={x} cy={RAIL_Y} r={12 + ring * 46} fill="none" stroke={color.pink} strokeWidth={2} opacity={1 - ring} /> : null}
                </g>
              );
            })}
          </svg>

          {/* station cards */}
          {STATIONS.map((_, i) => {
            const active = frame >= ARRIVE[i];
            const glow = active ? prog(frame, ARRIVE[i], 10) * (1 - prog(frame, LEAVE[i], 30) * 0.75) : 0;
            return (
              <div key={i} style={{ position: "absolute", left: cardLeft(i), top: CARD_TOP }}>
                <StationCard
                  i={i}
                  t={frame - ARRIVE[i]}
                  active={active}
                  done={prog(frame, LEAVE[i] - 8, 12)}
                  glow={glow}
                  appear={prog(frame, 170 + i * 6, 40, ease.out)}
                />
              </div>
            );
          })}

          {/* trail */}
          {trail.length > 1 && frame < WHIP ? (
            <svg width={10} height={10} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
              <defs>
                <linearGradient
                  id="trailGrad"
                  gradientUnits="userSpaceOnUse"
                  x1={trail[0].split(",")[0]}
                  y1={trail[0].split(",")[1]}
                  x2={trail[trail.length - 1].split(",")[0]}
                  y2={trail[trail.length - 1].split(",")[1]}
                >
                  <stop offset="0" stopColor={color.pink} stopOpacity={0.9} />
                  <stop offset="1" stopColor={color.pink} stopOpacity={0} />
                </linearGradient>
              </defs>
              <polyline points={trail.join(" ")} fill="none" stroke="url(#trailGrad)" strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
              <polyline points={trail.join(" ")} fill="none" stroke="url(#trailGrad)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}

          {/* traveller: envelope (until Parse) */}
          {frame >= 150 && envDrop < 1 ? (
            <div style={{ position: "absolute", left: tp.x, top: tp.y + envDrop * 90, width: 0, height: 0 }}>
              <div
                style={{
                  position: "absolute",
                  left: -ENV_W / 2,
                  top: -ENV_H / 2,
                  transform: `scale(${tp.s * mix(0.4, 1, envelopeIn)})`,
                  opacity: clamp(envelopeIn * 2) * (1 - envDrop),
                }}
              >
                <Envelope open={openT} letter={paperOn ? 0 : letterT} glow={(frame < ARRIVE[0] ? 1 : 0.55) * (1 - envDrop)} attachment={clipGone ? 0 : 1} />
              </div>
            </div>
          ) : null}

          {/* traveller: letter flipping into the parsed JSON */}
          {paperOn ? (
            <div
              style={{
                position: "absolute",
                left: tp.x + LETTER_OUT_OFFSET.x * tp.s * (1 - settle),
                top: tp.y + LETTER_OUT_OFFSET.y * tp.s * (1 - settle),
                width: 0,
                height: 0,
                perspective: 900,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -115,
                  top: -82,
                  width: 230,
                  height: 164,
                  transformStyle: "preserve-3d",
                  transform: `scale(${tp.s * mix(LETTER_W / 230, 1, flipT)}) rotateY(${flipT * 180}deg)`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    borderRadius: 10,
                    backgroundColor: "#f4f4f6",
                    padding: "20px 20px",
                    boxSizing: "border-box",
                  }}
                >
                  {[0.9, 0.7, 0.8, 0.5].map((w, i) => (
                    <div key={i} style={{ height: 9, width: `${w * 100}%`, borderRadius: 5, backgroundColor: i === 0 ? "#fd366e" : "#c9c9d1", marginBottom: 12 }} />
                  ))}
                </div>
                <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                  <JsonDoc />
                </div>
              </div>
            </div>
          ) : null}

          {/* Store: the tag and a copy of the email drop into the card through a slot */}
          {(() => {
            const tagX = ST_X[2] + TAG_OFFSET.x * 0.9;
            const tagY0 = RAIL_Y + TAG_OFFSET.y * 0.9;
            const envY0 = RAIL_Y;
            const slotY = CARD_TOP;
            const tagT = prog(frame, A2 + 6, 12, ease.in);
            const emlT = prog(frame, A2 + 16, 12, ease.in);
            const slotA = keys(frame, [A2 + 14, A2 + 18, A2 + 34], [0, 1, 0], [ease.out, ease.inOut]);
            const slotB = keys(frame, [A2 + 24, A2 + 28, A2 + 44], [0, 1, 0], [ease.out, ease.inOut]);
            return (
              <>
                {clipGone && tagT < 1 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: tagX - (TAG.w * 0.9) / 2,
                      top: mix(tagY0, slotY - 14, tagT) - (TAG.h * 0.9) / 2,
                      width: TAG.w * 0.9,
                      height: TAG.h * 0.9,
                      borderRadius: 8,
                      backgroundColor: "#3a3a42",
                      border: "1px solid rgba(253,54,110,0.85)",
                      boxShadow: "0 0 26px rgba(253,54,110,0.55)",
                      color: color.foreground,
                      fontFamily: font.mono,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 1 - prog(tagT, 0.7, 0.3),
                      clipPath: `inset(0 0 ${Math.max(0, (mix(tagY0, slotY - 14, tagT) + (TAG.h * 0.9) / 2 - slotY)) * 1.1}px 0)`,
                    }}
                  >
                    {EMAIL.attachment.name}
                  </div>
                ) : null}
                {frame >= A2 + 16 && emlT < 1 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: ST_X[2] - ENV_W / 2,
                      top: mix(envY0, slotY - 40, emlT) - ENV_H / 2,
                      transform: `scale(${0.9 * mix(1, 0.7, emlT)})`,
                      opacity: 0.9 * (1 - prog(emlT, 0.55, 0.45)),
                    }}
                  >
                    <Envelope glow={0.4} attachment={0} />
                  </div>
                ) : null}
                <div
                  style={{
                    position: "absolute",
                    left: tagX - 110,
                    top: slotY - 3,
                    width: 220,
                    height: 6,
                    borderRadius: 3,
                    background: "linear-gradient(90deg, transparent, #ffd1de, transparent)",
                    boxShadow: "0 0 24px rgba(253,54,110,0.9)",
                    opacity: slotA,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: ST_X[2] - 170,
                    top: slotY - 3,
                    width: 340,
                    height: 6,
                    borderRadius: 3,
                    background: "linear-gradient(90deg, transparent, #ffd1de, transparent)",
                    boxShadow: "0 0 24px rgba(253,54,110,0.9)",
                    opacity: slotB,
                  }}
                />
              </>
            );
          })()}
        </div>
      </AbsoluteFill>

      {/* ---------- compose (screen space) ---------- */}
      {composeVisible ? (
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              left: COMPOSE_SCREEN.x,
              top: COMPOSE_SCREEN.y,
              opacity: composeIn * (1 - clamp(fold * 1.3)),
              transformOrigin: `${COMPOSE_SCREEN.w / 2}px ${COMPOSE_SCREEN.h / 2}px`,
              transform: `translateY(${(1 - composeIn) * 30}px) scale(${mix(0.94, 1, composeIn) * mix(1, 0.2, fold)})`,
              filter: fold > 0.02 ? `blur(${fold * 14}px)` : undefined,
            }}
          >
            <div style={{ transformOrigin: "0 0", transform: `scale(${COMPOSE_K})` }}>
              <Compose subject={subject} body={body} caret={caret} caretOn={caretOn} attachment={attachment} sendPress={sendPress} toChip={prog(frame, 26, 12)} />
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: addrX,
              top: addrY - toSize * 0.75,
              height: toSize * 1.5,
              display: "flex",
              alignItems: "center",
              fontFamily: font.mono,
              fontWeight: 500,
              fontSize: toSize,
              whiteSpace: "pre",
              opacity: 1 - clamp(fold * 1.3),
              transformOrigin: `${WIDTH / 2 - addrX}px ${FOLD.y + HEIGHT / 2 - (addrY - toSize * 0.75)}px`,
              transform: `scale(${mix(1, 0.2, fold)})`,
              filter: fold > 0.02 ? `blur(${fold * 14}px)` : undefined,
            }}
          >
            <span style={{ color: color.pink }}>support</span>
            <span style={{ color: color.mutedForeground }}>@</span>
            <span style={{ color: color.foreground }}>{EMAIL.functionId}</span>
            <span style={{ color: color.mutedForeground }}>.{EMAIL.zone}</span>
          </div>
          <Cursor x={cur[0]} y={cur[1]} press={cursorPress} ripple={frame >= 138 && frame < 160 ? (frame - 138) / 22 : -1} opacity={cursorOpacity} scale={1.6} />
        </AbsoluteFill>
      ) : null}

      {/* fold flash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${((FOLD.y + HEIGHT / 2) / HEIGHT) * 100}%, rgba(253,54,110,${0.45 * keys(frame, [146, 158, 186], [0, 1, 0])}) 0%, transparent 40%)`,
          mixBlendMode: "screen",
        }}
      />

      {/* overview recap */}
      {overview > 0 ? (
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              top: 214,
              width: WIDTH,
              textAlign: "center",
              fontFamily: font.display,
              fontSize: 68,
              letterSpacing: "-0.03em",
              color: color.foreground,
              opacity: overview,
            }}
          >
            <Reveal text="Appwrite handles every step." start={PULLBACK + 28} stagger={3} dur={22} />
          </div>
          {STATIONS.map((st, i) => {
            const p = w2s(ST_X[i], CARD_TOP + CARD_H + 70);
            return (
              <div
                key={st.n}
                style={{
                  position: "absolute",
                  left: p.x - 160,
                  width: 320,
                  top: p.y,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "baseline",
                  gap: 10,
                  fontFamily: font.display,
                  fontSize: 36,
                  letterSpacing: "-0.02em",
                  color: color.foreground,
                  opacity: overview * prog(frame, PULLBACK + 34 + i * 4, 16),
                  transform: `translateY(${(1 - prog(frame, PULLBACK + 34 + i * 4, 18, ease.out)) * 12}px)`,
                }}
              >
                <span style={{ fontFamily: font.mono, fontSize: 20, color: color.pink }}>{st.n}</span>
                {st.title}
              </div>
            );
          })}
        </AbsoluteFill>
      ) : null}

      <FilmOverlay grain={0.045} vignette={0.5} />
    </AbsoluteFill>
  );
};
