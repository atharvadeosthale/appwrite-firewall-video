// Email Triggers soundtrack: 120 BPM, F minor, 32 bars (64 s), cut on the
// same bar grid as the picture, with sound effects on every on-screen event.
//
//   node scripts/email-triggers/audio/compose.mjs
//
// Writes public/email-triggers/soundtrack.wav (48 kHz, 16-bit stereo).
import fs from "node:fs";
import path from "node:path";
import { Biquad, Bus, env, fdnReverb, note, noise, pan, pingPong, reseed, Saw, SR } from "./synth.mjs";

const FPS = 60;
const BPM = 120;
const BEAT = 60 / BPM; // 0.5 s
const BAR = BEAT * 4; // 2 s
const LEN = 64 + 1.5;
const f = (frame) => frame / FPS; // frame -> seconds
const bar = (b) => b * BAR;

// Scene starts (frames)
const S = { s1: 0, s2: 480, s3: 720, s4: 1200, s5: 1920, s6: 2400, s7: 2640, s8: 3120, s9: 3480 };

const drums = new Bus(LEN);
const bass = new Bus(LEN);
const music = new Bus(LEN);
const sfx = new Bus(LEN);
const verbSend = new Bus(LEN);
const delaySend = new Bus(LEN);
const kicks = [];

const put = (bus, t0, len, fn, p = 0, send = 0, dsend = 0) => {
  const i0 = Math.round(t0 * SR);
  const n = Math.round(len * SR);
  for (let k = 0; k < n; k++) {
    const v = fn(k / SR);
    if (v === 0) continue;
    const [l, r] = pan(v, typeof p === "function" ? p(k / SR) : p);
    bus.add(i0 + k, l, r);
    if (send) verbSend.add(i0 + k, l * send, r * send);
    if (dsend) delaySend.add(i0 + k, l * dsend, r * dsend);
  }
};

// ---------------------------------------------------------------------------
// Instruments
const kick = (t0, gain = 1) => {
  kicks.push(t0);
  let ph = 0;
  const hp = new Biquad("hp", 2500);
  put(drums, t0, 0.5, (t) => {
    const fr = 46 + 120 * Math.exp(-t * 38);
    ph += (2 * Math.PI * fr) / SR;
    const body = Math.sin(ph) * Math.exp(-t * 6.5);
    const click = hp.run(noise()) * Math.exp(-t * 260) * 0.6;
    return Math.tanh((body * 1.4 + click) * 1.3) * 0.9 * gain;
  });
};

const clap = (t0, gain = 1) => {
  const bp = new Biquad("bp", 1350, 0.9);
  put(
    drums,
    t0,
    0.35,
    (t) => {
      const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 190) : 0), 0);
      const tail = t > 0.022 ? Math.exp(-(t - 0.022) * 16) * 0.55 : 0;
      return bp.run(noise()) * (bursts + tail) * 1.6 * gain;
    },
    0,
    0.35,
  );
};

const snare = (t0, gain = 1) => {
  const bp = new Biquad("bp", 2100, 0.7);
  let ph = 0;
  put(
    drums,
    t0,
    0.4,
    (t) => {
      ph += (2 * Math.PI * (185 + 60 * Math.exp(-t * 40))) / SR;
      return (bp.run(noise()) * Math.exp(-t * 13) * 1.4 + Math.sin(ph) * Math.exp(-t * 20) * 0.6) * gain;
    },
    0,
    0.3,
  );
};

const hat = (t0, open = false, gain = 1, p = 0) => {
  const hp = new Biquad("hp", 7600, 0.8);
  const d = open ? 9 : 55;
  put(drums, t0, open ? 0.45 : 0.08, (t) => hp.run(noise()) * Math.exp(-t * d) * 0.32 * gain, p);
};

const bassNote = (t0, len, freq, gain = 1) => {
  const saw = new Saw(freq);
  const lp = new Biquad("lp", 800, 1.1);
  let sub = 0;
  put(bass, t0, len + 0.1, (t) => {
    lp.set(180 + 900 * Math.exp(-t * 11), 1.1);
    sub += (2 * Math.PI * freq) / 2 / SR;
    const a = env(t, 0.004, 0.14, 0.72, 0.07, len);
    return (lp.run(saw.next()) * 0.55 + Math.sin(sub) * 0.65) * a * 0.62 * gain;
  });
};

const pluck = (t0, freq, gain = 1, p = 0) => {
  const s1 = new Saw(freq, 0.1);
  const s2 = new Saw(freq * 1.006, 0.6);
  const lp = new Biquad("lp", 3000, 1.2);
  put(
    music,
    t0,
    0.55,
    (t) => {
      lp.set(500 + 5200 * Math.exp(-t * 16), 1.2);
      return lp.run((s1.next() + s2.next()) * 0.5) * Math.exp(-t * 7.5) * env(t, 0.002, 0.05, 1, 0, 1) * 0.3 * gain;
    },
    p,
    0.25,
    0.35,
  );
};

const padChord = (t0, len, freqs, gain = 1, bright = 1) => {
  freqs.forEach((fr, vi) => {
    const voices = [-0.14, -0.05, 0.05, 0.14].map((dt, k) => new Saw(fr * Math.pow(2, dt / 12), (vi * 0.37 + k * 0.23) % 1));
    const lp = new Biquad("lp", 1600 * bright, 0.6);
    put(
      music,
      t0,
      len + 1.4,
      (t) => {
        let v = 0;
        for (const o of voices) v += o.next();
        const a = env(t, 0.5, 0.4, 0.85, 1.3, len);
        return lp.run(v / voices.length) * a * 0.11 * gain;
      },
      (vi / (freqs.length - 1) - 0.5) * 0.7,
      0.55,
    );
  });
};

const bell = (t0, freq, gain = 1, p = 0, decay = 3.2, ratio = 3.5) => {
  let pc = 0;
  let pm = 0;
  put(
    sfx,
    t0,
    1.6,
    (t) => {
      pm += (2 * Math.PI * freq * ratio) / SR;
      const idx = 2.6 * Math.exp(-t * 9) + 0.3;
      pc += (2 * Math.PI * freq) / SR;
      return Math.sin(pc + idx * Math.sin(pm)) * Math.exp(-t * decay) * env(t, 0.002, 0.02, 1, 0, 2) * 0.22 * gain;
    },
    p,
    0.35,
    0.2,
  );
};

const impact = (t0, gain = 1, len = 2.2) => {
  let ph = 0;
  const lp = new Biquad("lp", 2600);
  put(
    sfx,
    t0,
    len,
    (t) => {
      ph += (2 * Math.PI * (30 + 38 * Math.exp(-t * 5))) / SR;
      const sub = Math.sin(ph) * Math.exp(-t * 2.2) * 0.95;
      const crack = lp.run(noise()) * Math.exp(-t * 9) * 0.7;
      return Math.tanh((sub + crack) * 1.2) * gain;
    },
    0,
    0.5,
  );
};

const riser = (t0, len, gain = 1, fromF = 300, toF = 6000) => {
  const bp = new Biquad("bp", fromF, 1.4);
  const saw = new Saw(110);
  put(
    sfx,
    t0,
    len,
    (t) => {
      const u = t / len;
      bp.set(fromF * Math.pow(toF / fromF, u * u), 1.4);
      const a = Math.pow(u, 2.2);
      return (bp.run(noise()) * 0.9 + saw.next(110 * Math.pow(2, u * 2)) * 0.12) * a * 0.55 * gain;
    },
    (t) => Math.sin(t * 5) * 0.3,
    0.3,
  );
};

const whoosh = (t0, len, gain = 1, p0 = -0.6, p1 = 0.6, lo = 350, hi = 2600) => {
  const bp = new Biquad("bp", lo, 0.9);
  put(
    sfx,
    t0,
    len,
    (t) => {
      const u = t / len;
      bp.set(lo + (hi - lo) * Math.sin(Math.PI * Math.min(1, u * 1.1)), 0.9);
      return bp.run(noise()) * Math.pow(Math.sin(Math.PI * u), 1.6) * 0.75 * gain;
    },
    (t) => p0 + (p1 - p0) * (t / len),
    0.18,
  );
};

const suck = (t0, len, gain = 1) => {
  const lp = new Biquad("lp", 400, 0.8);
  put(
    sfx,
    t0,
    len,
    (t) => {
      const u = t / len;
      lp.set(300 + 5000 * u * u, 0.8);
      return lp.run(noise()) * Math.pow(u, 3) * 0.9 * gain;
    },
    0,
    0.2,
  );
};

const click = (t0, gain = 1, p = 0, pitch = 1) => {
  const hp = new Biquad("hp", 1800);
  let ph = 0;
  put(sfx, t0, 0.05, (t) => {
    ph += (2 * Math.PI * 2100 * pitch) / SR;
    return (hp.run(noise()) * Math.exp(-t * 900) * 0.5 + Math.sin(ph) * Math.exp(-t * 180) * 0.25) * gain;
  }, p);
};

const blip = (t0, freq, gain = 1, p = 0, len = 0.09) => {
  let ph = 0;
  put(
    sfx,
    t0,
    len,
    (t) => {
      ph += (2 * Math.PI * freq * (1 + 0.15 * Math.exp(-t * 60))) / SR;
      return Math.sin(ph) * Math.exp(-t * (6 / len)) * env(t, 0.002, 0.01, 1, 0, 1) * 0.22 * gain;
    },
    p,
    0.12,
    0.1,
  );
};

const tick = (t0, gain = 1, p = 0) => {
  let ph = 0;
  put(sfx, t0, 0.03, (t) => {
    ph += (2 * Math.PI * 2600) / SR;
    return (Math.sign(Math.sin(ph)) * 0.5) * Math.exp(-t * 200) * 0.18 * gain;
  }, p);
};

const thump = (t0, gain = 1) => {
  let ph = 0;
  put(sfx, t0, 0.35, (t) => {
    ph += (2 * Math.PI * (60 + 90 * Math.exp(-t * 30))) / SR;
    return Math.sin(ph) * Math.exp(-t * 11) * 0.7 * gain;
  }, 0, 0.1);
};

const chime = (t0, gain = 1) => {
  ["Ab5", "C6", "Eb6"].forEach((n, i) => bell(t0 + i * 0.055, note(n), 0.8 * gain, (i - 1) * 0.3, 3.8, 2));
};

const zip = (t0, gain = 1, up = 1) => {
  const saw = new Saw(400);
  const bp = new Biquad("bp", 900, 2);
  put(sfx, t0, 0.22, (t) => {
    const u = t / 0.22;
    const fr = up > 0 ? 380 * Math.pow(4, u) : 1500 * Math.pow(0.25, u);
    bp.set(fr * 1.5, 2);
    return bp.run(saw.next(fr)) * Math.sin(Math.PI * u) * 0.5 * gain;
  }, (t) => -0.4 + t * 3.6, 0.15);
};

const rip = (t0, gain = 1) => {
  // the hostname tearing in two: diverging saws + downward noise sweep
  const a = new Saw(220);
  const b = new Saw(220);
  const bp = new Biquad("bp", 4000, 1.2);
  const lpa = new Biquad("lp", 3000);
  const lpb = new Biquad("lp", 3000);
  put(sfx, t0, 0.9, (t) => {
    const u = t / 0.9;
    bp.set(5000 * Math.pow(0.08, u), 1.2);
    return bp.run(noise()) * Math.exp(-t * 4) * 0.9 * gain;
  }, 0, 0.35);
  put(sfx, t0, 1.1, (t) => lpa.run(a.next(220 * Math.pow(2, t * 1.4))) * Math.exp(-t * 3) * 0.18 * gain, -0.85, 0.3);
  put(sfx, t0, 1.1, (t) => lpb.run(b.next(220 * Math.pow(2, -t * 1.4))) * Math.exp(-t * 3) * 0.18 * gain, 0.85, 0.3);
  impact(t0, 0.55 * gain, 1.6);
};

const typing = (t0, t1, cps, gain = 1) => {
  reseed(Math.round(t0 * 1000));
  for (let t = t0; t < t1; t += 1 / cps) {
    const jitter = (noise() * 0.5 + 0.5) * 0.012;
    click(t + jitter, 0.35 * gain * (0.7 + 0.3 * Math.abs(noise())), noise() * 0.3, 0.8 + Math.abs(noise()) * 0.5);
  }
};

// ---------------------------------------------------------------------------
// Harmony (F minor): Fm – Db – Ab – Eb, one bar each
const CHORDS = [
  { root: "F", pad: ["F3", "Ab3", "C4", "Eb4"], bass: "F2", arp: ["F4", "Ab4", "C5", "Eb5", "F5", "C5", "Ab4", "Eb4"] },
  { root: "Db", pad: ["Db3", "F3", "Ab3", "C4"], bass: "Db2", arp: ["Db4", "F4", "Ab4", "C5", "Db5", "Ab4", "F4", "C4"] },
  { root: "Ab", pad: ["Ab2", "C3", "Eb3", "G3"], bass: "Ab1", arp: ["Ab4", "C5", "Eb5", "G5", "Ab5", "Eb5", "C5", "G4"] },
  { root: "Eb", pad: ["Eb3", "G3", "Bb3", "Db4"], bass: "Eb2", arp: ["Eb4", "G4", "Bb4", "Db5", "Eb5", "Bb4", "G4", "Db4"] },
];
const chordAt = (b) => CHORDS[((b % 4) + 4) % 4];

// Section plan per bar: which layers play
const PLAN = [];
for (let b = 0; b < 32; b++) {
  const p = { pad: 0, kick: "none", clap: false, hats: 0, bass: false, arp: 0, bright: 1 };
  if (b <= 1) Object.assign(p, { pad: 0.7, bright: 0.55 + b * 0.15 });
  else if (b <= 3) Object.assign(p, { pad: 0.8, kick: "pulse", bass: "pulse", bright: 0.8, hats: 0.35 });
  else if (b <= 5) Object.assign(p, { pad: 1.1, kick: "half", arp: b === 5 ? 0.6 : 0, bright: 1.1, hats: b === 5 ? 0.5 : 0 });
  else if (b <= 7) Object.assign(p, { pad: 0.8, kick: "four", clap: b === 7, hats: 0.5, bass: true, arp: 0.7, bright: 0.9 });
  else if (b <= 15) Object.assign(p, { pad: 0.8, kick: "four", clap: true, hats: 1, bass: true, arp: 1, bright: 1 });
  else if (b <= 18) Object.assign(p, { pad: 1, kick: "four", clap: false, hats: 0.45, bass: true, arp: 0.6, bright: 0.75 });
  else if (b <= 21) Object.assign(p, { pad: 0.8, kick: "four", clap: true, hats: 1, bass: true, arp: 1, bright: 1 });
  else if (b <= 23) Object.assign(p, { pad: 0.9, kick: b === 22 ? "none" : "pulse", hats: 0.5, bass: "pulse", arp: 0.5, bright: 0.75 });
  else if (b <= 28) Object.assign(p, { pad: 0.9, kick: "four", clap: true, hats: 1.1, bass: true, arp: 1.1, bright: 1.15 });
  else Object.assign(p, { pad: 1.2, kick: "none", arp: 0, bright: 1.2 });
  PLAN.push(p);
}

for (let b = 0; b < 32; b++) {
  const p = PLAN[b];
  const t = bar(b);
  // Intro and outro use their own harmony below
  const c = b < 4 ? CHORDS[0] : chordAt(b - 4);
  if (p.pad && b < 29) padChord(t, BAR, c.pad.map(note), p.pad, p.bright);
  if (p.kick === "four") for (let q = 0; q < 4; q++) kick(t + q * BEAT, q === 0 ? 1 : 0.92);
  if (p.kick === "half") {
    kick(t, 1);
    kick(t + 2.5 * BEAT, 0.7);
    snare(t + 2 * BEAT, 0.9);
  }
  if (p.kick === "pulse") for (let q = 0; q < 4; q++) kick(t + q * BEAT, 0.55);
  if (p.clap) {
    clap(t + BEAT, 0.9);
    clap(t + 3 * BEAT, 0.9);
  }
  if (p.hats) {
    for (let s = 0; s < 16; s++) {
      const offbeat = s % 4 === 2;
      const g = offbeat ? 1 : s % 2 ? 0.45 : 0.6;
      if (p.hats < 0.6 && s % 2) continue;
      hat(t + s * (BEAT / 4), offbeat && s === 14 && b % 2 === 1, g * p.hats, s % 2 ? 0.25 : -0.2);
    }
  }
  if (p.bass) {
    const root = note(c.bass);
    const pattern = p.bass === "pulse" ? [0, 1, 0, 1, 0, 1, 0, 1].map(() => 0) : [0, 0, 12, 0, 0, 12, 0, 12];
    for (let e = 0; e < 8; e++) {
      const fr = root * Math.pow(2, pattern[e] / 12);
      bassNote(t + e * (BEAT / 2), BEAT / 2 - 0.03, fr, p.bass === "pulse" ? 0.7 : 1);
    }
  }
  if (p.arp) {
    for (let s = 0; s < 16; s++) {
      const n = c.arp[s % 8];
      const accent = s % 4 === 0 ? 1 : s % 2 ? 0.55 : 0.75;
      pluck(t + s * (BEAT / 4), note(n), accent * p.arp, ((s % 8) / 7 - 0.5) * 0.8);
    }
  }
}

// Snare rolls into the two big moments
const roll = (b, gain = 0.6) => {
  for (let k = 0; k < 16; k++) snare(bar(b) + 2 * BEAT + k * (BEAT / 8), gain * (0.3 + (k / 16) * 0.8));
};
roll(23, 0.7);
roll(15, 0.5);

// Intro drone + tension bass
bassNote(0, 7.6, note("F1"), 0.35);
// Finale harmony: Db – Eb – Fm (add9), ringing out
padChord(bar(29), 0.9, ["Db3", "F3", "Ab3", "C4"].map(note), 0.9, 1.1);
padChord(bar(29) + 1.0, 1.0, ["Eb3", "G3", "Bb3", "Db4"].map(note), 1, 1.2);
padChord(f(S.s9 + 60), 4.2, ["F2", "C3", "F3", "Ab3", "C4", "G4"].map(note), 1.35, 1.3);
bassNote(f(S.s9 + 60), 4, note("F1"), 0.9);
["F5", "Ab5", "C6", "Eb6", "G6"].forEach((n, i) => bell(f(S.s9 + 60) + 0.5 + i * 0.13, note(n), 0.55, (i - 2) * 0.35, 1.6, 2));

// ---------------------------------------------------------------------------
// Sound effects (global frames)
// S1: pings accelerate, words land, the plumbing clunks, everything implodes
bell(f(0), note("C6"), 1.1, 0, 2.6);
bell(f(0) + 0.12, note("G6"), 0.6, 0.2, 2.6);
const ARR = Array.from({ length: 64 }, (_, i) => Math.round(46 + 196 * Math.pow(i / 64, 0.6)));
reseed(99);
ARR.forEach((a, i) => {
  const pitch = ["C6", "Eb6", "F6", "G6", "Ab6", "C7"][Math.floor(Math.abs(noise()) * 6)];
  const g = i < 10 ? 0.55 : 0.18 + Math.abs(noise()) * 0.12;
  bell(f(a), note(pitch), g, noise() * 0.8, 3.5);
});
[120, 150, 180].forEach((fr, i) => {
  thump(f(fr), 0.8);
  bell(f(fr), note(["F5", "Ab5", "C6"][i]), 0.5, 0, 2.2, 2);
});
whoosh(f(226), 0.5, 0.8, -0.2, 0.2, 200, 1800);
[270, 300, 330].forEach((fr) => {
  thump(f(fr), 1.1);
  click(f(fr), 0.6);
});
reseed(7);
for (let fr = 240; fr < 392; fr += 3) if (Math.abs(noise()) > 0.55) tick(f(fr), 0.6, noise() * 0.7);
riser(f(350), f(92), 0.9, 200, 5000);
suck(f(392), f(48), 1.1);
thump(f(448), 1.3);

// S2: the drop
impact(f(S.s2), 1.25, 3);
bell(f(S.s2), note("F5"), 0.7, 0, 2.2, 2);
whoosh(f(S.s2 + 110), 0.9, 0.35, -0.7, 0.7, 2000, 7000);
whoosh(f(S.s2 + 188), 0.7, 0.55, 0.3, -0.3, 300, 1400);

// S3: console card, toggle, update, address rolls
whoosh(f(S.s3), 1.1, 0.5, 0, 0, 200, 900);
click(f(S.s3 + 80), 1.1, 0.4);
blip(f(S.s3 + 84), 1320, 0.8, 0.4);
click(f(S.s3 + 140), 1.1, -0.4);
chime(f(S.s3 + 146), 0.7);
whoosh(f(S.s3 + 176), 1.0, 0.6, 0.3, -0.3, 300, 2200);
[270, 300, 330, 360, 396].forEach((fr, i) => {
  for (let k = 0; k < 4; k++) tick(f(S.s3 + fr - 8 + k * 2.5), 0.7, 0);
  blip(f(S.s3 + fr + 2), note(["C6", "Eb6", "F6", "G6", "C6"][i]), 0.9);
});
[282, 300, 318].forEach((fr) => blip(f(S.s3 + fr), 880, 0.35));

// S4: compose, send, flight, pipeline
whoosh(f(S.s4), 0.6, 0.35, 0, 0, 300, 1200);
typing(f(S.s4 + 40), f(S.s4 + 40) + 25 / 42, 21, 1);
typing(f(S.s4 + 72), f(S.s4 + 72) + 37 / 48, 24, 1);
blip(f(S.s4 + 112), 700, 0.8);
click(f(S.s4 + 138), 1.2, -0.3);
impact(f(S.s4 + 144), 0.45, 1);
suck(f(S.s4 + 130), f(16), 0.6);
whoosh(f(S.s4 + 172), f(70), 1.2, -0.8, 0.8, 250, 3000);
const ARRIVE = [240, 324, 398, 478, 572];
const LEAVE = [300, 374, 454, 548];
ARRIVE.forEach((a, i) => {
  thump(f(S.s4 + a), 0.9);
  bell(f(S.s4 + a), note(["C6", "Db6", "Eb6", "F6", "Ab6"][i]), 0.45, 0, 2.5, 2);
});
LEAVE.forEach((l) => whoosh(f(S.s4 + l), f(24), 0.55, -0.5, 0.5, 400, 2000));
for (let i = 0; i < 4; i++) {
  tick(f(S.s4 + 240 + 6 + i * 9), 0.6);
  blip(f(S.s4 + 240 + 13 + i * 9), 1760, 0.35, 0.3, 0.06);
}
blip(f(S.s4 + 324 + 4), 520, 0.5);
blip(f(S.s4 + 324 + 36), note("Ab5"), 0.8);
click(f(S.s4 + 324 + 36), 0.8);
zip(f(S.s4 + 398 + 6), 0.7, -1);
blip(f(S.s4 + 398 + 18), 1040, 0.8);
zip(f(S.s4 + 398 + 16), 0.6, -1);
blip(f(S.s4 + 398 + 28), 880, 0.8);
whoosh(f(S.s4 + 478 + 6), 0.35, 0.45, 0, 0, 1500, 5000);
whoosh(f(S.s4 + 478 + 34), 0.3, 0.6, -0.6, 0.6, 800, 4000);
riser(f(S.s4 + 572 + 10), f(26), 0.35, 600, 3000);
chime(f(S.s4 + 608), 0.9);
whoosh(f(S.s4 + 632), f(52), 0.7, 0.4, -0.4, 200, 1500);
riser(f(S.s4 + 686), f(34), 0.8, 400, 8000);

// S5: payload + code
impact(f(S.s5), 0.6, 1.5);
reseed(5);
for (let i = 0; i < 20; i++) tick(f(S.s5 + 30 + i * 3.4), 0.35, 0.3);
blip(f(S.s5 + 96), 990, 0.6);
whoosh(f(S.s5 + 122), 0.5, 0.3, -0.6, -0.2, 400, 1500);
[146, 170, 190, 210].forEach((fr, i) => {
  zip(f(S.s5 + fr + 2), 0.6 + i * 0.05, 1);
  blip(f(S.s5 + fr + 18), note(["C6", "Eb6", "F6", "Ab6"][i]), 0.6, 0.4);
});
thump(f(S.s5 + 262), 0.8);
chime(f(S.s5 + 300), 0.8);
whoosh(f(S.s5 + 448), f(34), 0.6, 0, 0, 300, 2400);

// S6: executions stream in
[56, 76, 94, 110, 128, 150].forEach((fr, i) => {
  blip(f(S.s6 + fr), note(["F5", "Ab5", "C6", "Eb6", "F6", "Ab6"][i]), 0.7, 0.2);
  tick(f(S.s6 + fr), 0.5);
});
blip(f(S.s6 + 22), 660, 0.5);
whoosh(f(S.s6 + 212), f(28), 0.5, 0.4, -0.4, 300, 2000);

// S7: custom domain verification, then the split
[22, 30, 38, 46].forEach((fr) => tick(f(S.s7 + fr), 0.5));
blip(f(S.s7 + 48), note("C6"), 0.6);
click(f(S.s7 + 180), 1.1, 0.3);
blip(f(S.s7 + 196), note("Eb6"), 0.8, 0.2);
blip(f(S.s7 + 210), note("G6"), 0.8, 0.3);
chime(f(S.s7 + 216), 1);
riser(f(S.s7 + 196), f(44), 0.6, 300, 6000);
impact(f(S.s7 + 240), 0.9, 1.8);
reseed(21);
for (let fr = 240; fr < 284; fr += 3) whoosh(f(S.s7 + fr), 0.25, 0.12, -0.9, -0.1, 800, 3000);
rip(f(S.s7 + 240 + 44), 1.1);
whoosh(f(S.s7 + 240 + 92), f(78), 1.0, 0.8, -0.8, 200, 2400);
for (let i = 0; i < 16; i++) {
  const at = 240 + 44 + 18 + i * 8.5 + 44;
  blip(f(S.s7 + at), i % 2 ? note("C6") : note("G5"), 0.35, i % 2 ? 0.5 : -0.5, 0.07);
}

// S8: montage cuts
[0, 90, 180, 270].forEach((fr, i) => {
  if (fr > 0) whoosh(f(S.s8 + fr - 8), f(16), 1.1, 0.8, -0.8, 500, 5000);
  impact(f(S.s8 + fr), 0.55, 1.2);
  bell(f(S.s8 + fr + 6), note(["F5", "Ab5", "C6", "Eb6"][i]), 0.45, 0, 2, 2);
});
whoosh(f(S.s8 + 46), 0.5, 0.4, -0.2, 0.8, 800, 3500);
riser(f(S.s8 + 90 + 8), f(44), 0.3, 800, 4000);
[14, 23, 32, 41].forEach((d) => blip(f(S.s8 + 90 + d), 1200, 0.5, 0.5));
[190, 200, 210].forEach((fr) => blip(f(S.s8 + fr), note("F6"), 0.6, 0, 0.12));
whoosh(f(S.s8 + 180 + 36), 0.35, 0.5, 0, 0, 900, 4000);
for (let k = 0; k < 12; k++) tick(f(S.s8 + 270 + k * 4), 0.5, 0.2);
[314, 328].forEach((fr) => blip(f(S.s8 + fr), 1046, 0.6, 0.3));

// S9: vortex, impact, lockup
suck(f(S.s9), f(60), 1.2);
riser(f(S.s9 + 10), f(50), 0.6, 300, 7000);
impact(f(S.s9 + 60), 1.35, 3.5);
blip(f(S.s9 + 66), note("F6"), 0.5);
whoosh(f(S.s9 + 200), 0.85, 0.3, -0.7, 0.7, 2500, 8000);

// ---------------------------------------------------------------------------
// Mix
const n = drums.n;
const duck = new Float32Array(n).fill(1);
for (const t0 of kicks) {
  const i0 = Math.round(t0 * SR);
  for (let k = 0; k < SR * 0.3 && i0 + k < n; k++) {
    const g = 1 - 0.55 * Math.exp(-(k / SR) / 0.09);
    if (g < duck[i0 + k]) duck[i0 + k] = g;
  }
}
const [dl, dr] = pingPong(delaySend.l, delaySend.r, BEAT * 0.75, 0.36, 3200);
const [rl, rr] = fdnReverb(verbSend.l, verbSend.r, { size: 1.3, decay: 3.2, damp: 0.45, pre: 0.025 });

const L = new Float32Array(n);
const R = new Float32Array(n);
const hpL = new Biquad("hp", 28);
const hpR = new Biquad("hp", 28);
for (let i = 0; i < n; i++) {
  const d = duck[i];
  L[i] = drums.l[i] * 0.9 + bass.l[i] * 0.85 * d + music.l[i] * 0.8 * d + sfx.l[i] * 0.95 + dl[i] * 0.35 * d + rl[i] * 0.5;
  R[i] = drums.r[i] * 0.9 + bass.r[i] * 0.85 * d + music.r[i] * 0.8 * d + sfx.r[i] * 0.95 + dr[i] * 0.35 * d + rr[i] * 0.5;
  L[i] = hpL.run(L[i]);
  R[i] = hpR.run(R[i]);
}

// Glue compression + soft limit
let envv = 0;
const att = Math.exp(-1 / (0.005 * SR));
const rel = Math.exp(-1 / (0.12 * SR));
for (let i = 0; i < n; i++) {
  const x = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  envv = x > envv ? att * envv + (1 - att) * x : rel * envv + (1 - rel) * x;
  const thr = 0.45;
  const g = envv > thr ? Math.pow(thr / envv, 0.55) : 1;
  L[i] = Math.tanh(L[i] * g * 1.15);
  R[i] = Math.tanh(R[i] * g * 1.15);
}

// Fade the tail, normalise to -1 dBFS
const endI = Math.round(64 * SR);
for (let i = Math.round(62.8 * SR); i < n; i++) {
  const g = Math.max(0, 1 - (i - 62.8 * SR) / (1.2 * SR));
  L[i] *= g;
  R[i] *= g;
}
let peak = 0;
for (let i = 0; i < endI; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const norm = 0.891 / peak;

// WAV
const frames = endI;
const buf = Buffer.alloc(44 + frames * 4);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + frames * 4, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(frames * 4, 40);
for (let i = 0; i < frames; i++) {
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * norm * 32767))), 44 + i * 4);
  buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * norm * 32767))), 46 + i * 4);
}
const out = path.join(process.cwd(), "public/email-triggers/soundtrack.wav");
fs.writeFileSync(out, buf);
console.log(`wrote ${out} (${(frames / SR).toFixed(2)}s, peak before norm ${peak.toFixed(3)})`);
