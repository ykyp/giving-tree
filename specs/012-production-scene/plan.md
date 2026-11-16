# Implementation Plan: A 3D scene that holds up in production

**Branch**: `012-production-scene` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

## Summary

The scene's happy path is already tuned (detail levels, adaptive sharpness). This plan adds what surrounds it:
a guard that turns context loss, script-load failure and crashes into a message with a way forward; a loading cover
that lifts on the first compiled frame; year-long caching for hashed files; a lighter lowest level; health counts the
team can read; and a developer-only cost readout. No new dependencies.

## Technical Context

**Language/Version**: JavaScript (ES modules), Node 22 for tests, Node 24 on Vercel
**Primary Dependencies**: three 0.169, @react-three/fiber 8.17, drei 9.114, postprocessing 6.36, React 18, Vite 5
**Storage**: Supabase Postgres (`events` table gains six allowed names: migration 0006)
**Testing**: `node --test` for the rules module in memory and on Postgres; the browser pane for the scene itself
**Target Platform**: phones first (iOS Safari, Android Chrome, in-app browsers), desktop browsers
**Project Type**: web app, one Vercel Function
**Performance Goals**: lowest level under 300,000 triangles a frame; no change to the picture on other levels
**Constraints**: nothing identifying stored with a health count; no debug handles on the live site
**Scale/Scope**: one scene, about 2,100 lines in `src/three`

## Constitution Check

`.specify/memory/constitution.md` is still the unfilled template, so there are no project gates to evaluate. The
project's working rules (README) are kept: rules live in `server/app.js`, both repositories behave the same, tests
run against both, nothing private is logged.

## Project Structure

```text
specs/012-production-scene/   spec.md plan.md research.md data-model.md quickstart.md tasks.md contracts/health-events.md
src/three/SceneGuard.jsx      new: error boundary, context-loss watcher, ready signal (compile, then first frame)
src/three/Perf.jsx            new: ?perf readout, loaded only in development and test mode
src/lib/health.js             new: report(name) once per tab per name, to `event` (count) and `log` (message)
src/App.jsx                   guard round the canvas, loading cover, no-3D picture, no window.__tier on the live build
src/main.jsx                  scene import that reloads once on failure, then offers a retry
src/three/World.jsx           ground segments by level
src/three/Tree.jsx            bulb geometry by level
src/three/shared.js, Hero.jsx debug globals only in development and test mode
server/app.js                 six event names, a per-device limit, counts in admin measures
server/repo-memory.js, repo-postgres.js   measures() returns `scene` counts (total, last 24 h)
supabase/migrations/0006_scene_health.sql widen the events name check
src/pages/Ops.jsx             a "Scene health" line per tree
vercel.json                   immutable caching for /chunks/*
page.css                      cover, notice
tests/server/scene-health.test.js         new
```

**Structure Decision**: keep the existing layout; three small new modules rather than growing `App.jsx`.

## Phases

0. Research: see [research.md](research.md). No open questions remain.
1. Design: [data-model.md](data-model.md), [contracts/health-events.md](contracts/health-events.md), [quickstart.md](quickstart.md).
2. Tasks: [tasks.md](tasks.md).

## Complexity Tracking

Nothing to justify: no new dependency, no new service, one widened database check.
