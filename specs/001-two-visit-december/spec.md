# Feature Specification: The Giving Tree, two visits in December

**Feature Branch**: `001-two-visit-december`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "The Giving Tree: two visits in December" (product document, 9 Nov 2026). People visit twice: once between 1 and 24 December to hang an ornament and seal a wish inside it, and once between 25 and 31 December to open the wishes their friends and family left them. The first share is an ask ("leave me a Christmas wish"); the second is a thank-you ("look what we gave together"). Both shares release a gift from the brand's pot.

## Clarifications

### Session 2026-11-12

- Q: Are email reminders offered at launch? → A: No. Launch with calendar and self-send only; switch email on later if fewer senders save their link than hoped.
- Q: Does the brand appear in the Christmas opening? → A: No. It stays in the background (top-bar mark and gift line only).
- Q: Is 140 characters right for a wish? → A: Yes, 140 characters.

## User Scenarios & Testing *(mandatory)*

The hook is a time lock. A wish someone leaves you in December stays sealed until Christmas morning, so there is a reason to invite people now and a reason to come back later. It works like an advent gift: you can see the parcels pile up under your ornament, but you can't open them.

People in this spec:

- **Sender**: someone who hangs an ornament and invites others to their branch.
- **Invited person**: someone who opens a sender's link, hangs their own ornament next to the sender's and leaves them a wish. Their ornament starts their own branch, so they become a sender too.
- **Returner**: a sender who comes back to their private Christmas link.
- **Brand**: the company whose pot pays for each gift.
- **Reviewer**: a person on the MosaicAds team who checks flagged wishes.

### User Story 1 - Hang an ornament and invite people to your branch (Priority: P1)

Between 1 and 24 December, a sender arrives, lights the tree, picks an ornament, writes their first name on it and hangs it on a hook. Their ornament becomes the start of their branch, and the hooks around it are kept free for the people they invite. They can seal a wish for themselves (optional, "What do you hope for next year?"). Then they share an invitation asking people to hang an ornament next to theirs and leave them a wish. Before they leave, they are asked to keep their own private Christmas link.

**Why this priority**: Nothing else exists without it. It is today's flow plus the branch, and it must be live on 1 December so wishes can be sealed before Christmas.

**Independent Test**: A tester hangs an ornament, seals or skips a wish for themselves and opens the invitation. They can see the share message, the link preview, the branch counter with empty hooks, and the three ways to save their Christmas link.

**Acceptance Scenarios**:

1. **Given** it is between 1 and 24 December, **When** a sender hangs their ornament, **Then** the hooks around it stay free of other ornaments and are shown as empty hooks waiting to be filled.
2. **Given** the ornament is hung, **When** the sender writes a wish for themselves and seals it, **Then** a wrapped parcel appears at the foot of their ornament labelled as theirs, and the words are not shown again before Christmas.
3. **Given** the ornament is hung, **When** the sender chooses Skip, **Then** they continue without a parcel and nothing is lost.
4. **Given** the sender opens the invitation, **When** they share it, **Then** the message reads "I hung an ornament on the Giving Tree. Hang yours next to mine and leave me a wish for Christmas morning 🎄" with their link.
5. **Given** the sender has shared or is about to leave, **When** the save step appears, **Then** they are offered Add to calendar, Send it to myself and (if enabled) an email reminder, and told plainly that a lost link can't be recovered on another phone.
6. **Given** a sender names their branch (for example "The Georgiou family"), **When** anyone views the branch, **Then** that name is shown on it.

---

### User Story 2 - Hang next to the sender and leave a sealed wish (Priority: P1)

An invited person opens the sender's link. They see the same arrival, then the sender's ornament with the sender's name. Opening the card releases the brand's gift (if it counts). They hang their own ornament on the sender's branch and write the sender a wish. Once sent, the wish is sealed: they see a wrapped parcel with the sender's name on the tag, never the words. Their own ornament starts their own branch, so they get their own invite-and-wish loop.

**Why this priority**: The sealed wishes are why the sender shares at all. Without this story, Christmas morning has nothing to open.

**Independent Test**: Using a sender's link on a second device, a tester hangs an ornament on that branch and leaves a wish. They see the sealed parcel confirmation and can then invite people to their own branch.

**Acceptance Scenarios**:

1. **Given** an invited person opens a sender's link for the first time on their device, **When** the card opens, **Then** the brand gives its amount to the charity and the person is told so.
2. **Given** the invited person chooses to hang theirs, **When** they drag their ornament, **Then** only free hooks on the sender's branch are offered.
3. **Given** the invited person writes a wish of 1 to 140 characters, **When** they seal it, **Then** they see a wrapped parcel tagged "To {sender}, from {them}" and can never read the wish again.
4. **Given** the invited person already has their own branch on this device, **When** they open a different sender's link, **Then** they can leave that sender a wish without making a second ornament.
5. **Given** the invited person has already left a wish for this sender from this device, **When** they try again, **Then** they are told they have already left one.

---

### User Story 3 - Come back before Christmas and watch the parcels pile up (Priority: P2)

A sender who returns between 1 and 24 December, through their Christmas link or the original card link on the same phone, sees their branch: the new ornaments on it and a pile of wrapped parcels with a counter, for example "4 wishes waiting · opens 25 December". The names on the tags are visible; the words are not.

**Why this priority**: It turns waiting into anticipation and prompts a second round of invitations, but visit 1 and visit 2 both work without it.

**Independent Test**: After two other people leave wishes, the sender opens their Christmas link before 25 December and sees two tagged parcels and the counter, with no way to read either wish.

**Acceptance Scenarios**:

1. **Given** wishes have been left for a sender, **When** they return before Christmas, **Then** they see one tagged parcel per wish with the writer's first name, and a count of wishes waiting.
2. **Given** a sender returns before Christmas, **When** they try to open any parcel, **Then** it stays closed, and the words are not available to their device in any form.
3. **Given** a sender lost their Christmas link but still has the phone they used, **When** they open their original card link, **Then** they are taken straight to their branch.

---

### User Story 4 - Open your wishes on Christmas morning (Priority: P1)

From 25 December, the village changes: fresh snow, church bells, presents under every tree and the square full of the season's ornaments. A short flight (about 5 seconds) goes straight to the returner's branch, where their ornament glows and the parcels shake gently. They tap a parcel: the ribbon unties, the lid lifts and the wish appears in a handwriting style with the writer's name, with one chime per parcel. Every parcel can also be opened with a button.

**Why this priority**: This is the emotional payoff and the moment people screenshot. It is the reason the time lock exists.

**Independent Test**: With the date set to 25 December, a returner with two wishes opens their link, opens both parcels by tap or button, and reads each wish with its writer's name.

**Acceptance Scenarios**:

1. **Given** it is 25 December in the returner's own time zone, **When** they open their Christmas link, **Then** the short flight plays and their parcels are ready to open.
2. **Given** a parcel is closed, **When** the returner taps it in the scene or presses its button, **Then** it opens with the untie-and-lift animation and a single chime, and the wish is shown as real text that a screen reader can read.
3. **Given** a returner finds a wish offensive, **When** they press Report, **Then** the wish is hidden from them at once and sent for review.
4. **Given** the returner sealed a wish for themselves, **When** they have opened their friends' wishes, **Then** their own wish is offered last, as a small coda.

---

### User Story 5 - See what your branch gave and say thank you (Priority: P2)

After the wishes, the returner sees what their branch gave, for example "Your branch: 9 ornaments, 9 cards opened, £0.90 to a UK food charity", then the whole tree's total, in exact amounts. One tap builds a thank-you card from the branch: their ornament surrounded by the names of the people who hung theirs. Sending it to each person (or a family group) says thank you and invites them to open their own wishes. Each new person who opens the thank-you releases a gift under the same rule.

**Why this priority**: It drives the second sharing peak and closes the loop emotionally, but the wishes themselves (Story 4) stand on their own.

**Independent Test**: A returner with a branch of three sees exact totals for their branch and the tree, opens the thank-you card, and shares a message reading "Opened your wish, thank you! Our branch gave £0.30 to a food charity. Open yours →".

**Acceptance Scenarios**:

1. **Given** the returner's branch has ornaments and counted opens, **When** the summary shows, **Then** it lists the number of ornaments, cards opened and the exact amount given by the branch, then the exact total for the whole tree.
2. **Given** the pot has run out, **When** the summary shows, **Then** the gift line reads "The pot is complete: thank you".
3. **Given** a person who left a wish receives the thank-you card, **When** they open it on a device that already has their branch, **Then** they are taken to their own branch with a note that the sender says thank you.
4. **Given** a person who has never taken part receives the thank-you card, **When** they open it, **Then** the brand's gift is released under the normal counting rule and they can hang their own ornament.

---

### User Story 6 - New Year's Eve finale and the keepsake page (Priority: P3)

From 18:00 local time on 31 December, fireworks go off over the church and the tree's lights pulse at midnight. The thank-you card switches to "Happy New Year from our branch". After 31 December the tree freezes into a keepsake page: "The 2026 Giving Tree", the final total, every first name, and a link to your branch.

**Why this priority**: It is a finishing touch and a page the brand can quote in January. Nothing earlier depends on it.

**Independent Test**: With the date set to 31 December at 18:30, fireworks show and the thank-you card says Happy New Year. With the date set to 2 January, the keepsake page shows the final total and every name, and no new ornament can be hung.

**Acceptance Scenarios**:

1. **Given** it is 31 December from 18:00 local time, **When** anyone views the village, **Then** fireworks show over the church.
2. **Given** it is midnight going into 1 January, **When** the tree is on screen, **Then** its lights pulse.
3. **Given** it is after 31 December, **When** anyone opens the tree, **Then** they see the keepsake page with the final total and every first name, and cannot hang a new ornament.

---

### User Story 7 - Late arrival between 25 and 31 December (Priority: P3)

Someone whose first visit is between 25 and 31 December can still hang an ornament and invite people. Wishes left for them open immediately instead of being sealed. The brand's pot rules still apply.

**Why this priority**: It keeps the campaign useful in the quiet week, but it is a variation on Stories 1 and 2.

**Independent Test**: With the date set to 27 December, a new person hangs an ornament (with no self-wish step), a friend leaves them a wish, and the wish can be opened straight away.

**Acceptance Scenarios**:

1. **Given** it is between 25 and 31 December, **When** a new person hangs an ornament, **Then** they are not offered a sealed wish for themselves, and the invitation drops "for Christmas morning".
2. **Given** a wish is left for a late arrival, **When** they open their link, **Then** the wish can be opened at once.

---

### Edge Cases

- **Device clock set forward**: a returner whose device says 25 December while the earliest time zone has not reached Christmas still sees sealed parcels.
- **Different time zones**: a reader in New Zealand opens their wishes at their own midnight, hours before a reader in London.
- **Lost Christmas link**: the original card link on the same phone still finds the branch; on a new phone with no saved link, the wishes are lost. This is said plainly when the reminder is offered.
- **Sender opens their own card**: no gift is released, and they are told it gives when someone else opens it.
- **Same device opens a card twice**: the gift is released only the first time.
- **Link-preview bots** (messaging apps fetching a preview): never release a gift.
- **Pot runs out early**: wishes, branches and the Christmas opening keep working; the gift line reads "The pot is complete: thank you".
- **Branch fills up**: when more people join than there are free hooks nearby, the ornament count is still exact even if not every ornament is drawn next to the owner's.
- **Flagged wish**: a wish containing profanity, a link or contact details waits for review; the writer sees the same sealed confirmation and is not told it was flagged.
- **Reported wish**: it is hidden from the reader straight away and goes to review.
- **Writer leaves a wish for their own card**: refused, with a message saying to ask someone else.
- **No connection when saving**: the person is told their ornament or wish wasn't saved and can try again; nothing is shown as sealed until it is saved.
- **After 1 February 2027**: wishes and emails are gone; the Christmas link shows the keepsake page.

## Requirements *(mandatory)*

### Functional Requirements

**Visit 1: hang and seal (1 to 24 December)**

- **FR-001**: The system MUST keep today's arrival, ornament choice, name writing and hanging steps unchanged.
- **FR-002**: When a sender hangs their ornament, the system MUST keep the hooks nearest to it free for the people they invite, and show them as empty hooks.
- **FR-003**: The system MUST offer the sender an optional wish for themselves (up to the wish length limit), with a Skip choice. A sealed self-wish appears as a parcel at the foot of their ornament.
- **FR-004**: The system MUST show a branch counter ("Your branch: N ornaments") with empty hooks drawn beside it.
- **FR-005**: Senders MUST be able to name their branch (up to 28 characters). The name is filtered like ornament names and shown on the branch and on the thank-you card.
- **FR-006**: The system MUST let the sender share an invitation with the visit-1 message and a link preview showing their ornament close up, their name and how many wishes are waiting.
- **FR-007**: Before the sender leaves, the system MUST ask them to keep their private Christmas link, offering the three ways in FR-020 to FR-022.

**Invited person**

- **FR-008**: When an invited person opens a link, the system MUST show the arrival, then the sender's ornament with the sender's name and branch name (if any).
- **FR-009**: The invited person MUST be able to hang their own ornament on a free hook on the sender's branch, and their ornament MUST start their own branch with the same invite-and-wish loop.
- **FR-010**: The invited person MUST be able to write the sender one wish of 1 to 140 characters, signed with their first name, and seal it. They MUST never be shown the words again once sent.
- **FR-011**: A device that already has its own branch MUST be able to leave a wish on another sender's branch without hanging a second ornament.
- **FR-012**: The system MUST accept only one wish per device for each branch.

**Time lock and privacy**

- **FR-013**: A wish MUST stay sealed until 25 December 00:00 in the reader's own time zone. It is released only when the earliest time zone on Earth has reached 25 December (24 December 10:00 UTC) **and** the reader's own device date is 25 December or later.
- **FR-014**: Before release, the reader MUST be able to see the writers' first names and the number of wishes waiting, and MUST NOT be able to obtain the words in any form.
- **FR-015**: Only the person a wish was written for MUST be able to read it, through their private Christmas link. Wishes MUST never appear on the public tree, link previews or the keepsake page; only first names appear on ornaments.
- **FR-016**: Private Christmas links MUST be unguessable and MUST NOT appear in any public page, preview or shared invitation.

**Visit 2: open the wishes (25 to 31 December)**

- **FR-017**: From 25 December, the village MUST show fresh snow, church bells, presents under the trees and a square full of ornaments, and the return visit MUST fly straight to the returner's branch in about 5 seconds, skippable with a tap.
- **FR-018**: The returner MUST be able to open each wish one by one, by tapping the parcel in the scene or pressing a button for it. Opening shows the untie-and-lift animation, the wish in a handwriting style, the writer's name and one chime.
- **FR-019**: The system MUST then show what the branch gave (ornaments, cards opened, exact amount) and the whole tree's exact total, then offer a thank-you card built from the branch (the returner's ornament and the names of everyone on it). It MUST offer the returner's own sealed wish last, if they wrote one.

**Bringing people back without accounts**

- **FR-020**: The system MUST offer a one-tap calendar event, "Open your Christmas wishes 🎁", on 25 December at 09:00 local time, containing the Christmas link, without collecting any personal data.
- **FR-021**: The system MUST offer "Send it to myself", opening the person's share sheet or messaging app with the Christmas link prefilled.
- **FR-022**: Email reminders MUST NOT be offered at launch; visit 1 starts with calendar and self-send only. The email option MUST be ready to switch on later without a release if the share of senders saving their link proves low. When it is on, the system MUST collect an email address only with the purpose "We'll email you once, on 25 December, with your link. Nothing else", with a separate, unticked box for brand news, and MUST send at most one reminder email.
- **FR-023**: The device MUST remember its own branch, so opening the original card link (or a thank-you card from someone on the branch) on the same device goes straight to the person's branch.

**Gift counting (unchanged from today)**

- **FR-024**: The system MUST release the brand's amount (10p by default) the first time a new device opens a card, and never for the sender's own device, a repeat open from the same device, or a link-preview bot. Thank-you cards MUST follow the same rule.
- **FR-025**: Gifts MUST stop at the brand's cap. After that, every feature keeps working and the gift line reads "The pot is complete: thank you".
- **FR-026**: All amounts shown MUST be exact, never rounded or estimated.

**Moderation and safety**

- **FR-027**: The system MUST check every wish on submit for profanity, links and contact details. Anything flagged MUST wait for a reviewer before the reader can see it, and the writer MUST see the same confirmation either way.
- **FR-028**: Every opened wish MUST have a Report button that hides it from the reader at once and sends it for review.
- **FR-029**: Reviewers MUST be able to see flagged and reported wishes and approve or reject each one.
- **FR-030**: Wishes MUST only reach someone who shared their own link; the system MUST offer no way to message strangers. Copy and sharing channels MUST be aimed at adults (CAP code 8.33.9 still applies).

**Data**

- **FR-031**: The system MUST store only first names, wishes and optional email addresses as personal data.
- **FR-032**: Wishes and email addresses MUST be deleted on 1 February 2027. The keepsake page keeps first names and totals.

**Finale and keepsake**

- **FR-033**: From 18:00 local time on 31 December, the village MUST show fireworks over the church, the tree's lights MUST pulse at midnight, and the thank-you card MUST read "Happy New Year from our branch".
- **FR-034**: After 31 December, the tree MUST freeze into a keepsake page, "The 2026 Giving Tree", with the final total, every first name and a link to the person's branch; no new ornaments or gifts are accepted.
- **FR-035**: First visits between 25 and 31 December MUST work, with wishes opening immediately rather than being sealed, and the pot rules unchanged.

**Brand and measurement**

- **FR-036**: The brand MUST stay in the background of the Christmas opening: its mark in the top bar and its name on the gift line only. No branded greeting, message or card may appear between the arrival and the last wish.
- **FR-037**: Every wish and self-wish MUST be 1 to 140 characters, enforced when it is written and again when it is saved.
- **FR-038**: The system MUST record, per brand: wishes sealed per sender, opens per sent card for each visit, Christmas links saved (by calendar, self-send and email), the return rate between 25 and 31 December, thank-you cards sent per returner, and gifts released per visit and in total.

### Key Entities *(include if feature involves data)*

- **Card / ornament**: one person's ornament on one brand's tree. It has a first name, a design, a hook position, an optional branch name, the card it was invited from (if any), a public link and a private Christmas link.
- **Branch**: a card plus the cards of the people who hung theirs next to it. Its totals are its ornament count, its counted opens and the amount it gave.
- **Wish**: a short message to one card, from a first name, either a friend's wish or a self-wish. It has a status (visible, waiting for review, rejected), whether it has been opened, and whether it was reported. Deleted on 1 February 2027.
- **Open**: the first time a given device opens a given card. It decides whether a gift is released.
- **Gift ledger / pot**: the running total each brand has given, against its cap.
- **Reminder**: an optional email address tied to one Christmas link, with an unticked brand-news choice. Deleted on 1 February 2027.
- **Brand tree**: the brand's name, charity, amount per open, cap and campaign dates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visit 1 is live for everyone on 1 December 2026.
- **SC-002**: No wish can be read by anyone before 25 December 00:00 in the earliest time zone, and no reader sees a wish before their own local 25 December, in every test across at least 5 time zones and with device clocks set forward.
- **SC-003**: An invited person can go from opening a link to sealing their wish in under 3 minutes.
- **SC-004**: At least 25% of senders save their Christmas link by calendar or self-send (target to test, not a promise). If it comes in below 25% by 10 December, email reminders are switched on, which should add about 10 points.
- **SC-005**: Of senders who saved their link, at least 25% return between 25 and 31 December.
- **SC-006**: Every parcel can be opened without touching the 3D scene, and every wish is read out correctly by a screen reader.
- **SC-007**: 100% of flagged wishes are held for review and none reaches a reader before approval.
- **SC-008**: No gift is released for a sender's own device, a repeat open or a link-preview bot, and the total never exceeds a brand's cap, in every counting test.
- **SC-009**: No wish or email address remains after 1 February 2027.
- **SC-010**: Each brand can quote exact totals for both visits and every measure in FR-038 in January.

## Assumptions

- The two-visit flow builds on the existing tree, village, ornament designs and counting rules; only what is described here changes.
- The campaign year is 2026: visit 1 runs 1 to 24 December, visit 2 runs 25 to 31 December, the keepsake starts on 1 January 2027 and personal data is deleted on 1 February 2027.
- People don't sign in. A device is identified only well enough to remember its own branch and to count each card's first open once.
- Branches are one level deep: the people you invite hang on your branch, and the people they invite hang on theirs.
- Handwriting style is chosen automatically for each writer; people don't pick fonts.
- Reviewers are MosaicAds staff using an internal tool; a full moderation dashboard is out of scope for launch.
- The ornaments seen on the tree beyond a person's own branch may be sample ornaments until real cards fill it.
- The return rates in SC-004 and SC-005 are targets to test, as the product document says, not commitments.
- Visit 2 can be built in parallel with visit 1 and frozen on 18 December; the time lock, moderation and Christmas link ship with visit 1.
