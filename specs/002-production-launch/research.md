# Research: Production launch of the Giving Tree

**Date**: 2026-11-12 · **Plan**: [plan.md](./plan.md)

## Where things stand

| | Local `main` (`d5e5e06`) | `origin/main` (`aa014d1`) |
|---|---|---|
| Two-visit screens (seal, branch, parcels, thank-you, finale, keepsake) | Complete, checked on desktop | Not built (a toast on the Christmas link) |
| Rules: time lock by reader's time zone, one wish per device, report, review, freeze | Complete, 27 tests | Partly: release by server time only; a flagged wish tells its writer; no report or review |
| Storage | Redis key-value (not provisioned) | Supabase Postgres schema with gift ledger (set-up script written; not known to be run) |
| "No giving until the agreement is signed" | No | Yes, in the database |
| Real ornaments on the tree, live feed | No (sample crowd) | Yes (latest 120, Supabase Realtime) |
| Hides the demo panel when online | Only on `/c/` and `/me/` | Yes (`body.app`) |

A trial merge reports conflicts in nine files: `page.css`, `src/App.jsx`, `src/lib/api.js`, `src/store.js`, `src/three/Crowd.jsx`, `src/three/Director.jsx`, `src/ui/Overlay.jsx`, `vercel.json`, `vite.config.js`.

## Decisions

### R1. Join by merging `origin/main` into local `main`

- **Decision**: `git merge origin/main`, resolving every conflicting source file to the local version, then re-applying by hand the three ideas worth keeping from `origin/main`: trees read from the server, real ornaments on the tree, and the production shell without the demo panel. Keep `supabase/`, `.env.example` and the `@supabase/supabase-js` dependency. Delete `origin/main`'s `api/*.js` route files (superseded by `server/app.js`).
- **Rationale**: Keeps both histories and makes the push a normal fast-forward. The local side has far more behaviour and tests, so it is the base.
- **Alternatives considered**: Rebasing local onto `origin/main` (rewrites the commit already merged locally, same conflicts); force-pushing local over `origin/main` (destroys the other work, never without the owner's say-so).

### R2. Rules talk to a repository, not a key-value store

- **Decision**: Replace the eight key-value commands in `server/app.js` with a repository of domain operations (`getTree`, `createCard`, `getCardByToken`, `listBranch`, `leaveWish`, `listWishesFor`, `markOpened`, `reportWish`, `recordOpen`, `latestOrnaments`, `addEvent`, operator operations). Two implementations: `repo-memory.js` and `repo-postgres.js`. The rules that need atomicity (one wish per device per card, one self-wish, first open per device, the pot) are single SQL statements or functions in Postgres and single synchronous steps in memory.
- **Rationale**: See Complexity Tracking in the plan. The route layer, validation, time lock, copy and tests stay as they are.
- **Alternatives considered**: Key-value on a Postgres table; rules in SQL only.

### R3. One schema migration on top of `origin/main`'s

- **Decision**: Keep migrations 0001 to 0003 and add 0004 and 0005 (see data-model.md). `brands` becomes `trees` with `kind` (global or community), `published`, a display name and **`giving_enabled boolean not null default false`**; the existing `status`, agreement and pot columns become the giving settings and only matter when giving is enabled. `wishes` gains `kind`, `status`, `opened_at`, `reported_at` and `writer_device`. Migration 0003's rule ("an ornament appears once its card has released a gift") is replaced: with giving off there are no gifts, so an ornament appears as soon as it is hung and not hidden.
- **Rationale**: Additive and reviewable. Nothing is live, so renaming a table is safe now and not later.
- **To confirm with the owner**: whether the Supabase project has already been created and `setup.sql` run. If it has, 0004 is applied on top; if not, a fresh `setup.sql` is generated from all five.

### R4. New ornaments by polling, not a realtime socket

- **Decision**: The page asks `GET tree/{slug}?since={cursor}` every 8 seconds while the tree is visible and the tab is in front, and drops in what comes back. The browser never holds a Supabase key and `@supabase/supabase-js` stays out of the bundle.
- **Rationale**: Meets "within 10 seconds" (SC-004) with one cached endpoint (5-second shared cache at the edge, so load is flat however many people watch). `origin/main`'s Realtime approach adds about 100 KB to the bundle, a public key, and row-level policies to keep correct.
- **Alternatives considered**: Supabase Realtime (as in `origin/main`); server-sent events from the Function (holds connections open).

### R5. Production shell and test mode are different builds

- **Decision**: The demo panel, the date faker, made-up friends, sample trees and sample names move to `src/demo/` and are imported only when the build has `VITE_TEST_MODE=1`. The server honours a faked date or device only when `TEST_MODE=1`. Production sets neither. Testing happens on a separate Vercel deployment with its own Supabase project (or branch), so test data can never reach the public record (FR-003, FR-009).
- **Rationale**: The public bundle cannot switch test controls on, because they are not in it.
- **Alternatives considered**: A signed-in toggle on the live site (test data would share the live database).

### R6. Wishes first: giving is a property of the tree

- **Decision**: `GET tree/{slug}` returns `giving: null` unless the tree has giving enabled **and** complete settings; the page shows money wording only when `giving` is present. All sentences that differ live in `shared/copy.js` with a giving-off and a giving-on form, used by the page, the link previews and the calendar file. With giving off, `open` still records that a new device opened the card (for the "opens per sent card" measure) but releases nothing and returns `{ counted: false, reason: 'off' }`, which the page shows as no line at all.
- **Rationale**: One switch, in one place, read by everything that can mention money (FR-011).

### R7. Unbranded

- **Decision**: Remove the MosaicAds mark, the "{brand} presents" splash, the top-bar brand and the "Powered by" line. The site name is "The Giving Tree" with a neutral tree-and-star mark, the accent colour is the existing gold, and the star on top is the classic one. A community tree shows its own name in the same places. The operator's legal name appears only on `/about`. `BLOCK`-style name filters keep refusing "official", "admin" and similar.
- **Open**: the public address. `christmas.mosaicads.ai` contains the name; the owner needs to choose a neutral domain. Everything reads `PUBLIC_ORIGIN`.

### R8. Trees and addresses

- **Decision**: `/` is the global tree (slug `global`); `/t/{slug}` is a community tree; `/c/{id}` and `/me/{token}` always resolve the card's own tree. Community trees are rows created from the operator screen: slug, name (filtered, 40 characters), published. Giving is off.
- **Assumption to confirm**: operator-created at launch; visitor self-service later.

### R9. Operator screen

- **Decision**: A small separate page at `/ops`, signed in by Supabase Auth email link, limited to addresses listed in an `operators` table. It lists wishes for review (approve, reject), hides ornaments, shows each tree's measures, creates community trees, handles removal requests and edits giving settings. It calls `admin/*` routes that check the Supabase session server-side. The shared `ADMIN_SECRET` from spec 001 is retired.
- **Rationale**: FR-029 asks for review "without a command line", and per-person sign-in is safer than a shared secret.

### R10. Abuse limits

- **Decision**: Two layers. A Vercel Firewall rate-limit rule on `POST /api/*` per network address (generous: 60 a minute). In the rules, per-device limits backed by the database: at most 3 cards per device per tree per day and 10 wishes per device per hour, refused with `slow_down` (SC-010).

### R11. The simple no-3D version

- **Decision**: If WebGL2 is missing or the scene fails to start, `src/ui/Lite.jsx` renders the same flow in plain page elements: whose card it is, hang yours (pick a design from pictures, type a name; the server picks a free hook on the branch), leave a wish, your branch and its parcels, and opening wishes after release. No animation.
- **Rationale**: FR-025. The present message promises a "flat version" that doesn't exist.

### R12. Link previews and presence

- **Decision**: Static `public/og.jpg` (a render of the lit tree), `icon.svg`, a web manifest and proper `<title>` and description in `index.html`. Card previews keep the uploaded close-up and fall back to `og.jpg`. Preview images move from the key-value store to a public Supabase Storage bucket. `/me/*` keeps `noindex` and gets no preview.

### R13. Seeing problems

- **Decision**: The page sends uncaught errors and failed saves to `POST log` (message, screen, build; never wish text or tokens), which writes a structured line to Vercel's logs. A daily cron (`cron/ops`, 08:00 UTC) posts to an operator webhook (`OPS_WEBHOOK_URL`, for example a Slack channel) when wishes have waited over 24 hours, and, where giving is on, when a pot passes 90% or 100%. Error spikes use a Vercel log alert.
- **Alternatives considered**: A third-party error service (another processor to list on the privacy page; revisit if logs prove too thin).

### R14. Loading

- **Decision**: Keep the single bundle but show the opening screen from static HTML and CSS in `index.html` before the script arrives, and preload the fonts. Measure on a throttled 4G profile; if first interaction misses 5 seconds, split the 3D scene from the shell with one dynamic import (the "single file" constraint applies only to the demo build).

## Work list (input to `/speckit-tasks`)

| # | Work | Spec |
|---|---|---|
| W1 | Merge `origin/main`, resolve conflicts as in R1, tests green | FR-004, FR-005 |
| W2 | Repository interface; in-memory implementation; rules moved onto it; Redis removed | FR-004, FR-005 |
| W3 | Migrations 0004 and 0005; Postgres repository; integration run of the test suite | FR-004, FR-005, FR-016 |
| W4 | Trees from the server; routes `/` and `/t/{slug}`; cards bound to one tree | FR-033 to FR-036 |
| W5 | Wishes-first copy and screens; giving lines only with giving on; `shared/copy.js` | FR-010 to FR-012, FR-015 to FR-018 |
| W6 | Remove MosaicAds branding; neutral name, mark and colours | FR-013, FR-014 |
| W7 | Production shell; demo code into `src/demo/` behind the test build; server test mode | FR-001 to FR-003, FR-009 |
| W8 | Real ornaments only; polling feed; "Be the first" empty state; remove sample crowd and fake live gifts from production | FR-006 to FR-008 |
| W9 | "About and privacy" page and links; removal requests | FR-019 to FR-021 |
| W10 | Previews, icon, manifest, titles; preview images in Storage | FR-022 to FR-024 |
| W11 | Simple no-3D version; save-failure states; loading screen; reduced motion check | FR-025 to FR-028 |
| W12 | Operator screen with sign-in; hide, review, measures, trees, giving settings | FR-029 |
| W13 | Rate limits; error log; ops notifications | FR-030 to FR-032 |
| W14 | Provision production and testing Supabase projects, Vercel settings, neutral domain; deploy; run quickstart | SC-001 |

## Needs from the owner

1. Has the Supabase project already been created (R3)?
2. A neutral public address (R7).
3. Confirmation that community trees are operator-created at launch (R8).
4. The operator's legal name and contact for the "About and privacy" page, and the list of operator email addresses.
