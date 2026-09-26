import { ArrowRight, Braces, Inbox, Webhook } from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, FilmOverlay } from "../components/Backdrop";
import { EmailNotice, KIND_COLOR, Notice, NOTICE_H, NOTICE_W } from "../components/EmailNotice";
import { Reveal } from "../components/Reveal";
import { MIME_LINES } from "../data/mime";
import { clamp, ease, keys, mix, prog, rand } from "../lib/anim";
import { color, font } from "../theme";
import { HEIGHT, WIDTH } from "../timeline";
import { Streaks } from "../components/Streaks";

const HERO: Notice = {
  name: "Walter O'Brien",
  initials: "WO",
  subject: "Order 1042 did not arrive",
  time: "09:14",
  kind: "support",
  attachment: "receipt.pdf",
};

const POOL: Notice[] = [
  { name: "Northwind Traders", initials: "NT", subject: "Invoice INV-2291 for September", time: "09:12", kind: "invoice", attachment: "INV-2291.pdf" },
  { name: "Uptime Monitor", initials: "UM", subject: "[Alert] api-3 CPU above 90%", time: "09:11", kind: "alert" },
  { name: "Priya Raman", initials: "PR", subject: "Can't reset my password", time: "09:10", kind: "support" },
  { name: "Maya Brooks", initials: "MB", subject: "Re: ticket-1042", time: "09:09", kind: "reply" },
  { name: "Globex Supply", initials: "GS", subject: "Your invoice is ready", time: "09:07", kind: "invoice", attachment: "invoice.pdf" },
  { name: "Disk Watch", initials: "DW", subject: "[Warning] db-2 disk 95% full", time: "09:06", kind: "alert" },
  { name: "Diego Alvarez", initials: "DA", subject: "Refund for order 1038", time: "09:05", kind: "support" },
  { name: "Initech Hosting", initials: "IH", subject: "Invoice #88213 is ready", time: "09:04", kind: "invoice", attachment: "88213.pdf" },
  { name: "Status Bot", initials: "SB", subject: "[Resolved] Checkout latency", time: "09:03", kind: "alert" },
  { name: "Mei Chen", initials: "MC", subject: "Wrong size delivered", time: "09:02", kind: "support" },
  { name: "Sam Carter", initials: "SC", subject: "Re: Where is my package?", time: "09:01", kind: "reply" },
  { name: "Acme Logistics", initials: "AL", subject: "Freight invoice FR-5521", time: "09:00", kind: "invoice", attachment: "FR-5521.pdf" },
  { name: "Uptime Monitor", initials: "UM", subject: "[Down] api.example.com", time: "08:58", kind: "alert" },
  { name: "Lena Fischer", initials: "LF", subject: "Account locked after update", time: "08:57", kind: "support" },
  { name: "Omar Haddad", initials: "OH", subject: "Re: ticket-1037", time: "08:55", kind: "reply" },
  { name: "Umbrella Print", initials: "UP", subject: "Invoice UP-3310 attached", time: "08:54", kind: "invoice", attachment: "UP-3310.pdf" },
  { name: "Queue Watch", initials: "QW", subject: "[Alert] Job queue backlog", time: "08:52", kind: "alert" },
  { name: "Ana Souza", initials: "AS", subject: "Charged twice for order 1041", time: "08:51", kind: "support" },
  { name: "Hiro Tanaka", initials: "HT", subject: "Fwd: Delivery update", time: "08:49", kind: "reply" },
  { name: "Stark Components", initials: "SC", subject: "Purchase order PO-7730", time: "08:47", kind: "invoice", attachment: "PO-7730.pdf" },
  { name: "Cert Watch", initials: "CW", subject: "[Warning] TLS expires in 7 days", time: "08:46", kind: "alert" },
  { name: "Chloe Martin", initials: "CM", subject: "Can I change my address?", time: "08:44", kind: "support" },
  { name: "Tom Reyes", initials: "TR", subject: "Order 1040 arrived damaged", time: "08:41", kind: "support" },
];

// ---- Feed plane layout -------------------------------------------------
const COLS = 7;
const GAP_X = 28;
const STEP = NOTICE_H + 18;
const PLANE_W = COLS * NOTICE_W + (COLS - 1) * GAP_X;
const TOP = 260;
const OLDER = 16;
const HERO_COL = 3;
const HERO_ROW = 2;

type Card = { n: Notice; col: number; older: number; at: number; key: string };

const ARRIVALS: { col: number; at: number }[] = (() => {
  const out: { col: number; at: number }[] = [];
  const N = 64;
  for (let i = 0; i < N; i++) {
    const at = Math.round(46 + 196 * Math.pow(i / N, 0.6));
    let col = Math.floor(rand(i * 5.3 + 1) * COLS);
    if (col === HERO_COL && at < 118) col = (col + 2) % COLS;
    out.push({ col, at });
  }
  return out;
})();

const CARDS: Card[] = (() => {
  const out: Card[] = [];
  let k = 0;
  for (let col = 0; col < COLS; col++) {
    for (let r = 0; r < OLDER; r++) {
      const isHero = col === HERO_COL && r === HERO_ROW;
      out.push({ n: isHero ? HERO : POOL[(k * 7 + 3) % POOL.length], col, older: r, at: -1, key: `o${col}-${r}` });
      k++;
    }
  }
  ARRIVALS.forEach((a, i) => {
    out.push({ n: POOL[(i * 5 + 11) % POOL.length], col: a.col, older: -1, at: a.at, key: `a${i}` });
  });
  return out;
})();

const insertion = (frame: number, at: number) => ease.outSoft(clamp((frame - at) / 14));

/** Stack offset (in rows) created by arrivals in `col` newer than `after`. */
const pushed = (frame: number, col: number, after: number) => {
  let rows = 0;
  for (const a of ARRIVALS) {
    if (a.col === col && a.at > after) rows += insertion(frame, a.at);
  }
  return rows;
};

const HERO_X = HERO_COL * (NOTICE_W + GAP_X) + NOTICE_W / 2;
const HERO_Y = TOP + HERO_ROW * STEP + NOTICE_H / 2;

const PAIN = [
  { icon: Inbox, label: "Inbound email provider", at: 270 },
  { icon: Webhook, label: "Webhook endpoint", at: 300 },
  { icon: Braces, label: "MIME parser", at: 330 },
];

const IMPLODE = 392;
const IMPLODE_DUR = 42;

export const S1Inbox: React.FC = () => {
  const frame = useCurrentFrame();

  // Camera on the feed plane.
  const tilt = prog(frame, 26, 104, ease.inOut);
  const rx = mix(0, 50, tilt) + keys(frame, [220, 270], [0, 10], ease.inOut);
  const rz = mix(0, -22, tilt) + keys(frame, [130, 260], [0, -4], ease.inOutSoft);
  const s = keys(frame, [0, 26, 130, 228, 272], [2.5, 2.38, 0.74, 0.68, 0.5], [ease.outSoft, ease.inOut, ease.linear, ease.inOut]);
  const ox = mix(HERO_X, PLANE_W / 2 + 120, tilt);
  const oy = mix(HERO_Y, TOP + 760, tilt) + keys(frame, [130, 260], [0, 160], ease.inOutSoft);
  const planeFade = keys(frame, [224, 262, 290], [1, 0.35, 0], [ease.inOut, ease.inOut]);

  const heroIn = prog(frame, 0, 20, ease.backOut);
  const heroDrop = (1 - prog(frame, 0, 22, ease.out)) * -90;
  const implode = prog(frame, IMPLODE, IMPLODE_DUR, ease.in);

  const kindPulse = (kind: Notice["kind"]) => {
    const at = kind === "support" ? 120 : kind === "invoice" ? 150 : kind === "alert" ? 180 : 9999;
    if (frame < at) return 0;
    const t = frame - at;
    const peak = clamp(t / 5);
    const decay = mix(1, 0.55, ease.outSoft(clamp((t - 5) / 50)));
    const fade = 1 - ease.inOut(clamp((frame - 212) / 26));
    return peak * decay * fade;
  };

  const sinX = Math.sin((rx * Math.PI) / 180);

  const cards = CARDS.map((c) => {
    if (c.at >= 0 && frame < c.at) return null;
    const isHero = c.col === HERO_COL && c.older === HERO_ROW;
    const row = c.older >= 0 ? c.older + pushed(frame, c.col, -1) : pushed(frame, c.col, c.at);
    const x = c.col * (NOTICE_W + GAP_X);
    const y = TOP + row * STEP;
    // Older mail materialises outward from the hero as the camera pulls back.
    let alpha = 1;
    let scaleIn = 1;
    let fresh = 0;
    if (c.older >= 0 && !isHero) {
      const dist = Math.hypot((x - HERO_X + NOTICE_W / 2) / NOTICE_W, (y - HERO_Y) / STEP / 1.6);
      const t = prog(frame, 30 + dist * 7, 26, ease.out);
      alpha = t;
      scaleIn = mix(0.9, 1, t);
    } else if (c.at >= 0) {
      const t = insertion(frame, c.at);
      alpha = t;
      scaleIn = mix(0.86, 1, t);
      fresh = 1 - ease.outSoft(clamp((frame - c.at) / 46));
    } else if (isHero) {
      alpha = clamp(heroIn * 1.6);
      scaleIn = mix(0.92, 1, heroIn);
      fresh = keys(frame, [0, 8, 100], [0, 1, 0], [ease.out, ease.inOut]);
    }
    // Depth of the card relative to the focus point, in px toward the viewer.
    const dz = (y + NOTICE_H / 2 - oy) * s * sinX;
    const dof = dz > 0 ? dz * 0.012 : -dz * 0.008;
    const fog = clamp(1 + dz / 900, 0.25, 1);
    return { c, x, y: y + (isHero ? heroDrop : 0), alpha: alpha * fog, scaleIn, fresh, dof: Math.min(dof, 9) + (1 - planeFade) * 6, hero: isHero };
  }).filter(Boolean) as {
    c: Card;
    x: number;
    y: number;
    alpha: number;
    scaleIn: number;
    fresh: number;
    dof: number;
    hero: boolean;
  }[];

  const scrim = keys(frame, [108, 138, 226, 252], [0, 1, 1, 0], ease.inOut);
  const mimeIn = keys(frame, [232, 276, IMPLODE, IMPLODE + 26], [0, 1, 1, 0], ease.inOut);
  const scroll = frame < 232 ? 0 : (frame - 232) * 1.4 + Math.pow(Math.max(0, frame - 350) / 42, 3) * 140;
  const strain = clamp((frame - 356) / 36);

  const pointR = keys(frame, [IMPLODE + 26, IMPLODE + IMPLODE_DUR, 446, 452, 474, 480], [0, 9, 24, 15, 6, 5], ease.inOut);
  const pointGlow = keys(frame, [IMPLODE + 20, IMPLODE + IMPLODE_DUR, 448, 472], [0, 0.6, 1, 0.5], ease.inOut);

  return (
    <AbsoluteFill style={{ backgroundColor: color.void }}>
      <Backdrop
        grid={false}
        glows={[
          { x: 1100, y: 420, size: 1700, color: "rgba(253,54,110,0.10)", opacity: keys(frame, [0, 200, IMPLODE, 440], [0.5, 1, 0.6, 0], ease.inOut) },
          { x: 420, y: 900, size: 1200, color: "rgba(155,138,255,0.08)", opacity: keys(frame, [0, 200, IMPLODE], [0.2, 0.8, 0], ease.inOut) },
        ]}
        grain={0}
        vignette={0}
      />

      {/* Feed plane */}
      <AbsoluteFill
        style={{
          opacity: planeFade * (1 - clamp((implode - 0.55) / 0.45)),
          transform: `scale(${1 - implode * 0.85})`,
          filter: implode > 0 ? `blur(${implode * 14}px)` : undefined,
        }}
      >
        <div style={{ position: "absolute", left: WIDTH / 2, top: HEIGHT / 2, width: 0, height: 0, perspective: 1500 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: PLANE_W,
              height: 3000,
              transformOrigin: `${ox}px ${oy}px`,
              transform: `translate(${-ox}px, ${-oy}px) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${s})`,
            }}
          >
            {cards.map(({ c, x, y, alpha, scaleIn, fresh, dof, hero }) => (
              <div
                key={c.key}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  opacity: alpha,
                  transform: `scale(${scaleIn})`,
                  filter: dof > 0.35 ? `blur(${dof}px)` : undefined,
                  zIndex: hero ? 2 : 1,
                }}
              >
                <EmailNotice n={c.n} fresh={fresh} highlight={hero ? 0 : kindPulse(c.n.kind)} unread={hero || c.at >= 0} />
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>

      {/* Headline scrim */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(90deg, rgba(9,9,11,0.96) 0%, rgba(9,9,11,0.86) 34%, rgba(9,9,11,0.35) 58%, rgba(9,9,11,0) 74%)",
          opacity: scrim,
        }}
      />

      {frame >= 110 && frame < 262 ? (
        <div
          style={{
            position: "absolute",
            left: 150,
            top: 300,
            fontFamily: font.display,
            color: color.foreground,
            letterSpacing: "-0.035em",
          }}
        >
          {[
            { t: "Support requests.", at: 120, kind: "support" as const },
            { t: "Invoices.", at: 150, kind: "invoice" as const },
            { t: "Alerts.", at: 180, kind: "alert" as const },
          ].map((l) => (
            <div key={l.t} style={{ fontSize: 112, lineHeight: 1.0, height: 118 }}>
              <Reveal
                text={l.t}
                start={l.at - 5}
                by="char"
                stagger={1.1}
                dur={20}
                rise={0.5}
                exit={{ start: 234 + (l.at - 120) / 12, stagger: 0.5, dur: 13 }}
                unitStyle={(k) => (k === l.t.length - 1 ? { color: KIND_COLOR[l.kind] } : undefined)}
              />
            </div>
          ))}
          <div style={{ marginTop: 40, fontSize: 48, letterSpacing: "-0.02em", color: color.mutedForeground }}>
            <Reveal
              text="They all arrive by email."
              start={204}
              stagger={3}
              dur={22}
              exit={{ start: 238, stagger: 1, dur: 12 }}
              unitStyle={(k) => (k === 4 ? { color: color.foreground } : undefined)}
            />
          </div>
        </div>
      ) : null}

      {/* The usual plumbing: raw MIME source in two drifting columns */}
      <AbsoluteFill style={{ opacity: mimeIn, overflow: "hidden" }}>
        {[0, 1].map((colIdx) => (
          <div
            key={colIdx}
            style={{
              position: "absolute",
              left: colIdx === 0 ? 70 : 1000,
              width: 860,
              top: 0,
              transform: `translateY(${-(scroll * (colIdx === 0 ? 1 : 1.35)) - colIdx * 520}px)`,
              fontFamily: font.mono,
              fontSize: 18,
              lineHeight: "28px",
              whiteSpace: "pre",
              overflow: "hidden",
              color: "rgba(159,159,169,0.34)",
            }}
          >
            {[...MIME_LINES, ...MIME_LINES, ...MIME_LINES, ...MIME_LINES].map((l, i) => (
              <div
                key={i}
                style={{
                  height: 28,
                  color:
                    l.kind === "boundary"
                      ? "rgba(253,54,110,0.55)"
                      : l.kind === "header"
                        ? "rgba(250,250,250,0.45)"
                        : undefined,
                }}
              >
                {l.text || " "}
              </div>
            ))}
          </div>
        ))}
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse 54% 30% at 50% 50%, rgba(10,10,12,0.96) 0%, rgba(10,10,12,0.78) 50%, rgba(10,10,12,0) 100%)",
          }}
        />
      </AbsoluteFill>

      {frame >= 238 && frame < IMPLODE + IMPLODE_DUR ? (
        <AbsoluteFill
          style={{
            transform: `scale(${1 - implode * 0.97})`,
            filter: implode > 0 ? `blur(${implode * 12}px)` : undefined,
            opacity: 1 - clamp((implode - 0.5) / 0.5),
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 356,
              width: "100%",
              textAlign: "center",
              fontFamily: font.display,
              fontSize: 60,
              letterSpacing: "-0.03em",
              color: color.foreground,
            }}
          >
            <Reveal text="To process it in code, you usually need" start={244} stagger={2.2} dur={22} />
          </div>
          <div
            style={{
              position: "absolute",
              top: 488,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {PAIN.map((p, i) => {
              const tin = prog(frame, p.at, 24, ease.backOut);
              const jx = Math.sin(frame * 2.1 + i * 2) * strain * 5;
              const jy = Math.cos(frame * 2.7 + i) * strain * 3;
              const Icon = p.icon;
              return (
                <div key={p.label} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 ? (
                    <div
                      style={{
                        width: 92,
                        display: "flex",
                        justifyContent: "center",
                        opacity: prog(frame, p.at - 6, 14),
                        transform: `translateX(${(1 - prog(frame, p.at - 6, 16)) * -20}px)`,
                      }}
                    >
                      <ArrowRight size={40} color={color.mutedForeground} strokeWidth={1.5} />
                    </div>
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      height: 112,
                      padding: "0 34px 0 28px",
                      borderRadius: 24,
                      backgroundColor: "#19191d",
                      border: `1.5px solid ${color.muted}`,
                      boxShadow: "0 30px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
                      fontFamily: font.display,
                      fontSize: 42,
                      letterSpacing: "-0.02em",
                      color: color.foreground,
                      opacity: clamp(tin * 2),
                      transform: `translate(${jx}px, ${(1 - tin) * 70 + jy}px) scale(${mix(0.82, 1, tin)})`,
                    }}
                  >
                    <Icon size={42} color={color.mutedForeground} strokeWidth={1.5} />
                    {p.label}
                  </div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      ) : null}

      <Streaks frame={frame} start={IMPLODE - 6} dur={IMPLODE_DUR + 8} />

      {/* The point everything collapses into */}
      {pointR > 0 ? (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: WIDTH / 2 - 420,
              top: HEIGHT / 2 - 420,
              width: 840,
              height: 840,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(253,54,110,${0.6 * pointGlow}) 0%, rgba(253,54,110,${0.14 * pointGlow}) 20%, transparent 58%)`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: WIDTH / 2 - pointR,
              top: HEIGHT / 2 - pointR,
              width: pointR * 2,
              height: pointR * 2,
              borderRadius: "50%",
              backgroundColor: "#ffe6ee",
              boxShadow: `0 0 ${pointR * 2.2}px ${pointR}px rgba(253,54,110,0.95)`,
            }}
          />
        </AbsoluteFill>
      ) : null}

      <FilmOverlay grain={0.045} vignette={0.55} />
    </AbsoluteFill>
  );
};
