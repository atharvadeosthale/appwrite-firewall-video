// Composes the Firewall trailer soundtrack: score + sound design, synced to frames.
// Usage: node scripts/audio/compose.mjs public/audio/trailer.wav
import fs from "node:fs";
import path from "node:path";
import {
  SR,
  Biquad,
  Saw,
  adsr,
  buffer,
  bus,
  db,
  freeverb,
  midi,
  pingPong,
  place,
  placeStereo,
  rng,
  smooth,
  writeWav,
} from "./dsp.mjs";

const FPS = 60;
const TOTAL_FRAMES = 3000;
const BEAT_F = 24; // frames per beat, 150 BPM
const BEAT = BEAT_F / FPS;
const N = Math.ceil((TOTAL_FRAMES / FPS + 0.2) * SR);
const T = (frame) => frame / FPS;

// Scene starts (global frames) — mirrors src/firewall/FirewallTrailer.tsx.
const S = { s1: 0, s2: 312, s3: 672, s4: 1104, s5: 1824, s6: 2112, s7: 2508, end: 3000 };

// Buses
const drums = bus(N);
const bass = bus(N);
const pads = bus(N);
const arps = bus(N);
const sfx = bus(N);
const verbSend = bus(N);
const kickTimes = [];

// ---------------------------------------------------------------- instruments

const kick = ({ f0 = 150, f1 = 52, pTau = 0.032, aTau = 0.2, dur = 0.5, click = 0.28, drive = 1.8, seed = 1 } = {}) => {
  const out = buffer(dur);
  const r = rng(seed);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / pTau);
    ph += (2 * Math.PI * f) / SR;
    let y = Math.sin(ph) * Math.exp(-t / aTau);
    if (t < 0.005) y += (r() * 2 - 1) * click * (1 - t / 0.005);
    const tail = Math.min(1, (dur - t) / 0.02);
    out[i] = (Math.tanh(y * drive) / Math.tanh(drive)) * tail;
  }
  return out;
};

const noiseBurst = ({ dur, seed = 1, type = "hp", f = 6000, q = 0.8, tau = 0.03, attack = 0.0005 }) => {
  const out = buffer(dur);
  const r = rng(seed);
  const flt = new Biquad(type, f, q);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.exp(-t / tau);
    out[i] = flt.process(r() * 2 - 1) * env;
  }
  return out;
};

const hat = (open, seed) =>
  noiseBurst({ dur: open ? 0.4 : 0.07, seed, type: "hp", f: open ? 7000 : 8500, q: 0.7, tau: open ? 0.11 : 0.016 });

const clap = (seed = 3) => {
  const dur = 0.45;
  const out = buffer(dur);
  const r = rng(seed);
  const bp = new Biquad("bp", 1500, 1.1);
  const hp = new Biquad("hp", 500, 0.7);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let env = 0;
    for (const o of [0, 0.011, 0.022]) if (t >= o) env += Math.exp(-(t - o) / (o === 0.022 ? 0.13 : 0.008));
    out[i] = hp.process(bp.process(r() * 2 - 1)) * env * 0.8;
  }
  return out;
};

const boom = ({ f0 = 70, f1 = 30, dur = 3, tau = 1.0, noise = 0.35, seed = 5, sweepTau = 0.35 } = {}) => {
  const out = buffer(dur);
  const r = rng(seed);
  const lp = new Biquad("lp", 900, 0.7);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / sweepTau);
    ph += (2 * Math.PI * f) / SR;
    const body = Math.sin(ph) * Math.exp(-t / tau);
    const n = lp.process(r() * 2 - 1) * Math.exp(-t / 0.18) * noise;
    const tail = Math.min(1, (dur - t) / 0.05);
    out[i] = Math.tanh((body + n) * 1.4) * tail;
  }
  return out;
};

/** Noise that swells up into a hit (reverse cymbal). */
const reverseSwell = ({ dur = 1, seed = 7, f = 4000 } = {}) => {
  const out = buffer(dur);
  const r = rng(seed);
  const hp = new Biquad("hp", f, 0.7);
  const bp = new Biquad("bp", 2000, 0.8);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const x = t / dur;
    if (i % 64 === 0) bp.set(800 + 7000 * x * x, 0.9);
    const env = Math.pow(x, 3) * Math.min(1, (dur - t) / 0.004);
    const n = r() * 2 - 1;
    out[i] = (hp.process(n) * 0.7 + bp.process(n) * 0.6) * env;
  }
  return out;
};

const riser = ({ dur = 2, f0 = 250, f1 = 7000, seed = 9, tone = 0.25, toneF0 = 110, toneF1 = 880 } = {}) => {
  const out = buffer(dur);
  const r = rng(seed);
  const bp = new Biquad("bp", f0, 3);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const x = t / dur;
    if (i % 64 === 0) bp.set(f0 * Math.pow(f1 / f0, x * x), 3);
    const f = toneF0 * Math.pow(toneF1 / toneF0, x * x);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.pow(x, 2.2) * Math.min(1, (dur - t) / 0.01);
    out[i] = (bp.process(r() * 2 - 1) * 1.4 + Math.sin(ph + Math.sin(t * 30) * 0.3) * tone) * env;
  }
  return out;
};

const whoosh = ({ dur = 0.6, f0 = 400, f1 = 3500, seed = 11, q = 1.4 } = {}) => {
  const out = buffer(dur);
  const r = rng(seed);
  const bp = new Biquad("bp", f0, q);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const x = t / dur;
    if (i % 32 === 0) bp.set(f0 * Math.pow(f1 / f0, Math.sin((x * Math.PI) / 2)), q);
    const env = Math.pow(Math.sin(Math.PI * x), 2);
    out[i] = bp.process(r() * 2 - 1) * env * 1.6;
  }
  return out;
};

const sineBlip = ({ f = 2000, dur = 0.08, tau = 0.02, drop = 0, harm = 0 }) => {
  const out = buffer(dur);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const ff = f * (1 - drop * (1 - Math.exp(-t / 0.03)));
    ph += (2 * Math.PI * ff) / SR;
    const env = Math.min(1, t / 0.0008) * Math.exp(-t / tau);
    out[i] = (Math.sin(ph) + harm * Math.sin(ph * 2)) * env;
  }
  return out;
};

const mouseClick = (seed = 13) => {
  const a = noiseBurst({ dur: 0.03, seed, type: "bp", f: 3600, q: 2.5, tau: 0.004 });
  const b = sineBlip({ f: 1900, dur: 0.03, tau: 0.004 });
  const out = buffer(0.09);
  for (let i = 0; i < a.length; i++) out[i] += a[i] * 1.2 + b[i] * 0.35;
  // release click
  const rel = Math.round(0.055 * SR);
  const c = noiseBurst({ dur: 0.02, seed: seed + 1, type: "bp", f: 4200, q: 2.5, tau: 0.003 });
  for (let i = 0; i < c.length && rel + i < out.length; i++) out[rel + i] += c[i] * 0.6;
  return out;
};

const keystroke = (seed) => {
  const r = rng(seed);
  const f = 1800 + r() * 1600;
  const a = noiseBurst({ dur: 0.04, seed, type: "bp", f, q: 1.8, tau: 0.006 });
  const b = sineBlip({ f: 170 + r() * 60, dur: 0.04, tau: 0.01 });
  const out = buffer(0.05);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * 1.1 + b[i] * 0.5;
  return out;
};

const bell = (freqs, dur = 1.8, bright = 1) => {
  const out = buffer(dur);
  const partials = [
    [1, 1, 0.9],
    [2.0, 0.35 * bright, 0.5],
    [3.01, 0.2 * bright, 0.3],
    [5.4, 0.08 * bright, 0.15],
  ];
  for (const f of freqs) {
    for (const [m, amp, tau] of partials) {
      let ph = 0;
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        ph += (2 * Math.PI * f * m) / SR;
        out[i] += Math.sin(ph) * amp * Math.min(1, t / 0.002) * Math.exp(-t / tau) * 0.3;
      }
    }
  }
  return out;
};

const thud = ({ f0 = 140, f1 = 48, dur = 0.35, seed = 17, crunch = 0.4 } = {}) => {
  const out = buffer(dur);
  const r = rng(seed);
  let ph = 0;
  let hold = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / 0.03);
    ph += (2 * Math.PI * f) / SR;
    if (i % 9 === 0) hold = r() * 2 - 1; // decimated crunch
    const y = Math.sin(ph) * Math.exp(-t / 0.09) + hold * crunch * Math.exp(-t / 0.03);
    out[i] = Math.tanh(y * 1.6) * Math.min(1, (dur - t) / 0.01);
  }
  return out;
};

const zip = ({ dur = 0.35, f0 = 900, f1 = 2400, amp = 1 } = {}) => {
  const out = buffer(dur);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const x = t / dur;
    const f = f0 * Math.pow(f1 / f0, x);
    ph += (2 * Math.PI * f) / SR;
    const env = Math.sin(Math.PI * x) ** 2;
    out[i] = Math.sin(ph) * env * 0.4 * amp;
  }
  return out;
};

const hum = ({ dur = 0.8, f = 520 } = {}) => {
  const out = buffer(dur);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * f) / SR;
    const trem = 0.6 + 0.4 * Math.sin(2 * Math.PI * 12 * t);
    const env = Math.min(1, t / 0.05) * Math.min(1, (dur - t) / 0.06);
    out[i] = (Math.sin(ph) * 0.6 + Math.sin(ph * 2.01) * 0.25 + Math.sin(ph * 3.02) * 0.1) * trem * env * 0.5;
  }
  return out;
};

/** Stereo detuned-saw pad. */
const padChord = (notes, dur, { attack = 1.2, release = 1.8, cutoff = 1300, q = 0.7, seed = 1, detune = 10, voices = 3, lfo = 0.13, bright = 0 } = {}) => {
  const len = dur + release + 0.05;
  const L = buffer(len), R = buffer(len);
  const r = rng(seed);
  notes.forEach((n, ni) => {
    for (let v = 0; v < voices; v++) {
      const cents = (v - (voices - 1) / 2) * detune + (r() - 0.5) * 3;
      const f = midi(n) * Math.pow(2, cents / 1200);
      const osc = new Saw(f, r());
      const pan = ((v / Math.max(1, voices - 1)) * 2 - 1) * 0.7 * (ni % 2 === 0 ? 1 : -1);
      const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
      for (let i = 0; i < L.length; i++) {
        const y = osc.next();
        L[i] += y * gl;
        R[i] += y * gr;
      }
    }
  });
  const fL = new Biquad("lp", cutoff, q), fR = new Biquad("lp", cutoff, q);
  const fL2 = new Biquad("lp", cutoff, q), fR2 = new Biquad("lp", cutoff, q);
  const norm = 1 / Math.sqrt(notes.length * voices);
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    if (i % 64 === 0) {
      const c = cutoff * (1 + 0.18 * Math.sin(2 * Math.PI * lfo * t)) * (1 + bright * smooth(t / (attack * 1.5)));
      fL.set(c, q); fR.set(c, q); fL2.set(c, q); fR2.set(c, q);
    }
    const env = adsr(t, dur, attack, 0.4, 0.85, release);
    L[i] = fL2.process(fL.process(L[i])) * env * norm;
    R[i] = fR2.process(fR.process(R[i])) * env * norm;
  }
  return { L, R };
};

const pluck = (note, { dur = 0.35, cutoff = 2600, seed = 1 } = {}) => {
  const out = buffer(dur);
  const r = rng(seed);
  const a = new Saw(midi(note), r());
  const b = new Saw(midi(note) * 1.004, r());
  const lp = new Biquad("lp", cutoff, 1.2);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if (i % 32 === 0) lp.set(260 + cutoff * Math.exp(-t / 0.07), 1.3);
    const y = (a.next() + b.next()) * 0.5;
    out[i] = lp.process(y) * Math.min(1, t / 0.002) * Math.exp(-t / 0.16) * Math.min(1, (dur - t) / 0.01);
  }
  return out;
};

// ---------------------------------------------------------------- helpers

const hit = (frame, sig, gain, pan = 0, verb = 0.2) => {
  place(sfx, T(frame), sig, gain, pan);
  if (verb > 0) place(verbSend, T(frame), sig, gain * verb, pan);
};

const drumHit = (frame, sig, gain, pan = 0, verb = 0) => {
  place(drums, T(frame), sig, gain, pan);
  if (verb > 0) place(verbSend, T(frame), sig, gain * verb, pan);
};

const addKick = (frame, gain = 1, opts = {}) => {
  drumHit(frame, kick(opts), gain);
  kickTimes.push(T(frame));
};

const padAt = (frame, notes, beats, opts = {}, gain = 1, verb = 0.35) => {
  const p = padChord(notes, beats * BEAT, opts);
  placeStereo(pads, T(frame), p.L, p.R, gain);
  placeStereo(verbSend, T(frame), p.L, p.R, gain * verb);
};

// Chord voicings (MIDI).
const CH = {
  Dm: { pad: [50, 53, 57, 62, 64], bass: 38, arp: [62, 65, 69, 74, 69, 65] },
  Bb: { pad: [46, 50, 53, 57, 62], bass: 34, arp: [58, 62, 65, 70, 65, 62] },
  F: { pad: [41, 48, 53, 57, 60, 64], bass: 41, arp: [60, 65, 69, 72, 69, 65] },
  C: { pad: [48, 52, 55, 60, 62], bass: 36, arp: [60, 64, 67, 72, 67, 64] },
  Gm: { pad: [43, 50, 55, 58, 62], bass: 43, arp: [62, 67, 70, 74, 70, 67] },
};

// ---------------------------------------------------------------- S1: hook

// Drone under the whole intro.
{
  const dur = T(330);
  const out = buffer(dur + 1);
  let p1 = 0, p2 = 0;
  const lp = new Biquad("lp", 400, 0.7);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    p1 += (2 * Math.PI * midi(38)) / SR;
    p2 += (2 * Math.PI * midi(45) * 1.002) / SR;
    const env = smooth(t / 2.5) * (1 - smooth((t - dur + 0.6) / 1.2));
    out[i] = lp.process(Math.sin(p1) + 0.5 * Math.sin(p2) + 0.25 * Math.sin(p1 * 2.003)) * env * 0.5;
  }
  place(pads, 0, out, 0.42, 0);
}

// Cursor blinks before typing.
hit(0, sineBlip({ f: 1400, dur: 0.05, tau: 0.01 }), 0.08, 0, 0.3);
hit(12, sineBlip({ f: 1400, dur: 0.05, tau: 0.01 }), 0.05, 0, 0.3);

// Typing "GET    /v1/account".
{
  const req = "GET    /v1/account";
  for (let k = 1; k <= req.length; k++) {
    if (req[k - 1] === " ") continue;
    hit(22 + k / 0.9, keystroke(100 + k), 0.32, (k % 3) * 0.1 - 0.1, 0.1);
  }
}

// Pull back reveal.
hit(46, whoosh({ dur: 1.4, f0: 3000, f1: 300, seed: 21, q: 0.9 }), 0.35, 0, 0.35);

// Log rows streaming in, accelerating.
{
  let t = 62;
  for (let k = 1; k < 200 && t < 300; k++) {
    const r = rng(500 + k);
    const g = 0.05 + 0.05 * smooth((t - 62) / 120);
    hit(t, sineBlip({ f: 2400 + r() * 2600, dur: 0.03, tau: 0.004 }), g, r() * 1.6 - 0.8, 0.05);
    t += 1.1 + 7.5 * Math.exp(-k / 8);
  }
}

// Beat words: Scrapers. Bots. Brute force. Floods.
[120, 144, 168, 192].forEach((f, i) => {
  addKick(f, 0.9, { f0: 170, f1: 46, aTau: 0.32, drive: 2.2, seed: 30 + i });
  hit(f, noiseBurst({ dur: 0.35, seed: 40 + i, type: "lp", f: 5000, q: 0.7, tau: 0.07 }), 0.28, 0, 0.5);
  hit(f, boom({ f0: 60, f1: 30, dur: 1.2, tau: 0.45, noise: 0.1, seed: 50 + i }), 0.35, 0, 0.2);
});
hit(96, reverseSwell({ dur: T(24), seed: 60 }), 0.3, 0, 0.3);

// Headline: warm swell.
padAt(212, CH.Dm.pad, 4.5, { attack: 0.8, release: 1.2, cutoff: 1100, seed: 70 }, 0.55, 0.45);
hit(216, boom({ f0: 55, f1: 30, dur: 2, tau: 0.8, noise: 0.05, seed: 71 }), 0.3, 0, 0.3);

// Streak burst into the 3D streams.
hit(262, riser({ dur: T(56), f0: 300, f1: 9000, seed: 80, tone: 0.2 }), 0.45, 0, 0.3);
hit(300, whoosh({ dur: 0.9, f0: 500, f1: 6000, seed: 81, q: 1 }), 0.55, 0, 0.4);
hit(S.s2, boom({ f0: 80, f1: 28, dur: 2.4, tau: 0.9, noise: 0.25, seed: 82 }), 0.5, 0, 0.4);

// ---------------------------------------------------------------- S2: reveal

// Pads through the reveal.
padAt(S.s2, CH.Dm.pad, 6, { attack: 0.6, release: 1.4, cutoff: 900, seed: 90 }, 0.5);
// Bricks land: a rapid percussive roll.
for (let k = 0; k < 40; k++) {
  const start = S.s2 + 36 + (k / 39) * 86 + 16;
  const r = rng(900 + k);
  const s = buffer(0.12);
  const a = sineBlip({ f: 380 + r() * 320, dur: 0.12, tau: 0.03, drop: 0.2, harm: 0.3 });
  const b = noiseBurst({ dur: 0.05, seed: 910 + k, type: "bp", f: 2600, q: 1.5, tau: 0.006 });
  for (let i = 0; i < s.length; i++) s[i] = a[i] * 0.8 + (b[i] || 0) * 0.7;
  hit(start, s, 0.18 + 0.1 * (k / 39), r() * 1.2 - 0.6, 0.25);
}
hit(408, reverseSwell({ dur: T(48), seed: 95 }), 0.45, 0, 0.4);
// Wall complete: the big reveal hit on beat.
const WALL = 456;
addKick(WALL, 1, { f0: 180, f1: 40, aTau: 0.45, drive: 2.5, seed: 96 });
hit(WALL, boom({ f0: 85, f1: 24, dur: 3.5, tau: 1.4, noise: 0.45, seed: 97 }), 0.75, 0, 0.6);
hit(WALL, noiseBurst({ dur: 1.2, seed: 98, type: "hp", f: 3000, q: 0.6, tau: 0.35 }), 0.18, 0, 0.9);
padAt(WALL, CH.F.pad, 4, { attack: 0.05, release: 2.5, cutoff: 2600, seed: 99, bright: 0.3 }, 0.6, 0.5);
// Scan sweep up the wall.
hit(WALL, zip({ dur: T(36), f0: 300, f1: 2400, amp: 0.8 }), 0.25, 0, 0.6);
// Shimmer.
hit(WALL + 6, bell([midi(77), midi(81), midi(84)], 3.5, 0.6), 0.22, 0.2, 0.9);
padAt(WALL + 96, CH.Bb.pad, 4, { attack: 0.8, release: 1.5, cutoff: 1500, seed: 100 }, 0.5);
padAt(WALL + 192, CH.C.pad, 2, { attack: 0.6, release: 1.0, cutoff: 1600, seed: 101 }, 0.5);
// Title.
hit(504, bell([midi(74), midi(81)], 2.5, 0.8), 0.2, -0.2, 0.9);
// Heartbeat pulse under the title.
for (let f = 504; f < 648; f += 48) addKick(f, 0.45, { f0: 110, f1: 42, aTau: 0.2, click: 0.05, seed: 102 + f });
// Push into the wall.
hit(612, riser({ dur: T(84), f0: 200, f1: 8000, seed: 110, tone: 0.3, toneF0: 90, toneF1: 720 }), 0.5, 0, 0.35);
hit(672, reverseSwell({ dur: T(24), seed: 111 }), 0.45, 0, 0.3);

// ---------------------------------------------------------------- groove (S3 → S6)

const GROOVE_START = S.s3 + 24; // 696, the flash
const TENSION = 2308;
const chordTrack = [
  [GROOVE_START, "Dm"],
  [GROOVE_START + 192, "Bb"],
  [GROOVE_START + 384, "F"],
  [GROOVE_START + 576, "C"],
  [GROOVE_START + 768, "Dm"],
  [GROOVE_START + 960, "Bb"],
  [GROOVE_START + 1152, "F"],
  [GROOVE_START + 1344, "C"],
  [GROOVE_START + 1536, "Dm"],
];
const chordAt = (f) => {
  let c = "Dm";
  for (const [cf, name] of chordTrack) if (f >= cf) c = name;
  return c;
};

hit(GROOVE_START, boom({ f0: 75, f1: 30, dur: 2.2, tau: 0.8, noise: 0.3, seed: 120 }), 0.5, 0, 0.5);
chordTrack.forEach(([f, name], i) => {
  const end = Math.min(f + 192, TENSION);
  const beats = (end - f) / BEAT_F;
  if (beats <= 0) return;
  padAt(f, CH[name].pad, beats, { attack: 0.4, release: 1.0, cutoff: 2200 + (f > S.s4 ? 900 : 0), seed: 130 + i }, 0.62);
});

for (let f = GROOVE_START; f < TENSION; f += BEAT_F) {
  const beat = Math.round((f - GROOVE_START) / BEAT_F);
  const inS3 = f < S.s4;
  addKick(f, inS3 ? 0.48 : 0.6, { seed: 200 + beat });
  drumHit(f + BEAT_F / 2, hat(true, 300 + beat), inS3 ? 0.13 : 0.17, 0.25);
  for (let s = 0; s < 4; s++) {
    if (s === 2) continue;
    const vel = s === 0 ? 0.12 : 0.085;
    drumHit(f + (s * BEAT_F) / 4, hat(false, 400 + beat * 4 + s), inS3 ? vel * 0.8 : vel, -0.3);
    // Shaker layer for air.
    drumHit(f + (s * BEAT_F) / 4 + 1, noiseBurst({ dur: 0.05, seed: 450 + beat * 4 + s, type: "hp", f: 9000, q: 0.6, tau: 0.02, attack: 0.004 }), 0.05, 0.35);
  }
  if (!inS3 && (beat % 4 === 1 || beat % 4 === 3)) drumHit(f, clap(500 + beat), 0.36, 0, 0.25);
  // Bass 8ths.
  const root = CH[chordAt(f)].bass;
  for (let e = 0; e < 2; e++) {
    const t0 = f + (e * BEAT_F) / 2;
    const d = BEAT / 2;
    const out = buffer(d);
    let ph = 0;
    const lp = new Biquad("lp", 380, 0.9);
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      ph += (2 * Math.PI * midi(root)) / SR;
      const env = Math.min(1, t / 0.004) * Math.exp(-t / 0.14) * Math.min(1, (d - t) / 0.01);
      out[i] = lp.process(Math.tanh((Math.sin(ph) + 0.35 * Math.sin(ph * 2)) * 1.4)) * env;
    }
    place(bass, T(t0), out, e === 0 ? 0.3 : 0.22, 0);
  }
}

// Arp from S4 until the tension.
{
  const arpL = new Float32Array(N), arpR = new Float32Array(N);
  const tmp = { L: arpL, R: arpR };
  let k = 0;
  for (let f = S.s4; f < TENSION; f += BEAT_F / 4, k++) {
    const pat = CH[chordAt(f)].arp;
    const note = pat[k % pat.length];
    const build = smooth((f - S.s4) / 400);
    place(tmp, T(f), pluck(note, { seed: 600 + k, cutoff: 2600 + 2400 * build }), 0.12 + 0.07 * build, k % 2 ? 0.35 : -0.35);
  }
  const d = pingPong(arpL, arpR, BEAT * 0.75, 0.35, 0.35, 4000);
  for (let i = 0; i < N; i++) {
    arps.L[i] += d.L[i];
    arps.R[i] += d.R[i];
    verbSend.L[i] += d.L[i] * 0.2;
    verbSend.R[i] += d.R[i] * 0.2;
  }
}

// ---------------------------------------------------------------- S3 UI sound design

const s3 = (f) => S.s3 + f;
[44, 122, 184, 300].forEach((f, i) => hit(s3(f), mouseClick(700 + i), 0.5, 0.15, 0.08));
for (let k = 0; k < 10; k++) hit(s3(54 + k * 5.5), sineBlip({ f: 2600, dur: 0.03, tau: 0.004 }), 0.07, 0.2, 0.05);
hit(s3(110), zip({ dur: 0.18, f0: 3000, f1: 1800, amp: 0.4 }), 0.12, 0.2, 0.1);
hit(s3(130), sineBlip({ f: 1800, dur: 0.05, tau: 0.01 }), 0.1, 0.2, 0.1);
for (let k = 1; k <= 20; k++) hit(s3(138 + k * 1.4), keystroke(720 + k), 0.26, 0.1, 0.05);
for (let k = 0; k < 6; k++) hit(s3(146 + k * 6), sineBlip({ f: 900 + k * 120, dur: 0.06, tau: 0.015 }), 0.06, 0.4, 0.2);
hit(s3(186), whoosh({ dur: 0.35, f0: 800, f1: 2500, seed: 740, q: 1.2 }), 0.15, 0.1, 0.2);
for (let k = 0; k < 6; k++) hit(s3(216 + k * 6), sineBlip({ f: 1500 - k * 110, dur: 0.06, tau: 0.015 }), 0.06, 0.4, 0.2);
for (let k = 0; k < 5; k++) hit(s3(312 + k * 16), sineBlip({ f: 2200, dur: 0.04, tau: 0.006 }), 0.08, 0.2, 0.05);
// Handoff: the action list flies out.
hit(s3(404), whoosh({ dur: 1.1, f0: 300, f1: 4000, seed: 750, q: 1 }), 0.3, -0.2, 0.3);

// ---------------------------------------------------------------- S4 action vignettes

const A = [0, 1, 2, 3, 4].map((i) => S.s4 + 24 + i * 144);
// Chapter swishes as the list moves.
A.slice(1).forEach((f, i) => hit(f - 14, whoosh({ dur: 0.5, f0: 700, f1: 2600, seed: 800 + i, q: 1.3 }), 0.14, -0.4, 0.2));
// Deny
[24, 72, 96].forEach((s, i) => {
  hit(A[0] + s, zip({ dur: T(24), f0: 700, f1: 1400, amp: 0.6 }), 0.08, -0.1, 0.05);
  hit(A[0] + s + 24, thud({ seed: 810 + i, crunch: 0.5 }), i === 0 ? 0.55 : 0.4, 0.15, 0.25);
});
// Bypass
hit(A[1] + 22, whoosh({ dur: T(50), f0: 500, f1: 2800, seed: 820, q: 1.6 }), 0.22, 0.1, 0.3);
hit(A[1] + 72, bell([midi(76), midi(83)], 1.6, 0.7), 0.16, 0.3, 0.5);
// Challenge
hit(A[2] + 24, zip({ dur: T(24), f0: 700, f1: 1400, amp: 0.6 }), 0.08, -0.1, 0.05);
hit(A[2] + 48, hum({ dur: T(48), f: 520 }), 0.14, 0.2, 0.3);
hit(A[2] + 96, bell([midi(74), midi(79), midi(86)], 1.8, 0.8), 0.2, 0.2, 0.5);
hit(A[2] + 100, zip({ dur: T(24), f0: 1000, f1: 2000, amp: 0.6 }), 0.08, 0.2, 0.1);
// Rate limit: counting up, then blocked.
for (let k = 0; k < 10; k++) hit(A[3] + 24 + k * 6, sineBlip({ f: midi(74 + [0, 3, 5, 7, 10, 12, 15, 17, 19, 22][k]), dur: 0.08, tau: 0.02 }), 0.1, 0.15, 0.15);
[84, 90, 96].forEach((a, i) => hit(A[3] + a, thud({ f0: 110, f1: 40, seed: 830 + i, crunch: 0.7 }), 0.4, 0.1, 0.2));
// Redirect
hit(A[4] + 24, zip({ dur: T(24), f0: 700, f1: 1400, amp: 0.6 }), 0.08, -0.1, 0.05);
hit(A[4] + 48, zip({ dur: T(36), f0: 1800, f1: 600, amp: 0.9 }), 0.14, 0.3, 0.3);
hit(A[4] + 84, sineBlip({ f: 1200, dur: 0.12, tau: 0.04, harm: 0.3 }), 0.12, 0.4, 0.3);

// ---------------------------------------------------------------- S5 use cases

for (let i = 0; i < 12; i++) {
  const row = Math.floor(i / 4), col = i % 4;
  hit(S.s5 + 4 + (row + col) * 5 + 8, sineBlip({ f: 3000 + i * 90, dur: 0.03, tau: 0.005 }), 0.05, col * 0.3 - 0.45, 0.1);
}
{
  const pent = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89];
  for (let k = 0; k < 12; k++) hit(S.s5 + 72 + k * 12, bell([midi(pent[k])], 0.9, 0.5), 0.09, (k % 3) * 0.4 - 0.4, 0.4);
}
// Push through the "Bots on forms" card into the firewall page.
hit(S.s5 + 240, riser({ dur: T(52), f0: 300, f1: 5000, seed: 849, tone: 0.12, toneF0: 220, toneF1: 880 }), 0.3, 0, 0.3);
hit(S.s5 + 250, whoosh({ dur: 0.95, f0: 250, f1: 3200, seed: 850, q: 1 }), 0.3, 0, 0.35);
hit(S.s5 + 292, boom({ f0: 75, f1: 32, dur: 2, tau: 0.7, noise: 0.3, seed: 851 }), 0.42, 0, 0.5);

// ---------------------------------------------------------------- S6 overview + attack

hit(S.s6 + 16, zip({ dur: T(110), f0: 300, f1: 900, amp: 0.4 }), 0.08, 0.2, 0.4);
// Tension: the groove drops, alarm pulses rise.
{
  const start = TENSION;
  const dur = T(2496 - start + 24);
  const out = buffer(dur);
  const a = new Saw(midi(50)), b = new Saw(midi(51));
  const lp = new Biquad("lp", 600, 2);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if (i % 64 === 0) lp.set(500 + 2200 * smooth(t / dur), 3);
    const pulse = 0.5 + 0.5 * Math.sign(Math.sin(2 * Math.PI * 6.25 * t));
    const env = smooth(t / 0.3) * Math.min(1, (dur - t) / 0.05);
    out[i] = lp.process((a.next() + b.next()) * 0.5) * env * (0.5 + 0.5 * pulse);
  }
  place(pads, T(start), out, 0.22, 0);
  hit(start, riser({ dur, f0: 200, f1: 6000, seed: 860, tone: 0.15 }), 0.3, 0, 0.3);
  // Heartbeat kicks under the tension.
  for (let f = 2328; f < 2496; f += BEAT_F) addKick(f, 0.6, { f0: 120, f1: 40, aTau: 0.22, seed: 870 + f });
}
// "Under attack?"
hit(2328, boom({ f0: 90, f1: 26, dur: 2.5, tau: 1.0, noise: 0.5, seed: 880 }), 0.6, 0, 0.5);
hit(2328, noiseBurst({ dur: 0.8, seed: 881, type: "hp", f: 2500, q: 0.6, tau: 0.2 }), 0.2, 0, 0.8);
hit(2304, reverseSwell({ dur: T(24), seed: 882 }), 0.35, 0, 0.4);
hit(S.s6 + 312, mouseClick(883), 0.55, 0.2, 0.08);
hit(S.s6 + 320, whoosh({ dur: 0.3, f0: 1500, f1: 3500, seed: 884, q: 1.5 }), 0.1, 0, 0.2);
hit(S.s6 + 384, mouseClick(885), 0.6, 0.15, 0.08);

// ---------------------------------------------------------------- S7 finale

const SHOCK = S.s7 + 12; // 2520
hit(2496, reverseSwell({ dur: T(24), seed: 900 }), 0.6, 0, 0.5);
{
  // Flood rumble.
  const out = buffer(T(24) + 0.3);
  const r = rng(901);
  const lp = new Biquad("lp", 180, 0.8);
  for (let i = 0; i < out.length; i++) out[i] = lp.process(r() * 2 - 1) * smooth(i / out.length / 0.3) * 1.5;
  hit(S.s7, out, 0.3, 0, 0.1);
}
addKick(SHOCK, 1, { f0: 200, f1: 36, aTau: 0.6, drive: 3, seed: 902 });
hit(SHOCK, boom({ f0: 100, f1: 20, dur: 5, tau: 1.8, noise: 0.6, seed: 903, sweepTau: 0.5 }), 0.9, 0, 0.7);
hit(SHOCK, whoosh({ dur: 1.4, f0: 6000, f1: 400, seed: 904, q: 0.8 }), 0.35, -0.3, 0.6);
hit(SHOCK, noiseBurst({ dur: 2, seed: 905, type: "hp", f: 4000, q: 0.5, tau: 0.6 }), 0.14, 0.3, 1);
hit(SHOCK + 4, bell([midi(77), midi(81), midi(84), midi(89)], 4, 0.9), 0.24, 0, 1);
padAt(SHOCK, CH.F.pad, 8, { attack: 0.05, release: 2, cutoff: 3000, seed: 906, bright: 0.2 }, 0.6, 0.55);
padAt(SHOCK + 192, CH.C.pad, 2, { attack: 0.4, release: 1.4, cutoff: 2200, seed: 907 }, 0.5, 0.5);
// Half-time payoff groove.
for (let f = SHOCK + 48; f < 2760; f += BEAT_F) {
  const beat = Math.round((f - SHOCK) / BEAT_F);
  if (beat % 4 === 0) addKick(f, 0.85, { seed: 910 + beat });
  if (beat % 4 === 2) drumHit(f, clap(920 + beat), 0.34, 0, 0.5);
  drumHit(f + BEAT_F / 2, hat(true, 930 + beat), 0.07, 0.25);
  const root = CH[f < SHOCK + 192 ? "F" : "C"].bass;
  const d = BEAT;
  const out = buffer(d);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * midi(root)) / SR;
    out[i] = Math.tanh(Math.sin(ph) * 1.3) * Math.min(1, t / 0.005) * Math.exp(-t / 0.3);
  }
  place(bass, T(f), out, 0.45, 0);
}
hit(SHOCK + 12, sineBlip({ f: 880, dur: 0.4, tau: 0.12, harm: 0.4 }), 0.1, 0, 0.6);
// Outro.
const OUT = S.s7 + 252; // 2760
hit(OUT - 24, reverseSwell({ dur: T(24), seed: 940 }), 0.3, 0, 0.5);
padAt(OUT, CH.Bb.pad, 4, { attack: 0.3, release: 2, cutoff: 1600, seed: 941 }, 0.5, 0.6);
const TITLE = OUT + 24; // 2784
hit(TITLE, boom({ f0: 70, f1: 28, dur: 4, tau: 1.6, noise: 0.2, seed: 942 }), 0.55, 0, 0.6);
hit(TITLE, bell([midi(74), midi(81), midi(86)], 5, 0.9), 0.26, 0, 1);
padAt(OUT + 96, CH.F.pad, 6.5, { attack: 1, release: 1.2, cutoff: 1800, seed: 943 }, 0.55, 0.6);
hit(OUT + 120, bell([midi(89)], 3, 0.6), 0.12, 0.3, 1);

// ---------------------------------------------------------------- mix

// Sidechain envelope from every kick.
const duck = new Float32Array(N).fill(1);
for (const tk of kickTimes) {
  const s = Math.round(tk * SR);
  for (let i = 0; i < SR * 0.35 && s + i < N; i++) {
    const g = 1 - 0.55 * Math.exp(-i / SR / 0.11);
    if (s + i >= 0) duck[s + i] = Math.min(duck[s + i], g);
  }
}

const verb = freeverb(verbSend.L, verbSend.R, { room: 0.86, damp: 0.3, wet: 1, width: 1 });
const outL = new Float32Array(N), outR = new Float32Array(N);
const hpL = new Biquad("hp", 34, 0.7), hpR = new Biquad("hp", 34, 0.7);
const lsL = new Biquad("lowshelf", 110, 0.7, -5), lsR = new Biquad("lowshelf", 110, 0.7, -5);
const hsL = new Biquad("highshelf", 5000, 0.7, 4), hsR = new Biquad("highshelf", 5000, 0.7, 4);
for (let i = 0; i < N; i++) {
  const d = duck[i];
  let l = drums.L[i] * 0.9 + bass.L[i] * d * 0.9 + pads.L[i] * (0.4 + 0.6 * d) + arps.L[i] * d + sfx.L[i] + verb.L[i] * 0.9;
  let r = drums.R[i] * 0.9 + bass.R[i] * d * 0.9 + pads.R[i] * (0.4 + 0.6 * d) + arps.R[i] * d + sfx.R[i] + verb.R[i] * 0.9;
  outL[i] = hsL.process(lsL.process(hpL.process(l)));
  outR[i] = hsR.process(lsR.process(hpR.process(r)));
}

// Lookahead limiter.
const look = Math.round(0.004 * SR);
const ceiling = db(-1.2);
const rel = Math.exp(-1 / (0.12 * SR));
let gain = 1;
const peak = new Float32Array(N);
for (let i = 0; i < N; i++) peak[i] = Math.max(Math.abs(outL[i]), Math.abs(outR[i]));
// Pre-gain so the loudest sections sit near the ceiling.
let maxPeak = 0;
for (let i = 0; i < N; i++) maxPeak = Math.max(maxPeak, peak[i]);
const pre = (db(-0.5) / Math.max(1e-6, maxPeak)) * 1.25;
const finalL = new Float32Array(N), finalR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  let p = 0;
  for (let k = 0; k < look && i + k < N; k += 4) p = Math.max(p, peak[i + k] * pre);
  const target = p > ceiling ? ceiling / p : 1;
  gain = target < gain ? target : target + (gain - target) * rel;
  finalL[i] = Math.tanh((outL[i] * pre * gain) / 0.98) * 0.98;
  finalR[i] = Math.tanh((outR[i] * pre * gain) / 0.98) * 0.98;
}
// Fade the very end.
const fadeStart = Math.round(T(2952) * SR);
for (let i = fadeStart; i < N; i++) {
  const g = Math.max(0, 1 - (i - fadeStart) / (T(48) * SR));
  finalL[i] *= g;
  finalR[i] *= g;
}

const outPath = process.argv[2] ?? "public/audio/trailer.wav";
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, writeWav(finalL, finalR));
let rms = 0;
for (let i = 0; i < N; i++) rms += finalL[i] * finalL[i];
console.log(`wrote ${outPath} (${(N / SR).toFixed(2)}s) pre=${pre.toFixed(2)} rms=${(20 * Math.log10(Math.sqrt(rms / N))).toFixed(1)} dBFS`);
