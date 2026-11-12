# Contract: operations (reviewers, metrics, cron) and configuration

Admin paths need `Authorization: Bearer $ADMIN_SECRET`; the cron path needs `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this). All return 401 `nope` otherwise.

## Reviewing wishes (FR-029)

| Method & path | Body / query | 200 response |
|---|---|---|
| `GET admin/review` | | `{ wishes[] }`: every wish with `status = review` (flagged or reported), with its text |
| `POST admin/review/{wid}` | `{ action: approve or reject }` | `{ status }`: `ok` makes it visible to its reader; `rejected` hides it for good |

Example:

```bash
curl -s -H "Authorization: Bearer $ADMIN_SECRET" https://<host>/api/admin/review
```

## Metrics (FR-038)

`GET admin/metrics?brand={slug}` returns `{ cards, wishes, self_wishes, opens_v1, opens_v2, share_v1, share_v2, saved_calendar, saved_selfsend, saved_email, returns, given, opened, cap, complete }`. Derived measures are listed in [data-model.md](../data-model.md#metrics-per-brand).

## Cron

| Schedule (UTC) | Path | Does |
|---|---|---|
| `0 9 25 12 *` | `GET cron/email` | Sends one reminder to each stored address not yet sent; returns `{ sent }`. Does nothing while email is switched off. |

## Configuration (Vercel environment variables)

| Name | Needed | Purpose |
|---|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) | Yes | Store; set automatically by the Upstash Marketplace integration |
| `ADMIN_SECRET` | Yes | Reviewer and metrics access |
| `CRON_SECRET` | Yes | Lets the email cron run |
| `PUBLIC_ORIGIN` | Recommended | Origin used in calendar files, emails and previews (for example `https://christmas.mosaicads.ai`) |
| `EMAIL_REMINDERS` | No (off at launch) | `on` shows the email option (R8, G1) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Only with email on | Email provider |
