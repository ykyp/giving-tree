// The HTML document for every page address. People and search engines get the same thing: a real title, a
// description, readable words in the page, and the script that then takes over. Used by the build (home page)
// and by the server (trees, cards, sent wishes).
import { SITE, copy } from './copy.js'
import { YEAR } from './season.js'

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
    `<meta property="og:image" content="${img}">`, '<meta property="og:image:type" content="image/jpeg">', '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">', `<meta property="og:image:alt" content="${esc(imageAlt || title)}">`,
    '<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${esc(title)}">`, `<meta name="twitter:description" content="${esc(description)}">`, `<meta name="twitter:image" content="${img}">`,
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
/** The home page's words, shared with src/pages/Home.jsx so the page reads the same before and after its script runs. */
export const LEDE = 'Hang an ornament with your name on it and your wish inside. Friends open it, hang their own, and can leave you a wish back that stays wrapped until Christmas morning.'
export const FINE = 'No accounts and no passwords. First names only. The wish on your ornament can be read by anyone who visits the tree; wishes left for you are private to you. Everything is deleted on 1 February 2027.'
export const WAYS = [
  { href: '/t/global', mode: null, icon: 'ornament', short: 'Hang your ornament', title: 'Hang your ornament', text: 'With your wish inside, on the Giving Tree everyone shares.' },
  { href: '/?start=tree', mode: 'tree', icon: 'tree', short: 'Start a tree', title: 'Start a tree for your people', text: 'A family, a class, a flat, a team. Everyone adds a wish and opens each other\'s.' },
  { href: '/?start=wish', mode: 'wish', icon: 'gift', short: 'Make one for a friend', title: 'Make an ornament for a friend', text: 'Pick one, add their name and a wish. They hang it, and open the wish on Christmas morning.' },
]
export const STEPS = [
  { icon: 'ornament', title: 'Hang your ornament', text: 'Pick one you like, put your first name on it and tuck your wish inside. It takes a minute.' },
  { icon: 'heart', title: 'Share it', text: 'Friends open your wish, hang their own next to yours, and can leave you a wish back.' },
  { icon: 'gift', title: 'Open on Christmas morning', text: 'Every wish left for you stays wrapped under your ornament until the 25th, then opens for you alone.' },
]
export const HERO_ALT = 'A Christmas tree with a glowing star, hung with ornaments and lights, in a snowy village square at night'
/** Line icons, drawn at 24 by 24. One set for the page before and after its script runs. */
export const ICONS = {
  ornament: 'M10 3h4v2.2h-4zM12 5.2v1.3M12 6.5a7.2 7.2 0 1 0 0 14.4 7.2 7.2 0 0 0 0-14.4zM5.3 11.6c2.2 1.5 4.4 1.5 6.7 0s4.5-1.5 6.7 0',
  tree: 'M12 2.2l1 2 2.1.2-1.6 1.4.5 2.1L12 6.8 10 7.9l.5-2.1L8.9 4.4l2.1-.2zM12 8.5l4.6 5.3h-2.4l3.6 4.7H6.2l3.6-4.7H7.4zM12 18.5v3.3',
  gift: 'M4 9h16v4H4zM5.5 13v8h13v-8M12 9v12M12 9c-1.4-3.7-5.2-3.9-5.2-1.6C6.8 9 9.6 9 12 9zm0 0c1.4-3.7 5.2-3.9 5.2-1.6C17.2 9 14.4 9 12 9z',
  heart: 'M12 20.5s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.5 2.4c0 5.5-7.5 10.1-7.5 10.1z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
}
const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[k]}"/></svg>`
/** The home page as plain HTML: what a search engine reads and what a visitor sees before the script runs. src/pages/Home.jsx draws the same thing. */
const landing = () => `<main class="landing">
<header class="hero">
<picture><img class="hero-img" src="/hero.jpg" alt="${HERO_ALT}" width="1920" height="1157" fetchpriority="high"></picture>
<div class="snow" aria-hidden="true"></div>
<div class="hero-top"><p class="eyebrow">Christmas ${YEAR}</p><h1>${SITE}</h1><p class="lede">${LEDE}</p></div>
<nav class="dock" aria-label="Ways to begin">
<a class="cta" href="${WAYS[0].href}">${icon('ornament')}<span>${WAYS[0].short}</span></a>
<div class="dock-row">${WAYS.slice(1).map(w => `<a class="glass" href="${w.href}">${icon(w.icon)}<span>${w.short}</span></a>`).join('')}</div>
</nav>
</header>
<section class="band" aria-labelledby="how"><h2 id="how">How it works</h2>
<ol class="steps">${STEPS.map((st, i) => `<li class="step"><span class="num">${i + 1}</span>${icon(st.icon)}<h3>${st.title}</h3><p>${st.text}</p></li>`).join('')}</ol></section>
<section class="band" aria-labelledby="ways"><h2 id="ways">Three ways to begin</h2>
<div class="paths">${WAYS.map(w => `<a class="path" href="${w.href}">${icon(w.icon)}<h3>${w.title}</h3><p>${w.text}</p><span class="go">${w.short} ${icon('arrow')}</span></a>`).join('')}</div></section>
<footer class="foot-note"><p>${FINE}</p></footer>
</main>`
const pre = inner => `<main class="pre">${inner}</main>`

export const pages = {
  home: () => ({ path: '/', imageAlt: 'A Christmas tree hung with ornaments in a snowy village square at night', title: `${SITE}: hang an ornament, send a wish`,
    description: 'Hang an ornament with your name on it and your wish inside. Friends open it, hang their own, and leave you a wish back for Christmas morning.',
    body: landing() }),
  tree: ({ tree, counts }) => ({ path: `/t/${tree.slug}`, noindex: tree.kind !== 'global', title: tree.kind === 'global' ? SITE : `${tree.name} · ${SITE}`, description: copy.treeText(counts),
    body: pre(`<h1>${esc(tree.name)}</h1>
<p class="lede">${counts.ornaments > 0 ? `${plural(counts.ornaments, 'ornament')} hung so far, and ${plural(counts.wishes, 'wish', 'wishes')} waiting for Christmas morning.` : 'No ornaments yet. Be the first to hang one.'}</p>
<p>Hang an ornament with your name on it and your wish inside. Walk round the tree and open the wishes other people have hung. Leave someone a wish back, and it stays wrapped under their ornament until Christmas morning.</p>
<p class="fine">The tree is loading. <a href="/">About the Giving Tree</a></p>`) }),
  card: ({ card, tree, late, image }) => ({ path: `/c/${card.id}`, noindex: true, image, imageAlt: `${card.name}'s ornament on the tree`, title: copy.previewTitle({ name: card.name }), description: copy.previewText({ giving: tree.giving, thanks: false, waiting: 0, late }),
    body: pre(`<h1>${esc(card.name)} hung an ornament on ${esc(tree.name)}</h1><p class="lede">Open ${esc(card.name)}'s wish, then hang yours next to theirs.</p><p class="fine">The tree is loading.</p>`) }),
  thanks: ({ card, tree, given, image }) => ({ path: `/c/${card.id}?t=1`, noindex: true, image, imageAlt: `${card.name}'s ornament on the tree`, title: copy.previewTitle({ name: card.name, branchName: card.branchName, thanks: true }), description: copy.previewText({ giving: tree.giving, thanks: true, given }),
    body: pre(`<h1>Thank you from ${esc(card.branchName || card.name)}</h1><p class="lede">Open the wishes waiting for you.</p><p class="fine">The tree is loading.</p>`) }),
  sent: ({ sent, tree }) => ({ path: '/w/', noindex: true, image: '/og-wish.jpg', imageAlt: 'A wrapped parcel under a Christmas tree', title: `An ornament for ${sent.to}, from ${sent.from}`, description: `${sent.from} made ${sent.to} an ornament on ${tree.name}, with a wish under it. Hang it to keep the wish.`,
    body: pre(`<h1>${esc(sent.from)} made ${esc(sent.to)} an ornament</h1><p class="lede">There is a wish under it, wrapped until Christmas morning. Hang it on ${esc(tree.name)} to keep the wish.</p><p class="fine">Loading.</p>`) }),
  missing: what => ({ path: '/', noindex: true, status: 404, title: SITE, description: `We couldn't find that ${what}.`,
    body: pre(`<h1>We couldn't find that ${what}</h1><p class="lede">It may have been removed, or the link may be incomplete.</p><p><a href="/t/global">Go to the Giving Tree</a></p>`) }),
}
export const sitemap = origin => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['/', '/t/global'].map(p => `  <url><loc>${esc(origin + p)}</loc></url>`).join('\n')}\n</urlset>\n`
