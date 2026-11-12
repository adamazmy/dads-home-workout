# Dad's Home Workout

A mobile-first, installable web app for gentle, back-friendly strength training at home or at the gym.
Each day he picks Home or Gym and a focus; the app builds a 5–6 exercise workout from a library of 31
animated exercises, with built-in back guardrails.
Vite + vanilla TypeScript, no framework, no backend, no login. Works offline once installed.

## Commands (all cross-platform; Windows works out of the box)

| Command | What it does |
| --- | --- |
| `npm install` then `npx playwright install chromium` | One-time setup |
| `npm run dev` | Dev server on your LAN (`vite --host`). Open the "Network" URL on the Android phone (same Wi-Fi). |
| `npm test` | Unit tests: engine maths + anatomy check of every exercise (240 samples per loop) |
| `npm run poses` | Pose check: screenshots every keyframe + mid-transition of every exercise into `reports/poses-light.png` / `poses-dark.png`; red cells = anatomy problems |
| `npm run test:e2e` | Playwright on Pixel 7 (412 px), 375 px and desktop Chrome, light + dark; screenshots to `reports/screens/` |
| `npm run test:update` | Simulates a new deploy reaching an installed (resumed) app, never mid-workout |
| `npm run build` / `npm run preview` | Production build / serve it on your LAN |
| `npm run lighthouse` | Lighthouse (mobile) + Chrome's installability check, after `npm run build`. Report: `reports/lighthouse.html` |
| `npm run icons` | Re-renders the PNG icons from `scripts/icon.svg.mjs` |

Tip: `ONLY=bridge,legPress npm run poses` (PowerShell: `$env:ONLY='bridge,legPress'; npm run poses`) renders those exercises large.
In dev, `http://localhost:5173/debug.html` shows the same grid live.

## Deploying (GitHub Pages)

1. Push to a GitHub repo, then in **Settings → Pages** set **Source = GitHub Actions**.
2. Every push to `main` runs `.github/workflows/deploy.yml`: tests → build with `BASE_PATH=/<repo-name>/` → deploy.
3. Open `https://<user>.github.io/<repo-name>/` on the phone in Chrome → menu → **Install app** (or accept the prompt).

HTTPS (which Pages provides) is required for install, the service worker and the wake lock.

## File structure

```
index.html                 app shell (viewport-fit=cover for safe areas)
debug.html                 dev-only pose grid (not in the production build)
vite.config.ts             base path for Pages + PWA manifest/service worker (vite-plugin-pwa)
src/
  main.ts                  mounts screens per route
  anim/
    skeleton.ts            body proportions, forward kinematics, 2-bone IK, anchors
    timeline.ts            keyframes, durations/holds, ease-in-out, props & dumbbell types
    render.ts              SVG drawing (far limbs lighter + offset, accent torso, props)
    player.ts              one shared rAF loop, play/pause, speed, pauses off-screen
    checks.ts              anatomical limits used by the tests and the pose grid
  data/
    exercises.ts           ← THE EXERCISE LIBRARY: text, tags (group, home/gym, equipment,
                             back load), sets/reps/rest – edit here
    animations.ts          ← pose data (original exercises)
    animations-library.ts  ← pose data (benches, machines, cables)
  lib/
    generator.ts           builds today's workout + back guardrails (pure, unit-tested)
    storage.ts             validated state, workout log, A/B migration, export/import
    router.ts, wakelock.ts, alerts.ts, pwa.ts
  screens/                 home, choose, workout (warm-up first), detail, library,
                           week, history, settings, safety
  styles/                  tokens (light/dark), figure styles
tests/unit                 Vitest
tests/poses                pose-grid screenshot check
tests/e2e                  Playwright app tests
scripts/                   icon generation, Lighthouse
```

## Exercise library & workout builder

Each exercise in `src/data/exercises.ts` is tagged with its muscle group (Legs & glutes, Chest,
Upper back, Shoulders, Arms, Core & lower back), where it can be done (`home`, `gym`, `both`),
the equipment it needs, its back load (`low` / `moderate` / `high`), sets, reps and rest.

`src/lib/generator.ts` builds the workout and enforces the guardrails:

- at most **one high back-load** exercise per session;
- no high back-load exercise within **48 hours** of the last one (greyed out, with the reason);
- exercises flagged "check with your physio" (RDL, back extension) are **never picked automatically** –
  only when swapped in on purpose;
- about **6 exercises** at most; every workout starts with the **warm-up** screen.

Home equipment can be switched off in Settings. History (date, location, exercises, sets) is kept in
localStorage and can be exported/imported as JSON from the History tab.

## Pose data format

Units are centimetres, y up, floor at y = 0. Every angle is a **global** direction in degrees:
`0` = up, `90` = forward (the way a standing figure faces), `180` = down, `-90`/`270` = backward.

```ts
Pose = {
  torso, head,                 // hip→shoulder, shoulder→head
  armN: [upper, fore],         // N = near side (dark), F = far side (light)
  armF: [upper, fore],
  legN: [thigh, shin, foot],   // foot 90 = flat on the floor
  legF: [thigh, shin, foot],
}
```

An animation is an anchor, a start pose and keyframes that change only what moves:

```ts
export const goblet: ExerciseAnimation = {
  anchorMode: 'feet',                 // 'feet' (planted ankle fixed) | 'hip' | 'shoulder'
  anchor: vec(0, A),
  start: STANDING,
  pins: { armN: { rel: 'shoulder', along: -6, fwd: 26 } },  // IK: hands stay at the chest
  props: [{ kind: 'chair', x: -17, facing: 'right' }],
  dumbbells: [{ at: 'armN', view: 'torso' }],
  keyframes: [
    { label: 'Stand up – breathe out', dur: 1.5, hold: 1, pose: { torso: 0, legN: [180, 180, 90] } },
    { label: 'Sit back slowly – 3 s', holdLabel: 'Touch the chair – pause', dur: 3, hold: 1,
      pose: { torso: 38, legN: [97, 195, 90] } },
  ],
};
```

- `dur` = seconds to move into the pose (eased in/out), `hold` = seconds to stay; the loop returns to keyframe 0 using its `dur`.
- **Pins** solve a limb with IK so a contact can't slide: `{ world: vec(x, y) }` for the floor or a chair,
  `{ rel: 'hip' | 'shoulder', along, fwd }` for spots on the body. Pins can change per keyframe (`null` removes one).
- `foreshorten` shortens segments that point into the screen (the side plank's shins); it can change per keyframe (the seated raise).
- Props: `chair`, `mat`, `step`, `lines` (bench/machine outlines), `circle` (pads, pulleys), and body-following
  `cable` (cable or machine lever to the hands), `footplate` (under the sole) and `roller` (leg-curl pad).
- After editing, run `npm test` and `npm run poses`, then look at the grid.

## Notes

- Security fixes, regression checks, remaining dependency risk and GitHub Pages header limitations: [security remediation report](docs/security-remediation.md).
- Settings → **Activity privacy** offers **Session only** for shared devices. Existing saved activity is preserved unless you choose to remove it; session-only activity is lost when the page closes or reloads.

- The **Romanian deadlift** and **back extension** carry a "check with your physio" flag and are only added when swapped in.
- Step-ups use a low step or the bottom stair: a ~45 cm bench is too high a step to start with.
- Workout progress is saved after every set: back button, a phone call or closing the app never loses it ("Carry on" on Home).
- Wake lock is re-acquired whenever the app comes back to the foreground. Where unsupported, a note asks to lengthen the screen timeout.
- Lighthouse 12+ dropped its "PWA" category; installability is verified with Chrome's own check (`Page.getInstallabilityErrors`) in both `npm run lighthouse` and the e2e suite.
