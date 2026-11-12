# The Giving Tree

The MosaicAds Christmas card, built with React Three Fiber. People visit twice:

- **1 to 24 December**: fly into a snowy square, light the tree, hang an ornament with your name on it, seal a wish and invite people to your branch. Everyone you invite hangs theirs next to yours and leaves you a sealed wish.
- **25 to 31 December**: come back to open your wishes one by one, see what your branch gave and send a thank-you card.

Each time a new person opens a card, the brand gives a fixed amount to its charity, up to its pot. On 31 December there are fireworks; after that the tree becomes a keepsake page.

Specs:

- `specs/001-two-visit-december/`: the two-visit feature (spec, plan, data model, API contracts, tasks and test results), written with [Spec Kit](https://github.com/github/spec-kit)
- `giving-tree-v3-spec.md`: the scene and the original card flow

## Run it

```bash
npm install
npm run dev        # http://localhost:5173, with the real server rules and a file store in .data/
npm test           # the server rules: time lock, counting, moderation, deletion
npm run build      # dist/app.js (single bundle)
node scripts/page.mjs   # publish/ = one page + app.js, a no-server demo for the hosted preview
npm run assets     # compress Blender exports in assets/raw/ → public/models/
```

### The demo controls

In development the left panel has controls the live site never shows:

- **View**: jump to hanging, being invited, your branch or the tree.
- **Pretend it's**: fakes the date for the page and the server (5 Dec, 25 Dec, 31 Dec fireworks, midnight, 2 Jan keepsake).
- **A friend hangs and wishes**: adds a made-up friend to your branch with a wish.
- **Reset this phone**: makes this browser a new device, so cards can give again.

`specs/001-two-visit-december/quickstart.md` walks through both visits step by step.

## How it fits together

| Part | Where | What it does |
|---|---|---|
| Server rules | `server/app.js` | Every rule the browser can't be trusted with: when wishes open, who can read them, gift counting, moderation, link previews. No platform code, so it runs the same everywhere |
| Stores | `server/kv-redis.js`, `server/kv-memory.js` | Redis in production; a JSON file in development; the browser's own storage in the no-server demo |
| Vercel function | `api/index.js`, `vercel.json` | One function behind every `/api/*` path; link-preview bots on `/c/…` get a preview page; a cron for the optional reminder email |
| Shared rules | `shared/season.js`, `shared/moderation.js` | Dates and limits used by both the page and the server |
| Flow | `src/store.js`, `src/three/Director.jsx` | The state machine for both visits, and routing for `/c/{id}` (a card) and `/me/{token}` (your private branch) |
| Screens | `src/ui/Wishes.jsx`, `src/ui/Overlay.jsx` | Sealing, inviting, saving your link, opening parcels, the summary, the thank-you, the keepsake |
| Scene | `src/three/` | Village, tree, ornaments, the branch and its parcels (`Branch.jsx`), presents and fireworks (`Season.jsx`), camera shots |
| Tests | `tests/server/` | `node --test` suites for the server rules |

### The rules that matter

- **Time lock**: a wish opens at 00:00 on 25 December in the reader's own time zone. The server releases the words only after 24 December 10:00 UTC (Christmas in the earliest time zone) and only when the reader's device date is the 25th or later. Before that the words never reach the browser.
- **Privacy**: only the person a wish was written for can read it, through their private link. Public pages and previews never carry that link.
- **Counting**: the brand gives the first time a new device opens a card. Never for the sender's own device, a repeat open or a link-preview bot, and never past the pot.
- **Moderation**: wishes with profanity, links or contact details wait for a reviewer; readers can report any wish. See `docs/reviewing-wishes.md`.
- **Deletion**: wishes and emails are deleted automatically on 1 February 2027. First names and totals stay for the keepsake.

## Going live on Vercel

1. Link the project (`vercel link`) and add **Upstash Redis** from the Vercel Marketplace. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
2. Set these environment variables:

| Name | Needed | Purpose |
|---|---|---|
| `ADMIN_SECRET` | Yes | Access for reviewing wishes and reading metrics |
| `CRON_SECRET` | Yes | Lets the reminder cron run |
| `PUBLIC_ORIGIN` | Recommended | The site's address, used in calendar files and previews |
| `EMAIL_REMINDERS` | No | `on` shows the email reminder option. Off at launch |
| `RESEND_API_KEY`, `EMAIL_FROM` | Only with email on | Email provider |

3. Deploy, then run section 9 of `specs/001-two-visit-december/quickstart.md`.

If the store is missing, the site shows "The tree can't be reached just now" and accepts nothing, so no wish is ever saved where it can't be delivered.

## The scene

| Area | File |
|---|---|
| Camera rails, fly-in spline, branch close-ups, explore orbit | `src/three/CameraRig.jsx` |
| Village: lane, arch, square, houses, stalls, church, rink, carousel | `src/three/World.jsx` |
| Fir tree (about 6k instanced branch cards, wind sway), lights, star | `src/three/Tree.jsx` |
| 8 ornament designs, name atlas, live engraving | `src/three/ornamentKit.js` |
| Crowd of named ornaments, branch hooks, live drops with rope physics | `src/three/Crowd.jsx` |
| Crate chooser, gift box, engraving, drag-and-drop hanging | `src/three/Hero.jsx` |
| Post-processing and quality tiers | `src/three/Effects.jsx`, `src/App.jsx` |
| glTF pipeline (Draco + KTX2 + LOD) | `scripts/assets.mjs` |

### Deviations from the v3 spec (on purpose)

- **Physics**: a 30-line verlet rope solver (`ropeStep` in `Crowd.jsx`) instead of Rapier. Same behaviour without a WebAssembly download, which some sandboxed hosts block.
- **Assets**: everything is procedural until the bought tree and village kit arrive. Each stand-in lives in one component, so replacing it is a `useGLTF('/models/tree.glb')` inside `Tree.jsx` (keep `BRANCHES` and `shared.hooks` so hook positions stay identical) and the same for `Village`.
- **Lighting**: no baked lightmaps yet; the dark-to-lit change is driven by `litLevel()`.
- **Sample ornaments**: the tree is dressed with sample names around your real branch until real cards fill it.

### Swapping in bought models

1. Export from Blender as `.glb` into `assets/raw/` (Y-up, metres, ornament origin at the hook, props at the base).
2. `npm run assets` → `public/models/*.glb` (+ `.lod1.glb`), with a size report against the budget.
3. Serve the Draco and Basis decoders from our own domain: copy `node_modules/three/examples/jsm/libs/draco/` and `.../basis/` to `public/decoders/`, then `useGLTF.setDecoderPath('/decoders/draco/')`.
4. Tree: keep hook positions from `BRANCHES` (or export empties named `hook_###` from Blender and read them instead).

## Database (Supabase)
1. Vercel → giving-tree project → **Storage** → Create → **Supabase**, region **London (eu-west-2)**. This adds `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` to the project.
2. Supabase → **SQL Editor** → paste and run `supabase/migrations/0001_giving_tree.sql`, then `0003_ornaments_after_first_gift.sql`.
3. Supabase → Database → Extensions → enable **pg_cron**, then run `0002_purge_schedule.sql` (deletes wishes and emails on 1 Feb).
4. Vercel → Settings → Environment Variables: add `DEVICE_SALT` (a long random string) and `PUBLIC_BASE_URL`. Redeploy.
5. Go live: once the charity agreement is signed, run `update brands set agreement_signed_at = now(), status = 'live' where slug = 'mosaicads';`

API (Vercel functions in `api/`): `POST /api/cards` · `POST /api/open` · `GET /api/tree?brand=` · `POST /api/wishes` · `GET /api/me?token=` · `POST /api/reminder`. All counting rules live in the database function `record_open` (tested: own device, once per phone, bots, cap, tree must be live).
