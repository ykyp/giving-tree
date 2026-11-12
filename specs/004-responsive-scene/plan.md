# Implementation Plan: The tree fills the screen on every device

**Branch**: `004-responsive-scene` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-responsive-scene/spec.md`

## Summary

The 3D scene currently sits in a phone-shaped frame (at most 420 pixels wide) at every screen size. This change makes the scene fill the browser window everywhere, leaves phones exactly as they are, and on anything wider keeps the forms, sheets and buttons at about a phone's width, centred over the scene.

Technical approach: this is a layout change, almost all in `page.css`. The frame becomes a full-window stage. The panels inside it are positioned against the stage, so one container query ("when the stage is wider than a phone") re-centres them in a 460-pixel column. The 3D camera needs no change, because its field of view is set vertically: a wider window shows more village to the sides and the same height of tree. One small change in `src/App.jsx` caps the drawing resolution on very large windows.

## Technical Context

**Language/Version**: CSS (container queries), JavaScript/JSX (React 18, @react-three/fiber 8)

**Primary Dependencies**: None added

**Storage**: N/A

**Testing**: Browser checks at five window sizes (quickstart.md). The server rule tests are unaffected and must still pass.

**Target Platform**: Phones (unchanged), tablets in both orientations, desktop browsers. Container queries need Safari 16+, Chrome 105+, Firefox 110+, which matches the existing baseline (iOS Safari 16+).

**Project Type**: Web application front end

**Performance Goals**: The existing frame-rate tiers hold on a 1920×1080 window; drawing resolution is capped so a large high-density screen does not draw more than about 3.6 million pixels per frame.

**Constraints**: Phone layout pixel-identical to today. No change to the steps, shots or content of the scene. The developer test panel must not re-frame the scene.

**Scale/Scope**: One stylesheet section (about 40 rules), one component (`App.jsx`), no server change

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template. **Gate: passes, with nothing to check.** The working principle "every action in the 3D scene also has an accessible button" is unaffected: buttons move, none are removed.

**Re-check after Phase 1 design**: passes.

## Project Structure

### Documentation (this feature)

```text
specs/004-responsive-scene/
├── plan.md        # This file
├── research.md    # Decisions R1 to R6
├── quickstart.md  # The five window sizes to check, and what to look for
└── tasks.md       # /speckit-tasks (not needed for a change this size; the work list is in research.md)
```

No data model and no contracts: nothing is stored and no interface changes.

### Source Code (repository root)

```text
page.css        # .phone becomes a full-window stage; a container query re-centres panels on wide stages; test-mode sidebar
src/App.jsx     # caps drawing resolution by window area
```

**Structure Decision**: Keep every panel's markup and its phone styles as they are, and add one block of wide-stage overrides at the end of `page.css`. Nothing inside `src/three/` or `src/ui/` needs to know the window size.

## Phases

- **Phase 0, research**: [research.md](./research.md)
- **Phase 1, design**: [quickstart.md](./quickstart.md)

## Complexity Tracking

No constitution violations to justify.
