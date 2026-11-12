# Contract: API changes

Adds to [spec 002's API](../../002-production-launch/contracts/api.md). Paths are under `/api/`. Errors are `{ "error": "<code>" }`.

## New

| Method & path | Body | 200 response | Errors |
|---|---|---|---|
| `POST tree` | `{ name }` (1 to 40 characters) | `{ slug, name }` | 400 `bad_name`; 429 `slow_down` (2 a day per device); 410 `frozen` |
| `POST tree/{slug}/report` | none | `{ ok: true }` (the same answer whether or not it was already reported) | 404 `no_tree` |
| `POST sent` | `{ tree, from, to, text }` | `{ token }`; never echoes the words or whether it was flagged | 400 `bad_name`, `bad_wish`; 404 `no_tree`; 429 `slow_down`; 410 `frozen` |
| `GET sent/{token}` | | `{ from, to, tree: { slug, name, … }, claimed, mine, canClaimHere }`. `mine` is true for the sender's device; `canClaimHere` is true when this device's token was passed and it has a branch on that tree. Never the words | 404 `no_wish` (also for a rejected wish) |
| `POST sent/{token}/claim` | `{ me }` (the claimer's own Christmas token) | `{ ok: true }` | 404 `no_wish`, `no_link`; 409 `claimed`, `already`; 400 `own_wish`, `wrong_tree` |

## Changed

| Method & path | Change |
|---|---|
| `POST card` | Optional `sent: token`. After the card is saved the wish is claimed for it; a failed claim does not fail the card and is reported as `sent: "claimed"` (or the other code) in the response |
| `GET health` | `testMode` is always `false` on a deployed copy |
| `demo/*`, `x-gt-clock`, `x-gt-device` | Exist only on the local dev server |
| `GET preview/*` | Removed; replaced by the page routes in [pages.md](./pages.md) |
| `POST admin/trees/{slug}/takedown` | New operator route: unpublishes a tree. `GET admin/trees` includes report counts |
