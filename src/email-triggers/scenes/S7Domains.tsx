import { Check, Copy, Info, Loader2 } from "lucide-react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Backdrop, FilmOverlay } from "../components/Backdrop";
import { Reveal } from "../components/Reveal";
import { Badge, Button, Cursor, Toast } from "../components/ui";
import { bezierPoint, clamp, ease, keys, mix, prog } from "../lib/anim";
import { color, EMAIL, font } from "../theme";
import { WIDTH } from "../timeline";
import { S7Split } from "./S7Split";

// ---------------------------------------------------------------------------
// Part A: custom email domain verification (vibes VerifySmtpDomainContent,
// PR #451). Verification checks MX first, then the ownership TXT record
// (cloud PR #5589, DomainVerification).
const K = 1.58;
const CARD_W = 980;
const CARD_X = (WIDTH - CARD_W * K) / 2;
const CARD_Y = 330;

const DOMAIN = "mail.example.com";
const TXT_NAME = `_appwrite.${DOMAIN}`;

const COLS = { type: 92, name: 270, value: 520 };

const VERIFY_CLICK = 180;
const MX_OK = 196;
const TXT_OK = 210;
const VERIFIED = 216;
export const PART_B = 240;

// Address morph (built-in address → custom domain)
const MONO = 58;
const CW = MONO * 0.6;

const RecordRow: React.FC<{
  type: string;
  name: string;
  value: React.ReactNode;
  t: number;
  state: "idle" | "checking" | "ok";
  sweep?: number; // 0..1 green light passing over the row once verified
}> = ({ type, name, value, t, state, sweep = 0 }) => (
  <div
    style={{
      position: "relative",
      height: 54,
      display: "flex",
      alignItems: "center",
      borderTop: `1px solid ${color.border}`,
      opacity: clamp(t * 2),
      transform: `translateY(${(1 - ease.out(clamp(t))) * 10}px)`,
    }}
  >
    {sweep > 0 && sweep < 1 ? (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(90deg, transparent ${sweep * 100 - 18}%, oklch(0.696 0.17 162.48 / 0.22) ${sweep * 100}%, transparent ${sweep * 100 + 4}%)`,
          pointerEvents: "none",
        }}
      />
    ) : null}
    <div style={{ width: COLS.type, paddingLeft: 24, boxSizing: "border-box" }}>
      <Badge variant="secondary" size={11}>
        {type}
      </Badge>
    </div>
    <div style={{ width: COLS.name, paddingLeft: 12, boxSizing: "border-box", fontFamily: font.mono, fontSize: 13, color: color.foreground }}>{name}</div>
    <div style={{ width: COLS.value, paddingLeft: 12, boxSizing: "border-box", fontFamily: font.mono, fontSize: 13, color: color.foreground, whiteSpace: "nowrap" }}>
      {value}
    </div>
    <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, paddingRight: 24 }}>
      <Copy size={14} color={color.mutedForeground} />
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: state === "ok" ? "oklch(0.696 0.17 162.48 / 0.16)" : "transparent",
          border: state === "idle" ? `1px dashed ${color.ring}` : "none",
          boxSizing: "border-box",
        }}
      >
        {state === "checking" ? <Loader2 size={15} color={color.mutedForeground} /> : null}
        {state === "ok" ? <Check size={14} color="oklch(0.765 0.177 163.223)" strokeWidth={3} /> : null}
      </div>
    </div>
  </div>
);

const PartA: React.FC<{ frame: number }> = ({ frame }) => {
  // address morph
  const morph = prog(frame, 22, 26, ease.inOut);
  const addrUp = prog(frame, 64, 34, ease.inOut);
  const oldDomain = `${EMAIL.functionId}.${EMAIL.zone}`;
  const domLen = mix(oldDomain.length, DOMAIN.length, morph);
  const total = (8 + domLen) * CW; // "support@" + domain
  const size = mix(MONO, 34, addrUp);
  const scale = size / MONO;
  const addrCenterY = mix(560, 238, addrUp);
  const left = WIDTH / 2 - (total * scale) / 2;

  const cardIn = prog(frame, 84, 26, ease.out);
  const rowT = (i: number) => prog(frame, 112 + i * 14, 16, ease.out);
  const press = keys(frame, [VERIFY_CLICK - 4, VERIFY_CLICK, VERIFY_CLICK + 8], [0, 1, 0], ease.inOut);
  const verified = frame >= VERIFIED;
  const verifyPulse = keys(frame, [VERIFIED, VERIFIED + 8, VERIFIED + 40], [0, 1, 0], [ease.out, ease.inOut]);
  const exit = prog(frame, PART_B - 18, 18, ease.in);

  const state = (okAt: number): "idle" | "checking" | "ok" =>
    frame < VERIFY_CLICK + 4 ? "idle" : frame < okAt ? "checking" : "ok";

  // cursor in card (1x) coordinates
  const verifyBtn = { x: CARD_W - 24 - 36, y: 0 }; // y filled below
  const footerTop = 126 + 40 + 54 * 2 + 1;
  verifyBtn.y = footerTop + 72 / 2;
  const cT = prog(frame, 146, 30, ease.inOut);
  const cur = bezierPoint(cT, [CARD_W + 160, 520], [CARD_W + 60, 460], [verifyBtn.x + 120, verifyBtn.y + 60], [verifyBtn.x + 4, verifyBtn.y + 4]);
  const cursorOpacity = prog(frame, 142, 8) * (1 - prog(frame, 204, 12));
  const toastIn = prog(frame, VERIFIED + 2, 14, ease.out) * (1 - prog(frame, PART_B - 16, 12));

  return (
    <AbsoluteFill style={{ opacity: 1 - exit, transform: `translateY(${-exit * 60}px)`, filter: exit > 0.02 ? `blur(${exit * 10}px)` : undefined }}>
      <div
        style={{
          position: "absolute",
          top: 104,
          width: WIDTH,
          textAlign: "center",
          fontFamily: font.display,
          fontSize: 66,
          letterSpacing: "-0.03em",
          color: color.foreground,
          opacity: 1 - addrUp,
        }}
      >
        <Reveal text="Bring your own domain." start={4} stagger={3} dur={22} />
      </div>

      {/* address: support@<function>.appwrite.email → support@mail.example.com */}
      <div
        style={{
          position: "absolute",
          left,
          top: addrCenterY - (MONO * 1.5 * scale) / 2,
          height: MONO * 1.5,
          transformOrigin: "0 0",
          transform: `scale(${scale})`,
          display: "flex",
          alignItems: "center",
          fontFamily: font.mono,
          fontWeight: 500,
          fontSize: MONO,
          whiteSpace: "pre",
        }}
      >
        <span style={{ color: color.pink }}>support</span>
        <span style={{ color: color.mutedForeground }}>@</span>
        <span style={{ position: "relative", display: "inline-block", width: domLen * CW, height: MONO * 1.5, overflow: "hidden" }}>
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              lineHeight: `${MONO * 1.5}px`,
              color: color.mutedForeground,
              transform: `translateY(${-morph * 0.8}em)`,
              opacity: 1 - morph,
              filter: morph > 0 && morph < 1 ? `blur(${morph * 6}px)` : undefined,
            }}
          >
            {oldDomain}
          </span>
          <span
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              lineHeight: `${MONO * 1.5}px`,
              color: color.foreground,
              transform: `translateY(${(1 - morph) * 0.8}em)`,
              opacity: morph,
              filter: morph > 0 && morph < 1 ? `blur(${(1 - morph) * 6}px)` : undefined,
            }}
          >
            {DOMAIN}
          </span>
        </span>
      </div>

      {/* DNS records card */}
      <div
        style={{
          position: "absolute",
          left: CARD_X,
          top: CARD_Y,
          width: CARD_W,
          transformOrigin: "0 0",
          transform: `perspective(${2400 / K}px) translateY(${(1 - cardIn) * 40}px) scale(${K}) rotateX(${mix(14, 3, prog(frame, 84, 150, ease.outSoft))}deg) rotateY(${mix(12, 2, prog(frame, 84, 150, ease.outSoft))}deg)`,
          opacity: cardIn,
          borderRadius: 14,
          border: `1px solid ${verifyPulse > 0.02 ? `oklch(0.696 0.17 162.48 / ${0.25 + 0.5 * verifyPulse})` : color.border}`,
          backgroundColor: color.background,
          boxShadow: `0 40px 80px rgba(0,0,0,0.55)${verifyPulse > 0.02 ? `, 0 0 ${60 * verifyPulse}px oklch(0.696 0.17 162.48 / ${0.25 * verifyPulse})` : ""}`,
          fontFamily: font.ui,
          overflow: "hidden",
        }}
      >
        <div style={{ height: 126, padding: "18px 24px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: color.foreground }}>DNS records</span>
            <div style={{ position: "relative", height: 22, display: "flex", alignItems: "center" }}>
              {verified ? (
                <Badge variant="verified" size={11} style={{ transform: `scale(${mix(0.7, 1, prog(frame, VERIFIED, 10, ease.backOut))})` }}>
                  Verified
                </Badge>
              ) : (
                <Badge variant="unverified" size={11}>
                  Unverified
                </Badge>
              )}
            </div>
          </div>
          <div style={{ fontSize: 13, lineHeight: "20px", color: color.mutedForeground, marginTop: 8 }}>
            Point MX at Appwrite SMTP and prove ownership with a TXT record. No TLS certificate is issued for email domains.
          </div>
          <div style={{ fontFamily: font.mono, fontSize: 13, lineHeight: "20px", color: color.mutedForeground, marginTop: 6 }}>{DOMAIN}</div>
        </div>
        <div style={{ height: 40, display: "flex", alignItems: "center", borderTop: `1px solid ${color.border}` }}>
          {[
            ["Type", COLS.type, 24],
            ["Name", COLS.name, 12],
            ["Value", COLS.value, 12],
          ].map(([l, w, pl]) => (
            <div
              key={l as string}
              style={{
                width: w as number,
                paddingLeft: pl as number,
                boxSizing: "border-box",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: color.mutedForeground,
              }}
            >
              {l}
            </div>
          ))}
        </div>
        <RecordRow
          type="MX"
          name={DOMAIN}
          value={<span style={{ fontFamily: font.ui, color: color.mutedForeground }}>Appwrite mail server</span>}
          t={rowT(0)}
          state={state(MX_OK)}
          sweep={prog(frame, MX_OK - 12, 16, ease.inOut)}
        />
        <RecordRow
          type="TXT"
          name={TXT_NAME}
          value={
            <>
              <span style={{ color: color.mutedForeground }}>appwrite-domain-verification=</span>
              {EMAIL.verificationToken}
            </>
          }
          t={rowT(1)}
          state={state(TXT_OK)}
          sweep={prog(frame, TXT_OK - 12, 16, ease.inOut)}
        />
        <div
          style={{
            height: 72,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 24px",
            borderTop: `1px solid ${color.border}`,
            backgroundColor: "rgba(45,45,49,0.3)",
            boxSizing: "border-box",
          }}
        >
          <Info size={15} color={color.mutedForeground} />
          <span style={{ flex: 1, fontSize: 13, color: color.mutedForeground }}>DNS changes can take up to 48 hours to propagate.</span>
          <Button variant="outline">Change</Button>
          <Button pressed={press}>
            {frame >= VERIFY_CLICK && frame < VERIFIED ? <Loader2 size={14} style={{ transform: `rotate(${frame * 12}deg)` }} /> : null}
            Verify
          </Button>
        </div>
        <Cursor x={cur[0]} y={cur[1]} press={press} ripple={frame >= VERIFY_CLICK && frame < VERIFY_CLICK + 22 ? (frame - VERIFY_CLICK) / 22 : -1} opacity={cursorOpacity} scale={1} />
      </div>

      <div
        style={{
          position: "absolute",
          right: 64,
          bottom: 56,
          transformOrigin: "100% 100%",
          transform: `scale(1.6) translateY(${(1 - toastIn) * 24}px)`,
          opacity: toastIn,
        }}
      >
        <Toast>Email domain verified</Toast>
      </div>
    </AbsoluteFill>
  );
};

export const S7Domains: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: color.void }}>
      <Backdrop
        grid={{ opacity: 0.04, size: 44 }}
        glows={[
          { x: 960, y: 620, size: 1600, color: "rgba(253,54,110,0.10)", opacity: 0.9 },
          { x: 1400, y: 360, size: 1100, color: "rgba(155,138,255,0.10)", opacity: 0.8 },
        ]}
        grain={0}
        vignette={0}
      />
      {frame < PART_B + 8 ? <PartA frame={frame} /> : null}
      <Sequence from={PART_B} layout="none">
        <S7Split />
      </Sequence>
      <FilmOverlay grain={0.045} vignette={0.5} />
    </AbsoluteFill>
  );
};

