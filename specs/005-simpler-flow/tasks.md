# Tasks: A simpler flow

## Phase 1: Foundation

- [x] T001 Add `daysToChristmas` to shared/season.js
- [x] T002 Add `sent_wishes.design` in supabase/migrations/0005_sent_design.sql
- [x] T003 Add `wishedOn(slug, device)` and the sent design to server/repo-memory.js and server/repo-postgres.js

## Phase 2: US1 wish anyone on a community tree

- [x] T004 [US1] Return `wished` from `GET tree/{slug}` and raise the wish limit to 40 in server/app.js
- [x] T005 [US1] Tests in tests/server/simpler-flow.test.js: wished list per device and tree, wish without an ornament, limit
- [x] T006 [US1] Store: `wished`, `wishTo`, `sealTo` in src/store.js
- [x] T007 [US1] `WishTo` sheet and `People` list in src/ui/Wishes.jsx; wish button on the ornament card in src/ui/Overlay.jsx

## Phase 3: US2 wish first, hang second

- [x] T008 [US2] Name field in the wish form; `wisher` kept in src/store.js and typed into the ornament
- [x] T009 [US2] Reorder the invited person's screen in src/ui/Wishes.jsx (`Meet`, `WishFor`)

## Phase 4: US3 one vocabulary

- [x] T010 [US3] Remove the branch counter and naming from the screens; reword src/ui/Wishes.jsx, src/ui/Overlay.jsx, src/pages/Home.jsx, src/pages/SentWish.jsx, src/store.js
- [x] T011 [US3] Reword shared/copy.js and shared/shell.js; key wording; countdown line
- [x] T012 [US3] Test that no non-giving sentence or page says "branch"

## Phase 5: US4 an ornament for a friend

- [x] T013 [US4] `POST sent` accepts `design`, `GET sent/{token}` returns it (server/app.js) with tests in tests/server/sent.test.js
- [x] T014 [US4] Design picker in src/pages/Home.jsx; design shown in src/pages/SentWish.jsx; preselect in src/store.js

## Phase 6: US5 share buttons

- [x] T015 [US5] src/ui/ShareRow.jsx and its styles; use it in the share sheet, the ornament-for-a-friend result and the tree's link

## Phase 7: Check

- [x] T016 `npm test`, `npm run test:db`, `npm run build`
- [x] T017 Walk both stories in the browser on the dev server
