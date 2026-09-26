// Small synthesis toolkit for the Email Triggers soundtrack.
export const SR = 48000;

export class Bus {
  constructor(seconds) {
    this.n = Math.ceil(seconds * SR);
    this.l = new Float32Array(this.n);
    this.r = new Float32Array(this.n);
  }
  add(i, vl, vr = vl) {
    if (i >= 0 && i < this.n) {
      this.l[i] += vl;
      this.r[i] += vr;
    }
  }
}

// deterministic noise
let seed = 1234567;
export const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2147483648 - 1;
};
export const reseed = (s) => (seed = s >>> 0);

export const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
export const note = (name) => {
  const m = name.match(/^([A-G](?:#|b)?)(-?\d)$/);
  return midi(12 * (Number(m[2]) + 1) + NOTE[m[1]]);
};

// PolyBLEP saw
const blep = (t, dt) => {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
};
export class Saw {
  constructor(freq, phase = 0) {
    this.f = freq;
    this.p = phase;
  }
  next(freq = this.f) {
    const dt = freq / SR;
    let v = 2 * this.p - 1;
    v -= blep(this.p, dt);
    this.p += dt;
    if (this.p >= 1) this.p -= 1;
    return v;
  }
}

// RBJ biquad
export class Biquad {
  constructor(type, f, q = 0.707) {
    this.type = type;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(f, q);
  }
  set(f, q = this.q) {
    this.q = q;
    const w = (2 * Math.PI * Math.min(f, SR * 0.49)) / SR;
    const cs = Math.cos(w);
    const a = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (this.type === "lp") {
      b0 = (1 - cs) / 2;
      b1 = 1 - cs;
      b2 = (1 - cs) / 2;
    } else if (this.type === "hp") {
      b0 = (1 + cs) / 2;
      b1 = -(1 + cs);
      b2 = (1 + cs) / 2;
    } else {
      b0 = a;
      b1 = 0;
      b2 = -a;
    }
    const a0 = 1 + a;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cs) / a0;
    this.a2 = (1 - a) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

export const pan = (v, p) => {
  // p in [-1, 1], equal power
  const a = ((p + 1) * Math.PI) / 4;
  return [v * Math.cos(a), v * Math.sin(a)];
};

// Feedback delay network reverb (8 lines, Householder mixing, damped)
export const fdnReverb = (inL, inR, { size = 1, decay = 2.4, damp = 0.35, pre = 0.02 } = {}) => {
  const n = inL.length;
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  const base = [1117, 1277, 1429, 1601, 1777, 1949, 2129, 2311].map((d) => Math.round(d * size * (SR / 44100)));
  const lines = base.map((d) => ({ buf: new Float32Array(d), i: 0, d, lp: 0 }));
  const g = base.map((d) => Math.pow(10, (-3 * d) / (decay * SR)));
  const preN = Math.round(pre * SR);
  const preBuf = new Float32Array(preN + 1);
  let pi = 0;
  const outs = new Float32Array(8);
  for (let s = 0; s < n; s++) {
    const x = (inL[s] + inR[s]) * 0.5;
    const xin = preBuf[pi];
    preBuf[pi] = x;
    pi = (pi + 1) % preBuf.length;
    let sum = 0;
    for (let k = 0; k < 8; k++) {
      const L = lines[k];
      const v = L.buf[L.i];
      L.lp = v * (1 - damp) + L.lp * damp;
      outs[k] = L.lp * g[k];
      sum += outs[k];
    }
    const h = (2 / 8) * sum;
    for (let k = 0; k < 8; k++) {
      const L = lines[k];
      L.buf[L.i] = outs[k] - h + xin * (k % 2 ? 0.5 : -0.5);
      L.i = (L.i + 1) % L.d;
    }
    outL[s] = outs[0] - outs[2] + outs[4] - outs[6];
    outR[s] = outs[1] - outs[3] + outs[5] - outs[7];
  }
  return [outL, outR];
};

// Ping-pong delay
export const pingPong = (inL, inR, time, feedback = 0.38, tone = 3500) => {
  const n = inL.length;
  const d = Math.round(time * SR);
  const bl = new Float32Array(d);
  const br = new Float32Array(d);
  const outL = new Float32Array(n);
  const outR = new Float32Array(n);
  const lpL = new Biquad("lp", tone);
  const lpR = new Biquad("lp", tone);
  let i = 0;
  for (let s = 0; s < n; s++) {
    const dl = bl[i];
    const dr = br[i];
    bl[i] = lpL.run((inL[s] + inR[s]) * 0.5 + dr * feedback);
    br[i] = lpR.run(dl * feedback);
    outL[s] = dl;
    outR[s] = dr;
    i = (i + 1) % d;
  }
  return [outL, outR];
};

export const env = (t, a, d, s, r, len) => {
  if (t < 0) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - ((t - a) / d) * (1 - s);
  if (t < len) return s;
  if (t < len + r) return s * (1 - (t - len) / r);
  return 0;
};
