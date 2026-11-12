# Data Model: Production launch of the Giving Tree

**Date**: 2026-11-12 · **Plan**: [plan.md](./plan.md) · Database: PostgreSQL on Supabase. Starts from `supabase/migrations/0001` to `0003` on `origin/main`; this file describes the result after `0004_trees_two_visits.sql` and `0005_functions.sql`.

All tables have row-level security on and no access for the browser's roles. Everything goes through the Function with the service key.

## Tables

### trees (renamed from `brands`)

| Column | Type | Rules |
|---|---|---|
| slug | text, primary key | `global` for the global tree; community slugs are 3 to 30 characters, `a-z 0-9 -` |
| kind | text | `global` or `community`; exactly one `global` row |
| name | text | Shown to visitors; 1 to 40 characters; filtered like other names. The global tree's name is "The Giving Tree" |
| published | boolean, default false | Only published trees are reachable (FR-036) |
| **giving_enabled** | boolean, **default false** | The switch (FR-011) |
| sponsor_name, charity_name, charity_reg | text, nullable | Required before giving can be live |
| per_gift_pence, cap_pence | int, nullable | Required before giving can be live; both > 0 |
| given_pence | int, default 0 | `given_pence <= cap_pence` |
| starts_at, ends_at | date, nullable | Giving window |
| agreement_signed_at | timestamptz, nullable | |
| giving_status | text, default `off` | `off`, `live`, `paused`, `ended`. Constraint: `live` requires `giving_enabled`, a signed agreement and all of sponsor, charity name, registration, amount and pot |
| created_at | timestamptz | |

Seed: one row, `('global', 'global', 'The Giving Tree', published true, giving off)`. No sample trees.

`giving` as returned to the page is null unless `giving_enabled` and `giving_status` is `live`, `paused` or `ended`.

### cards

As in 0001, with these changes:

| Column | Change |
|---|---|
| tree | renamed from `brand`, references `trees(slug)` |
| branch_name | limit lowered from 30 to **28** characters (spec 001, FR-005) |
| hook | `smallint not null` |
| branch_of | must be a card on the same tree (checked in `create_card`) |
| moderation | `ok`, `hidden` (operator hid it or a removal request) |
| removed_at | timestamptz, nullable; set by a removal request, which also deletes its wishes |

`owner_token` (uuid) is the private Christmas link. `creator_device` is the salted hash of the device cookie.

### wishes

| Column | Type | Rules |
|---|---|---|
| id | bigserial | Public id is this number, signed into an opaque string by the Function |
| card_id | text | The ornament the wish is for; cascade delete |
| from_name | text | 1 to 12 characters |
| body | text | **1 to 140 characters** |
| kind | text | `friend` or `self` |
| writer_device | text | Salted hash. Unique index on `(card_id, writer_device)` where `kind = 'friend'` (one wish per device per branch). Unique index on `(card_id)` where `kind = 'self'` |
| status | text | `ok`, `review`, `rejected`. Starts as `review` when the filter flags it |
| reported_at | timestamptz, nullable | Set by the reader's Report; also sets `status = 'review'` |
| opened_at | timestamptz, nullable | Set when the reader opens it after release |
| created_at | timestamptz | |

The column `unlock_at` from 0001 is dropped: release is decided by the rule in `shared/season.js` (server past 24 December 10:00 UTC **and** the reader's local date on or after 25 December), not stored per wish. `flagged` is replaced by `status`.

### opens

As in 0001 (`card_id`, `device_hash`, primary key on both, `counted`, `reason`), with one more reason: `off` (giving not enabled).

### gifts

As in 0001: one row per released gift. Only ever written for a tree with giving live. `sum(amount_pence)` per tree equals `trees.given_pence`.

### reminders

As in 0001. Written only when email reminders are switched on.

### events (new)

`(id bigserial, tree text, name text, at timestamptz)`, where name is one of `share_v1`, `share_v2`, `saved_calendar`, `saved_selfsend`, `saved_email`, `returned`. No device or card. Feeds the measures.

### operators (new)

`(email text primary key, added_at timestamptz)`. A signed-in Supabase Auth user may use the operator routes only if their email is here.

### removal_requests (new)

`(id bigserial, card_id text, requested_at, done_at, note text)`. An audit of FR-020; holds no wish text.

### limits (new)

`(device_hash text, action text, window_start timestamptz, count int, primary key (device_hash, action, window_start))`. Rows older than 2 days are deleted by the daily cron.

## Views

- `public_ornaments`: `id, tree, sender_name, design, hook, branch_of, created_at` from `cards` where `moderation = 'ok'`. (Replaces 0003's "after first gift" rule.)
- `tree_measures`: per tree, the counts behind spec 001 FR-038: cards, wishes, self-wishes, opens before and from 25 December, events by name, cards with a `returned` event, and `given_pence`.

## Functions (0005)

| Function | Does, atomically |
|---|---|
| `create_card(tree, name, design, hook, branch_of, device)` | Checks the tree is published and not frozen, the parent is on the same tree, and the device's daily limit; inserts; returns id and token |
| `leave_wish(card, from_name, body, kind, device, status)` | Inserts; the unique indexes turn a second wish into `already` |
| `record_open(card, device, is_bot)` | From 0001, extended: returns `off` when the tree's giving is not live-capable; otherwise unchanged (own, again, cap, paused, counted with ledger row) |
| `branch_of(card)` | The card, its children and their count, and counted opens |
| `purge_personal()` | Deletes wishes and reminders; scheduled for 1 February 2027 (0002) |

## The repository interface (`server/app.js` depends on this)

```text
getTree(slug)                     → tree with giving settings, or null
listTrees()                       → for the operator screen
latestOrnaments(slug, since, n)   → public ornaments, newest first, with a cursor
createCard({tree, name, design, hook, parent, device})   → card | error code
getCard(id) · getCardByToken(token)
getBranch(cardId)                 → { name, kids[], opened, ornaments }
setBranchName(cardId, name)
leaveWish({to, from, text, kind, device, status})        → wish | 'already'
wishesFor(cardId)                 → every wish for the reader (rules filter status and text)
markOpened(wishId) · reportWish(wishId)
recordOpen({cardId, device, bot}) → { counted, reason, tree totals }
addEvent(tree, name) · measures(tree)
keepsake(tree)                    → totals and names
savePreview(cardId, kind, jpeg) · previewUrl(cardId, kind)
reminders: save, listUnsent, markSent
operator: reviewQueue, decide(wishId, action), hideCard, removeCard, upsertTree, setGiving
limits: hit(device, action, windowSeconds, max) → allowed?
```

`repo-memory.js` implements it over plain maps (with an injectable clock, as `kv-memory.js` has today). `repo-postgres.js` implements it with Supabase queries and the functions above.

## States

```text
tree giving:   off ──(enable + complete settings + signed)──► live ⇄ paused
               live/paused ──► ended        any ──(disable)──► off   (record kept)

wish:          submit ──► ok ──(reader reports)──► review ──► ok | rejected
               (filter flags) ──► review

card:          ok ──(operator hides / removal request)──► hidden
```

## Lifetimes

| Data | Kept until |
|---|---|
| Wishes, reminders, the review queue | Deleted on 1 February 2027 |
| Cards (first name, design, hook), events, measures | Kept for the keepsake |
| Gifts (where giving was on) | Kept permanently as the financial record |
| Limits | 2 days |
| Operator sign-ins | Supabase Auth defaults |
