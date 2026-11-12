# Quickstart: proving the home page, own trees and sent wishes

**Plan**: [plan.md](./plan.md) · [API](./contracts/api.md) · [Pages](./contracts/pages.md)

## 1. Rules (automated)

```bash
npm test
```

```bash
GT_TEST_DB=postgres://localhost/gt_test npm run test:db
```

Expected, in addition to the existing suites: a visitor creates a tree and gets a name-based address; 20 attempts create at most 2; a sent wish never returns its words, is claimed once, becomes a sealed wish for the claimer, cannot be claimed by its sender or on another tree, and is deleted on 1 February; every page address returns its own title and text with no private data; a handler built the way production builds it refuses every test route even with the old test settings on.

## 2. Home (local: `npm run dev`, then http://localhost:5173)

| Step | Expected |
|---|---|
| Open `/` in a fresh browser profile with the network throttled to slow 4G | Welcome and three choices readable within 2 seconds; the scene has not been downloaded |
| View the page source | The welcome text and the three choices are in the HTML |
| Choose "Hang on the Giving Tree" | Address becomes `/t/global`; the hanging flow starts |
| Go back to `/` after hanging | "Your branches" lists The Giving Tree; tapping it opens your branch |

## 3. Start a tree

| Step | Expected |
|---|---|
| Choose "Start a tree", type "The Georgiou family", create | Address becomes `/t/georgiou-family-…`; the tree is empty and named; under 30 seconds to the hang step |
| Try an empty name, 41 characters, and "Official tree" | Each is refused with a reason |
| Copy the tree's link into a second browser profile and hang there | Both ornaments on that tree; neither on `/t/global` |
| Create three trees in a row | The third is refused: "Slow down a little" |
| "Report this tree" from the second profile | Thanks message; the tree still works |
| View source of the created tree's page | `noindex` present |

## 4. Send a wish

| Step | Expected |
|---|---|
| Choose "Send a wish", fill in from "Eleni", for "Tom", a wish; send | A link `/w/…` and a message to send; the words are not shown again |
| Open the link in a second profile | "A wish for Tom, from Eleni", a wrapped parcel, "Hang an ornament to keep it"; the words are not in the page or the network panel |
| Hang an ornament there | The branch shows one parcel tagged Eleni, "opens 25 December" |
| Open the same link in a third profile | "This wish has been opened", with a way to the tree |
| Open the link in the sender's own profile | "You sent this wish", no way to claim it |
| With the dev date at 25 December, open the second profile's branch | The wish reads as written |

## 5. Being found

```bash
curl -s https://<host>/ | grep -o "<title>[^<]*"
```

```bash
curl -s -A "Googlebot" https://<host>/t/global | wc -c ; curl -s -A "Mozilla/5.0" https://<host>/t/global | wc -c
```

Expected: the home title; the same size for both user agents. `https://<host>/sitemap.xml` lists three addresses; `https://<host>/robots.txt` disallows `/api/`, `/me/` and `/w/`.

## 6. No test mode on a deployed copy

On the preview deployment, with `TEST_MODE=1` set as a deliberate mistake:

```bash
curl -s https://<preview-host>/api/health
```

```bash
curl -s -X POST https://<preview-host>/api/demo/card -H 'content-type: application/json' -d '{"tree":"global","name":"x","design":0,"hook":0}'
```

Expected: `"testMode":false`, then `{"error":"not_found"}`. The page has no test panel, and "Pretend it's" does not appear in the downloaded scripts.

## Results

### 2026-11-12, local dev server, phone-sized browser

| Section | Result |
|---|---|
| 1. Rules | Pass: 58 of 58 in memory and on Postgres 14 (`npm run test:db`) |
| 2. Home | Pass. Three choices shown; the 3D scene was not downloaded; the words are in the HTML; "Your branches" listed "Eleni's branch on The Georgiou family" after hanging |
| 3. Start a tree | Pass. "The official tree" refused; "The Georgiou family" created at `/t/georgiou-family-…`; the ornament hung there did not appear on the shared tree; the greeting shows the tree's link |
| 4. Send a wish | Pass. Link and message returned; the wish page showed names and a parcel with no words in the page; hanging an ornament from it put one sealed parcel from Eleni under it |
| Build | Home entry 52 KB compressed; scene in its own chunk; no test panel or demo data in the public build |

Not yet run: the "report this tree" and "copy link" buttons by hand, the 25 December read of a claimed wish in the browser (covered by tests), section 5 and 6 on a deployed copy.

Differences from the plan: `/t/{slug}` goes straight into the tree (the words in the page are what shows while it loads) instead of a separate words-first tree page; `/about` is not built yet, so the sitemap lists the home page and the shared tree only; `public/og.jpg` (the preview picture) does not exist yet.
