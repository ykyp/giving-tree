# Tasks: An ornament is a name and a wish

- [x] T001 [US1] `latestOrnaments` returns each ornament's open wish in server/repo-memory.js and server/repo-postgres.js
- [x] T002 [US1] `GET card/{id}` and `GET me/{token}` serve the open wish; `POST card/{id}/report` in server/app.js
- [x] T003 [US1] Tests in tests/server/open-wishes.test.js; update suites that assumed the self wish was sealed
- [x] T004 [US1] The step after hanging asks for the wish on every path (src/three/Director.jsx, src/ui/Wishes.jsx)
- [x] T005 [US2] The invited person's screen shows the friend's wish; hang first, wish back second (src/ui/Wishes.jsx)
- [x] T006 [US3] Open a wish from an ornament's card, with report (src/ui/Overlay.jsx, src/ui/Wishes.jsx, src/store.js)
- [x] T007 [US4] My own page shows my wish or offers to add it; the Christmas coda is dropped (src/ui/Wishes.jsx, src/store.js)
- [x] T008 Wording in shared/copy.js, shared/shell.js, src/pages/Home.jsx
- [x] T009 `npm test`, `npm run test:db`, `npm run build`, browser walk-through
