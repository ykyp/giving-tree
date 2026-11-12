# Contract: page addresses

Every address returns a complete HTML document: `<title>`, description, canonical address, Open Graph tags (title, description, image, site name "The Giving Tree"), readable text in the body, and the script. People and search engines get the same response.

| Address | Served by | Title | Readable text | Search engines |
|---|---|---|---|---|
| `/` | Static file | The Giving Tree: hang an ornament, send a wish | Welcome, what it is, the three choices as real links and forms | Index; in sitemap |
| `/about` | Static file | About and privacy · The Giving Tree | The whole page | Index; in sitemap |
| `/t/global` | Function, cached 60 s | The Giving Tree | What the tree is, how many ornaments and wishes, "Hang an ornament" | Index; in sitemap |
| `/t/{created}` | Function, cached 60 s | {tree name} · The Giving Tree | The tree's name, counts, "Hang an ornament", "Report this tree" | `noindex` |
| `/t/{unknown or taken down}` | Function | The Giving Tree | "We couldn't find that tree", link to the shared tree. HTTP 404 | `noindex` |
| `/c/{id}` | Function | {name} hung an ornament on the Giving Tree | Who hung it, the invitation to hang yours | `noindex` |
| `/w/{token}` | Function | A wish for {to}, from {from} | Names, "Hang an ornament to keep it". Never the words | `noindex`; disallowed in `robots.txt` |
| `/me/{token}` | Static shell | Your branch · The Giving Tree | "Your branch is loading" | `noindex` header; disallowed in `robots.txt` |
| `/sitemap.xml` | Function | | `/`, `/about`, `/t/global` | |
| `/robots.txt` | Static file | | Allow all; disallow `/api/`, `/me/`, `/w/`; sitemap address | |

Rules checked by tests (`tests/server/pages.test.js`):

- No response body for `/c/…`, `/w/…` or a tree contains a Christmas token or any wish text.
- With giving off, no page contains the money words listed in spec 002's copy rules.
- `/`, `/about` and `/t/global` each contain at least 50 words of text outside tags, and are not `noindex`.
- The response for a given address does not depend on the `user-agent` header.
