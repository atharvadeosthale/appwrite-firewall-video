import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { hexA } from "../components/EmailNotice";
import { Reveal } from "../components/Reveal";
import { bezierPoint, clamp, ease, keys, mix, prog, rand } from "../lib/anim";
import { color, font } from "../theme";
import { HEIGHT, WIDTH } from "../timeline";

// "One hostname. Two separate rules." — support.example.com splits in half:
// the top half carries HTTP to a site, the bottom half carries SMTP to a
// function (docs: the email rule and the HTTP rule of a domain are separate).

const HOST = "support.example.com";
const HS = 128; // hostname font size
const HCW = HS * 0.6;
const HOST_W = HOST.length * HCW;
const HOST_L = -HOST_W / 2;
const HOST_R = HOST_W / 2;

const SITE = { x: 2060, y: -300 };
const FUNC = { x: 2060, y: 330 };
const SPLIT_AT = 44;
const TRUCK_AT = 92;

const lerpLog = (a: number, b: number, t: number) => Math.exp(mix(Math.log(a), Math.log(b), t));

const camAt = (f: number) => {
  const settle = prog(f, 0, 40, ease.out);
  const truck = prog(f, TRUCK_AT, 78, ease.inOut);
  const x = mix(0, 1500, truck);
  const y = mix(0, -40, truck);
  const s = f < TRUCK_AT ? mix(1.1, 1, settle) : lerpLog(1, 0.9, truck) * mix(1, 1.035, prog(f, 170, 70, ease.linear));
  return { x, y, s };
};

// Incoming traffic from the left: mixed until the split, then sorted.
const INCOMING = Array.from({ length: 34 }, (_, i) => ({
  kind: (rand(i * 3.3 + 1) < 0.5 ? "http" : "smtp") as "http" | "smtp",
  at: -10 + i * 3.2 + rand(i * 7.1) * 3,
  lane: (rand(i * 1.7 + 4) - 0.5) * 70,
}));
// Outgoing after the split
const OUT = Array.from({ length: 16 }, (_, i) => ({
  kind: (i % 2 === 0 ? "http" : "smtp") as "http" | "smtp",
  at: SPLIT_AT + 18 + i * 8.5 + rand(i * 2.9) * 4,
}));

const Envelope: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <div
    style={{
      position: "relative",
      width: 46 * s,
      height: 32 * s,
      borderRadius: 6 * s,
      backgroundColor: "#2f2f37",
      border: `${1.5 * s}px solid ${color.pink}`,
      boxShadow: `0 0 ${20 * s}px rgba(253,54,110,0.65)`,
      boxSizing: "border-box",
      overflow: "hidden",
    }}
  >
    <svg width={46 * s} height={32 * s} viewBox="0 0 46 32" style={{ position: "absolute", left: -1.5 * s, top: -1.5 * s }}>
      <path d="M 3 4 L 23 18 L 43 4" fill="none" stroke={color.pink} strokeWidth={2} />
    </svg>
  </div>
);

const Request: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      height: 34,
      padding: "0 12px",
      borderRadius: 10,
      backgroundColor: hexA(color.violet, 0.16),
      border: `1.5px solid ${color.violet}`,
      boxShadow: `0 0 20px ${hexA(color.violet, 0.55)}`,
      fontFamily: font.mono,
      fontSize: 17,
      color: color.foreground,
      whiteSpace: "pre",
    }}
  >
    <span style={{ color: color.violet }}>GET</span> {label}
  </div>
);

const PATHS = ["/", "/help", "/status", "/orders", "/", "/faq", "/login", "/"];

export const S7Split: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camAt(f);
  const camPrev = camAt(f - 1);
  const speed = Math.abs(cam.x - camPrev.x) * cam.s;
  const blur = Math.min(14, speed * 0.55);

  const split = prog(f, SPLIT_AT, 22, ease.backOut);
  const seam = keys(f, [SPLIT_AT - 2, SPLIT_AT + 2, SPLIT_AT + 26], [0, 1, 0], [ease.out, ease.inOut]);
  const tint = prog(f, SPLIT_AT, 18, ease.out);
  const slam = prog(f, -6, 18, ease.out);
  const exit = prog(f, 222, 18, ease.in);

  const w2s = (x: number, y: number) => ({
    x: (x - cam.x) * cam.s + WIDTH / 2,
    y: (y - cam.y) * cam.s + HEIGHT / 2,
  });

  const outPath = (kind: "http" | "smtp", t: number): [number, number] => {
    const to = kind === "http" ? SITE : FUNC;
    const y0 = kind === "http" ? -66 : 66;
    return bezierPoint(t, [HOST_R + 30, y0], [HOST_R + 520, y0], [to.x - 700, to.y], [to.x - 330, to.y]);
  };

  const siteHits = OUT.filter((o) => o.kind === "http").map((o) => o.at + 44);
  const funcHits = OUT.filter((o) => o.kind === "smtp").map((o) => o.at + 44);
  const pulse = (hits: number[]) => Math.max(0, ...hits.map((h) => (f >= h ? 1 - clamp((f - h) / 18) : 0)));
  const sitePulse = pulse(siteHits);
  const funcPulse = pulse(funcHits);
  const loaded = funcHits.filter((h) => f >= h).length;
  const pageLoad = clamp(siteHits.filter((h) => f >= h).length / 3);

  const halfStyle = (top: boolean): React.CSSProperties => {
    const c = top ? color.violet : color.pink;
    return {
      position: "absolute",
      left: HOST_L,
      top: -HS * 0.75 + (top ? -1 : 1) * split * 66,
      height: HS * 1.5,
      width: HOST_W + 20,
      display: "flex",
      alignItems: "center",
      fontFamily: font.mono,
      fontWeight: 500,
      fontSize: HS,
      whiteSpace: "pre",
      color: `color-mix(in oklab, ${color.foreground} ${Math.round((1 - tint) * 100)}%, ${c})`,
      textShadow: tint > 0 ? `0 0 ${40 * tint}px ${hexA(c, 0.55 * tint)}` : undefined,
      clipPath: top ? "inset(0 0 50% 0)" : "inset(50% 0 0 0)",
      transform: `translateX(${(top ? -1 : 1) * split * 14}px)`,
    };
  };

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="truckBlur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={`${blur} 0`} />
        </filter>
      </svg>

      <AbsoluteFill style={{ filter: blur > 0.6 ? "url(#truckBlur)" : undefined }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: `translate(${WIDTH / 2 - cam.x * cam.s}px, ${HEIGHT / 2 - cam.y * cam.s}px) scale(${cam.s})`,
          }}
        >
          {/* big lane words (parallax behind) */}
          {[
            { word: "HTTP", y: -262, c: color.violet },
            { word: "SMTP", y: 262, c: color.pink },
          ].map((l, i) => {
            const t = prog(f, SPLIT_AT + 6 + i * 4, 24, ease.out);
            return (
              <div
                key={l.word}
                style={{
                  position: "absolute",
                  left: HOST_R - 600 + cam.x * 0.3,
                  top: l.y - 70,
                  fontFamily: font.display,
                  fontSize: 150,
                  lineHeight: "140px",
                  letterSpacing: "-0.04em",
                  color: hexA(l.c, 0.9),
                  opacity: t * 0.9,
                  transform: `translateY(${(1 - t) * (i === 0 ? 40 : -40)}px)`,
                  filter: t < 1 ? `blur(${(1 - t) * 10}px)` : undefined,
                }}
              >
                {l.word}
              </div>
            );
          })}

          {/* lanes */}
          <svg width={10} height={10} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            {(["http", "smtp"] as const).map((k) => {
              const pts = Array.from({ length: 40 }, (_, i) => outPath(k, i / 39));
              const d = `M ${pts.map((p) => p.join(" ")).join(" L ")}`;
              const draw = prog(f, SPLIT_AT + 10, 40, ease.inOut);
              const c = k === "http" ? color.violet : color.pink;
              return (
                <g key={k}>
                  <path d={d} fill="none" stroke={hexA(c, 0.12)} strokeWidth={26} strokeLinecap="round" opacity={draw} />
                  <path d={d} fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} opacity={0.9} />
                </g>
              );
            })}
            {/* seam */}
            <line x1={HOST_L - 60} y1={0} x2={HOST_R + 60} y2={0} stroke="#ffffff" strokeWidth={4 * seam} opacity={seam} />
            <line x1={HOST_L - 60} y1={0} x2={HOST_R + 60} y2={0} stroke="#ffd1de" strokeWidth={30 * seam} opacity={0.35 * seam} />
          </svg>

          {/* incoming traffic */}
          {INCOMING.map((p, i) => {
            const t = (f - p.at) / 26;
            if (t < 0 || t > 1.05) return null;
            const sorted = f - p.at > 0 && p.at + 20 > SPLIT_AT;
            const yTarget = sorted ? (p.kind === "http" ? -66 : 66) : p.lane * 0.3;
            const x = mix(HOST_L - 1500, HOST_L - 10, ease.in(clamp(t)));
            const y = mix(p.lane * 2.4, yTarget, ease.inOut(clamp(t)));
            const a = clamp(t * 4) * (1 - clamp((t - 0.9) * 10));
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y, opacity: a, transform: "translate(-50%, -50%)" }}>
                {p.kind === "smtp" ? (
                  <Envelope s={0.8} />
                ) : (
                  <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color.violet, boxShadow: `0 0 18px ${color.violet}` }} />
                )}
              </div>
            );
          })}

          {/* hostname, split in two */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: `scale(${mix(1.25, 1, slam)})`,
              opacity: clamp(slam * 2.5),
              filter: slam < 1 ? `blur(${(1 - slam) * 12}px)` : undefined,
            }}
          >
            <div style={halfStyle(true)}>{HOST}</div>
            <div style={halfStyle(false)}>{HOST}</div>
          </div>

          {/* outgoing streams */}
          {OUT.map((o, i) => {
            const t = (f - o.at) / 44;
            if (t < 0 || t > 1) return null;
            const [x, y] = outPath(o.kind, ease.inOutSoft(clamp(t)));
            const a = clamp(t * 6) * (1 - clamp((t - 0.88) * 8));
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y, opacity: a, transform: "translate(-50%, -50%)" }}>
                {o.kind === "smtp" ? <Envelope /> : <Request label={PATHS[i % PATHS.length]} />}
              </div>
            );
          })}

          {/* site */}
          <div
            style={{
              position: "absolute",
              left: SITE.x - 330,
              top: SITE.y - 210,
              width: 700,
              height: 420,
              borderRadius: 26,
              backgroundColor: "#141418",
              border: `2px solid ${hexA(color.violet, 0.45 + 0.4 * sitePulse)}`,
              boxShadow: `0 60px 120px rgba(0,0,0,0.6), 0 0 ${80 * sitePulse}px ${hexA(color.violet, 0.35 * sitePulse)}`,
              overflow: "hidden",
            }}
          >
            <div style={{ height: 60, display: "flex", alignItems: "center", gap: 10, padding: "0 24px", borderBottom: `1px solid ${color.border}` }}>
              {[0, 1, 2].map((d) => (
                <span key={d} style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: color.muted }} />
              ))}
              <span
                style={{
                  marginLeft: 14,
                  flex: 1,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: color.muted,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 18px",
                  fontFamily: font.mono,
                  fontSize: 17,
                  color: color.mutedForeground,
                }}
              >
                https://{HOST}
              </span>
            </div>
            <div style={{ height: 3, width: `${pageLoad * 100}%`, backgroundColor: color.violet, opacity: pageLoad < 1 ? 1 : 0 }} />
            <div style={{ padding: "34px 36px", opacity: 0.25 + 0.75 * pageLoad }}>
              <div style={{ fontFamily: font.display, fontSize: 46, letterSpacing: "-0.03em", color: color.foreground }}>How can we help?</div>
              <div style={{ width: "72%", height: 14, borderRadius: 7, backgroundColor: color.muted, marginTop: 20 }} />
              <div style={{ width: "58%", height: 14, borderRadius: 7, backgroundColor: color.muted, marginTop: 12 }} />
              <div style={{ display: "flex", gap: 16, marginTop: 34 }}>
                {[0, 1, 2].map((c) => (
                  <div key={c} style={{ flex: 1, height: 96, borderRadius: 16, backgroundColor: "#1d1d22", border: "1px solid rgba(255,255,255,0.05)" }} />
                ))}
              </div>
            </div>
          </div>

          {/* function */}
          <div
            style={{
              position: "absolute",
              left: FUNC.x - 330,
              top: FUNC.y - 110,
              width: 700,
              height: 220,
              borderRadius: 30,
              backgroundColor: "#141418",
              border: `2px solid ${hexA(color.pink, 0.45 + 0.45 * funcPulse)}`,
              boxShadow: `0 60px 120px rgba(0,0,0,0.6), 0 0 ${90 * funcPulse}px ${hexA(color.pink, 0.4 * funcPulse)}`,
              display: "flex",
              alignItems: "center",
              gap: 28,
              padding: "0 40px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: 104,
                height: 104,
                flexShrink: 0,
                borderRadius: 28,
                backgroundColor: color.muted,
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                transform: `scale(${1 + funcPulse * 0.06})`,
              }}
            >
              <Img src={staticFile("email-triggers/icons/node.svg")} style={{ width: 52, height: 52 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: font.display, fontSize: 44, letterSpacing: "-0.025em", color: color.foreground }}>Support inbox</div>
              <div style={{ fontFamily: font.ui, fontSize: 21, color: color.mutedForeground, marginTop: 6 }}>Function · email trigger</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: font.mono, fontSize: 44, color: color.pink, fontVariantNumeric: "tabular-nums" }}>+{loaded}</div>
              <div style={{ fontFamily: font.ui, fontSize: 17, color: color.mutedForeground, marginTop: 2 }}>executions</div>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* kinetic captions (screen space) */}
      <div
        style={{
          position: "absolute",
          top: 96,
          width: WIDTH,
          textAlign: "center",
          fontFamily: font.display,
          fontSize: 68,
          letterSpacing: "-0.03em",
          color: color.foreground,
          opacity: 1 - prog(f, TRUCK_AT - 4, 14, ease.in),
        }}
      >
        <Reveal text="One hostname." start={4} stagger={3} dur={20} exit={{ start: SPLIT_AT - 12, dur: 10, stagger: 1 }} />
      </div>
      {f >= SPLIT_AT ? (
        <div
          style={{
            position: "absolute",
            top: 96,
            width: WIDTH,
            textAlign: "center",
            fontFamily: font.display,
            fontSize: 68,
            letterSpacing: "-0.03em",
            color: color.foreground,
            opacity: 1 - prog(f, TRUCK_AT - 4, 14, ease.in),
          }}
        >
          <Reveal text="Two separate rules." start={SPLIT_AT + 2} stagger={3} dur={20} unitStyle={(k) => (k === 0 ? { color: color.pink } : undefined)} />
        </div>
      ) : null}
      {(() => {
        const t = prog(f, 176, 24, ease.out);
        const site = w2s(SITE.x - 330, SITE.y - 250);
        const func = w2s(FUNC.x - 330, FUNC.y + 136);
        return (
          <>
            <div style={{ position: "absolute", left: site.x, top: site.y - 36, fontFamily: font.display, fontSize: 38, letterSpacing: "-0.02em", color: color.violet, opacity: t, transform: `translateY(${(1 - t) * 14}px)` }}>
              Web traffic → your site
            </div>
            <div style={{ position: "absolute", left: func.x, top: func.y, fontFamily: font.display, fontSize: 38, letterSpacing: "-0.02em", color: color.pink, opacity: t, transform: `translateY(${(1 - t) * -14}px)` }}>
              Email → your function
            </div>
          </>
        );
      })()}
    </AbsoluteFill>
  );
};
