// Band-energy analysis of a 24-bit stereo WAV. Usage: node analyze.mjs file.wav "a-b" ...
import fs from "node:fs";
const [, , file, ...segs] = process.argv;
const buf = fs.readFileSync(file);
const SR = buf.readUInt32LE(24);
const data = buf.subarray(44);
const n = data.length / 6;
const mono = new Float32Array(n);
for (let i = 0; i < n; i++) mono[i] = (data.readIntLE(i * 6, 3) + data.readIntLE(i * 6 + 3, 3)) / 2 / 8388607;
const fft = (re, im) => {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < N; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi;
        const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
      }
    }
  }
};
const bands = [[20, 60], [60, 150], [150, 400], [400, 1000], [1000, 2500], [2500, 6000], [6000, 16000]];
for (const seg of segs) {
  const [a, b] = seg.split("-").map(Number);
  const N = 8192;
  const acc = new Float64Array(bands.length);
  let frames = 0;
  for (let s = Math.floor(a * SR); s + N < Math.floor(b * SR); s += N / 2) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = mono[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
    fft(re, im);
    for (let k = 1; k < N / 2; k++) {
      const f = (k * SR) / N;
      const p = re[k] * re[k] + im[k] * im[k];
      bands.forEach(([lo, hi], bi) => { if (f >= lo && f < hi) acc[bi] += p; });
    }
    frames++;
  }
  const out = bands.map(([lo, hi], bi) => `${lo}-${hi}: ${(10 * Math.log10(acc[bi] / frames / ((hi - lo) / (SR / N)) + 1e-20)).toFixed(1)}`);
  console.log(`${seg}s  ` + out.join(" | "));
}
