# Implementation Plan: A real home page, trees people create, and sending a wish

**Branch**: `003-home-and-own-trees` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-home-and-own-trees/spec.md`

## Summary

Give the site a front door with three ways in, let anyone start a tree at its own shareable address, add "send a wish to a friend" for people who have no ornament yet, make the public pages readable by search engines, and remove test mode from every deployed copy.

Technical approach: stay on the current stack (Vite, React, one Vercel Function, Postgres) and do not move to Next.js for this launch (research R1). The home page becomes a small page of ordinary HTML that is in the document before any script runs; the 3D scene is split out and loads only when a visitor enters a tree. Every public address gets its own title, description and readable text from the server, the same for people and search engines, which replaces today's bot-only preview pages. Trees get an address made from their name. Sent wishes are a new small table and one database function that turns a sent wish into an ordinary wish when it is claimed.

## The flow

```text
                       ┌──────────────────────── /  (home) ────────────────────────┐
                       │  Your branches (if this phone has any)  → /me/{token}     │
 first visit  ───────► │  1. Hang on the Giving Tree             → /t/global       │
                       │  2. Start a tree for your people        → name it → /t/{name-xxxxx}
                       │  3. Send a wish to a friend             → write it → link /w/{token}
                       └───────────────────────────────────────────────────────────┘

 /t/{slug}   tree page: words first, then "Hang an ornament" loads the scene and starts visit 1 (spec 001)
             a phone that already has a branch here goes to it
 /c/{id}     a card someone shared: straight into the invited flow on that card's tree (unchanged)
 /w/{token}  a wish someone sent: "A wish for Tom, from Eleni" + wrapped parcel
             → "Hang an ornament to keep it" → visit 1 on that tree → the wish is the first parcel under it
             → already has a branch on that tree → the parcel is added to it
 /me/{token} your own branch (unchanged)
 /about      About and privacy (spec 002)

 after 31 December: / shows the shared tree's keepsake and your branches; creating and sending are closed
```

After sending a wish, the sender is offered "Hang your own ornament so Tom can send one back", which takes them into choice 1 or their own tree.

## Technical Context

**Language/Version**: JavaScript (ES2022), JSX, SQL (PostgreSQL 15 on Supabase); Node.js 24 on Vercel

**Primary Dependencies**: Unchanged: React 18.3, @react-three/fiber 8, drei 9, three 0.169, zustand 4, `postgres` 3.4. No new dependencies.

**Storage**: Supabase Postgres, one new migration (`0004_home_trees_sent_wishes.sql`); in-memory repository for tests and local development

**Testing**: `npm test` (rules in memory) and `npm run test:db` (same suites on Postgres), extended for trees people create, sent wishes, page shells and the removal of test mode; browser checks in quickstart.md

**Target Platform**: Mobile browsers first, including the in-app browsers of messaging apps; search engine crawlers for the public pages

**Project Type**: Web application: one front end with several page addresses, one Function

**Performance Goals**: Home page words and choices visible within 2 seconds on 4G (FR-019), with under 60 KB of script needed for it; the scene (about 1.3 MB today) loads only when entering a tree

**Constraints**: Same page for people and search engines (no deciding by user agent). Created trees are never listed or indexed. A sent wish's words never reach a browser before the same moment any other wish would. No deployed copy can fake the date.

**Scale/Scope**: Thousands of created trees; tens of thousands of sent wishes; three indexable addresses

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template. **Gate: passes, with nothing to check.** The working principles from plans 001 and 002 apply; this plan adds one: **people and search engines get the same page**.

**Re-check after Phase 1 design**: passes. No complexity to justify: nothing is added to the stack.

## Project Structure

### Documentation (this feature)

```text
specs/003-home-and-own-trees/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/api.md        # New and changed API routes
├── contracts/pages.md      # Every page address: what it returns, whether it is indexable
└── tasks.md                # /speckit-tasks
```

### Source Code (repository root)

```text
shared/
├── shell.js                 # NEW: the HTML document for any address (title, description, readable text, index or noindex)
├── copy.js                  # + home, tree-page and sent-wish wording
└── slug.js                  # NEW: tree address from a name ("The Georgiou family" → georgiou-family-k3f9x)
server/
├── app.js                   # + tree creation and reports, sent wishes, page/* routes, sitemap; test routes only when run locally
├── repo-memory.js, repo-postgres.js   # + createTree by a device, reports, sent wishes and claiming
supabase/migrations/0004_home_trees_sent_wishes.sql   # NEW
src/
├── main.jsx                 # Small entry: reads the address, renders Home / TreePage / SentWish / About, loads the scene on demand
├── pages/Home.jsx           # NEW: welcome, your branches, three choices, create-tree and send-wish forms
├── pages/TreePage.jsx       # NEW: a tree's words and "Hang an ornament"
├── pages/SentWish.jsx       # NEW: the parcel someone sent you
├── scene/                   # The existing 3D app (App.jsx, three/, ui/), loaded with one dynamic import
├── store.js                 # Routing moves to main.jsx; + claiming a sent wish when the card is saved
└── demo/                    # Test panel and helpers: loaded only by `npm run dev`
index.html                   # Home page content as real HTML, so it is readable before any script runs
vite.config.js               # Scene split from the shell; the dev server is the only place test mode exists
vercel.json                  # /, /about static; /t, /c, /w through the function's page route; sitemap.xml, robots.txt; no user-agent rules
tests/server/                # + trees.test.js, sent.test.js, pages.test.js, no-test-mode.test.js
```

**Structure Decision**: Same repository, same Function. Page addresses that need facts from the database (`/t/…`, `/c/…`, `/w/…`) are answered by the Function with a complete HTML document built by `shared/shell.js`; the home and About pages are static files built from the same module. The front end becomes a thin shell that loads the scene only when needed.

## Phases

- **Phase 0, research**: [research.md](./research.md) (R1 is the Next.js decision).
- **Phase 1, design**: [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [contracts/pages.md](./contracts/pages.md), [quickstart.md](./quickstart.md).
- **Phase 2, tasks**: `/speckit-tasks`.

## Complexity Tracking

No constitution violations to justify.
