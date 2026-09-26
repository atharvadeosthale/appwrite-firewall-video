// 120 BPM at 60 fps: one beat is 30 frames, one bar is 120 frames.
export const FPS = 60;
export const BEAT = 30;
export const BAR = BEAT * 4;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const beats = (n: number) => Math.round(n * BEAT);
export const bars = (n: number) => Math.round(n * BAR);

// Scene lengths, in bars. The soundtrack is written against these.
export const SCENES = [
  { id: "S1-Inbox", bars: 4 },
  { id: "S2-Title", bars: 2 },
  { id: "S3-Address", bars: 4 },
  { id: "S4-Journey", bars: 6 },
  { id: "S5-Payload", bars: 4 },
  { id: "S6-Executions", bars: 2 },
  { id: "S7-Domains", bars: 4 },
  { id: "S8-UseCases", bars: 3 },
  { id: "S9-Finale", bars: 3 },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];

export const sceneDuration = (id: SceneId) =>
  bars(SCENES.find((s) => s.id === id)!.bars);

export const sceneStart = (id: SceneId) => {
  let t = 0;
  for (const s of SCENES) {
    if (s.id === id) return t;
    t += bars(s.bars);
  }
  throw new Error(`Unknown scene ${id}`);
};

export const TOTAL_DURATION = SCENES.reduce((t, s) => t + bars(s.bars), 0);
