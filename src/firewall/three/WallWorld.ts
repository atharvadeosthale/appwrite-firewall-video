import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../lib/anim";

/**
 * The Firewall hero world: a wall of pink bricks that traffic streams into.
 * Everything is a pure function of the frame so renders are deterministic.
 */

export type WallWorldOptions = {
  /** Frame at which brick assembly begins. */
  assembleAt: number;
  /** Frames over which bricks land. */
  assembleDur: number;
  /** Seconds-equivalent frame count the scene lasts (for particle spawning). */
  duration: number;
  /** Camera keyframes: [frame, position, target]. */
  camera: Array<{
    f: number;
    pos: [number, number, number];
    target: [number, number, number];
    /** Easing of the segment that ends at this key. */
    ease?: "inOut" | "in" | "out";
  }>;
  /** Multiplier on traffic density. */
  density?: number;
  /** Fraction of traffic that is malicious. */
  badRatio?: number;
  /** When set, the wall is already built at frame 0. */
  prebuilt?: boolean;
  /** Attack surge: traffic density ramps up by `surgeGain` from `surgeAt`. */
  surgeAt?: number;
  surgeDur?: number;
  surgeGain?: number;
  surgeBad?: number;
  surgeEnd?: number;
  /** Attack mode: from this frame every visitor is challenged. */
  challengeAt?: number;
  challengeEnd?: number;
  /** Camera shake keyframes [frame, amplitude]. */
  shake?: Array<[number, number]>;
};

const WALL_X = 0.34; // half thickness
const ROWS = 9;
const ROW_H = 0.8;
const BRICK_H = 0.7;
const WALL_W = 4.0;
const X0 = -36;
const EXIT_LEN_MIN = 7;
const WAVE_SPEED = 0.9;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.25;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

type Brick = {
  x: number;
  y: number;
  z: number;
  w: number;
  row: number;
  start: number;
  fromPos: THREE.Vector3;
  fromRot: THREE.Euler;
  half: boolean;
};

type Lane = {
  endY: number;
  endZ: number;
  startY: number;
  startZ: number;
  ay: number;
  az: number;
  fy: number;
  fz: number;
  py: number;
  pz: number;
  chan: number;
  exitZ: number;
};

type Particle = {
  lane: number;
  spawn: number;
  speed: number;
  bad: boolean;
  size: number;
  seed: number;
};

type Channel = { y: number; z: number; len: number; appear: number };

const brickVertex = /* glsl */ `
  attribute float aFlash;
  attribute float aRow;
  attribute float aVisible;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vFlash;
  varying float vRow;
  varying float vVisible;
  void main() {
    vLocal = position;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    vFlash = aFlash;
    vRow = aRow;
    vVisible = aVisible;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const brickFragment = /* glsl */ `
  uniform vec3 uHalf;
  uniform vec3 uPink;
  uniform vec3 uCam;
  uniform float uGlow;
  uniform float uScan;
  uniform float uChal;
  uniform vec3 uViolet;
  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  varying float vFlash;
  varying float vRow;
  varying float vVisible;
  float secondMin(vec3 v) {
    float a = min(v.x, min(v.y, v.z));
    float c = max(v.x, max(v.y, v.z));
    return v.x + v.y + v.z - a - c;
  }
  void main() {
    vec3 d = uHalf - abs(vLocal);
    float e = secondMin(max(d, 0.0));
    float edge = 1.0 - smoothstep(0.0, 0.05, e);
    float edgeSoft = 1.0 - smoothstep(0.0, 0.16, e);
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCam - vWorld);
    vec3 L = normalize(vec3(-0.5, 0.75, 0.55));
    float diff = max(dot(N, L), 0.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 glowC = mix(uPink, uViolet, uChal * 0.75);
    vec3 dark = vec3(0.016, 0.004, 0.007);
    vec3 warm = vec3(0.13, 0.008, 0.032);
    vec3 base = mix(dark, warm, vRow * vRow);
    vec3 col = base * (0.5 + 0.9 * diff);
    float exitFace = smoothstep(0.5, 1.0, N.x);
    col += glowC * (edge * (0.55 + 0.75 * vRow) + edgeSoft * 0.05) * uGlow;
    col += glowC * fres * 0.12 * uGlow;
    col += glowC * exitFace * (0.35 + 0.6 * vRow) * uGlow;
    col += vec3(1.0, 0.3, 0.5) * vFlash * 0.75;
    float band = exp(-pow((vWorld.y - uScan) / 0.55, 2.0));
    col += uPink * band * (0.6 + edge * 2.2) * step(-50.0, uScan);
    gl_FragColor = vec4(col * vVisible, 1.0);
  }
`;

const pointVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  uniform float uScale;
  uniform float uFocus;
  uniform float uAperture;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBokeh;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    float base = clamp(aSize * uScale / depth, 1.0, 56.0);
    // Thin-lens circle of confusion: out-of-focus points grow into soft discs.
    float coc = min(90.0, uAperture * abs(depth - uFocus) / max(depth, 0.1));
    float size = base + coc;
    gl_PointSize = size;
    vBokeh = coc / size;
    vColor = aColor;
    vAlpha = aAlpha * pow(base / size, 1.35);
  }
`;

const pointFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBokeh;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c) * 2.0;
    if (r > 1.0) discard;
    float core = exp(-r * r * 9.0);
    float halo = exp(-r * r * 2.5) * 0.35;
    float disc = smoothstep(1.0, 0.72, r) * (0.75 + 0.25 * smoothstep(0.55, 0.95, r));
    float a = mix(core + halo, disc * 1.4, vBokeh) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

const caFragment = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uAmount;
  varying vec2 vUv;
  void main() {
    vec2 d = vUv - 0.5;
    vec2 off = d * dot(d, d) * uAmount;
    vec4 g = texture2D(tDiffuse, vUv);
    float r = texture2D(tDiffuse, vUv - off).r;
    float b = texture2D(tDiffuse, vUv + off).b;
    gl_FragColor = vec4(r, g.g, b, g.a);
  }
`;

const lineVertex = /* glsl */ `
  attribute vec4 aCol;
  varying vec4 vCol;
  void main() {
    vCol = aCol;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lineFragment = /* glsl */ `
  varying vec4 vCol;
  void main() {
    gl_FragColor = vCol;
  }
`;

export class WallWorld {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  opts: Required<WallWorldOptions>;
  bloom: UnrealBloomPass;

  bricks: Brick[] = [];
  brickMeshes: { mesh: THREE.InstancedMesh; ids: number[]; material: THREE.ShaderMaterial }[] = [];
  lanes: Lane[] = [];
  particles: Particle[] = [];
  channels: Channel[] = [];

  points: THREE.Points;
  pointPos: Float32Array;
  pointCol: Float32Array;
  pointSize: Float32Array;
  pointAlpha: Float32Array;
  maxPoints = 9000;

  trails: THREE.LineSegments;
  trailPos: Float32Array;
  trailCol: Float32Array;
  maxTrails = 3200;

  wires!: THREE.LineSegments;
  wireCol!: Float32Array;
  wireBase!: Float32Array;

  exitLines!: THREE.LineSegments;
  exitPos!: Float32Array;
  exitCol!: Float32Array;

  terrain!: THREE.Points;
  terrainPos!: Float32Array;
  terrainAlpha!: Float32Array;
  terrainBase!: Float32Array;
  terrainCols = 180;
  terrainRows = 90;

  wallReady: number;
  /** Shared depth-of-field uniforms for every point material. */
  focus = { value: 17 };
  aperture = { value: 6 };
  ring!: THREE.Mesh;
  front!: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement, width: number, height: number, options: WallWorldOptions) {
    this.opts = {
      density: 1,
      badRatio: 0.14,
      prebuilt: false,
      surgeAt: 1e9,
      surgeDur: 60,
      surgeGain: 0,
      surgeBad: 0.6,
      challengeAt: 1e9,
      challengeEnd: 1e9,
      surgeEnd: 1e9,
      shake: [],
      ...options,
    };
    this.wallReady = this.opts.prebuilt ? -1000 : this.opts.assembleAt + this.opts.assembleDur;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#0b0b0e");
    this.camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 300);

    const rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(1);
    this.composer.setSize(width, height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.85, 0.5, 0.22);
    this.composer.addPass(this.bloom);
    this.composer.addPass(
      new ShaderPass({
        uniforms: { tDiffuse: { value: null }, uAmount: { value: 0.013 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: caFragment,
      }),
    );
    this.composer.addPass(new OutputPass());

    this.buildBricks();
    this.buildLanes();
    this.buildParticles();
    this.buildWires();
    this.buildExitLines();
    this.buildTerrain();
    this.buildShockwave();

    const pointsGeo = new THREE.BufferGeometry();
    this.pointPos = new Float32Array(this.maxPoints * 3);
    this.pointCol = new Float32Array(this.maxPoints * 3);
    this.pointSize = new Float32Array(this.maxPoints);
    this.pointAlpha = new Float32Array(this.maxPoints);
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(this.pointPos, 3));
    pointsGeo.setAttribute("aColor", new THREE.BufferAttribute(this.pointCol, 3));
    pointsGeo.setAttribute("aSize", new THREE.BufferAttribute(this.pointSize, 1));
    pointsGeo.setAttribute("aAlpha", new THREE.BufferAttribute(this.pointAlpha, 1));
    const pointMat = new THREE.ShaderMaterial({
      vertexShader: pointVertex,
      fragmentShader: pointFragment,
      uniforms: {
        uScale: { value: height / (2 * Math.tan((32 * Math.PI) / 360)) },
        uFocus: this.focus,
        uAperture: this.aperture,
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(pointsGeo, pointMat);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    const trailGeo = new THREE.BufferGeometry();
    this.trailPos = new Float32Array(this.maxTrails * 2 * 3);
    this.trailCol = new Float32Array(this.maxTrails * 2 * 4);
    trailGeo.setAttribute("position", new THREE.BufferAttribute(this.trailPos, 3));
    trailGeo.setAttribute("aCol", new THREE.BufferAttribute(this.trailCol, 4));
    const trailMat = new THREE.ShaderMaterial({
      vertexShader: lineVertex,
      fragmentShader: lineFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.trails = new THREE.LineSegments(trailGeo, trailMat);
    this.trails.frustumCulled = false;
    this.scene.add(this.trails);
  }

  // ---------------------------------------------------------------- build

  private buildBricks() {
    const r = rng(3);
    const gap = 0.08;
    for (let row = 0; row < ROWS; row++) {
      const y = -((ROWS - 1) * ROW_H) / 2 + row * ROW_H;
      const offset = row % 2 === 1;
      const units: Array<{ z: number; w: number; half: boolean }> = [];
      if (!offset) {
        for (let i = 0; i < 4; i++) units.push({ z: -1.5 + i, w: 1 - gap, half: false });
      } else {
        // Full brick overhanging the far end so it reads as toothed, not sawn flush.
        units.push({ z: -2, w: 1 - gap, half: false });
        for (let i = 0; i < 3; i++) units.push({ z: -1 + i, w: 1 - gap, half: false });
        units.push({ z: 1.75, w: 0.5 - gap, half: true });
      }
      for (const u of units) {
        this.bricks.push({
          x: 0,
          y,
          z: u.z,
          w: u.w,
          row,
          start: 0,
          half: u.half,
          fromPos: new THREE.Vector3(-1.5 - r() * 2.5, y + 7 + r() * 4, u.z + 1 + r() * 3),
          fromRot: new THREE.Euler((r() - 0.5) * 2.4, (r() - 0.5) * 2.4, (r() - 0.5) * 2.4),
        });
      }
    }
    // Assembly order: bottom rows first with a little shuffle inside each row.
    const order = this.bricks
      .map((b, i) => ({ i, k: b.row + r() * 0.9 }))
      .sort((a, b) => a.k - b.k)
      .map((o) => o.i);
    const n = order.length;
    order.forEach((brickIndex, k) => {
      this.bricks[brickIndex].start = this.opts.assembleAt + (k / (n - 1)) * (this.opts.assembleDur - 22);
    });

    for (const half of [false, true]) {
      const ids = this.bricks.map((b, i) => (b.half === half ? i : -1)).filter((i) => i >= 0);
      const w = half ? 0.5 - gap : 1 - gap;
      const geo = new RoundedBoxGeometry(WALL_X * 2, BRICK_H, w, 3, 0.07);
      const flash = new Float32Array(ids.length);
      const rowAttr = new Float32Array(ids.length);
      const vis = new Float32Array(ids.length);
      ids.forEach((id, k) => (rowAttr[k] = 1 - this.bricks[id].row / (ROWS - 1)));
      geo.setAttribute("aFlash", new THREE.InstancedBufferAttribute(flash, 1));
      geo.setAttribute("aRow", new THREE.InstancedBufferAttribute(rowAttr, 1));
      geo.setAttribute("aVisible", new THREE.InstancedBufferAttribute(vis, 1));
      const material = new THREE.ShaderMaterial({
        vertexShader: brickVertex,
        fragmentShader: brickFragment,
        uniforms: {
          uHalf: { value: new THREE.Vector3(WALL_X, BRICK_H / 2, w / 2) },
          uPink: { value: new THREE.Color("#fd366e") },
          uCam: { value: new THREE.Vector3() },
          uGlow: { value: 1 },
          uScan: { value: -100 },
          uChal: { value: 0 },
          uViolet: { value: new THREE.Color("#8b5cf6") },
        },
      });
      const mesh = new THREE.InstancedMesh(geo, material, ids.length);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.brickMeshes.push({ mesh, ids, material });
    }
  }

  private buildLanes() {
    const r = rng(9);
    const count = Math.round(260 * this.opts.density);
    const chanCount = ROWS;
    for (let c = 0; c < chanCount; c++) {
      const y = -((ROWS - 1) * ROW_H) / 2 + c * ROW_H;
      this.channels.push({
        y,
        z: (r() - 0.5) * 2.2,
        len: EXIT_LEN_MIN + r() * 7,
        appear: 0,
      });
    }
    for (let i = 0; i < count; i++) {
      const endY = (r() - 0.5) * (ROWS * ROW_H - 0.6);
      const endZ = (r() - 0.5) * (WALL_W - 0.5);
      // Nearest channel by height.
      let chan = 0;
      let best = 1e9;
      this.channels.forEach((ch, k) => {
        const d = Math.abs(ch.y - endY);
        if (d < best) {
          best = d;
          chan = k;
        }
      });
      this.lanes.push({
        endY,
        endZ,
        startY: endY * 2.2 + (r() - 0.5) * 9,
        startZ: endZ * 2.5 + (r() - 0.5) * 16 - 3,
        ay: 0.4 + r() * 1.6,
        az: 0.4 + r() * 1.8,
        fy: 2 + r() * 5,
        fz: 2 + r() * 5,
        py: r() * Math.PI * 2,
        pz: r() * Math.PI * 2,
        chan,
        exitZ: this.channels[chan].z,
      });
    }
  }

  private surgeAmt(t: number) {
    return (
      smooth((t - this.opts.surgeAt) / this.opts.surgeDur) *
      (1 - smooth((t - this.opts.surgeEnd) / this.opts.surgeDur))
    );
  }

  private buildParticles() {
    const r = rng(21);
    const interval = 0.2 / this.opts.density;
    for (let t = -200; t < this.opts.duration; ) {
      const surge = this.surgeAmt(t);
      const bad = this.opts.badRatio + (this.opts.surgeBad - this.opts.badRatio) * surge;
      this.particles.push({
        lane: Math.floor(r() * this.lanes.length),
        spawn: t,
        speed: 0.26 + r() * 0.16 + surge * 0.08,
        bad: r() < bad,
        size: 0.05 + r() * 0.07,
        seed: Math.floor(r() * 1e9),
      });
      t += (interval * (0.5 + r())) / (1 + this.opts.surgeGain * surge);
    }
  }

  private laneIn(l: Lane, u: number, out: THREE.Vector3) {
    const k = smooth(u);
    const falloff = Math.pow(1 - u, 1.6);
    out.set(
      X0 + (-WALL_X - X0) * u,
      l.startY + (l.endY - l.startY) * k + l.ay * Math.sin(u * l.fy + l.py) * falloff,
      l.startZ + (l.endZ - l.startZ) * k + l.az * Math.sin(u * l.fz + l.pz) * falloff,
    );
    return out;
  }

  /** Path after the wall. `s` is distance travelled past the exit face. */
  private laneOut(l: Lane, s: number, out: THREE.Vector3) {
    const ch = this.channels[l.chan];
    const k = smooth(s / 1.8);
    out.set(WALL_X + s, l.endY + (ch.y - l.endY) * k, l.endZ + (ch.z - l.endZ) * k);
    return out;
  }

  /** Before the wall exists traffic sprays straight through. */
  private laneUnfiltered(l: Lane, s: number, out: THREE.Vector3) {
    out.set(WALL_X + s, l.endY + s * (l.endY * 0.12), l.endZ + s * (l.endZ * 0.25 + 0.05));
    return out;
  }

  private buildWires() {
    const segs = 70;
    const lanes = this.lanes.filter((_, i) => i % 2 === 0);
    const pos = new Float32Array(lanes.length * segs * 2 * 3);
    this.wireCol = new Float32Array(lanes.length * segs * 2 * 4);
    this.wireBase = new Float32Array(lanes.length * segs * 2);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    let v = 0;
    lanes.forEach((l) => {
      for (let s = 0; s < segs; s++) {
        const u0 = s / segs;
        const u1 = (s + 1) / segs;
        this.laneIn(l, u0, a);
        this.laneIn(l, u1, b);
        pos.set([a.x, a.y, a.z], v * 3);
        this.wireBase[v] = Math.pow(u0, 1.3);
        v++;
        pos.set([b.x, b.y, b.z], v * 3);
        this.wireBase[v] = Math.pow(u1, 1.3);
        v++;
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aCol", new THREE.BufferAttribute(this.wireCol, 4));
    this.wires = new THREE.LineSegments(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: lineVertex,
        fragmentShader: lineFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.wires.frustumCulled = false;
    this.scene.add(this.wires);
  }

  private buildExitLines() {
    const n = this.channels.length;
    this.exitPos = new Float32Array(n * 2 * 3);
    this.exitCol = new Float32Array(n * 2 * 4);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.exitPos, 3));
    geo.setAttribute("aCol", new THREE.BufferAttribute(this.exitCol, 4));
    this.exitLines = new THREE.LineSegments(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: lineVertex,
        fragmentShader: lineFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.exitLines.frustumCulled = false;
    this.scene.add(this.exitLines);
  }

  private buildTerrain() {
    const cols = this.terrainCols;
    const rows = this.terrainRows;
    const n = cols * rows;
    this.terrainPos = new Float32Array(n * 3);
    this.terrainBase = new Float32Array(n * 2);
    this.terrainAlpha = new Float32Array(n);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const pink = new THREE.Color("#fd366e");
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const x = 1.5 + i * 0.22;
        const z = -22 + j * 0.34;
        this.terrainBase[k * 2] = x;
        this.terrainBase[k * 2 + 1] = z;
        col.set([pink.r, pink.g, pink.b], k * 3);
        size[k] = 0.065;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.terrainPos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(this.terrainAlpha, 1));
    this.terrain = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: pointVertex,
        fragmentShader: pointFragment,
        uniforms: {
          uScale: { value: 1080 / (2 * Math.tan((32 * Math.PI) / 360)) },
          uFocus: this.focus,
          uAperture: this.aperture,
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.terrain.frustumCulled = false;
    this.scene.add(this.terrain);
  }

  private buildShockwave() {
    const mat = () =>
      new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uR;
          uniform float uW;
          uniform float uAlpha;
          uniform float uFill;
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            float d = length((vUv - 0.5) * 2.0);
            float ring = exp(-pow((d - uR) / uW, 2.0));
            float fill = uFill * (1.0 - smoothstep(0.0, uR, d)) * smoothstep(1.0, 0.6, d);
            float a = (ring + fill * 0.3) * uAlpha;
            gl_FragColor = vec4(uColor * 1.6, a);
          }
        `,
        uniforms: {
          uR: { value: 0.1 },
          uW: { value: 0.04 },
          uAlpha: { value: 0 },
          uFill: { value: 0 },
          uColor: { value: new THREE.Color("#a78bfa") },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat());
    this.ring.rotation.y = Math.PI / 2;
    this.ring.position.set(-WALL_X - 0.05, 0, 0);
    this.ring.frustumCulled = false;
    this.scene.add(this.ring);
    this.front = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat());
    this.front.rotation.y = Math.PI / 2;
    this.front.frustumCulled = false;
    this.scene.add(this.front);
  }

  private updateShockwave(frame: number) {
    const t = frame - this.opts.challengeAt;
    const rm = this.ring.material as THREE.ShaderMaterial;
    const fm = this.front.material as THREE.ShaderMaterial;
    if (t < 0 || t > 70) {
      rm.uniforms.uAlpha.value = 0;
      fm.uniforms.uAlpha.value = 0;
      return;
    }
    const p = easeOutCubic(clamp01(t / 46));
    this.ring.scale.setScalar(14);
    rm.uniforms.uR.value = 0.08 + p * 0.86;
    rm.uniforms.uW.value = 0.02 + p * 0.05;
    rm.uniforms.uAlpha.value = (1 - smooth(t / 50)) * 1.4;
    const fx = this.waveX(frame);
    this.front.position.set(fx, 0, 0);
    this.front.scale.setScalar(9 + t * 0.12);
    fm.uniforms.uR.value = 0.82;
    fm.uniforms.uW.value = 0.12;
    fm.uniforms.uFill.value = 1;
    fm.uniforms.uAlpha.value = (1 - smooth(t / 44)) * 0.6 * smooth(t / 4);
  }

  /** X position of the attack-mode wavefront. */
  private waveX(frame: number) {
    return -WALL_X - WAVE_SPEED * (frame - this.opts.challengeAt);
  }

  /** Frame at which the wavefront meets a particle, or null. */
  private waveMeet(pt: Particle, arrive: number) {
    const c = this.opts.challengeAt;
    if (c > 1e8) return null;
    const tm = (-WALL_X + WAVE_SPEED * c - X0 + pt.spawn * pt.speed) / (pt.speed + WAVE_SPEED);
    if (tm < c || tm > arrive || tm < pt.spawn) return null;
    return tm;
  }

  // ---------------------------------------------------------------- update

  private updateCamera(frame: number) {
    const keys = this.opts.camera;
    let a = keys[0];
    let b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (frame >= keys[i].f && frame <= keys[i + 1].f) {
        a = keys[i];
        b = keys[i + 1];
        break;
      }
    }
    if (frame < keys[0].f) b = a;
    if (frame > keys[keys.length - 1].f) a = b;
    const raw = a === b ? 0 : clamp01((frame - a.f) / (b.f - a.f));
    const t =
      b.ease === "in" ? raw * raw * raw : b.ease === "out" ? easeOutCubic(raw) : easeInOut(raw);
    const pos = new THREE.Vector3(...a.pos).lerp(new THREE.Vector3(...b.pos), t);
    const target = new THREE.Vector3(...a.target).lerp(new THREE.Vector3(...b.target), t);
    // A whisper of handheld drift, plus shake when the world is under attack.
    const s = frame / 60;
    pos.x += Math.sin(s * 0.9) * 0.05;
    pos.y += Math.sin(s * 1.3 + 1) * 0.04;
    const amp = this.shakeAt(frame);
    if (amp > 0) {
      const n = (k: number) => Math.sin(frame * 1.7 + k * 12.9) * Math.cos(frame * 2.3 + k * 4.1);
      pos.x += n(1) * amp;
      pos.y += n(2) * amp;
      target.y += n(3) * amp * 0.6;
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
  }

  private shakeAt(frame: number) {
    const k = this.opts.shake;
    if (!k.length) return 0;
    if (frame <= k[0][0]) return k[0][1];
    for (let i = 0; i < k.length - 1; i++) {
      if (frame <= k[i + 1][0]) {
        const t = (frame - k[i][0]) / (k[i + 1][0] - k[i][0]);
        return k[i][1] + (k[i + 1][1] - k[i][1]) * t;
      }
    }
    return k[k.length - 1][1];
  }

  private updateBricks(frame: number) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    for (const { mesh, ids, material } of this.brickMeshes) {
      const flash = mesh.geometry.getAttribute("aFlash") as THREE.InstancedBufferAttribute;
      const vis = mesh.geometry.getAttribute("aVisible") as THREE.InstancedBufferAttribute;
      ids.forEach((id, k) => {
        const b = this.bricks[id];
        const t = this.opts.prebuilt ? 1 : clamp01((frame - b.start) / 22);
        const tp = easeOutBack(t);
        const tr = easeOutCubic(t);
        p.set(
          b.fromPos.x + (b.x - b.fromPos.x) * tp,
          b.fromPos.y + (b.y - b.fromPos.y) * tp,
          b.fromPos.z + (b.z - b.fromPos.z) * tp,
        );
        e.set(b.fromRot.x * (1 - tr), b.fromRot.y * (1 - tr), b.fromRot.z * (1 - tr));
        q.setFromEuler(e);
        const s = 0.55 + 0.45 * tr;
        sc.set(s, s, s);
        m.compose(p, q, sc);
        mesh.setMatrixAt(k, m);
        const landed = frame - (b.start + 18);
        let f = landed >= 0 && !this.opts.prebuilt ? Math.exp(-landed / 9) : 0;
        f += this.impactFlash(frame, b);
        flash.setX(k, Math.min(0.55, f));
        vis.setX(k, this.opts.prebuilt ? 1 : smooth((frame - b.start) / 8));
      });
      mesh.instanceMatrix.needsUpdate = true;
      flash.needsUpdate = true;
      vis.needsUpdate = true;
      material.uniforms.uCam.value.copy(this.camera.position);
      const ready = this.opts.prebuilt ? 1 : smooth((frame - this.wallReady + 30) / 40);
      const pulse = this.opts.prebuilt ? 0 : Math.exp(-Math.max(0, frame - this.wallReady) / 20) * (frame >= this.wallReady ? 1 : 0);
      const chal =
        smooth((frame - this.opts.challengeAt) / 14) * (1 - smooth((frame - this.opts.challengeEnd) / 50));
      const chalPulse = frame >= this.opts.challengeAt ? Math.exp(-(frame - this.opts.challengeAt) / 16) : 0;
      material.uniforms.uChal.value = chal;
      material.uniforms.uGlow.value = 0.35 + 0.65 * ready + pulse * 0.5 + chalPulse * 1.0;
      const scanT = (frame - this.wallReady) / 34;
      material.uniforms.uScan.value =
        !this.opts.prebuilt && scanT >= 0 && scanT <= 1.2 ? -4.6 + scanT * 9.2 : -100;
    }
  }

  /** Bricks light up briefly when a malicious request hits them. */
  private impactFlash(frame: number, b: Brick) {
    let f = 0;
    const hits = this.brickHits.get(b);
    if (!hits) return 0;
    for (const h of hits) {
      const d = frame - h;
      if (d >= 0 && d < 24) f += Math.exp(-d / 5) * 0.3;
    }
    return f;
  }

  private brickHits = new Map<Brick, number[]>();

  private brickAt(y: number, z: number) {
    let best: Brick | null = null;
    let bd = 1e9;
    for (const b of this.bricks) {
      const d = Math.abs(b.y - y) * 2 + Math.abs(b.z - z);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  private hitsIndexed = false;
  private indexHits() {
    if (this.hitsIndexed) return;
    this.hitsIndexed = true;
    const len = -WALL_X - X0;
    for (const pt of this.particles) {
      if (!pt.bad) continue;
      const arrive = pt.spawn + len / pt.speed;
      if (arrive < this.wallReady || (arrive >= this.opts.challengeAt && arrive < this.opts.challengeEnd)) continue;
      const l = this.lanes[pt.lane];
      const b = this.brickAt(l.endY, l.endZ);
      if (!b) continue;
      const arr = this.brickHits.get(b) ?? [];
      arr.push(arrive);
      this.brickHits.set(b, arr);
    }
  }

  private updateTraffic(frame: number) {
    const tmp = new THREE.Vector3();
    const tail = new THREE.Vector3();
    const len = -WALL_X - X0;
    const r = rng(0);
    let pi = 0;
    let ti = 0;
    const good = new THREE.Color("#ff8fb0");
    const goodHot = new THREE.Color("#ffd1de");
    const badC = new THREE.Color("#ff3b3b");
    const spark = new THREE.Color("#ff6a4d");

    const pushPoint = (x: number, y: number, z: number, c: THREE.Color, size: number, alpha: number) => {
      if (pi >= this.maxPoints) return;
      this.pointPos[pi * 3] = x;
      this.pointPos[pi * 3 + 1] = y;
      this.pointPos[pi * 3 + 2] = z;
      this.pointCol[pi * 3] = c.r;
      this.pointCol[pi * 3 + 1] = c.g;
      this.pointCol[pi * 3 + 2] = c.b;
      this.pointSize[pi] = size;
      this.pointAlpha[pi] = alpha;
      pi++;
    };
    const pushTrail = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Color, alpha: number) => {
      if (ti >= this.maxTrails) return;
      this.trailPos.set([a.x, a.y, a.z, b.x, b.y, b.z], ti * 6);
      this.trailCol.set([c.r, c.g, c.b, 0, c.r, c.g, c.b, alpha], ti * 8);
      ti++;
    };

    const violet = new THREE.Color("#a78bfa");
    const violetHot = new THREE.Color("#e4dcff");
    const mixC = new THREE.Color();
    for (const pt of this.particles) {
      const age = frame - pt.spawn;
      if (age < 0) continue;
      const l = this.lanes[pt.lane];
      const dist = age * pt.speed;
      const arrive = pt.spawn + len / pt.speed;
      const filtered = arrive >= this.wallReady;
      const challenged = arrive >= this.opts.challengeAt && arrive < this.opts.challengeEnd;
      const fadeIn = smooth(dist / 3);
      const trailLen = pt.speed * 7;
      const meet = this.waveMeet(pt, arrive);
      if (meet !== null && frame >= meet) {
        const since = frame - meet;
        if (pt.bad) {
          // The wavefront dissolves malicious traffic in flight.
          if (since < 30) {
            const mx = (meet - pt.spawn) * pt.speed;
            this.laneIn(l, Math.min(1, mx / len), tmp);
            const sr = rng(pt.seed + 7);
            for (let k = 0; k < 4; k++) {
              const vx = -(0.02 + sr() * 0.06);
              const vy = (sr() - 0.3) * 0.08;
              const vz = (sr() - 0.5) * 0.08;
              const a = Math.max(0, 1 - since / 30);
              pushPoint(tmp.x + vx * since, tmp.y + vy * since, tmp.z + vz * since, violet, 0.04, a);
            }
            pushPoint(tmp.x, tmp.y, tmp.z, violetHot, 0.12, Math.exp(-since / 4));
          }
          continue;
        }
      }
      const scanned = meet !== null && frame >= meet ? Math.exp(-(frame - meet) / 18) : 0;
      if (dist < len) {
        this.laneIn(l, dist / len, tmp);
        this.laneIn(l, Math.max(0, dist - trailLen) / len, tail);
        const c = scanned > 0.01 ? mixC.copy(pt.bad ? badC : good).lerp(violet, scanned) : pt.bad ? badC : good;
        const size = pt.bad ? pt.size * 1.35 : pt.size;
        const nearWall = pt.bad && filtered ? 1 + smooth((dist - len + 3) / 3) * 0.8 : 1;
        const far = 0.18 + 0.82 * smooth((dist / len - 0.1) / 0.75);
        pushPoint(tmp.x, tmp.y, tmp.z, c, size * nearWall, 0.95 * fadeIn * far);
        pushTrail(tail, tmp, c, 0.55 * fadeIn * far);
        continue;
      }
      const s = dist - len;
      if (challenged) {
        // Attack mode: every visitor is challenged at the wall.
        const t = s / pt.speed;
        const ix = -WALL_X - 0.02;
        if (t < 12) pushPoint(ix, l.endY, l.endZ, violetHot, 0.2, Math.exp(-t / 3.5) * 0.8);
        if (pt.bad) {
          if (t < 26) {
            const sr = rng(pt.seed + 3);
            for (let k = 0; k < 3; k++) {
              const vx = -(0.01 + sr() * 0.03);
              const vy = 0.02 + sr() * 0.05;
              const vz = (sr() - 0.5) * 0.05;
              pushPoint(ix + vx * t, l.endY + vy * t, l.endZ + vz * t, violet, 0.035, Math.max(0, 1 - t / 26));
            }
          }
          continue;
        }
        const ch = this.channels[l.chan];
        if (s > ch.len) continue;
        this.laneOut(l, s, tmp);
        this.laneOut(l, Math.max(0, s - trailLen * 1.6), tail);
        const end = 1 - smooth((s - ch.len + 0.8) / 0.8);
        const tint = Math.exp(-s / 3);
        mixC.copy(goodHot).lerp(violetHot, tint);
        pushPoint(tmp.x, tmp.y, tmp.z, mixC, pt.size * 0.9, 0.9 * end);
        pushTrail(tail, tmp, mixC.copy(good).lerp(violet, tint), 0.7 * end);
        continue;
      }
      if (pt.bad && filtered) {
        // Impact: a flash and a burst of sparks that fall back.
        const t = s / pt.speed; // frames since impact
        if (t < 34) {
          const ix = -WALL_X - 0.02;
          const flash = Math.exp(-t / 5);
          pushPoint(ix, l.endY, l.endZ, goodHot, 0.3 * (1 + t * 0.05), flash * 0.7);
          const sr = rng(pt.seed);
          for (let k = 0; k < 6; k++) {
            const vx = -(0.03 + sr() * 0.09);
            const vy = (sr() - 0.35) * 0.11;
            const vz = (sr() - 0.5) * 0.12;
            const x = ix + vx * t;
            const y = l.endY + vy * t - 0.0032 * t * t;
            const z = l.endZ + vz * t;
            const a = Math.max(0, 1 - t / 34);
            pushPoint(x, y, z, spark, 0.04, a);
            tail.set(x - vx * 3, y - (vy - 0.0064 * t) * 3, z - vz * 3);
            tmp.set(x, y, z);
            pushTrail(tail, tmp, spark, a * 0.7);
          }
        }
        continue;
      }
      if (!filtered) {
        if (s > 16) continue;
        this.laneUnfiltered(l, s, tmp);
        this.laneUnfiltered(l, Math.max(0, s - trailLen), tail);
        const a = 0.95 * (1 - smooth(s / 16));
        const c = pt.bad ? badC : good;
        pushPoint(tmp.x, tmp.y, tmp.z, c, pt.size, a);
        pushTrail(tail, tmp, c, 0.5 * a);
        continue;
      }
      const ch = this.channels[l.chan];
      if (s > ch.len) {
        continue;
      }
      this.laneOut(l, s, tmp);
      this.laneOut(l, Math.max(0, s - trailLen * 1.6), tail);
      const end = 1 - smooth((s - ch.len + 0.8) / 0.8);
      pushPoint(tmp.x, tmp.y, tmp.z, goodHot, pt.size * 0.9, 0.9 * end);
      pushTrail(tail, tmp, good, 0.7 * end);
    }
    void r;

    // Channel end dots.
    const chanOn = this.opts.prebuilt ? 1 : smooth((frame - this.wallReady) / 30);
    this.channels.forEach((ch, k) => {
      const grow = this.opts.prebuilt ? 1 : smooth((frame - this.wallReady - k * 3) / 26);
      const endX = WALL_X + ch.len * grow;
      this.exitPos.set([WALL_X + 1.8, ch.y, ch.z, endX, ch.y, ch.z], k * 6);
      const a = 0.55 * chanOn;
      this.exitCol.set([1, 0.2, 0.42, a * 0.2, 1, 0.2, 0.42, a], k * 8);
      if (grow > 0.02) pushPoint(endX, ch.y, ch.z, goodHot, 0.18, grow);
    });
    (this.exitLines.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.exitLines.geometry.getAttribute("aCol") as THREE.BufferAttribute).needsUpdate = true;

    for (let k = pi; k < this.maxPoints; k++) this.pointAlpha[k] = 0;
    for (let k = ti; k < this.maxTrails; k++) {
      this.trailCol[k * 8 + 3] = 0;
      this.trailCol[k * 8 + 7] = 0;
    }
    const pg = this.points.geometry;
    (pg.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (pg.getAttribute("aColor") as THREE.BufferAttribute).needsUpdate = true;
    (pg.getAttribute("aSize") as THREE.BufferAttribute).needsUpdate = true;
    (pg.getAttribute("aAlpha") as THREE.BufferAttribute).needsUpdate = true;
    const tg = this.trails.geometry;
    (tg.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (tg.getAttribute("aCol") as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateWires(frame: number) {
    const on = smooth(frame / 50);
    const n = this.wireBase.length;
    for (let v = 0; v < n; v++) {
      const base = this.wireBase[v];
      const a = (0.04 + 0.1 * base) * on;
      this.wireCol[v * 4] = 1;
      this.wireCol[v * 4 + 1] = 0.16;
      this.wireCol[v * 4 + 2] = 0.34;
      this.wireCol[v * 4 + 3] = a;
    }
    (this.wires.geometry.getAttribute("aCol") as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateTerrain(frame: number) {
    const t = frame / 60;
    const n = this.terrainCols * this.terrainRows;
    const on = this.opts.prebuilt ? 1 : smooth((frame - this.wallReady + 20) / 60);
    for (let k = 0; k < n; k++) {
      const x = this.terrainBase[k * 2];
      const z = this.terrainBase[k * 2 + 1];
      const y =
        -4.9 +
        Math.sin(x * 0.35 + t * 0.9) * 0.6 +
        Math.sin(z * 0.28 - t * 0.6 + x * 0.1) * 0.7 +
        Math.sin((x + z) * 0.15 + t * 0.4) * 0.5;
      this.terrainPos[k * 3] = x;
      this.terrainPos[k * 3 + 1] = y;
      this.terrainPos[k * 3 + 2] = z;
      const dx = x - 1.5;
      const fadeNear = smooth(dx / 6);
      const dist = Math.hypot(x - this.camera.position.x, z - this.camera.position.z);
      const fadeFar = 1 - smooth((dist - 18) / 22);
      const reveal = smooth((on * 44 - dx) / 8);
      this.terrainAlpha[k] = 0.85 * fadeNear * fadeFar * reveal;
    }
    (this.terrain.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.terrain.geometry.getAttribute("aAlpha") as THREE.BufferAttribute).needsUpdate = true;
  }

  render(frame: number) {
    this.indexHits();
    this.updateCamera(frame);
    this.focus.value = this.camera.position.length();
    this.updateBricks(frame);
    this.updateWires(frame);
    this.updateTraffic(frame);
    this.updateTerrain(frame);
    this.updateShockwave(frame);
    this.composer.render();
  }

  dispose() {
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    this.composer.dispose();
    this.renderer.dispose();
  }
}
