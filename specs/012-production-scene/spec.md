# Feature Specification: A 3D scene that holds up in production

**Feature Branch**: `012-production-scene` | **Created**: 2026-11-16 | **Status**: Draft

**Input**: "as a 3d expert productionise it. use spec driven development too"

## What was measured first (16 Nov 2026, desktop, `/t/global`, 5 ornaments)

| What | Value |
|------|-------|
| Draw calls per frame | about 283 |
| Triangles per frame | about 400,000 (the snow ground alone is 105,800) |
| Render passes per frame | 23 (scene, bloom chain, tone mapping, edge smoothing, vignette) |
| Shader programs | 48 |
| Textures | 45, about 42 MB on the graphics card (one 2048² ornament atlas, the rest 512² or smaller) |
| Scene script | 1.2 MB (363 KB compressed), re-checked with the server on every visit |

The scene already picks a detail level per device and trades sharpness for frame rate. What it lacks is everything
around the happy path: nothing is said while it loads, nothing recovers when the graphics context is lost or the
script fails, weak phones draw the same ground as a desktop, and the team cannot see any of it happening.

## User Stories

### 1 - The scene never leaves a blank or frozen screen (P1)

A visitor whose phone drops the graphics context (another app took the memory, the tab sat in the background),
whose scene script fails to load (a new version went out while their tab was open, or the network dropped), or
whose scene crashes, sees a plain message and a way forward, not a black rectangle.

- Graphics context lost: a notice covers the scene. If the browser gives the context back, the notice goes and the
  scene carries on. If it does not within 5 seconds, the notice offers "Reload the tree".
- Scene script failed to load: the page tries once more by reloading; if it fails again it says so and offers a
  retry button. It must never reload in a loop.
- Scene crashed while drawing: a message with "Reload the tree". The words already on the page (title, what the
  tree is) stay readable.
- No 3D at all on the device: the existing message, shown over the square's picture, with a link back home.

### 2 - The scene says it is loading, then appears whole (P1)

From the moment someone opens a tree link until the first full frame, they see the square's picture with "The tree
is loading", not an empty night-blue box followed by pieces popping in. The cover lifts once shaders are compiled
and a frame has been drawn. On a second visit the scene script comes from the browser's cache without asking the
server.

### 3 - Weak phones draw less (P2)

A phone on the lowest detail level draws a coarser snow ground and cheaper light bulbs, so it draws well under
300,000 triangles a frame. Hook positions, ornaments and everything a visitor can tap are identical on every level.

### 4 - The team can see how the scene behaves on real devices (P2)

The team screen shows, per tree, how many times visitors had no 3D, lost the graphics context (and how often it came
back), hit a scene error, had the script fail to load, or were dropped to the lowest detail level: in total and in the
last 24 hours. Nothing about the device or the person is stored: only the count. The error's own message goes to the
server log, with private links removed.

### 5 - A developer can read the scene's cost (P3)

On a developer's machine (and never on the live site), adding `?perf` shows frames per second, draw calls,
triangles, textures and the detail level, so a change that doubles the cost is noticed before it ships. The live
site exposes no debugging handles on `window`.

## Requirements

- **FR-001**: A lost graphics context MUST show a notice within one second and MUST recover without a reload when the browser restores it.
- **FR-002**: A failed scene-script load MUST trigger at most one automatic reload per tab session, then a manual retry.
- **FR-003**: A scene error MUST NOT blank the page; the visitor MUST be offered a reload.
- **FR-004**: The loading cover MUST stay until the first frame after shader compilation, and MUST lift even if compilation reports nothing (a time limit of 8 seconds).
- **FR-005**: Files whose names contain a content hash MUST be served as cacheable for a year and immutable.
- **FR-006**: The lowest detail level MUST draw fewer than 300,000 triangles a frame in the starting view; hooks and tap targets MUST NOT differ between levels.
- **FR-007**: Scene health events MUST be counted per tree (total and last 24 hours) with no device or person attached, and MUST be limited so one device cannot inflate them.
- **FR-008**: The live build MUST NOT set `window.__shared`, `window.__heroCanvas` or read `window.__tier`.
- **FR-009**: The `?perf` readout MUST exist only in development and test mode.

## Success Criteria

- **SC-001**: Forcing a context loss in the browser shows the notice, and restoring it brings the scene back with ornaments and names intact.
- **SC-002**: Blocking the scene script shows the retry message, with no reload loop.
- **SC-003**: A second visit downloads the scene script from cache (no request, or a cache hit without revalidation).
- **SC-004**: On the lowest level the measured triangle count is under 300,000; on the others the picture is unchanged.
- **SC-005**: All existing tests still pass; new tests cover the health events and their limit.

## Assumptions

- "Productionise" means making the existing scene dependable and observable, not redesigning how it looks.
- No real phones are available to the builder; behaviour is checked in a desktop browser with forced context loss,
  a forced low detail level and a phone-sized window. Real-device confirmation is the owner's.
- A lite, no-3D version of the tree is out of scope.

## What was measured after (16 Nov 2026, same desktop, development build)

| What | Before | After |
|------|--------|-------|
| Longest freeze while the scene starts | 2,965 ms | 359 ms (shaders compiled before the first frame, off the main thread) |
| Time until the scene is shown whole | pieces from the first frame, then a 3 s freeze | cover lifts at about 1.1 s |
| Triangles per frame, high / mid / low | 407k / 407k / about 390k | 407k / 352k / 271k |
| Draw calls per frame, high / mid / low | 317 / 317 / about 300 | 317 / 303 / 284 |
| Forced context loss | scene crashed if the page re-rendered while lost (the effects library read a missing answer) | notice, then the scene returns intact on restore; reload offered after 5 s |
| Scene script missing | blank page | one reload, then "The tree didn't load" with a retry |
| Hooks on the tree | 148 | 148 on every level |

"Before" for mid and low triangles is derived (the ground was the same on every level); the rest was measured.
Not measured: real phones, and caching on the live site (checked after deploy with step 7 of the quickstart).
