// Small DSP kit for the trailer score. Everything is deterministic.

export const SR = 48000;

export const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
export const db = (d) => Math.pow(10, d / 20);

/** RBJ biquad. Coefficients can be updated per block for sweeps. */
export class Biquad {
  constructor(type, freq, q = 0.707, gainDb = 0) {
    this.type = type;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(freq, q, gainDb);
  }
  set(freq, q = this.q, gainDb = this.gainDb) {
    this.q = q;
    this.gainDb = gainDb;
    const f = Math.min(Math.max(freq, 10), SR * 0.45);
    const w = (2 * Math.PI * f) / SR;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const alpha = sw / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (this.type) {
      case "lp":
        b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case "hp":
        b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case "bp":
        b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case "peak":
        b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
        break;
      case "lowshelf": {
        const sq = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) - (A - 1) * cw + sq); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - sq);
        a0 = (A + 1) + (A - 1) * cw + sq; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - sq;
        break;
      }
      case "highshelf": {
        const sq = 2 * Math.sqrt(A) * alpha;
        b0 = A * ((A + 1) + (A - 1) * cw + sq); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - sq);
        a0 = (A + 1) - (A - 1) * cw + sq; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - sq;
        break;
      }
      default:
        throw new Error(`unknown filter ${this.type}`);
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/** Band-limited saw via PolyBLEP. */
export class Saw {
  constructor(freq, phase = 0) {
    this.phase = phase;
    this.freq = freq;
  }
  next(freq = this.freq) {
    const dt = freq / SR;
    let t = this.phase;
    let y = 2 * t - 1;
    if (t < dt) {
      const x = t / dt;
      y -= x + x - x * x - 1;
    } else if (t > 1 - dt) {
      const x = (t - 1) / dt;
      y -= x * x + x + x + 1;
    }
    this.phase += dt;
    if (this.phase >= 1) this.phase -= 1;
    return y;
  }
}

export const buffer = (sec) => new Float32Array(Math.max(1, Math.ceil(sec * SR)));

/** A stereo bus. */
export const bus = (n) => ({ L: new Float32Array(n), R: new Float32Array(n) });

/** Mix a mono signal into a stereo bus at time t (sec), equal-power pan -1..1. */
export const place = (b, t, sig, gain = 1, pan = 0) => {
  const start = Math.round(t * SR);
  const a = ((pan + 1) * Math.PI) / 4;
  const gl = Math.cos(a) * gain * Math.SQRT2;
  const gr = Math.sin(a) * gain * Math.SQRT2;
  const n = b.L.length;
  // Fade the tail of every sound so buffers never end on a click.
  const fade = Math.max(1, Math.min(Math.floor(sig.length / 4), Math.round(0.03 * SR)));
  const fadeFrom = sig.length - fade;
  for (let i = 0; i < sig.length; i++) {
    const j = start + i;
    if (j < 0 || j >= n) continue;
    const g = i >= fadeFrom ? (sig.length - i) / fade : 1;
    b.L[j] += sig[i] * gl * g;
    b.R[j] += sig[i] * gr * g;
  }
};

export const placeStereo = (b, t, L, R, gain = 1) => {
  const start = Math.round(t * SR);
  const n = b.L.length;
  const fade = Math.max(1, Math.min(Math.floor(L.length / 4), Math.round(0.03 * SR)));
  const fadeFrom = L.length - fade;
  for (let i = 0; i < L.length; i++) {
    const j = start + i;
    if (j < 0 || j >= n) continue;
    const g = i >= fadeFrom ? (L.length - i) / fade : 1;
    b.L[j] += L[i] * gain * g;
    b.R[j] += R[i] * gain * g;
  }
};

/** Freeverb (Jezar) with stereo spread. */
export const freeverb = (inL, inR, { room = 0.84, damp = 0.25, wet = 1, width = 1 } = {}) => {
  const scale = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * scale));
  const apT = [556, 441, 341, 225].map((x) => Math.round(x * scale));
  const spread = Math.round(23 * scale);
  const makeCombs = (off) => combT.map((l) => ({ buf: new Float32Array(l + off), i: 0, store: 0 }));
  const makeAps = (off) => apT.map((l) => ({ buf: new Float32Array(l + off), i: 0 }));
  const cL = makeCombs(0), cR = makeCombs(spread), aL = makeAps(0), aR = makeAps(spread);
  const n = inL.length;
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const fb = room, d1 = damp, d2 = 1 - damp;
  const gain = 0.015;
  const run = (combs, aps, x) => {
    let out = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.store = y * d2 + c.store * d1;
      c.buf[c.i] = x + c.store * fb;
      c.i = (c.i + 1) % c.buf.length;
      out += y;
    }
    for (const a of aps) {
      const b = a.buf[a.i];
      a.buf[a.i] = out + b * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      out = b - out;
    }
    return out;
  };
  const w1 = wet * (width / 2 + 0.5), w2 = wet * ((1 - width) / 2);
  for (let i = 0; i < n; i++) {
    const x = (inL[i] + inR[i]) * gain;
    const l = run(cL, aL, x);
    const r = run(cR, aR, x);
    outL[i] = l * w1 + r * w2;
    outR[i] = r * w1 + l * w2;
  }
  return { L: outL, R: outR };
};

/** Stereo feedback delay (ping-pong). */
export const pingPong = (inL, inR, delaySec, fb = 0.4, wet = 0.4, lp = 5000) => {
  const d = Math.round(delaySec * SR);
  const n = inL.length;
  const bufL = new Float32Array(d), bufR = new Float32Array(d);
  const outL = new Float32Array(n), outR = new Float32Array(n);
  const fL = new Biquad("lp", lp), fR = new Biquad("lp", lp);
  let i = 0;
  for (let k = 0; k < n; k++) {
    const dl = bufL[i], dr = bufR[i];
    bufL[i] = fL.process(inL[k] + dr * fb);
    bufR[i] = fR.process(inR[k] * 0.2 + dl * fb);
    i = (i + 1) % d;
    outL[k] = inL[k] + dl * wet;
    outR[k] = inR[k] + dr * wet;
  }
  return { L: outL, R: outR };
};

/** Envelope helpers. */
export const expDecay = (t, tau) => Math.exp(-t / tau);
export const adsr = (t, dur, a, d, s, r) => {
  if (t < 0) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur) return s;
  if (t < dur + r) return s * (1 - (t - dur) / r);
  return 0;
};
export const smooth = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Write 24-bit PCM WAV. */
export const writeWav = (L, R) => {
  const n = L.length;
  const bytes = 3;
  const data = Buffer.alloc(n * 2 * bytes);
  let o = 0;
  for (let i = 0; i < n; i++) {
    for (const v of [L[i], R[i]]) {
      const s = Math.max(-1, Math.min(1, v));
      const x = Math.round(s * 8388607);
      data.writeIntLE(x, o, 3);
      o += 3;
    }
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2 * bytes, 28);
  header.writeUInt16LE(2 * bytes, 32);
  header.writeUInt16LE(bytes * 8, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
};
