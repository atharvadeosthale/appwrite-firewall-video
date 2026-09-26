import React from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { C, rgba } from "../theme";
import { INTER, MONO } from "../fonts";

/**
 * Console primitives at 1x console pixel sizes (shadcn tokens from vibes).
 * Wrap groups in <Zoom> to scale them up without blurring text.
 */

export const R = { sm: 6, md: 8, lg: 10, xl: 14 };

export const Zoom: React.FC<{ z: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  z,
  style,
  children,
}) => <div style={{ zoom: z, ...style }}>{children}</div>;

/** A soft specular band that crosses a surface once (progress 0..1). */
export const Sweep: React.FC<{ progress: number; radius?: number }> = ({ progress, radius = 0 }) =>
  progress > 0 && progress < 1 ? (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        pointerEvents: "none",
        background:
          "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.07) 47%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.07) 53%, transparent 62%)",
        backgroundSize: "260% 100%",
        backgroundPosition: `${100 - progress * 150}% 0`,
        mixBlendMode: "screen",
        zIndex: 20,
      }}
    />
  ) : null;

export const Card: React.FC<{ style?: React.CSSProperties; sweep?: number; children: React.ReactNode }> = ({
  style,
  sweep = 0,
  children,
}) => (
  <div
    style={{
      position: "relative",
      background: C.card,
      border: `1px solid ${C.hairline}`,
      borderRadius: R.xl,
      overflow: "hidden",
      fontFamily: INTER,
      color: C.fg,
      ...style,
    }}
  >
    {children}
    <Sweep progress={sweep} radius={R.xl} />
  </div>
);

export const CardHeader: React.FC<{ title: string; style?: React.CSSProperties }> = ({ title, style }) => (
  <div
    style={{
      borderBottom: `1px solid ${C.hairline}`,
      padding: "14px 20px",
      fontSize: 14,
      fontWeight: 600,
      ...style,
    }}
  >
    {title}
  </div>
);

/** Select trigger as rendered in the console (dark:bg-input/30, border-input). */
export const Select: React.FC<{
  icon?: LucideIcon;
  dot?: string;
  label: React.ReactNode;
  width?: number | string;
  active?: number; // 0..1 focus ring
  mono?: boolean;
  style?: React.CSSProperties;
}> = ({ icon: Icon, dot, label, width, active = 0, mono, style }) => (
  <div
    style={{
      height: 36,
      width,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      padding: "0 12px",
      borderRadius: R.md,
      border: `1px solid ${active > 0 ? rgba("#8a8a94", 0.5 + 0.5 * active) : C.input}`,
      background: rgba(C.input, 0.3),
      boxShadow: active > 0 ? `0 0 0 3px ${rgba("#54545d", 0.5 * active)}` : undefined,
      fontSize: 14,
      color: C.fg,
      fontFamily: mono ? MONO : INTER,
      whiteSpace: "nowrap",
      flexShrink: 0,
      ...style,
    }}
  >
    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden" }}>
      {Icon ? <Icon size={16} color={C.muted} strokeWidth={2} /> : null}
      {dot ? <span style={{ width: 8, height: 8, borderRadius: 999, background: dot, flexShrink: 0 }} /> : null}
      <span style={{ overflow: "hidden" }}>{label}</span>
    </span>
    <ChevronDown size={16} color={C.muted} style={{ opacity: 0.5, flexShrink: 0 }} />
  </div>
);

export const Input: React.FC<{
  value: React.ReactNode;
  mono?: boolean;
  width?: number | string;
  active?: number;
  placeholder?: boolean;
  style?: React.CSSProperties;
}> = ({ value, mono, width = "100%", active = 0, placeholder, style }) => (
  <div
    style={{
      height: 36,
      width,
      display: "flex",
      alignItems: "center",
      padding: "0 12px",
      borderRadius: R.md,
      border: `1px solid ${active > 0 ? rgba("#8a8a94", 0.5 + 0.5 * active) : C.input}`,
      background: rgba(C.input, 0.3),
      boxShadow: active > 0 ? `0 0 0 3px ${rgba("#54545d", 0.5 * active)}` : undefined,
      fontSize: 14,
      fontFamily: mono ? MONO : INTER,
      color: placeholder ? C.muted : C.fg,
      whiteSpace: "pre",
      boxSizing: "border-box",
      ...style,
    }}
  >
    {value}
  </div>
);

export const Label: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontSize: 14, fontWeight: 500, color: C.fg, marginBottom: 8, ...style }}>{children}</div>
);

/** Status-style badge (bg-*-500/10 text-*-400). */
export const Badge: React.FC<{
  color: string;
  text: string;
  children: React.ReactNode;
  size?: number;
  style?: React.CSSProperties;
}> = ({ color, text, children, size = 10, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      borderRadius: R.md,
      padding: "2px 8px",
      fontSize: size,
      fontWeight: 500,
      background: rgba(color, 0.1),
      color: text,
      whiteSpace: "nowrap",
      fontFamily: INTER,
      ...style,
    }}
  >
    {children}
  </span>
);

/** Popover menu surface used by selects and dropdowns. */
export const Menu: React.FC<{
  width: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ width, style, children }) => (
  <div
    style={{
      width,
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: R.md,
      padding: 4,
      boxShadow: "0 18px 50px rgba(0,0,0,0.55), 0 4px 14px rgba(0,0,0,0.35)",
      fontFamily: INTER,
      ...style,
    }}
  >
    {children}
  </div>
);

export const MenuItem: React.FC<{
  icon?: LucideIcon;
  dot?: string;
  label: string;
  highlight?: number;
  selected?: boolean;
  dim?: boolean;
}> = ({ icon: Icon, dot, label, highlight = 0, selected, dim }) => (
  <div
    style={{
      height: 32,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 8px",
      borderRadius: R.sm,
      fontSize: 14,
      color: dim ? C.faint : C.fg,
      background: highlight > 0 ? rgba("#2d2d31", highlight) : "transparent",
      position: "relative",
    }}
  >
    {Icon ? <Icon size={16} color={C.muted} /> : null}
    {dot ? <span style={{ width: 8, height: 8, borderRadius: 999, background: dot }} /> : null}
    <span style={{ flex: 1 }}>{label}</span>
    {selected ? (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.fg} strokeWidth="2">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ) : null}
  </div>
);

export const MenuGroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: "6px 8px 4px", fontSize: 12, color: C.muted }}>{children}</div>
);

export const IconButton: React.FC<{ icon: LucideIcon; size?: number; boxed?: boolean; style?: React.CSSProperties }> = ({
  icon: Icon,
  size = 36,
  boxed,
  style,
}) => (
  <div
    style={{
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: R.md,
      border: boxed ? `1px solid ${C.border}` : undefined,
      background: boxed ? C.card : undefined,
      flexShrink: 0,
      ...style,
    }}
  >
    <Icon size={14} color={C.muted} />
  </div>
);

export const Button: React.FC<{
  variant: "brand" | "primary" | "outline";
  children: React.ReactNode;
  icon?: LucideIcon;
  press?: number;
  style?: React.CSSProperties;
}> = ({ variant, children, icon: Icon, press = 0, style }) => {
  const v = {
    brand: { background: C.pink, color: "#fff", border: "1px solid transparent" },
    primary: { background: C.fg, color: "#1f1f23", border: "1px solid transparent" },
    outline: { background: "transparent", color: C.muted, border: `1px solid ${C.input}` },
  }[variant];
  return (
    <div
      style={{
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "0 14px",
        borderRadius: R.md,
        fontSize: 14,
        fontWeight: 500,
        fontFamily: INTER,
        scale: `${1 - press * 0.05}`,
        filter: press > 0 ? `brightness(${1 - press * 0.15})` : undefined,
        whiteSpace: "nowrap",
        ...v,
        ...style,
      }}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </div>
  );
};

export const RailLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      position: "relative",
      zIndex: 1,
      background: C.card,
      padding: "0 6px",
      fontSize: 13,
      fontWeight: 600,
      lineHeight: 1,
      color: C.fg,
    }}
  >
    {children}
  </span>
);

/** A macOS-style pointer for UI demos. */
export const Pointer: React.FC<{ x: number; y: number; press?: number; opacity?: number }> = ({
  x,
  y,
  press = 0,
  opacity = 1,
}) => (
  <div style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none", zIndex: 50 }}>
    {press > 0 ? (
      <div
        style={{
          position: "absolute",
          left: -22,
          top: -22,
          width: 44,
          height: 44,
          borderRadius: 999,
          border: `2px solid ${rgba("#ffffff", 0.5 * (1 - press))}`,
          scale: `${0.4 + press * 0.9}`,
        }}
      />
    ) : null}
    <svg
      width="26"
      height="30"
      viewBox="0 0 26 30"
      style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))", scale: `${1 - press * 0.12}`, transformOrigin: "2px 2px" }}
    >
      <path
        d="M2 2 L2 24 L7.5 18.8 L11.4 27.4 L15.2 25.7 L11.4 17.3 L18.6 17.3 Z"
        fill="#ffffff"
        stroke="#111114"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
