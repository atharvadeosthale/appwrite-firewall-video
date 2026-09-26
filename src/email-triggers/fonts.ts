import { loadFont } from "@remotion/fonts";
import { loadFont as loadSourceCodePro } from "@remotion/google-fonts/SourceCodePro";
import { staticFile } from "remotion";

// Aeonik Pro and Inter are the vibes console/marketing fonts
// (src/assets/fonts). The console code stack starts with source-code-pro,
// which vibes does not ship, so it comes from Google Fonts.

const aeonik: [string, string][] = [
  ["300", "AeonikPro-Light.woff2"],
  ["400", "AeonikPro-Regular.woff2"],
  ["500", "AeonikPro-Medium.woff2"],
  ["700", "AeonikPro-Bold.woff2"],
];

for (const [weight, file] of aeonik) {
  loadFont({
    family: "Aeonik Pro",
    url: staticFile(`fonts/${file}`),
    weight,
  });
}

for (const [weight, file] of [
  ["400", "inter-latin-400-normal.woff2"],
  ["600", "inter-latin-600-normal.woff2"],
]) {
  loadFont({
    family: "Inter",
    url: staticFile(`fonts/${file}`),
    weight,
  });
}

loadSourceCodePro("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});
