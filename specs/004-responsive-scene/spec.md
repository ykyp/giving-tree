# Feature Specification: The tree fills the screen on every device

**Feature Branch**: `004-responsive-scene`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "now make the 3d scene responsive. on desktop should be full screen, mobile as is now and tablet adjust."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - On a computer the tree fills the whole window (Priority: P1)

Someone opens a tree on a laptop or desktop. The village and the tree fill the entire browser window, edge to edge, instead of sitting in a phone-shaped column in the middle. The buttons, forms and messages stay a comfortable reading width and sit where a hand or eye expects them, so nothing is stretched across a wide screen.

**Why this priority**: It is the request, and the scene is the product: on a big screen it should look like a place, not a phone.

**Independent Test**: Open a tree in a desktop browser window and go through hanging an ornament. The scene covers the window at every step; every form and button is usable and no wider than a phone's.

**Acceptance Scenarios**:

1. **Given** a desktop browser window, **When** a tree, a card or a branch is opened, **Then** the scene covers the whole window with no frame, margin or scroll bar.
2. **Given** the window is resized or goes full screen, **When** the size changes, **Then** the scene follows at once without stretching or distorting.
3. **Given** any step of either visit on a wide screen, **When** a form, sheet or set of buttons appears, **Then** it is at most about a phone's width, centred, and readable, and the scene stays visible around it.
4. **Given** a wide screen, **When** the tree is the subject of a shot (lighting it, the star, the greeting), **Then** the whole tree, top to bottom, is in view.

---

### User Story 2 - On a phone nothing changes (Priority: P1)

Someone opens the same tree on a phone. It looks and behaves exactly as it does today: full screen, portrait, with the panels across the bottom.

**Why this priority**: Phones are where most people will open it, and the phone layout is the one that has been tested.

**Independent Test**: Compare each step on a phone-sized screen before and after: positions and sizes are the same.

**Acceptance Scenarios**:

1. **Given** a phone, **When** any step of either visit is shown, **Then** the layout matches today's.

---

### User Story 3 - On a tablet it adapts (Priority: P2)

Someone opens the tree on a tablet, upright or on its side. The scene fills the screen either way, and the panels keep a comfortable width instead of stretching across it.

**Why this priority**: Fewer visitors, but a stretched phone layout on a tablet looks broken.

**Independent Test**: On a tablet-sized screen in both orientations, go through hanging an ornament: the scene fills the screen and every control is reachable and legible.

**Acceptance Scenarios**:

1. **Given** a tablet held upright or sideways, **When** a tree is opened, **Then** the scene fills the screen and panels are centred at a comfortable width.
2. **Given** a tablet is rotated mid-visit, **When** the orientation changes, **Then** the scene and panels adjust and nothing is lost.

---

### Edge Cases

- **A very wide or very short window**: panels never cover the whole height; anything taller than the window scrolls inside itself.
- **A window narrower than a phone** (a desktop window dragged small): it behaves like a phone.
- **A developer's test panel**: it must not put the scene back in a phone frame, or the responsive layout could not be checked.
- **The home page, a sent wish and the loading words**: these are ordinary pages and already adapt; they are not part of this change.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The scene MUST fill the whole browser window on every device, with no frame, page margin or page scrolling.
- **FR-002**: On screens up to phone width the layout MUST be unchanged from today.
- **FR-003**: On wider screens, forms, sheets, buttons and messages MUST be limited to about a phone's width and centred (or anchored to the edge they belong to), and MUST never be wider than the screen.
- **FR-004**: The scene MUST follow the window when it is resized or rotated, without distortion.
- **FR-005**: In shots where the tree is the subject, the whole tree MUST be in view at any window shape.
- **FR-006**: Dragging the ornament, turning the tree, zooming, walking and tapping MUST work the same with a mouse on a wide screen as with a finger on a phone.
- **FR-007**: No panel may be taller than the window; taller content scrolls inside the panel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 375×812, 768×1024, 1024×768, 1440×900 and 1920×1080, the scene covers 100% of the window at every step of visit 1.
- **SC-002**: At those sizes no form or sheet is wider than 480 pixels, and none is cut off by the edge of the window.
- **SC-003**: At 375×812, the position and size of every panel in visit 1 are the same as before this change.
- **SC-004**: A visitor can complete visit 1 with a mouse at 1440×900.

## Assumptions

- "Full screen" means filling the browser window, not asking the browser to enter its own full-screen mode.
- Phone width means up to 480 pixels; tablet 481 to 1024; desktop above that. Tablet and desktop share one layout rule (scene fills the screen, panels at phone width), so there is no separate tablet design.
- The scene's content does not change with size: same village, same shots, same steps.
- Image quality settings (the existing tiers) are unchanged; a large window draws more pixels, and the existing automatic step-down handles slow machines.
