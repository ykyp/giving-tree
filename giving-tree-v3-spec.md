# The Giving Tree v3: flow fix, bigger world, drag-and-drop ornaments

*MosaicAds · Christmas 2026 · written 8 Nov 2026 · replaces the scene and flow parts of `giving-tree-3d-spec.md` (backend, counting rules, compliance and brand config stay as they are)*

---

## 1. What's wrong today, and the fix

**The bug.** The sender picks and hangs an ornament that says "Your name". Only at the very end does "Add your name & send" open a separate send screen, which feels like starting a new card. The name and the ornament are separate steps, so it's unclear what you're making.

**The fix: one continuous making moment.** You pick the ornament, write your name onto it in the scene, then drag it onto the tree yourself. By the time you hang it, it's already yours. Sending afterwards is just the share sheet: no form, no second name prompt.

---

## 2. User flows

### 2.1 Sender (makes and sends a card)

| # | Beat | What the user does | What they see (camera) | Duration |
|---|---|---|---|---|
| 0 | **Arrival** | Nothing (tap skips) | Splash "{Brand} presents", then a fly-in: start high above snowy rooftops at dusk, glide down a lit lane between houses, under a garland arch with the brand's banner, into the town square. The tree is dark in the middle. | 9–11 s |
| 1 | **Light the tree** | Tap the glowing switch box at the tree's base (or anywhere) | Lights spiral up the tree, then the windows round the square and the lamp posts come on. The camera does a slow half-orbit, low. | 5 s |
| 2 | **Choose an ornament** | Swipe through the ornament box: an open wooden crate at the base of the tree holding 6–8 ornaments on straw, each slowly turning. Tap one to lift it out. | The camera pushes into the crate (close-up). | free |
| 3 | **Write your name** | Type your first name. The keyboard opens over the scene. | Close-up of the ornament. **Letters appear on it as you type** (gold engraving, paint or handwriting, depending on the design), with a small shimmer for each letter. "Done" button. Moderation runs on Done. | free |
| 4 | **Hang it** | **Drag the ornament onto the tree.** Branch hooks near your finger light up; let go near one and it snaps on. | The camera pulls back to mid-tree. While dragging, the camera eases toward where you're dragging. On release the ornament swings on its thread (physics) and settles. Sparkle and chime. | free; an "Auto-hang" button after 8 s |
| 5 | **Star on top** | Tap the star floating at the top (or the prompt) | The camera cranes up the trunk to the top, the star rises and flashes, a soft snow gust passes, then a long pull-back over the square. | 6 s |
| 6 | **Greeting + share** | "Send to someone" opens the native share sheet straight away (the name is already on the ornament); "Copy link"; "Explore the tree" | "Happy Christmas from {name}" lettering in the sky. The camera slowly circles the tree. | — |

The link preview image shows the **sender's own ornament, rendered close-up with their name** (made on the server from the same ornament model).

### 2.2 Recipient (opens a card)

| # | Beat | What they see |
|---|---|---|
| 0 | Arrival | Same fly-in, but the arch banner reads "{Sender} sent you something". |
| 1 | Light the tree | Same. |
| 2 | **Open the gift** | A wrapped box with a name tag, "To you, from {Sender}", sits under the tree. Tap: the ribbon unties (animated), the lid lifts, and the sender's ornament rises out with their name on it. **This is when the gift is counted** (`POST /api/open`). |
| 3 | **Hang it for them** | Drag the sender's ornament onto the tree, same as the sender. The thread swings and settles; the gift line appears: "{Sender}'s card just gave 10p to {charity}". |
| 4 | Star | Same. |
| 5 | Greeting | "Happy Christmas from {Sender}". **"Make your own ornament"** starts the sender flow at beat 2 (no fly-in again, since you're already in the square), so a recipient becomes a sender in one tap. |

### 2.3 Explore (from either flow, and the tree page)
- Drag to walk round the tree, pinch to zoom, double-tap to zoom to a spot.
- Names float over ornaments once you're within about 3 m. Tap an ornament: the camera flies to it and it turns to face you, with a card showing name, design, when, and what it gave.
- "Find my ornament" button: flies to yours (this device's own card or ornament).
- Other people's gifts arrive live: an ornament drops from the sky onto a free hook and swings.

---

## 3. The world (bigger, and a journey into it)

**Layout** (about 120 × 120 m, one continuous scene, no loading between beats):
```
            hills + pine forest (distant billboards)
   ┌──────────────────────────────────────────┐
   │  church spire        market stalls       │
   │      houses ── LANE ── houses            │
   │               │ garland arch             │
   │   lamp  ┌─────┴─────┐  lamp              │
   │  bench  │  SQUARE   │  carousel/skating  │
   │         │   TREE    │  rink (phase 2)    │
   │  houses └───────────┘  houses            │
   └──────────────────────────────────────────┘
```
- **Hero tree**: 9 m tall in the middle of the square, about 140 hooks.
- **Ring 1** (about 25 m): 10–14 houses facing the square with lit windows, wreaths on the doors, snow on the roofs; 4 lamp posts; 2 benches; a fence; 3 market stalls (mulled wine, gifts, sweets) with warm string lights.
- **The lane** (the fly-in path): 60 m long, lined with houses, bunting and lanterns, with the **brand arch** at the square end (brand banner texture from config).
- **Far ring**: church spire, hills, pine-forest billboards, a moon and stars.
- **Life**: falling snow (GPU), chimney smoke (sprites), lit windows that flicker now and then, a slow wind sway on the tree branches (vertex shader), a few birds on rooftops (phase 2).

**Camera**: a **rail system**, as in the Diwali card. Each beat has a named shot. Moves between shots run along a `CatmullRomCurve3` path with eased timing and look-at targets interpolated on their own path. The fly-in is one 10-second spline with about 8 control points (rooftops, down the lane, under the arch, into the square). The camera always has a little hand-held drift (±3 cm, 0.3 Hz). In explore mode, orbit controls are limited (polar 55–95°, distance 3–22 m, no going inside the tree).

---

## 4. Technology

### 4.1 Front end
- **React + React Three Fiber** (`@react-three/fiber`), **drei** (camera helpers, `useGLTF`, `Html` labels, `Environment`, `Sparkles`), **@react-three/postprocessing** (Bloom, SMAA, Vignette; depth of field only on close-ups and only on the high tier).
- **Physics: `@react-three/rapier`.** Use it only where it shows: the ornament being dragged, the one being hung, and newly arriving gifts (each has a rope joint to its hook). Settled ornaments switch to a cheap swing animation run in a shader. Never more than 6 physics bodies at once.
- **State**: Zustand store for flow state, beat and selection. Each beat is a small state machine: `arrival → dark → lighting → choose → engrave → hang → crown → greeting → explore`.
- **Next.js on Cloudflare Pages** (as in the v2 spec). The 3D scene is loaded lazily, with a small loading screen for the brand splash.

### 4.2 Drag and drop (raycasting + physics)
1. **Pick up**: on pointer-down on an ornament (R3F raycast), create a drag plane facing the camera through the ornament's position. The ornament becomes a kinematic body that follows the pointer's hit on that plane, with a little lag (spring).
2. **Find a hook**: every frame, look up the nearest free hook within 0.6 m of the ornament (hooks are stored in a simple spatial grid). The nearest hook glows (a small gold ring); the ornament's thread previews toward it.
3. **Release**:
   - Near a hook: the ornament becomes a dynamic body with a **rope joint** (length 0.18 m) to the hook's static body. It falls a little, swings and settles (linear damping 2, angular damping 3). After 1.5 s still, it switches to shader swing and frees its physics body.
   - Not near a hook: it floats back to where it was picked up.
4. **Edge of screen**: while dragging near the edges, the camera slowly orbits that way so you can reach the side of the tree.
5. **Accessibility**: an "Auto-hang" button (and keyboard Enter) picks the best free hook facing the camera and runs the same animation. No drag needed.
6. **Taps vs drags**: a press that moves less than 8 px is a tap (selects or focuses); more is a drag.

### 4.3 Asset pipeline (glTF/GLB)
- **Make**: Blender, metric scale, Y up, origin at the hang point for ornaments and the base for props.
- **Export**: glTF 2.0 binary (`.glb`), one file per asset group.
- **Compress** with `gltf-transform`: `dedup → prune → weld → simplify (LOD1) → draco (geometry) → ktx2 (UASTC for normal maps, ETC1S for colour)`. Load with drei's `useGLTF` plus the Draco and KTX2 loaders, decoders served from our own domain.
- **Instancing**: houses, lamps, fences and ornaments are drawn once per type (instanced); the tree's needle branches are instanced branch cards.
- **Lighting**: the village is **baked** in Blender (lightmaps as a second UV set) for two states, *dark* and *lit*, and the page crossfades between them when the tree lights up. Only the tree and ornaments get live lighting, plus one environment map for reflections.
- **Asset list and budget** (compressed, sent over the network):

| Asset | Source | Triangles | Size budget |
|---|---|---|---|
| Hero fir tree (trunk + about 6k branch cards, LOD0/LOD1) | Buy a high-quality fir (CGTrader, Fab) and retopologise to branch cards, **or** commission (about £300–600). Licence must allow web use and redistribution in an app. | 60k / 20k | 1.6 MB |
| Ornaments (8 designs × LOD0/1) | Commission or model in-house; engraving area UV-mapped to one band | 2k each | 0.4 MB total |
| Village kit (6 house types, roofs, doors, windows, wreaths, fence, bench, lamp, stall, arch) | CC0 kits (Kenney Holiday Kit / Quaternius) restyled, or a paid stylised-realistic kit | 120k total, instanced | 2.2 MB |
| Gift box with ribbon-untie animation | In-house | 3k | 0.15 MB |
| Environment (hills, forest billboards, sky) | In-house | 10k | 0.5 MB |
| Textures (KTX2) and lightmaps | Baked | — | 2.5 MB |
| Audio (bells bed, chimes, whoosh, sparkle) | Licensed or royalty-free | — | 0.6 MB, streamed |
| **Total, first load** | | **≤ 250k drawn** | **≤ 6 MB** (splash and fly-in start by 3 MB) |

Load order: the splash appears instantly, the lane and arch load first (the fly-in can start), then the square, then the tree, while the fly-in plays. Ornaments and the gift box load in the background.

### 4.4 Names on ornaments
- Every ornament model has an **engraving band UV**. At runtime the name is drawn onto a small `CanvasTexture` (512×128) in the design's style: gold script, painted serif, or handwritten tag. The ornament's material blends it in through a mask (metal shows the engraving as a recessed, brighter gold).
- Live typing animation: each new letter fades in left to right, with a glint sprite moving along the band.
- Fonts: Great Vibes (script), Caveat (hand), Instrument Serif (painted), self-hosted subsets.
- Up to 140 named ornaments share one 2048² atlas (as in the v2 prototype). Only the ornament in focus gets its own high-resolution texture.

### 4.5 Ornament designs (8)
Glass bauble (gold script) · candy stripe (painted band) · ribbed teardrop finial · **mosaic mirror ball (signature)** · gold star (paper tag) · pearl snowflake (paper tag) · **glass icicle drop** (new: clear glass with transmission on the high tier, frosted on low) · **brand bauble** (new: flat-colour bauble with the brand mark on one side and the name on the other; only on brand trees).

### 4.6 Visual quality targets
- Bloom on lights, star, windows and lanterns (threshold 0.85, strength 0.7).
- Tree: two-tone needle texture with alpha, a slight translucent glow from the lights behind, and a wind sway in the vertex shader.
- Ornaments: physical materials (clearcoat, iridescence on the pearl), one environment map from the lit square.
- Snow: about 3k GPU particles near the camera, about 2k far, plus snow-dust gusts on beats 1 and 5.
- Depth of field in close-ups (engraving, hanging), high tier only.

### 4.7 Performance tiers (decided on first frame from GPU and memory, adjusted as it runs)
| Tier | Devices | Pixel ratio | Post-processing | Snow | Physics bodies | Shadows |
|---|---|---|---|---|---|---|
| High | iPhone 13+, recent desktop | 2 | Bloom + SMAA + DoF | 5k | 6 | 1 contact-shadow pass |
| Mid | iPhone 11/12, Pixel 6 | 1.5 | Bloom + SMAA | 3k | 4 | none (baked) |
| Low | older Android | 1 | Bloom (half res) | 1.2k | 2 | none |
| Fallback | no WebGL2 / reduced motion | — | 2D canvas version (existing prototype) | — | — | — |

Targets: 60 fps on High, 45+ on Mid, 30+ on Low; first interactive frame under 3.5 s on 4G (Mid).

---

## 5. Screens and copy (changes from v2)
- **Engrave screen**: input pinned above the keyboard, placeholder "Your first name", hint "This goes on your ornament", "Done". Error: "That name can't go on an ornament. Try your first name."
- **Hang prompt**: "Drag it onto the tree" with a hand animation; after 8 s an "Auto-hang" button appears.
- **Greeting (sender)**: "Send to someone" (share sheet), "Copy link", "Explore the tree". No name form.
- **Greeting (recipient)**: gift line (counted, or one of the three honest "didn't count" lines), "Make your own ornament", "Explore the tree".
- The "Simulated" and "Sample" labels stay until real data is connected.

---

## 6. Build plan (for the coding agent)
| Phase | Dates | Delivers |
|---|---|---|
| A. Skeleton | 9–13 Nov | R3F app, Zustand flow machine, camera rail system with shot editor (debug UI to place shots), placeholder blockout world, new flow end-to-end with simple shapes |
| B. Hero assets | 10–20 Nov (parallel) | Tree source decided and bought or commissioned; 8 ornaments; gift box; glTF pipeline script (`npm run assets`) with size report |
| C. Interaction | 14–20 Nov | Drag and drop with Rapier rope joints, hook glow, auto-hang, engraving with live typing, explore controls and name labels |
| D. World | 18–27 Nov | Village kit dressed, baked lightmaps (dark and lit), fly-in spline, post-processing, tiers |
| E. Wire up | 24–29 Nov | Backend from the v2 spec: cards, opens, live feed, link preview image of each ornament |
| F. Soft launch | 1 Dec | MosaicAds community tree (Giving Tuesday) |
| G. Polish + brand trees | 2–9 Dec | Brand arch, brand bauble, testing on real devices; freeze 6 Dec, launch 10 Dec |

**Risk:** the hero tree and village art are the long pole. If a bought tree can't be ready by 20 Nov, ship with the procedural branch-card tree from the current prototype (already looks good) and swap the model in later. Everything else is unaffected.

## 7. Acceptance tests (additions to v2)
1. The sender is asked for their name **once**, inside the scene, before hanging. The greeting never shows a name form.
2. The name appears on the ornament letter by letter while typing; Done is disabled for empty or blocked names.
3. Dragging works with one finger on iOS Safari and Android Chrome; letting go within 0.6 m of a free hook attaches it; letting go elsewhere returns it; Auto-hang works with the keyboard alone.
4. No more than 6 physics bodies at once; the dropped ornament settles within 2 s.
5. The fly-in plays at 45+ fps on an iPhone 12 and can be skipped with a tap.
6. First load is under 6 MB; the fly-in starts by 3 MB.
7. A recipient's "Make your own ornament" goes straight to choosing an ornament without replaying the fly-in.
8. Reduced motion: the fly-in becomes a crossfade; drag still works; there's no camera shake.

## 8. Decisions needed from you
1. **Tree source**: buy and adapt (cheaper, about a week) or commission (best look, about £300–600, 10 days)?
2. **World style**: realistic (baked, moody) or stylised-realistic, a softer look in the spirit of the Diwali house that's lighter to load? I recommend **stylised-realistic**.
3. **Phase-2 extras**: skating rink, carousel, birds. Yes or later?
4. **Rebuild in React Three Fiber now**, or keep extending the single-file prototype until the assets arrive? I recommend starting R3F now (phase A) and keeping the prototype as the 2D/low-tier fallback.

Sources for tree models checked: CGTrader spruce trees, RenderHub Christmas trees and Fab listings (all paid, licence to confirm for web use); Kenney Holiday Kit and Quaternius (CC0) for the village kit.
