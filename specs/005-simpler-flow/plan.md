# Implementation Plan: A simpler flow

**Branch**: `005-simpler-flow` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

## Summary

Remove the branch as a concept, let people on a community tree wish each other directly, put the wish before the ornament for invited people, turn "send a wish" into "make an ornament for a friend", and add direct share buttons. Almost all of it is screens and wording; the server gains one derived list, one optional column and a higher limit.

## Technical Context

**Language/Version**: JavaScript (ES2022), JSX, SQL (Postgres 15 on Supabase)
**Primary Dependencies**: unchanged (React 18, react-three-fiber, zustand, `postgres`). No new dependency, no third-party script.
**Storage**: one migration, `0005_sent_design.sql`: `sent_wishes.design smallint null check (design between 0 and 7)`. Additive, so the current site keeps working before and after it is applied; it must be applied before this branch is deployed.
**Testing**: `npm test` (memory repository); `npm run test:db` against the local throwaway Postgres for the SQL.
**Constraints**: the server still decides everything a browser could fake; wishes never reach a browser before release; nothing with giving off mentions money.

## Constitution Check

The constitution is still the unfilled template: nothing to check. Working principles from plans 001 and 002 hold; "every action in the 3D scene also has an accessible button" is why wishing has a plain list as well as a tap on an ornament.

## Decisions

- **D1 Wish anyone: no new rule, one new read.** `POST wish` already accepts a wish for any ornament from any device once. The page limits the offer to community trees. `GET tree/{slug}` adds `wished: [card ids]` for the calling device (`repo.wishedOn(slug, device)`).
- **D2 Wish before ornament.** The wish form asks for a first name when the phone has no ornament. The name is kept in the store (`wisher`) and typed into the ornament when they go on to hang. `afterHang` already skips the wish when one was left.
- **D3 No branch.** `BranchCounter` is removed from the screens. `branchName` stays in data (existing names still show in the thank-you title). Wording moves in `shared/copy.js`, `shared/shell.js`, `src/ui/*`, `src/pages/*`. A test reads every non-giving sentence and page for the word.
- **D4 Ornament for a friend.** `POST sent` takes optional `design`; `GET sent/{token}` returns it; the sent page shows the design's name and hands `{design, to}` to the tree through the same session note it uses today; the store preselects the design and types the name.
- **D5 Share row.** One component, `src/ui/ShareRow.jsx`, of plain links: `https://wa.me/?text=`, `https://t.me/share/url?url=&text=`, `sms:?&body=`, `mailto:?subject=&body=`, plus the Web Share API when present and copy. Used by the invitation and thank-you sheet, the ornament-for-a-friend result and the tree's link.
- **D6 Countdown.** `daysToChristmas(date)` in `shared/season.js`, from the visitor's own calendar day.
- **D7 Limit.** Wishes on a community tree count against their own limit of 40 an hour; the shared tree keeps 10.

## Project Structure

```text
shared/season.js, copy.js, shell.js     # countdown, wording
server/app.js, repo-memory.js, repo-postgres.js
supabase/migrations/0005_sent_design.sql
src/store.js                            # wished, wishTo, wisher, sealTo
src/ui/Wishes.jsx, Overlay.jsx, ShareRow.jsx (new)
src/pages/Home.jsx, SentWish.jsx
tests/server/simpler-flow.test.js (new), pages.test.js, sent.test.js, limits.test.js
```

## Complexity Tracking

None.
