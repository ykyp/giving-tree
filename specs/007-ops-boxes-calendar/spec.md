# Feature Specification: A team screen, a box under every ornament, and a calendar that works

**Feature Branch**: `007-ops-boxes-calendar` | **Created**: 2026-11-15 | **Status**: Draft

**Input**: "yes please [operator screen and a box under every ornament]. also additionally work on the calendar integration as it currently doesn't work"

## User Stories

### 1 - The team can deal with a reported wish (P1)

Someone on the team opens `/ops`, signs in with a link sent to their email, and sees every wish that is waiting: its words, who wrote it, whether it is an open wish or one left for someone, which tree, and whether a visitor reported it or the word check held it. They approve it (it shows again) or reject it (nobody sees it). They can also see each tree, take down a tree someone created, and hide or remove an ornament.

- Only an address in the operators list can do anything; everyone else is told so.
- The page is not linked from anywhere and is not indexed.
- Removing an ornament and taking down a tree ask for confirmation first.

### 2 - Every ornament with a wish has a box under it (P1)

On the tree, an ornament whose owner wrote a wish has a small wrapped box hanging under it. Tapping the box opens the wish. An ornament without a wish has no box. A wish added after the ornament was hung gets its box within about half a minute for people already looking.

### 3 - Adding the key to a calendar works everywhere (P1)

"Add to my calendar" offers Google Calendar, Apple Calendar and Outlook. Google and Outlook open a filled-in new event (no file, so it works inside chat apps and on Android). Apple gets the calendar file, served so that Safari offers to add it. The event is 25 December at 9 in the morning, with a reminder, and the person's key in the notes.

## Requirements

- **FR-001**: `/ops` MUST require a signed-in operator for every action; the sign-in page learns only public values.
- **FR-002**: The review list MUST NOT show device identifiers.
- **FR-003**: A box MUST be drawn only for wishes that anyone may read (passed the word check, not reported).
- **FR-004**: The calendar file MUST be valid iCalendar with lines of at most 75 characters and MUST be served inline.

## Set-up the site's owner must do once

- In Supabase → Authentication → URL Configuration, add `https://<the site>/ops` to the redirect addresses.
- Add each team member's email to the `operators` table.

## Assumptions

- Signing in lasts an hour; after that the team member asks for a new link.
- Why the calendar "didn't work" was not reported in detail. The old button downloaded a file, which fails in chat apps' browsers and on most Android phones; this change removes the file from those paths.
