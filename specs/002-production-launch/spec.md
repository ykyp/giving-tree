# Feature Specification: Production launch of the Giving Tree

**Feature Branch**: `002-production-launch`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "lets productionise this please. user facing. use spek it"

## Clarifications

### Session 2026-11-12

- Q: Which system holds the live data? → A: The permanent database on the shared repository, with the two-visit screens moved onto it. No second store.
- Q: Is the charity agreement signed? → A: The tree must work with no charity at all: it is about sending wishes to friends. Giving stays in the product as an option for a tree and is off by default.
- Q: Which trees are public at launch? → A: One global tree, with the option of a tree per community. No MosaicAds branding on the public site.
- Q: What does the public address show before 1 December? → A: The tree is open as soon as it is deployed.

## Context

The two-visit Giving Tree (spec `001-two-visit-december`) works end to end, but only as a demonstration: it opens inside a mocked-up phone beside a panel of notes and test controls, the tree is dressed with made-up names and totals, the brands and charities are placeholders, and nothing is running at a public address. Separately, an earlier piece of work on the shared repository added a permanent database with a gift ledger, a rule that a tree cannot give until its charity agreement is signed, real ornaments and a live gift feed, but without the two-visit screens.

This feature turns the Giving Tree into something a member of the public can be sent a link to: one real product, with real data, safe to share and possible to operate.

It also changes what the product is about. The public Giving Tree is a place to hang an ornament and send wishes to friends and family. It works with no charity, no brand and no money involved. Donations per opened card remain available as an option that an operator can switch on for a tree, and that option is off unless someone turns it on. The public site carries no MosaicAds branding.

People in this spec:

- **Visitor**: any member of the public who opens the site or a link to it.
- **Operator**: the MosaicAds team member who runs the campaign (reviews wishes, watches the numbers, can pause a tree).
- **Community**: a group with its own tree (a family, a school, a workplace, a town).
- **Sponsor**: an organisation whose pot funds gifts on a tree that has giving switched on. Most trees have none.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor sees only the card (Priority: P1)

Someone taps a link on their phone. The Giving Tree fills their screen and starts. There is no mocked-up phone frame, no notes, no test controls and no wording about prototypes, phases or samples. On a computer the card is shown at a comfortable size with nothing else on the page that isn't for them.

**Why this priority**: This is the difference between a demo and a product. Nothing else matters if the first thing a member of the public sees is a developer's control panel.

**Independent Test**: Open the public address, a card link and a Christmas link on a phone and on a computer. Nothing appears that a member of the public could not use or would not understand.

**Acceptance Scenarios**:

1. **Given** a visitor opens any public page on a phone, **When** it loads, **Then** the card fills the screen edge to edge, respecting the phone's notch and home bar, with no frame around it.
2. **Given** a visitor opens any public page, **When** they look through every screen of both visits, **Then** they find no test controls, no way to change the date, no "sample", "demo", "simulated", "prototype" or "phase" wording, and no link to an earlier version.
3. **Given** a team member opens the same site in the team's own testing mode, **When** it loads, **Then** the test controls are available to them and to nobody else.

---

### User Story 2 - Everything on the tree is real (Priority: P1)

Every ornament a visitor can see on the tree was hung by a real person, and every name and count is the true figure at that moment. A new tree looks new: a few ornaments, not a tree pre-filled with invented names. When someone hangs an ornament, visitors already looking at the tree see it arrive.

**Why this priority**: The product's appeal is a shared tree that fills up with real people. Invented names on a public site would be misleading and would make the tree feel fake.

**Independent Test**: Start with an empty tree. Hang two ornaments from two phones. The tree shows exactly two ornaments with those names, and a third phone watching the tree sees the second one arrive.

**Acceptance Scenarios**:

1. **Given** a tree with no cards, **When** a visitor arrives, **Then** the tree has no ornaments on it other than their own once hung, and it says so warmly ("Be the first").
2. **Given** real cards exist, **When** any visitor views the tree, **Then** each ornament shown carries the first name and design of a real card, and tapping one shows whose it is and when it was hung.
3. **Given** a visitor is looking at the tree, **When** someone hangs an ornament, **Then** within a few seconds they see it arrive and the count change, without reloading.
4. **Given** more real ornaments exist than the tree can show at once, **When** a visitor views the tree, **Then** they see their own branch plus the most recent others, and the counts still cover every card.

---

### User Story 3 - Wishes first: no charity, no brand, no money (Priority: P1)

A visitor goes through both visits and the whole experience is about people: hang an ornament, invite friends, leave and open wishes, say thank you. Nothing mentions a donation, a pot, a charity, pence or a sponsor, and nothing is branded MosaicAds. Opening someone's card simply shows their ornament and invites you to hang yours. On Christmas morning "what your branch gave" becomes what your branch grew into: how many people hung ornaments and how many wishes were shared.

Giving is still part of the product for later: an operator can switch it on for one tree, with a sponsor, a named registered charity and a pot. Only then does that tree show giving, under the rules in User Story 3a.

**Why this priority**: This is the product the owner wants to launch. It also removes the largest launch dependency (a signed charity agreement).

**Independent Test**: With giving off (the default), go through both visits on two phones and read every screen, share message, link preview, calendar entry and the keepsake page: no money, charity, sponsor or MosaicAds wording appears anywhere.

**Acceptance Scenarios**:

1. **Given** a tree with giving off, **When** a visitor completes visit 1 and visit 2, **Then** no screen, message, preview or email mentions a gift of money, a pot, a charity, a sponsor or MosaicAds.
2. **Given** a tree with giving off, **When** an invited person opens a card, **Then** they see the sender's ornament and the invitation to hang theirs, with no gift line.
3. **Given** a tree with giving off, **When** a returner reaches the Christmas summary, **Then** it shows the number of ornaments on their branch and wishes shared, and the thank-you message thanks people without an amount.
4. **Given** a new tree is created and nobody changes its settings, **When** it is used, **Then** giving is off.
5. **Given** the public site, **When** any page is viewed, **Then** it is named "The Giving Tree" with its own neutral mark, and MosaicAds appears only where the law requires the operator to be named (the "About and privacy" page).

---

### User Story 3a - Optional giving, honest when it is on (Priority: P3)

An operator can switch giving on for a tree by recording a sponsor, a charity's registered name and number, an amount per gift, a pot and the dates, and confirming the agreement is signed. From then that tree shows who gives, how much and to whom, releases a gift the first time a new person opens a card, keeps a permanent record of every gift, and says plainly when a gift was not released.

**Why this priority**: It keeps the original idea available for a sponsor without being needed for launch.

**Independent Test**: Switch giving on for a test tree with a small pot. Open cards from new phones until the pot is complete: each gift is recorded and shown, the total never passes the pot, and the next open says the pot is complete. Switch giving off: all money wording disappears and the record is kept.

**Acceptance Scenarios**:

1. **Given** giving is on but the agreement is not recorded as signed, **When** a card is opened, **Then** no gift is released or claimed.
2. **Given** giving is on and live, **When** a new person opens a card, **Then** the gift is released, recorded permanently, and the visitor is told the amount, the sponsor and the charity by name and number.
3. **Given** giving is on, **When** a gift is not released, **Then** the visitor is told which case applies: your own card, already given from this phone, pot complete, paused or ended.
4. **Given** the record of gifts for a tree, **When** it is added up, **Then** it equals the total shown and never exceeds the pot.
5. **Given** an operator switches giving off for a tree, **When** visitors use it, **Then** the experience is the wishes-only one and the gift record is kept unchanged.

---

### User Story 4 - A visitor can find out who is behind it and what happens to their data (Priority: P2)

From any screen a visitor can reach a short, plain page that says who runs the Giving Tree, how the giving works, what is stored about them (a first name, the wishes they write, an email only if they give one), why, for how long, and how to ask for it to be removed. The site says it is for adults.

**Why this priority**: A public site that collects names and messages needs this by law and to be trusted, but it does not change the experience itself.

**Independent Test**: From the first screen, reach the information page in two taps or fewer, and find each of the items above.

**Acceptance Scenarios**:

1. **Given** a visitor on the first screen or the tree's details, **When** they look for information about the site, **Then** they find a link to "About and privacy" without starting the card.
2. **Given** the information page, **When** it is read, **Then** it names the operator and a contact, lists what is stored and that wishes and emails are deleted on 1 February 2027, explains the device memory used to count gifts, and states that the site is for adults.
3. **Given** a visitor asks for their ornament or wishes to be removed, **When** the operator acts on it, **Then** the ornament no longer appears on the tree and its wishes can no longer be read.

---

### User Story 5 - A shared link looks right everywhere (Priority: P2)

When someone pastes any Giving Tree link into a message, the preview shows a proper title, a sentence and a picture. The site has a name and an icon in the browser and when saved to a phone's home screen.

**Why this priority**: The campaign spreads through messaging apps; a bare link is opened far less often. It is polish on a working product.

**Independent Test**: Paste the home address, a card link and a thank-you link into a messaging app. Each shows a title, description and image, and none reveals a private link.

**Acceptance Scenarios**:

1. **Given** the home address is shared, **When** a preview is built, **Then** it shows the Giving Tree's name, one sentence about it and a picture of the tree.
2. **Given** a card link is shared before its sender has opened the share screen, **When** a preview is built, **Then** it still shows a picture (the general one) rather than none.
3. **Given** any public page, **When** it is opened in a browser, **Then** the tab shows the site's name and icon.

---

### User Story 6 - It fails gracefully (Priority: P2)

If a visitor's phone cannot show the 3D scene, is on a slow connection or loses connection part-way, they are told what is happening in plain words and nothing they made is lost or falsely confirmed. A person who prefers reduced motion gets a calmer version.

**Why this priority**: A public audience includes old phones and bad signal. Without this some visitors meet a blank screen, but most never see these states.

**Independent Test**: Open the site with 3D turned off, on a throttled connection, and with the connection cut after hanging an ornament. Each case shows a clear message and a way forward.

**Acceptance Scenarios**:

1. **Given** a phone that cannot show the 3D scene, **When** a visitor opens a card link, **Then** they see a simple page that still names the sender and lets them leave a wish, with no claim that another version exists unless it does.
2. **Given** a slow connection, **When** the site is loading, **Then** the visitor sees the opening screen with progress within 2 seconds, not a blank page.
3. **Given** the connection drops while saving an ornament or a wish, **When** the save fails, **Then** the visitor is told it didn't save and can try again, and nothing is shown as sealed or hung until it is.
4. **Given** the service behind the site is unavailable, **When** a visitor arrives, **Then** they see a message that the tree can't be reached and a way to try again.

---

### User Story 7 - The operator can run the campaign (Priority: P2)

The operator can see how each tree is doing, review flagged and reported wishes, take down an ornament, pause and resume a tree, and is told when something needs attention (wishes waiting for review, errors, and a pot nearly complete where giving is on). The site resists obvious abuse such as one person creating thousands of cards or wishes.

**Why this priority**: The campaign runs for a month with real people's messages. It can launch with a small tool set, but not with none.

**Independent Test**: The operator, signed in, sees today's numbers for a tree, approves one wish and rejects another, and hides an ornament; a script creating cards in a tight loop is slowed or stopped.

**Acceptance Scenarios**:

1. **Given** flagged or reported wishes exist, **When** the operator opens the review screen, **Then** they can approve or reject each one without using a command line.
2. **Given** an ornament with an unacceptable name, **When** the operator hides it, **Then** it disappears from the public tree and from the keepsake list.
3. **Given** a tree, **When** the operator looks at its numbers, **Then** they see every measure listed in spec 001 (FR-038), for each visit and in total.
4. **Given** one device or address creates cards or wishes far faster than a person could, **When** the limit is passed, **Then** further attempts are refused for a while and real visitors are unaffected.
5. **Given** wishes are waiting for review for more than a day, **When** that happens, **Then** the operator is notified.

---

### User Story 8 - One global tree, and a tree for a community (Priority: P2)

At the public address there is one global tree that anyone can hang an ornament on. A community (a family, a school, a workplace, a town) can also have its own tree at its own link, with its own name, where only that community's ornaments hang. A card and its branch belong to exactly one tree.

**Why this priority**: The global tree alone is a complete launch. Community trees make it personal and give groups a reason to share one link, so they follow closely.

**Independent Test**: Open the public address: the global tree appears. Open a community tree's link: it shows that community's name and only its ornaments, and an ornament hung there does not appear on the global tree.

**Acceptance Scenarios**:

1. **Given** the public address, **When** a visitor opens it, **Then** they are on the global tree.
2. **Given** a community tree exists, **When** a visitor opens its link, **Then** they see its name and only the ornaments hung there, and cards they make belong to it.
3. **Given** an invitation from someone on a community tree, **When** it is opened, **Then** the invited person hangs on that same tree.
4. **Given** a link to a tree that does not exist, **When** a visitor opens it, **Then** they see a friendly message and the global tree, not an error.
5. **Given** a community wants a tree, **When** it is created, **Then** it gets a name (filtered like other names) and a link, and giving is off.

---

### Edge Cases

- **Before 1 December**: the tree is open as soon as it is deployed. Ornaments can be hung and wishes sealed early; wishes still open on 25 December.
- **Two sets of existing work**: cards or settings already created during testing must not appear on the public tree at launch; the launch starts from an empty, real record.
- **The same person on two phones**: each phone is a separate device (it can leave its own wish); this is stated on the information page.
- **A visitor clears their browser data**: their device is treated as new; their Christmas link still works.
- **Giving switched on or off mid-campaign**: the change applies to cards opened from that moment; earlier gifts stay in the record, and screens already open do not claim gifts afterwards.
- **A sponsor withdraws**: the operator switches giving off or ends it; the record stays, and the tree carries on as a wishes tree.
- **Someone opens a card on the wrong tree's link**: the card's own tree is shown.
- **Team testing on the live site**: tests by the team must not appear on public trees or in the gift record.
- **Very long or unusual names** (other alphabets, apostrophes, hyphens) display correctly on ornaments, previews and the keepsake.
- **A link opened inside a messaging app's built-in browser** works the same as in the phone's main browser, including saving the Christmas link.

## Requirements *(mandatory)*

### Functional Requirements

**One real product**

- **FR-001**: The public site MUST show only the visitor's experience: no phone frame, notes, test controls, date changer or prototype wording on any public page.
- **FR-002**: On phones the experience MUST fill the screen and respect safe areas; on larger screens it MUST be presented at a comfortable phone-like width, centred, with a plain background.
- **FR-003**: Test controls (changing the date, adding made-up friends, resetting the device) MUST be available only in the team's testing mode and MUST be impossible to switch on from the public site.
- **FR-004**: The product MUST have one system of record: the two-visit experience from spec 001 and the permanent record of trees, cards, gifts and wishes MUST be the same system, with no second store holding live data.
- **FR-005**: Every rule in spec 001 (time lock, privacy of wishes, one wish per device per branch, counting, moderation, deletion on 1 February 2027, freeze after 31 December) MUST still hold after this change, and the existing tests for them MUST still pass.

**Real data**

- **FR-006**: The tree MUST show only ornaments from real cards; no invented names, ornaments or counts may appear on any public page.
- **FR-007**: Counts and newly hung ornaments MUST come from the record at the time of viewing and MUST appear for visitors already on the page within 10 seconds.
- **FR-008**: When there are more ornaments than can be shown, the tree MUST show the viewer's own branch and the most recent others, and all counts MUST still cover every card.
- **FR-009**: Data created by testing MUST NOT appear in the public record at launch, and team testing after launch MUST NOT appear on public trees.

**Wishes first**

- **FR-010**: Every tree MUST work fully with no charity, sponsor or money: hanging, branches, sealed wishes, the Christmas opening, thank-you cards, the finale and the keepsake.
- **FR-011**: Giving MUST be an option per tree that is off by default. With giving off, no screen, share message, link preview, calendar entry, email or keepsake may mention a donation, pot, charity, sponsor or amount.
- **FR-012**: With giving off, the Christmas summary MUST show what the branch grew into (ornaments on the branch and wishes shared) and the thank-you message MUST thank people without an amount.
- **FR-013**: The public site MUST NOT carry MosaicAds branding (name, mark, colours, "presents" screen, "powered by" line). The operator is named only on the "About and privacy" page.
- **FR-014**: The site's name on every page, preview and message MUST be "The Giving Tree", with one neutral mark.

**Optional giving (only for a tree with giving switched on)**

- **FR-015**: Switching giving on MUST require a sponsor name, the charity's registered name and number, an amount per gift, a pot, the dates and a recorded signed agreement. Until all are present the tree MUST NOT release or claim gifts.
- **FR-016**: With giving on and live, the counting rules from spec 001 (FR-024 to FR-026) MUST apply, every released gift MUST be written to a permanent record, and the sum of that record MUST equal the displayed total and MUST NOT exceed the pot.
- **FR-017**: With giving on, the tree's details MUST show the sponsor, the charity's name and number, the amount, the pot, the dates and when the charity is paid, and a visitor MUST be told plainly when a gift was not released and why.
- **FR-018**: Operators MUST be able to switch giving on and off and pause it; none of these may change the recorded total.

**Trust**

- **FR-019**: Every public page MUST offer a route, in two taps or fewer, to an "About and privacy" page stating who operates the site, a contact, how giving works, what is stored and why, how long it is kept, how to ask for removal, the device memory used, and that the site is for adults. If any tree has giving on, it also explains how giving works.
- **FR-020**: Operators MUST be able to remove a person's ornament and wishes on request, after which they are not shown or readable anywhere.
- **FR-021**: The site MUST NOT load advertising or third-party tracking, and MUST NOT set device memory beyond what remembering the visitor's own branch, limiting one wish per device and (where giving is on) counting gifts need.

**Sharing and presence**

- **FR-022**: Every public address MUST produce a link preview with a title, a description and an image; a card link MUST always have an image, falling back to a general one.
- **FR-023**: The site MUST have a name and icon for the browser tab and the phone home screen.
- **FR-024**: Private Christmas links MUST NOT be indexed by search engines or exposed in previews.

**Resilience**

- **FR-025**: A visitor whose device cannot show the 3D scene MUST get a simple version of the card that still shows whose card it is and lets them leave a wish; the site MUST NOT promise a version that does not exist.
- **FR-026**: The opening screen MUST appear within 2 seconds on a typical mobile connection, and the first interactive moment within 5 seconds.
- **FR-027**: Any failure to save MUST be shown to the visitor with a way to retry; nothing may be shown as hung, sealed, sent or given until the record confirms it.
- **FR-028**: Visitors who prefer reduced motion MUST get the flow without the long flights or camera drift.

**Operating it**

- **FR-029**: Operators MUST have a signed-in screen to review wishes (approve, reject), hide ornaments, see each tree's measures, create a community tree, and switch giving on or off for a tree.
- **FR-030**: The site MUST limit how fast one device or network address can create cards and wishes, without affecting normal use.
- **FR-031**: Operators MUST be notified when wishes have waited more than 24 hours for review, when errors rise above normal, and (where giving is on) when a pot passes 90% and 100%.
- **FR-032**: Errors that visitors hit MUST be recorded so the team can see and fix them, without recording wishes or private links.

**Trees**

- **FR-033**: The public address MUST show one global tree. Each community tree MUST have its own public address and name; cards, branches and wishes MUST belong to exactly one tree.
- **FR-034**: An invitation MUST always lead to the inviter's tree, and a card link MUST always show the card's own tree.
- **FR-035**: Community trees MUST be creatable without a product release, MUST have their names filtered like other names, and MUST start with giving off. At launch the operator creates them on request; letting visitors create their own is a later step (see Assumptions).
- **FR-036**: Only published trees MUST be reachable. The fictional example brands (Larkfield Coffee, Fern & Field) MUST NOT exist on the public site.

### Key Entities *(include if feature involves data)*

- **Tree**: the global tree or a community's tree: its name, its link, whether it is published, and its giving settings (off by default).
- **Giving settings** (optional, per tree): sponsor, charity's registered name and number, amount per gift, pot, total given, dates, whether the agreement is signed, and whether giving is on, paused or ended.
- **Gift record** (only for trees with giving on): one line per released gift: tree, card, amount, time and the first name shown. The public total is the sum of these.
- **Card, Branch, Wish, Open, Reminder**: as defined in spec 001, now held in the same record as trees and gifts.
- **Operator**: a team member allowed to review, hide, create trees, change giving settings and read measures.
- **Removal request**: a person's request to take down their ornament and wishes, and when it was done.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A member of the public can open the public address on a phone and complete visit 1 without meeting any test control, sample data or placeholder text.
- **SC-002**: With giving off, a full read-through of both visits, every share message, every link preview and the keepsake finds zero mentions of money, a charity, a sponsor or MosaicAds.
- **SC-003**: Zero invented names, ornaments or counts appear on any public page (checked by starting from an empty tree).
- **SC-004**: An ornament hung on one phone appears on another phone already viewing the same tree within 10 seconds, 95% of the time.
- **SC-005**: 95% of visitors on a typical mobile connection see the opening screen within 2 seconds and can interact within 5.
- **SC-006**: A visitor can reach "About and privacy" from any screen in two taps or fewer, and every item in FR-019 is on it.
- **SC-007**: Every public address shared in the three most-used messaging apps shows a title, description and image.
- **SC-008**: An operator can approve or reject a waiting wish in under 30 seconds without technical help.
- **SC-009**: All tests from spec 001 still pass against the single system of record, with the counting tests run on a tree that has giving on.
- **SC-010**: A burst of 100 card or wish attempts in one minute from one device results in no more than 10 being accepted.
- **SC-011**: For any tree with giving on, the total shown equals the sum of its gift record to the penny, never exceeds its pot, and no gift is ever claimed while its agreement is unsigned.
- **SC-012**: An ornament hung on a community tree never appears on the global tree or another community's tree.

## Assumptions

- The product keeps the name "The Giving Tree" even with giving off: people give each other wishes.
- The public address is still to be chosen. `christmas.mosaicads.ai` is in today's share links, but it carries the MosaicAds name, which FR-013 rules out of the public experience; a neutral address is assumed.
- The site opens as soon as it is deployed. The calendar from spec 001 is otherwise unchanged: wishes open on 25 December, the finale is on 31 December, and personal data is deleted on 1 February 2027.
- The global tree launches first. Community trees are created by the operator on request at launch; self-service creation by visitors is left for later because it needs its own moderation and abuse limits. This is an assumption to confirm with the owner.
- This spec amends spec 001 wherever that spec says a share or an open releases a gift: that now applies only to a tree with giving on.
- The permanent database already described in the shared repository (trees, cards, gift record, wishes, reminders, with the "live needs a signed agreement" rule and a live feed) is the system of record; the two-visit experience moves onto it. How is a planning decision.
- Email reminders stay switched off at launch (spec 001, FR-022).
- The team's testing mode is a separate, non-public deployment or a signed-in setting; which one is a planning decision.
- The simple no-3D version (FR-021) is a plain page, not a second animated experience.
- The operator screen is for a handful of named team members; it needs to be secure, not beautiful.
- English only, UK audience, amounts in pounds and pence.
- Bought 3D models (tree, village) are out of scope; the current scene ships.
