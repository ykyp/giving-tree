# Contract: the public JSON API

All paths are under `/api/`. Requests and responses are JSON unless noted. Errors are `{ "error": "<code>" }` with the HTTP status shown. Every response may set the device cookie `gt_d` (HttpOnly, Secure, SameSite=Lax). Entities are defined in [data-model.md](../data-model.md).

Dev and demo only (when the server runs with `devClock`): request headers `x-gt-clock` (ISO time, fakes "now") and `x-gt-device` (fakes the device). Production ignores both.

## Tree

| Method & path | Body / query | 200 response | Errors |
|---|---|---|---|
| `GET health` | | `{ ok, email, devClock }` | 503 `no_store` when production has no store |
| `GET tree/{brand}` | | `{ given, opened, cap, complete }` (pence, exact) | 400 `unknown_brand` |
| `GET keepsake/{brand}` | | `{ given, opened, cap, complete, names[] }` | 400 `unknown_brand` |

## Cards (visit 1)

| Method & path | Body / query | 200 response | Errors |
|---|---|---|---|
| `POST card` | `{ brand, name, design, hook, parent? }` | `{ id, token, name, design, hook, parent, brand }` | 400 `bad_name`, `bad_card`, `wrong_tree`; 404 `no_card` (parent); 410 `frozen` |
| `GET card/{id}` | | `{ id, name, design, hook, brand, branch: { name, kids[] }, waiting, left, own }`, with no token | 404 `no_card` |
| `POST open` | `{ id }` | `{ counted: true, tree }` or `{ counted: false, reason }`, where reason is `own`, `again`, `bot`, `cap` or `closed` | 404 `no_card` |
| `POST wish` | `{ to, from, text }` | `{ sealed: true }`, identical whether flagged or not | 400 `own_card`, `bad_name`, `bad_wish`; 409 `already`; 410 `frozen` |

## Your branch (private, by token)

| Method & path | Body / query | 200 response | Errors |
|---|---|---|---|
| `GET me/{token}` | `?day=YYYY-MM-DD` (reader's local date) | `{ card, branch, released, stats: { ornaments, opened, given }, tree, reminded, wishes[] }`; each wish is `{ id, from, kind, opened }`, plus `text` only when `released` | 404 `no_link` |
| `POST me/{token}/wish` | `{ text }` | `{ sealed: true, id }` (self-wish, once) | 400 `bad_wish`; 409 `already`; 410 `frozen` |
| `POST me/{token}/opened` | `{ id, day }` | `{ ok: true }` | 403 `sealed`; 404 `no_wish` |
| `POST me/{token}/report` | `{ id, day }` | `{ ok: true }` (hidden from now on, queued for review) | 403 `sealed`; 404 `no_wish` |
| `POST me/{token}/branch` | `{ name }` (≤ 28, empty clears it) | `{ name }` | 400 `bad_name` |
| `POST me/{token}/preview` | `{ kind: invite or thanks, jpeg: data URL }` | `{ ok: true }` | 400 `bad_image` |
| `POST me/{token}/reminder` | `{ email, news }` | `{ ok: true }` | 404 `email_off` (switched off, R8); 400 `bad_email` |
| `GET ics/{token}` | | `text/calendar` file: 25 Dec 09:00 local (floating time), link to `/me/{token}` | 404 `no_link` |

## Measurement

| Method & path | Body | 200 response | Errors |
|---|---|---|---|
| `POST event` | `{ name, brand }`, where name is `share_v1`, `share_v2`, `saved_calendar` or `saved_selfsend` | `{ ok: true }` | 400 `bad_event`, `unknown_brand` |

## Link previews (bots only)

| Method & path | Response |
|---|---|
| `GET /c/{id}` with a preview-bot user agent (rewritten to `preview/{id}`; `?t` for thank-you cards) | `text/html` with Open Graph title, description and image; no token, no wish text |
| `GET img/{id}/{invite or thanks}` | `image/jpeg`, cached for 1 hour; 404 `no_image` |

## Page routes (not API)

| Path | Shows |
|---|---|
| `/` | Hang an ornament (or the keepsake after the freeze) |
| `/c/{id}` | Invited flow; goes to your own branch if this device made the card, was invited by it, or opened a thank-you (`?t=1`) |
| `/me/{token}` | Your branch: parcels before Christmas, the opening from 25 December, the keepsake once wishes are gone |
