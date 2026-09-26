import { ADDRESS, EMAIL } from "../theme";
import { rand } from "../lib/anim";

// Raw RFC 822 message consistent with the docs' request body example.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const base64Line = (seed: number, len = 76) => {
  let s = "";
  for (let i = 0; i < len; i++) s += B64[Math.floor(rand(seed * 131 + i * 7.13) * 64)];
  return s;
};

export type MimeLine = { text: string; kind: "header" | "boundary" | "body" | "b64" | "blank" | "meta" };

export const MIME_LINES: MimeLine[] = [
  { text: `Return-Path: <${EMAIL.fromAddress}>`, kind: "meta" },
  { text: `Received: from ${EMAIL.helo} (${EMAIL.helo} [203.0.113.10])`, kind: "meta" },
  { text: `From: ${EMAIL.fromName} <${EMAIL.fromAddress}>`, kind: "header" },
  { text: `To: ${ADDRESS}`, kind: "header" },
  { text: `Subject: ${EMAIL.subject}`, kind: "header" },
  { text: `Message-ID: ${EMAIL.messageId}`, kind: "header" },
  { text: `Date: ${EMAIL.date}`, kind: "header" },
  { text: "MIME-Version: 1.0", kind: "meta" },
  { text: 'Content-Type: multipart/mixed; boundary="000000000000a1b2c3d4e5f6"', kind: "meta" },
  { text: "", kind: "blank" },
  { text: "--000000000000a1b2c3d4e5f6", kind: "boundary" },
  { text: 'Content-Type: multipart/alternative; boundary="000000000000f6e5d4c3b2a1"', kind: "meta" },
  { text: "", kind: "blank" },
  { text: "--000000000000f6e5d4c3b2a1", kind: "boundary" },
  { text: 'Content-Type: text/plain; charset="UTF-8"', kind: "meta" },
  { text: "Content-Transfer-Encoding: quoted-printable", kind: "meta" },
  { text: "", kind: "blank" },
  { text: EMAIL.text, kind: "body" },
  { text: "", kind: "blank" },
  { text: "--000000000000f6e5d4c3b2a1", kind: "boundary" },
  { text: 'Content-Type: text/html; charset="UTF-8"', kind: "meta" },
  { text: "Content-Transfer-Encoding: quoted-printable", kind: "meta" },
  { text: "", kind: "blank" },
  { text: "<p>Hi, my order 1042 did not arrive yet.</p>", kind: "body" },
  { text: "", kind: "blank" },
  { text: "--000000000000f6e5d4c3b2a1--", kind: "boundary" },
  { text: "--000000000000a1b2c3d4e5f6", kind: "boundary" },
  { text: `Content-Type: application/pdf; name="${EMAIL.attachment.name}"`, kind: "meta" },
  { text: `Content-Disposition: attachment; filename="${EMAIL.attachment.name}"`, kind: "meta" },
  { text: "Content-Transfer-Encoding: base64", kind: "meta" },
  { text: "", kind: "blank" },
  // "%PDF-1.7" in base64, then noise
  { text: "JVBERi0xLjcKJeLjz9MKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4K", kind: "b64" },
  ...Array.from({ length: 26 }, (_, i) => ({ text: base64Line(i + 1), kind: "b64" as const })),
  { text: base64Line(99, 38) + "==", kind: "b64" },
  { text: "--000000000000a1b2c3d4e5f6--", kind: "boundary" },
];
