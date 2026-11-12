import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Progress, WorkoutLog } from '../../src/lib/storage';

let mod: typeof import('../../src/lib/storage');
const data = new Map<string, string>();
const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) };
beforeEach(async () => {
  data.clear();
  vi.stubGlobal('localStorage', storage);
  vi.resetModules();
  mod = await import('../../src/lib/storage');
});
const seed = (value: unknown) => data.set('dhw.state.v1', JSON.stringify(value));

const log = (over: Partial<WorkoutLog> = {}): WorkoutLog => ({
  id: 'w-1',
  date: '2026-01-01',
  at: '2026-01-01T10:00:00.000Z',
  location: 'home',
  focus: 'full',
  exercises: [{ id: 'goblet', sets: 3 }],
  ...over,
});
const progress = (over: Partial<Progress> = {}): Progress => ({
  plan: { location: 'home', focus: 'full', groups: [], exercises: ['goblet', 'row'] },
  phase: 'sets',
  index: 0,
  set: 2,
  setsDone: [1, 0],
  entries: [[{ reps: 10, kg: 6 }], []],
  ...over,
});

describe('untrusted saved state', () => {
  it.each([null, [], 5, 'old', '{'])('recovers from invalid top-level state %j', (value) => {
    seed(value);
    expect(mod.load().history).toEqual([]);
    expect(mod.load().progress).toBeNull();
  });

  it('keeps valid history and preferences while discarding broken records', () => {
    seed({
      history: [null, log({ id: 'bad-date', date: '2026-02-30' }), log({ id: 'ok' }), log({ id: 'bad loc', location: 'moon' as never }), log({ id: 'no-ex', exercises: [] })],
      walks: ['2026-01-01', null, 'bad'],
      theme: 'dark',
      lastLocation: 'gym',
    });
    const s = mod.load();
    expect(s.history.map((h) => h.id)).toEqual(['ok']);
    expect(s).toMatchObject({ walks: ['2026-01-01'], theme: 'dark', lastLocation: 'gym' });
  });

  it('drops unknown or prototype exercise ids and out-of-range set counts', () => {
    seed({ history: [log({ exercises: [{ id: '__proto__', sets: 3 }, { id: 'toString', sets: 3 }, { id: 'row', sets: 99 }, { id: 'row', sets: 2 }] as never })] });
    expect(mod.load().history[0]!.exercises).toEqual([{ id: 'row', sets: 2 }]);
  });

  it.each([
    progress({ plan: { location: 'home', focus: 'full', groups: [], exercises: ['__proto__' as never] } }),
    progress({ index: -1 }),
    progress({ index: 99 }),
    progress({ index: 0.5 }),
    progress({ set: 99 }),
    progress({ phase: 'nap' as never }),
    // A valid id after an invalid one must not slide into its index.
    progress({ plan: { location: 'home', focus: 'full', groups: [], exercises: ['goblet', '__proto__' as never, 'row'] }, index: 1 }),
    // Invalid old A/B progress.
    { workout: 'Z', index: 0, set: 1 },
    { workout: 'A', index: 6, set: 1 },
    { workout: 'A', index: 0, set: 4 },
    { workout: '__proto__', index: 0, set: 1 },
  ])('rejects invalid progress %#', (p) => {
    seed({ progress: p });
    expect(mod.load().progress).toBeNull();
  });

  it('preserves valid progress and legacy records without privacy fields', () => {
    seed({ progress: progress(), history: [log()] });
    expect(mod.load()).toMatchObject({ progress: progress(), rememberActivity: true, history: [log()] });
  });

  it('migrates valid old A/B progress to an equivalent plan, keeping exercise and set', () => {
    seed({ progress: { workout: 'A', index: 2, set: 2 }, history: [{ date: '2026-01-01', workout: 'A' }] });
    const p = mod.load().progress!;
    expect(p.plan.exercises).toEqual(['goblet', 'floorPress', 'row', 'bridge', 'deadBug', 'carry']);
    expect(p).toMatchObject({ phase: 'sets', index: 2, set: 2, setsDone: [0, 0, 1, 0, 0, 0] });
    expect(mod.load().history).toHaveLength(1);
  });

  it('honours the old step-ups choice when migrating Workout B progress', () => {
    seed({ progress: { workout: 'B', index: 1, set: 3 }, useStepUps: true });
    const p = mod.load().progress!;
    expect(p.plan.exercises[1]).toBe('stepUp');
    expect(p).toMatchObject({ index: 1, set: 3, setsDone: [0, 2, 0, 0, 0, 0] });
  });

  it('rejects a draft containing any invalid exercise id', () => {
    seed({ draft: { location: 'gym', focus: 'full', groups: [], exercises: ['latPulldown', 'nope'] } });
    expect(mod.load().draft).toBeNull();
  });

  it('migrates the old A/B history into full workout records', () => {
    seed({ history: [{ date: '2025-06-02', workout: 'B' }], next: 'A', useStepUps: true });
    const [h] = mod.load().history;
    expect(h).toMatchObject({ date: '2025-06-02', location: 'home', focus: 'full' });
    expect(h!.exercises.map((e) => e.id)).toEqual(['splitSquat', 'rdl', 'shoulderPress', 'row', 'birdDog', 'sidePlank']);
  });

  it('isolates default arrays and survives unavailable storage for the session', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw Error('denied');
      },
      setItem() {
        throw Error('denied');
      },
    });
    mod.load().history.push(log());
    expect(mod.load().history).toEqual([]);
    mod.save({ progress: progress({ set: 3 }) });
    expect(mod.load().progress?.set).toBe(3);
  });

  it('removes persistent activity on opt-out but retains it in memory and restores on opt-in', () => {
    mod.save({ history: [log()], progress: progress(), homeMissing: ['bench'], lastLocation: 'gym' });
    mod.setRememberActivity(false);
    const persisted = JSON.parse(data.get('dhw.state.v1')!);
    expect(persisted.history).toEqual([]);
    expect(persisted.progress).toBeNull();
    expect(persisted.homeMissing).toEqual([]);
    expect(persisted.lastLocation).toBe('home');
    expect(mod.load().progress?.set).toBe(2);
    expect(mod.load().history).toHaveLength(1);
    mod.setRememberActivity(true);
    expect(JSON.parse(data.get('dhw.state.v1')!).history).toHaveLength(1);
  });

  it('clears previous activity even if writing the opt-out preference exceeds quota', () => {
    mod.save({ history: [log()] });
    vi.stubGlobal('localStorage', {
      ...storage,
      setItem() {
        throw Error('quota');
      },
    });
    expect(mod.setRememberActivity(false)).toBe(false);
    expect(data.has('dhw.state.v1')).toBe(false);
    expect(mod.load().history).toHaveLength(1);
  });

  it('handles invalid JSON without making any destructive write', () => {
    data.set('dhw.state.v1', '{broken');
    expect(mod.load().history).toEqual([]);
    expect(data.get('dhw.state.v1')).toBe('{broken');
  });

  it('only accepts optional home equipment in homeMissing', () => {
    seed({ homeMissing: ['bench', 'machine', '__proto__', 'bench'] });
    expect(mod.load().homeMissing).toEqual(['bench']);
  });
});

describe('finishing a workout', () => {
  it('saves only exercises with sets done, and clears progress and draft', () => {
    mod.save({ progress: progress(), draft: progress().plan });
    const saved = mod.finishWorkout(progress({ setsDone: [3, 0], entries: [[{ reps: 10, kg: 6 }, { reps: 10, kg: 6 }, { reps: 9, kg: 6 }], []] }), new Date('2026-03-04T10:00:00Z'));
    expect(saved!.exercises).toEqual([{ id: 'goblet', sets: 3, log: [{ reps: 10, kg: 6 }, { reps: 10, kg: 6 }, { reps: 9, kg: 6 }] }]);
    const s = mod.load();
    expect(s.history).toHaveLength(1);
    expect(s.progress).toBeNull();
    expect(s.draft).toBeNull();
  });

  it('saves nothing when no sets were done', () => {
    expect(mod.finishWorkout(progress({ setsDone: [0, 0], entries: [[], []] }))).toBeNull();
    expect(mod.load().history).toEqual([]);
  });
});

describe('export / import', () => {
  it('round-trips and merges without duplicates or deletions', () => {
    mod.save({ history: [log({ id: 'a' })], walks: ['2026-01-02'] });
    const file = mod.exportData();
    mod.save({ history: [log({ id: 'b', at: '2026-01-05T10:00:00.000Z', date: '2026-01-05' })], walks: [] });
    const r = mod.importData(file);
    expect(r).toEqual({ ok: true, added: 1, walksAdded: 1, skipped: 0 });
    expect(mod.load().history.map((h) => h.id)).toEqual(['a', 'b']);
    expect(mod.importData(file)).toEqual({ ok: true, added: 0, walksAdded: 0, skipped: 1 });
  });

  it.each([
    ['not JSON', '{nope'],
    ['another app', JSON.stringify({ app: 'other', history: [] })],
    ['no history', JSON.stringify({ app: 'dads-home-workout' })],
  ])('refuses %s without changing anything', (_, text) => {
    mod.save({ history: [log()] });
    const r = mod.importData(text);
    expect(r.ok).toBe(false);
    expect(mod.load().history).toHaveLength(1);
  });

  it('refuses oversized files and salvages valid entries from a tampered one', () => {
    expect(mod.importData('x'.repeat(mod.MAX_IMPORT_BYTES + 1)).ok).toBe(false);
    const r = mod.importData(JSON.stringify({ app: 'dads-home-workout', history: [log({ id: 'good' }), { id: '<img>', date: 'x' }, log({ id: 'evil', exercises: [{ id: 'constructor', sets: 1 }] as never })], walks: ['2026-01-01', '__proto__'] }));
    expect(r).toEqual({ ok: true, added: 1, walksAdded: 1, skipped: 2 });
  });

  it('counts duplicate ids within one file once', () => {
    const r = mod.importData(JSON.stringify({ app: 'dads-home-workout', history: [log({ id: 'dup' }), log({ id: 'dup' })] }));
    expect(r).toEqual({ ok: true, added: 1, walksAdded: 0, skipped: 1 });
    expect(mod.load().history).toHaveLength(1);
  });

  it('never evicts existing history: an import past capacity is refused without changes', () => {
    mod.save({ history: [log({ id: 'existing' })] });
    const many = Array.from({ length: mod.MAX_HISTORY }, (_, i) => log({ id: `f-${i}`, date: '2026-02-01', at: '2026-02-01T10:00:00.000Z' }));
    const r = mod.importData(JSON.stringify({ app: 'dads-home-workout', history: many }));
    expect(r.ok).toBe(false);
    expect(mod.load().history.map((h) => h.id)).toEqual(['existing']);
  });

  it('imports right up to capacity, keeping existing records', () => {
    mod.save({ history: [log({ id: 'existing' })] });
    const fits = Array.from({ length: mod.MAX_HISTORY - 1 }, (_, i) => log({ id: `f-${i}`, date: '2026-02-01', at: '2026-02-01T10:00:00.000Z' }));
    expect(mod.importData(JSON.stringify({ app: 'dads-home-workout', history: fits }))).toMatchObject({ ok: true, added: mod.MAX_HISTORY - 1 });
    const s = mod.load();
    expect(s.history).toHaveLength(mod.MAX_HISTORY);
    expect(s.history.some((h) => h.id === 'existing')).toBe(true);
  });
});
