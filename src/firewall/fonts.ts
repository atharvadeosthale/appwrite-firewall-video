import { loadFont } from "@remotion/fonts";
import { loadFont as loadSourceCodePro } from "@remotion/google-fonts/SourceCodePro";
import { staticFile } from "remotion";

// Aeonik Pro and Inter ship with the Appwrite console (vibes/src/assets/fonts).
const aeonik = [
  ["300", "AeonikPro-Light.woff2"],
  ["400", "AeonikPro-Regular.woff2"],
  ["500", "AeonikPro-Medium.woff2"],
  ["700", "AeonikPro-Bold.woff2"],
  ["900", "AeonikPro-Black.woff2"],
] as const;

const inter = [
  ["400", "inter-latin-400-normal.woff2"],
  ["600", "inter-latin-600-normal.woff2"],
] as const;

for (const [weight, file] of aeonik) {
  loadFont({
    family: "Aeonik Pro",
    url: staticFile(`fonts/${file}`),
    weight,
    display: "block",
  });
}

for (const [weight, file] of inter) {
  loadFont({
    family: "Inter",
    url: staticFile(`fonts/${file}`),
    weight,
    display: "block",
  });
}

// The console styles `code` with source-code-pro first.
const mono = loadSourceCodePro("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

export const AEONIK = "'Aeonik Pro', 'Inter', sans-serif";
export const INTER = "'Inter', sans-serif";
export const MONO = `${mono.fontFamily}, ui-monospace, monospace`;
