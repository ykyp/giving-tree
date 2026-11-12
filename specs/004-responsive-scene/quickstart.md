# Quickstart: checking the scene at every size

**Plan**: [plan.md](./plan.md)

```bash
npm test
```

```bash
npm run dev
```

Open http://localhost:5173/t/global and set the browser window (or its device toolbar) to each size. In development the test panel takes 340 pixels on the left of wide windows; the sizes below are for the stage, so add 340 to the width or check on a production build (`npm run build`, then `npx vite preview`).

| Size | Stands for |
|---|---|
| 375×812 | Phone |
| 768×1024 | Tablet, upright |
| 1024×768 | Tablet, sideways |
| 1440×900 | Laptop |
| 1920×1080 | Desktop |

At each size, go through visit 1 (light the tree, choose, name, hang, seal, star, greeting, invite, save link) and check:

| Check | Expected |
|---|---|
| Scene | Covers the whole stage; no frame, margin or scroll bar; follows a resize at once |
| Tree shots (lighting, star, greeting) | The whole tree is in view |
| Chooser, name entry, wish form, greeting footer | Phone: full width, as before. Wider: a centred card no wider than 480 pixels |
| Invitation, save-link and opened-wish dialogs | Phone: sheet from the bottom, as before. Wider: a centred card |
| Turn and zoom buttons while hanging | Phone: at the edges. Wider: close to the tree, either side of the centre |
| Dragging the ornament with a mouse (1440×900) | Hooks glow, the ornament snaps on and swings |
| Walk mode | Map top right, mode button bottom left, signs follow the places |
| Rotate a tablet-sized window between upright and sideways mid-visit | Scene and panels adjust; the step is not lost |

Phone regression: at 375×812 compare the greeting, the wish form and the tree sheet with the same screens on `main`. Positions and sizes match.
