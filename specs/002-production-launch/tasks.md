---

description: "Tasks for the production launch of the Giving Tree"
---

# Tasks: Production launch of the Giving Tree

**Input**: Design documents from `specs/002-production-launch/`

**Prerequisites**: plan.md, spec.md, research.md (decisions R1 to R14, work list W1 to W14), data-model.md, contracts/api.md, contracts/ops.md, quickstart.md

**Tests**: Included for the server rules, because spec FR-005 and SC-009 require the spec 001 suite to keep passing, and SC-002, SC-010 and SC-011 are checked by tests.

**Organization**: Grouped by user story. Story numbers follow spec.md (US3a is "Optional giving").

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **(owner)**: Needs the repository owner's login, decision or information

## Phase 1: Setup

**Purpose**: One line of history and the owner's inputs

- [x] T001 Create branch `002-production-launch` from local `main`, commit `specs/002-production-launch/` and the amendment in `specs/001-two-visit-december/spec.md`
- [x] T002 Merge `origin/main` into the branch (research R1): resolve `page.css`, `src/App.jsx`, `src/lib/api.js`, `src/store.js`, `src/three/Crowd.jsx`, `src/three/Director.jsx`, `src/ui/Overlay.jsx`, `vercel.json` and `vite.config.js` to the local version; keep `supabase/`, `.env.example` and the `@supabase/supabase-js` dependency; delete `api/_lib.js`, `api/card.js`, `api/cards.js`, `api/config.js`, `api/me.js`, `api/open.js`, `api/reminder.js`, `api/tree.js`, `api/wishes.js`; `npm test` and `npm run build` pass
- [ ] T003 (owner) Answer the four items under "Needs from the owner" in `specs/002-production-launch/research.md`: whether Supabase is already created, a neutral public address, operator-created community trees, and the operator's legal name, contact and operator emails
- [ ] T004 [P] Install the Supabase CLI config with `supabase init` (keeping `supabase/migrations/`), and add `"test:db"` to `package.json` scripts running `node --test "tests/integration/**/*.test.js"`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: One system of record (FR-004, FR-005). Nothing user-facing can ship until the rules run on Postgres.

**⚠️ CRITICAL**: No story work that touches data can start before T010

- [x] T005 Define the repository interface from `specs/002-production-launch/data-model.md` ("The repository interface") as JSDoc typedefs at the top of `server/repo-memory.js`, and implement it there over plain maps with an injectable clock, including the uniqueness rules ("one wish per device per branch", one self-wish, first open per device) and `limits.hit`
- [x] T006 Rewrite `server/app.js` to call the repository instead of the eight key-value commands; `brand` becomes `tree` in routes and bodies as in `specs/002-production-launch/contracts/api.md`; keep every validation, the time lock and error codes; update `tests/server/helpers.js` to build a `repo-memory.js` world; all 27 existing tests pass
- [x] T007 Delete `server/kv-memory.js` and `server/kv-redis.js`; update `vite.config.js` (dev middleware uses `repo-memory.js` saved to `.data/`) and `src/lib/api.js` (demo mode uses `repo-memory.js` saved to `localStorage`)
- [ ] T008 Write `supabase/migrations/0004_trees_two_visits.sql` exactly as `specs/002-production-launch/data-model.md` describes: rename `brands` to `trees` with `kind`, `name` ("1 to 40 characters"), `published`, `giving_enabled boolean not null default false`, `sponsor_name`, `giving_status` (`off`, `live`, `paused`, `ended`) and the constraint that `live` requires `giving_enabled`, a signed agreement and all of sponsor, charity name, registration, amount and pot; `cards.brand` to `tree`, `hook smallint not null`, `branch_name` limit "28 characters", `moderation` (`ok`, `hidden`), `removed_at`; `wishes` with `kind` (`friend`, `self`), `writer_device`, `status` (`ok`, `review`, `rejected`), `reported_at`, `opened_at`, body "1 to 140 characters", the two unique indexes, dropping `unlock_at` and `flagged`; `opens.reason` allowing `off` and `paused`; new tables `events`, `operators`, `removal_requests`, `limits`; views `public_ornaments` (no "after first gift" rule) and `tree_measures`; seed only the `global` tree named "The Giving Tree", published, giving off; remove the `mosaicads` seed row
- [ ] T009 Write `supabase/migrations/0005_functions.sql`: `create_card`, `leave_wish`, extended `record_open` (returns `off` when giving is not enabled or not live-capable, `paused` when paused), `branch_of`, `purge_personal` (and point the schedule in `0002_purge_schedule.sql` at it for 1 February 2027); revoke execute from `anon` and `authenticated`
- [ ] T010 Implement `server/repo-postgres.js` with `@supabase/supabase-js` and the functions from T009; wire it in `api/index.js` from `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (503 `no_store` when absent); device ids are hashed with `DEVICE_SALT` before they reach the repository (until this exists `api/index.js` answers 503 `no_store`, so a deployment shows "The tree can't be reached just now")
- [ ] T011 Create `tests/integration/run.test.js` that runs every suite in `tests/server/` against `repo-postgres.js` on a local Supabase (`supabase start`, `supabase db reset`); `npm run test:db` passes
- [x] T012 [P] Add `tests/server/trees.test.js`: a card belongs to one tree; a child card on a different tree than its parent is refused (`wrong_tree`); `GET tree/{slug}` for an unpublished or missing tree is 404 `no_tree`; a new tree has `giving: null`; `?since=` returns only newer ornaments

**Checkpoint**: the same rules pass in memory and on Postgres; Redis is gone

---

## Phase 3: User Story 3 - Wishes first: no charity, no brand, no money (Priority: P1) 🎯 MVP

**Goal**: The whole experience is about wishes between people; nothing mentions money or MosaicAds

**Independent Test**: quickstart.md section 3

- [x] T013 [US3] Create `shared/copy.js` holding every visitor-facing sentence that differs with giving: invitation and thank-you messages, link-preview titles and descriptions, the greeting note, the gift line, the Christmas summary, tree details, keepsake lines and the calendar description, each as a function of `{ giving, names, counts }`; with `giving: null` none may contain "£", "pence", "p to", "gives", "gave", "pot", "charity", "donat", "sponsor" or "MosaicAds"
- [x] T014 [US3] Use `shared/copy.js` in `server/app.js` (`previewPage`, `icsFor`) and return `giving: null` or the giving object from `tree/{slug}`, `card/{id}` and `me/{token}`; `open` returns `{ counted: false, reason: "off" }` with giving off and still records the open; `me` stats are `{ ornaments, wishes, opened }` plus `given` only with giving on
- [x] T015 [US3] Update `src/ui/Wishes.jsx` and `src/ui/Overlay.jsx` to take every giving-dependent sentence from `shared/copy.js`: no gift line in `Meet`, no note in `Greeting`, `Gave` shows "ornaments on your branch" and "wishes shared" (heading "Your branch"), the thank-you message has no amount, the tree sheet and `Keepsake` show counts and names only; remove the fictional stalls' giving sentences in `src/ui/WalkHUD.jsx`
- [x] T016 [US3] Remove MosaicAds branding (research R7): in `src/ui/Overlay.jsx` replace the "{brand} presents" splash and the top-bar brand with "The Giving Tree" and a neutral tree-and-star mark (community trees show their own name); remove the "Powered by MosaicAds" line and link; set the accent to gold in `page.css`; classic star in `src/three/Tree.jsx`; the arch banner in `src/three/World.jsx` reads the tree's name; remove `mosaicads` from the blocked-name pattern's exemptions only if present
- [x] T017 [P] [US3] Add `tests/server/wishes-first.test.js`: with giving off, `preview/{id}` (invite and thanks), `ics/{token}` and every string returned by `shared/copy.js` contain none of the forbidden words in `specs/002-production-launch/contracts/api.md` ("Copy rules"); `open` returns `off`; a tree created with no settings has giving off

**Checkpoint**: both visits read as a wishes product

---

## Phase 4: User Story 1 - A visitor sees only the card (Priority: P1)

**Goal**: No demo shell, notes or test controls in the public build

**Independent Test**: quickstart.md section 2

- [ ] T018 [US1] Move `src/ui/Panel.jsx`, the sample brands and sample names from `src/config.js`, `demoFriend`, `openDemo`, `resetDevice` and `setDemoDate` from `src/store.js`, and the sample crowd from `src/three/Crowd.jsx` (`populate`, `addLive` with made-up names) into `src/demo/`; load `src/demo/` with a dynamic import only when `import.meta.env.VITE_TEST_MODE === '1'` or the page carries `<meta name="gt-demo">`
- [ ] T019 [US1] Rewrite the shell in `src/App.jsx` and `page.css`: on screens up to 480 px wide the card fills the viewport edge to edge with safe-area padding and no frame; on wider screens it is centred at 420 px wide on a plain background; delete the `.notes` layout from the production path
- [x] T020 [US1] In `server/app.js` and `api/index.js` rename `devClock` to `testMode`, set only when `process.env.TEST_MODE === '1'`; `health` returns `testMode`; `demo/*` routes and the fake clock and device headers work only then
- [ ] T021 [P] [US1] Add a build check script `scripts/check-public-build.mjs` that fails if `dist/app.js` contains any of: "Pretend it's", "Reset this phone", "SAMPLE", "Larkfield", "Fern & Field", "MosaicAds", "phase A", "prototype"; run it from `npm run build` when `VITE_TEST_MODE` is not set
- [x] T022 [P] [US1] Remove prototype wording from the page: the "SAMPLE" watermark and "· sample" labels in `src/ui/Overlay.jsx`, the link to the earlier version, and "The live site shows the flat version" in `src/App.jsx`

**Checkpoint**: the public build is the card and nothing else

---

## Phase 5: User Story 2 - Everything on the tree is real (Priority: P1)

**Goal**: Only real ornaments and counts; new ones arrive within 10 seconds

**Independent Test**: quickstart.md section 4

- [x] T023 [US2] In `src/store.js` and `src/lib/api.js`, load the tree from `GET tree/{slug}` at start (name, giving, counts, latest ornaments) and keep it in the store in place of `BRANDS`; in production there is no fallback to sample data
- [x] T024 [US2] In `src/three/Crowd.jsx`, build the crowd from the server's ornaments (name, design, hook), keeping the viewer's own branch hooks reserved; when two ornaments share a hook the newer one moves to the nearest free hook; cap at the existing 120 with "own branch first, then most recent"
- [x] T025 [US2] Poll `GET tree/{slug}?since={cursor}` every 8 seconds while the tab is visible and the phase shows the tree; drop new ornaments in with the existing rope animation and a toast "{name} hung an ornament"; remove the made-up live gifts from `src/three/Director.jsx` in production
- [x] T026 [US2] Empty state: when the tree has no ornaments, the greeting, tree sheet and explore view say "Be the first to hang an ornament"; the tapped-ornament card shows the name and "hung {time ago}" with no gift text unless giving is on (`src/ui/Overlay.jsx`)
- [x] T027 [P] [US2] Add to `tests/server/trees.test.js`: `latestOrnaments` excludes hidden cards, orders newest first, and counts cover every card when more than 120 exist

**Checkpoint**: MVP: a real, unbranded wishes tree with only the card on screen

---

## Phase 6: User Story 8 - One global tree, and a tree for a community (Priority: P2)

**Goal**: `/` is the global tree; `/t/{slug}` is a community's own

**Independent Test**: quickstart.md section 5

- [x] T028 [US8] Routing in `src/store.js` (`route`): `/` loads `global`; `/t/{slug}` loads that tree, and on 404 `no_tree` shows "We couldn't find that tree, so here's the Giving Tree" and loads `global`; `/c/{id}` and `/me/{token}` load the card's own tree; add the `/t/:slug` rewrite to `vercel.json`
- [ ] T029 [US8] Share links and invitations keep the tree: `cardLink` is unchanged (`/c/{id}`), the "back to the tree" and keepsake links use `/t/{slug}` for community trees; the device's remembered branch (`gt3-mine`) is keyed by tree slug
- [x] T030 [US8] Operator routes `GET admin/trees` and `POST admin/trees` in `server/app.js` (slug "3 to 30 characters, a-z 0-9 -", name "1 to 40 characters" filtered with `badName`, 409 `taken`), with tests in `tests/server/trees.test.js`

**Checkpoint**: communities can have their own tree

---

## Phase 7: User Story 4 - Who is behind it and what happens to my data (Priority: P2)

**Goal**: An "About and privacy" page two taps away, and removal on request

**Independent Test**: quickstart.md section 7, first two rows

- [ ] T031 [US4] Create `src/ui/About.jsx` at `/about` with every item in spec FR-019: operator and contact (from T003), what is stored and why, deletion of wishes and emails on 1 February 2027, the device memory used, adults only, how to ask for removal, and (only if any tree has giving on) how giving works; add the `/about` rewrite to `vercel.json`
- [ ] T032 [US4] Link "About and privacy" from the opening screen, the greeting, the tree sheet, the save-link sheet and the keepsake in `src/ui/Overlay.jsx` and `src/ui/Wishes.jsx`
- [ ] T033 [US4] `POST removal` in `server/app.js` (by the person's own token): hides the card, deletes its wishes, records a removal request; "Remove my ornament" with a confirm step on the branch screen in `src/ui/Wishes.jsx`; test in `tests/server/rules.test.js` that the card leaves `tree/{slug}` and `keepsake/{slug}` and its wishes are unreadable (server route and test done as `POST me/{token}/remove`; the "Remove my ornament" button is still to do)

---

## Phase 8: User Story 5 - A shared link looks right everywhere (Priority: P2)

**Goal**: Title, description, image and icon on every public address

**Independent Test**: quickstart.md section 7, rows three and four

- [ ] T034 [P] [US5] Add `public/og.jpg` (1200×630 render of the lit tree, made with the existing `shared.snapshot` at a wide framing), `public/icon.svg`, `public/icon-180.png` and `public/manifest.webmanifest`; add title, description, Open Graph and icon tags to `index.html`
- [ ] T035 [US5] Card previews fall back to `/og.jpg` when no close-up was uploaded (`server/app.js`, `previewPage`); store uploaded close-ups in a public Supabase Storage bucket `previews` via `repo-postgres.js` (`savePreview`, `previewUrl`) and redirect `img/{id}/{kind}` to it
- [x] T036 [P] [US5] Extend the bot rewrite in `vercel.json` to `/` and `/t/:slug` with a preview page for trees (`preview/tree/{slug}`), and confirm `/me/*` has `noindex` and no preview; test the preview text in `tests/server/wishes-first.test.js`

---

## Phase 9: User Story 6 - It fails gracefully (Priority: P2)

**Goal**: Clear states for no 3D, slow networks, failed saves and reduced motion

**Independent Test**: quickstart.md section 7, last four rows

- [ ] T037 [US6] Create `src/ui/Lite.jsx` (research R11): when WebGL2 is missing or the canvas fails to start, render the flow in plain elements: whose card it is, pick a design from eight pictures, type a name (the server picks a free hook on the branch: add `hook: "auto"` to `POST card`), leave a wish, your branch and parcels, opening wishes after release; replace the `nogl` message in `src/App.jsx`
- [ ] T038 [US6] Static opening screen in `index.html` (name, mark, progress bar) styled inline so it shows before `app.js` arrives; preload the fonts; measure on a throttled 4G profile and, if first interaction is over 5 seconds, split the scene from the shell with one dynamic import in `src/App.jsx` and `vite.config.js` (single bundle kept only for the demo build)
- [ ] T039 [US6] Save failures: `createCard`, `sealSelf`, `sealFriend`, `nameBranch` and `openParcel` in `src/store.js` surface "That didn't save. Check your connection and try again." with a Retry button; the settling chip in `src/ui/Overlay.jsx` says "your ornament is on the tree" only after the card is saved
- [ ] T040 [P] [US6] Reduced motion: confirm `mearrive`, the branch shots and the fireworks respect `reduceMotion` in `src/three/CameraRig.jsx` and `src/three/Season.jsx`; the wish card and parcel animations already do

---

## Phase 10: User Story 7 - The operator can run the campaign (Priority: P2)

**Goal**: Review, hide, measure and limit, without a command line

**Independent Test**: quickstart.md section 8

- [ ] T041 [US7] Operator sign-in: `src/ops/main.jsx` at `/ops` (separate Vite entry, not in the visitor bundle) using Supabase Auth email links with `SUPABASE_ANON_KEY`; `server/app.js` verifies the session token and the `operators` table on every `admin/*` call, replacing `ADMIN_SECRET`
- [ ] T042 [US7] Operator screens in `src/ops/`: wishes for review (approve, reject), hide or unhide an ornament by card id or link, measures per tree from `tree_measures`, trees list with "new community tree"; routes as in `specs/002-production-launch/contracts/ops.md`
- [x] T043 [US7] Rate limits (research R10): `server/ratelimit.js` using `limits.hit`: at most 3 cards per device per tree per day and 10 wishes per device per hour, refused with 429 `slow_down`; test in `tests/server/limits.test.js` that 100 attempts in a minute accept at most 10; the page shows "Slow down a little and try again shortly."
- [ ] T044 [P] [US7] `POST log` in `server/app.js` (trim to 500 characters, drop anything matching a token or wish text) and a `window.onerror` and `unhandledrejection` reporter in `src/lib/api.js` (server route and test done; the page-side reporter is still to do)
- [x] T045 [US7] `cron/ops` in `server/app.js` and `vercel.json` (`0 8 * * *`): post to `OPS_WEBHOOK_URL` when wishes have waited over 24 hours, and where giving is on when a pot passed 90% or 100%; delete `limits` rows older than 2 days
- [ ] T046 [P] [US7] Rewrite `docs/reviewing-wishes.md` for the operator screen, and add "What to do if" notes: hide an ornament, a removal request, a tree to create

---

## Phase 11: User Story 3a - Optional giving, honest when it is on (Priority: P3)

**Goal**: An operator can switch giving on for one tree, safely

**Independent Test**: quickstart.md section 6

- [ ] T047 [US3a] `POST admin/trees/{slug}/giving` in `server/app.js` and a form in `src/ops/`: 400 `incomplete` unless sponsor, charity name, registration, amount, pot, dates and signed agreement are all present before `live`; pause, resume, end and switch off never change `given_pence` (server route and tests done; the operator form is still to do)
- [ ] T048 [US3a] Giving-on copy in `shared/copy.js` and the page: gift line with sponsor and charity name and number, the reasons `own`, `again`, `cap`, `paused`, `closed`, the summary amount, the tree details with payout timing
- [x] T049 [P] [US3a] Move the spec 001 counting tests onto a tree with giving live in `tests/server/rules.test.js`; add: no gift while the agreement is unsigned; the ledger sum equals `given_pence` and never exceeds the pot; switching off keeps the ledger and removes money wording (SC-011)

---

## Phase 12: Launch and Polish

- [ ] T050 (owner) Create the production Supabase project (London) and a separate testing project; apply migrations 0001 to 0005 to both and `supabase/seed-test.sql` to testing only; add operator emails to `operators`
- [ ] T051 (owner) Vercel: link the repository, add the Supabase integration, set the variables in `specs/002-production-launch/contracts/ops.md` for production and for the testing deployment (`TEST_MODE` and `VITE_TEST_MODE` on testing only), protect the testing deployment, attach the neutral domain, and add the Firewall rate-limit rule (60 `POST /api/*` a minute per address)
- [ ] T052 Update `README.md` and `.env.example` for Supabase, the two deployments, test mode and the operator screen; remove Redis and `ADMIN_SECRET` references; update `specs/001-two-visit-december/contracts/ops.md` to point here
- [ ] T053 Run all of `specs/002-production-launch/quickstart.md` on the testing deployment and record results in it
- [ ] T054 (owner) Checks only people can do: real iOS Safari and Android Chrome, the in-app browsers of three messaging apps, VoiceOver and TalkBack, and a read of the "About and privacy" page by whoever is responsible for privacy
- [ ] T055 Deploy to production, run quickstart.md section 9, and hang the first real ornament

---

## Dependencies & Execution Order

- **Phase 1**: T001, then T002. T003 can be answered at any time but blocks T031, T050 and T051.
- **Phase 2** blocks everything else: T005 → T006 → T007; T008 → T009 → T010 → T011; T012 after T006.
- **MVP** = Phases 3, 4 and 5 (US3, US1, US2). Do them in that order: copy and branding first, because the shell and the real tree show them.
- **US8** needs T023. **US4, US5, US6** are independent of each other after the MVP. **US7** needs T010 for sign-in. **US3a** needs T042.
- **Launch**: T050 and T051 can start as soon as T009 is written; T053 needs everything; T055 last.

### Parallel Opportunities

- T008 and T009 (SQL) alongside T005 to T007 (JavaScript).
- After the MVP: US4, US5 and US6 by different people.
- T017, T021, T022, T027, T034, T036, T040, T044, T046, T049 are single-file and independent.

## Implementation Strategy

1. **One record** (Phases 1 and 2): until the rules run on Postgres, nothing can go public.
2. **MVP** (Phases 3 to 5): a real, unbranded wishes tree with only the card on screen. This is enough for a soft launch on the global tree.
3. **Before telling people** (Phases 7, 9, 10 and 12): privacy page, graceful failure, operator tools, limits.
4. **Then**: community trees (Phase 6), previews (Phase 8), optional giving (Phase 11).
