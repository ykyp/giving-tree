# Contract: the public API after this change

The API from [spec 001](../../001-two-visit-december/contracts/api.md) stays, with the differences below. Paths are under `/api/`. Errors are `{ "error": "<code>" }`.

Test mode only (`TEST_MODE=1` on the server, never in production): the `x-gt-clock` and `x-gt-device` headers and the `demo/*` routes.

## Changed

| Method & path | Change |
|---|---|
| `GET health` | Returns `{ ok, email, testMode }`. 503 `no_store` when the database is not configured |
| `GET tree/{slug}` | Was totals only. Now `{ tree: { slug, name, kind, giving }, counts: { ornaments, wishes }, ornaments[], cursor }`. `giving` is `null` unless the tree has giving on; then `{ sponsor, charity: { name, reg }, perGift, cap, given, status, starts, ends }`. `?since={cursor}` returns only newer ornaments. Cached for 5 seconds. 404 `no_tree` when the tree is missing or unpublished |
| `POST card` | Body `{ tree, name, design, hook, parent? }` (`tree` replaces `brand`). New errors: 404 `no_tree`, 429 `slow_down` |
| `GET card/{id}` | Adds `tree` (the card's own tree, with `giving` as above). Never includes money fields when `giving` is null |
| `POST open` | With giving off returns `{ counted: false, reason: "off" }` and records the open for the measures. With giving on: as spec 001, plus reason `paused` |
| `POST wish` | New error 429 `slow_down` |
| `GET me/{token}` | `stats` is `{ ornaments, wishes, opened }`, plus `given` only when the tree has giving on. `tree` is the object above |
| `GET keepsake/{slug}` | `{ name, ornaments, wishes, names[] }`, plus `given` and `charity` only when the tree had giving on |
| `GET preview/{id}` (bots) | Titles and descriptions come from `shared/copy.js`; no money wording with giving off. Image falls back to `/og.jpg` |
| `GET img/{id}/{kind}` | Redirects to the image in Storage |

## New

| Method & path | Body | 200 response | Errors |
|---|---|---|---|
| `POST removal` | `{ token }` (the person's own Christmas link) | `{ ok: true }`: the ornament is hidden and its wishes deleted | 404 `no_link` |
| `POST log` | `{ message, screen, build }` (trimmed to 500 characters; rejected if it looks like a token) | `{ ok: true }` | 429 `slow_down` |

## Page routes

| Path | Shows |
|---|---|
| `/` | The global tree |
| `/t/{slug}` | A community tree; an unknown slug shows a friendly note and the global tree |
| `/c/{id}`, `/me/{token}` | As spec 001, on the card's own tree |
| `/about` | "About and privacy" |
| `/ops` | The operator screen (see [ops.md](./ops.md)) |

## Copy rules (enforced by tests)

With `giving: null`, none of these may appear in any API text response (`preview`, `ics`) or in the strings of `shared/copy.js` used by the page: "£", "pence", "p to", "gives", "gave", "pot", "charity", "donat", "sponsor", "MosaicAds".
