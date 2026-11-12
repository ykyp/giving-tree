// Every server rule. No platform code here: the Vercel function, the Vite dev server and the single-file demo all
// call handle() with a request and a repository (server/repo-memory.js or server/repo-postgres.js).
import { RELEASE_UTC, FROZEN_UTC, isReleased, YEAR } from '../shared/season.js'
import { WISH_MAX, BRANCH_MAX, flagWish, badName } from '../shared/moderation.js'
import { copy, SITE } from '../shared/copy.js'
import { givingComplete } from './repo-memory.js'

const BOT = /bot\b|bot\/|crawl|spider|facebookexternalhit|whatsapp|slack|telegram|discord|linkedin|skypeuripreview|preview/i
const EVENTS = new Set(['share_v1', 'share_v2', 'saved_calendar', 'saved_selfsend'])
const LIMITS = { card: [864e5, 3], wish: [36e5, 10], log: [6e4, 20] } // per device: 3 cards a day on a tree, 10 wishes an hour
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

/** The pages link-preview bots get. People get the app. */
const ogPage = (title, text, image) => `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><meta property="og:site_name" content="${SITE}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(text)}"><meta property="og:type" content="website"><meta property="og:image" content="${image}"><meta name="twitter:card" content="summary_large_image">`
async function cardPreview(repo, card, thanks, origin, t) {
  const tree = await repo.getTree(card.tree), giving = givingOf(tree), b = await repo.getBranch(card.id), kind = thanks ? 'thanks' : 'invite'
  const waiting = visible(await repo.wishesFor(card.id)).filter(w => w.kind === 'friend').length
  const image = await repo.getPreview(card.id, kind) ? `${origin}/api/img/${card.id}/${kind}` : `${origin}/og.jpg`
  return ogPage(copy.previewTitle({ name: card.name, branchName: card.branchName, thanks }), copy.previewText({ giving, thanks, waiting, given: giving ? b.gifts * giving.perGift : 0, late: t >= RELEASE_UTC }), image)
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
  if (POST && a === 'card') { const c = await createCard(repo, t, device, body); return { id: c.id, token: c.token, name: c.name, design: c.design, hook: c.hook, parent: c.parent, tree: c.tree } }
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
  if (GET && a === 'preview' && b1 === 'tree') { const tree = await treeBySlug(repo, b2 || 'global'), counts = await repo.counts(tree.slug); return { type: 'text/html; charset=utf-8', text: ogPage(copy.treeTitle(tree), copy.treeText(counts), `${origin}/og.jpg`) } }
  if (GET && a === 'preview') { const c = await cardById(repo, b1); return { type: 'text/html; charset=utf-8', text: await cardPreview(repo, c, query.t != null, origin, t) } }
  if (GET && a === 'img') { const v = await repo.getPreview(b1, b2 === 'thanks' ? 'thanks' : 'invite'); if (!v) throw fail(404, 'no_image'); return { type: 'image/jpeg', b64: v, headers: { 'cache-control': 'public, max-age=3600' } } }

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
    return out.type ? { status: 200, type: out.type, text: out.text, b64: out.b64, headers: extra } : { status: 200, json: out, headers: extra }
  } catch (e) {
    if (e.status) return { status: e.status, json: { error: e.error } }
    console.error(e); return { status: 500, json: { error: 'server' } }
  }
}
