# Reviewing wishes and reading the numbers

For the MosaicAds team during the campaign (1 December 2026 to 31 January 2027). There is no dashboard yet: reviewing is done with three commands from a terminal.

## What needs reviewing

A wish is held back, and its reader can't see it, when either:

- the filter flagged it when it was written (profanity, a web address, an email address or a phone number), or
- its reader pressed **Report** after opening it.

The writer is never told. They see the same "sealed" confirmation either way.

Wishes are sealed until 25 December, so flagged wishes written before then only need a decision by Christmas Eve. From 25 December, reported wishes arrive as people read them; check at least twice a day until 31 December.

## Before you start

You need the site's address and the admin secret (`ADMIN_SECRET` in the Vercel project settings). In your terminal:

```bash
export TREE=https://christmas.mosaicads.ai
```

```bash
export ADMIN_SECRET='paste the secret here'
```

Don't put the secret in a shared document or a chat message.

## 1. See what is waiting

```bash
curl -s -H "Authorization: Bearer $ADMIN_SECRET" "$TREE/api/admin/review" | python3 -m json.tool
```

Each wish looks like this:

```json
{
  "id": "k3Fq8ZpLm2Xa",
  "to": "hhSrpeixZ",
  "from": "Tom",
  "text": "call me www.example.com",
  "kind": "friend",
  "status": "review",
  "reported": true
}
```

`reported: true` means the reader reported it. Without it, the filter flagged it.

## 2. Decide

Approve a wish that is fine (for example, the filter caught an innocent word). Its reader will see it, or see it again:

```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_SECRET" -H "content-type: application/json" -d '{"action":"approve"}' "$TREE/api/admin/review/WISH_ID"
```

Reject a wish that shouldn't be delivered. It stays hidden for good:

```bash
curl -s -X POST -H "Authorization: Bearer $ADMIN_SECRET" -H "content-type: application/json" -d '{"action":"reject"}' "$TREE/api/admin/review/WISH_ID"
```

Replace `WISH_ID` with the wish's `id`. The reply is `{"status":"ok"}` for approve or `{"status":"rejected"}` for reject.

### What to reject

- Abuse, threats, harassment or sexual content.
- Anything trying to move the conversation elsewhere: web addresses, phone numbers, email or social handles.
- Advertising.

When unsure about a **reported** wish, reject it: the reader asked not to see it. When unsure about a **flagged** wish that reads as a kind message, approve it.

If a wish suggests someone is at risk of harm, tell the campaign owner straight away as well as rejecting it.

## 3. Read the numbers

```bash
curl -s -H "Authorization: Bearer $ADMIN_SECRET" "$TREE/api/admin/metrics?brand=mosaicads" | python3 -m json.tool
```

Use the brand's short name (`mosaicads`, `larkfield`, `fernfield`). What comes back, and how to read it:

| Field | Meaning |
|---|---|
| `cards` | Ornaments hung |
| `wishes`, `self_wishes` | Wishes sealed for someone else, and for oneself |
| `opens_v1`, `opens_v2` | Gifts released before and from 25 December |
| `share_v1`, `share_v2` | Invitations and thank-you cards sent |
| `saved_calendar`, `saved_selfsend`, `saved_email` | Christmas links saved, by method |
| `returns` | People who came back to their Christmas link from 25 December |
| `given`, `cap`, `complete` | Pence given so far, the pot, and whether it is full |

The measures in the product document:

| Measure | Work it out as |
|---|---|
| Wishes sealed per sender | `wishes` ÷ `cards` |
| Opens per sent card, visit 1 and visit 2 | `opens_v1` ÷ `share_v1`, and `opens_v2` ÷ `share_v2` |
| Christmas link saved | (`saved_calendar` + `saved_selfsend` + `saved_email`) ÷ `cards` |
| Return rate | `returns` ÷ `cards` |
| Thank-you cards per returner | `share_v2` ÷ `returns` |

If the share of links saved is under 25% by 10 December, the plan is to switch on email reminders (set `EMAIL_REMINDERS=on` in Vercel, with the email provider settings).

## What happens to the data

Every wish, including the ones in the review list, is deleted automatically on 1 February 2027. Rejected wishes are not kept anywhere else.
