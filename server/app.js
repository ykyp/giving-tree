// Every server rule. No platform code here: the Vercel function, the Vite dev server and the single-file demo all
// call handle() with a request and a repository (server/repo-memory.js or server/repo-postgres.js).
import { RELEASE_UTC, FROZEN_UTC, isReleased, YEAR } from '../shared/season.js'
import { WISH_MAX, BRANCH_MAX, flagWish, badName } from '../shared/moderation.js'
import { copy } from '../shared/copy.js'
import { page, pages, sitemap } from '../shared/shell.js'
import { treeSlug } from '../shared/slug.js'
import { givingComplete } from './repo-memory.js'

const BOT = /bot\b|bot\/|crawl|spider|facebookexternalhit|whatsapp|slack|telegram|discord|linkedin|skypeuripreview|preview/i
const EVENTS = new Set(['share_v1', 'share_v2', 'saved_calendar', 'saved_selfsend'])
const LIMITS = { card: [864e5, 3], wish: [36e5, 10], tree: [864e5, 2], log: [6e4, 20] } // per device: 3 cards a day on a tree, 10 wishes an hour, 2 new trees a day
const REPORTS_TO_TAKE_DOWN = 3
const TREE_NAME_MAX = 40
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const rid = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => ALPHABET[b % ALPHABET.length]).join('')
const fail = (status, error) => Object.assign(new Error(error), { status, error })
const firstName = v => String(v || '').trim().split(/\s+/)[0].slice(0, 12)
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const cookies = h => Object.fromEntries((h || '').split(';').map(c => c.trim().split('=')).filter(c => c[0]))
const isoDay = t => new Date(t).toISOString().slice(0, 10)
const dayOf = (v, t) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? v : isoDay(t)
const pub = c => ({ id: c.id, name: c.name, design: c.design, hook: c.hook })
const visible = list => list.filter(w => w.status === 'ok')

/** What the page may know about a tree's giving. Null unless giving is switched on with every setting in place. */
function givingOf(tree) {
  const g = tree.giving
  if (!g.enabled || g.status === 'off' || !givingComplete(g)) return null
  return { sponsor: g.sponsor, charity: { name: g.charityName, reg: g.charityReg }, perGift: g.perGift, cap: g.cap, given: g.given, status: g.status, starts: g.starts, ends: g.ends, payout: g.payout }
}
const treeView = tree => ({ slug: tree.slug, name: tree.name, kind: tree.kind, giving: givingOf(tree) })

async function treeBySlug(repo, slug, all = false) { const t = await repo.getTree(String(slug || '')); if (!t || (!t.published && !all)) throw fail(404, 'no_tree'); return t }
async function cardById(repo, id) { const c = await repo.getCard(String(id || '')); if (!c || c.hidden) throw fail(404, 'no_card'); return c }
async function cardByToken(repo, token) { const c = await repo.getCardByToken(String(token || '')); if (!c) throw fail(404, 'no_link'); return c }
async function limit(repo, device, action, scope, t) { const [win, max] = LIMITS[action]; if (!await repo.hit(device, action + (scope ? ':' + scope : ''), win, max, t)) throw fail(429, 'slow_down') }

async function createCard(repo, t, device, { tree, name, design, hook, parent }, limited = true) {
  if (t >= FROZEN_UTC) throw fail(410, 'frozen')
  const tr = await treeBySlug(repo, tree || 'global'), n = firstName(name), d = Number(design), h = Number(hook)
  if (!n || badName(n)) throw fail(400, 'bad_name')
  if (!Number.isInteger(d) || d < 0 || d > 7 || !Number.isInteger(h) || h < 0 || h > 999) throw fail(400, 'bad_card')
  let parentId = null
  if (parent) { const p = await cardById(repo, parent); if (p.tree !== tr.slug) throw fail(400, 'wrong_tree'); parentId = p.id }
  if (limited) await limit(repo, device, 'card', tr.slug, t)
  return repo.createCard({ tree: tr.slug, name: n, design: d, hook: h, parent: parentId, device, at: t })
}
async function storeWish(repo, card, { from, text, kind, device }, t) {
  const clean = String(text || '').trim()
  if (!clean || clean.length > WISH_MAX) throw fail(400, 'bad_wish')
  const w = await repo.leaveWish({ to: card.id, from, text: clean, kind, device, status: flagWish(clean) ? 'review' : 'ok', at: t })
  if (!w) throw fail(409, 'already')
  return w
}
const branchView = async (repo, card) => { const b = await repo.getBranch(card.id); return { name: card.branchName || null, kids: b.kids.map(pub), opened: b.opened, gifts: b.gifts } }

function icsFor(card, origin) {
  const fold = l => { const out = []; while (l.length > 73) { out.push(l.slice(0, 73)); l = ' ' + l.slice(73) } out.push(l); return out.join('\r\n') }
  const url = `${origin}/me/${card.token}`, c = copy.calendar({ url })
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Giving Tree//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${card.id}@giving-tree`, `DTSTAMP:${YEAR}1101T000000Z`,
    `DTSTART:${YEAR}1225T090000`, `DTEND:${YEAR}1225T093000`, `SUMMARY:${c.summary}`, `DESCRIPTION:${c.description}`, `URL:${url}`, 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n'
}

async function route(req, repo, env, ctx) {
  const { method, query = {}, body = {}, headers = {} } = req, { t, device, origin } = ctx
  const parts = req.path.replace(/^\/+|\/+$/g, '').split('/'), [a, b1, b2, b3] = parts
  const GET = method === 'GET', POST = method === 'POST'

  if (GET && a === 'health') return { ok: true, email: !!env.emailEnabled, testMode: !!env.testMode }

  // ---- trees ----
  if (GET && a === 'tree') {
    const tree = await treeBySlug(repo, b1 || 'global'), since = Number(query.since) || 0
    return { tree: treeView(tree), counts: await repo.counts(tree.slug), ...(await repo.latestOrnaments(tree.slug, since, 120)) }
  }
  if (GET && a === 'keepsake') { const tree = await treeBySlug(repo, b1 || 'global'); return { tree: treeView(tree), counts: await repo.counts(tree.slug), names: (await repo.keepsakeNames(tree.slug)).slice(0, 20000) } }

  // ---- cards ----
  if (POST && a === 'card') {
    const c = await createCard(repo, t, device, body), out = { id: c.id, token: c.token, name: c.name, design: c.design, hook: c.hook, parent: c.parent, tree: c.tree }
    // hung from a wish someone sent: the wish goes under this ornament. A failed claim never loses the ornament.
    if (body.sent) out.sent = await repo.claimSentWish(String(body.sent), c.id, t)
    return out
  }
  if (GET && a === 'card') {
    const c = await cardById(repo, b1), wishes = visible(await repo.wishesFor(c.id)), b = await branchView(repo, c)
    return { ...pub(c), tree: treeView(await repo.getTree(c.tree)), branch: { name: b.name, kids: b.kids }, waiting: wishes.filter(w => w.kind === 'friend').length, left: await repo.hasWished(c.id, device), own: c.device === device }
  }

  // A card is opened. With giving off (the default) this is only recorded. With giving on: first open from a new
  // device, never the sender's, never a bot, stops at the pot.
  if (POST && a === 'open') {
    const c = await cardById(repo, body.id), done = async r => ({ ...r, tree: treeView(await repo.getTree(c.tree)) })
    if (t >= FROZEN_UTC) return done({ counted: false, reason: 'closed' })
    if (BOT.test(headers['user-agent'] || '')) return done({ counted: false, reason: 'bot' })
    return done(await repo.recordOpen({ cardId: c.id, device, at: t, day: isoDay(t) }))
  }

  if (POST && a === 'wish') {
    const c = await cardById(repo, body.to), from = firstName(body.from)
    if (t >= FROZEN_UTC) throw fail(410, 'frozen')
    if (c.device === device) throw fail(400, 'own_card')
    if (!from || badName(from)) throw fail(400, 'bad_name')
    if (!String(body.text || '').trim() || String(body.text).trim().length > WISH_MAX) throw fail(400, 'bad_wish')
    if (await repo.hasWished(c.id, device)) throw fail(409, 'already')
    await limit(repo, device, 'wish', null, t)
    await storeWish(repo, c, { from, text: body.text, kind: 'friend', device }, t)
    return { sealed: true } // never echoes the words, and never says whether it was flagged
  }

  if (GET && a === 'ics') { const c = await cardByToken(repo, b1); return { type: 'text/calendar; charset=utf-8', text: icsFor(c, origin), headers: { 'content-disposition': 'attachment; filename="christmas-wishes.ics"' } } }
  // ---- page addresses: one document for people and search engines alike (specs/003, contracts/pages.md) ----
  if (GET && a === 'page') {
    const html = (p, cache) => ({ type: 'text/html; charset=utf-8', text: page(p, origin), status: p.status, headers: { 'cache-control': cache || 'no-store', ...(p.noindex ? { 'x-robots-tag': 'noindex' } : {}) } })
    if (b1 === 't') { const tree = await repo.getTree(String(b2 || '')); if (!tree || !tree.published) return html(pages.missing('tree')); return html(pages.tree({ tree: treeView(tree), counts: await repo.counts(tree.slug) }), 'public, s-maxage=60') }
    if (b1 === 'c') {
      const c = await repo.getCard(String(b2 || '')); if (!c || c.hidden) return html(pages.missing('card'))
      // the card's own picture (their ornament, close up) once their page has made one; the site's picture until then.
      // The address changes when the picture does, because chat apps keep pictures by address.
      const kind = query.t == null ? 'invite' : 'thanks', pic = await repo.getPreview(c.id, kind), image = pic ? `/api/img/${c.id}/${kind}?v=${pic.length.toString(36)}${pic.slice(-6).replace(/[^\w]/g, '')}` : undefined
      const tree = treeView(await repo.getTree(c.tree)); if (kind === 'invite') return html(pages.card({ card: c, tree, late: t >= RELEASE_UTC, image }))
      const br = await repo.getBranch(c.id); return html(pages.thanks({ card: c, tree, given: tree.giving ? br.gifts * tree.giving.perGift : 0, image }))
    }
    if (b1 === 'w') { const w = await repo.getSentWish(String(b2 || '')); if (!w || w.status === 'rejected') return html(pages.missing('wish')); return html(pages.sent({ sent: w, tree: treeView(await repo.getTree(w.tree)) })) }
    return html(pages.missing('page'))
  }
  if (GET && a === 'robots') return { type: 'text/plain; charset=utf-8', text: `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /me/\nDisallow: /w/\n\nSitemap: ${origin}/sitemap.xml\n`, headers: { 'cache-control': 'public, s-maxage=3600' } }
  if (GET && a === 'sitemap') return { type: 'application/xml; charset=utf-8', text: sitemap(origin), headers: { 'cache-control': 'public, s-maxage=3600' } }

  // ---- trees people create ----
  if (POST && a === 'tree' && !b1) {
    if (t >= FROZEN_UTC) throw fail(410, 'frozen')
    const name = String(body.name || '').trim().replace(/\s+/g, ' ')
    if (!name || name.length > TREE_NAME_MAX || badName(name)) throw fail(400, 'bad_name')
    await limit(repo, device, 'tree', null, t)
    for (let i = 0; i < 4; i++) { const tr = await repo.createTree({ slug: treeSlug(name), name, published: true, createdBy: device }); if (tr) return { slug: tr.slug, name: tr.name } }
    throw fail(500, 'server')
  }
  // Anyone can report a tree. Enough reports take it down until an operator has looked.
  if (POST && a === 'tree' && b2 === 'report') {
    const tree = await treeBySlug(repo, b1)
    if (tree.kind !== 'global' && await repo.reportTree(tree.slug, device, t) >= REPORTS_TO_TAKE_DOWN) await repo.takeDownTree(tree.slug, t)
    return { ok: true }
  }

  // ---- a wish for someone who has no ornament yet ----
  if (POST && a === 'sent' && !b1) {
    if (t >= FROZEN_UTC) throw fail(410, 'frozen')
    const tree = await treeBySlug(repo, body.tree || 'global'), from = firstName(body.from), to = firstName(body.to), text = String(body.text || '').trim()
    if (!from || badName(from) || !to || badName(to)) throw fail(400, 'bad_name')
    if (!text || text.length > WISH_MAX) throw fail(400, 'bad_wish')
    await limit(repo, device, 'wish', null, t)
    return repo.sendWish({ tree: tree.slug, from, to, text, device, status: flagWish(text) ? 'review' : 'ok', at: t }) // { token }: never the words, never whether it was flagged
  }
  if (a === 'sent' && b1) {
    const w = await repo.getSentWish(b1); if (!w || w.status === 'rejected') throw fail(404, 'no_wish')
    const mine = w.device === device
    if (GET && !b2) {
      const me = query.me ? await repo.getCardByToken(String(query.me)) : null
      return { from: w.from, to: w.to, tree: treeView(await repo.getTree(w.tree)), claimed: !!w.claimedBy, mine, canClaimHere: !!me && !me.hidden && me.tree === w.tree && me.device !== w.device && !w.claimedBy, closed: t >= FROZEN_UTC }
    }
    if (POST && b2 === 'claim') {
      if (t >= FROZEN_UTC) throw fail(410, 'frozen')
      const me = await cardByToken(repo, body.me), out = await repo.claimSentWish(w.token, me.id, t)
      if (out !== 'ok') throw fail(out === 'no_wish' ? 404 : out === 'claimed' || out === 'already' ? 409 : 400, out)
      return { ok: true }
    }
  }

  if (GET && a === 'img') { const v = await repo.getPreview(b1, b2 === 'thanks' ? 'thanks' : 'invite'); if (!v) throw fail(404, 'no_image'); return { type: 'image/jpeg', b64: v, headers: { 'cache-control': 'public, max-age=86400, immutable' } } }

  // ---- your own branch, by private link ----
  if (a === 'me') {
    const c = await cardByToken(repo, b1), tree = await repo.getTree(c.tree), giving = givingOf(tree)
    if (GET && !b2) {
      if (c.removedAt) return { removed: true, tree: treeView(tree) }
      const released = isReleased(t, dayOf(query.day, t)), list = visible(await repo.wishesFor(c.id)), b = await branchView(repo, c)
      if (released && await repo.markReturned(c.id)) await repo.addEvent(c.tree, 'returned', t)
      return { card: { id: c.id, token: c.token, name: c.name, design: c.design, hook: c.hook, parent: c.parent, tree: c.tree }, tree: treeView(tree), counts: await repo.counts(c.tree), released,
        branch: { name: b.name, kids: b.kids }, reminded: await repo.hasReminder(c.token),
        stats: { ornaments: 1 + b.kids.length, wishes: list.filter(w => w.kind === 'friend').length, opened: b.opened, ...(giving ? { gifts: b.gifts, given: b.gifts * giving.perGift } : {}) },
        wishes: list.map(w => ({ id: w.id, from: w.from, kind: w.kind, opened: w.opened, ...(released ? { text: w.text } : {}) })) }
    }
    if (POST && b2 === 'branch') { const n = String(body.name || '').trim().slice(0, BRANCH_MAX); if (n && badName(n)) throw fail(400, 'bad_name'); await repo.setBranchName(c.id, n || null); return { name: n || null } }
    if (POST && b2 === 'wish') {
      if (t >= FROZEN_UTC) throw fail(410, 'frozen')
      const w = await storeWish(repo, c, { from: c.name, text: body.text, kind: 'self', device }, t); return { sealed: true, id: w.id }
    }
    if (POST && (b2 === 'opened' || b2 === 'report')) {
      const w = await repo.getWish(String(body.id || '')); if (!w || w.to !== c.id) throw fail(404, 'no_wish')
      if (!isReleased(t, dayOf(body.day, t))) throw fail(403, 'sealed')
      if (b2 === 'opened') await repo.markOpened(w.id); else await repo.reportWish(w.id)
      return { ok: true }
    }
    if (POST && b2 === 'reminder') {
      if (!env.emailEnabled) throw fail(404, 'email_off')
      const email = String(body.email || '').trim(); if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw fail(400, 'bad_email')
      await repo.saveReminder(c.token, { email, news: body.news === true, tree: c.tree }); await repo.addEvent(c.tree, 'saved_email', t); return { ok: true }
    }
    if (POST && b2 === 'preview') {
      const kind = body.kind === 'thanks' ? 'thanks' : 'invite', m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.jpeg || ''))
      if (!m || m[1].length > 280000) throw fail(400, 'bad_image')
      await repo.savePreview(c.id, kind, m[1]); return { ok: true }
    }
    // "Remove my ornament": it leaves the tree and its wishes are deleted.
    if (POST && b2 === 'remove') { await repo.removeCard(c.id, 'asked from their own link', t); return { ok: true } }
  }

  if (POST && a === 'event') { if (!EVENTS.has(body.name)) throw fail(400, 'bad_event'); const tree = await treeBySlug(repo, body.tree); await repo.addEvent(tree.slug, body.name, t); return { ok: true } }

  // Errors the page hit, for the team. Never wishes or private links.
  if (POST && a === 'log') {
    await limit(repo, device, 'log', null, t)
    const clean = v => String(v || '').slice(0, 500).replace(/\/me\/[\w-]+/g, '/me/…').replace(/[\w-]{20,}/g, '…')
    console.error(JSON.stringify({ kind: 'client_error', message: clean(body.message), screen: clean(body.screen).slice(0, 40), build: clean(body.build).slice(0, 40) }))
    return { ok: true }
  }

  // ---- scheduled jobs ----
  if (a === 'cron') {
    if (!env.cronSecret || headers.authorization !== `Bearer ${env.cronSecret}`) throw fail(401, 'nope')
    if (b1 === 'email') {
      if (!env.emailEnabled) return { sent: 0 }
      let sent = 0
      for (const r of await repo.unsentReminders()) { await env.sendEmail({ to: r.email, ...copy.reminderEmail({ url: `${origin}/me/${r.token}` }) }); await repo.markReminderSent(r.token); sent++ }
      return { sent }
    }
    if (b1 === 'ops') {
      const notes = [], oldest = await repo.oldestWaiting()
      if (oldest != null && t - oldest > 864e5) notes.push(`Wishes have been waiting for review for more than a day: ${origin}/ops`)
      for (const tree of await repo.listTrees()) { const g = givingOf(tree); if (g && g.given >= g.cap) notes.push(`${tree.name}: the pot is complete.`); else if (g && g.given >= g.cap * .9) notes.push(`${tree.name}: the pot has passed 90%.`) }
      await repo.sweepLimits(t)
      if (notes.length && env.notify) await env.notify(notes.join('\n'))
      return { notes }
    }
  }

  // ---- operators ----
  if (a === 'admin') {
    const allowed = env.operator ? await env.operator(headers) : !!env.adminSecret && headers.authorization === `Bearer ${env.adminSecret}`
    if (!allowed) throw fail(401, 'nope')
    if (GET && b1 === 'trees') return { trees: await Promise.all((await repo.listTrees()).map(async tr => ({ ...tr, measures: await repo.measures(tr.slug, RELEASE_UTC), counts: await repo.counts(tr.slug) }))) }
    if (POST && b1 === 'trees' && !b2) {
      const slug = String(body.slug || '').toLowerCase(), name = String(body.name || '').trim()
      if (!/^[a-z0-9-]{3,30}$/.test(slug) || !name || name.length > TREE_NAME_MAX || badName(name)) throw fail(400, 'bad_name')
      const tr = await repo.createTree({ slug, name, published: body.published !== false }); if (!tr) throw fail(409, 'taken'); return tr
    }
    if (POST && b1 === 'trees' && b3 === 'giving') {
      const tr = await treeBySlug(repo, b2, true), g = { ...tr.giving }
      for (const k of ['enabled', 'sponsor', 'charityName', 'charityReg', 'perGift', 'cap', 'starts', 'ends', 'agreementSigned', 'payout', 'status']) if (k in body) g[k] = body[k]
      if (!['off', 'live', 'paused', 'ended'].includes(g.status)) throw fail(400, 'bad_status')
      if (!g.enabled) g.status = 'off'
      if (g.status !== 'off' && !givingComplete(g)) throw fail(400, 'incomplete')
      if (g.cap != null && g.cap < tr.giving.given) throw fail(400, 'below_given')
      return repo.setGiving(tr.slug, g) // never changes the recorded total
    }
    if (POST && b1 === 'trees' && b3 === 'takedown') { if (!await repo.takeDownTree(String(b2), t)) throw fail(404, 'no_tree'); return { ok: true } }
    if (GET && b1 === 'measures') { const tr = await treeBySlug(repo, query.tree, true); return { ...(await repo.measures(tr.slug, RELEASE_UTC)), counts: await repo.counts(tr.slug) } }
    if (GET && b1 === 'review') return { wishes: await repo.reviewQueue() }
    if (POST && b1 === 'review') { if (body.action !== 'approve' && body.action !== 'reject') throw fail(400, 'bad_action'); const status = await repo.decideWish(b2, body.action === 'approve' ? 'ok' : 'rejected'); if (!status) throw fail(404, 'no_wish'); return { status } }
    if (POST && b1 === 'cards' && b3 === 'hide') { const h = await repo.hideCard(b2, body.hidden !== false); if (h === null) throw fail(404, 'no_card'); return { moderation: h ? 'hidden' : 'ok' } }
    if (POST && b1 === 'cards' && b3 === 'remove') { if (!await repo.removeCard(b2, String(body.note || '').slice(0, 200), t)) throw fail(404, 'no_card'); return { ok: true } }
  }

  // ---- test helpers. Only in the team's test mode, never on the public site. ----
  if (env.testMode && POST && a === 'demo') {
    if (b1 === 'card') { const c = await createCard(repo, t, 'demo-' + rid(6), body, false); return { id: c.id } }
    if (b1 === 'friend') {
      const c = await cardById(repo, body.to), used = new Set(await repo.usedHooks(c.id)), d = 'demo-' + rid(6)
      let hook = Number(body.hook) || 0; while (used.has(hook)) hook++
      await createCard(repo, t, d, { tree: c.tree, name: body.name, design: body.design, hook, parent: c.id }, false)
      await storeWish(repo, c, { from: firstName(body.name), text: body.text, kind: 'friend', device: d }, t)
      await repo.recordOpen({ cardId: c.id, device: d, at: t, day: isoDay(t) }) // obeys the same rules as a real open
      return { ok: true }
    }
  }
  throw fail(404, 'not_found')
}

export async function handle(req, repo, env = {}) {
  const headers = req.headers || {}, clock = env.testMode && headers['x-gt-clock'] ? Date.parse(headers['x-gt-clock']) : NaN, t = Number.isNaN(clock) ? Date.now() : clock
  let id = (env.testMode && headers['x-gt-device']) || cookies(headers.cookie).gt_d, setCookie
  if (!id) { id = rid(16); setCookie = `gt_d=${id}; Path=/; Max-Age=15552000; HttpOnly; SameSite=Lax; Secure` }
  const device = env.hashDevice ? await env.hashDevice(id) : id // production stores only a salted hash
  const origin = env.origin || `https://${headers['x-forwarded-host'] || headers.host || 'localhost'}`
  try {
    const out = await route(req, repo, env, { t, device, origin })
    const extra = { ...(out.type ? out.headers : {}), ...(setCookie ? { 'set-cookie': setCookie } : {}) }
    return out.type ? { status: out.status || 200, type: out.type, text: out.text, b64: out.b64, headers: extra } : { status: 200, json: out, headers: extra }
  } catch (e) {
    if (e.status) return { status: e.status, json: { error: e.error } }
    console.error(e); return { status: 500, json: { error: 'server' } }
  }
}
