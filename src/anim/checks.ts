import { BODY, type Figure, elbowFlexion, kneeFlexion, wrap } from './skeleton';
import type { Timeline } from './timeline';

/** Anatomical limits (degrees). Positive = flexing the natural way. */
export const LIMITS = {
  knee: [-3, 150],
  elbow: [-3, 150],
  hip: [-25, 135], // flexion; negative = extension
  ankle: [-75, 40], // dorsiflexion; negative = pointing the toes
  neck: [-45, 45],
} as const;

const within = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi;
const r = (v: number) => v.toFixed(0);

/** Returns human-readable problems with a single figure (empty = OK). */
export function checkFigure(f: Figure, plane: 'sagittal' | 'frontal' = 'sagittal'): string[] {
  const out: string[] = [];
  const p = f.pose;
  for (const k of ['legN', 'legF'] as const) {
    const knee = kneeFlexion(p[k]);
    if (!within(knee, LIMITS.knee)) out.push(`${k} knee bends ${r(knee)}°`);
    const hip = wrap(p.torso + 180 - p[k][0]);
    if (plane === 'sagittal' && !within(hip, LIMITS.hip)) out.push(`${k} hip flexion ${r(hip)}°`);
    const ankle = wrap(p[k][1] - p[k][2]) - 90;
    if (!within(ankle, LIMITS.ankle)) out.push(`${k} ankle ${r(ankle)}°`);
    for (const part of ['knee', 'heel', 'toe'] as const) {
      if (f[k][part].y < -1) out.push(`${k} ${part} below floor (${f[k][part].y.toFixed(1)})`);
    }
  }
  for (const k of ['armN', 'armF'] as const) {
    const elbow = elbowFlexion(p[k]);
    if (!within(elbow, LIMITS.elbow)) out.push(`${k} elbow bends ${r(elbow)}°`);
    for (const part of ['elbow', 'hand'] as const) {
      if (f[k][part].y < -1) out.push(`${k} ${part} below floor`);
    }
  }
  const neck = wrap(p.head - p.torso);
  if (!within(neck, LIMITS.neck)) out.push(`neck ${r(neck)}°`);
  if (f.head.y - BODY.headR < -1) out.push('head below floor');
  if (f.hip.y < 0 || f.shoulder.y < 0) out.push('trunk below floor');
  if (f.pinError > 1) out.push(`pin misses by ${f.pinError.toFixed(1)} cm`);
  return out;
}

/** Checks every keyframe and a dense sampling of the transitions. */
export function checkTimeline(tl: Timeline, samples = 120): string[] {
  const out = new Set<string>();
  tl.frames.forEach((_, i) => checkFigure(tl.at(i).figure, tl.anim.plane).forEach((m) => out.add(`keyframe ${i}: ${m}`)));
  for (let s = 0; s < samples; s++) {
    const t = (tl.duration * s) / samples;
    checkFigure(tl.sample(t).figure, tl.anim.plane).forEach((m) => out.add(`t=${t.toFixed(1)}s: ${m}`));
  }
  return [...out];
}
