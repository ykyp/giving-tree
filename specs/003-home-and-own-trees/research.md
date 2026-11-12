# Research: A real home page, trees people create, and sending a wish

**Date**: 2026-11-12 · **Plan**: [plan.md](./plan.md)

## R1. Should we switch to Next.js?

- **Decision**: Not for this launch. Stay on Vite and get what search engines need from the Function we already have. Revisit in January.
- **What search engines need, and where it comes from**: a crawler needs each address to return its own title, description and readable words in the HTML. That is a property of what the server sends, not of the framework. The tree itself is drawn on a canvas, which no framework can make indexable. So the work is the same either way: write real words for the home, About and shared-tree pages and send them in the document. On this stack that is one small module (`shared/shell.js`) used by a static build step and by the Function (R4).
- **What Next.js would add**: built-in per-address metadata, automatic code splitting, generated preview images, and a familiar structure if the site grows many content pages. These are real, and it is where I would start a new project of this shape.
- **Why not now**:
  1. **It forces an upgrade of the 3D stack.** Current Next.js needs React 19. The scene runs on React 18 with @react-three/fiber 8, drei 9 and @react-three/postprocessing 2; moving to React 19 means fiber 9, drei 10 and postprocessing 3 together. The scene (custom shaders, instancing, the camera rig, drag-and-drop) is the most tested and most fragile part of the product, and it was checked by hand, not by automated tests.
  2. **The gain is small for three indexable pages.** Created trees, cards, wishes and branches are deliberately kept out of search.
  3. **Timing.** Wishes have to be sealed before Christmas to mean anything. A framework move now spends the weeks before launch on something visitors cannot see.
  4. **Nothing is lost by waiting.** The rules, the repository, the SQL and the tests are framework-free; `shared/shell.js` and the page contract would carry over to Next.js route handlers and metadata unchanged.
- **Alternatives considered**: Next.js now (above). Astro or a separate marketing site in front of the app (a second deployment and two looks to keep in step). Staying a pure single-page app and relying on crawlers running scripts (slow, unreliable for the canvas, and today's bot-only preview pages give crawlers a page with no words).
- **To confirm before a later move**: the exact fiber, drei and postprocessing versions that pair with the React version Next.js requires at that time.

## R2. The home page is HTML first

- **Decision**: The home page's words and three choices are in `index.html` as ordinary HTML and CSS. A small script (target under 60 KB) makes the forms work and shows "Your branches". The scene is one dynamic import, started when a visitor enters a tree and warmed up in the background once the home page is idle.
- **Rationale**: FR-019 and SC-001: readable in 2 seconds, without a 1.3 MB download. It is also the page crawlers read.
- **Consequence**: `vite.config.js` stops forcing a single bundle for the site. The single-file demo (`publish/`) keeps its own one-file build.

## R3. Tree addresses

- **Decision**: `/t/{slug}`. For a created tree the slug is the name in lower case with spaces as hyphens, limited to 24 characters, plus a hyphen and 5 random characters: "The Georgiou family" → `/t/georgiou-family-k3f9x`. Leading "the" is dropped. Names with no Latin letters get `tree-k3f9x`. The shared tree is `/t/global`. The slug never changes.
- **Rationale**: Readable when shared, unique without asking the visitor to pick again, and not guessable from the name alone (created trees are private by link, FR-007).
- **Already true**: `/t/{slug}` routes and tree link previews exist from spec 002. New here: creation by visitors and the name-based slug.

## R4. One page for people and crawlers

- **Decision**: Remove the user-agent rules from `vercel.json`. `/t/{slug}`, `/c/{id}` and `/w/{token}` are rewritten to the Function's `page/…` route, which returns the full document from `shared/shell.js`: title, description, Open Graph tags, canonical address, `noindex` where required, a few lines of readable text inside the page, and the script tag. `/` and `/about` are static files built from the same module. `/me/{token}` is the static shell with a `noindex` header.
- **Rationale**: FR-016 (same page for both). It also fixes a gap: today a search engine gets the preview page, which has tags but no words.
- **Cost**: tree and card pages go through the Function. They are cached at the edge for 60 seconds (trees) and are small.

## R5. What is indexable

| Address | Listed in search? | Why |
|---|---|---|
| `/`, `/about`, `/t/global` | Yes, and in `sitemap.xml` | The site and the shared tree |
| `/t/{created}` | No (`noindex`) | A family's or class's first names |
| `/c/{id}`, `/w/{token}`, `/me/{token}` | No (`noindex`); `/me` and `/w` also disallowed in `robots.txt` | Personal or private |

Structured data: `WebSite` on the home page only.

## R6. Sending a wish

- **Decision**: A sent wish is stored on its own (from, for, words, tree, private token) and is not attached to any ornament. Its page shows names and a parcel, never the words. Claiming is one database function: it checks the wish is unclaimed, inserts an ordinary wish for the claimer's card (same filter status, sender's device as writer), and marks the sent wish claimed. Claiming happens when the card is saved (`POST card` with the wish's token) or, for someone who already has a branch on that tree, from the wish page.
- **Rationale**: After claiming, every existing rule applies unchanged: sealed until Christmas in the reader's time zone, readable only through their Christmas link, reportable, deleted on 1 February.
- **Limits**: counts towards the sender's 10 wishes an hour; one claim per sent wish; a sender cannot claim their own.
- **Alternatives considered**: Creating a placeholder ornament for the friend (puts a name on the tree that its owner never hung); emailing the wish (needs addresses, and email is off).

## R7. Trees people create

- **Decision**: `POST tree { name }` creates a published community tree with giving off, records the creator's device hash, and is limited to 2 a day per device. `POST tree/{slug}/report` records a report (one per device per tree); three reports, or any operator, can take a tree down by unpublishing it. Created trees appear nowhere except through their link and under "Your branches".
- **Rationale**: FR-005 to FR-009. No owner powers at launch (spec assumption).

## R8. No test mode on deployed copies

- **Decision**: `api/index.js` never sets test mode; the `TEST_MODE` and `VITE_TEST_MODE` settings are deleted. Test mode exists only in the Vite dev server's middleware and in the tests. The test panel and its helpers are imported only under `import.meta.env.DEV`, so they are not in any production build. A test asserts that the production handler refuses `demo/*` and ignores the clock and device headers whatever the environment says.
- **Consequence**: time-dependent behaviour cannot be tried by hand on a deployed copy before the dates arrive. It is covered by the time-lock tests in five time zones and by local runs. This replaces spec 002's "testing deployment with test controls"; a separate testing database is still worth having.
- **The single-file demo** (`publish/`) is a separate build that runs entirely in the browser with no real data. It keeps the panel and says "demo" on screen.

## R9. "Your branches" on the home page

- **Decision**: The device already remembers its branch per tree (`gt3-mine`). It now also stores the tree's name and slug. The home page lists them from the device and refreshes names in the background. Nothing new is stored on the server.

## Needs from the owner

1. Agreement on R1 (stay on Vite now), or a decision to move to Next.js with the later launch that implies.
2. Confirmation of the meaning of "send a wish to a friend" (R6).
3. Confirmation that created trees are private by link and not indexed (R5, R7).
4. Still open from spec 002: a public address without "mosaicads" in it; the operator's name and contact for the About page.
