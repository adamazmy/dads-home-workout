/**
 * Builds today's workout from the exercise library, and enforces the back guardrails:
 *  - at most ONE high back-load exercise per session;
 *  - no high back-load exercise within 48 hours of the last one;
 *  - about 6 exercises at most;
 *  - exercises flagged "check with your physio" are never picked automatically –
 *    he can still swap one in on purpose (the rules above then apply).
 * Pure functions (no DOM, no storage) so the rules are unit-tested.
 */
import {
  EQUIPMENT,
  EXERCISES,
  EXERCISE_LIST,
  type Equipment,
  type Exercise,
  type ExerciseId,
  GROUPS,
  type Location,
  type MuscleGroup,
} from '../data/exercises';
import type { Focus, WorkoutLog } from './storage';

export const MAX_EXERCISES = 6;
export const HIGH_LOAD_GAP_HOURS = 48;
const HOUR = 3_600_000;

export const FOCUS_INFO: { id: Focus; name: string; hint: string }[] = [
  { id: 'full', name: 'Full body', hint: 'A bit of everything – the best choice most days' },
  { id: 'upper', name: 'Upper body', hint: 'Chest, back, shoulders and arms' },
  { id: 'lower', name: 'Lower body', hint: 'Legs and glutes, plus some core' },
  { id: 'core', name: 'Core & back', hint: 'Trunk strength and upper back' },
  { id: 'custom', name: 'Custom', hint: 'Tick the muscle groups you want' },
];

/** Which group each slot draws from, in workout order (core always last). */
const TEMPLATES: Record<Exclude<Focus, 'custom'>, MuscleGroup[]> = {
  full: ['legs', 'chest', 'upperBack', 'legs', 'shoulders', 'core'],
  upper: ['chest', 'upperBack', 'shoulders', 'chest', 'upperBack', 'arms'],
  lower: ['legs', 'legs', 'legs', 'legs', 'core', 'core'],
  core: ['upperBack', 'core', 'core', 'core', 'core'],
};

export function slotsFor(focus: Focus, groups: MuscleGroup[] = []): MuscleGroup[] {
  if (focus !== 'custom') return TEMPLATES[focus];
  const chosen = GROUPS.map((g) => g.id).filter((g) => groups.includes(g));
  if (!chosen.length) return [];
  // Round-robin through the chosen groups in display order (core last), up to the cap.
  const slots: MuscleGroup[] = [];
  for (let i = 0; slots.length < MAX_EXERCISES && i < MAX_EXERCISES * chosen.length; i++) slots.push(chosen[i % chosen.length]!);
  return slots;
}

/** Can this exercise be done here, with the equipment he has? */
export function isAvailable(ex: Exercise, location: Location, homeMissing: Equipment[] = []): boolean {
  if (ex.where !== 'both' && ex.where !== location) return false;
  return ex.equipment.every((e) => (location === 'gym' ? EQUIPMENT[e].gym : EQUIPMENT[e].home && !homeMissing.includes(e)));
}

/* ---------------- history helpers ---------------- */

const doneIn = (log: WorkoutLog) => log.exercises.filter((e) => e.sets > 0);

/** The most recent high back-load exercise, if any. */
export function lastHighLoad(history: WorkoutLog[]): { id: ExerciseId; at: Date } | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const log = history[i]!;
    const high = doneIn(log).find((e) => EXERCISES[e.id].backLoad === 'high');
    if (high) return { id: high.id, at: new Date(log.at) };
  }
  return null;
}

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export function daysBetween(earlier: Date, later: Date): number {
  return Math.round((dayStart(later) - dayStart(earlier)) / (24 * HOUR));
}

export function whenText(days: number | null): string {
  if (days === null) return 'Not yet';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/* ---------------- guardrails ---------------- */

export type Availability = { ok: true } | { ok: false; reason: string };

/**
 * Whether `id` may join a session that already contains `others`.
 * Explains the reason in plain words when it may not.
 */
export function checkGuardrails(id: ExerciseId, others: ExerciseId[], history: WorkoutLog[], now = new Date()): Availability {
  const ex = EXERCISES[id];
  if (ex.backLoad !== 'high') return { ok: true };
  const other = others.find((o) => o !== id && EXERCISES[o].backLoad === 'high');
  if (other) return { ok: false, reason: `Only one back-heavy exercise per session – you already have ${EXERCISES[other].name}.` };
  const last = lastHighLoad(history);
  if (last && now.getTime() - last.at.getTime() < HIGH_LOAD_GAP_HOURS * HOUR) {
    const free = new Date(last.at.getTime() + HIGH_LOAD_GAP_HOURS * HOUR);
    const freeText = free.toLocaleDateString('en-GB', { weekday: 'long' });
    return {
      ok: false,
      reason: `Back-heavy – you did ${EXERCISES[last.id].name} ${whenText(daysBetween(last.at, now)).toLowerCase()}. Give your back 48 hours (free again ${freeText}).`,
    };
  }
  return { ok: true };
}

/* ---------------- generation ---------------- */

/** When each exercise was last done (ms), for preferring what he hasn't done lately. */
function lastDoneMap(history: WorkoutLog[]): Map<ExerciseId, number> {
  const map = new Map<ExerciseId, number>();
  for (const log of history) for (const e of doneIn(log)) map.set(e.id, Math.max(map.get(e.id) ?? 0, Date.parse(log.at)));
  return map;
}

export interface GenerateInput {
  location: Location;
  focus: Focus;
  groups?: MuscleGroup[];
  history: WorkoutLog[];
  homeMissing?: Equipment[];
  now?: Date;
  /** Random source for tie-breaks (injectable for tests). */
  rng?: () => number;
}

export function generate({ location, focus, groups = [], history, homeMissing = [], now = new Date(), rng = Math.random }: GenerateInput): ExerciseId[] {
  const lastDone = lastDoneMap(history);
  const chosen: ExerciseId[] = [];
  for (const group of slotsFor(focus, groups)) {
    if (chosen.length >= MAX_EXERCISES) break;
    const candidates = EXERCISE_LIST.filter(
      (ex) =>
        ex.group === group &&
        !ex.flag &&
        !chosen.includes(ex.id) &&
        isAvailable(ex, location, homeMissing) &&
        checkGuardrails(ex.id, chosen, history, now).ok,
    )
      .map((ex) => ({ ex, last: lastDone.get(ex.id) ?? 0, tie: rng() }))
      // Least recently done first; random among equals so workouts vary.
      .sort((a, b) => a.last - b.last || a.tie - b.tie);
    if (candidates[0]) chosen.push(candidates[0].ex.id);
  }
  return chosen;
}

export interface SwapOption {
  ex: Exercise;
  status: Availability;
}

/** Other exercises from the same group that could replace `plan[index]`. */
export function swapOptions(plan: ExerciseId[], index: number, location: Location, history: WorkoutLog[], homeMissing: Equipment[] = [], now = new Date()): SwapOption[] {
  const current = EXERCISES[plan[index]!];
  const others = plan.filter((_, i) => i !== index);
  return EXERCISE_LIST.filter((ex) => ex.group === current.group && ex.id !== current.id && !others.includes(ex.id) && isAvailable(ex, location, homeMissing)).map(
    (ex) => ({ ex, status: checkGuardrails(ex.id, others, history, now) }),
  );
}

/* ---------------- muscle-group recency ---------------- */

export interface GroupRecency {
  group: MuscleGroup;
  name: string;
  /** Calendar days since last trained, or null if never. */
  days: number | null;
}

export function lastTrained(history: WorkoutLog[], now = new Date()): GroupRecency[] {
  return GROUPS.map(({ id, name }) => {
    let latest: Date | null = null;
    for (const log of history) {
      if (doneIn(log).some((e) => EXERCISES[e.id].group === id)) {
        const at = new Date(log.at);
        if (!latest || at > latest) latest = at;
      }
    }
    return { group: id, name, days: latest ? daysBetween(latest, now) : null };
  });
}

/** The group most in need of attention, or null when everything is recent (or no history yet). */
export function mostOverdue(history: WorkoutLog[], now = new Date(), minDays = 4): GroupRecency | null {
  if (!history.length) return null;
  const ranked = lastTrained(history, now).sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
  const top = ranked[0]!;
  return top.days === null || top.days >= minDays ? top : null;
}
