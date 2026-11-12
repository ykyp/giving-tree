---

description: "Remaining work for The Giving Tree, two visits in December"
---

# Tasks: The Giving Tree, two visits in December

**Input**: Design documents from `specs/001-two-visit-december/`

**Prerequisites**: plan.md, spec.md, research.md (decisions R1 to R11, gaps G1 to G12), data-model.md, contracts/api.md, contracts/ops.md, quickstart.md

**Scope**: A first version of every user story is already in the working tree (uncommitted). This list holds only what is left: the code gaps, the tests, the checks that have never been run, and setup. A "Verify" task means run the named quickstart section, and fix what fails in the files named.

**Tests**: Included for the server rules only (research R7), because the spec's success criteria SC-002, SC-007 and SC-008 depend on them.

**Organization**: Tasks are grouped by user story so each story can be finished and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 to US7)
- **(owner)**: Needs the repository owner's own login or decision; an agent can't complete it alone

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Get the existing work onto a branch and make the rules testable from the repo

- [x] T001 (owner) Create the git branch `001-two-visit-december` from `main` and commit the current working tree (feature code in `api/`, `server/`, `shared/`, `src/`; Spec Kit files in `.specify/`, `.claude/skills/`, `specs/`)
- [x] T002 Add `"test": "node --test \"tests/**/*.test.js\""` to the scripts in `package.json`
- [x] T003 Create `tests/server/rules.test.js` with `node:test` and the in-memory store from `server/kv-memory.js`, calling `handle()` from `server/app.js` with `{ devClock: true }`. Cover every case in quickstart.md section 1: own-device, bot, first and repeat opens; rollback at the cap; `{ sealed: true }` never echoing the wish; 409 `already` on a second wish; 400 for 141 characters and for wishing your own card; flagged wish hidden from `GET me/{token}`; 403 `sealed` on `opened` before release; report hiding a wish; one self-wish; the calendar file's `DTSTART:20261225T090000`; no token in `GET card/{id}` or `preview/{id}`; 410 `frozen` after 1 January 12:00 UTC; expiry on 1 February 2027; `demo/*` routes returning 404 without `devClock`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fixes and setup that every story depends on before it can go live

**⚠️ CRITICAL**: T004 must be done before any public deployment: without it, a live site with no store accepts wishes that never reach anyone

- [x] T004 Stop the silent fallback to browser-only mode (research R10, gap G2): in `src/lib/api.js` `bootApi()`, switch to demo mode only when the page carries `<meta name="gt-demo">` (written by `scripts/page.mjs` for the single-file preview) or `/api/health` returns 404 or a non-JSON page; when it returns 503 `no_store` or a network error, set `api.info = { ok: false }`. In `src/store.js` `boot()`, stop before `route()` in that case and set an `unreachable` flag; in `src/ui/Overlay.jsx`, show "The tree can't be reached just now. Please try again in a moment." with a Retry button instead of the flow
- [x] T005 [P] Put email reminders behind their own switch (research R8, gap G1, FR-022): in `api/index.js`, set `emailEnabled` only when `process.env.EMAIL_REMINDERS === 'on'` and `RESEND_API_KEY` and `EMAIL_FROM` are set; make `cron/email` in `server/app.js` return `{ sent: 0 }` when `env.emailEnabled` is false
- [x] T006 [P] Create `tests/server/timelock.test.js` (SC-002): for readers in UTC+14, UTC+13, UTC+0, UTC−5 and UTC−10, assert `GET me/{token}` has no `text` one minute before their local 25 December and has it at their local midnight; assert a device date of 25 December is refused while the server clock is before 24 December 10:00 UTC; assert a device date of 24 December is refused after it
- [x] T007 [P] Create `tests/server/config.test.js`: with `env.emailEnabled` false, `POST me/{token}/reminder` returns 404 `email_off` and `GET health` reports `email: false`; with no `adminSecret`, every `admin/*` route returns 401; with no `cronSecret`, `cron/email` returns 401
- [ ] T008 (owner) Provision the production store (gap G4): install the Vercel CLI, run `vercel link`, then add Upstash Redis through the Vercel Marketplace so `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set, as described in `specs/001-two-visit-december/contracts/ops.md`
- [ ] T009 (owner) Set `ADMIN_SECRET`, `CRON_SECRET` and `PUBLIC_ORIGIN` in the Vercel project (values in `specs/001-two-visit-december/contracts/ops.md`); leave `EMAIL_REMINDERS` unset

**Checkpoint**: `npm test` passes; a page with no store shows the error screen, not a working flow

---

## Phase 3: User Story 1 - Hang an ornament and invite people to your branch (Priority: P1) 🎯 MVP

**Goal**: A sender hangs an ornament, seals or skips a wish for themselves, invites people and saves their Christmas link

**Independent Test**: quickstart.md section 3

- [x] T010 [US1] Verify quickstart.md section 3 on desktop with the browser pane visible, dragging the ornament by hand (not Auto-hang); fix drag or hook snapping problems in `src/three/Hero.jsx` and empty-hook glow problems in `src/three/Branch.jsx`
- [ ] T011 [US1] Verify the save step shows Add to calendar and Send it to myself and no email field, and that the downloaded calendar file opens on iPhone and Android with the event on 25 December 09:00 local; fix in `src/ui/Wishes.jsx` (`SaveLink`) or `server/app.js` (`icsFor`) (desktop part done: no email field, calendar file correct; opening the file on iPhone and Android is still to do)
- [x] T012 [P] [US1] Verify the branch name: 28-character limit ("≤ 28 chars"), blocked names refused with "That name can't go on a branch.", and the name showing on the branch counter and to an invited person; fix in `src/ui/Wishes.jsx` (`BranchCounter`) or `server/app.js` (`me/{token}/branch`)
- [ ] T013 [US1] Verify section 3 on real iOS Safari and Android Chrome (gap G8), including the share sheet and one-finger drag; record device and result in `specs/001-two-visit-december/quickstart.md` under a new "Results" heading

**Checkpoint**: A sender can complete visit 1 on a phone

---

## Phase 4: User Story 2 - Hang next to the sender and leave a sealed wish (Priority: P1)

**Goal**: An invited person gives by opening, hangs on the sender's branch and seals a wish they can never read again

**Independent Test**: quickstart.md section 4

- [x] T014 [US2] Verify quickstart.md section 4 end to end with a hand drag onto the sender's branch; fix in `src/three/Crowd.jsx` (`hangHooks`, `applyBranch`) or `src/ui/Wishes.jsx` (`Meet`, `WishFor`)
- [x] T015 [P] [US2] Verify a device that already has its own branch can leave a wish on a different sender's link without making a second ornament (spec Story 2, scenario 4); fix in `src/store.js` (`openCard`) or `src/ui/Wishes.jsx` (`Meet`)
- [x] T016 [P] [US2] Verify a flagged wish (containing `www.example.com`) shows the same sealed confirmation to the writer and appears in `GET admin/review`, and that `approve` makes it visible to the reader; fix in `server/app.js` or `shared/moderation.js`

**Checkpoint**: Wishes can be sealed for a sender from other devices

---

## Phase 5: User Story 4 - Open your wishes on Christmas morning (Priority: P1)

**Goal**: From 25 December a returner flies to their branch and opens each wish by tap or button

**Independent Test**: quickstart.md section 6, first three rows

- [ ] T017 [US4] Measure the frame rate on 5 December and 25 December with the browser pane visible, on Quality: Mid and on a mid-tier phone (research R11, gap G6); record the numbers in `specs/001-two-visit-december/quickstart.md` under "Results" (desktop part done: 120 fps on every tier on both dates; the mid-tier phone measurement is still to do)
- [ ] T018 [US4] If T017 shows less than 45 fps on mid or 30 fps on low on 25 December, reduce the Christmas load: presents only on high and mid tiers in `src/three/Season.jsx`, no extra snow on low in `src/three/World.jsx` (`Snow`), and a lower full-square count in `src/three/Crowd.jsx` (`populate`); then re-measure
- [x] T019 [US4] Verify opening a parcel by tapping it in the 3D scene (only the button was tested), the about-5-second flight, the skip tap and the bells after the first tap; fix in `src/three/Branch.jsx` (`Parcel`), `src/three/CameraRig.jsx` (`mearrive` shot) or `src/ui/Overlay.jsx`
- [ ] T020 [P] [US4] Verify with VoiceOver and TalkBack that every parcel button is announced as "Open the wish from {name}" and the opened wish text and name are read out (SC-006); fix labels in `src/ui/Wishes.jsx` (`Parcels`, `WishCard`) (labels checked in the page: "Open the wish from {name}", wish as real text in a named dialog; a real VoiceOver and TalkBack run is still to do)
- [x] T021 [P] [US4] Verify nothing branded appears between the Christmas arrival and the last wish except the top-bar mark (FR-036, gap G10); fix in `src/ui/Overlay.jsx` or `src/ui/Wishes.jsx`
- [x] T022 [P] [US4] Verify Report hides the wish at once, shows the confirmation and queues it in `GET admin/review`; fix in `src/store.js` (`reportWish`) or `server/app.js`

**Checkpoint**: The three P1 stories work together: this is the MVP

---

## Phase 6: User Story 3 - Come back before Christmas (Priority: P2)

**Goal**: A returning sender sees tagged parcels and a count, never the words

**Independent Test**: quickstart.md section 5

- [x] T023 [US3] Verify quickstart.md section 5, including that the `me/` response in the network panel has no `text` field and that the original `/c/{id}` link on the same device goes straight to the branch; fix in `src/store.js` (`openCard`, `openMe`) or `src/ui/Wishes.jsx` (`Home`)
- [x] T024 [P] [US3] Verify a branch with more people than free nearby hooks still shows the exact ornament count (spec edge case "Branch fills up"), using **A friend hangs and wishes** ten times; fix in `src/three/Crowd.jsx` (`applyBranch`)

**Checkpoint**: The waiting state works before Christmas

---

## Phase 7: User Story 5 - See what your branch gave and say thank you (Priority: P2)

**Goal**: Exact branch and tree totals, then a thank-you card that brings people back

**Independent Test**: quickstart.md section 6, last four rows

- [x] T025 [US5] Verify the "what your branch gave" summary, the thank-you card and its message, and the self-wish shown last (never run in a browser, gap G7); fix in `src/ui/Wishes.jsx` (`Gave`, `Thanks`, `SelfCoda`, `ShareSheet`)
- [x] T026 [P] [US5] Verify the thank-you link (`/c/{id}?t=1`): on a device that left a wish it opens that person's own branch with "{name} says thank you"; on a new device it releases the gift and offers to hang; fix in `src/store.js` (`openCard`)
- [x] T027 [P] [US5] Add a case to `tests/server/rules.test.js`: an open at the cap returns `{ counted: false, reason: 'cap' }` and `GET me/{token}` returns `tree.complete: true`; then verify the summary reads "The pot is complete: thank you." in `src/ui/Wishes.jsx` (`Gave`) (test case added and passing; the on-screen check is still to do)

**Checkpoint**: The second share works

---

## Phase 8: User Story 6 - New Year's Eve finale and the keepsake page (Priority: P3)

**Goal**: Fireworks, a midnight pulse, a New Year thank-you, then a frozen keepsake

**Independent Test**: quickstart.md section 7, last three rows

- [x] T028 [US6] Verify fireworks from 31 December 18:00, the lights pulsing at midnight and "Happy New Year from our branch" on the thank-you card; fix in `src/three/Season.jsx` (`Fireworks`), `src/three/Tree.jsx` (`uPulse`) or `shared/season.js` (`clockOf`)
- [x] T029 [P] [US6] Verify the keepsake page on 2 January: "The 2026 Giving Tree", final total, every first name, a link to your branch and no way to hang; fix in `src/ui/Wishes.jsx` (`Keepsake`) or `src/store.js` (`route`)

**Checkpoint**: The campaign closes cleanly

---

## Phase 9: User Story 7 - Late arrival between 25 and 31 December (Priority: P3)

**Goal**: First-time visitors after Christmas can still take part, with wishes opening at once

**Independent Test**: quickstart.md section 7, first row

- [x] T030 [US7] Verify on 27 December that a new device gets no self-wish step, the invitation omits "for Christmas morning", and a friend's wish opens immediately; fix in `src/three/Director.jsx` (`afterHang`) or `src/ui/Wishes.jsx`
- [x] T031 [P] [US7] Add a case to `tests/server/rules.test.js`: a card created and wished on 27 December returns `released: true` with `text` on the next `GET me/{token}?day=2026-12-27`

**Checkpoint**: All seven stories checked

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Deployment checks, documents and housekeeping

- [ ] T032 Deploy a Vercel preview and run quickstart.md section 9 (gap G5, needs T008 and T009): `/api/health` returns `ok`, a preview-bot user agent on `/c/{id}` gets Open Graph tags with no token, `/me/{token}` loads the app with `X-Robots-Tag: noindex`, and the cron job is listed; fix in `vercel.json` or `api/index.js`
- [x] T033 [P] Write `docs/reviewing-wishes.md` (gap G9): how a reviewer lists flagged and reported wishes and approves or rejects them with the calls in `specs/001-two-visit-december/contracts/ops.md`, and how to read the metrics
- [x] T034 [P] Rewrite `README.md` (gap G11): the two visits, `npm run dev` and the demo controls, `npm test`, configuration, and a link to `specs/001-two-visit-december/`
- [x] T035 Rebuild the single-file preview with `npm run build` and `node scripts/page.mjs` (gap G12, after T004), and confirm `publish/index.html` runs in demo mode with the demo note showing
- [ ] T036 (owner) Fill in `.specify/memory/constitution.md` with `/speckit-constitution`, starting from the four principles in `specs/001-two-visit-december/plan.md`
- [ ] T037 Run all of quickstart.md once more from a clean `.data/` folder and tick every row in a "Results" section of `specs/001-two-visit-december/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 first (owner); T002 then T003
- **Foundational (Phase 2)**: T004 to T007 need Phase 1; T008 and T009 can happen at any time but block T032
- **User stories (Phases 3 to 9)**: all need T004. Verification needs the earlier story's data: US2 needs a card from US1; US3, US4 and US5 need wishes from US2 (or the demo's **A friend hangs and wishes**)
- **Polish (Phase 10)**: T032 needs T008 and T009; T035 needs T004; T037 last

### Story Order

1. US1, then US2, then US4 (the P1 stories, in the order a person meets them)
2. US3 and US5 (P2)
3. US6 and US7 (P3)

### Parallel Opportunities

- T005, T006 and T007 touch different files and can run together after T003
- Within a story, the [P] checks are independent of each other
- T033 and T034 can be written at any time

## Parallel Example: Phase 2

```text
Task: "T005 Email switch in api/index.js and server/app.js"
Task: "T006 Time-zone tests in tests/server/timelock.test.js"
Task: "T007 Configuration tests in tests/server/config.test.js"
```

## Implementation Strategy

### MVP first (1 December)

1. Phase 1 and Phase 2 (T004 is the one that protects people's wishes)
2. US1 and US2: visit 1 is what must be live on 1 December
3. T032 on a preview, then production

### Then, before 18 December

4. US4 (including the performance check), US3 and US5
5. US6 and US7
6. Polish

Visit 2 can keep changing after 1 December, but the time lock, moderation and Christmas link (Phases 1 to 4) can't: a wish sealed on 1 December has to be readable on the 25th.
