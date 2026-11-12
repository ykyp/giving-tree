# Quickstart: proving the two visits work

**Plan**: [plan.md](./plan.md) · API: [contracts/api.md](./contracts/api.md) · Ops: [contracts/ops.md](./contracts/ops.md)

## Prerequisites

- Node.js 22+, then `npm ci`
- A browser with WebGL2. Phone checks need iOS Safari 16+ and Android Chrome on the same network.

## 1. Server rules (automated)

```bash
npm test
```

Expected: every suite passes. They cover own-device, bot, repeat and cap counting; the sealed wish never echoing its words; one wish per device; the time lock across time zones and with a faked device clock; reports hiding a wish; the freeze; deletion on 1 February; and dev-only routes being closed in production. (Until gap G3 is done, the same checks live in the build session's scratch script.)

## 2. Run locally

```bash
npm run dev
```

Open http://localhost:5173. The left panel's **Pretend it's** menu fakes the date for both the page and the server; **A friend hangs and wishes** adds a wish from a made-up friend; **Reset this phone** makes the browser a new device. Data is kept in `.data/store.json`; delete it to start over.

## 3. Visit 1 (Pretend it's: 5 Dec)

| Step | Expected |
|---|---|
| Tap through the fly-in and light the tree; pick an ornament; type a name; drag it onto a hook (also try Auto-hang) | Ornament swings and settles; nearby hooks glow as empty |
| Seal a wish for yourself | Parcel tagged "To You", "Sealed until Christmas morning" |
| Tap the star; on the greeting, Invite people to your branch | Preview shows your ornament and "0 wishes waiting"; message matches FR-006 |
| Close the share sheet | Save your Christmas link appears: Add to calendar downloads an event for 25 Dec 09:00; Send it to myself opens the share sheet; **no email field** (FR-022) |

## 4. The invited person (still 5 Dec)

Copy your link (`/c/{id}`), click **Reset this phone**, then open the link.

| Step | Expected |
|---|---|
| Open the gift | "Opening {name}'s card just gave 10p…" |
| Hang yours next to theirs | Only hooks on their branch glow |
| Leave a wish (try 141 characters, then a valid one) | Counter stops at 140; parcel "To {name}, from {you}" |
| Open the same link again | Goes straight to your own branch (you have already wished). If you chose Not now earlier, it offers "Leave {name} a wish" instead |
| Write a wish containing `www.example.com` from a third device | Same sealed confirmation; it doesn't appear to the reader |

## 5. Back before Christmas

Switch back to the first device (restore its `gt-dev-device` and `gt3-mine` values from before the reset, or start again on one device and use **A friend hangs and wishes**). Open `/me/{token}`, or `/c/{id}` on the same device.

Expected: tags with each writer's name and "N wishes waiting · opens 25 December". In the network panel, the `me/` response has no `text` field.

## 6. Christmas morning (Pretend it's: 25 Dec)

| Step | Expected |
|---|---|
| Open `/me/{token}` | Bells (after the first tap), presents under the trees, about a 5-second flight to your branch; no brand greeting (FR-036) |
| Open each parcel by tapping it in the scene, then with its button | Untie-and-lift, one chime, wish text and name; screen reader reads the text |
| Report one | It disappears and the toast confirms; `admin/review` lists it |
| See what your branch gave | Exact ornaments, cards opened, amount; whole-tree total |
| Send a thank-you card | Message "Opened your wish, thank you! Our branch gave £…" |
| Open your own wish | Shown last, signed "You, in December" |
| Open your thank-you link on a device that left you a wish | Goes to that person's own branch with "{name} says thank you" |

## 7. Finale, late arrival and keepsake

| Pretend it's | Expected |
|---|---|
| 27 Dec, as a new device at `/` | No self-wish step; a friend's wish opens immediately |
| 31 Dec · fireworks | Fireworks over the church; the thank-you says "Happy New Year from our branch" |
| Midnight, New Year | Tree lights pulse |
| 2 Jan · keepsake | "The 2026 Giving Tree", final total, every name; no way to hang |

## 8. Performance (gap G6)

With the browser pane visible, on 5 Dec then 25 Dec, read the frame rate on a mid-tier phone (or the Quality: Mid setting). Expected: 45+ fps on mid, 30+ on low, on both dates.

## 9. On Vercel (gaps G4, G5)

After provisioning the store and setting the variables in [contracts/ops.md](./contracts/ops.md), deploy a preview and check:

```bash
curl -s https://<preview-host>/api/health
```

```bash
curl -s -A "WhatsApp/2.23" https://<preview-host>/c/<id> | grep og:
```

Expected: `{"ok":true,...}`, then Open Graph tags with no token. A normal browser on `/c/<id>` and `/me/<token>` loads the app; `/me/…` responses carry `X-Robots-Tag: noindex`.

## Results

### 2026-11-12, desktop browser (pane visible), dev server, date set to 5 Dec

| Section | Result |
|---|---|
| 1. Server rules | Pass: `npm test`, 26 of 26 |
| 3. Visit 1 | Pass. Hand-drag snapped to the hook aimed at; self-wish sealed; branch name saved (28-character limit, blocked name refused); invitation message as specified; save step shows Add to calendar and Send it to myself, no email field; calendar file has 25 Dec 09:00 and the private link |
| 4. Invited person | Pass. Gift line shown; a drop on a hook outside the branch was refused, a drop on the branch attached; wish sealed with "To Eleni, from Tom"; a device with its own branch wished a different sender without a second ornament; a wish with a web address got the same confirmation and stayed hidden |
| 5. Back before Christmas | Pass. Tags "You, Tom, Ana", "2 wishes waiting · opens 25 December", 3 ornaments; the `me/` response had no `text`; the original card link went to the branch |

Fixed during this run:

- An invited person who chose Not now could never leave the wish later, because their link went to their own branch. The link now skips ahead only once they have wished (`src/store.js`, `openCard`).
- The parcel pile covered the ornament's name; the pile now sits lower (`src/three/Branch.jsx`, `src/three/CameraRig.jsx`).

### 2026-11-12, second run: sections 6 to 8, desktop browser (pane visible), Apple M1 Pro

| Section | Result |
|---|---|
| 6. Christmas morning | Pass. Flight to the branch took about 5 seconds and skips on a tap; no brand greeting; a tap on a parcel in the 3D scene opened the wish; Report hid a wish at once; summary showed 3 ornaments, 2 cards opened, £0.20 and the tree total; thank-you message as specified; own wish shown last with no Report button; the thank-you link took a wisher to their own branch and gave a new device the gift and the offer to hang |
| 7. Late arrival (27 Dec) | Pass. No self-wish step; invitation without "for Christmas morning"; a friend's wish opened at once |
| 7. Fireworks, midnight, keepsake | Pass after fixes. Fireworks visible from the tree view; lights pulse between 0.3 and 2.2 times normal at midnight; keepsake shows the title, final total and names |
| Crowded branch and full pot | Pass. 112 wishes: counts exact (113 ornaments, 112 cards opened, £11.20), "The pot is complete: thank you." shown, an extra open refused with `cap` |
| 8. Performance | 120 fps (the display's limit) on High, Mid and Low on 5 Dec and 25 Dec, in walk, tree and branch views. This machine is far faster than a phone, so the mid-tier phone measurement is still needed |

Fixed during this run:

- Fireworks were too small to see and outside a phone's narrow view; they are now larger, with a ring of sixteen bursts round the square as well as the six over the church (`src/three/Season.jsx`).
- The tree view's default camera sat inside the arch garland, filling the screen with green; it now starts clear of the arch (`src/three/CameraRig.jsx`). This also affected the keepsake page.
- After Christmas the invited screen still said "leave them a wish for Christmas morning" and "N wishes waiting" (`src/ui/Wishes.jsx`, `Meet`).
- Someone with many wishes had to open every one to reach the summary; "Save the rest for later" now skips ahead, and the back button returns to the parcels (`src/ui/Wishes.jsx`, `Parcels`).
- The thank-you card and its link preview now use the branch name when there is one (`src/ui/Wishes.jsx`, `server/app.js`); a long list of names scrolls (`page.css`).
- The faded-out brand splash was still readable by screen readers; it is now hidden once gone (`page.css`).
- The demo's made-up friend could push the sample pot past its cap; it now obeys the cap (`server/app.js`).
- A big pile of parcels sits lower so it doesn't cover the ornament (`src/three/Branch.jsx`).

Known and left: firework colours wash out towards white through the bloom effect.

Not yet run: real iOS Safari and Android Chrome (T013), opening the calendar file on a phone (T011), frame rate on a mid-tier phone (T017), a real screen reader (T020), section 9 on Vercel.
