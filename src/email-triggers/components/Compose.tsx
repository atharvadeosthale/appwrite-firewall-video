import { Maximize2, Minus, Paperclip, Send, Trash2, X } from "lucide-react";
import { color, EMAIL, font } from "../theme";

/** Scale the compose window is drawn at (layout below is at 1x). */
export const COMPOSE_K = 1.2;
export const COMPOSE = {
  x: 0,
  y: 0,
  w: 1080,
  header: 66,
  row: 64,
  body: 196,
  footer: 84,
  label: 118,
  pad: 30,
  toSize: 22,
};
export const COMPOSE_H = COMPOSE.header + COMPOSE.row * 3 + COMPOSE.body + COMPOSE.footer;
/** Screen placement: centred, drawn at COMPOSE_K. */
export const COMPOSE_SCREEN = {
  x: (1920 - COMPOSE.w * COMPOSE_K) / 2,
  y: (1080 - COMPOSE_H * COMPOSE_K) / 2,
  w: COMPOSE.w * COMPOSE_K,
  h: COMPOSE_H * COMPOSE_K,
};
/** Left edge and vertical centre of the "To" value on screen. */
export const TO_TEXT = {
  x: COMPOSE_SCREEN.x + (COMPOSE.pad + COMPOSE.label) * COMPOSE_K,
  y: COMPOSE_SCREEN.y + (COMPOSE.header + COMPOSE.row + COMPOSE.row / 2) * COMPOSE_K,
  size: COMPOSE.toSize * COMPOSE_K,
};
export const SEND_BTN = {
  x: COMPOSE_SCREEN.x + (COMPOSE.pad + 64) * COMPOSE_K,
  y: COMPOSE_SCREEN.y + (COMPOSE_H - COMPOSE.footer / 2) * COMPOSE_K,
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div
    style={{
      height: COMPOSE.row,
      display: "flex",
      alignItems: "center",
      padding: `0 ${COMPOSE.pad}px`,
      borderBottom: `1px solid ${color.border}`,
      boxSizing: "border-box",
    }}
  >
    <div style={{ width: COMPOSE.label, fontSize: 20, color: color.mutedForeground, flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1, minWidth: 0, fontSize: 22, color: color.foreground, whiteSpace: "nowrap" }}>{children}</div>
  </div>
);

/** Generic dark compose window. The To value is drawn by the scene. */
export const Compose: React.FC<{
  subject: string;
  body: string;
  caret: "subject" | "body" | null;
  caretOn: boolean;
  attachment: number;
  sendPress: number;
  toChip: number;
}> = ({ subject, body, caret, caretOn, attachment, sendPress, toChip }) => {
  const Caret = () => (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height: "1.1em",
        marginLeft: 2,
        verticalAlign: "-0.15em",
        backgroundColor: color.pink,
        opacity: caretOn ? 1 : 0,
      }}
    />
  );
  return (
    <div
      style={{
        width: COMPOSE.w,
        height: COMPOSE_H,
        borderRadius: 22,
        backgroundColor: "#18181b",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 60px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        overflow: "hidden",
        fontFamily: font.ui,
      }}
    >
      <div
        style={{
          height: COMPOSE.header,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${COMPOSE.pad}px`,
          borderBottom: `1px solid ${color.border}`,
          backgroundColor: "#1d1d21",
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 600, color: color.foreground }}>New message</span>
        <span style={{ display: "flex", gap: 22, color: color.mutedForeground }}>
          <Minus size={22} />
          <Maximize2 size={20} />
          <X size={22} />
        </span>
      </div>
      <Row label="From">
        {EMAIL.fromName} <span style={{ color: color.mutedForeground }}>&lt;{EMAIL.fromAddress}&gt;</span>
      </Row>
      <Row label="To">
        <span
          style={{
            display: "inline-block",
            marginLeft: -14,
            height: 38,
            width: 43 * COMPOSE.toSize * 0.6 + 28,
            borderRadius: 19,
            backgroundColor: `rgba(253,54,110,${0.1 * toChip})`,
            border: `1px solid rgba(253,54,110,${0.35 * toChip})`,
            verticalAlign: "middle",
          }}
        />
      </Row>
      <Row label="Subject">
        {subject}
        {caret === "subject" ? <Caret /> : null}
      </Row>
      <div style={{ height: COMPOSE.body, padding: `22px ${COMPOSE.pad}px`, boxSizing: "border-box" }}>
        <div style={{ fontSize: 24, lineHeight: "36px", color: color.foreground, minHeight: 36 }}>
          {body}
          {caret === "body" ? <Caret /> : null}
        </div>
        <div
          style={{
            marginTop: 28,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px 10px 12px",
            borderRadius: 12,
            backgroundColor: color.muted,
            border: "1px solid rgba(255,255,255,0.06)",
            opacity: attachment,
            transform: `translateY(${(1 - attachment) * 16}px) scale(${0.9 + attachment * 0.1})`,
            transformOrigin: "0 50%",
          }}
        >
          <div
            style={{
              width: 36,
              height: 42,
              borderRadius: 6,
              backgroundColor: "rgba(253,54,110,0.16)",
              color: color.pink,
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: 6,
              boxSizing: "border-box",
            }}
          >
            PDF
          </div>
          <div>
            <div style={{ fontSize: 19, color: color.foreground, fontFamily: font.mono }}>{EMAIL.attachment.name}</div>
            <div style={{ fontSize: 15, color: color.mutedForeground, marginTop: 2 }}>47 KB</div>
          </div>
        </div>
      </div>
      <div
        style={{
          height: COMPOSE.footer,
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: `0 ${COMPOSE.pad}px`,
          borderTop: `1px solid ${color.border}`,
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            height: 48,
            padding: "0 22px",
            borderRadius: 12,
            backgroundColor: color.pink,
            color: "#fff",
            fontSize: 20,
            fontWeight: 600,
            transform: `scale(${1 - sendPress * 0.06})`,
            boxShadow: `0 0 ${24 + sendPress * 30}px rgba(253,54,110,${0.25 + sendPress * 0.5})`,
          }}
        >
          <Send size={19} />
          Send
        </span>
        <Paperclip size={22} color={color.mutedForeground} />
        <span style={{ flex: 1 }} />
        <Trash2 size={22} color={color.mutedForeground} />
      </div>
    </div>
  );
};
