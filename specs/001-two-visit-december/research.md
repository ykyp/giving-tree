# Research: The Giving Tree, two visits in December

**Date**: 2026-11-12 · **Plan**: [plan.md](./plan.md)

The Technical Context had no open unknowns: the stack is fixed by the existing card, and the three product questions were answered in the spec's Clarifications. This file records the design decisions behind the code already written, then lists the gaps between that code and the spec.

## Decisions

### R1. All server rules in one platform-free module

- **Decision**: `server/app.js` exports `handle(request, store, env)` with no Node or Vercel imports (it uses `fetch` and Web Crypto only). Three thin adapters call it: `api/index.js` (Vercel Function), a Vite middleware (dev) and `src/lib/api.js` (no-server demo).
- **Rationale**: The rules (time lock, counting, moderation) are where mistakes cost money or privacy. One copy, tested once, behaving the same in dev, demo and production.
- **Alternatives considered**: One function per route (more cold starts and duplicated cookie and error handling); a separate backend project (overkill for about 20 routes).

### R2. Storage: Redis over its REST API

- **Decision**: Upstash Redis from the Vercel Marketplace, called with plain `fetch` (`KV_REST_API_URL` and `KV_REST_API_TOKEN`, or the `UPSTASH_REDIS_REST_*` names). The store interface is eight commands: get, mget, set (NX, EXAT), del, incrby, rpush, lrange, expireat.
- **Rationale**: Every access is by key (card id, token, wish id). The cap check needs an atomic increment, and deletion on 1 February is native key expiry. No SDK, so nothing new in the bundle.
- **Alternatives considered**: Postgres (Neon) would make the metrics queries easier, but needs a schema and migrations and doesn't expire rows by itself. Blob storage has no atomic counters.

### R3. Recognising a device without accounts

- **Decision**: The server sets an HttpOnly, Secure, SameSite=Lax cookie `gt_d` (random, 180 days) on first contact and uses it for "first open from a new device", "not the sender's own device" and "one wish per device per branch". The page also keeps its own branch (`gt3-mine`: card id and Christmas token per brand) in `localStorage`, so the original link finds the branch again (FR-023).
- **Rationale**: Matches today's counting rule without collecting anything personal. An HttpOnly cookie can't be read or copied by page scripts.
- **Alternatives considered**: Device fingerprinting (personal data, against FR-031); accounts (against the spec).
- **Known limit**: Clearing cookies counts as a new device, as it does today. Brand caps bound the cost.

### R4. Time lock

- **Decision**: The server releases wish text only when its own clock has passed 24 December 10:00 UTC **and** the reader's device reports a local date of 25 December or later (sent as `day=YYYY-MM-DD`). Before that, the reader's response contains names and counts but no `text` field. Opening or reporting a wish is refused until release.
- **Rationale**: The server clock stops anyone opening early by changing their device date. The device date gives each reader their own midnight (FR-013). At worst, someone who sets their clock forward on 24 December opens up to 14 hours early, which the product document accepts.
- **Alternatives considered**: Storing the reader's time zone (more data, and still trusts the device); releasing at a single UTC moment (wrong for most readers).

### R5. Link previews

- **Decision**: `vercel.json` sends `/c/:id` to the preview route when the user agent looks like a link-preview bot, and to the app otherwise. The preview page carries Open Graph tags, with live text such as "4 wishes waiting" or "Our branch gave £0.90". The image is the 3D close-up the sender's own page renders when they open the share sheet, uploaded as a JPEG of up to about 200 KB.
- **Rationale**: Shows the real ornament (as the v3 spec asks) without rendering 3D on a server.
- **Alternatives considered**: Server-rendered images (an extra dependency and fonts in the function, and not the real ornament); a static image (loses the name and count).
- **Known limit**: Until the sender has opened the share sheet once, the preview has no image. Messaging apps cache previews, so the count can be stale.

### R6. Branch layout on the tree

- **Decision**: The server stores each ornament's hook number. The page works out a branch as the owner's hook plus its nearest free hooks (at least 6, or kids + 3). It clears sample ornaments from those hooks, hangs the real ones and glows the empty hooks. If a stored hook is taken, the ornament moves to the next free hook on the branch.
- **Rationale**: The tree on each device is a view of one branch among sample ornaments, so hook clashes between branches don't matter. Counts always come from the server (spec edge case "Branch fills up").
- **Alternatives considered**: Server-assigned global hooks (the tree has about 150 hooks and there will be thousands of cards).

### R7. Testing

- **Decision**: Move the rules test used during the build into `tests/server/*.test.js` and run it with `node --test` (`npm test`). The 3D flows are checked by hand with the scripted steps in quickstart.md.
- **Rationale**: The rules are pure functions over a store, so they test fast in Node with the in-memory store. Node's runner needs no new dependency.
- **Alternatives considered**: Vitest (another dependency for the same result); Playwright end-to-end (WebGL in headless browsers is slow and flaky; worth it later if the flows keep changing).

### R8. Email reminders: built, off at launch

- **Decision**: Email stays behind its own switch, `EMAIL_REMINDERS=on`, which is off at launch, in addition to the provider settings (`RESEND_API_KEY`, `EMAIL_FROM`). When on, `/api/me/:token/reminder` stores the address with expiry on 1 February, and a Vercel Cron Job on 25 December at 09:00 UTC sends one email to each address and marks it sent.
- **Rationale**: Clarification Q1, recorded as FR-022. A separate switch means the provider can be set up and tested without the form appearing to the public.
- **Alternatives considered**: Removing the email code (it would need rebuilding if links saved are low).
- **Known limit**: 09:00 UTC is 09:00 in London but not elsewhere. Acceptable for a UK campaign.

### R9. Deleting data on 1 February 2027

- **Decision**: Every wish, wish list, self-wish marker, "already wished" marker, reminder and the review queue is written with an expiry of 1 February 2027 00:00 UTC. Cards (first name, design, hook) and totals have no expiry, for the keepsake.
- **Rationale**: Deletion can't be forgotten and doesn't depend on a job running (FR-032, SC-009).
- **Alternatives considered**: A purge cron (can fail silently).

### R10. When no server answers

- **Decision (change from current code)**: The page runs the rules in the browser (demo mode) only when there is no API at all: the single-file preview says so with a `<meta name="gt-demo">` tag, and a static host is recognised by `/api/health` returning 404 or a non-JSON page. If the API exists but says it has no store (`503 no_store`) or errors, the page shows "The tree can't be reached just now" and doesn't let people seal wishes.
- **Rationale**: Today the page falls back to browser-only mode on any failure, so a live deployment without Redis would accept wishes that never reach anyone. That breaks the promise in FR-010 and FR-015.
- **Alternatives considered**: Keeping the silent fallback (rejected for the reason above).

### R11. Christmas-morning performance

- **Decision**: Measure before changing anything. On 25 December the scene adds about 200 instanced presents, 50% more snow and about 140 ornaments. One run in a hidden browser pane showed about 0.3 fps; hidden panes throttle rendering, so this is unconfirmed.
- **Rationale**: SC-003 and the performance tiers depend on it. If it is real, the likely fixes are presents and extra snow only on the high tier, and capping the full square at the existing ornament limit.

## Gaps between the current code and the spec

These are the inputs for `/speckit-tasks`.

| # | Gap | Spec | Kind |
|---|-----|------|------|
| G1 | Email form appears whenever the provider is configured; needs the separate `EMAIL_REMINDERS` switch, off by default (R8) | FR-022 | Code |
| G2 | Page falls back to browser-only mode when the live store is missing; should show an error instead (R10) | FR-010, FR-015 | Code |
| G3 | Rules test lives in a scratch folder; move it to `tests/server/`, add `npm test`, and add cases for 5 time zones, late arrivals and the self-wish | SC-002, SC-007, SC-008 | Tests |
| G4 | No production store: provision Upstash Redis through the Marketplace; set `ADMIN_SECRET`, `CRON_SECRET` and `PUBLIC_ORIGIN` | all | Setup (needs the owner's Vercel login) |
| G5 | Vercel rewrites, bot previews, the function and the cron job have never run on Vercel; check on a preview deployment | FR-006, FR-022 | Verify |
| G6 | Christmas-morning frame rate unconfirmed (R11); measure with the pane visible and on a mid-tier phone | Performance tiers | Verify, maybe code |
| G7 | Never run in a browser: the "what your branch gave" summary, the thank-you card, the self-wish coda, fireworks, the midnight pulse and the keepsake page | Stories 5 and 6 | Verify |
| G8 | Dragging an ornament by hand onto a branch hook (only Auto-hang tested); real iOS Safari and Android Chrome runs | Stories 1 and 2 | Verify |
| G9 | Reviewers have only the API (contracts/ops.md); document the steps for the team | FR-029 | Docs |
| G10 | Confirm nothing branded appears between the Christmas arrival and the last wish | FR-036 | Verify |
| G11 | README still describes phase A; add the two visits, setup, configuration and the demo controls | none | Docs |
| G12 | The published single-file preview (`publish/`) is stale and runs in demo mode only; rebuild it after G2 | none | Build |
