import {
  type AnchorMode,
  type Figure,
  type LimbKey,
  type PinTarget,
  type Pins,
  type Pose,
  type SolveInput,
  type Vec,
  lerp,
  lerpPose,
  lerpVec,
  solve,
} from './skeleton';

/** Static scenery drawn behind the figure. Coordinates in cm, y up. */
export type Prop =
  /** `x` = front edge of the seat; `facing` = the way a seated person would face. */
  | { kind: 'chair'; x: number; facing: 'left' | 'right'; seat?: number; depth?: number; back?: number }
  | { kind: 'mat'; x1: number; x2: number }
  | { kind: 'step'; x1: number; x2: number; h: number };

export interface DumbbellSpec {
  /** Which hand holds it, or `hip` for a dumbbell resting across the hips. */
  at: 'armN' | 'armF' | 'hip';
  /**
   * How the dumbbell is seen: `end` = handle points at the camera (a disc),
   * `grip` = handle across the palm in the plane of the picture (neutral grip),
   * `torso` = handle parallel to the spine (goblet hold), or a fixed global angle.
   */
  view: 'end' | 'grip' | 'torso' | number;
  /** Offset in the torso frame when `at` is `hip`: [along spine, forward]. */
  offset?: [number, number];
}

export interface Keyframe {
  /** Angles that change at this keyframe; everything else carries over. */
  pose?: Partial<Pose>;
  /** Seconds to move from the previous keyframe into this one. */
  dur: number;
  /** Seconds to hold this pose once reached. */
  hold?: number;
  /** Phase label shown while moving into this pose. */
  label: string;
  /** Optional different label while holding. */
  holdLabel?: string;
  anchor?: Vec;
  /** Pins that change at this keyframe (null removes a pin). */
  pins?: Pins;
}

export interface ExerciseAnimation {
  /** `frontal` = seen from the front (side plank): sagittal hip limits don't apply. */
  plane?: 'sagittal' | 'frontal';
  anchorMode: AnchorMode;
  anchor: Vec;
  start: Pose;
  pins?: Pins;
  depth?: Vec;
  foreshorten?: SolveInput['foreshorten'];
  props: Prop[];
  dumbbells: DumbbellSpec[];
  keyframes: Keyframe[];
}

interface ResolvedFrame {
  kf: Keyframe;
  pose: Pose;
  anchor: Vec;
  pins: Pins;
  figure: Figure;
  startTime: number; // when the move into this frame starts
}

export interface Sample {
  figure: Figure;
  label: string;
  /** Index of the keyframe being moved to / held. */
  index: number;
}

export const easeInOut = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

function lerpPin(a: PinTarget, b: PinTarget, t: number): PinTarget | null {
  if ('world' in a && 'world' in b) return { world: lerpVec(a.world, b.world, t) };
  if ('rel' in a && 'rel' in b && a.rel === b.rel) {
    return { rel: a.rel, along: lerp(a.along, b.along, t), fwd: lerp(a.fwd, b.fwd, t) };
  }
  return null;
}

/** Pre-solves every keyframe so playback only has to interpolate. */
export class Timeline {
  readonly frames: ResolvedFrame[];
  readonly duration: number;

  constructor(readonly anim: ExerciseAnimation) {
    let pose = anim.start;
    let anchor = anim.anchor;
    let pins: Pins = { ...anim.pins };
    let time = 0;
    this.frames = anim.keyframes.map((kf) => {
      pose = { ...pose, ...kf.pose };
      anchor = kf.anchor ?? anchor;
      pins = { ...pins, ...kf.pins };
      const figure = solve({ pose, anchorMode: anim.anchorMode, anchor, pins, depth: anim.depth, foreshorten: anim.foreshorten });
      const frame: ResolvedFrame = { kf, pose: figure.pose, anchor, pins, figure, startTime: time };
      time += kf.dur + (kf.hold ?? 0);
      return frame;
    });
    this.duration = time;
  }

  /** Figure at keyframe `i` exactly (used by thumbnails and the pose check). */
  at(i: number): Sample {
    const f = this.frames[i]!;
    return { figure: f.figure, label: f.kf.holdLabel ?? f.kf.label, index: i };
  }

  sample(time: number): Sample {
    const t = ((time % this.duration) + this.duration) % this.duration;
    let i = this.frames.length - 1;
    while (i > 0 && this.frames[i]!.startTime > t) i--;
    const to = this.frames[i]!;
    const from = this.frames[(i - 1 + this.frames.length) % this.frames.length]!;
    const local = t - to.startTime;
    if (local >= to.kf.dur) {
      return { figure: to.figure, label: to.kf.holdLabel ?? to.kf.label, index: i };
    }
    const s = easeInOut(local / to.kf.dur);
    const pins: Pins = {};
    for (const key of Object.keys(to.pins) as LimbKey[]) {
      const a = from.pins[key];
      const b = to.pins[key];
      if (a && b) pins[key] = lerpPin(a, b, s);
    }
    const figure = solve({
      pose: lerpPose(from.pose, to.pose, s),
      anchorMode: this.anim.anchorMode,
      anchor: lerpVec(from.anchor, to.anchor, s),
      pins,
      depth: this.anim.depth,
      foreshorten: this.anim.foreshorten,
    });
    return { figure, label: to.kf.label, index: i };
  }
}
