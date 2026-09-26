// Render selected frames of a composition to PNG for review.
// Usage: node scripts/stills.mjs <compId> <outDir> <frame,frame,...> [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";
import path from "node:path";
import fs from "node:fs";

const [, , compId, outDir, framesArg, scaleArg] = process.argv;
const frames = framesArg.split(",").map(Number);
const scale = scaleArg ? Number(scaleArg) : 0.5;
fs.mkdirSync(outDir, { recursive: true });

const bundleCache = path.join(process.cwd(), "node_modules/.cache/stills-bundle");
const serveUrl = await bundle({
  entryPoint: path.join(process.cwd(), "src/index.ts"),
  webpackOverride: (c) => enableTailwind(c),
  rspack: true,
});
const composition = await selectComposition({
  serveUrl,
  id: compId,
  chromiumOptions: { gl: "angle" },
});
for (const frame of frames) {
  const output = path.join(outDir, `${compId}-${String(frame).padStart(4, "0")}.png`);
  await renderStill({
    serveUrl,
    composition,
    frame,
    output,
    scale,
    chromiumOptions: { gl: "angle" },
    overwrite: true,
  });
  console.log("wrote", output);
}
