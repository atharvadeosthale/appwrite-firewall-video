// Render review stills for the Email Triggers trailer and tile them into a
// labelled contact sheet.
//
//   node scripts/email-triggers/stills.mjs <compId> <frames> <outDir> [scale] [cols]
//
// <frames> is a comma list of frames or ranges: "0,30,60" or "0-480:30".
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [, , compId, framesArg, outDir, scaleArg, colsArg] = process.argv;
if (!compId || !framesArg || !outDir) {
  console.error("usage: stills.mjs <compId> <frames> <outDir> [scale] [cols]");
  process.exit(1);
}
const scale = scaleArg ? Number(scaleArg) : 0.5;
const cols = colsArg ? Number(colsArg) : 4;

const frames = framesArg.split(",").flatMap((part) => {
  const m = part.match(/^(\d+)-(\d+)(?::(\d+))?$/);
  if (!m) return [Number(part)];
  const [a, b, step] = [Number(m[1]), Number(m[2]), Number(m[3] ?? 1)];
  const out = [];
  for (let f = a; f <= b; f += step) out.push(f);
  return out;
});

fs.mkdirSync(outDir, { recursive: true });
const t0 = Date.now();
const serveUrl = await bundle({
  entryPoint: path.join(process.cwd(), "src/index.ts"),
  webpackOverride: (c) => enableTailwind(c),
  rspack: true,
  enableCaching: true,
});
const browser = await openBrowser("chrome", { chromiumOptions: { gl: "angle" } });
const composition = await selectComposition({
  serveUrl,
  id: compId,
  puppeteerInstance: browser,
  chromiumOptions: { gl: "angle" },
});
const last = composition.durationInFrames - 1;
const outputs = [];
const queue = frames.map((f) => Math.min(f, last));
const worker = async () => {
  while (queue.length) {
    const frame = queue.shift();
    const output = path.join(outDir, `${compId}-${String(frame).padStart(5, "0")}.png`);
    await renderStill({
      serveUrl,
      composition,
      frame,
      output,
      scale,
      puppeteerInstance: browser,
      chromiumOptions: { gl: "angle" },
      overwrite: true,
    });
    outputs.push({ frame, output });
  }
};
await Promise.all(Array.from({ length: 4 }, worker));
await browser.close({ silent: true });
outputs.sort((a, b) => a.frame - b.frame);
console.log(`rendered ${outputs.length} stills in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (outputs.length > 1) {
  const sheet = path.join(outDir, `${compId}-sheet.png`);
  execFileSync("python3", [
    path.join(path.dirname(new URL(import.meta.url).pathname), "sheet.py"),
    sheet,
    String(cols),
    ...outputs.flatMap((o) => [String(o.frame), o.output]),
  ]);
  console.log("sheet", sheet);
} else {
  console.log("still", outputs[0].output);
}
