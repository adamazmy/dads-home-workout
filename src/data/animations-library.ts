/**
 * Pose data for the library additions: benches, machines and cables.
 * Same conventions as ./animations.ts (cm, y up, floor y = 0, global angles:
 * 0 = up, 90 = forward, 180 = down). Re-exported from ./animations.ts.
 */
import { BODY, type Pose, STANDING, type Vec, vec } from '../anim/skeleton';
import type { ExerciseAnimation, Prop } from '../anim/timeline';

const A = BODY.ankleH;
const onFloor = (x: number) => ({ world: vec(x, A) });
const DEPTH_STAND = vec(-3, 0);
const DEPTH_FLOOR = vec(0, 2.5);

const pad = (...paths: Vec[][]): Prop => ({ kind: 'lines', style: 'pad', paths });
const frame = (...paths: Vec[][]): Prop => ({ kind: 'lines', style: 'frame', paths });
const BENCH_H = 45; // top of a standard bench pad

/** Flat bench seen side-on, pad top at `h`. */
function flatBench(x1: number, x2: number, h = BENCH_H): Prop[] {
  return [
    pad([vec(x1, h - 3.5), vec(x2, h - 3.5)]),
    frame(
      [vec(x1 + 8, h - 7), vec(x1 + 8, 0)],
      [vec(x2 - 8, h - 7), vec(x2 - 8, 0)],
      [vec(x1 + 1, 0), vec(x1 + 15, 0)],
      [vec(x2 - 15, 0), vec(x2 - 1, 0)],
    ),
  ];
}

/** Machine seat with a backrest 11 cm behind the spine (hip at `hip`, torso angle `torso`). */
function machineSeat(hip: Vec, torso: number, seatX2: number, backLen = 62): Prop[] {
  const rad = (torso * Math.PI) / 180;
  const back = vec(hip.x - 11 * Math.cos(rad), hip.y - 2 + 11 * Math.sin(rad));
  const top = vec(back.x + backLen * Math.sin(rad), back.y + backLen * Math.cos(rad));
  return [
    pad([vec(hip.x - 12, 42.5), vec(seatX2, 42.5)], [back, top]),
    frame([vec(hip.x + 4, 39), vec(hip.x + 4, 0)], [vec(hip.x - 22, 0), vec(seatX2 + 6, 0)], [vec(back.x - 4, back.y - 6), vec(hip.x + 4, 30)]),
  ];
}

const SEATED: Pose = { ...STANDING, torso: 0, head: 0 };
/** Lying on the back on a bench, head to the left, resting on the pad. */
const SUPINE_BENCH: Pose = {
  torso: -90,
  head: -86,
  armN: [0, 0],
  armF: [0, 0],
  legN: [40, 140, 90],
  legF: [40, 140, 90],
};

/* ----------------------------- Chest ----------------------------- */

export const benchPress: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 55), // spine 10 cm above the pad
  start: SUPINE_BENCH,
  depth: DEPTH_FLOOR,
  pins: { legN: onFloor(42), legF: onFloor(42) },
  props: flatBench(-88, 24),
  dumbbells: [
    { at: 'armN', view: 'end' },
    { at: 'armF', view: 'end' },
  ],
  keyframes: [
    { label: 'Press up – breathe out', dur: 1.5, hold: 0.5, pose: { armN: [0, 0], armF: [0, 0] } },
    { label: 'Lower slowly – 3 s', holdLabel: 'Elbows level with the bench – pause', dur: 3, hold: 0.8, pose: { armN: [100, 0], armF: [100, 0] } },
  ],
};

/** 30° incline: back pad parallel to the spine, 10 cm behind it. */
export const inclinePress: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 54),
  start: { ...SEATED, torso: -60, head: -60 },
  depth: DEPTH_FLOOR,
  pins: { legN: onFloor(40), legF: onFloor(40) },
  props: [
    pad([vec(-5, 41.5), vec(30, 41.5)], [vec(-5, 43), vec(-74, 83)]),
    frame([vec(24, 38), vec(24, 0)], [vec(-40, 62), vec(-40, 0)], [vec(-55, 0), vec(32, 0)]),
  ],
  dumbbells: [
    { at: 'armN', view: 'end' },
    { at: 'armF', view: 'end' },
  ],
  keyframes: [
    { label: 'Press up – breathe out', dur: 1.5, hold: 0.5, pose: { armN: [0, 0], armF: [0, 0] } },
    { label: 'Lower slowly – 3 s', holdLabel: 'Weights by your chest – pause', dur: 3, hold: 0.8, pose: { armN: [145, 5], armF: [145, 5] } },
  ],
};

/** Hands on the bench, body one straight line from heels to head, pivoting at the toes. */
const PUSHUP_TOES: Pose['legN'] = [228.5, 228.5, 150];
const PUSHUP_FEET = { world: vec(0, 20.7) }; // ankle height when up on the toes
const PUSHUP_HANDS = { world: vec(107, 47) };
export const inclinePushup: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(64, 77.3),
  start: { ...STANDING, torso: 48.5, head: 48.5, legN: PUSHUP_TOES, legF: PUSHUP_TOES },
  depth: DEPTH_STAND,
  pins: { legN: PUSHUP_FEET, legF: PUSHUP_FEET, armN: PUSHUP_HANDS, armF: PUSHUP_HANDS },
  props: flatBench(104, 205),
  dumbbells: [],
  keyframes: [
    { label: 'Push away – breathe out', holdLabel: 'Straight line, heels to head', dur: 1.5, hold: 0.5, anchor: vec(64, 77.3), pose: { torso: 48.5, head: 48.5 } },
    { label: 'Lower your chest to the bench – 2–3 s', holdLabel: 'Body stays straight – pause', dur: 2.5, hold: 0.5, anchor: vec(72.5, 66), pose: { torso: 58, head: 58 } },
  ],
};

export const chestPressMachine: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 55),
  start: { ...SEATED, torso: -10, head: -5, armN: [215, 80], armF: [215, 80] },
  depth: DEPTH_STAND,
  pins: { legN: onFloor(45), legF: onFloor(45) },
  props: [
    ...machineSeat(vec(0, 55), -10, 30, 70),
    frame([vec(-45, 0), vec(-45, 190), vec(60, 190), vec(60, 165)]),
    { kind: 'cable', style: 'lever', from: vec(58, 165), to: ['armN', 'armF'] },
  ],
  dumbbells: [
    { at: 'armN', view: 'handle' },
    { at: 'armF', view: 'handle' },
  ],
  keyframes: [
    { label: 'Come back slowly – 3 s', holdLabel: 'Handles by your chest', dur: 3, hold: 0.5, pose: { armN: [215, 80], armF: [215, 80] } },
    { label: 'Push forward – breathe out', holdLabel: "Don't lock your elbows", dur: 1.5, hold: 0.5, pose: { armN: [95, 95], armF: [95, 95] } },
  ],
};

/* ----------------------------- Upper back ----------------------------- */

/** Face-down on a 45° incline bench, feet on the floor behind. */
const PRONE_INCLINE: Prop[] = [
  pad([vec(-22, 47), vec(52, 121)], [vec(-60, 41.5), vec(-24, 41.5)]),
  frame([vec(-54, 38), vec(-54, 0)], [vec(-30, 38), vec(-30, 0)], [vec(-6, 60), vec(-6, 0)], [vec(-62, 0), vec(4, 0)]),
];
const PRONE_POSE: Pose = { ...STANDING, torso: 45, head: 45 };

export const chestSupportedRow: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 88),
  start: PRONE_POSE,
  depth: DEPTH_STAND,
  pins: { legN: onFloor(-25), legF: onFloor(-25) },
  props: PRONE_INCLINE,
  dumbbells: [
    { at: 'armN', view: 'grip' },
    { at: 'armF', view: 'grip' },
  ],
  keyframes: [
    { label: 'Lower slowly – 2–3 s', holdLabel: 'Arms long – chest on the pad', dur: 2.5, hold: 0.5, pose: { armN: [180, 180], armF: [180, 180] } },
    { label: 'Pull elbows back – breathe out', holdLabel: 'Squeeze shoulder blades – pause', dur: 1.5, hold: 1, pose: { armN: [235, 180], armF: [235, 180] } },
  ],
};

export const latPulldown: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 55),
  start: { ...SEATED, torso: -12, head: -8, armN: [5, 5], armF: [5, 5] },
  depth: DEPTH_STAND,
  // Wide grip: the upper arms point partly out to the sides, so they look shorter side-on.
  foreshorten: { armN: [0.75, 1, 1], armF: [0.75, 1, 1] },
  pins: { legN: onFloor(40), legF: onFloor(40) },
  props: [
    pad([vec(-14, 42.5), vec(28, 42.5)]),
    frame(
      [vec(4, 39), vec(4, 0)],
      [vec(-75, 0), vec(40, 0)],
      [vec(-55, 0), vec(-55, 222), vec(-4, 222)],
      [vec(-78, 15), vec(-62, 15), vec(-62, 110), vec(-78, 110), vec(-78, 15)],
      [vec(28, 75), vec(40, 75), vec(40, 0)],
    ),
    { kind: 'circle', style: 'pad', c: vec(32, 72), r: 6.5 },
    { kind: 'cable', style: 'cable', from: vec(-4, 218), to: ['armN'] },
  ],
  dumbbells: [
    { at: 'armN', view: 'handle' },
    { at: 'armF', view: 'handle' },
  ],
  keyframes: [
    { label: 'Let the bar up slowly – 3 s', holdLabel: 'Arms long, shoulders down', dur: 3, hold: 0.5, pose: { armN: [5, 5], armF: [5, 5] } },
    { label: 'Pull to your upper chest – breathe out', holdLabel: 'Elbows down – pause', dur: 1.5, hold: 0.8, pose: { armN: [165, 25], armF: [165, 25] } },
  ],
};

export const cableRow: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 53),
  start: { ...SEATED, armN: [100, 100], armF: [100, 100], legN: [60, 120, 20], legF: [60, 120, 20] },
  depth: DEPTH_STAND,
  pins: { legN: { world: vec(70, 34) }, legF: { world: vec(70, 34) } },
  props: [
    pad([vec(-50, 40.5), vec(40, 40.5)]),
    frame([vec(-40, 37), vec(-40, 0)], [vec(30, 37), vec(30, 0)], [vec(-55, 0), vec(130, 0)], [vec(84, 0), vec(84, 20)], [vec(120, 0), vec(120, 70)]),
    { kind: 'footplate', limb: 'legN' },
    { kind: 'cable', style: 'cable', from: vec(116, 30), to: ['armN'] },
  ],
  dumbbells: [
    { at: 'armN', view: 'handle' },
    { at: 'armF', view: 'handle' },
  ],
  keyframes: [
    { label: 'Arms forward slowly – 3 s', holdLabel: "Sit tall – don't lean forward", dur: 3, hold: 0.5, pose: { armN: [100, 100], armF: [100, 100] } },
    { label: 'Pull to your tummy – breathe out', holdLabel: 'Squeeze shoulder blades – pause', dur: 1.5, hold: 0.8, pose: { armN: [210, 95], armF: [210, 95] } },
  ],
};

/* ----------------------------- Legs ----------------------------- */

const LEGPRESS_HIP = vec(0, 55);
export const legPress: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: LEGPRESS_HIP,
  start: { ...SEATED, torso: -25, head: -20, legN: [40, 150, 30], legF: [40, 150, 30] },
  depth: DEPTH_STAND,
  pins: { legN: { world: vec(52, 72) }, legF: { world: vec(52, 72) }, armN: { world: vec(12, 50) }, armF: { world: vec(12, 50) } },
  props: [
    ...machineSeat(LEGPRESS_HIP, -25, 22, 72),
    frame([vec(22, 0), vec(140, 0)], [vec(50, 46), vec(125, 46)], [vec(125, 0), vec(125, 46)]),
    { kind: 'footplate', limb: 'legN' },
  ],
  dumbbells: [],
  keyframes: [
    {
      label: 'Bend your knees slowly – 3 s',
      holdLabel: 'Stop before your hips lift',
      dur: 3,
      hold: 0.5,
      pins: { legN: { world: vec(52, 72) }, legF: { world: vec(52, 72) } },
      pose: { legN: [40, 150, 30], legF: [40, 150, 30] },
    },
    {
      label: 'Push through your heels – breathe out',
      holdLabel: "Knees soft – don't lock",
      dur: 1.5,
      hold: 0.5,
      pins: { legN: { world: vec(81, 72) }, legF: { world: vec(81, 72) } },
      pose: { legN: [80, 100, 15], legF: [80, 100, 15] },
    },
  ],
};

export const legCurl: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 55),
  start: { ...SEATED, torso: -10, head: -5, legN: [90, 95, 5], legF: [90, 95, 5] },
  depth: DEPTH_STAND,
  pins: { armN: { world: vec(20, 58) }, armF: { world: vec(20, 58) } },
  props: [
    ...machineSeat(vec(0, 55), -10, 40, 62),
    { kind: 'circle', style: 'pad', c: vec(32, 68), r: 6 },
    frame([vec(32, 74), vec(32, 90), vec(-30, 90)]),
    { kind: 'roller', limb: 'legN', along: 0.86, r: 6 },
  ],
  dumbbells: [],
  keyframes: [
    { label: 'Let your legs out slowly – 3 s', holdLabel: 'Legs almost straight', dur: 3, hold: 0.5, pose: { legN: [90, 95, 5], legF: [90, 95, 5] } },
    { label: 'Pull your heels down and back – breathe out', holdLabel: 'Squeeze – pause', dur: 1.5, hold: 0.8, pose: { legN: [90, 190, 100], legF: [90, 190, 100] } },
  ],
};

/* ----------------------------- Core & lower back ----------------------------- */

/**
 * 45° back extension bench. Legs stay straight at 45°; the hinge is at the
 * hips only, partial range, and the top is a straight line – never past it.
 */
const BACKEXT_FEET = { world: vec(0, 20) };
const BACKEXT_LEG: Pose['legN'] = [225, 225, 112]; // footplate tilted so the ankle isn't over-bent
export const backExtension: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(60.4, 80.4),
  start: { ...STANDING, torso: 45, head: 45, legN: BACKEXT_LEG, legF: BACKEXT_LEG },
  depth: DEPTH_STAND,
  pins: {
    legN: BACKEXT_FEET,
    legF: BACKEXT_FEET,
    // Arms folded in front of the chest, elbows down (a closer target would flip the elbows up).
    armN: { rel: 'shoulder', along: -8, fwd: 26 },
    armF: { rel: 'shoulder', along: -8, fwd: 26 },
  },
  props: [
    pad([vec(51.9, 57.8), vec(68.9, 74.8)]),
    { kind: 'circle', style: 'pad', c: vec(-1.5, 30), r: 5.5 },
    { kind: 'footplate', limb: 'legN' },
    frame([vec(-22, 0), vec(78, 0)], [vec(60, 60), vec(46, 24), vec(46, 0)], [vec(2, 9), vec(46, 24)], [vec(-1.5, 30), vec(-6, 8)]),
  ],
  dumbbells: [],
  keyframes: [
    { label: 'Rise slowly – breathe out', holdLabel: 'Straight line – no further', dur: 2, hold: 1, pose: { torso: 45, head: 45 } },
    { label: 'Hinge down slowly – 3 s', holdLabel: 'Back flat – only partway down', dur: 3, hold: 0.5, pose: { torso: 112, head: 112 } },
  ],
};

const STAND_SOFT: Pose = { ...STANDING, legN: [178, 182, 90], legF: [178, 182, 90] };

export const pallof: ExerciseAnimation = {
  anchorMode: 'feet',
  anchor: vec(0, A),
  start: { ...STAND_SOFT, armN: [190, 70], armF: [190, 70] },
  depth: DEPTH_STAND,
  props: [
    // The cable comes from beside him (into the picture): just the pulley and a dashed cable.
    { kind: 'cable', style: 'cable', from: vec(18, 121), to: ['armN'], depthHint: true },
  ],
  dumbbells: [{ at: 'armN', view: 'handle' }],
  keyframes: [
    { label: 'Bring hands back to your chest', holdLabel: 'Hands at your chest', dur: 1.5, hold: 0.5, pose: { armN: [190, 70], armF: [190, 70] } },
    { label: 'Press straight out – breathe out', holdLabel: "Hold 2 s – don't let it twist you", dur: 1.5, hold: 2, pose: { armN: [92, 92], armF: [92, 92] } },
  ],
};

/* ----------------------------- Shoulders ----------------------------- */

const ON_BENCH_END = flatBench(-62, 12);

/** Raised about 30° forward of sideways (shoulder-friendly), so side-on the arm looks shorter at the top. */
export const scaption: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 54),
  start: SEATED,
  depth: DEPTH_STAND,
  pins: { legN: onFloor(42), legF: onFloor(42) },
  props: ON_BENCH_END,
  dumbbells: [
    { at: 'armN', view: 'grip' },
    { at: 'armF', view: 'grip' },
  ],
  keyframes: [
    {
      label: 'Lower slowly – 3 s',
      holdLabel: 'Arms by your sides',
      dur: 3,
      hold: 0.5,
      foreshorten: { armN: [1, 1, 1], armF: [1, 1, 1] },
      pose: { armN: [180, 180], armF: [180, 180] },
    },
    {
      label: 'Raise to shoulder height – breathe out',
      holdLabel: 'Thumbs up – no higher',
      dur: 1.5,
      hold: 0.5,
      foreshorten: { armN: [0.5, 0.5, 1], armF: [0.5, 0.5, 1] },
      pose: { armN: [90, 85], armF: [90, 85] },
    },
  ],
};

export const proneY: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 88),
  start: PRONE_POSE,
  depth: DEPTH_STAND,
  pins: { legN: onFloor(-25), legF: onFloor(-25) },
  props: PRONE_INCLINE,
  dumbbells: [],
  keyframes: [
    { label: 'Lower slowly – 3 s', holdLabel: 'Arms hanging, chest on the pad', dur: 3, hold: 0.5, pose: { armN: [180, 180], armF: [180, 180] } },
    { label: 'Raise arms in a Y – breathe out', holdLabel: 'In line with your body – pause', dur: 2, hold: 1, pose: { armN: [48, 48], armF: [48, 48] } },
  ],
};

export const machineShoulderPress: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(-2, 55),
  start: { ...SEATED, armN: [150, 15], armF: [150, 15] },
  depth: DEPTH_STAND,
  pins: { legN: onFloor(42), legF: onFloor(42) },
  props: [...machineSeat(vec(-2, 55), 0, 28, 72), frame([vec(-50, 0), vec(-50, 205), vec(20, 205)])],
  dumbbells: [
    { at: 'armN', view: 'handle' },
    { at: 'armF', view: 'handle' },
  ],
  keyframes: [
    { label: 'Lower slowly – 3 s', holdLabel: 'Handles at shoulder height', dur: 3, hold: 0.5, pose: { armN: [150, 15], armF: [150, 15] } },
    { label: 'Press up – breathe out', holdLabel: "Back stays on the pad – don't arch", dur: 1.5, hold: 0.5, pose: { armN: [8, 8], armF: [8, 8] } },
  ],
};

/* ----------------------------- Arms ----------------------------- */

const curlFrames = (top: number): ExerciseAnimation['keyframes'] => [
  { label: 'Lower slowly – 3 s', holdLabel: 'Arms long', dur: 3, hold: 0.5, pose: { armN: [180, 180], armF: [180, 180] } },
  { label: 'Curl up – breathe out', holdLabel: 'Elbows stay by your sides', dur: 1.5, hold: 0.5, pose: { armN: [176, top], armF: [176, top] } },
];

export const curl: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 54),
  start: SEATED,
  depth: DEPTH_STAND,
  pins: { legN: onFloor(42), legF: onFloor(42) },
  props: ON_BENCH_END,
  dumbbells: [
    { at: 'armN', view: 'end' },
    { at: 'armF', view: 'end' },
  ],
  keyframes: curlFrames(35),
};

export const hammerCurl: ExerciseAnimation = {
  ...curl,
  dumbbells: [
    { at: 'armN', view: 'grip' },
    { at: 'armF', view: 'grip' },
  ],
  keyframes: curlFrames(40),
};

export const lyingTriceps: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 55),
  start: { ...SUPINE_BENCH, armN: [-10, -10], armF: [-10, -10] },
  depth: DEPTH_FLOOR,
  pins: { legN: onFloor(42), legF: onFloor(42) },
  props: flatBench(-88, 24),
  dumbbells: [
    { at: 'armN', view: 'grip' },
    { at: 'armF', view: 'grip' },
  ],
  keyframes: [
    { label: 'Straighten your arms – breathe out', holdLabel: 'Upper arms stay still', dur: 1.5, hold: 0.5, pose: { armN: [-10, -10], armF: [-10, -10] } },
    { label: 'Bend elbows slowly – 3 s', holdLabel: 'Weights beside your head – pause', dur: 3, hold: 0.5, pose: { armN: [-10, -100], armF: [-10, -100] } },
  ],
};

export const pushdown: ExerciseAnimation = {
  anchorMode: 'feet',
  anchor: vec(0, A),
  start: { ...STAND_SOFT, torso: 8, head: 5, armN: [182, 60], armF: [182, 60] },
  depth: DEPTH_STAND,
  props: [frame([vec(48, 0), vec(48, 212), vec(36, 212)]), { kind: 'cable', style: 'cable', from: vec(36, 206), to: ['armN'] }],
  dumbbells: [
    { at: 'armN', view: 'handle' },
    { at: 'armF', view: 'handle' },
  ],
  keyframes: [
    { label: 'Let it up slowly – 3 s', holdLabel: 'Elbows tucked in', dur: 3, hold: 0.5, pose: { armN: [182, 60], armF: [182, 60] } },
    { label: 'Push down – breathe out', holdLabel: 'Arms straight – pause', dur: 1.5, hold: 0.5, pose: { armN: [182, 182], armF: [182, 182] } },
  ],
};

export const cableCurl: ExerciseAnimation = {
  anchorMode: 'feet',
  anchor: vec(0, A),
  start: STAND_SOFT,
  depth: DEPTH_STAND,
  props: [frame([vec(52, 0), vec(52, 200)]), { kind: 'cable', style: 'cable', from: vec(46, 14), to: ['armN'] }],
  dumbbells: [
    { at: 'armN', view: 'handle' },
    { at: 'armF', view: 'handle' },
  ],
  keyframes: curlFrames(35),
};
