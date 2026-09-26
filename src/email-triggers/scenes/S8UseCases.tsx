import { CornerUpLeft } from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FilmOverlay } from "../components/Backdrop";
import { EmailNotice, hexA, NOTICE_H, NOTICE_W } from "../components/EmailNotice";
import { clamp, ease, keys, mix, prog } from "../lib/anim";
import { color, EMAIL, font } from "../theme";
import { BEAT, WIDTH } from "../timeline";

// Use cases from the announcement post, as a four-shot montage cut on the
// beat: support inbox, invoice processing, alerts, reply by email.
const SHOT = BEAT * 3; // 90 frames
const WHIP = 10;

type Shot = {
  n: string;
  word: string;
  caption: string;
  tint: string;
  Visual: React.FC<{ t: number }>;
};

// ---------------------------------------------------------------------------
// Shared title block
const Title: React.FC<{ shot: Shot; t: number }> = ({ shot, t }) => {
  const eyebrow = prog(t, 2, 16, ease.out);
  const cap = prog(t, 18, 20, ease.out);
  return (
    <div style={{ position: "absolute", left: 150, top: 330, width: 700 }}>
      <div
        style={{
          fontFamily: font.mono,
          fontSize: 22,
          letterSpacing: "0.14em",
          color: shot.tint,
          opacity: eyebrow,
          transform: `translateX(${(1 - eyebrow) * -20}px)`,
        }}
      >
        {shot.n} / USE CASE
      </div>
      <div style={{ marginTop: 18, height: 170, overflow: "hidden" }}>
        <div style={{ display: "flex" }}>
          {Array.from(shot.word).map((ch, i) => {
            const c = prog(t, 6 + i * 1.6, 20, ease.out);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontFamily: font.display,
                  fontSize: 168,
                  lineHeight: "170px",
                  letterSpacing: "-0.045em",
                  color: color.foreground,
                  transform: `translateY(${(1 - c) * 100}%)`,
                  whiteSpace: "pre",
                }}
              >
                {ch}
              </span>
            );
          })}
          <span
            style={{
              display: "inline-block",
              fontFamily: font.display,
              fontSize: 168,
              lineHeight: "170px",
              color: shot.tint,
              transform: `translateY(${(1 - prog(t, 6 + shot.word.length * 1.6, 20, ease.out)) * 100}%)`,
            }}
          >
            .
          </span>
        </div>
      </div>
      <div
        style={{
          marginTop: 22,
          fontFamily: font.ui,
          fontSize: 32,
          lineHeight: "44px",
          color: color.mutedForeground,
          opacity: cap,
          transform: `translateY(${(1 - cap) * 16}px)`,
        }}
      >
        {shot.caption}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 01 Support: rows land in a tilted table; the reply goes back out.
const TABLE_ROWS = [
  { name: "Priya Raman", initials: "PR", subject: "Can't reset my password", time: "09:10", kind: "support" as const },
  { name: "Diego Alvarez", initials: "DA", subject: "Refund for order 1038", time: "09:05", kind: "support" as const },
  { name: "Mei Chen", initials: "MC", subject: "Wrong size delivered", time: "09:02", kind: "support" as const },
  { name: "Sam Carter", initials: "SC", subject: "Re: Where is my package?", time: "09:01", kind: "reply" as const },
  { name: "Lena Fischer", initials: "LF", subject: "Account locked after update", time: "08:57", kind: "support" as const },
  { name: "Ana Souza", initials: "AS", subject: "Charged twice for order 1041", time: "08:51", kind: "support" as const },
];
const HERO_ROW = { name: EMAIL.fromName, initials: "WO", subject: EMAIL.subject, time: "09:14", kind: "support" as const, attachment: "receipt.pdf" };

const SupportVisual: React.FC<{ t: number }> = ({ t }) => {
  const land = prog(t, 10, 22, ease.out);
  const replied = prog(t, 38, 12, ease.backOut);
  const replyOut = prog(t, 46, 30, ease.in);
  const step = NOTICE_H + 16;
  return (
    <div style={{ position: "absolute", left: 1330, top: 600, width: 0, height: 0, perspective: 1400 }}>
      <div
        style={{
          position: "absolute",
          left: -NOTICE_W * 0.75,
          top: -330,
          width: NOTICE_W * 1.5,
          transformOrigin: "50% 40%",
          transform: `rotateX(${mix(40, 34, prog(t, 0, 90, ease.linear))}deg) rotateZ(-12deg) scale(1.5)`,
        }}
      >
        <div style={{ position: "relative", height: step * 7 }}>
          {/* existing rows pushed down as the hero lands */}
          {TABLE_ROWS.map((r, i) => (
            <div key={r.name} style={{ position: "absolute", left: NOTICE_W * 0.25, top: (i + land) * step, opacity: 1 - clamp((i + land - 5) / 1.2) }}>
              <EmailNotice n={r} />
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              left: NOTICE_W * 0.25,
              top: mix(-step * 2.2, 0, land),
              opacity: clamp(land * 2),
              transform: `scale(${mix(1.25, 1, land)})`,
            }}
          >
            <EmailNotice n={HERO_ROW} fresh={1 - prog(t, 30, 40)} unread />
            <div
              style={{
                position: "absolute",
                right: 16,
                top: 44,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 26,
                padding: "0 10px",
                borderRadius: 8,
                backgroundColor: "oklch(0.696 0.17 162.48 / 0.16)",
                color: "oklch(0.765 0.177 163.223)",
                fontFamily: font.ui,
                fontSize: 12,
                fontWeight: 600,
                opacity: replied,
                transform: `scale(${mix(0.5, 1, replied)})`,
              }}
            >
              <CornerUpLeft size={12} strokeWidth={2.6} />
              Replied
            </div>
          </div>
        </div>
      </div>
      {/* reply envelope flying back out */}
      {replyOut > 0 && replyOut < 1 ? (
        <div
          style={{
            position: "absolute",
            left: mix(40, 620, replyOut) - 30,
            top: mix(-190, -700, replyOut) - 20,
            width: 60,
            height: 42,
            borderRadius: 8,
            backgroundColor: "#2f2f37",
            border: `2px solid ${color.pink}`,
            boxShadow: `0 0 26px rgba(253,54,110,0.7)`,
            transform: `rotate(${-25 * replyOut}deg) scale(${mix(1, 1.6, replyOut)})`,
            opacity: 1 - clamp((replyOut - 0.8) * 5),
          }}
        >
          <svg width={60} height={42} viewBox="0 0 60 42" style={{ position: "absolute", left: -2, top: -2 }}>
            <path d="M 4 5 L 30 24 L 56 5" fill="none" stroke={color.pink} strokeWidth={2.2} />
          </svg>
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 02 Invoices: a scan beam reads the PDF; fields fly out as JSON.
const FIELDS: { k: string; v: string; big?: boolean }[] = [
  { k: "vendor", v: '"Northwind"' },
  { k: "invoice", v: '"INV-2291"' },
  { k: "total", v: "1240.00", big: true },
  { k: "due", v: '"2026-10-23"' },
];

const InvoiceVisual: React.FC<{ t: number }> = ({ t }) => {
  const scan = prog(t, 8, 44, ease.inOut);
  const rows = [
    ["Support plan — September", "900.00"],
    ["Priority shipping", "220.00"],
    ["Handling", "120.00"],
  ];
  return (
    <div style={{ position: "absolute", left: 880, top: 190, width: 0, height: 0, perspective: 1600 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 500,
          height: 680,
          borderRadius: 18,
          backgroundColor: "#f2f2f5",
          boxShadow: "0 60px 120px rgba(0,0,0,0.6)",
          transform: `rotateY(${mix(22, 14, prog(t, 0, 90, ease.linear))}deg) rotateX(6deg)`,
          transformOrigin: "0 50%",
          padding: "44px 46px",
          boxSizing: "border-box",
          overflow: "hidden",
          fontFamily: font.ui,
          color: "#1f1f24",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: font.display, fontSize: 40, letterSpacing: "-0.02em" }}>Invoice</div>
            <div style={{ fontFamily: font.mono, fontSize: 18, color: "#6b6b75", marginTop: 6 }}>INV-2291</div>
          </div>
          <div style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: color.orange }} />
        </div>
        <div style={{ marginTop: 36, fontSize: 18, color: "#55555e" }}>Northwind Traders</div>
        <div style={{ marginTop: 6, fontSize: 16, color: "#8a8a94" }}>Due 2026-10-23</div>
        <div style={{ marginTop: 40, borderTop: "1.5px solid #dcdce2" }} />
        {rows.map(([a, b]) => (
          <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "18px 0", borderBottom: "1.5px solid #e4e4ea", fontSize: 19 }}>
            <span>{a}</span>
            <span style={{ fontFamily: font.mono }}>{b}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, fontSize: 26, fontWeight: 600 }}>
          <span>Total</span>
          <span style={{ fontFamily: font.mono }}>1,240.00</span>
        </div>
        {/* scan beam */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: mix(-20, 700, scan),
            height: 4,
            backgroundColor: color.orange,
            boxShadow: `0 0 30px 10px ${hexA(color.orange, 0.55)}`,
            opacity: scan > 0 && scan < 1 ? 1 : 0,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: mix(0, 700, scan),
            background: `linear-gradient(180deg, ${hexA(color.orange, 0)} 0%, ${hexA(color.orange, 0.1)} 100%)`,
          }}
        />
      </div>
      {/* extracted JSON */}
      <div style={{ position: "absolute", left: 600, top: 150 }}>
        {FIELDS.map((fd, i) => {
          const at = 14 + i * 9;
          const on = prog(t, at, 18, ease.out);
          return (
            <div
              key={fd.k}
              style={{
                marginBottom: fd.big ? 22 : 16,
                display: "inline-flex",
                alignItems: "center",
                height: fd.big ? 76 : 56,
                padding: "0 22px",
                borderRadius: 16,
                backgroundColor: "#16161a",
                border: `1.5px solid ${fd.big ? color.orange : "rgba(255,255,255,0.1)"}`,
                boxShadow: fd.big ? `0 0 40px ${hexA(color.orange, 0.35)}` : "0 20px 40px rgba(0,0,0,0.4)",
                fontFamily: font.mono,
                fontSize: fd.big ? 34 : 24,
                whiteSpace: "pre",
                opacity: on,
                transform: `translateX(${(1 - on) * -260}px) scale(${mix(0.7, 1, on)})`,
                transformOrigin: "0 50%",
                clear: "both",
                float: "left",
              }}
            >
              <span style={{ color: "#67a3fe" }}>{fd.k}</span>
              <span style={{ color: "#c5c5cc" }}>: </span>
              <span style={{ color: fd.v.startsWith('"') ? "#4ad4ab" : color.orange }}>{fd.v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 03 Alerts: the alert email flips into an incident.
const AlertVisual: React.FC<{ t: number }> = ({ t }) => {
  const inT = prog(t, 4, 18, ease.out);
  const flip = prog(t, 36, 20, ease.inOut);
  const rings = [10, 20, 30].map((at) => clamp((t - at) / 30));
  const shake = t > 8 && t < 34 ? Math.sin(t * 2.4) * (1 - (t - 8) / 26) * 6 : 0;
  const amber = color.amber400;
  return (
    <div style={{ position: "absolute", left: 1330, top: 540, width: 0, height: 0 }}>
      {rings.map((r, i) =>
        r > 0 && r < 1 ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: -(300 + r * 420),
              top: -(170 + r * 280),
              width: (300 + r * 420) * 2,
              height: (170 + r * 280) * 2,
              borderRadius: 60 + r * 120,
              border: `2px solid ${hexA(amber, 0.6 * Math.pow(1 - r, 2.2))}`,
            }}
          />
        ) : null,
      )}
      <div style={{ position: "absolute", left: -330, top: -148, width: 660, height: 296, perspective: 1400 }}>
        <div
          style={{
            position: "relative",
            width: 660,
            height: 296,
            transformStyle: "preserve-3d",
            transform: `translateX(${shake}px) rotateX(${flip * 180}deg) scale(${mix(0.85, 1, inT)})`,
            opacity: inT,
          }}
        >
          {/* front: the alert email */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              borderRadius: 30,
              backgroundColor: "#16161a",
              border: `2px solid ${hexA(amber, 0.55)}`,
              boxShadow: `0 60px 120px rgba(0,0,0,0.6), 0 0 60px ${hexA(amber, 0.25)}`,
              padding: 40,
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: hexA(amber, 0.16), color: amber, fontFamily: font.ui, fontSize: 26, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                UM
              </div>
              <div>
                <div style={{ fontFamily: font.ui, fontSize: 30, fontWeight: 600, color: color.foreground }}>Uptime Monitor</div>
                <div style={{ fontFamily: font.ui, fontSize: 22, color: color.mutedForeground, marginTop: 4 }}>alerts@uptime.example.net</div>
              </div>
            </div>
            <div style={{ marginTop: 34, fontFamily: font.display, fontSize: 44, letterSpacing: "-0.02em", color: color.foreground }}>
              <span style={{ color: amber }}>[Alert]</span> api-3 CPU above 90%
            </div>
            <div style={{ marginTop: 14, fontFamily: font.mono, fontSize: 20, color: color.mutedForeground }}>cpu=92.4% host=api-3 region=fra</div>
          </div>
          {/* back: the incident */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              transform: "rotateX(180deg)",
              borderRadius: 30,
              backgroundColor: "#1a1712",
              border: `2px solid ${amber}`,
              boxShadow: `0 60px 120px rgba(0,0,0,0.6), 0 0 90px ${hexA(amber, 0.35)}`,
              padding: 40,
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: font.mono, fontSize: 26, color: color.mutedForeground }}>INC-312</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 44, padding: "0 18px", borderRadius: 12, backgroundColor: hexA(amber, 0.16), color: amber, fontFamily: font.ui, fontSize: 22, fontWeight: 600 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: amber }} />
                Open
              </span>
            </div>
            <div style={{ marginTop: 34, fontFamily: font.display, fontSize: 48, letterSpacing: "-0.02em", color: color.foreground }}>api-3 CPU above 90%</div>
            <div style={{ marginTop: 16, fontFamily: font.ui, fontSize: 22, color: color.mutedForeground }}>Incident opened from email · just now</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 04 Replies: a wheel of per-conversation addresses.
const TICKETS = [1039, 1040, 1041, 1042, 1043, 1044, 1045, 1046];
const ReplyVisual: React.FC<{ t: number }> = ({ t }) => {
  // wheel settles on 1042 after spinning through the list
  const spin = mix(0, 3, ease.out(clamp(t / 50)));
  const center = 0 + spin; // index offset
  const bubbleA = prog(t, 44, 12, ease.backOut);
  const bubbleB = prog(t, 58, 12, ease.backOut);
  const violet = color.violet;
  return (
    <div style={{ position: "absolute", left: 1330, top: 540, width: 0, height: 0, perspective: 1400 }}>
      {TICKETS.map((n, i) => {
        const rel = i - center; // 0 = in focus
        if (Math.abs(rel) > 3.2) return null;
        const angle = rel * 26;
        const focus = 1 - clamp(Math.abs(rel));
        return (
          <div
            key={n}
            style={{
              position: "absolute",
              left: -470,
              top: -44,
              width: 940,
              height: 88,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotateX(${-angle}deg) translateZ(300px)`,
              transformOrigin: "50% 50% -300px",
              opacity: 1 - clamp(Math.abs(rel) / 3.2),
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 76,
                padding: "0 30px",
                borderRadius: 20,
                backgroundColor: focus > 0.5 ? hexA(violet, 0.14) : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${focus > 0.5 ? violet : "rgba(255,255,255,0.08)"}`,
                boxShadow: focus > 0.5 ? `0 0 50px ${hexA(violet, 0.35 * focus)}` : undefined,
                fontFamily: font.mono,
                fontSize: 38,
                whiteSpace: "pre",
              }}
            >
              <span style={{ color: focus > 0.5 ? violet : color.mutedForeground }}>ticket-{n}</span>
              <span style={{ color: color.mutedForeground }}>@6a51…appwrite.email</span>
            </div>
          </div>
        );
      })}
      {/* the conversation behind ticket-1042 */}
      <div style={{ position: "absolute", left: -300, top: 90, width: 600 }}>
        <div style={{ display: "flex", justifyContent: "flex-start", opacity: clamp(bubbleA * 2), transform: `scale(${mix(0.6, 1, clamp(bubbleA))})`, transformOrigin: "0 0" }}>
          <span style={{ padding: "16px 22px", borderRadius: 22, borderTopLeftRadius: 6, backgroundColor: "#1d1d21", border: "1px solid rgba(255,255,255,0.08)", fontFamily: font.ui, fontSize: 26, color: color.foreground }}>
            Any update on order 1042?
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, opacity: clamp(bubbleB * 2), transform: `scale(${mix(0.6, 1, clamp(bubbleB))})`, transformOrigin: "100% 0" }}>
          <span style={{ padding: "16px 22px", borderRadius: 22, borderTopRightRadius: 6, backgroundColor: hexA(violet, 0.22), border: `1px solid ${hexA(violet, 0.45)}`, fontFamily: font.ui, fontSize: 26, color: color.foreground }}>
            It ships today.
          </span>
        </div>
      </div>
    </div>
  );
};

const SHOTS: Shot[] = [
  { n: "01", word: "Support", caption: "Save every email to a table and reply with Messaging.", tint: color.pink, Visual: SupportVisual },
  { n: "02", word: "Invoices", caption: "Read PDF attachments and store the totals.", tint: color.orange, Visual: InvoiceVisual },
  { n: "03", word: "Alerts", caption: "Turn alert emails into incidents.", tint: color.amber400, Visual: AlertVisual },
  { n: "04", word: "Replies", caption: "Give every conversation its own address.", tint: color.violet, Visual: ReplyVisual },
];

// Camera position along the strip of shots (in shot widths)
const camAt = (f: number) => {
  let x = 0;
  for (let k = 1; k < SHOTS.length; k++) {
    x += ease.inOut(clamp((f - (k * SHOT - WHIP / 2)) / WHIP));
  }
  return x;
};

export const S8UseCases: React.FC = () => {
  const frame = useCurrentFrame();
  const cam = camAt(frame);
  const speed = Math.abs(camAt(frame) - camAt(frame - 1)) * WIDTH;
  const blur = Math.min(40, speed * 0.12);
  const exit = prog(frame, SHOT * 4 - 14, 14, ease.in);

  return (
    <AbsoluteFill style={{ backgroundColor: color.void }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id="whipBlur" x="-5%" y="0%" width="110%" height="100%">
          <feGaussianBlur stdDeviation={`${blur} 0`} />
        </filter>
      </svg>
      <AbsoluteFill style={{ filter: blur > 0.5 ? "url(#whipBlur)" : undefined, opacity: 1 - exit }}>
        {SHOTS.map((shot, k) => {
          const x = (k - cam) * WIDTH;
          if (Math.abs(x) >= WIDTH) return null;
          const t = frame - k * SHOT;
          const V = shot.Visual;
          return (
            <AbsoluteFill key={shot.n} style={{ transform: `translateX(${x}px)`, overflow: "hidden" }}>
              <AbsoluteFill style={{ backgroundColor: "#0e0e10" }} />
              <AbsoluteFill
                style={{
                  background: `radial-gradient(circle at 70% 52%, ${hexA(shot.tint, 0.2)} 0%, ${hexA(shot.tint, 0.05)} 32%, transparent 62%)`,
                }}
              />
              <AbsoluteFill
                style={{
                  backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.05) 1.1px, transparent 1.6px)`,
                  backgroundSize: "44px 44px",
                  backgroundPosition: `${-t * 0.6}px 0`,
                  maskImage: "radial-gradient(ellipse 70% 70% at 60% 50%, black 30%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 60% 50%, black 30%, transparent 100%)",
                }}
              />
              <AbsoluteFill style={{ transform: `scale(${mix(1.04, 1, prog(t, 0, SHOT + WHIP, ease.linear))})` }}>
                <V t={t} />
              </AbsoluteFill>
              <Title shot={shot} t={t} />
            </AbsoluteFill>
          );
        })}
      </AbsoluteFill>
      {/* flash on each cut */}
      <AbsoluteFill
        style={{
          backgroundColor: "#ffffff",
          opacity: Math.max(...[1, 2, 3].map((k) => keys(frame, [k * SHOT - 2, k * SHOT, k * SHOT + 6], [0, 0.07, 0], ease.inOut))),
          pointerEvents: "none",
        }}
      />
      <FilmOverlay grain={0.045} vignette={0.55} />
    </AbsoluteFill>
  );
};

