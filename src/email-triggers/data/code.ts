// Hand-tokenised sources for S5 so highlights can target exact columns.
// JSON is the request body from the email triggers docs (trimmed);
// the handler is the Node.js example from the announcement post (condensed).
import { EMAIL } from "../theme";

export type Kind = "key" | "str" | "num" | "punc" | "kw" | "fn" | "id" | "prop" | "com" | "plain";
export type Seg = [string, Kind];
export type Line = Seg[];

const s = (t: string): Seg => [`"${t}"`, "str"];
const k = (t: string): Seg => [`"${t}"`, "key"];
const p = (t: string): Seg => [t, "punc"];

export const JSON_LINES: Line[] = [
  [p("{")],
  [p("  "), k("id"), p(": "), s(EMAIL.id), p(",")],
  [p("  "), k("envelope"), p(": {")],
  [p("    "), k("from"), p(": "), s(EMAIL.fromAddress), p(",")],
  [p("    "), k("to"), p(": ["), s(`support@${EMAIL.functionId}.appwrite.email`), p("]")],
  [p("  },")],
  [p("  "), k("from"), p(": "), s(`${EMAIL.fromName} <${EMAIL.fromAddress}>`), p(",")],
  [p("  "), k("subject"), p(": "), s(EMAIL.subject), p(",")],
  [p("  "), k("text"), p(": "), s(EMAIL.text), p(",")],
  [p("  "), k("html"), p(": "), s(EMAIL.html), p(",")],
  [p("  "), k("attachments"), p(": [")],
  [p("    {")],
  [p("      "), k("name"), p(": "), s(EMAIL.attachment.name), p(",")],
  [p("      "), k("contentType"), p(": "), s(EMAIL.attachment.contentType), p(",")],
  [p("      "), k("size"), p(": "), [String(EMAIL.attachment.size), "num"], p(",")],
  [p("      "), k("url"), p(": "), s("https://…/files/attachment-0?token=…")],
  [p("    }")],
  [p("  ],")],
  [p("  "), k("receivedAt"), p(": "), s("2026-09-23T09:14:03Z")],
  [p("}")],
];

const kw = (t: string): Seg => [t, "kw"];
const fn = (t: string): Seg => [t, "fn"];
const id = (t: string): Seg => [t, "id"];
const pr = (t: string): Seg => [t, "prop"];
const st = (t: string): Seg => [t, "str"];
const pl = (t: string): Seg => [t, "plain"];

export const CODE_LINES: Line[] = [
  [kw("export default async"), pl(" ("), p("{ "), id("req"), p(", "), id("res"), p(", "), id("log"), p(" }"), pl(") "), kw("=>"), p(" {")],
  [pl("  "), kw("if"), p(" ("), id("req"), p("."), pr("headers"), p("["), st("'x-appwrite-trigger'"), p("] "), kw("!=="), p(" "), st("'email'"), p(") {")],
  [pl("    "), kw("return"), p(" "), id("res"), p("."), fn("text"), p("("), st("'Not an email'"), p(", "), ["400", "num"], p(");")],
  [p("  }")],
  [],
  [pl("  "), kw("const"), p(" "), id("email"), p(" = "), id("req"), p("."), pr("bodyJson"), p(";")],
  [pl("  "), ["// … TablesDB client from x-appwrite-key", "com"]],
  [pl("  "), kw("await"), p(" "), id("tablesDB"), p("."), fn("createRow"), p("({")],
  [pl("    "), pr("databaseId"), p(": "), st("'<DATABASE_ID>'"), p(",")],
  [pl("    "), pr("tableId"), p(": "), st("'<TABLE_ID>'"), p(",")],
  [pl("    "), pr("rowId"), p(": "), id("email"), p("."), pr("id"), p(",")],
  [pl("    "), pr("data"), p(": {")],
  [pl("      "), pr("from"), p(": "), id("email"), p("."), pr("from"), p(",")],
  [pl("      "), pr("subject"), p(": "), id("email"), p("."), pr("subject"), p(",")],
  [pl("      "), pr("text"), p(": "), id("email"), p("."), pr("text")],
  [p("    }")],
  [p("  });")],
  [pl("  "), fn("log"), p("("), st("`Saved email ${email.id}`"), p(");")],
  [pl("  "), kw("return"), p(" "), id("res"), p("."), fn("empty"), p("();")],
  [p("};")],
];

/** Column where `needle` starts in a tokenised line (first match). */
export const colOf = (line: Line, needle: string) => {
  const text = line.map((seg) => seg[0]).join("");
  return text.indexOf(needle);
};

export const lineText = (line: Line) => line.map((seg) => seg[0]).join("");
