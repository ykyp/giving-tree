# The Giving Tree

The MosaicAds Christmas card, built with React Three Fiber. People visit twice:

- **1 to 24 December**: fly into a snowy square, light the tree, hang an ornament with your name on it, seal a wish and invite people to your branch. Everyone you invite hangs theirs next to yours and leaves you a sealed wish.
- **25 to 31 December**: come back to open your wishes one by one, see what your branch gave and send a thank-you card.

It is about wishes between people: no charity, sponsor or money is involved. (A tree can have giving switched on by an operator, with a sponsor, a registered charity and a pot; that is off by default.) On 31 December there are fireworks; after that the tree becomes a keepsake page.

Specs:

- `specs/002-production-launch/`: making it a public product (wishes first, real data, trees, operators), with its task list
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
| Repositories | `server/repo-postgres.js`, `server/repo-memory.js` | Postgres (Supabase) in production; in memory for tests, saved to a file in development and to the browser in the no-server demo |
| Database | `supabase/migrations/` | Tables, the atomic functions (`record_open`, `remove_card`) and the 1 February deletion job |
| Wording | `shared/copy.js` | Every sentence that changes with giving. With giving off (the default) none mentions money |
| Vercel function | `api/index.js`, `vercel.json` | One function behind every `/api/*` path; link-preview bots on `/c/…` get a preview page; a cron for the optional reminder email |
| Shared rules | `shared/season.js`, `shared/moderation.js` | Dates and limits used by both the page and the server |
| Flow | `src/store.js`, `src/three/Director.jsx` | The state machine for both visits, and routing for `/c/{id}` (a card) and `/me/{token}` (your private branch) |
| Screens | `src/ui/Wishes.jsx`, `src/ui/Overlay.jsx` | Sealing, inviting, saving your link, opening parcels, the summary, the thank-you, the keepsake |
| Scene | `src/three/` | Village, tree, ornaments, the branch and its parcels (`Branch.jsx`), presents and fireworks (`Season.jsx`), camera shots |
| Tests | `tests/server/` | `node --test` suites for the server rules |

### The rules that matter

- **Time lock**: a wish opens at 00:00 on 25 December in the reader's own time zone. The server releases the words only after 24 December 10:00 UTC (Christmas in the earliest time zone) and only when the reader's device date is the 25th or later. Before that the words never reach the browser.
- **Privacy**: only the person a wish was written for can read it, through their private link. Public pages and previews never carry that link.
- **Giving (optional, off by default)**: on a tree with giving live, the sponsor gives the first time a new device opens a card. Never for the sender's own device, a repeat open or a link-preview bot, never past the pot, and never without a signed agreement on record.
- **Moderation**: wishes with profanity, links or contact details wait for a reviewer; readers can report any wish. See `docs/reviewing-wishes.md`.
- **Deletion**: wishes and emails are deleted automatically on 1 February 2027. First names and totals stay for the keepsake.

## Going live on Vercel

The database is Supabase (Postgres). The server talks to it directly over the pooled address; the browser never does.

1. **Create the tables** (once, and again whenever `supabase/migrations/` changes):

   ```bash
   supabase link --project-ref <your project ref>
   supabase db push
   ```

   This creates every table, the three database functions, the deletion job for 1 February 2027, and one tree: the global one, with giving off.
2. **Connect Vercel to Supabase**: the Supabase integration sets `POSTGRES_URL`, `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. **Add the settings in `.env.example`**: `DEVICE_SALT`, `CRON_SECRET` and `PUBLIC_ORIGIN` are required.
4. **Add operators**: in the Supabase SQL editor, `insert into operators (email) values ('you@example.org');`
5. Deploy. `/api/health` should answer `{"ok":true,"email":false,"testMode":false}`.

If the database or `DEVICE_SALT` is missing, the site shows "The tree can't be reached just now" and accepts nothing, so no wish is ever saved where it can't be delivered.

### Testing the database code

```bash
npm test                                   # the rules, in memory
GT_TEST_DB=postgres://localhost/gt_test npm run test:db   # the same suites on a real Postgres
```

`test:db` builds a throwaway schema for every test from `supabase/migrations/` and drops them afterwards. Point it at a local or scratch database, never production.

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
