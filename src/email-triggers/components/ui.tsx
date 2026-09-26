// Console UI pieces rebuilt from vibes (src/components/ui/*) at 1x CSS size.
// Scenes scale whole panels up, so these keep the console's real proportions.
import { CheckCircle2, Copy } from "lucide-react";
import { badge, BadgeVariant, color, font } from "../theme";
import { clamp, ease, mix } from "../lib/anim";

export const Badge: React.FC<{
  variant: BadgeVariant;
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
}> = ({ variant, children, size = 10, style }) => {
  const v = badge[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        padding: "2px 8px",
        fontSize: size,
        lineHeight: 1.5,
        fontWeight: 500,
        fontFamily: font.ui,
        whiteSpace: "nowrap",
        flexShrink: 0,
        backgroundColor: v.bg,
        color: v.fg,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** Radix switch as styled in vibes; `on` is 0..1 so it can animate. */
export const Switch: React.FC<{ on: number; style?: React.CSSProperties }> = ({ on, style }) => {
  const t = clamp(on);
  const track = t > 0.5 ? color.foreground : "rgba(45,45,49,0.8)";
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: 32,
        height: 18.4,
        borderRadius: 999,
        border: "1px solid transparent",
        backgroundColor: track,
        boxSizing: "border-box",
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        style={{
          display: "block",
          width: 16,
          height: 16,
          borderRadius: 999,
          backgroundColor: t > 0.5 ? color.primaryForeground : color.foreground,
          transform: `translateX(${mix(0, 14, ease.snap(t))}px)`,
        }}
      />
    </span>
  );
};

export const Button: React.FC<{
  children: React.ReactNode;
  variant?: "default" | "outline" | "brand";
  pressed?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
}> = ({ children, variant = "default", pressed = 0, disabled = false, style }) => {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    padding: "0 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: font.ui,
    whiteSpace: "nowrap",
    border: "1px solid transparent",
    flexShrink: 0,
    opacity: disabled ? 0.5 : 1,
    transform: `scale(${1 - pressed * 0.05})`,
    boxSizing: "border-box",
  };
  const variants: Record<string, React.CSSProperties> = {
    default: { backgroundColor: color.foreground, color: color.primaryForeground },
    brand: { backgroundColor: color.pink, color: "#ffffff" },
    outline: { borderColor: color.muted, color: color.mutedForeground, backgroundColor: "transparent" },
  };
  return <span style={{ ...base, ...variants[variant], ...style }}>{children}</span>;
};

export const CopyableId: React.FC<{
  id: React.ReactNode;
  size?: "sm" | "md";
  copied?: boolean;
  style?: React.CSSProperties;
}> = ({ id, size = "md", copied = false, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      borderRadius: 4,
      backgroundColor: color.muted,
      color: color.mutedForeground,
      fontFamily: font.mono,
      fontSize: size === "md" ? 12 : 11,
      padding: size === "md" ? "6px 12px 6px 10px" : "2px 8px 2px 6px",
      whiteSpace: "nowrap",
      flexShrink: 0,
      ...style,
    }}
  >
    <span>{id}</span>
    {copied ? (
      <CheckCircle2 size={12} color="oklch(0.696 0.17 162.48)" strokeWidth={2} />
    ) : (
      <Copy size={12} strokeWidth={2} />
    )}
  </span>
);

/** rounded-xl border bg-card/50 section card used across console settings */
export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      borderRadius: 14,
      border: `1px solid ${color.border}`,
      backgroundColor: "rgba(29,29,33,0.5)",
      overflow: "hidden",
      fontFamily: font.ui,
      color: color.foreground,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Divider: React.FC = () => <div style={{ borderTop: `1px solid ${color.border}` }} />;

/** Mouse pointer. `press` 0..1 squeezes it; ripple draws from `ripple` 0..1. */
export const Cursor: React.FC<{
  x: number;
  y: number;
  press?: number;
  ripple?: number;
  opacity?: number;
  scale?: number;
}> = ({ x, y, press = 0, ripple = -1, opacity = 1, scale = 1.5 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: 0,
      height: 0,
      opacity,
      pointerEvents: "none",
      zIndex: 50,
    }}
  >
    {ripple >= 0 && ripple < 1 ? (
      <div
        style={{
          position: "absolute",
          left: -40 * (0.3 + ripple),
          top: -40 * (0.3 + ripple),
          width: 80 * (0.3 + ripple),
          height: 80 * (0.3 + ripple),
          borderRadius: "50%",
          border: `2px solid rgba(255,255,255,${0.55 * (1 - ripple)})`,
          boxSizing: "border-box",
        }}
      />
    ) : null}
    <svg
      width={22 * scale}
      height={30 * scale}
      viewBox="0 0 22 30"
      style={{
        position: "absolute",
        left: -2 * scale,
        top: -1 * scale,
        transform: `scale(${1 - press * 0.14})`,
        transformOrigin: "2px 1px",
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
      }}
    >
      <path
        d="M2 1.5 L2 23 L7.4 18.2 L11 26.4 L14.6 24.8 L11.1 16.8 L18.4 16.8 Z"
        fill="#ffffff"
        stroke="#111113"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

/** Sonner-style toast (dark). */
export const Toast: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "14px 16px",
      minWidth: 300,
      borderRadius: 8,
      border: `1px solid ${color.muted}`,
      backgroundColor: color.card,
      color: color.foreground,
      fontFamily: font.ui,
      fontSize: 13,
      boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
      ...style,
    }}
  >
    <CheckCircle2 size={16} color={color.foreground} strokeWidth={2} />
    {children}
  </div>
);
