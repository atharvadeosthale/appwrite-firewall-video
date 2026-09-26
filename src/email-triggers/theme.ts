// Design tokens for the Email Triggers trailer.
// Source: appwrite/vibes, branch torsten/smtp-execution-trigger-display-3d15,
// src/styles.css (.dark theme + brand CTA) and Tailwind v4 status colors used
// by src/components/ui/badge.tsx.

export const color = {
  // Console dark surfaces
  background: "#19191c",
  editor: "#141416",
  sidebar: "#141416",
  card: "#1d1d21",
  muted: "#2d2d31",
  border: "#222224",
  ring: "#54545d",
  foreground: "#fafafa",
  mutedForeground: "#9f9fa9",
  primaryForeground: "#18181b",

  // Stage (slightly deeper than the console so UI cards float on it)
  void: "#0c0c0e",
  stage: "#111113",

  // Brand
  pink: "#fd366e",
  pinkSoft: "#fe86a8",
  violet: "#9b8aff",
  orange: "#ffb088",

  // Status (Tailwind v4)
  emerald400: "oklch(0.765 0.177 163.223)",
  emerald500: "oklch(0.696 0.17 162.48)",
  red400: "oklch(0.704 0.191 22.216)",
  red500: "oklch(0.637 0.237 25.331)",
  amber400: "oklch(0.828 0.189 84.429)",
  amber500: "oklch(0.769 0.188 70.08)",
  blue400: "oklch(0.707 0.165 254.624)",
  blue500: "oklch(0.623 0.214 259.815)",
  slate400: "oklch(0.704 0.04 256.788)",
} as const;

// Dark code palette from styles.css (.dark)
export const code = {
  plain: "#9cdcfe",
  moduleKeyword: "#9685fe",
  fn: "#67a3fe",
  keyword: "#fe86a8",
  comment: "#6e6e71",
  property: "#67a3fe",
  string: "#4ad4ab",
  punctuation: "#c5c5cc",
  number: "#ffb088",
} as const;

export const font = {
  display: "'Aeonik Pro', 'Inter', sans-serif",
  ui: "'Inter', sans-serif",
  mono: "'Source Code Pro', monospace",
} as const;

// Badge variants from vibes src/components/ui/badge.tsx (dark mode)
export const badge = {
  completed: { bg: "oklch(0.696 0.17 162.48 / 0.1)", fg: color.emerald400 },
  success: { bg: "oklch(0.696 0.17 162.48 / 0.1)", fg: color.emerald400 },
  verified: { bg: "oklch(0.696 0.17 162.48 / 0.1)", fg: color.emerald400 },
  unverified: { bg: "oklch(0.637 0.237 25.331 / 0.1)", fg: color.red400 },
  failed: { bg: "oklch(0.637 0.237 25.331 / 0.1)", fg: color.red400 },
  processing: { bg: "oklch(0.623 0.214 259.815 / 0.1)", fg: color.blue400 },
  pending: { bg: "oklch(0.769 0.188 70.08 / 0.1)", fg: color.amber400 },
  secondary: { bg: color.muted, fg: color.foreground },
  outline: { bg: "rgba(45,45,49,0.6)", fg: color.mutedForeground },
  primary: { bg: color.foreground, fg: color.primaryForeground },
} as const;

export type BadgeVariant = keyof typeof badge;

// The one email that travels through the whole trailer.
// Values from the request body example in the email triggers docs
// (vibes: src/content/docs/products/functions/email/index.markdoc).
export const EMAIL = {
  id: "5f0c2a9e3b7d4e1f8a6c0b2d4e6f8a1c",
  functionId: "6a51290fe3d0727e293a",
  zone: "appwrite.email",
  localPart: "support",
  fromName: "Walter O'Brien",
  fromAddress: "walter@example.net",
  subject: "Order 1042 did not arrive",
  text: "Hi, my order 1042 did not arrive yet.",
  html: "<p>Hi, my order 1042 did not arrive yet.</p>",
  messageId: "<CAF3x9k2@mail.example.net>",
  date: "Wed, 23 Sep 2026 09:14:02 +0000",
  helo: "mail.example.net",
  attachment: {
    name: "receipt.pdf",
    contentType: "application/pdf",
    size: 48213,
  },
  // Example token from Cloud's ProxyRule model (verificationToken example).
  verificationToken: "b4fd43ad80714fef92490c5f9e2f612e",
} as const;

export const ADDRESS_DOMAIN = `${EMAIL.functionId}.${EMAIL.zone}`;
export const ADDRESS = `${EMAIL.localPart}@${ADDRESS_DOMAIN}`;
