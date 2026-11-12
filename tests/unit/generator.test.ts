import { describe, expect, it } from 'vitest';
import { EXERCISES, EXERCISE_LIST, GROUPS, type ExerciseId } from '../../src/data/exercises';
import { MAX_EXERCISES, checkGuardrails, generate, isAvailable, lastTrained, mostOverdue, slotsFor, swapOptions } from '../../src/lib/generator';
import type { Focus, WorkoutLog } from '../../src/lib/storage';

const NOW = new Date('2026-11-12T18:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const log = (ids: ExerciseId[], at: string, sets = 3): WorkoutLog => ({
  id: `w-${at}`,
  date: at.slice(0, 10),
  at,
  location: 'home',
  focus: 'full',
  exercises: ids.map((id) => ({ id, sets })),
});
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const high = (ids: ExerciseId[]) => ids.filter((id) => EXERCISES[id].backLoad === 'high');

describe('exercise library', () => {
  it('has 4–7 exercises per muscle group, each with an animation and complete content', () => {
    for (const g of GROUPS) {
      const n = EXERCISE_LIST.filter((e) => e.group === g.id).length;
      expect(n, g.name).toBeGreaterThanOrEqual(4);
      expect(n, g.name).toBeLessThanOrEqual(7);
    }
    for (const e of EXERCISE_LIST) {
      expect(e.anim.keyframes.length, e.id).toBeGreaterThan(1);
      expect(e.steps.length, e.id).toBeGreaterThanOrEqual(3);
      expect(e.watchOut).toHaveLength(3);
      expect(e.easier.length, e.id).toBeGreaterThan(10);
    }
  });

  it('flags back extensions: high back-load, bodyweight only, physio check', () => {
    const be = EXERCISES.backExtension;
    expect(be.backLoad).toBe('high');
    expect(be.flag?.text).toMatch(/physio/i);
    expect(be.equipment).toEqual(['backExtension']);
  });

  it('keeps gym-only kit out of home workouts and honours missing home equipment', () => {
    expect(isAvailable(EXERCISES.latPulldown, 'home')).toBe(false);
    expect(isAvailable(EXERCISES.latPulldown, 'gym')).toBe(true);
    expect(isAvailable(EXERCISES.inclinePress, 'home', ['bench'])).toBe(false);
    expect(isAvailable(EXERCISES.inclinePress, 'gym', ['bench'])).toBe(true); // home settings don't affect the gym
  });
});

describe('generating a workout', () => {
  const focuses: Focus[] = ['full', 'upper', 'lower', 'core'];

  for (const focus of focuses) {
    for (const location of ['home', 'gym'] as const) {
      it(`${focus} at ${location}: 5–6 distinct, available exercises, at most one back-heavy`, () => {
        for (let seed = 1; seed < 40; seed++) {
          const ids = generate({ location, focus, history: [], now: NOW, rng: seeded(seed) });
          expect(ids.length).toBeGreaterThanOrEqual(5);
          expect(ids.length).toBeLessThanOrEqual(MAX_EXERCISES);
          expect(new Set(ids).size).toBe(ids.length);
          expect(ids.every((id) => isAvailable(EXERCISES[id], location))).toBe(true);
          expect(high(ids).length).toBeLessThanOrEqual(1);
        }
      });
    }
  }

  it('full body covers legs, chest, upper back, shoulders and core, with core last', () => {
    const ids = generate({ location: 'home', focus: 'full', history: [], now: NOW, rng: seeded(3) });
    expect(ids.map((id) => EXERCISES[id].group)).toEqual(['legs', 'chest', 'upperBack', 'legs', 'shoulders', 'core']);
  });

  it('custom uses only the ticked groups and caps at 6', () => {
    expect(slotsFor('custom', [])).toEqual([]);
    const ids = generate({ location: 'gym', focus: 'custom', groups: ['arms'], history: [], now: NOW, rng: seeded(5) });
    expect(ids.every((id) => EXERCISES[id].group === 'arms')).toBe(true);
    expect(ids.length).toBeLessThanOrEqual(MAX_EXERCISES);
  });

  it('never includes a back-heavy exercise within 48 h of the last one (even if unflagged)', () => {
    const history = [log(['rdl'], hoursAgo(30))];
    for (let seed = 1; seed < 60; seed++) {
      const ids = generate({ location: 'home', focus: 'lower', history, now: NOW, rng: seeded(seed) });
      expect(high(ids)).toEqual([]);
    }
  });

  it('allows back-heavy exercises again after 48 h (when swapped in)', () => {
    const plan: ExerciseId[] = ['goblet', 'deadBug'];
    expect(swapOptions(plan, 0, 'home', [log(['rdl'], hoursAgo(49))], [], NOW).find((o) => o.ex.id === 'rdl')!.status.ok).toBe(true);
    expect(swapOptions(plan, 0, 'home', [log(['rdl'], hoursAgo(47))], [], NOW).find((o) => o.ex.id === 'rdl')!.status.ok).toBe(false);
  });

  it('never auto-picks exercises flagged "check with your physio"', () => {
    for (const focus of ['full', 'lower', 'core'] as const) {
      for (let seed = 1; seed < 60; seed++) {
        const ids = generate({ location: 'home', focus, history: [], now: NOW, rng: seeded(seed) });
        expect(ids.filter((id) => EXERCISES[id].flag)).toEqual([]);
      }
    }
  });

  it('prefers exercises not done recently', () => {
    const history = [log(['goblet', 'splitSquat', 'stepUp'], hoursAgo(72))];
    const ids = generate({ location: 'home', focus: 'full', history, now: NOW, rng: seeded(2) });
    expect(ids[0]).toBe('bridge'); // the only unflagged leg exercise not done lately
  });
});

describe('guardrails on swaps', () => {
  it('explains, in plain words, why a second back-heavy exercise is not allowed', () => {
    const r = checkGuardrails('backExtension', ['rdl', 'goblet'], [], NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/one back-heavy exercise per session/i);
  });

  it('greys out back-heavy swap options within 48 h, with the reason', () => {
    const plan: ExerciseId[] = ['goblet', 'floorPress', 'row', 'bridge', 'shoulderPress', 'deadBug'];
    const opts = swapOptions(plan, 0, 'home', [log(['backExtension'], hoursAgo(20))], [], NOW);
    const rdl = opts.find((o) => o.ex.id === 'rdl')!;
    expect(rdl.status.ok).toBe(false);
    if (!rdl.status.ok) expect(rdl.status.reason).toMatch(/48 hours/);
    expect(opts.find((o) => o.ex.id === 'splitSquat')!.status.ok).toBe(true);
    expect(opts.some((o) => plan.includes(o.ex.id))).toBe(false);
  });
});

describe('last trained', () => {
  it('reports days per muscle group and the most overdue group', () => {
    const history = [log(['goblet', 'row'], hoursAgo(24 * 4)), log(['floorPress'], hoursAgo(24))];
    const r = Object.fromEntries(lastTrained(history, NOW).map((g) => [g.group, g.days]));
    expect(r).toMatchObject({ legs: 4, upperBack: 4, chest: 1, shoulders: null });
    expect(mostOverdue(history, NOW)?.group).toBe('shoulders'); // never trained comes first
    expect(mostOverdue([], NOW)).toBeNull();
  });

  it('ignores exercises with zero sets', () => {
    const r = lastTrained([log(['curl'], hoursAgo(5), 0)], NOW).find((g) => g.group === 'arms')!;
    expect(r.days).toBeNull();
  });
});
