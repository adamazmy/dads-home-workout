# Dad's Home Workout

A mobile-first, installable web app for a gentle, back-friendly home routine with two 10 kg dumbbells.
Vite + vanilla TypeScript, no framework, no backend, no login. Works offline once installed.

## Commands (all cross-platform; Windows works out of the box)

| Command | What it does |
| --- | --- |
| `npm install` then `npx playwright install chromium` | One-time setup |
| `npm run dev` | Dev server on your LAN (`vite --host`). Open the "Network" URL on the Android phone (same Wi-Fi). |
| `npm test` | Unit tests: engine maths + anatomy check of every exercise (240 samples per loop) |
| `npm run poses` | Pose check: screenshots every keyframe + mid-transition of every exercise into `reports/poses-light.png` / `poses-dark.png`; red cells = anatomy problems |
| `npm run test:e2e` | Playwright on Pixel 7 (412 px), 375 px and desktop Chrome, light + dark; screenshots to `reports/screens/` |
| `npm run build` / `npm run preview` | Production build / serve it on your LAN |
| `npm run lighthouse` | Lighthouse (mobile) + Chrome's installability check, after `npm run build`. Report: `reports/lighthouse.html` |
| `npm run icons` | Re-renders the PNG icons from `scripts/icon.svg.mjs` |

Tip: `ONLY=bridge npm run poses` (PowerShell: `$env:ONLY='bridge'; npm run poses`) renders one exercise large.
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
    exercises.ts           ← ALL exercise text, sets/reps, workouts A/B, schedule (edit here)
    animations.ts          ← pose data for every animation
  lib/                     router (Android back), storage, wake lock, beep/vibrate, PWA
  screens/                 home, detail, workout, safety, animation stage
  styles/                  tokens (light/dark), figure styles
tests/unit                 Vitest
tests/poses                pose-grid screenshot check
tests/e2e                  Playwright app tests
scripts/                   icon generation, Lighthouse
```

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
- `foreshorten` shortens segments that point into the screen (the side plank's shins).
- After editing, run `npm test` and `npm run poses`, then look at the grid.

## Notes

- The **Romanian deadlift** carries a "check with your physio" flag. One tap on its page swaps it for step-ups in Workout B.
- Workout progress is saved after every set: back button, a phone call or closing the app never loses it ("Carry on" on Home).
- Wake lock is re-acquired whenever the app comes back to the foreground. Where unsupported, a note asks to lengthen the screen timeout.
- Lighthouse 12+ dropped its "PWA" category; installability is verified with Chrome's own check (`Page.getInstallabilityErrors`) in both `npm run lighthouse` and the e2e suite.
