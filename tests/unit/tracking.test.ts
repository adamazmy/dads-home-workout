import { describe, expect, it } from 'vitest';
import { EXERCISES, EXERCISE_LIST } from '../../src/data/exercises';
import type { SetEntry, WorkoutLog } from '../../src/lib/storage';
import { describeSets, lastSets, makeEntry, parseRange, prefill, progressionHint, trackingFor } from '../../src/lib/tracking';

const log = (id: string, at: string, sets: SetEntry[]): WorkoutLog => ({
  id: `w-${at}`,
  date: at.slice(0, 10),
  at,
  location: 'home',
  focus: 'full',
  exercises: [{ id: id as never, sets: sets.length, log: sets }],
});

describe('what gets recorded', () => {
  it('parses target ranges from the dose text', () => {
    expect(parseRange('8–12 reps')).toEqual([8, 12]);
    expect(parseRange('10 reps each arm')).toEqual([10, 10]);
    expect(parseRange('20–30 s each side')).toEqual([20, 30]);
  });

  it('dumbbell exercises record kg per dumbbell; machines and cables the stack; bodyweight reps only', () => {
    expect(trackingFor(EXERCISES.goblet)).toMatchObject({ amount: 'reps', load: 'dumbbell', loadLabel: 'kg per dumbbell', loadStep: 1 });
    expect(trackingFor(EXERCISES.latPulldown)).toMatchObject({ load: 'stack', loadStep: 2.5 });
    expect(trackingFor(EXERCISES.pallof)).toMatchObject({ load: 'stack' });
    expect(trackingFor(EXERCISES.birdDog)).toMatchObject({ load: 'none', amountLabel: 'reps each side' });
    expect(trackingFor(EXERCISES.backExtension).load).toBe('none');
  });

  it('times the side plank and measures the carry in metres (with a dumbbell)', () => {
    expect(trackingFor(EXERCISES.sidePlank)).toMatchObject({ amount: 'secs', amountLabel: 'seconds each side', load: 'none' });
    expect(trackingFor(EXERCISES.carry)).toMatchObject({ amount: 'metres', load: 'dumbbell' });
  });

  it('every exercise has a usable target range', () => {
    for (const ex of EXERCISE_LIST) {
      const [lo, hi] = trackingFor(ex).range;
      expect(lo, ex.id).toBeGreaterThan(0);
      expect(hi, ex.id).toBeGreaterThanOrEqual(lo);
    }
  });

  it('makes entries in the right unit and drops weight for bodyweight moves', () => {
    expect(makeEntry(trackingFor(EXERCISES.goblet), 10, 6)).toEqual({ reps: 10, kg: 6 });
    expect(makeEntry(trackingFor(EXERCISES.goblet), 10, null)).toEqual({ reps: 10 });
    expect(makeEntry(trackingFor(EXERCISES.birdDog), 8, 5)).toEqual({ reps: 8 });
    expect(makeEntry(trackingFor(EXERCISES.sidePlank), 25, null)).toEqual({ secs: 25 });
  });
});

describe('pre-filled values', () => {
  const history = [log('goblet', '2026-01-01T10:00:00Z', [{ reps: 8, kg: 4 }]), log('goblet', '2026-01-05T10:00:00Z', [{ reps: 10, kg: 6 }, { reps: 10, kg: 6 }, { reps: 9, kg: 6 }])];

  it('first time: bottom of the range, no weight', () => {
    expect(prefill('goblet', 0, [], [])).toEqual({ amount: 8, kg: null });
  });
  it('uses the same set from last time', () => {
    expect(lastSets(history, 'goblet')!.sets).toHaveLength(3);
    expect(prefill('goblet', 2, [], history)).toEqual({ amount: 9, kg: 6 });
  });
  it('the previous set of this session wins over last time', () => {
    expect(prefill('goblet', 1, [{ reps: 12, kg: 7 }], history)).toEqual({ amount: 12, kg: 7 });
  });
  it('ignores old workouts without recorded sets', () => {
    const old: WorkoutLog = { ...log('goblet', '2026-02-01T10:00:00Z', []), exercises: [{ id: 'goblet', sets: 3 }] };
    expect(prefill('goblet', 0, [], [...history, old])).toEqual({ amount: 10, kg: 6 });
  });
});

describe('summaries and hints', () => {
  it('describes sets compactly', () => {
    expect(describeSets('goblet', [{ reps: 10, kg: 6 }, { reps: 10, kg: 6 }, { reps: 9, kg: 6 }])).toBe('10, 10, 9 reps @ 6 kg');
    expect(describeSets('goblet', [{ reps: 10, kg: 6 }, { reps: 8, kg: 7 }])).toBe('10 reps @ 6 kg, 8 reps @ 7 kg');
    expect(describeSets('sidePlank', [{ secs: 20 }, { secs: 25 }])).toBe('20, 25s');
    expect(describeSets('birdDog', [{ reps: 6 }])).toBe('6 reps');
  });

  it('follows "reps first, then sets, then weight"', () => {
    expect(progressionHint('goblet', undefined)).toBeNull();
    expect(progressionHint('goblet', [{ reps: 10, kg: 6 }])).toMatch(/1 of 3 sets/);
    expect(progressionHint('goblet', [{ reps: 12, kg: 6 }, { reps: 12, kg: 6 }, { reps: 12, kg: 6 }])).toMatch(/a little more weight/);
    expect(progressionHint('goblet', [{ reps: 7, kg: 8 }, { reps: 6, kg: 8 }, { reps: 6, kg: 8 }])).toMatch(/same weight and build up the reps/);
    expect(progressionHint('goblet', [{ reps: 9, kg: 6 }, { reps: 9, kg: 6 }, { reps: 8, kg: 6 }])).toMatch(/one more rep/);
    expect(progressionHint('birdDog', [{ reps: 8 }, { reps: 8 }, { reps: 8 }])).not.toMatch(/weight/);
  });
});
