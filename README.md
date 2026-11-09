# The Giving Tree (v3, phase A)

React Three Fiber build of the MosaicAds Christmas card. Spec: `giving-tree-v3-spec.md` (scene + flow) and `giving-tree-3d-spec.md` (backend, counting rules, compliance).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/app.js (single bundle)
node scripts/page.mjs   # publish/ = page + app.js, used for the hosted preview
npm run assets     # compress Blender exports in assets/raw/ → public/models/
```

## What's in phase A
| Area | File | Status |
|---|---|---|
| Flow state machine (arrival → … → explore) | `src/store.js`, `src/three/Director.jsx` | done |
| Camera rails, fly-in spline, explore orbit (camera-controls) | `src/three/CameraRig.jsx` | done |
| Village: lane, arch + banner, square, houses, lamps, stalls, church, hills, pines, rink, carousel, birds, smoke | `src/three/World.jsx` | procedural stand-ins |
| Fir tree (≈6k instanced branch cards, wind sway shader), spiral lights, star/logo topper | `src/three/Tree.jsx` | procedural stand-in |
| 8 ornament designs, name atlas, live engraving | `src/three/ornamentKit.js` | done |
| Crowd: 120 instanced named ornaments, live drops with rope physics | `src/three/Crowd.jsx` | done |
| Hero: crate chooser, gift box unwrap, engrave, drag-and-drop with hook snapping, auto-hang | `src/three/Hero.jsx` | done |
| Post-processing (bloom, ACES, SMAA, vignette), quality tiers + PerformanceMonitor | `src/three/Effects.jsx`, `src/App.jsx` | done |
| DOM overlay: prompts, chooser, engrave input, greeting, share sheet, explore HUD, labels, tree-page sheet | `src/ui/Overlay.jsx` | done |
| glTF pipeline (Draco + KTX2 + LOD) | `scripts/assets.mjs` | ready, waiting for models |
| Backend (cards, opens, live feed, OG images) | — | phase E, see v2 spec |

## Deviations from the spec (on purpose)
- **Physics**: a 30-line verlet rope solver (`ropeStep` in `Crowd.jsx`) instead of Rapier. Same behaviour (ornament drops, rope goes taut, swings, settles) without a WebAssembly download, which some sandboxed hosts block. Swap in `@react-three/rapier` rope joints later if we want collisions between ornaments.
- **Assets**: everything is procedural until the bought tree and village kit arrive. Each stand-in lives in one component, so replacing it is a `useGLTF('/models/tree.glb')` inside `Tree.jsx` (keep `BRANCHES`/`shared.hooks` so hook positions stay identical) and the same for `Village`.
- **Lighting**: no baked lightmaps yet; the dark→lit change is driven by `litLevel()` (windows, lamps, garlands, tree lights, environment intensity).

## Swapping in bought models
1. Export from Blender as `.glb` into `assets/raw/` (Y-up, metres, ornament origin at the hook, props at the base).
2. `npm run assets` → `public/models/*.glb` (+ `.lod1.glb`), with a size report against the budget.
3. Serve the Draco and Basis decoders from our own domain: copy `node_modules/three/examples/jsm/libs/draco/` and `.../basis/` to `public/decoders/`, then `useGLTF.setDecoderPath('/decoders/draco/')`.
4. Tree: keep hook positions from `BRANCHES` (or export empties named `hook_###` from Blender and read them instead).

## Database (Supabase)
1. Vercel → giving-tree project → **Storage** → Create → **Supabase**, region **London (eu-west-2)**. This adds `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` to the project.
2. Supabase → **SQL Editor** → paste and run `supabase/migrations/0001_giving_tree.sql`.
3. Supabase → Database → Extensions → enable **pg_cron**, then run `0002_purge_schedule.sql` (deletes wishes and emails on 1 Feb).
4. Vercel → Settings → Environment Variables: add `DEVICE_SALT` (a long random string) and `PUBLIC_BASE_URL`. Redeploy.
5. Go live: once the charity agreement is signed, run `update brands set agreement_signed_at = now(), status = 'live' where slug = 'mosaicads';`

API (Vercel functions in `api/`): `POST /api/cards` · `POST /api/open` · `GET /api/tree?brand=` · `POST /api/wishes` · `GET /api/me?token=` · `POST /api/reminder`. All counting rules live in the database function `record_open` (tested: own device, once per phone, bots, cap, tree must be live).
