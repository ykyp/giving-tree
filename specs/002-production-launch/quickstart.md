# Quickstart: proving the production launch

**Plan**: [plan.md](./plan.md) · API: [contracts/api.md](./contracts/api.md) · Ops: [contracts/ops.md](./contracts/ops.md)

## Prerequisites

- Node.js 22+, `npm ci`
- For the database checks: the Supabase CLI and Docker (`supabase start`), or a testing Supabase project
- Two phones, or two browser profiles

## 1. Rules (automated)

```bash
npm test
```

Expected: every suite from spec 001 passes on the in-memory repository, plus: giving off returns `reason: "off"` and no money wording in any text response; a card belongs to one tree; an invitation stays on the inviter's tree; a new tree has giving off; giving cannot go live without every setting and a signed agreement; rate limits accept at most 10 of 100 rapid attempts.

```bash
npm run test:db
```

Expected: the same suites pass against Postgres.

## 2. The public build has nothing but the card

```bash
npm run build
```

```bash
grep -c "Pretend it's\|Reset this phone\|SAMPLE\|Larkfield\|MosaicAds" dist/app.js
```

Expected: `0`. Then `npx vite preview`, open http://localhost:4173 at a phone size and at desktop size:

| Check | Expected |
|---|---|
| Phone size | The card fills the screen; no frame, panel or notes |
| Desktop size | The card centred at phone width on a plain background |
| Opening screen | "The Giving Tree" and a neutral mark; no "presents", no MosaicAds |

## 3. Wishes first (giving off, the default)

On the testing deployment, as two people, go through both visits (use the date control for 25 December). Read every screen, the share messages, the link previews and the calendar entry.

| Check | Expected |
|---|---|
| Opening a friend's card | Their ornament and "Hang yours next to {name}'s"; no gift line |
| Greeting | No "gives 10p" note |
| Christmas summary | "{N} ornaments on your branch · {M} wishes shared"; no amount |
| Thank-you message | "Opened your wish, thank you! Open yours →" with no amount |
| Tree details and keepsake | Counts and names only |
| Anywhere | No "£", "charity", "pot", "sponsor" or "MosaicAds" |

## 4. Real data only

Start from an empty testing database.

| Step | Expected |
|---|---|
| Open `/` | An empty tree and "Be the first to hang an ornament" |
| Hang from phone A, keep the tree open on phone B | B sees A's ornament arrive within 10 seconds |
| Tap A's ornament on B | A's name and when it was hung |
| Hang 130 ornaments by script | The tree shows your branch plus the latest; the count reads 131 |

## 5. Trees

| Step | Expected |
|---|---|
| In `/ops`, create the tree `georgiou` named "The Georgiou family" | `/t/georgiou` opens it, empty, with that name |
| Hang there, then open `/` | The ornament is not on the global tree |
| Open that card's invitation on another phone | The invited person hangs on `/t/georgiou` |
| Open `/t/nope` | A friendly note, then the global tree |

## 6. Optional giving

In `/ops` on the testing deployment, switch giving on for a test tree with a 30p pot at 10p, with sponsor and charity details and the agreement ticked.

| Step | Expected |
|---|---|
| Try to set it live with the charity number missing | Refused: `incomplete` |
| Open a card from three new phones | Three gifts, each named with sponsor and charity; total 30p |
| A fourth | "The pot is complete: thank you" |
| Sum of the gift record | 30p, equal to the total shown |
| Switch giving off | All money wording disappears; the record is still there in `/ops` |

## 7. Trust, sharing, resilience

| Check | Expected |
|---|---|
| From the first screen, find "About and privacy" | Two taps or fewer; lists operator, contact, what is stored, deletion on 1 February 2027, device memory, adults only |
| "Remove my ornament" from your Christmas link | The ornament leaves the tree; the link shows it was removed |
| Paste `/`, a card link and a thank-you link into three messaging apps | Title, description and image each time; no private link |
| Browser tab and home-screen icon | "The Giving Tree" and its mark |
| Disable WebGL and open a card link | The simple version: name, hang, wish |
| Throttle to slow 4G | Opening screen within 2 seconds |
| Go offline, then seal a wish | "That didn't send" with retry; nothing shown as sealed |
| Reduced motion on | No long flights or drift |

## 8. Operating it

| Check | Expected |
|---|---|
| Open `/ops` signed out, or with an address not on the list | No access |
| Approve one flagged wish, reject another | Under 30 seconds each; reader sees only the approved one |
| Hide an ornament | Gone from the tree and the keepsake |
| Measures for a tree | Every measure from spec 001 |
| Run 100 card attempts in a minute from one device | At most 10 accepted |
| `cron/ops` with a wish waiting 25 hours | A message arrives at the webhook |

## 9. Go live

1. Production Supabase project created; migrations 0001 to 0005 applied; one `global` tree; nothing else.
2. Vercel production variables set as in [contracts/ops.md](./contracts/ops.md); `TEST_MODE` absent.
3. Neutral domain attached.
4. Deploy, then on the public address: `/api/health` says `ok` with `testMode: false`; sections 2, 3 and 7 pass; a first real ornament appears.
