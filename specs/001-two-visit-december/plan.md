# Implementation Plan: The Giving Tree, two visits in December

**Branch**: `001-two-visit-december` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-two-visit-december/spec.md`

## Summary

People visit the Giving Tree twice: between 1 and 24 December they hang an ornament, start a branch, seal wishes and invite people; from 25 December they open the wishes left for them, see what their branch gave and send a thank-you. A New Year's Eve finale and a keepsake page close the campaign.

Technical approach: keep the existing single-page 3D card (React Three Fiber) and add one small server, deployed as a single Vercel Function, that owns every rule the browser can't be trusted with: the time lock, who may read a wish, gift counting, moderation and data deletion. All server rules live in one platform-free module (`server/app.js`). It runs unchanged in the Vercel Function (Redis store), the Vite dev server (file store) and a browser-only demo (local store), so the rules are tested once and behave the same everywhere.

A first version of all of this is already in the working tree (uncommitted, from the 9 to 12 November session). This plan records the design it follows and lists the gaps between that code and the spec, which `/speckit-tasks` should turn into work.

## Technical Context

**Language/Version**: JavaScript (ES2022 modules), JSX; Node.js 22 locally, Node.js 24 on Vercel

**Primary Dependencies**: React 18.3, @react-three/fiber 8, drei 9, three 0.169, zustand 4 (all existing). No new runtime dependencies: Redis is reached over its REST API with `fetch`, and email (when switched on) over Resend's REST API with `fetch`.

**Storage**: Redis (Upstash, provisioned through the Vercel Marketplace) in production; a JSON file in `.data/` in development; `localStorage` in the no-server demo. Every key that holds a wish or an email expires on 1 February 2027.

**Testing**: Node's built-in test runner (`node --test`) for the server rules, which need no browser; manual end-to-end runs in the browser for the 3D flows, scripted in [quickstart.md](./quickstart.md). See research R7.

**Target Platform**: Mobile browsers first (iOS Safari 16+, Android Chrome), desktop browsers second; WebGL2 required for the 3D scene, as today. Hosting on Vercel (Vite static build plus one Function and one Cron Job).

**Project Type**: Web application: a single-page front end plus a small JSON API in the same repository.

**Performance Goals**: The existing tiers (60 fps high, 45+ mid, 30+ low) must hold on Christmas morning, when the village adds presents, more snow and a full square. The server answers every user action quickly enough to feel instant on 4G.

**Constraints**: No accounts and no passwords. Wishes never reach the browser before release (FR-013, FR-014). Private links are unguessable (FR-016). One self-contained `app.js` bundle, so the hosted preview keeps working. Visit 1 must be live on 1 December 2026.

**Scale/Scope**: Three example brand trees. Per brand, plan for tens of thousands of cards, a similar number of wishes and up to the pot cap in counted opens (for example 5,000 opens for a £500 cap at 10p). Peak traffic on 1 December and on the morning of 25 December.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so the project has no ratified principles to check against. **Gate: passes, with nothing to check.** Running `/speckit-constitution` before `/speckit-tasks` is recommended; the principles this plan already follows in practice are:

- the server decides anything the browser could fake (time lock, counting, who can read);
- every amount shown is exact;
- personal data is the minimum, and it expires;
- every action in the 3D scene also has an accessible button.

**Re-check after Phase 1 design**: still passes; no violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-two-visit-december/
├── plan.md              # This file
├── research.md          # Phase 0: decisions and the gap list
├── data-model.md        # Phase 1: entities, keys, state changes
├── quickstart.md        # Phase 1: how to prove it works end to end
├── contracts/
│   ├── api.md           # The JSON API the page and link previews use
│   └── ops.md           # Reviewer, metrics and cron endpoints, and configuration
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
api/
└── index.js              # The one Vercel Function: every /api/* path is rewritten here
server/
├── app.js                # All server rules: routing, time lock, counting, moderation, previews, cron, admin
├── kv-redis.js           # Store adapter: Redis over REST (production)
└── kv-memory.js          # Store adapter: in memory, saved to a file (dev) or localStorage (demo)
shared/
├── season.js             # Calendar: release time, freeze time, wipe date, advent/christmas/nye/keepsake
└── moderation.js         # Wish and name filters, length limits
src/
├── store.js              # Flow state machine, routing (/c/…, /me/…), visit actions
├── lib/api.js            # Calls /api, or runs server/app.js in the browser when no server answers
├── three/
│   ├── Branch.jsx        # Parcel pile under your ornament, glowing empty hooks
│   ├── Season.jsx        # Presents (25 Dec on), fireworks (31 Dec from 18:00)
│   ├── Crowd.jsx         # + branch hooks: keeps hooks free, hangs real branch ornaments
│   ├── Hero.jsx, CameraRig.jsx, Director.jsx, Tree.jsx, World.jsx, shared.js  # + new phases and shots
└── ui/
    ├── Wishes.jsx        # Seal, wish-for, meet, branch counter, invite, save link, parcels, gave, thanks, keepsake
    ├── Overlay.jsx       # Routes each phase to its screen
    └── Panel.jsx         # Demo controls: fake date, add a friend's wish
tests/
└── server/               # NEW: node --test suites for the server rules (see research R7)
vercel.json               # Rewrites for /api, /c/:id (bots get a preview page), /me/:token; cron on 25 Dec 09:00 UTC
vite.config.js            # Dev middleware that serves /api from a file store
```

**Structure Decision**: Keep a single repository and a single front-end bundle. Server code sits beside the front end (`api/`, `server/`, `shared/`) instead of a separate backend project, because it is one function with about 20 routes. `shared/` holds the rules both sides need, so the page and the server can never disagree about dates or limits.

## Phases

- **Phase 0, research**: [research.md](./research.md). Ten decisions (R1 to R10) and the list of gaps between the current code and the spec (G1 to G12).
- **Phase 1, design**: [data-model.md](./data-model.md), [contracts/api.md](./contracts/api.md), [contracts/ops.md](./contracts/ops.md), [quickstart.md](./quickstart.md).
- **Phase 2, tasks**: `/speckit-tasks` should start from the gap list in research.md, then the quickstart checks that have never been run.

## Complexity Tracking

No constitution violations to justify.
