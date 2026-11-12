# Data Model: The Giving Tree, two visits in December

**Date**: 2026-11-12 · **Plan**: [plan.md](./plan.md) · Store: key–value (R2). "Expires" means the key is deleted automatically on 1 February 2027 00:00 UTC (R9).

## Entities

### Card (an ornament, and the root of a branch)

Key `card:{id}` → JSON. Never expires (the keepsake needs names).

| Field | Type | Rules |
|-------|------|-------|
| id | string, 9 chars | Random; public (in `/c/{id}` links) |
| token | string, 24 chars | Random, unguessable; private (in `/me/{token}`); never returned by public routes (FR-016) |
| brand | string | One of the configured brand slugs |
| name | string, 1–12 chars | First word only; blocked-name filter (`shared/moderation.js`) |
| design | integer 0–7 | Ornament design |
| hook | integer 0–999 | Hook on the tree where it was hung |
| parent | card id or null | The card whose link it was hung from; same brand only |
| branchName | string ≤ 28 chars or null | Set by the owner; filtered like names (FR-005) |
| device | string | Device cookie of the creator; used for "own card" checks only |
| at | ms timestamp | Created |

Related keys:

- `tok:{token}` → card id (lookup for private links)
- `kids:{id}` → list of child card ids, in order hung (the branch, one level deep)
- `names:{brand}` → list of first names, for the keepsake
- `count:{id}` → counted opens of this card's links (the branch's "cards opened")

Created only before the freeze (1 January 12:00 UTC); otherwise refused with `frozen`.

### Wish

Key `w:{wid}` → JSON. Expires.

| Field | Type | Rules |
|-------|------|-------|
| id | string, 12 chars | Random |
| to | card id | The only card whose token can read it |
| from | string, 1–12 chars | Writer's first name |
| text | string, 1–140 chars | Trimmed; checked when written and when saved (FR-037) |
| kind | `friend` or `self` | |
| status | `ok`, `review` or `rejected` | Starts as `review` if the filter flags it |
| opened | boolean | Set when the reader opens it after release |
| reported | boolean | Set by the reader's Report |
| at | ms timestamp | |

Related keys (all expire):

- `wl:{cardId}` → list of wish ids for that card
- `wd:{cardId}:{device}` → "this device already wished this card" (FR-012)
- `self:{cardId}` → "self-wish already sealed" (one per card)
- `review` → list of wish ids waiting for a reviewer

State changes:

```text
            submit ──► ok ───────────── (reader reports) ──► review
   (filter flags) ──► review ──(approve)──► ok
                      review ──(reject)───► rejected
```

Visibility to the reader: only `status = ok`. `text` is included only after release (R4).

### Open (gift counting)

- `open:{cardId}:{device}` → "1". Set only if absent (first open from that device). Removed again if the pot turns out to be full, so the person sees "pot complete" rather than "already given".
- Not created for the sender's own device, link-preview bots or after the freeze (FR-024).

### Pot (per brand)

- `given:{brand}` → integer pence counted so far. Incremented by the brand's amount per counted open; rolled back if it would pass the cap (FR-025).
- Total shown = counted pence (+ the sample total in dev and demo only). Opened = total ÷ amount per open.

### Reminder (only when email is switched on, R8)

Key `rem:{token}` → `{ email, news, brand, sent }`. Expires. List `reminders` → tokens (expires). `news` defaults to false and is never sent anywhere by this feature.

### Link-preview image

Key `img:{cardId}:{invite|thanks}` → base64 JPEG (up to about 200 KB). Uploaded by the card's owner through their token.

### Metrics (per brand)

Counters `m:{brand}:{name}` for `cards`, `wishes`, `self_wishes`, `opens_v1`, `opens_v2`, `share_v1`, `share_v2`, `saved_calendar`, `saved_selfsend`, `saved_email` and `returns`. Plus `ret:{cardId}` so each returner counts once. The measures in FR-038 are derived as:

| Measure | From |
|---------|------|
| Wishes sealed per sender | wishes ÷ cards |
| Opens per sent card, by visit | opens_v1 ÷ share_v1, opens_v2 ÷ share_v2 |
| Christmas link saved | saved_calendar, saved_selfsend, saved_email |
| Return rate | returns ÷ cards created before 25 Dec |
| Thank-you cards per returner | share_v2 ÷ returns |
| Gifts per visit, total | opens_v1, opens_v2, `given:{brand}` |

## Calendar (shared/season.js)

| Moment | Value | Used for |
|--------|-------|----------|
| Release | 24 Dec 2026 10:00 UTC **and** reader's local date ≥ 25 Dec | Wishes open (FR-013) |
| Village phases (reader's local time) | advent until 24 Dec · christmas 25–31 Dec · nye 31 Dec 18:00 to 1 Jan 01:00 · keepsake after | Scene and copy |
| Midnight pulse | 31 Dec 23:59 to 1 Jan 00:10 local | Tree lights (FR-033) |
| Freeze | 1 Jan 2027 12:00 UTC | No new cards, wishes or gifts (FR-034) |
| Wipe | 1 Feb 2027 00:00 UTC | Wishes, emails, review queue expire (FR-032) |
