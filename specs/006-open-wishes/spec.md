# Feature Specification: An ornament is a name and a wish

**Feature Branch**: `006-open-wishes`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "create their giving tree, add an ornament and send wishes. When they share the link the user can also open the wish and add their own ornament, so an ornament represents a name and a wish. I liked to keep the box under the ornament as we currently have and when clicking it it opens the wish of the person. But we need to do something for the 25th too, because this would be for before." Then "build it" on the proposal: an open wish now, sealed wishes back for the 25th.

## The model

- **Your ornament carries your wish.** It sits in the box under your ornament and anyone who visits the tree can open it, from the day you hang it.
- **People can leave you a wish back.** Those stay wrapped under your ornament and open for you alone on Christmas morning, exactly as today.

So there is something to read before Christmas, and still a surprise on the day.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hang an ornament with my wish in it (Priority: P1)

After hanging an ornament, I write my wish. It goes in the box under my ornament. I am told plainly that everyone who visits the tree can read it.

**Independent Test**: Hang an ornament and add a wish. Open the tree on another phone, find the ornament and open its box: the wish and the name are shown.

**Acceptance Scenarios**:

1. **Given** my ornament has just been hung (invited or not, before or after 25 December), **When** the next step shows, **Then** it asks for my wish and says who can read it.
2. **Given** I skipped it, **When** I come back to my ornament, **Then** I can still add it. A wish, once added, cannot be changed.
3. **Given** I added a wish, **When** I return to my ornament, **Then** I see my own wish there at any date.

### User Story 2 - Open a friend's wish, then hang mine (Priority: P1)

I open a friend's link. Their gift opens and I read their wish. The main thing offered next is to hang my own ornament with my wish. I can also leave them a wish back, wrapped until Christmas morning.

**Independent Test**: Open a card link on a fresh phone: the friend's wish is shown after the gift opens; "Hang my ornament" is the main button; the wish back still seals and still cannot be read before the 25th.

**Acceptance Scenarios**:

1. **Given** a card whose owner wrote a wish, **When** I open the link, **Then** I see the wish and the name.
2. **Given** a card with no wish, **When** I open the link, **Then** I see the name and am offered the same two steps.
3. **Given** I leave a wish back, **When** its owner looks before 25 December, **Then** they see that it is waiting and from whom, never its words.

### User Story 3 - Open any ornament's wish on the tree (Priority: P1)

Walking round a tree, I tap an ornament. Its card shows the name and, if it has a wish, a button that opens the box and shows it.

**Acceptance Scenarios**:

1. **Given** an ornament with a wish, **When** I tap it and open its box, **Then** the wish and name are shown.
2. **Given** a wish that should not be there, **When** I report it, **Then** it disappears for everyone at once and waits for the team's review.
3. **Given** a wish held by the word check, **When** anyone but its writer looks, **Then** it is not shown.

### User Story 4 - Christmas morning is unchanged (Priority: P1)

On 25 December the wishes people left me open one by one, as built. My own wish is no longer part of that reveal, because it was never hidden.

### Edge Cases

- The time lock still holds for wishes left for someone: nothing but the ornament's own wish reaches a browser early.
- Reporting is limited to five an hour per device.
- A wish written before this change as "a wish for yourself" was promised to be private until Christmas. See Assumptions.
- After the tree closes on 1 January no wish can be added. On 1 February every wish is deleted, open ones included.

## Requirements *(mandatory)*

- **FR-001**: An ornament MAY carry one wish written by its owner (up to 140 characters), shown to anyone who can see the ornament, from the moment it is added.
- **FR-002**: Before it is saved, the owner MUST be told that the wish is readable by everyone who visits the tree.
- **FR-003**: The tree's ornaments and a card's page MUST include the owner's wish only when it passed the word check and has not been reported.
- **FR-004**: Anyone MAY report an ornament's wish; one report hides it for everyone and queues it for review. At most five reports an hour per device.
- **FR-005**: Wishes left for someone else keep every existing rule: one per person per device, sealed until 25 December, private to the receiver.
- **FR-006**: The owner MUST always see their own wish on their own page, including while it is held for review.
- **FR-007**: No page may promise that all wishes are private; the words MUST distinguish the open wish from the sealed ones.

## Success Criteria *(mandatory)*

- **SC-001**: A first-time visitor on a friend's link reads the friend's wish within two taps.
- **SC-002**: A new ornament with its wish is readable by another visitor within 10 seconds.
- **SC-003**: No sealed wish's words are ever served before release (existing time-lock tests still pass).

## Assumptions

- Open wishes are shown on every tree, the shared one included, protected by the word check and one-tap reporting. If that proves too loose for the shared tree it can be limited to trees people create.
- Wishes "for yourself" written before this change are few (the site opened days ago) and become the ornament's open wish. This is a change to what those writers were told.
- No box is drawn under other people's ornaments in the 3D scene yet; the wish opens from the ornament's name card. Boxes under every ornament are a follow-up.
