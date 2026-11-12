# Contract: operating the Giving Tree

## Signing in

`/ops` asks for an email address and sends a sign-in link (Supabase Auth). Only addresses in the `operators` table get past the sign-in. The page then calls `admin/*` routes with the session token; the Function checks the session and the table on every call. 401 `nope` otherwise. The shared `ADMIN_SECRET` from spec 001 is no longer used.

## Operator routes (`/api/admin/…`)

| Method & path | Body / query | 200 response |
|---|---|---|
| `GET trees` | | Every tree with its measures and giving settings |
| `POST trees` | `{ slug, name, published }` | The tree. 400 `bad_name`, 409 `taken`. Giving is off |
| `POST trees/{slug}/giving` | `{ enabled, sponsor, charityName, charityReg, perGift, cap, starts, ends, agreementSigned, status }` | The tree. 400 `incomplete` if `status: "live"` without every field and a signed agreement |
| `GET review` | | Wishes with `status = review`, oldest first, with text |
| `POST review/{wishId}` | `{ action: approve or reject }` | `{ status }` |
| `POST cards/{id}/hide` | `{ hidden: true or false }` | `{ moderation }` |
| `POST cards/{id}/remove` | `{ note }` | Hides the card, deletes its wishes, records a removal request |
| `GET measures?tree={slug}` | | The measures in spec 001 FR-038, per visit and in total |

## Cron (Vercel)

| Schedule (UTC) | Path | Does |
|---|---|---|
| `0 8 * * *` | `cron/ops` | Posts to `OPS_WEBHOOK_URL` if wishes have waited over 24 hours, and (giving on) if a pot passed 90% or 100% since yesterday; deletes old `limits` rows |
| `0 9 25 12 *` | `cron/email` | Sends reminder emails, only if email reminders are on |

Both need `Authorization: Bearer $CRON_SECRET`.

## Configuration

| Name | Where | Purpose |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | Set by the Supabase integration | Database (service key: server only). The anon key is used only by `/ops` sign-in |
| `DEVICE_SALT` | Production and testing, different values | Salts the device hash |
| `PUBLIC_ORIGIN` | Both | The site's own address |
| `CRON_SECRET` | Both | Cron access |
| `OPS_WEBHOOK_URL` | Production | Where operator notifications go |
| `TEST_MODE`, `VITE_TEST_MODE` | **Testing deployment only** | Fake date and device, demo panel, `demo/*` routes |
| `EMAIL_REMINDERS`, `RESEND_API_KEY`, `EMAIL_FROM` | Off at launch | Reminder emails |

Removed: `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `UPSTASH_REDIS_REST_*`, `ADMIN_SECRET`.

## Two deployments

| | Production | Testing |
|---|---|---|
| Address | The neutral public domain | A Vercel preview address, access-protected |
| Database | Production Supabase project, starts empty with the `global` tree | A separate Supabase project (or branch) with `supabase/seed-test.sql` |
| Test controls | Not in the bundle | On |
