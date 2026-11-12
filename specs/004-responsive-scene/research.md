# Research: The tree fills the screen on every device

**Date**: 2026-11-12 · **Plan**: [plan.md](./plan.md)

## R1. The frame becomes a full-window stage

- **Decision**: `.phone` (kept as the element's name and id, since the scene's code refers to it) fills the viewport: fixed to all four edges, no border, radius or shadow, on every device. The page behind it has no padding and does not scroll.
- **Rationale**: FR-001. On phones this is what already happens below 480 pixels, so phones do not change (FR-002).
- **Alternatives considered**: A larger framed "device" on desktop (still a phone in the middle of a big screen); the browser's own full-screen mode (needs a click, and is not what "full screen" means here).

## R2. The camera needs no change

- **Decision**: Leave every shot and field of view as it is.
- **Rationale**: The camera's field of view is vertical (40 to 62 degrees depending on the shot). Whatever the window's shape, the same height of scene is visible; a wide window adds village to the left and right. So the tree stays fully in view at any shape (FR-005), and the close-ups (crate, engraving, branch) keep their framing.
- **Checked against**: the tightest tree shot, the greeting (22.5 m away at 56 degrees), shows about 24 m of height for a 14 m tree.
- **Alternatives considered**: Widening the field of view on landscape screens (distorts the tree at the edges); pulling the camera back on narrow screens (phones must not change).

## R3. Panels are centred in a phone-width column on wide stages

- **Decision**: Use a container query on the stage: when the stage is wider than 480 pixels, every panel that spans the stage's width on a phone (ornament chooser, name entry, wish form, sealed confirmation, greeting footer, tree sheet, keepsake, ornament card, place card) is placed in a centred column of `min(460px, stage width − 32px)`. Bottom panels get rounded top corners so they read as a card, not a cut-off band. Dialogs (invitation, save link, opened wish) become centred cards of the same width.
- **Rationale**: FR-003. A container query, not a viewport media query, because the stage is narrower than the window when the developer panel is beside it.
- **Controls that belong to an edge stay there**: sound and back (top corners), the map (top right), "Tree view / Walk around" (bottom left), "Find my ornament" (bottom right), toasts (top left).
- **Controls that belong to the tree come closer to it**: the turn-left, turn-right and zoom buttons sit at the edges on a phone; on a wide stage they sit about 300 pixels either side of the centre, so they are not a hand's travel away from the ornament.
- **Alternatives considered**: A side panel beside the scene on desktop (splits attention and needs a second layout for every screen); scaling all panels up (large type on a large screen reads as a kiosk).

## R4. Tablets use the same rule

- **Decision**: No separate tablet layout. A tablet stage is wider than 480 pixels in both orientations, so it gets the centred column; the scene fills the screen.
- **Rationale**: FR-003 and Story 3 are satisfied by R1 and R3. One rule is easier to keep right than three.

## R5. Drawing resolution is capped by area

- **Decision**: The canvas's maximum pixel ratio is the tier's value (2, 1.5 or 1) or the value that keeps the drawn frame near 3.6 million pixels, whichever is lower, and never below 1. It is recomputed when the window is resized.
- **Rationale**: A phone at ratio 2 draws under 1 million pixels; a 1920×1080 window at ratio 2 would draw 8.3 million through the same effects. The existing automatic step-down would catch a slow machine eventually, but only after it has stuttered.

## R6. The developer test panel sits beside the stage

- **Decision**: In local development the test panel becomes a fixed-width sidebar and the stage fills the rest of the window; on a narrow window the panel goes below the stage. The public build has no panel, as before.
- **Rationale**: With the old two-column demo layout the stage could never be wider than 420 pixels in development, so this feature could not be checked.

## Work list

| # | Work | Spec |
|---|---|---|
| W1 | Stage fills the window; page padding and scrolling removed on scene pages | FR-001, FR-002, FR-004 |
| W2 | Wide-stage column for panels, dialogs and tree controls | FR-003, FR-007 |
| W3 | Resolution cap in `src/App.jsx` | Performance goal |
| W4 | Test panel as a sidebar | Edge case |
| W5 | Check the five sizes in quickstart.md, with a mouse at 1440×900 | SC-001 to SC-004 |
