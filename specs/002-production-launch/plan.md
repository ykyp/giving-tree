# Implementation Plan: Production launch of the Giving Tree

**Branch**: `002-production-launch` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-production-launch/spec.md`

## Summary

Make the Giving Tree a public product: only the visitor's experience on screen, only real data on the tree, wishes between friends with no charity or MosaicAds branding, one global tree with optional community trees, and a small set of tools to operate it. Giving stays in the code as a per-tree option that is off by default.

Technical approach: join the two diverged lines of work. Local `main` has the two-visit experience and its tested rules on a key-value store; `origin/main` has a Supabase (Postgres) schema with a gift ledger and a signed-agreement rule. The rules module (`server/app.js`) stays the single place for behaviour, but it stops talking to a key-value store and talks to a small **repository** interface with two implementations: an in-memory one (tests, local development, the single-file demo) and a Postgres one on Supabase (production). The schema from `origin/main` is extended by one migration for trees, two-visit wishes, moderation, operators and events. Redis is dropped. The page loses its demo shell in production builds and reads its tree (name, look, giving settings) from the server.

## Technical Context

**Language/Version**: JavaScript (ES2022 modules), JSX; SQL (PostgreSQL 15 on Supabase, PL/pgSQL for atomic operations); Node.js 24 on Vercel

**Primary Dependencies**: Existing: React 18.3, @react-three/fiber 8, drei 9, three 0.169, zustand 4. Added on the server only: `@supabase/supabase-js` (already in `origin/main`). Not added to the browser bundle (research R4).

**Storage**: Supabase Postgres (London region) as the only system of record; Supabase Storage for link-preview images. In-memory repository for tests and local development. Redis and the key-value adapters are removed.

**Testing**: `node --test` for the rules against the in-memory repository (the 27 existing cases, extended); the same suite run against a real Postgres through the Postgres repository as an integration check (local Supabase CLI or a test project); scripted browser checks in `quickstart.md`.

**Target Platform**: Mobile browsers first (iOS Safari 16+, Android Chrome, in-app browsers of the main messaging apps); desktop browsers. Vercel hosting: static build, one Function, Cron Jobs, Firewall rate limiting.

**Project Type**: Web application: single-page front end plus a JSON API and a small operator screen, one repository.

**Performance Goals**: Opening screen within 2 s and first interaction within 5 s on 4G (SC-005); new ornaments visible to other viewers within 10 s (SC-004); existing frame-rate tiers hold.

**Constraints**: No accounts for visitors. Wishes never reach a browser before release. No third-party tracking or advertising (FR-021). No MosaicAds branding outside the "About and privacy" page (FR-013). Giving off by default, and invisible when off (FR-011). Production starts from an empty record (FR-009).

**Scale/Scope**: One global tree at launch and a handful of community trees; plan for 50,000 cards and 100,000 wishes in the month; peaks on launch day and the morning of 25 December; 3 to 5 operators.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so there are no ratified principles to check. **Gate: passes, with nothing to check.** The working principles from plan 001 still apply and this plan adds two:

- the server decides anything the browser could fake;
- every number shown is exact;
- personal data is the minimum, and it expires;
- every action in the 3D scene also has an accessible button;
- **nothing invented is shown to the public** (no sample names, totals or placeholder text);
- **optional features are invisible when off** (giving, email reminders).

**Re-check after Phase 1 design**: still passes. One complexity item is recorded below.

## Project Structure

### Documentation (this feature)

```text
specs/002-production-launch/
├── plan.md              # This file
├── research.md          # Decisions R1 to R14 and the work list W1 to W14
├── data-model.md        # Tables, the repository interface, states
├── quickstart.md        # How to prove it end to end, locally and on Vercel
├── contracts/
│   ├── api.md           # Public API after this change (differences from spec 001)
│   └── ops.md           # Operator screen, cron, notifications, configuration
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
api/
└── index.js                  # The one Vercel Function (kept); builds the Postgres repository
server/
├── app.js                    # Rules and routing; now calls a repository, not a key-value store
├── repo-memory.js            # NEW: in-memory repository (tests, dev, single-file demo); replaces kv-memory.js
├── repo-postgres.js          # NEW: Supabase/Postgres repository; replaces kv-redis.js
└── ratelimit.js              # NEW: per-device limits on creating cards and wishes
shared/
├── season.js, moderation.js  # Unchanged
└── copy.js                   # NEW: every visitor-facing sentence that differs with giving on or off
supabase/
├── migrations/0001…0003      # From origin/main (schema, purge schedule, ornaments view)
├── migrations/0004_trees_two_visits.sql   # NEW: trees, giving off by default, two-visit wishes, moderation, events, operators
├── migrations/0005_functions.sql          # NEW: atomic functions (create card, leave wish, record open, read branch)
└── seed-test.sql             # NEW: data for the testing deployment only
src/
├── App.jsx                   # Production shell: card only; demo panel only in test builds
├── store.js, lib/api.js      # Tree comes from the server; polling for new ornaments; no demo fallback in production
├── config.js                 # Scene constants only; brands and sample names move to src/demo/
├── demo/                     # NEW: panel, sample trees, made-up friends. Not in the production bundle
├── three/Crowd.jsx           # Real ornaments only in production; sample crowd only in demo
├── ui/Wishes.jsx, Overlay.jsx  # Wishes-first copy; giving lines only when the tree has giving on
├── ui/About.jsx              # NEW: "About and privacy"
├── ui/Lite.jsx               # NEW: the simple no-3D card (name, wish form, branch link)
└── ops/                      # NEW: operator screen (separate entry, signed in)
public/
└── og.jpg, icon.svg, manifest.webmanifest   # NEW: default link-preview image and icons
tests/server/                 # Existing suites on the in-memory repository, plus giving-off and tree cases
tests/integration/            # NEW: the same suites against Postgres
vercel.json                   # Rewrites for /t/:slug, /about, /ops; crons; headers
```

**Structure Decision**: Keep one repository and one Function. The join is done by **merging `origin/main` into local `main`** (research R1) and resolving the nine conflicting files in favour of the local two-visit code, while keeping `supabase/`, `.env.example` and the server-side Supabase client from `origin/main`. The eight per-route files in `origin/main`'s `api/` are superseded by `server/app.js` and are removed in the merge; their database function `record_open` is kept and extended.

## Phases

- **Phase 0, research**: [research.md](./research.md).
- **Phase 1, design**: [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [contracts/ops.md](./contracts/ops.md), [quickstart.md](./quickstart.md).
- **Phase 2, tasks**: `/speckit-tasks`, from the work list in research.md.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| A repository interface with two implementations (memory and Postgres) | The rules must be tested fast without a database, yet production needs real tables for the ornaments feed, operator tools, removal requests and the gift ledger | Keeping the key-value interface on top of one Postgres table would keep the tests green but hide all data in opaque values: no query for "latest ornaments on this tree", no ledger, no operator screens. Writing the rules directly in SQL would lose the fast test suite |
