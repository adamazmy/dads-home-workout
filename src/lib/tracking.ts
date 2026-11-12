/**
 * Recording what was lifted: what to measure for each exercise, sensible pre-filled
 * values, "last time" summaries and a gentle progression hint.
 * Pure functions (no DOM, no storage) so they are unit-tested.
 */
import { EXERCISES, type Exercise, type ExerciseId } from '../data/exercises';
import type { SetEntry, WorkoutLog } from './storage';

export type Amount = 'reps' | 'secs' | 'metres';
export type Load = 'dumbbell' | 'stack' | 'none';

export interface Tracking {
  amount: Amount;
  /** Unit label shown next to the amount, e.g. "reps each side". */
  amountLabel: string;
  amountStep: number;
  amountMax: number;
  load: Load;
  loadLabel: string;
  loadStep: number;
  loadMax: number;
  /** Target range parsed from the dose, e.g. 8–12. */
  range: [number, number];
}

/** Exercises timed or measured in distance rather than counted in reps. */
const AMOUNT_OVERRIDES: Partial<Record<ExerciseId, Amount>> = { sidePlank: 'secs', carry: 'metres' };

/** "8–12 reps" → [8, 12]; "10 reps each arm" → [10, 10]. */
export function parseRange(dose: string): [number, number] {
  const m = dose.match(/(\d+)\s*(?:[–-]\s*(\d+))?/);
  if (!m) return [10, 10];
  const lo = Number(m[1]);
  return [lo, m[2] ? Number(m[2]) : lo];
}

export function trackingFor(ex: Exercise): Tracking {
  const amount = AMOUNT_OVERRIDES[ex.id] ?? 'reps';
  const each = ex.dose.match(/each (side|leg|arm)/)?.[0];
  const load: Load = ex.equipment.some((e) => e === 'machine' || e === 'cable') ? 'stack' : ex.equipment.includes('dumbbells') ? 'dumbbell' : 'none';
  return {
    amount,
    amountLabel: amount === 'secs' ? `seconds${each ? ` ${each}` : ''}` : amount === 'metres' ? `metres${each ? ` ${each}` : ''}` : `reps${each ? ` ${each}` : ''}`,
    amountStep: amount === 'secs' || amount === 'metres' ? 5 : 1,
    amountMax: amount === 'secs' ? 300 : amount === 'metres' ? 200 : 50,
    load,
    loadLabel: load === 'dumbbell' ? 'kg per dumbbell' : load === 'stack' ? 'kg on the machine' : '',
    loadStep: load === 'stack' ? 2.5 : 1,
    loadMax: load === 'stack' ? 200 : 40,
    range: parseRange(ex.dose),
  };
}

const amountOf = (t: Tracking, e: SetEntry): number | undefined => (t.amount === 'secs' ? e.secs : t.amount === 'metres' ? e.m : e.reps);

/** Builds an entry from the two stepper values. */
export function makeEntry(t: Tracking, amount: number, kg: number | null): SetEntry {
  const entry: SetEntry = t.amount === 'secs' ? { secs: amount } : t.amount === 'metres' ? { m: amount } : { reps: amount };
  if (t.load !== 'none' && kg !== null && kg > 0) entry.kg = kg;
  return entry;
}

/** The recorded sets of the most recent workout that included this exercise. */
export function lastSets(history: WorkoutLog[], id: ExerciseId): { at: string; sets: SetEntry[] } | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const found = history[i]!.exercises.find((e) => e.id === id && e.log && e.log.length);
    if (found) return { at: history[i]!.at, sets: found.log! };
  }
  return null;
}

/**
 * Values to show in the steppers for the next set: the previous set of this session,
 * else the same set last time, else the bottom of the target range and no weight yet.
 */
export function prefill(id: ExerciseId, setIndex: number, sessionSets: SetEntry[], history: WorkoutLog[]): { amount: number; kg: number | null } {
  const t = trackingFor(EXERCISES[id]);
  const last = lastSets(history, id)?.sets;
  const source = sessionSets[setIndex - 1] ?? last?.[setIndex] ?? last?.[last.length - 1];
  return { amount: (source && amountOf(t, source)) ?? t.range[0], kg: source?.kg ?? null };
}

/** "10, 10, 9 reps @ 6 kg" (weights shown once when they are all the same). */
export function describeSets(id: ExerciseId, sets: SetEntry[]): string {
  if (!sets.length) return '';
  const t = trackingFor(EXERCISES[id]);
  const unit = t.amount === 'secs' ? 's' : t.amount === 'metres' ? ' m' : ' reps';
  const kgs = sets.map((s) => s.kg);
  const sameKg = kgs.every((k) => k === kgs[0]);
  if (sameKg) {
    const amounts = sets.map((s) => amountOf(t, s) ?? '–').join(', ');
    return `${amounts}${unit}${kgs[0] ? ` @ ${kgs[0]} kg` : ''}`;
  }
  return sets.map((s) => `${amountOf(t, s) ?? '–'}${unit}${s.kg ? ` @ ${s.kg} kg` : ''}`).join(', ');
}

/**
 * Gentle next-step hint following the safety rule "more reps first, then sets, then weight".
 * Returns null when there is nothing useful to say.
 */
export function progressionHint(id: ExerciseId, last: SetEntry[] | undefined): string | null {
  if (!last || !last.length) return null;
  const ex = EXERCISES[id];
  const t = trackingFor(ex);
  const [lo, hi] = t.range;
  const amounts = last.map((s) => amountOf(t, s) ?? 0);
  if (last.length < ex.sets) return `Last time you did ${last.length} of ${ex.sets} sets – aim for all ${ex.sets} today if your back feels good.`;
  if (amounts.every((a) => a >= hi)) {
    if (t.load === 'none') return `You reached the top of the range on every set last time – keep the slow tempo, or try the full version if you've been doing the easier one.`;
    return `You reached ${hi} on every set last time. If your back felt fine, try a little more weight – and drop back to ${lo} reps.`;
  }
  if (amounts.some((a) => a < lo)) return `Last time some sets were under ${lo} – keep the same weight and build up the reps.`;
  return `Aim for one more ${t.amount === 'reps' ? 'rep' : t.amount === 'secs' ? 'few seconds' : 'few metres'} than last time, same weight.`;
}
