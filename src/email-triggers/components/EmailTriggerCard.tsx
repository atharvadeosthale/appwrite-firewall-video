// Replica of vibes FunctionEmailTriggerCard (PR #451) and its neighbours on
// Function → Settings → Executions, at 1x with explicit line heights so
// scenes can target exact points (switch, Update button, address chip).
import { Mail, Plus } from "lucide-react";
import { ADDRESS_DOMAIN, color, font } from "../theme";
import { Button, Switch } from "./ui";
import { clamp } from "../lib/anim";

export const CARD_W = 720;
export const HEADER_H = 102; // 16 + 22 + 8 + 40 + 16
export const BODY_ROW_H = 42;
export const BOX_H = 124;
export const BOX_GAP = 16;
export const FOOTER_H = 69;

export const MAILBOX = `*@${ADDRESS_DOMAIN}`;

// Points of interest in card coordinates.
export const SWITCH_POS = { x: CARD_W - 24 - 16, y: HEADER_H + 1 + 16 + BODY_ROW_H / 2 };
export const updatePos = (expand: number) => ({
  x: 24 + 39,
  y: HEADER_H + 1 + 16 + BODY_ROW_H + expand * (BOX_GAP + BOX_H) + 16 + 1 + 16 + 18,
});
// Address chip text: starts after box border+padding, icon and chip padding.
export const ADDRESS_TEXT = {
  x: 24 + 1 + 12 + 16 + 12 + 10,
  y: HEADER_H + 1 + 16 + BODY_ROW_H + BOX_GAP + 1 + 12 + 18 + 4 + 15,
  size: 12,
};

export const cardHeight = (expand: number) =>
  HEADER_H + 1 + 16 + BODY_ROW_H + expand * (BOX_GAP + BOX_H) + 16 + FOOTER_H;

const T = {
  title: { fontSize: 15, lineHeight: "22px", fontWeight: 600, color: color.foreground },
  desc: { fontSize: 13, lineHeight: "20px", color: color.mutedForeground },
  small: { fontSize: 12, lineHeight: "18px", color: color.mutedForeground },
};

export const EmailTriggerCard: React.FC<{
  on: number;
  expand: number;
  updatePress?: number;
  dirty?: boolean;
  /** opacity of everything except the title word */
  rest?: number;
  titleOpacity?: number;
  titleBlur?: number;
  /** 0..1 how much the address chip dissolves into plain text */
  addressFocus?: number;
}> = ({ on, expand, updatePress = 0, dirty = false, rest = 1, titleOpacity = 1, titleBlur = 0, addressFocus = 0 }) => {
  const enabled = on > 0.5;
  const surface = (o: number): React.CSSProperties => ({ opacity: o });
  return (
    <div style={{ position: "relative", width: CARD_W, fontFamily: font.ui }}>
      {/* card surface */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 14,
          border: `1px solid ${color.border}`,
          backgroundColor: "rgba(29,29,33,0.5)",
          opacity: rest * (1 - addressFocus),
        }}
      />
      <div style={{ position: "relative", padding: "16px 24px", height: HEADER_H, boxSizing: "border-box" }}>
        <div
          style={{
            ...T.title,
            opacity: titleOpacity * (1 - addressFocus),
            filter: titleBlur > 0.05 ? `blur(${titleBlur}px)` : undefined,
          }}
        >
          Email
        </div>
        <div style={{ ...T.desc, marginTop: 8, ...surface(rest * (1 - addressFocus)) }}>
          Allow inbound email to trigger this function. Off by default — like a schedule, you opt in before
          mail is accepted.
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${color.border}`, opacity: rest * (1 - addressFocus) }} />
      <div style={{ position: "relative", padding: "16px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: BODY_ROW_H,
            ...surface(rest * (1 - addressFocus)),
          }}
        >
          <div>
            <div style={{ fontSize: 13, lineHeight: "20px", fontWeight: 500, color: color.foreground }}>
              Email trigger
            </div>
            <div style={{ ...T.small, marginTop: 4 }}>
              {enabled
                ? "Enabled — SMTP recipients for this function are accepted."
                : "Disabled — inbound mail for this function is rejected."}
            </div>
          </div>
          <Switch on={on} />
        </div>
        <div style={{ height: expand * (BOX_GAP + BOX_H), overflow: addressFocus > 0 ? "visible" : "hidden" }}>
          <div style={{ height: BOX_GAP }} />
          <div
            style={{
              position: "relative",
              height: BOX_H,
              boxSizing: "border-box",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${color.border}`,
              backgroundColor: `rgba(45,45,49,${0.3 * (1 - addressFocus)})`,
              borderColor: `rgba(34,34,36,${1 - addressFocus})`,
              opacity: clamp(expand * 1.4 - 0.3),
            }}
          >
            <Mail size={16} color={color.mutedForeground} style={{ marginTop: 2, flexShrink: 0, opacity: 1 - addressFocus }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, lineHeight: "18px", fontWeight: 500, color: color.foreground, opacity: 1 - addressFocus }}>
                Testing address
              </div>
              <div style={{ marginTop: 4, height: 30 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 30,
                    boxSizing: "border-box",
                    padding: "0 12px 0 10px",
                    borderRadius: 4,
                    backgroundColor: `rgba(45,45,49,${1 - addressFocus})`,
                    fontFamily: font.mono,
                    fontSize: 12,
                    lineHeight: "18px",
                    whiteSpace: "nowrap",
                    color: `color-mix(in oklab, ${color.mutedForeground} ${Math.round((1 - addressFocus) * 100)}%, ${color.foreground})`,
                  }}
                >
                  <span>{MAILBOX}</span>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 1 - addressFocus }}>
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </span>
              </div>
              <div style={{ ...T.small, marginTop: 4, opacity: 1 - addressFocus }}>
                Appwrite owns the zone — no DNS, MX, or TXT setup required.
              </div>
              <div style={{ ...T.small, marginTop: 4, whiteSpace: "nowrap", opacity: 1 - addressFocus }}>
                For a domain you own, add MX and TXT records under the Domains tab → Email domains.
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          position: "relative",
          height: FOOTER_H,
          boxSizing: "border-box",
          borderTop: `1px solid ${color.border}`,
          padding: "16px 24px",
          backgroundColor: "rgba(45,45,49,0.3)",
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          opacity: rest * (1 - addressFocus),
        }}
      >
        <Button pressed={updatePress} disabled={!dirty}>
          Update
        </Button>
      </div>
    </div>
  );
};

/** Neighbouring "Schedule" card (only its lower part is ever on screen). */
export const ScheduleCard: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      width: CARD_W,
      borderRadius: 14,
      border: `1px solid ${color.border}`,
      backgroundColor: "rgba(29,29,33,0.5)",
      fontFamily: font.ui,
      opacity,
      overflow: "hidden",
    }}
  >
    <div style={{ padding: "16px 24px" }}>
      <div style={T.title}>Schedule</div>
      <div style={{ ...T.desc, marginTop: 8 }}>Run this function on a schedule using cron expressions.</div>
    </div>
    <div style={{ borderTop: `1px solid ${color.border}` }} />
    <div style={{ padding: "16px 24px", display: "flex", gap: 8 }}>
      {["Every hour", "Every day", "Every week", "Custom"].map((l, i) => (
        <span
          key={l}
          style={{
            height: 32,
            display: "inline-flex",
            alignItems: "center",
            padding: "0 12px",
            borderRadius: 8,
            fontSize: 13,
            border: `1px solid ${i === 0 ? color.ring : color.muted}`,
            color: i === 0 ? color.foreground : color.mutedForeground,
          }}
        >
          {l}
        </span>
      ))}
    </div>
    <div style={{ height: FOOTER_H, boxSizing: "border-box", borderTop: `1px solid ${color.border}`, padding: "16px 24px", backgroundColor: "rgba(45,45,49,0.3)" }}>
      <Button disabled>Update</Button>
    </div>
  </div>
);

/** Neighbouring "Events" card (only its top part is ever on screen). */
export const EventsCard: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      width: CARD_W,
      borderRadius: 14,
      border: `1px solid ${color.border}`,
      backgroundColor: "rgba(29,29,33,0.5)",
      fontFamily: font.ui,
      opacity,
      overflow: "hidden",
    }}
  >
    <div style={{ padding: "16px 24px" }}>
      <div style={T.title}>Events</div>
      <div style={{ ...T.desc, marginTop: 8 }}>
        Events that trigger this function (maximum 100). <span style={{ color: color.foreground, textDecoration: "underline", textUnderlineOffset: 3 }}>Learn more</span>
      </div>
    </div>
    <div style={{ borderTop: `1px solid ${color.border}` }} />
    <div style={{ padding: "16px 24px" }}>
      <Button variant="outline">
        <Plus size={16} />
        Add event
      </Button>
      <div style={{ ...T.desc, marginTop: 12 }}>No events configured</div>
    </div>
  </div>
);
