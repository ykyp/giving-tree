# Feature Specification: A simpler flow: a tree, an ornament, a wish

**Feature Branch**: `005-simpler-flow`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "the user flow might be a bit confusing, not sure what a branch inside a custom tree does. Be creative for sending links to friends, decorating ornaments, sending wishes, in a nice creative way but also straightforward." Followed by "spekit and implement" on the ideas proposed in reply.

## The model people need to hold

Three ideas, and nothing else:

- **A tree is a group of people.**
- **An ornament is you.**
- **A wish is a sealed note under someone's ornament, opened on Christmas morning.**

The word "branch", naming a branch, and "your private Christmas link" leave the visitor's vocabulary. The private link becomes "your key".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - On a tree for your people, wish anyone (Priority: P1)

Someone has hung an ornament on a tree made for their family, class or team. They see who else is on the tree and can leave any of them a wish, from a plain list of names or by tapping an ornament. They can see whom they have already wished.

**Why this priority**: It answers the question "what does a branch do inside our tree?": nothing is needed. The tree is the group.

**Independent Test**: On a community tree with three ornaments, from one phone leave a wish for each of the other two, from the list and from the tree. Each is sealed; a second wish to the same person is refused; the list shows both as done.

**Acceptance Scenarios**:

1. **Given** a community tree with other people's ornaments, **When** I open "Wish someone on this tree", **Then** I see every other name with a way to leave a wish.
2. **Given** I tap an ornament on a community tree, **When** its name card shows, **Then** it offers "Leave {name} a wish".
3. **Given** I have wished someone, **When** I see the list again (also after reloading), **Then** that person is marked as wished and cannot be wished twice.
4. **Given** I have no ornament on this tree yet, **When** I leave a wish, **Then** I am asked for my first name with the wish.
5. **Given** the shared Giving Tree, **When** I look at strangers' ornaments, **Then** no wish button is offered (wishes there come by invitation link only).

---

### User Story 2 - Invited people wish first, hang second (Priority: P1)

Someone opens a friend's link. The first thing offered is what they came for: leave the friend a wish. They type their first name and the wish. Only then are they invited to hang their own ornament next to their friend's.

**Why this priority**: Today an invited person must choose, name and hang an ornament before they can leave a wish; many will give up before the point.

**Independent Test**: Open a card link on a fresh phone. Leave a wish without hanging anything. Then hang an ornament: the name is already filled in and no second wish is asked for.

**Acceptance Scenarios**:

1. **Given** a card link on a phone with no ornament, **When** the friend's ornament is shown, **Then** the main button is "Leave {name} a wish" and hanging first is a smaller choice.
2. **Given** the wish is sealed, **When** the confirmation ends, **Then** the next step offered is hanging my own ornament next to theirs, with my name carried over.
3. **Given** I leave without hanging, **When** I come back to the link, **Then** it says my wish is sealed and still offers to hang mine.

---

### User Story 3 - One vocabulary, no branch (Priority: P1)

Every screen, message, link preview and page speaks of trees, ornaments, wishes and a key. Nobody is asked to name a branch. On the shared tree, people you invite still hang next to you, said in those words.

**Independent Test**: Go through both visits on a wishes-only tree and read every screen and preview: the word "branch" does not appear.

**Acceptance Scenarios**:

1. **Given** any screen or link preview on a tree without giving, **When** it is read, **Then** it does not contain "branch".
2. **Given** my ornament is hung, **When** I am offered to save my way back, **Then** it is called my key, with one sentence saying what it is for.
3. **Given** wishes are waiting before Christmas, **When** I look at my ornament's page, **Then** it says how many are waiting and in how many days they open.

---

### User Story 4 - Make an ornament for a friend (Priority: P2)

Instead of "send a wish", someone makes an ornament for a friend: they pick the ornament, write the friend's name and a wish, and send a link. The friend sees that an ornament was made for them, by whom, and hangs it; the wish goes under it, sealed.

**Independent Test**: Make an ornament for "Tom" with a chosen design. Open the link on another phone: the page shows the design and both names; hanging starts with that ornament and "Tom" already on it; the wish is under it afterwards.

**Acceptance Scenarios**:

1. **Given** the home page, **When** I choose "Make an ornament for a friend", **Then** I pick one of the ornaments, give both first names and write a wish.
2. **Given** the friend opens the link, **When** the page shows, **Then** it names the ornament chosen and who made it, never the wish's words.
3. **Given** the friend chooses to hang it, **When** the tree opens, **Then** that ornament is selected and their name is filled in; they may still change either.
4. **Given** an ornament link made before this change (no design), **When** it is opened, **Then** it works as before.

---

### User Story 5 - Sending a link takes one tap (Priority: P2)

Wherever a link is offered (my invitation, a thank-you, an ornament made for a friend, a tree's link) there are direct buttons for WhatsApp, Telegram, text message and email, the phone's own share sheet where it exists, and copy.

**Independent Test**: On each of the four places, each button opens the right app or composer with the message and the link filled in.

**Acceptance Scenarios**:

1. **Given** a share panel, **When** I tap WhatsApp, Telegram, Message or Email, **Then** that app opens with the message and link ready and nothing is sent to anyone else.
2. **Given** a device without a share sheet, **When** the panel shows, **Then** the "More" button is absent and the others work.

### Edge Cases

- Someone tries to wish their own ornament from the list: their own name is not in the list; the server still refuses.
- A family of twenty wishing each other in one sitting must not hit the hourly limit of a normal visitor: on a community tree the limit is 40 an hour; on the shared tree it stays 10.
- After 25 December the list and buttons still work; wishes open at once, and the words say so.
- After the tree closes (1 January) no wish or ornament-for-a-friend can be made; the buttons are not offered.
- A tree with giving switched on keeps its existing giving sentences; only the non-giving wording changes here.
- Private links and saved ornaments made before this change keep working.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On a community tree, the page MUST list the other ornaments' names and let the visitor leave each one wish, and MUST offer the same from an ornament's name card.
- **FR-002**: The tree's data MUST tell a device which ornaments on that tree it has already wished, so the page can show it after a reload.
- **FR-003**: A wish MUST be accepted from a device with no ornament when it carries a valid first name; the existing rules (once per person per device, not your own, 140 characters, review of flagged words, time lock) are unchanged.
- **FR-004**: An invited visitor MUST be able to leave the wish before hanging, and MUST then be offered to hang with the name carried over; hanging afterwards MUST NOT ask for the wish again.
- **FR-005**: No visitor-facing text on a tree without giving may contain the word "branch"; naming a branch is no longer offered.
- **FR-006**: The private link MUST be presented as "your key" with one sentence of explanation, and keep every existing way to save it.
- **FR-007**: Before 25 December the ornament's own page MUST show the number of wishes waiting and the number of days until they open.
- **FR-008**: An ornament made for a friend MUST carry the chosen design to the friend's page and into the hanging steps; the design is optional so earlier links keep working.
- **FR-009**: Share panels MUST offer WhatsApp, Telegram, text message, email, copy, and the device's share sheet when present, using plain links only: no third-party script, no personal data sent to another company by the site.
- **FR-010**: The hourly limit on wishes per device MUST be 40 on a community tree and stay 10 on the shared tree.

### Key Entities

- **Sent ornament** (was "sent wish"): gains an optional design (0 to 7).
- **Wished list**: for a device and a tree, the ornaments that device has left a wish for. Derived, not stored separately.

## Success Criteria *(mandatory)*

- **SC-001**: A first-time invited visitor can leave a wish in two screens (the friend's ornament, the wish) and under 30 seconds.
- **SC-002**: On a community tree, leaving a wish for another member takes at most three taps from the ornament's page.
- **SC-003**: A reader going through both visits on a wishes-only tree meets three nouns only (tree, ornament, wish) plus "key"; "branch" appears zero times.
- **SC-004**: From any share panel, a link is in a WhatsApp composer in one tap.

## Out of scope (kept as ideas)

Milestones on the shared tree (robin, candle, star), the garland between inviter and invited, the secret wisher draw, a name written by finger, charms, a printable QR gift tag, a story clip, a song link, and rewording the giving sentences.

## Assumptions

- "A tree for your people" is trusted company: anyone holding its link may wish anyone on it. The shared tree is not, so wishes there stay by invitation link.
- Ornaments still hang next to the inviter's on every tree; this is shown, not named.
- The server routes for naming a branch stay (old pages may call them) but no screen offers them.
