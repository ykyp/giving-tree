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

## Results

### 2026-11-12, local dev server and the public build, Apple M1 Pro

| Size (stage) | Result |
|---|---|
| 1440×900 | Pass. Scene 1440×900, no page scroll. Chooser, name entry, wish form and greeting buttons 460 wide and centred. Turn and zoom buttons 330 from the centre. A mouse drag hung the ornament on the hook aimed at. Greeting and star shots show the whole tree. Invitation is a centred 480-wide card. Walk mode: map top right, mode button bottom left |
| 768×1024 | Pass. Scene fills the stage; invitation card 480 wide and centred; the open dialog survived the resize |
| 1024×768 | Pass. Scene fills the stage; greeting buttons 460 wide; the footer takes 35% of the height |
| 375×812 | Pass. Footer padding 18, buttons 339 wide, greeting 46px, invitation a full-width sheet from the bottom: the same values as before the change |
| Public build at 1440×900 and 375×812 | Pass. Stage is exactly the window, no test panel, no page padding or scroll |

Drawing resolution at 1440×900 on a 2x screen: 2158×1349 (capped from 2880×1800).

Not yet run: 1920×1080, a real tablet (rotation was simulated by resizing), real phones, and visit 2 at the wide sizes (it uses the same panels).
