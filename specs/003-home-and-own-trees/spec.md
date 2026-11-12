# Feature Specification: A real home page, trees people create, and sending a wish

**Feature Branch**: `003-home-and-own-trees`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "lets replace the test mode to a full production mode. if entering homepage for first time either choose the global tree or ask to create a new one or send a wish to a friend. think about the flow using /speckit-plan. also once created it should be a route param so the tree is shareable if not already. also i'm thinking this should be good for seo no? would you consider switching to nextjs?"

## Context

Today the public address drops a first-time visitor straight into the fly-in on the global tree, community trees can only be created by an operator, and the deployed site still has a "test mode" that a setting can switch on. This feature gives the site a proper front door, lets anyone start a tree for their own people, adds a way to send someone a wish before they have an ornament, makes every tree a link that can be shared, and makes the public pages findable by search engines. It builds on specs 001 and 002 and changes one assumption in 002: community trees are created by visitors, not only by the operator.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A front door with three ways in (Priority: P1)

Someone opens the site's address for the first time. Instead of being flown into a tree, they see a short welcome and three clear choices: hang an ornament on the Giving Tree that everyone shares, start a tree for their own people, or send a wish to a friend. Someone who has been before also sees their own branches at the top, one tap away.

**Why this priority**: It is the first thing every new visitor sees and the only route to the other two stories.

**Independent Test**: Open the home address on a phone that has never visited: the three choices appear within 2 seconds and each leads somewhere. Open it on a phone that has already hung an ornament: "Your branches" appears above the choices.

**Acceptance Scenarios**:

1. **Given** a first-time visitor, **When** they open the home address, **Then** they see the site's name, one sentence about it, and three choices, without the 3D scene having to load first.
2. **Given** a visitor chooses the shared tree, **When** they tap it, **Then** they arrive on the global tree at its own address and the hanging flow starts.
3. **Given** a visitor has branches on this device, **When** they open the home address, **Then** each branch is listed with its tree's name and opens that branch.
4. **Given** a visitor arrives on a card link, a tree link or their Christmas link, **When** it opens, **Then** they go straight there and never see the home page first.
5. **Given** it is after 31 December, **When** a visitor opens the home address, **Then** the choices are replaced by the keepsake of the shared tree and their own branches.

---

### User Story 2 - Start a tree for your own people (Priority: P1)

A visitor chooses to start a tree, gives it a name ("The Georgiou family", "Class 4B", "Flat 12"), and gets a tree of their own at a link they can share. They hang the first ornament. Everyone who opens the link hangs on that tree, and its ornaments never appear on any other tree.

**Why this priority**: It is the main new thing a visitor can do, and it is how groups will spread the site.

**Independent Test**: Create a tree, copy its link, open the link on a second phone and hang there. Both ornaments are on that tree and neither is on the global tree.

**Acceptance Scenarios**:

1. **Given** a visitor enters a tree name, **When** they create it, **Then** the tree exists at once at its own address, which contains a readable form of the name, and they are taken to it to hang the first ornament.
2. **Given** a tree was created, **When** its creator shares the tree's link, **Then** anyone opening it lands on that tree and its preview shows the tree's name.
3. **Given** a name that is empty, too long or blocked, **When** the visitor tries to create the tree, **Then** they are told why and nothing is created.
4. **Given** one device has created several trees in a short time, **When** it tries again, **Then** it is asked to wait.
5. **Given** a tree that an operator has taken down, **When** anyone opens its link, **Then** they see a friendly note and the shared tree, and its ornaments are not shown.
6. **Given** a tree someone created, **When** it is used, **Then** it has no giving, and search engines are asked not to list it.

---

### User Story 3 - Send a wish to a friend (Priority: P2)

A visitor wants to send someone a wish without first hanging an ornament or waiting to be invited. They write their first name, the friend's first name and a wish, and get a link to send. When the friend opens it they see a wrapped parcel with their name on it. To keep it, they hang an ornament; the parcel goes under it, sealed until Christmas morning like any other wish. From 25 December it opens straight away.

**Why this priority**: It gives people a reason to share that asks nothing of them first, but the product works without it.

**Independent Test**: Send a wish to "Tom", open the link on a second phone, hang an ornament there, and see one parcel from the sender under it. On 25 December the wish reads as written.

**Acceptance Scenarios**:

1. **Given** a visitor writes a wish for a friend, **When** they send it, **Then** they get a link and a ready-made message, and never see the wish again.
2. **Given** the friend opens the link, **When** it loads, **Then** they see who it is from and for, a wrapped parcel, and the invitation to hang an ornament to keep it; the words are not shown.
3. **Given** the friend hangs an ornament from that link, **When** it is saved, **Then** the wish is under their ornament as a sealed parcel, and the link cannot be used by anyone else.
4. **Given** the friend already has a branch on this device, **When** they open the link, **Then** the parcel is added to their branch without a second ornament.
5. **Given** a wish that the filter flags, **When** it is sent, **Then** the sender sees the same confirmation and the wish waits for review before the friend can read it.
6. **Given** a sent wish that nobody has claimed, **When** 1 February 2027 arrives, **Then** it is deleted with all other wishes.

---

### User Story 4 - The site can be found, and each address describes itself (Priority: P2)

Someone searching for a Christmas wish tree can find the site, and the result shows a proper title and description. Every public address has real words on it for search engines and for people whose phone is slow to start the 3D scene. Private things stay out of search.

**Why this priority**: It brings visitors who were not sent a link, but it does not change what a visitor can do.

**Independent Test**: Fetch the home, About and shared-tree addresses as a search engine would (without running scripts): each returns its own title, description and readable text. Fetch a card link and a Christmas link: both ask not to be listed.

**Acceptance Scenarios**:

1. **Given** the home, About or shared-tree address is fetched without running scripts, **When** the response is read, **Then** it contains that page's own title, description and at least a paragraph of readable text.
2. **Given** any public address, **When** it is fetched by a person's browser or by a search engine, **Then** both receive the same page.
3. **Given** a card link, a Christmas link, a sent-wish link or a tree someone created, **When** it is fetched, **Then** it asks search engines not to list it.
4. **Given** the site, **When** a search engine asks which pages exist, **Then** it is given the home, About and shared-tree addresses and nothing private.

---

### User Story 5 - No test mode on the live site (Priority: P1)

Nothing on any deployed copy of the site can change the date, pretend to be another device or add made-up people. Those tools exist only on a developer's own machine.

**Why this priority**: A setting that can fake the date on a live site is a risk to every sealed wish.

**Independent Test**: With every setting the old test mode used switched on, a deployed copy still reports that test tools are off and refuses the test routes.

**Acceptance Scenarios**:

1. **Given** any deployed copy of the site, **When** its settings include the old test-mode switches, **Then** the date cannot be faked, the test routes do not exist, and the test panel is not in the page.
2. **Given** a developer runs the site on their own machine, **When** they use the test panel, **Then** it works as before.

---

### Edge Cases

- **Two people choose the same tree name**: both get their own tree; the addresses differ.
- **A tree's creator loses the link**: the tree is still listed under "Your branches" on the device that hung there; otherwise it cannot be found, because created trees are not listed anywhere.
- **Someone opens a sent-wish link twice, or forwards it**: the first person to hang an ornament from it keeps the wish; afterwards the link says it has been opened and offers the tree.
- **A sent-wish link is opened after 31 December**: the keepsake is shown; the wish can no longer be claimed.
- **The sender of a wish wants one back**: after sending, they are offered to hang their own ornament so the friend can reply.
- **Offensive tree names**: filtered on creation; anyone can report a tree; an operator can take it down.
- **A visitor with scripts or 3D unavailable**: the home page still shows its words and choices.

## Requirements *(mandatory)*

### Functional Requirements

**Home**

- **FR-001**: The home address MUST show a welcome with three choices (the shared tree, start a tree, send a wish), usable before the 3D scene has loaded.
- **FR-002**: The home page MUST list the visitor's own branches on this device, each with its tree's name, above the choices.
- **FR-003**: Card, tree, sent-wish and Christmas links MUST open their destination directly.
- **FR-004**: After 31 December the home page MUST show the shared tree's keepsake and the visitor's branches instead of the three choices.

**Trees people create**

- **FR-005**: Any visitor MUST be able to create a tree by giving it a name of 1 to 40 characters, filtered like other names.
- **FR-006**: Every tree MUST have its own shareable address that includes a readable form of its name plus characters that make it unique and hard to guess. The shared tree MUST have its own address too.
- **FR-007**: A created tree MUST be usable immediately, MUST start with giving off, and MUST NOT appear in any list of trees.
- **FR-008**: One device MUST NOT be able to create more than 2 trees in a day.
- **FR-009**: Anyone MUST be able to report a tree, and an operator MUST be able to take one down; a taken-down tree shows a friendly note and the shared tree.
- **FR-010**: A tree link's preview MUST show the tree's name.

**Sending a wish**

- **FR-011**: A visitor MUST be able to send a wish by giving their first name, the friend's first name and a wish of 1 to 140 characters, without hanging an ornament first.
- **FR-012**: A sent wish MUST produce a private link; the page it opens MUST show who it is from and for and MUST NOT show the words.
- **FR-013**: The first person to hang an ornament from the link (or who already has a branch on that tree) MUST receive the wish as a parcel on their branch, under the same sealing rules as every wish (spec 001, FR-013 to FR-015). The link MUST then stop working for anyone else.
- **FR-014**: Sent wishes MUST go through the same filter, review and reporting as other wishes, MUST count towards the per-device wish limit, and MUST be deleted on 1 February 2027 whether or not they were claimed.
- **FR-015**: The sender MUST choose whether the wish leads to the shared tree or to a tree they are on.

**Being found**

- **FR-016**: The home, About and shared-tree addresses MUST each return their own title, description and readable text in the page itself, the same for people and search engines.
- **FR-017**: Card links, Christmas links, sent-wish links and trees people created MUST ask search engines not to list them.
- **FR-018**: The site MUST publish which pages exist (home, About, shared tree) and which paths search engines should not visit.
- **FR-019**: The home page MUST be usable (words and choices visible) within 2 seconds on a typical mobile connection, without waiting for the 3D scene.

**No test mode**

- **FR-020**: No deployed copy of the site may fake the date or the device, or expose test routes or the test panel, whatever its settings. These tools MUST work only when the site is run on a developer's machine.

### Key Entities *(include if feature involves data)*

- **Tree** (from spec 002): gains who created it (a device, not a person), when, and whether an operator has taken it down. Its address is made from its name.
- **Sent wish**: a wish addressed by name to someone who has no ornament yet: from, for, the words, the tree it leads to, a private link, and whether it has been claimed. Becomes an ordinary wish when claimed.
- **Tree report**: a visitor's report of a tree, for operators.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can read the home page and choose a path within 2 seconds of opening it on a typical mobile connection.
- **SC-002**: A visitor can create a tree and reach the point of hanging its first ornament in under 30 seconds.
- **SC-003**: An ornament hung on a created tree never appears on another tree, and a created tree never appears in a search engine's or the site's own lists.
- **SC-004**: A sent wish is readable only by the one person who claimed it, and never before the same moment any other wish would open for them.
- **SC-005**: The home, About and shared-tree addresses, fetched without running scripts, each contain their own title, description and at least 50 words of text.
- **SC-006**: With every former test-mode setting switched on, a deployed copy refuses every test route and reports test tools as off.
- **SC-007**: A burst of 20 tree-creation attempts from one device in a minute creates at most 2 trees.

## Assumptions

- "Send a wish to a friend" means a wish for someone who does not have an ornament yet, delivered by a private link and kept by hanging an ornament. (A wish for someone who already has one is the existing invitation flow.)
- Created trees are private by link: not listed, not indexed. A public directory of trees is out of scope.
- A tree's creator has no special powers over it beyond anyone else's (no renaming, no removing other people's ornaments). Operators handle problems. Creator controls can come later.
- "Replace the test mode" means removing it from every deployed copy; developers keep the tools locally. Date-dependent behaviour on deployed copies is covered by the automated tests rather than by faking the date there.
- Search visibility is wanted for the site itself and the shared tree, not for people's own trees, cards or wishes.
- Whether to move to Next.js is a planning decision, answered in the plan.
