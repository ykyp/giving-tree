# Tasks: A 3D scene that holds up in production

## Phase 1: Foundation

- [x] T001 Add `supabase/migrations/0006_scene_health.sql` widening the `events.name` check with `no_webgl`, `gl_lost`, `gl_restored`, `scene_error`, `chunk_error`, `tier_low`
- [x] T002 In `server/app.js` accept the six names on `POST event`, limited to 12 a day per device, counting an unknown tree against `global`
- [x] T003 In `server/repo-memory.js` and `server/repo-postgres.js` return `scene: { name: { total, day } }` from `measures()`
- [x] T004 Add `tests/server/scene-health.test.js` for T002 and T003
- [x] T005 [P] Add `src/lib/health.js`: `report(name, message)` once per tab per name

## Phase 2: US1 never blank or frozen (P1)

- [x] T006 [US1] Add `src/three/SceneGuard.jsx`: error boundary, context lost/restored notice with reload offer after 5 s
- [x] T007 [US1] In `src/main.jsx` reload once when the scene script fails to load, then show a retry message
- [x] T008 [US1] In `src/App.jsx` use the guard; show the no-3D message over the square's picture with a link home; report `no_webgl`
- [x] T009 [US1] Styles for the notice in `page.css`

## Phase 3: US2 loading cover and caching (P1)

- [x] T010 [US2] In `src/three/SceneGuard.jsx` signal ready after `compileAsync` and two frames, or 8 s
- [x] T011 [US2] In `src/App.jsx` and `page.css` show the cover until ready
- [x] T012 [US2] In `vercel.json` serve `/chunks/(.*)` as immutable for a year

## Phase 4: US3 weak phones draw less (P2)

- [x] T013 [US3] In `src/three/World.jsx` take the ground's segment count from the level (230 / 160 / 110)
- [x] T014 [US3] In `src/three/Tree.jsx` use 6×4 bulb spheres on the lowest level
- [x] T015 [US3] In `src/App.jsx` report `tier_low` when the frame rate drops a device to the lowest level

## Phase 5: US4 the team can see it (P2)

- [x] T016 [US4] In `src/pages/Ops.jsx` show a "Scene health" line per tree

## Phase 6: US5 developer readout, no handles (P3)

- [x] T017 [US5] Add `src/three/Perf.jsx` (`?perf`, development and test mode only)
- [x] T018 [US5] In `src/three/shared.js`, `src/three/Hero.jsx`, `src/App.jsx` keep `window.__shared`, `__heroCanvas`, `__tier` out of the live build

## Phase 7: Check

- [x] T019 Run both test suites and the build
- [x] T020 Walk through `quickstart.md` steps 2 to 6 in the browser and record the measured numbers in `spec.md`
