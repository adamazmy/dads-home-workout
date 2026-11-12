/**
 * 2D side-view skeleton: forward kinematics + 2-bone IK.
 *
 * Conventions (used everywhere in the pose data):
 *  - World units are centimetres, y points UP, the floor is y = 0.
 *  - The figure faces +x (right) when standing.
 *  - Every angle is a GLOBAL segment direction in degrees:
 *      0 = pointing straight up, 90 = pointing forward (+x),
 *      180 = pointing straight down, 270 / -90 = pointing backward (-x).
 *  - Segment directions run away from the body: hip→shoulder (torso),
 *    shoulder→head, shoulder→elbow→wrist, hip→knee→ankle, ankle→toes (foot).
 *  - A standing figure is therefore: torso 0, head 0, arms 180/180,
 *    legs 180/180 with the foot at 90 (flat, toes forward).
 */

export interface Vec {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpVec = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

const RAD = Math.PI / 180;

/** Unit vector (times `len`) for a global angle. */
export const dir = (angle: number, len = 1): Vec => ({
  x: Math.sin(angle * RAD) * len,
  y: Math.cos(angle * RAD) * len,
});

/** Global angle of a direction vector. */
export const angleOf = (d: Vec): number => Math.atan2(d.x, d.y) / RAD;

/** Normalise an angle to (-180, 180]. */
export const wrap = (a: number): number => {
  const r = ((((a + 180) % 360) + 360) % 360) - 180;
  return r === -180 ? 180 : r;
};

/** Interpolate angles along the shortest arc. */
export const lerpAngle = (a: number, b: number, t: number): number => a + wrap(b - a) * t;

/**
 * Body proportions for a 175 cm adult, from standard anthropometric
 * segment ratios (Drillis & Contini / Winter).
 */
export const HEIGHT = 175;
export const BODY = {
  torso: 0.288 * HEIGHT, // hip joint → shoulder joint
  neck: 0.053 * HEIGHT, // shoulder → bottom of head
  headR: 0.065 * HEIGHT,
  upperArm: 0.186 * HEIGHT,
  forearm: 0.146 * HEIGHT, // elbow → wrist
  grip: 0.045 * HEIGHT, // wrist → centre of the closed hand
  thigh: 0.245 * HEIGHT,
  shin: 0.246 * HEIGHT, // knee → ankle joint
  ankleH: 0.039 * HEIGHT, // ankle joint above the sole
  heel: 0.04 * HEIGHT, // ankle → back of heel (horizontal)
  toe: 0.115 * HEIGHT, // ankle → toe tip (horizontal)
} as const;

export type ArmAngles = [upper: number, fore: number];
export type LegAngles = [thigh: number, shin: number, foot: number];

export interface Pose {
  torso: number;
  head: number;
  armN: ArmAngles;
  armF: ArmAngles;
  legN: LegAngles;
  legF: LegAngles;
}

export type LimbKey = 'armN' | 'armF' | 'legN' | 'legF';

/**
 * A pin makes a limb's end effector (hand centre or ankle joint) reach a
 * target, solved with IK. World pins are for props (chair, floor spots);
 * relative pins are expressed in the torso frame of a joint, so they follow
 * the body (hands at the chest for a goblet squat, on the hips for a bridge).
 */
export type PinTarget =
  | { world: Vec }
  | { rel: 'shoulder' | 'hip'; along: number; fwd: number };

export type Pins = Partial<Record<LimbKey, PinTarget | null>>;

export type AnchorMode = 'feet' | 'hip' | 'shoulder';

export interface SolveInput {
  pose: Pose;
  anchorMode: AnchorMode;
  /** feet: near ankle joint position; hip: hip joint; shoulder: shoulder joint. */
  anchor: Vec;
  pins?: Pins;
  /** Screen offset of the far side's hip/shoulder, for a sense of depth. */
  depth?: Vec;
  /**
   * Foreshortening per limb: [bone 1, bone 2, foot] length factors (default 1).
   * For a segment pointing into the screen, e.g. the shins in a side plank seen from the front.
   */
  foreshorten?: Partial<Record<LimbKey, [number, number, number]>>;
}

export interface ArmPoints {
  root: Vec;
  elbow: Vec;
  wrist: Vec;
  hand: Vec;
}
export interface LegPoints {
  root: Vec;
  knee: Vec;
  ankle: Vec;
  heel: Vec;
  toe: Vec;
}

export interface Figure {
  pose: Pose;
  hip: Vec;
  shoulder: Vec;
  neckTop: Vec;
  head: Vec;
  armN: ArmPoints;
  armF: ArmPoints;
  legN: LegPoints;
  legF: LegPoints;
  /** Largest distance (cm) between a pin target and the limb end. */
  pinError: number;
}

export const isArm = (k: LimbKey): k is 'armN' | 'armF' => k === 'armN' || k === 'armF';

/** Anatomical bend of a joint: positive = flexing the natural way. */
export const kneeFlexion = (leg: LegAngles): number => wrap(leg[1] - leg[0]);
export const elbowFlexion = (arm: ArmAngles): number => wrap(arm[0] - arm[1]);

type Scale = [number, number, number];
const ONE: Scale = [1, 1, 1];

function armPoints(root: Vec, [upper, fore]: ArmAngles, [s1, s2]: Scale = ONE): ArmPoints {
  const elbow = add(root, dir(upper, BODY.upperArm * s1));
  const wrist = add(elbow, dir(fore, BODY.forearm * s2));
  const hand = add(wrist, dir(fore, BODY.grip * s2));
  return { root, elbow, wrist, hand };
}

function legPoints(root: Vec, [thigh, shin, foot]: LegAngles, [s1, s2, s3]: Scale = ONE): LegPoints {
  const knee = add(root, dir(thigh, BODY.thigh * s1));
  const ankle = add(knee, dir(shin, BODY.shin * s2));
  const along = dir(foot);
  const down = dir(foot + 90);
  const heel = add(ankle, add(scale(along, -BODY.heel * s3), scale(down, BODY.ankleH)));
  const toe = add(ankle, add(scale(along, BODY.toe * s3), scale(down, BODY.ankleH)));
  return { root, knee, ankle, heel, toe };
}

/**
 * Two-bone IK. Returns the global angles of both bones so the chain from
 * `root` reaches `target` (or points straight at it when out of reach),
 * choosing the solution whose middle joint bends the anatomical way.
 */
export function solveTwoBone(
  root: Vec,
  target: Vec,
  l1: number,
  l2: number,
  kind: 'arm' | 'leg',
): [number, number] {
  const d = sub(target, root);
  const reach = Math.min(Math.max(Math.hypot(d.x, d.y), Math.abs(l1 - l2) + 1e-6), l1 + l2 - 1e-6);
  const base = angleOf(d);
  const cosA = (l1 * l1 + reach * reach - l2 * l2) / (2 * l1 * reach);
  const alpha = Math.acos(Math.min(1, Math.max(-1, cosA))) / RAD;
  const candidates = [base + alpha, base - alpha].map((a1): [number, number] => {
    const mid = add(root, dir(a1, l1));
    return [a1, angleOf(sub(target, mid))];
  });
  const flex = ([a1, a2]: [number, number]) => (kind === 'arm' ? wrap(a1 - a2) : wrap(a2 - a1));
  const [a, b] = candidates as [[number, number], [number, number]];
  return flex(a) >= flex(b) ? a : b;
}

export function solve({ pose, anchorMode, anchor, pins = {}, depth = { x: 0, y: 0 }, foreshorten = {} }: SolveInput): Figure {
  const sc = (k: LimbKey): Scale => foreshorten[k] ?? ONE;
  const p: Pose = {
    ...pose,
    armN: [...pose.armN],
    armF: [...pose.armF],
    legN: [...pose.legN],
    legF: [...pose.legF],
  };

  // 1. Place the hip according to the anchor.
  let hip: Vec;
  if (anchorMode === 'feet') {
    const probe = legPoints({ x: 0, y: 0 }, p.legN, sc('legN'));
    hip = sub(anchor, probe.ankle);
  } else if (anchorMode === 'hip') {
    hip = anchor;
  } else {
    hip = sub(anchor, dir(p.torso, BODY.torso));
  }
  const shoulder = add(hip, dir(p.torso, BODY.torso));
  const neckTop = add(shoulder, dir(p.head, BODY.neck));
  const head = add(shoulder, dir(p.head, BODY.neck + BODY.headR));

  const roots: Record<LimbKey, Vec> = {
    armN: shoulder,
    armF: add(shoulder, depth),
    legN: hip,
    legF: add(hip, depth),
  };

  // 2. Resolve pins with IK.
  let pinError = 0;
  const targetOf = (t: PinTarget): Vec => {
    if ('world' in t) return t.world;
    const base = t.rel === 'shoulder' ? shoulder : hip;
    return add(base, add(dir(p.torso, t.along), dir(p.torso + 90, t.fwd)));
  };
  for (const key of Object.keys(pins) as LimbKey[]) {
    const pin = pins[key];
    if (!pin) continue;
    if (key === 'legN' && anchorMode === 'feet') continue; // already anchored
    const target = targetOf(pin);
    if (isArm(key)) {
      const [s1, s2] = sc(key);
      const [a1, a2] = solveTwoBone(roots[key], target, BODY.upperArm * s1, (BODY.forearm + BODY.grip) * s2, 'arm');
      p[key] = [a1, a2];
    } else {
      const [s1, s2] = sc(key);
      const [a1, a2] = solveTwoBone(roots[key], target, BODY.thigh * s1, BODY.shin * s2, 'leg');
      p[key] = [a1, a2, p[key][2]];
    }
  }

  const fig: Figure = {
    pose: p,
    hip,
    shoulder,
    neckTop,
    head,
    armN: armPoints(roots.armN, p.armN, sc('armN')),
    armF: armPoints(roots.armF, p.armF, sc('armF')),
    legN: legPoints(roots.legN, p.legN, sc('legN')),
    legF: legPoints(roots.legF, p.legF, sc('legF')),
    pinError: 0,
  };

  for (const key of Object.keys(pins) as LimbKey[]) {
    const pin = pins[key];
    if (!pin || (key === 'legN' && anchorMode === 'feet')) continue;
    const end = isArm(key) ? fig[key].hand : fig[key].ankle;
    pinError = Math.max(pinError, dist(end, targetOf(pin)));
  }
  fig.pinError = pinError;
  return fig;
}

/** Interpolate two poses along the shortest arcs. */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const la = (x: number, y: number) => lerpAngle(x, y, t);
  return {
    torso: la(a.torso, b.torso),
    head: la(a.head, b.head),
    armN: [la(a.armN[0], b.armN[0]), la(a.armN[1], b.armN[1])],
    armF: [la(a.armF[0], b.armF[0]), la(a.armF[1], b.armF[1])],
    legN: [la(a.legN[0], b.legN[0]), la(a.legN[1], b.legN[1]), la(a.legN[2], b.legN[2])],
    legF: [la(a.legF[0], b.legF[0]), la(a.legF[1], b.legF[1]), la(a.legF[2], b.legF[2])],
  };
}

export const STANDING: Pose = {
  torso: 0,
  head: 0,
  armN: [180, 180],
  armF: [180, 180],
  legN: [180, 180, 90],
  legF: [180, 180, 90],
};
