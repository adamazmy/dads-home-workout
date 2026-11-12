/**
 * ALL exercise content lives here. Edit the text freely; the screens pick it up.
 *
 * - `kind`: 'main' lifts rest 75 s between sets, 'core' moves rest 45 s.
 * - `anim`: the animation in ./animations.ts (pose data).
 * - Workouts A and B are the lists at the bottom of this file.
 */
import type { ExerciseAnimation } from '../anim/timeline';
import * as anims from './animations';

export type ExerciseId =
  | 'goblet' | 'floorPress' | 'row' | 'bridge' | 'deadBug' | 'carry'
  | 'splitSquat' | 'rdl' | 'stepUp' | 'shoulderPress' | 'birdDog' | 'sidePlank';

export interface Exercise {
  id: ExerciseId;
  name: string;
  kind: 'main' | 'core';
  sets: number;
  /** Reps / time / distance per set, e.g. "8–12 reps". */
  dose: string;
  setup: string;
  steps: string[];
  watchOut: [string, string, string];
  easier: string;
  /** Optional safety flag shown prominently. */
  flag?: { text: string; alternative?: ExerciseId };
  anim: ExerciseAnimation;
}

export const REST_SECONDS = { main: 75, core: 45 } as const;

export const EXERCISES: Record<ExerciseId, Exercise> = {
  goblet: {
    id: 'goblet',
    name: 'Goblet squat to a chair',
    kind: 'main',
    sets: 3,
    dose: '8–12 reps',
    setup: 'Stand in front of a chair, feet shoulder-width, holding one dumbbell upright against your chest.',
    steps: [
      'Brace your tummy gently, as if about to be prodded.',
      'Sit back slowly (3 seconds) until your bottom lightly touches the chair.',
      'Pause for a moment – don\'t relax onto the chair.',
      'Breathe out and push through your whole foot to stand up tall.',
    ],
    watchOut: [
      'Keep your back flat – chest up, no rounding as you sit.',
      'Knees follow your toes; don\'t let them cave inwards.',
      'Breathe out as you stand – never hold your breath.',
    ],
    easier: 'No dumbbell, and sit fully down on the chair between reps. Use a cushion to make the seat higher.',
    anim: anims.goblet,
  },
  floorPress: {
    id: 'floorPress',
    name: 'Dumbbell floor press',
    kind: 'main',
    sets: 3,
    dose: '8–12 reps',
    setup: 'Lie on your back on a mat, knees bent, feet flat. A dumbbell in each hand, elbows on the floor.',
    steps: [
      'Breathe out and press both dumbbells straight up over your chest.',
      'Stop just short of locking your elbows.',
      'Lower slowly (3 seconds) until your upper arms touch the floor.',
      'Pause with elbows resting, then press again.',
    ],
    watchOut: [
      'Keep your low back resting on the floor – don\'t arch.',
      'Elbows at about 45° from your body, not flared out wide.',
      'Breathe out as you press up.',
    ],
    easier: 'Use one dumbbell held in both hands, or press one arm at a time.',
    anim: anims.floorPress,
  },
  row: {
    id: 'row',
    name: 'Single-arm row (hand on a chair)',
    kind: 'main',
    sets: 3,
    dose: '10 reps each arm',
    setup: 'Put one hand on a sturdy chair seat, step back, hinge forward with a flat back. Dumbbell in the other hand, arm long.',
    steps: [
      'Brace your tummy and keep your back flat like a table.',
      'Breathe out and pull your elbow back towards your hip.',
      'Squeeze your shoulder blade for a moment.',
      'Lower slowly (2–3 seconds) until your arm is long. Swap arms after 10.',
    ],
    watchOut: [
      'Flat back the whole time – no rounding, no sagging.',
      'Don\'t twist your body to lift the weight; only the arm moves.',
      'Keep your weight on the chair hand – it protects your back.',
    ],
    easier: 'Use a higher support (kitchen worktop) so you stand more upright, and pull a lighter object.',
    anim: anims.row,
  },
  bridge: {
    id: 'bridge',
    name: 'Glute bridge',
    kind: 'main',
    sets: 3,
    dose: '12 reps',
    setup: 'Lie on your back, knees bent, feet flat and hip-width. Rest a dumbbell across your hips, holding it with both hands.',
    steps: [
      'Breathe out, squeeze your buttocks and lift your hips.',
      'Stop when your body is a straight line from shoulders to knees.',
      'Hold for 2 seconds.',
      'Lower slowly (2–3 seconds) back to the floor.',
    ],
    watchOut: [
      'Don\'t push too high – no arching of the low back.',
      'Keep your ribs down; the work is in your buttocks, not your back.',
      'Breathe out as you lift.',
    ],
    easier: 'No dumbbell, and a smaller lift – just a few centimetres.',
    anim: anims.bridge,
  },
  deadBug: {
    id: 'deadBug',
    name: 'Dead bug',
    kind: 'core',
    sets: 3,
    dose: '6–8 reps each side',
    setup: 'Lie on your back, arms pointing at the ceiling, knees bent at 90° above your hips.',
    steps: [
      'Gently press your low back into the floor.',
      'Breathe out and slowly reach one arm back and the opposite leg out (3 seconds).',
      'Go only as far as your back stays down.',
      'Return to the start and switch sides.',
    ],
    watchOut: [
      'Low back stays pressed to the floor – stop if it lifts.',
      'Move slowly; no swinging.',
      'Breathe out as you reach – never hold your breath.',
    ],
    easier: 'Move only the leg, and tap the heel to the floor with the knee still bent.',
    anim: anims.deadBug,
  },
  carry: {
    id: 'carry',
    name: 'Suitcase carry',
    kind: 'core',
    sets: 3,
    dose: '20–30 m each side',
    setup: 'Hold one dumbbell at your side like a suitcase. Stand tall.',
    steps: [
      'Brace your tummy and lift your chest.',
      'Walk slowly with normal steps for 20–30 metres.',
      'Turn carefully, swap hands and walk back.',
      'Put the dumbbell down by bending your knees, back flat.',
    ],
    watchOut: [
      'Don\'t lean towards the weight – shoulders level.',
      'Keep your back tall; no twisting as you walk.',
      'Breathe normally the whole time.',
    ],
    easier: 'Walk a shorter distance, or carry a lighter bag.',
    anim: anims.carry,
  },
  splitSquat: {
    id: 'splitSquat',
    name: 'Split squat holding a chair',
    kind: 'main',
    sets: 3,
    dose: '8 reps each leg',
    setup: 'Stand side-on to a chair, one hand on it. Step one foot back, back heel up. Bodyweight to start.',
    steps: [
      'Stand tall with your weight mostly on the front foot.',
      'Lower straight down slowly (3 seconds) – back knee towards the floor.',
      'Stop when it hovers, or earlier if needed.',
      'Breathe out and push through the front heel to rise. Swap legs after 8.',
    ],
    watchOut: [
      'Body stays upright – don\'t lean forward or arch.',
      'Front knee follows the toes, not inwards.',
      'Hold the chair for balance – it\'s there to help.',
    ],
    easier: 'Make the step shorter and only go down a little way.',
    anim: anims.splitSquat,
  },
  rdl: {
    id: 'rdl',
    name: 'Romanian deadlift',
    kind: 'main',
    sets: 3,
    dose: '8–10 reps',
    setup: 'Stand tall, feet hip-width, a dumbbell in each hand in front of your thighs, knees softly bent.',
    steps: [
      'Brace your tummy and keep your back flat.',
      'Push your hips back slowly (3 seconds); let the weights slide down your thighs.',
      'Stop at your knees, or when your back would start to round.',
      'Breathe out, squeeze your buttocks and stand up tall.',
    ],
    watchOut: [
      'Flat back – stop before it rounds, however short that is.',
      'Weights stay close to your legs.',
      'Don\'t lean back at the top; just stand tall.',
    ],
    easier: 'Do step-ups instead (button at the top of this page), or practise the hip hinge without weights.',
    flag: { text: 'Check with your physio before doing this one.', alternative: 'stepUp' },
    anim: anims.rdl,
  },
  stepUp: {
    id: 'stepUp',
    name: 'Step-up',
    kind: 'main',
    sets: 3,
    dose: '8 reps each leg',
    setup: 'Stand facing the bottom stair (or a sturdy low step). Hold the banister.',
    steps: [
      'Place your whole foot on the step.',
      'Breathe out and push through that heel to stand up on the step.',
      'Step back down slowly (2 seconds), same foot first.',
      'Do all reps on one leg, then switch.',
    ],
    watchOut: [
      'Body stays tall – don\'t lean forward over the knee.',
      'Whole foot on the step, not just the toes.',
      'Hold the banister – no wobbling.',
    ],
    easier: 'Use a lower step and keep a hand on the wall or banister.',
    anim: anims.stepUp,
  },
  shoulderPress: {
    id: 'shoulderPress',
    name: 'Seated shoulder press (one arm)',
    kind: 'main',
    sets: 3,
    dose: '8–10 reps each arm',
    setup: 'Sit on a chair with your back against the backrest, feet flat. Dumbbell at shoulder height, palm facing in.',
    steps: [
      'Brace your tummy, back stays on the chair.',
      'Breathe out and press the dumbbell straight up.',
      'Lower slowly (3 seconds) back to your shoulder.',
      'Do all reps on one arm, then switch. Rest the other hand on your thigh.',
    ],
    watchOut: [
      'Don\'t arch your back – keep it against the chair.',
      'Press straight up, not behind your head.',
      'Breathe out as you press.',
    ],
    easier: 'Press only halfway up, or use a lighter object such as a water bottle.',
    anim: anims.shoulderPress,
  },
  birdDog: {
    id: 'birdDog',
    name: 'Bird dog',
    kind: 'core',
    sets: 3,
    dose: '6–8 reps each side',
    setup: 'On hands and knees on a mat: hands under shoulders, knees under hips, back flat.',
    steps: [
      'Brace your tummy gently.',
      'Slowly reach one arm forward and the opposite leg back (2 seconds).',
      'Hold for 2 seconds, breathing out.',
      'Return slowly and switch sides.',
    ],
    watchOut: [
      'Back stays flat like a table – no sagging, no arching.',
      'Leg no higher than your hip; don\'t twist your hips.',
      'Keep breathing – never hold your breath.',
    ],
    easier: 'Move only the leg (slide it back along the floor), or only the arm.',
    anim: anims.birdDog,
  },
  sidePlank: {
    id: 'sidePlank',
    name: 'Side plank from the knees',
    kind: 'core',
    sets: 3,
    dose: '20–30 s each side',
    setup: 'Lie on your side on a mat, elbow under your shoulder, knees bent behind you.',
    steps: [
      'Breathe out and lift your hips off the floor.',
      'Make a straight line from knees to head.',
      'Hold for 20–30 seconds, breathing normally.',
      'Lower slowly, then turn over and do the other side.',
    ],
    watchOut: [
      'Hips forward, in line – don\'t let them sag or stick back.',
      'Elbow directly under the shoulder.',
      'Keep breathing during the hold.',
    ],
    easier: 'Hold for 10 seconds, or lift your hips only a little.',
    anim: anims.sidePlank,
  },
};

export type WorkoutId = 'A' | 'B';

export const WORKOUTS: Record<WorkoutId, { name: string; exercises: ExerciseId[] }> = {
  A: { name: 'Workout A', exercises: ['goblet', 'floorPress', 'row', 'bridge', 'deadBug', 'carry'] },
  B: { name: 'Workout B', exercises: ['splitSquat', 'rdl', 'shoulderPress', 'row', 'birdDog', 'sidePlank'] },
};

/** Weekly schedule (0 = Monday). Workout days alternate A/B; other days are walks. */
export const WORKOUT_DAYS = [0, 2, 4];
export const WALK_TEXT = 'Walk 20–30 min';
