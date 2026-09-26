import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import {
  Activity,
  AppWindow,
  Calendar,
  Fingerprint,
  Globe,
  Globe2,
  Plus,
  Route,
  SearchCode,
  Send,
  Server,
  Tags,
  Target,
  Trash2,
  UserRound,
} from "lucide-react";
import { C, EASE, rgba } from "../theme";
import { AEONIK, INTER } from "../fonts";
import { clamp01, lerp, prog, tween } from "../lib/anim";
import { Cursor, Words } from "../components/Type";
import { ActionList } from "../components/ActionList";
import { DotGrid, Glows } from "../components/Atmosphere";
import {
  Card,
  CardHeader,
  IconButton,
  Input,
  Menu,
  MenuGroupLabel,
  MenuItem,
  Pointer,
  R,
  RailLabel,
  Select,
} from "../ui/Console";

export const S3_DURATION = 432;
import {
  ACTION_ITEMS,
  BOX_PAD,
  CARD_W,
  CARD_X,
  CARD_Y,
  CONTENT_X,
  GAP,
  HEADER_H,
  IMPACT_W,
  IMPACT_X,
  MENU_ITEM,
  PAD,
  PLUS_H,
  RAIL,
  ROW_H,
  SELECT_H,
  T,
  THEN_Y,
  Z,
  s3Camera,
  HANDOFF_START,
  HANDOFF_DUR,
} from "./s3layout";

const ATTRS = [
  { label: "IP address", icon: Fingerprint },
  { label: "Hostname", icon: Server },
  { label: "Path", icon: Route },
  { label: "Method", icon: Send },
  { label: "Header", icon: Tags },
  { label: "Query parameter", icon: SearchCode },
  { label: "User agent", icon: UserRound },
  { label: "Browser", icon: AppWindow },
  { label: "Country", icon: Globe2 },
  { label: "Continent", icon: Globe },
];



const PATH_VALUE = "/v1/account/sessions";

const impactAt = (frame: number) => {
  const a = prog(frame, T.typeStart + 6, 40, EASE.inOut);
  const b = prog(frame, T.andIn + 28, 34, EASE.inOut);
  const share = a * lerp(0.194, 0.0502, b);
  return { share, matched: Math.round(248391 * share) };
};

const Chart: React.FC<{ share: number; frame: number }> = ({ share, frame }) => {
  const w = 280;
  const h = 150;
  const n = 24;
  const pts = Array.from({ length: n }, (_, i) => {
    const total = 2400 + Math.sin(i / 2.6) * 620 + Math.sin(i / 1.3 + 1) * 180 + (i > 15 && i < 21 ? 700 : 0);
    const s = share * (0.75 + 0.5 * Math.sin(i / 3.1 + 0.5) ** 2);
    return { x: (i / (n - 1)) * w, total, matched: total * s };
  });
  const y = (v: number) => h - (v / 4000) * h;
  const draw = prog(frame, 10, 70, EASE.inOut);
  const line = (k: "total" | "matched") =>
    pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  return (
    <svg width={w + 30} height={h + 22} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="s3-impact-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={C.passed} stopOpacity={0.35} />
          <stop offset="100%" stopColor={C.passed} stopOpacity={0} />
        </linearGradient>
        <clipPath id="s3-impact-clip">
          <rect x={0} y={-10} width={w * draw} height={h + 20} />
        </clipPath>
      </defs>
      <g transform="translate(26,4)">
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line x1={0} x2={w} y1={(h / 4) * k} y2={(h / 4) * k} stroke={C.border} strokeDasharray="3 3" />
            <text x={-8} y={(h / 4) * k + 3} fill={C.faint} fontSize={9} textAnchor="end" fontFamily={INTER}>
              {`${4 - k}k`}
            </text>
          </g>
        ))}
        <g clipPath="url(#s3-impact-clip)">
          <path d={line("total")} fill="none" stroke={C.muted} strokeWidth={1.5} strokeDasharray="4 4" />
          <path d={`${line("matched")} L${w},${h} L0,${h} Z`} fill="url(#s3-impact-fill)" />
          <path d={line("matched")} fill="none" stroke={C.passed} strokeWidth={2} />
        </g>
        {["16:00", "22:00", "6 Aug", "10:00", "16:00"].map((t, k) => (
          <text key={k} x={(w / 4) * k} y={h + 16} fill={C.faint} fontSize={9} textAnchor="middle" fontFamily={INTER}>
            {t}
          </text>
        ))}
      </g>
    </svg>
  );
};

const Tile: React.FC<{ icon: typeof Target; label: string; value: string; pulse: number }> = ({
  icon: Icon,
  label,
  value,
  pulse,
}) => (
  <div
    style={{
      flex: 1,
      borderRadius: R.lg,
      border: `1px solid ${pulse > 0.01 ? rgba(C.passed, 0.25 + 0.45 * pulse) : C.hairline}`,
      background: rgba(C.input, 0.2),
      padding: 12,
      boxShadow: pulse > 0.01 ? `0 0 ${16 * pulse}px ${rgba(C.passed, 0.22 * pulse)}` : undefined,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted, marginBottom: 4 }}>
      <Icon size={14} />
      <span style={{ fontSize: 11 }}>{label}</span>
    </div>
    <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: C.fg }}>{value}</div>
  </div>
);

const Headline: React.FC<{
  title: string;
  sub: string;
  start: number;
  exit?: number;
}> = ({ title, sub, start, exit }) => {
  const frame = useCurrentFrame();
  const subIn = prog(frame, start + 18, 30);
  const subOut = exit === undefined ? 0 : prog(frame, exit - 4, 14, EASE.in);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 600 }}>
      <Words
        text={title}
        start={start}
        exit={exit}
        exitDur={14}
        style={{ fontSize: 88, letterSpacing: "-0.045em", lineHeight: 1.02, color: C.fg }}
        after={<Cursor size={88} appear={start + 24} blinkFrom={start + 50} />}
      />
      <div
        style={{
          marginTop: 28,
          fontFamily: AEONIK,
          fontSize: 30,
          lineHeight: 1.35,
          color: C.muted,
          opacity: subIn * (1 - subOut),
          translate: `0 ${(1 - subIn) * 16 - subOut * 10}px`,
          filter: subOut > 0 ? `blur(${subOut * 6}px)` : undefined,
        }}
      >
        {sub}
      </div>
    </div>
  );
};

export const S3Rule: React.FC = () => {
  const frame = useCurrentFrame();
  const { camX, camY } = s3Camera(frame);

  const enter = prog(frame, 0, 50, EASE.out);
  const flatten = prog(frame, T.handoff - 40, 40, EASE.inOut);
  const rotY = lerp(-24, -12, enter) * (1 - flatten);
  const rotX = lerp(14, 5, enter) * (1 - flatten);
  const pushZ = lerp(-600, 0, enter);

  // Attribute menu
  const attrOpen = prog(frame, T.attrClick, 8, EASE.out) * (1 - prog(frame, T.attrPick, 8, EASE.in));
  const scanIdx = (() => {
    if (frame < T.attrScan) return 0;
    const fwd = Math.floor((frame - T.attrScan) / 5.5);
    if (fwd < ATTRS.length) return fwd;
    return Math.max(2, ATTRS.length - 1 - Math.floor((frame - T.attrScan - ATTRS.length * 5.5) / 1.6));
  })();
  const picked = frame >= T.attrPick;

  // Operator + value
  const opFlash = prog(frame, T.operator, 6) * (1 - prog(frame, T.operator + 10, 14));
  const typed = Math.max(0, Math.min(PATH_VALUE.length, Math.floor((frame - T.typeStart) / 1.4)));
  const valueFocus = prog(frame, T.typeStart - 4, 6) * (1 - prog(frame, T.plusClick - 6, 8));

  const andIn = prog(frame, T.andIn, 26, EASE.out);

  const actionOpen = prog(frame, T.actionClick, 8, EASE.out);
  const actionIdx = frame < T.actionScan ? -1 : Math.min(4, Math.floor((frame - T.actionScan) / 16));

  const { share, matched } = impactAt(frame);
  const tilePulse = Math.max(
    prog(frame, T.typeStart + 6, 10) * (1 - prog(frame, T.typeStart + 44, 20)),
    prog(frame, T.andIn + 28, 10) * (1 - prog(frame, T.andIn + 64, 20)),
  );

  // Pointer path in world px.
  const itemY = (i: number) => CARD_Y + (HEADER_H + PAD + BOX_PAD + SELECT_H + 6 + 4 + 26 + i * MENU_ITEM + 16) * Z;
  const actionY = (i: number) => CARD_Y + (THEN_Y + BOX_PAD + SELECT_H + 6 + 4 + i * MENU_ITEM + 16) * Z;
  const attrX = CARD_X + (CONTENT_X + BOX_PAD + 120) * Z;
  const pts: Array<[number, number, number]> = [
    [0, 1900, 1200],
    [40, attrX, CARD_Y + (HEADER_H + PAD + BOX_PAD + 18) * Z],
    [T.attrScan, attrX, itemY(0)],
    [T.attrScan + 55, attrX, itemY(9)],
    [T.attrPick - 3, attrX, itemY(2)],
    [T.attrPick + 24, CARD_X + (CONTENT_X + 300) * Z, CARD_Y + (HEADER_H + PAD + 70) * Z],
    [T.plusClick - 8, CARD_X + (PAD + RAIL / 2) * Z, CARD_Y + (HEADER_H + PAD + ROW_H + GAP + 20) * Z],
    [T.plusClick + 24, CARD_X + (PAD + RAIL / 2) * Z, CARD_Y + (HEADER_H + PAD + ROW_H + GAP + 20) * Z],
    [T.actionClick - 10, CARD_X + (CONTENT_X + BOX_PAD + 150) * Z, CARD_Y + (THEN_Y + BOX_PAD + 18) * Z],
    [T.actionScan, CARD_X + (CONTENT_X + BOX_PAD + 150) * Z, actionY(0)],
    [T.actionScan + 70, CARD_X + (CONTENT_X + BOX_PAD + 150) * Z, actionY(4)],
    [T.handoff, CARD_X + (CONTENT_X + BOX_PAD + 150) * Z, actionY(4)],
  ];
  let pointer: [number, number] = [pts[pts.length - 1][1], pts[pts.length - 1][2]];
  for (let i = 0; i < pts.length - 1; i++) {
    if (frame <= pts[i + 1][0]) {
      const t = EASE.inOut(clamp01((frame - pts[i][0]) / (pts[i + 1][0] - pts[i][0])));
      pointer = [lerp(pts[i][1], pts[i + 1][1], t), lerp(pts[i][2], pts[i + 1][2], t)];
      break;
    }
  }
  const clicks = [T.attrClick, T.attrPick, T.plusClick, T.actionClick];
  const press = Math.max(...clicks.map((c) => prog(frame, c - 3, 4) * (1 - prog(frame, c + 2, 10))));

  // Handoff: everything but the action list fades (S4 takes the list over).
  const handoff = prog(frame, T.handoff, 30, EASE.in);
  const mask = "linear-gradient(to right, transparent 0%, transparent 36%, black 50%, black 100%)";

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink, overflow: "hidden" }}>
      <Glows
        glows={[
          { x: 90, y: -10, r: 950, color: rgba(C.indigo, 0.24), opacity: 1 },
          { x: 2, y: 106, r: 900, color: rgba(C.pink, 0.2), opacity: 1 },
          { x: 78, y: 60, r: 700, color: rgba(C.passed, 0.08), opacity: prog(frame, 206, 40) * (1 - prog(frame, 290, 40)) },
        ]}
      />
      <DotGrid opacity={0.3} offsetX={camX * 0.15} offsetY={camY * 0.15} />


      {/* UI stage */}
      <AbsoluteFill
        style={{
          perspective: 2600,
          perspectiveOrigin: "30% 45%",
          maskImage: mask,
          WebkitMaskImage: mask,
          opacity: 1 - handoff,
        }}
      >
        <AbsoluteFill
          style={{
            transformStyle: "preserve-3d",
            transform: `translate3d(${camX}px, ${camY}px, ${pushZ}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transformOrigin: "40% 50%",
            opacity: enter,
          }}
        >
          <div style={{ position: "absolute", left: CARD_X, top: CARD_Y }}>
            <div style={{ zoom: Z }}>
              <Card style={{ width: CARD_W, boxShadow: "0 40px 120px rgba(0,0,0,0.6)" }} sweep={prog(frame, 22, 56, EASE.inOut)}>
                <CardHeader title="Configure" />
                <div style={{ position: "relative", padding: PAD }}>
                  <div style={{ position: "absolute", left: PAD + RAIL / 2, top: PAD, bottom: PAD, width: 1, background: C.hairline }} />
                  <div style={{ display: "grid", gridTemplateColumns: `${RAIL}px 1fr`, columnGap: GAP, rowGap: GAP }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <RailLabel>If</RailLabel>
                    </div>
                    <div
                      style={{
                        borderRadius: R.xl,
                        border: `1px solid ${C.hairline}`,
                        background: C.bg,
                        padding: BOX_PAD,
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        height: ROW_H,
                        boxSizing: "border-box",
                      }}
                    >
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <Select
                            icon={picked ? Route : Fingerprint}
                            label={picked ? "Path" : "IP address"}
                            style={{ flex: 1 }}
                            active={attrOpen}
                          />
                          <Select label={frame >= T.operator ? "Starts with" : "Equals"} width={152} active={opFlash} />
                        </div>
                        <Input
                          mono
                          active={valueFocus}
                          placeholder={typed === 0}
                          value={
                            typed === 0 ? (
                              "e.g. /v1/account"
                            ) : (
                              <>
                                {PATH_VALUE.slice(0, typed)}
                                {valueFocus > 0.5 && Math.floor(frame / 15) % 2 === 0 ? (
                                  <span style={{ display: "inline-block", width: 1.5, height: 16, background: C.fg, marginLeft: 1 }} />
                                ) : null}
                              </>
                            )
                          }
                        />
                      </div>
                      <IconButton icon={Trash2} />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: ROW_H * andIn,
                        marginTop: (andIn - 1) * GAP,
                        overflow: "hidden",
                        opacity: andIn,
                      }}
                    >
                      <RailLabel>And</RailLabel>
                    </div>
                    <div style={{ height: ROW_H * andIn, marginTop: (andIn - 1) * GAP, overflow: "hidden", opacity: andIn }}>
                      <div
                        style={{
                          borderRadius: R.xl,
                          border: `1px solid ${C.hairline}`,
                          background: C.bg,
                          padding: BOX_PAD,
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          height: ROW_H,
                          boxSizing: "border-box",
                          translate: `0 ${(1 - andIn) * -24}px`,
                        }}
                      >
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <Select icon={Send} label="Method" style={{ flex: 1 }} />
                            <Select label="Equals" width={152} />
                          </div>
                          <Select label="POST" mono style={{ width: "100%" }} />
                        </div>
                        <IconButton icon={Trash2} />
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: PLUS_H }}>
                      <span style={{ background: C.card, padding: 6, position: "relative", zIndex: 1 }}>
                        <IconButton
                          icon={Plus}
                          size={28}
                          boxed
                          style={{ scale: `${1 - 0.14 * prog(frame, T.plusClick - 3, 4) * (1 - prog(frame, T.plusClick + 2, 8))}` }}
                        />
                      </span>
                    </div>
                    <div />

                    <div style={{ display: "flex", justifyContent: "center", paddingTop: 22 }}>
                      <RailLabel>Then</RailLabel>
                    </div>
                    <div
                      style={{
                        borderRadius: R.xl,
                        border: `1px solid ${C.hairline}`,
                        background: C.bg,
                        padding: BOX_PAD,
                      }}
                    >
                      <Select
                        dot={actionIdx >= 0 ? ACTION_ITEMS[actionIdx].color : C.deny}
                        label={actionIdx >= 0 ? ACTION_ITEMS[actionIdx].label : "Deny"}
                        width={320}
                        active={actionOpen}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {attrOpen > 0.01 ? (
              <div
                style={{
                  position: "absolute",
                  left: (CONTENT_X + BOX_PAD) * Z,
                  top: (HEADER_H + PAD + BOX_PAD + SELECT_H + 6) * Z,
                  opacity: attrOpen,
                  translate: `0 ${(1 - attrOpen) * -10}px`,
                }}
              >
                <div style={{ zoom: Z }}>
                <Menu width={300}>
                  <MenuGroupLabel>Request · Client · Location</MenuGroupLabel>
                  {ATTRS.map((a, i) => (
                    <MenuItem
                      key={a.label}
                      icon={a.icon}
                      label={a.label}
                      highlight={i === scanIdx ? 1 : 0}
                      selected={frame >= T.attrPick - 4 && i === 2}
                    />
                  ))}
                </Menu>
                </div>
              </div>
            ) : null}

            {actionOpen > 0.01 && frame < T.handoff ? (
              <div
                style={{
                  position: "absolute",
                  left: (CONTENT_X + BOX_PAD) * Z,
                  top: (THEN_Y + BOX_PAD + SELECT_H + 6) * Z,
                  opacity: actionOpen,
                  translate: `0 ${(1 - actionOpen) * -10}px`,
                }}
              >
                <div style={{ zoom: Z }}>
                  <Menu width={320}>
                    {ACTION_ITEMS.map((a, i) => (
                      <MenuItem key={a.label} dot={a.color} label={a.label} highlight={i === actionIdx ? 1 : 0} />
                    ))}
                  </Menu>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ position: "absolute", left: IMPACT_X, top: CARD_Y }}>
            <div style={{ zoom: Z }}>
              <Card style={{ width: IMPACT_W, boxShadow: "0 40px 120px rgba(0,0,0,0.55)" }} sweep={prog(frame, 214, 50, EASE.inOut)}>
                <div style={{ borderBottom: `1px solid ${C.hairline}`, padding: "12px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>Estimated impact</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: C.muted, lineHeight: 1.45 }}>
                    Estimated requests this rule would match during the selected period.
                  </div>
                </div>
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  <Select icon={Calendar} label="Last 24 hours" style={{ height: 32 }} />
                  <div style={{ display: "flex", gap: 10 }}>
                    <Tile icon={Target} label="Matched requests" value={matched.toLocaleString("en-US")} pulse={tilePulse} />
                    <Tile icon={Activity} label="Share of traffic" value={`${(share * 100).toFixed(1)}%`} pulse={tilePulse} />
                  </div>
                  <Chart share={share} frame={frame} />
                </div>
              </Card>
            </div>
          </div>

          <div style={{ position: "absolute", left: 0, top: 0, zoom: 1.35 }}>
            <Pointer
              x={pointer[0] / 1.35}
              y={pointer[1] / 1.35}
              press={press}
              opacity={tween(frame, [24, 36], [0, 1]) * (1 - prog(frame, T.handoff - 20, 12))}
            />
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {frame >= T.handoff ? (
        <ActionList
          morph={prog(frame, HANDOFF_START, HANDOFF_DUR, EASE.linear)}
          morphPrev={prog(frame - 1, HANDOFF_START, HANDOFF_DUR, EASE.linear)}
          active={0}
          menuHighlight={actionIdx}
          surface={1 - prog(frame, HANDOFF_START, 26, EASE.inOut)}
        />
      ) : null}

      {/* Headlines, left column */}
      <div style={{ position: "absolute", left: 120, top: 330, opacity: 1 }}>
        {frame < T.headB + 24 ? (
          <Headline
            title="Match any request"
            sub="IP, path, method, headers, user agent, country and more."
            start={12}
            exit={T.headB - 22}
          />
        ) : null}
        {frame >= T.headB - 4 && frame < T.headC + 24 ? (
          <Headline
            title="See the impact first"
            sub="Preview matches against your real traffic before you save."
            start={T.headB + 4}
            exit={T.headC - 22}
          />
        ) : null}
        {frame >= T.headC - 4 ? (
          <Headline
            title="Decide what happens"
            sub="One action per rule. The first match wins."
            start={T.headC + 4}
            exit={T.handoff - 10}
          />
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
