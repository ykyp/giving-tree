# Data Model: A real home page, trees people create, and sending a wish

**Date**: 2026-11-12 · **Plan**: [plan.md](./plan.md) · Adds `supabase/migrations/0004_home_trees_sent_wishes.sql` to the schema in `0001` to `0003`.

## Changed: trees

| Column | Type | Rules |
|---|---|---|
| created_by | text, nullable | Salted device hash of the creator; null for the shared tree and operator-made trees |
| taken_down_at | bigint, nullable | Set when an operator or three reports take it down; `published` becomes false |

The slug check stays `^[a-z0-9-]{3,30}$`. Created slugs are "name of up to 24 characters, a hyphen, 5 random characters".

## New: sent_wishes

A wish for someone who has no ornament yet. Deleted on 1 February 2027 with all wishes (`purge_personal` is extended).

| Column | Type | Rules |
|---|---|---|
| token | text, primary key | 24 random characters; the private link `/w/{token}` |
| tree | text → trees | The tree it leads to |
| from_name | text | "1 to 12 characters" |
| to_name | text | "1 to 12 characters" |
| body | text | "1 to 140 characters" |
| device | text | Sender's device hash; a sender cannot claim their own |
| status | text | `ok`, `review`, `rejected` (same filter as wishes) |
| at | bigint | When sent |
| claimed_by | text → cards, nullable | The card that kept it |
| claimed_at | bigint, nullable | |

Row-level security on, no policies, like every table.

## New: tree_reports

`(tree text → trees, device text, at bigint, primary key (tree, device))`. One report per device per tree.

## New function: claim_sent_wish(token, card, at)

In one step: lock the sent wish; refuse if missing (`no_wish`), already claimed (`claimed`), sent from the claimer's own device (`own_wish`), or for a different tree than the card's (`wrong_tree`); insert into `wishes` (`card_id` = the card, `from_name`, `body`, `kind` = `friend`, `device` = the sender's, `status` = the sent wish's status, `at` = when it was sent); set `claimed_by` and `claimed_at`. Returns the new wish's id.

If the sender has already left this person an ordinary wish from the same device, the unique rule "one wish per device per card" would refuse the insert; the function then reports `already` and leaves the sent wish unclaimed.

## Repository additions (both implementations)

```text
createTree({ slug, name, published, createdBy })      (createdBy is new)
reportTree(slug, device, at)      → number of reports
takeDownTree(slug, at)
sendWish({ tree, from, to, text, device, status, at })  → { token }
getSentWish(token)                → { token, tree, from, to, status, claimedBy } | null   (never the words)
claimSentWish(token, cardId, at)  → { wishId } | 'no_wish' | 'claimed' | 'own_wish' | 'wrong_tree' | 'already'
```

## On the device

`gt3-mine` (one entry per tree the device has hung on) gains `treeName`. Nothing else is stored.

## States

```text
tree:        published ──(operator, or 3 reports)──► taken down
sent wish:   sent ──(first claim)──► claimed (now an ordinary wish)
             sent ──(1 February 2027)──► deleted
```
