import { Paperclip } from "lucide-react";
import { color, font } from "../theme";

export type Notice = {
  name: string;
  initials: string;
  subject: string;
  time: string;
  kind: "support" | "invoice" | "alert" | "reply";
  attachment?: string;
};

export const KIND_COLOR: Record<Notice["kind"], string> = {
  support: color.pink,
  invoice: color.orange,
  alert: color.amber400,
  reply: color.violet,
};

export const NOTICE_W = 380;
export const NOTICE_H = 84;

/** Inbox notification card at 1x (380 x 84). */
export const EmailNotice: React.FC<{
  n: Notice;
  highlight?: number; // 0..1 ring in kind color
  fresh?: number; // 0..1 "new mail" glow
  unread?: boolean;
}> = ({ n, highlight = 0, fresh = 0, unread = false }) => {
  const c = KIND_COLOR[n.kind];
  return (
    <div
      style={{
        width: NOTICE_W,
        height: NOTICE_H,
        boxSizing: "border-box",
        padding: "0 16px",
        borderRadius: 14,
        backgroundColor: mixHex("#1d1d21", c, highlight * 0.1),
        border: `1px solid ${highlight > 0.01 ? hexA(c, 0.25 + 0.6 * highlight) : "rgba(255,255,255,0.07)"}`,
        boxShadow: [
          "0 18px 40px rgba(0,0,0,0.45)",
          "inset 0 1px 0 rgba(255,255,255,0.05)",
          highlight > 0.01 ? `0 0 ${46 * highlight}px ${hexA(c, 0.4 * highlight)}` : "",
          fresh > 0.01 ? `0 0 ${40 * fresh}px ${hexA(color.pink, 0.5 * fresh)}` : "",
          fresh > 0.01 ? `inset 0 0 0 1px ${hexA(color.pink, 0.7 * fresh)}` : "",
        ]
          .filter(Boolean)
          .join(", "),
        display: "flex",
        gap: 12,
        alignItems: "center",
        fontFamily: font.ui,
        position: "relative",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: 999,
          backgroundColor: hexA(c, 0.16),
          color: c,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {n.initials}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: color.foreground,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}
          >
            {n.name}
          </span>
          {n.attachment ? (
            <Paperclip size={12} color={color.mutedForeground} strokeWidth={2} style={{ flexShrink: 0 }} />
          ) : null}
          <span style={{ fontSize: 12, color: color.mutedForeground, flexShrink: 0 }}>{n.time}</span>
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "#c8c8cf",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {n.subject}
        </div>
      </div>
      {unread ? (
        <div
          style={{
            position: "absolute",
            left: 6,
            top: NOTICE_H / 2 - 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color.pink,
          }}
        />
      ) : null}
    </div>
  );
};

/** #rrggbb or oklch(...) plus alpha. */
export function hexA(c: string, a: number) {
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  if (c.startsWith("oklch(")) return c.replace(")", ` / ${a})`);
  return c;
}

/** Mix two colors (hex or oklch accent) — oklch accents fall back to CSS color-mix. */
export function mixHex(a: string, b: string, t: number) {
  if (t <= 0.001) return a;
  return `color-mix(in oklab, ${a} ${Math.round((1 - t) * 100)}%, ${b})`;
}
