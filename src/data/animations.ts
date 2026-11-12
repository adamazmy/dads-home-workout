/**
 * Pose data for every exercise animation.
 *
 * Read src/anim/skeleton.ts for the angle conventions. In short: world units
 * are cm with y up and the floor at y = 0; angles are global, 0 = up,
 * 90 = forward (the way a standing figure faces), 180 = down.
 *
 * Pose = { torso, head, armN:[upper, fore], armF, legN:[thigh, shin, foot], legF }
 *   N = near side (towards the viewer), F = far side (drawn lighter).
 *
 * Each keyframe lists only what changes. `dur` = seconds to move into the
 * pose (eased in/out), `hold` = seconds to stay there. Contacts that must not
 * slide (feet on the floor, a hand on the chair) are `pins`, solved with IK.
 */
import { BODY, type Pose, STANDING, vec } from '../anim/skeleton';
import type { ExerciseAnimation } from '../anim/timeline';

const A = BODY.ankleH; // ankle joint height when the foot is flat
const onFloor = (x: number) => ({ world: vec(x, A) });
const DEPTH_STAND = vec(-3, 0);
const DEPTH_FLOOR = vec(0, 2.5);

/** Lying on the back, head to the left. */
const SUPINE: Pose = {
  torso: -90,
  head: -80,
  armN: [180, 180],
  armF: [180, 180],
  legN: [40, 140, 90],
  legF: [40, 140, 90],
};

export const goblet: ExerciseAnimation = {
  anchorMode: 'feet',
  anchor: vec(0, A),
  start: STANDING,
  depth: DEPTH_STAND,
  pins: {
    // Hands cup the top of the bell in front of the chest, elbows down in front.
    armN: { rel: 'shoulder', along: -6, fwd: 26 },
    armF: { rel: 'shoulder', along: -6, fwd: 26 },
  },
  props: [{ kind: 'chair', x: -17, facing: 'right' }],
  dumbbells: [{ at: 'armN', view: 'torso' }],
  keyframes: [
    { label: 'Stand up – breathe out', holdLabel: 'Stand tall', dur: 1.5, hold: 1, pose: { torso: 0, head: 0, legN: [180, 180, 90], legF: [180, 180, 90] } },
    {
      label: 'Sit back slowly – 3 s',
      holdLabel: 'Touch the chair – pause',
      dur: 3,
      hold: 1,
      pose: { torso: 38, head: 25, legN: [97, 195, 90], legF: [97, 195, 90] },
    },
  ],
};

export const floorPress: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 11),
  start: SUPINE,
  depth: DEPTH_FLOOR,
  pins: { legN: onFloor(42), legF: onFloor(42) },
  props: [{ kind: 'mat', x1: -95, x2: 70 }],
  dumbbells: [
    { at: 'armN', view: 'end' },
    { at: 'armF', view: 'end' },
  ],
  keyframes: [
    { label: 'Press up – breathe out', dur: 1.5, hold: 0.5, pose: { armN: [0, 0], armF: [0, 0] } },
    {
      label: 'Lower slowly – 3 s',
      holdLabel: 'Elbows touch the floor – pause',
      dur: 3,
      hold: 1,
      pose: { armN: [104, 0], armF: [104, 0] },
    },
  ],
};

export const row: ExerciseAnimation = {
  anchorMode: 'feet',
  anchor: vec(0, A),
  start: { ...STANDING, torso: 65, head: 62, legN: [165, 190, 90], legF: [165, 190, 90] },
  depth: DEPTH_STAND,
  pins: { armF: { world: vec(50, 50) } },
  props: [{ kind: 'chair', x: 40, facing: 'left' }],
  dumbbells: [{ at: 'armN', view: 'grip' }],
  keyframes: [
    { label: 'Lower slowly – 2–3 s', holdLabel: 'Arm long – back flat', dur: 2.5, hold: 0.5, pose: { armN: [180, 180] } },
    { label: 'Pull elbow to hip – breathe out', holdLabel: 'Squeeze – pause', dur: 1.5, hold: 1, pose: { armN: [245, 180] } },
  ],
};

const BRIDGE_FEET = 95;
export const bridge: ExerciseAnimation = {
  anchorMode: 'shoulder',
  anchor: vec(0, 11),
  start: SUPINE,
  depth: DEPTH_FLOOR,
  pins: {
    legN: onFloor(BRIDGE_FEET),
    legF: onFloor(BRIDGE_FEET),
    armN: { rel: 'hip', along: -4, fwd: 14 },
    armF: { rel: 'hip', along: -4, fwd: 14 },
  },
  props: [{ kind: 'mat', x1: -45, x2: 120 }],
  dumbbells: [{ at: 'hip', view: 'end', offset: [0, 13] }],
  keyframes: [
    { label: 'Lower slowly – 2–3 s', dur: 2.5, hold: 0.5, pose: { torso: -90 } },
    { label: 'Push hips up – breathe out', holdLabel: 'Squeeze 2 s – ribs down', dur: 1.5, hold: 2, pose: { torso: 240 } },
  ],
};

const TABLETOP: Partial<Pose> = {
  armN: [0, 0],
  armF: [0, 0],
  legN: [0, 90, 0],
  legF: [0, 90, 0],
};
export const deadBug: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 11),
  start: { ...SUPINE, ...TABLETOP },
  depth: DEPTH_FLOOR,
  props: [{ kind: 'mat', x1: -100, x2: 95 }],
  dumbbells: [],
  keyframes: [
    { label: 'Back to start', holdLabel: 'Arms up, knees over hips', dur: 1.5, hold: 0.5, pose: TABLETOP },
    {
      label: 'Reach arm back, leg out – 3 s',
      holdLabel: 'Low back stays down – breathe out',
      dur: 3,
      hold: 1,
      pose: { armN: [-70, -70], legF: [78, 80, 60] },
    },
    { label: 'Back to start', holdLabel: 'Arms up, knees over hips', dur: 1.5, hold: 0.5, pose: TABLETOP },
    {
      label: 'Other side – 3 s',
      holdLabel: 'Low back stays down – breathe out',
      dur: 3,
      hold: 1,
      pose: { armF: [-70, -70], legN: [78, 80, 60] },
    },
  ],
};

/** Slow walk: stance feet are pinned to the floor so they never slide. */
const STEP = 50;
const SWING: [number, number, number] = [158, 205, 80]; // toes up: lands heel-first
export const carry: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 87),
  start: { ...STANDING, armF: [170, 165] },
  depth: DEPTH_STAND,
  pins: { legN: onFloor(STEP / 2), legF: onFloor(-STEP / 2) },
  props: [],
  dumbbells: [{ at: 'armN', view: 'grip' }],
  keyframes: [
    { label: 'Walk tall – slow steps', dur: 0.01, anchor: vec(0, 87), pins: { legN: onFloor(STEP / 2), legF: onFloor(-STEP / 2) }, pose: { armF: [170, 165] } },
    { label: 'Walk tall – slow steps', dur: 0.8, anchor: vec(STEP / 2, 90), pins: { legF: null }, pose: { legF: SWING, armF: [180, 175] } },
    { label: "Don't lean to the side", dur: 0.8, anchor: vec(STEP, 87), pins: { legF: onFloor(STEP * 1.5) }, pose: { legF: [180, 180, 90], armF: [190, 185] } },
    { label: "Don't lean to the side", dur: 0.8, anchor: vec(STEP * 1.5, 90), pins: { legN: null }, pose: { legN: SWING, armF: [180, 175] } },
    {
      label: 'Shoulders level – breathe',
      holdLabel: 'Turn and switch hands at the end',
      dur: 0.8,
      hold: 1.2,
      anchor: vec(STEP * 2, 87),
      pins: { legN: onFloor(STEP * 2.5) },
      pose: { legN: [180, 180, 90], armF: [170, 165] },
    },
  ],
};

/* ------------------------------ Workout B ------------------------------ */

// Back foot up on the ball of the foot; the ankle rises as the heel lifts, the toes stay put.
const SPLIT_BACK_TOP = { world: vec(-70, 19) };
const SPLIT_BACK_LOW = { world: vec(-63, 21) };
export const splitSquat: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(-25, 86),
  start: { ...STANDING, torso: 4, head: 0, legN: [180, 180, 90], legF: [180, 180, 135] },
  depth: DEPTH_STAND,
  pins: { legN: onFloor(0), legF: SPLIT_BACK_TOP, armN: { world: vec(20, 92) } },
  props: [{ kind: 'chair', x: 63, facing: 'right' }],
  dumbbells: [],
  keyframes: [
    { label: 'Push up through front heel – breathe out', holdLabel: 'Tall – hand on the chair', dur: 1.5, hold: 1, anchor: vec(-25, 86), pins: { legF: SPLIT_BACK_TOP }, pose: { torso: 4, legF: [180, 180, 135] } },
    { label: 'Lower straight down – 3 s', holdLabel: 'Pause – back knee hovers', dur: 3, hold: 1, anchor: vec(-29, 58), pins: { legF: SPLIT_BACK_LOW }, pose: { torso: 6, legF: [180, 180, 155] } },
  ],
};

export const rdl: ExerciseAnimation = {
  anchorMode: 'feet',
  anchor: vec(0, A),
  start: { ...STANDING, legN: [177, 183, 90], legF: [177, 183, 90] },
  depth: DEPTH_STAND,
  props: [],
  dumbbells: [
    { at: 'armN', view: 'end' },
    { at: 'armF', view: 'end' },
  ],
  keyframes: [
    {
      label: 'Stand tall, squeeze glutes – breathe out',
      holdLabel: 'Stand tall',
      dur: 1.5,
      hold: 1,
      pose: { torso: 0, head: 0, armN: [178, 178], armF: [178, 178], legN: [177, 183, 90], legF: [177, 183, 90] },
    },
    {
      label: 'Push hips back slowly – 3 s',
      holdLabel: 'Back flat – stop at your knees',
      dur: 3,
      hold: 0.5,
      pose: { torso: 55, head: 50, armN: [190, 190], armF: [190, 190], legN: [155, 175, 90], legF: [155, 175, 90] },
    },
  ],
};

const STEP_TOP = 18;
const onStep = (x: number) => ({ world: vec(x, STEP_TOP + A) });
export const stepUp: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 91.5),
  start: STANDING,
  depth: DEPTH_STAND,
  pins: { legN: onFloor(0), legF: onFloor(0) },
  props: [{ kind: 'step', x1: 12, x2: 60, h: STEP_TOP }],
  dumbbells: [],
  keyframes: [
    { label: 'Step down – slowly', holdLabel: 'Stand tall', dur: 1.2, hold: 0.8, anchor: vec(0, 91.5), pins: { legN: onFloor(0) }, pose: { torso: 0, head: 0 } },
    { label: 'Lift your foot onto the step', dur: 1.2, anchor: vec(2, 91), pins: { legN: { world: vec(18, 36) } }, pose: { torso: 4, legN: [150, 200, 90] } },
    { label: 'Whole foot on the step', dur: 0.8, hold: 0.4, anchor: vec(6, 90), pins: { legN: onStep(30) }, pose: { torso: 10 } },
    { label: 'Push through heel – breathe out', dur: 1.5, anchor: vec(26, 106), pins: { legF: null }, pose: { torso: 8, legF: [175, 205, 100] } },
    { label: 'Stand tall on the step', holdLabel: 'Stand tall – pause', dur: 0.8, hold: 0.8, anchor: vec(30, 109.5), pins: { legF: onStep(30) }, pose: { torso: 0, legF: [180, 180, 90] } },
    { label: 'Step back down slowly – 2 s', dur: 1.2, anchor: vec(24, 104), pins: { legF: null }, pose: { torso: 6, legF: [190, 200, 110] } },
    { label: 'Step back down slowly – 2 s', dur: 1, anchor: vec(10, 91), pins: { legF: onFloor(0) }, pose: { torso: 8, legF: [180, 180, 90] } },
    { label: 'Bring the other foot down', dur: 1, anchor: vec(3, 91), pins: { legN: { world: vec(14, 34) } }, pose: { torso: 3 } },
  ],
};

export const shoulderPress: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(-2, 55),
  start: { ...STANDING, torso: 0, head: 0, armN: [140, 15] },
  depth: DEPTH_STAND,
  pins: { legN: onFloor(42), legF: onFloor(42), armF: { world: vec(20, 62) } },
  props: [{ kind: 'chair', x: 31, facing: 'right' }],
  dumbbells: [{ at: 'armN', view: 'grip' }],
  keyframes: [
    { label: 'Lower slowly – 3 s', holdLabel: 'Elbow under the weight', dur: 3, hold: 0.5, pose: { armN: [140, 15] } },
    { label: 'Press up – breathe out', holdLabel: "Back stays on the chair – don't arch", dur: 1.5, hold: 0.5, pose: { armN: [6, 6] } },
  ],
};

const QUAD: Pose = {
  torso: 70,
  head: 72,
  armN: [180, 180],
  armF: [180, 180],
  legN: [180, 265, 245],
  legF: [180, 265, 245],
};
const HAND_SPOT = { world: vec(48, 1.5) };
export const birdDog: ExerciseAnimation = {
  anchorMode: 'hip',
  anchor: vec(0, 50),
  start: QUAD,
  depth: DEPTH_STAND,
  pins: { armN: HAND_SPOT, armF: HAND_SPOT },
  props: [{ kind: 'mat', x1: -65, x2: 75 }],
  dumbbells: [],
  keyframes: [
    { label: 'Back to start – slowly', holdLabel: 'Hands under shoulders', dur: 1.5, hold: 0.5, pins: { armN: HAND_SPOT, armF: HAND_SPOT }, pose: { legN: QUAD.legN, legF: QUAD.legF } },
    {
      label: 'Reach arm forward, leg back – 2 s',
      holdLabel: 'Hold – back flat, breathe out',
      dur: 2.5,
      hold: 2,
      pins: { armN: null },
      pose: { armN: [88, 88], legF: [262, 262, 232] },
    },
    { label: 'Back to start – slowly', holdLabel: 'Hands under shoulders', dur: 1.5, hold: 0.5, pins: { armN: HAND_SPOT }, pose: { legF: QUAD.legF } },
    {
      label: 'Other side – 2 s',
      holdLabel: 'Hold – back flat, breathe out',
      dur: 2.5,
      hold: 2,
      pins: { armF: null },
      pose: { armF: [88, 88], legN: [262, 262, 232] },
    },
  ],
};

/** Seen from the front: forearm on the floor, knees bent, hips lift into a straight line. */
export const sidePlank: ExerciseAnimation = {
  plane: 'frontal',
  anchorMode: 'hip',
  anchor: vec(5.3, 9),
  start: { torso: 56, head: 58, armN: [175, 90], armF: [180, 180], legN: [263, 330, 240], legF: [263, 330, 240] },
  depth: vec(-1, 4),
  // Shins, feet and the supporting forearm point into / out of the screen.
  foreshorten: { legN: [1, 0.3, 0.3], legF: [1, 0.3, 0.3], armN: [1, 0.55, 1] },
  pins: { armF: { rel: 'hip', along: 6, fwd: 4 } },
  props: [{ kind: 'mat', x1: -60, x2: 105 }],
  dumbbells: [],
  keyframes: [
    { label: 'Lower hips slowly', holdLabel: 'Rest – breathe', dur: 2, hold: 1, anchor: vec(5.3, 9), pose: { torso: 56, head: 58, armN: [175, 90], legN: [263, 330, 240], legF: [263, 330, 240] } },
    {
      label: 'Lift hips – breathe out',
      holdLabel: 'Hold 20–30 s – keep breathing',
      dur: 1.5,
      hold: 4,
      anchor: vec(2.9, 19.2),
      pose: { torso: 69, head: 70, armN: [180, 90], legN: [249, 316, 226], legF: [249, 316, 226] },
    },
  ],
};

/* Library additions (benches, machines, cables) live in their own file. */
export * from './animations-library';
