// The HTML document for every page address. People and search engines get the same thing: a real title, a
// description, readable words in the page, and the script that then takes over. Used by the build (home page)
// and by the server (trees, cards, sent wishes).
import { SITE, copy } from './copy.js'

const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600&family=Instrument+Serif:ital@0;1&family=Great+Vibes&family=Caveat:wght@600&family=Kalam:wght@400&family=Shadows+Into+Light&display=swap'
const plural = (n, one, many = one + 's') => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`

/** The tags that describe a page. `path` is its own address; `origin` the site's. */
export function headTags({ title, description, path = '/', origin = '', noindex = false, image = '/og.jpg', imageAlt }) {
  const img = esc(origin + image)
  return [`<title>${esc(title)}</title>`, `<meta name="description" content="${esc(description)}">`,
    noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(origin + path)}">`,
    `<meta property="og:site_name" content="${SITE}">`, `<meta property="og:type" content="website">`, `<meta property="og:title" content="${esc(title)}">`, `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(origin + path)}">`,
    // the picture chat apps show: 1200×630, the size they all accept
    `<meta property="og:image" content="${img}">`, '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">', `<meta property="og:image:alt" content="${esc(imageAlt || title)}">`,
    '<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:image" content="${img}">`,
    '<link rel="icon" href="/icon.svg" type="image/svg+xml">'].join('\n')
}
/** A whole document, for addresses the server answers. The built script and stylesheet have fixed names. */
export function page(p, origin = '') {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${headTags({ ...p, origin })}
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/style.css">
<script type="module" src="/app.js"></script>
</head><body><div id="root">${p.body}</div></body></html>`
}
const pre = inner => `<main class="pre">${inner}</main>`

export const pages = {
  home: () => ({ path: '/', imageAlt: 'A Christmas tree hung with ornaments in a snowy village square at night', title: `${SITE}: hang an ornament, send a wish`,
    description: 'Hang an ornament with your name on it, invite the people you love, and open the wishes they leave you on Christmas morning.',
    body: pre(`<h1>${SITE}</h1>
<p class="lede">Hang an ornament with your name on it and invite the people you love. Each of them can leave you a wish. Every wish stays wrapped under your ornament until Christmas morning, then opens for you alone.</p>
<nav class="ways" aria-label="Ways to begin">
<a class="way" href="/t/global"><b>Hang on the Giving Tree</b><span>The tree everyone shares. Add your ornament to it.</span></a>
<a class="way" href="/?start=tree"><b>Start a tree for your people</b><span>A family, a class, a flat, a team: your own tree, at your own link.</span></a>
<a class="way" href="/?start=wish"><b>Send a wish to a friend</b><span>Write it now. They keep it by hanging an ornament, and open it on Christmas morning.</span></a>
</nav>
<p class="fine">No accounts and no passwords. First names only. Wishes are private to the person they were written for, and are deleted on 1 February 2027.</p>`) }),
  tree: ({ tree, counts }) => ({ path: `/t/${tree.slug}`, noindex: tree.kind !== 'global', title: tree.kind === 'global' ? SITE : `${tree.name} · ${SITE}`, description: copy.treeText(counts),
    body: pre(`<h1>${esc(tree.name)}</h1>
<p class="lede">${counts.ornaments > 0 ? `${plural(counts.ornaments, 'ornament')} hung so far, and ${plural(counts.wishes, 'wish', 'wishes')} waiting for Christmas morning.` : 'No ornaments yet. Be the first to hang one.'}</p>
<p>Hang an ornament with your name on it and invite the people you love. They hang theirs next to yours and leave you a wish, which stays wrapped until Christmas morning.</p>
<p class="fine">The tree is loading. <a href="/">About the Giving Tree</a></p>`) }),
  card: ({ card, tree, late, image }) => ({ path: `/c/${card.id}`, noindex: true, image, imageAlt: `${card.name}'s ornament on the tree`, title: copy.previewTitle({ name: card.name }), description: copy.previewText({ giving: tree.giving, thanks: false, waiting: 0, late }),
    body: pre(`<h1>${esc(card.name)} hung an ornament on ${esc(tree.name)}</h1><p class="lede">Hang yours next to ${esc(card.name)}'s and leave them a wish${late ? '' : ' for Christmas morning'}.</p><p class="fine">The tree is loading.</p>`) }),
  thanks: ({ card, tree, given, image }) => ({ path: `/c/${card.id}?t=1`, noindex: true, image, imageAlt: `${card.name}'s ornament on the tree`, title: copy.previewTitle({ name: card.name, branchName: card.branchName, thanks: true }), description: copy.previewText({ giving: tree.giving, thanks: true, given }),
    body: pre(`<h1>Thank you from ${esc(card.branchName || `${card.name}'s branch`)}</h1><p class="lede">Open the wishes waiting for you.</p><p class="fine">The tree is loading.</p>`) }),
  sent: ({ sent, tree }) => ({ path: '/w/', noindex: true, image: '/og-wish.jpg', imageAlt: 'A wrapped parcel under a Christmas tree', title: `A wish for ${sent.to}, from ${sent.from}`, description: `${sent.from} sent ${sent.to} a wish on ${tree.name}. Hang an ornament to keep it.`,
    body: pre(`<h1>A wish for ${esc(sent.to)}, from ${esc(sent.from)}</h1><p class="lede">It is wrapped until Christmas morning. Hang an ornament on ${esc(tree.name)} to keep it.</p><p class="fine">Loading.</p>`) }),
  missing: what => ({ path: '/', noindex: true, status: 404, title: SITE, description: `We couldn't find that ${what}.`,
    body: pre(`<h1>We couldn't find that ${what}</h1><p class="lede">It may have been removed, or the link may be incomplete.</p><p><a href="/t/global">Go to the Giving Tree</a></p>`) }),
}
export const sitemap = origin => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/t/global'].map(p => `  <url><loc>${esc(origin + p)}</loc></url>`).join('\n')}\n</urlset>\n`
