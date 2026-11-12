// Every server rule for the two visits. No platform code here: the Vercel function, the Vite dev server and the
// no-server demo all call handle() with a request and a store.
import { BRANDS } from '../src/config.js'
import { RELEASE_UTC, FROZEN_UTC, WIPE_AT, isReleased, YEAR } from '../shared/season.js'
import { WISH_MAX, BRANCH_MAX, flagWish, badName } from '../shared/moderation.js'

const BOT = /bot\b|bot\/|crawl|spider|facebookexternalhit|whatsapp|slack|telegram|discord|linkedin|skypeuripreview|preview/i
const EVENTS = new Set(['share_v1', 'share_v2', 'saved_calendar', 'saved_selfsend'])
const METRICS = ['cards', 'wishes', 'self_wishes', 'opens_v1', 'opens_v2', 'share_v1', 'share_v2', 'saved_calendar', 'saved_selfsend', 'saved_email', 'returns']
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const rid = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => ALPHABET[b % ALPHABET.length]).join('')
const fail = (status, error) => Object.assign(new Error(error), { status, error })
const firstName = v => String(v || '').trim().split(/\s+/)[0].slice(0, 12)
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const pence = p => '£' + (p / 100).toFixed(2)
const cookies = h => Object.fromEntries((h || '').split(';').map(c => c.trim().split('=')).filter(c => c[0]))
const sample = (env, b) => env.sampleTotals ? b.opened : 0

const getJ = async (kv, k) => { const v = await kv.get(k); return v == null ? null : JSON.parse(v) }
const mgetJ = async (kv, keys) => (await kv.mget(keys)).filter(v => v != null).map(v => JSON.parse(v))
const metric = (kv, brand, name, n = 1) => kv.incrby(`m:${brand}:${name}`, n)
const pub = c => ({ id: c.id, name: c.name, design: c.design, hook: c.hook })

function brandOf(slug) { const b = BRANDS[slug]; if (!b) throw fail(400, 'unknown_brand'); return b }
async function cardById(kv, id) { const c = await getJ(kv, `card:${id}`); if (!c) throw fail(404, 'no_card'); return c }
async function cardByToken(kv, token) { const id = await kv.get(`tok:${token}`); if (!id) throw fail(404, 'no_link'); return cardById(kv, id) }

async function tree(kv, env, slug) {
  const b = brandOf(slug), counted = Number(await kv.get(`given:${slug}`) || 0), given = sample(env, b) * b.per + counted
  return { given, opened: Math.round(given / b.per), cap: b.cap, complete: given >= b.cap }
}
async function branch(kv, card) {
  const kids = await mgetJ(kv, (await kv.lrange(`kids:${card.id}`)).map(id => `card:${id}`))
  return { name: card.branchName || null, kids: kids.map(pub) }
}
async function wishesFor(kv, id) { return mgetJ(kv, (await kv.lrange(`wl:${id}`)).map(w => `w:${w}`)) }
const visible = list => list.filter(w => w.status === 'ok')

async function createCard(kv, t, device, { brand, name, design, hook, parent }) {
  if (t >= FROZEN_UTC) throw fail(410, 'frozen')
  const b = brandOf(brand), n = firstName(name), d = Number(design), h = Number(hook)
  if (!n || badName(n)) throw fail(400, 'bad_name')
  if (!Number.isInteger(d) || d < 0 || d > 7 || !Number.isInteger(h) || h < 0 || h > 999) throw fail(400, 'bad_card')
  let parentId = null
  if (parent) { const p = await cardById(kv, parent); if (p.brand !== b.slug) throw fail(400, 'wrong_tree'); parentId = p.id }
  const card = { id: rid(9), token: rid(24), brand: b.slug, name: n, design: d, hook: h, parent: parentId, device, at: t }
  await kv.set(`card:${card.id}`, JSON.stringify(card)); await kv.set(`tok:${card.token}`, card.id)
  await kv.rpush(`names:${b.slug}`, n)
  if (parentId) await kv.rpush(`kids:${parentId}`, card.id)
  await metric(kv, b.slug, 'cards')
  return card
}
async function storeWish(kv, card, { from, text, kind }, t) {
  const clean = String(text || '').trim()
  if (!clean || clean.length > WISH_MAX) throw fail(400, 'bad_wish')
  const w = { id: rid(12), to: card.id, from, text: clean, kind, at: t, opened: false, status: flagWish(clean) ? 'review' : 'ok' }
  await kv.set(`w:${w.id}`, JSON.stringify(w), { exat: WIPE_AT })
  await kv.rpush(`wl:${card.id}`, w.id); await kv.expireat(`wl:${card.id}`, WIPE_AT)
  if (w.status === 'review') { await kv.rpush('review', w.id); await kv.expireat('review', WIPE_AT) }
  await metric(kv, card.brand, kind === 'self' ? 'self_wishes' : 'wishes')
  return w
}

function icsFor(card, origin) {
  const fold = l => { const out = []; while (l.length > 73) { out.push(l.slice(0, 73)); l = ' ' + l.slice(73) } out.push(l); return out.join('\r\n') }
  const url = `${origin}/me/${card.token}`
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MosaicAds//The Giving Tree//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${card.id}@giving-tree`, `DTSTAMP:${YEAR}1101T000000Z`,
    `DTSTART:${YEAR}1225T090000`, `DTEND:${YEAR}1225T093000`, 'SUMMARY:Open your Christmas wishes 🎁', `DESCRIPTION:Your wishes are waiting on the Giving Tree: ${url}`, `URL:${url}`, 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n'
}

/** The page link-preview bots get. People get the app. */
async function previewPage(kv, env, card, thanks, origin) {
  const b = brandOf(card.brand), count = Number(await kv.get(`count:${card.id}`) || 0), waiting = visible(await wishesFor(kv, card.id)).filter(w => w.kind === 'friend').length
  const kind = thanks ? 'thanks' : 'invite', hasImg = await kv.get(`img:${card.id}:${kind}`)
  const title = thanks ? `Thank you from ${card.branchName || `${card.name}'s branch`}` : `${card.name} hung an ornament on the Giving Tree`
  const desc = thanks ? `Our branch gave ${pence(count * b.per)} to ${b.charity.name}. Open yours.` : `${waiting} ${waiting === 1 ? 'wish' : 'wishes'} waiting. Open it and ${b.name} gives ${b.per}p to ${b.charity.name}.`
  return `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">${hasImg ? `<meta property="og:image" content="${origin}/api/img/${card.id}/${kind}"><meta name="twitter:card" content="summary_large_image">` : ''}`
}

async function route(req, kv, env, ctx) {
  const { method, query = {}, body = {}, headers = {} } = req, { t, device, origin } = ctx
  const [a, b1, b2] = req.path.replace(/^\/+|\/+$/g, '').split('/')
  const GET = method === 'GET', POST = method === 'POST'

  if (GET && a === 'health') return { ok: true, email: !!env.emailEnabled, devClock: !!env.devClock }
  if (GET && a === 'tree') return tree(kv, env, b1)

  if (POST && a === 'card') { const c = await createCard(kv, t, device, body); return { id: c.id, token: c.token, name: c.name, design: c.design, hook: c.hook, parent: c.parent, brand: c.brand } }
  if (GET && a === 'card') {
    const c = await cardById(kv, b1), wishes = visible(await wishesFor(kv, c.id))
    return { ...pub(c), brand: c.brand, branch: await branch(kv, c), waiting: wishes.filter(w => w.kind === 'friend').length, left: !!(await kv.get(`wd:${c.id}:${device}`)), own: c.device === device }
  }

  // Counting the gift: first open from a new device, never the sender's, never a bot, stops at the cap.
  if (POST && a === 'open') {
    const c = await cardById(kv, body.id), br = brandOf(c.brand), done = reason => ({ counted: false, reason })
    if (t >= FROZEN_UTC) return done('closed')
    if (BOT.test(headers['user-agent'] || '')) return done('bot')
    if (c.device === device) return done('own')
    if (!await kv.set(`open:${c.id}:${device}`, '1', { nx: true })) return done('again')
    const after = await kv.incrby(`given:${c.brand}`, br.per)
    if (sample(env, br) * br.per + after > br.cap) { await kv.incrby(`given:${c.brand}`, -br.per); await kv.del(`open:${c.id}:${device}`); return done('cap') }
    await kv.incrby(`count:${c.id}`, 1); await metric(kv, c.brand, t >= RELEASE_UTC ? 'opens_v2' : 'opens_v1')
    return { counted: true, tree: await tree(kv, env, c.brand) }
  }

  if (POST && a === 'wish') {
    const c = await cardById(kv, body.to), from = firstName(body.from)
    if (t >= FROZEN_UTC) throw fail(410, 'frozen')
    if (c.device === device) throw fail(400, 'own_card')
    if (!from || badName(from)) throw fail(400, 'bad_name')
    if (!String(body.text || '').trim() || String(body.text).trim().length > WISH_MAX) throw fail(400, 'bad_wish')
    if (!await kv.set(`wd:${c.id}:${device}`, '1', { nx: true, exat: WIPE_AT })) throw fail(409, 'already')
    await storeWish(kv, c, { from, text: body.text, kind: 'friend' }, t)
    return { sealed: true } // never echoes the words, and never says whether it was flagged
  }

  if (GET && a === 'ics') { const c = await cardByToken(kv, b1); return { type: 'text/calendar; charset=utf-8', text: icsFor(c, origin), headers: { 'content-disposition': 'attachment; filename="christmas-wishes.ics"' } } }
  if (GET && a === 'preview') { const c = await cardById(kv, b1); return { type: 'text/html; charset=utf-8', text: await previewPage(kv, env, c, query.t != null, origin) } }
  if (GET && a === 'img') { const v = await kv.get(`img:${b1}:${b2}`); if (!v) throw fail(404, 'no_image'); return { type: 'image/jpeg', b64: v, headers: { 'cache-control': 'public, max-age=3600' } } }
  if (GET && a === 'keepsake') { const tr = await tree(kv, env, b1); return { ...tr, names: (await kv.lrange(`names:${b1}`)).slice(0, 20000) } }

  if (a === 'me') {
    const c = await cardByToken(kv, b1), br = brandOf(c.brand)
    if (GET && !b2) {
      const day = /^\d{4}-\d{2}-\d{2}$/.test(query.day || '') ? query.day : new Date(t).toISOString().slice(0, 10)
      const released = isReleased(t, day), list = visible(await wishesFor(kv, c.id)), bq = await branch(kv, c), count = Number(await kv.get(`count:${c.id}`) || 0)
      if (released && await kv.set(`ret:${c.id}`, '1', { nx: true })) await metric(kv, c.brand, 'returns')
      return { card: { id: c.id, token: c.token, name: c.name, design: c.design, hook: c.hook, parent: c.parent, brand: c.brand }, branch: bq, released,
        stats: { ornaments: 1 + bq.kids.length, opened: count, given: count * br.per }, tree: await tree(kv, env, c.brand), reminded: !!(await kv.get(`rem:${c.token}`)),
        wishes: list.map(w => ({ id: w.id, from: w.from, kind: w.kind, opened: w.opened, ...(released ? { text: w.text } : {}) })) }
    }
    if (POST && b2 === 'branch') { const n = String(body.name || '').trim().slice(0, BRANCH_MAX); if (n && badName(n)) throw fail(400, 'bad_name'); c.branchName = n || null; await kv.set(`card:${c.id}`, JSON.stringify(c)); return { name: c.branchName } }
    if (POST && b2 === 'wish') {
      if (t >= FROZEN_UTC) throw fail(410, 'frozen')
      if (!await kv.set(`self:${c.id}`, '1', { nx: true, exat: WIPE_AT })) throw fail(409, 'already')
      const w = await storeWish(kv, c, { from: c.name, text: body.text, kind: 'self' }, t); return { sealed: true, id: w.id }
    }
    if (POST && (b2 === 'opened' || b2 === 'report')) {
      const w = await getJ(kv, `w:${body.id}`); if (!w || w.to !== c.id) throw fail(404, 'no_wish')
      const day = /^\d{4}-\d{2}-\d{2}$/.test(body.day || '') ? body.day : new Date(t).toISOString().slice(0, 10)
      if (!isReleased(t, day)) throw fail(403, 'sealed')
      if (b2 === 'opened') w.opened = true; else { w.status = 'review'; w.reported = true; await kv.rpush('review', w.id); await kv.expireat('review', WIPE_AT) }
      await kv.set(`w:${w.id}`, JSON.stringify(w), { exat: WIPE_AT }); return { ok: true }
    }
    if (POST && b2 === 'reminder') {
      if (!env.emailEnabled) throw fail(404, 'email_off')
      const email = String(body.email || '').trim(); if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw fail(400, 'bad_email')
      await kv.set(`rem:${c.token}`, JSON.stringify({ email, news: body.news === true, brand: c.brand }), { exat: WIPE_AT })
      await kv.rpush('reminders', c.token); await kv.expireat('reminders', WIPE_AT); await metric(kv, c.brand, 'saved_email'); return { ok: true }
    }
    if (POST && b2 === 'preview') {
      const kind = body.kind === 'thanks' ? 'thanks' : 'invite', m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.jpeg || ''))
      if (!m || m[1].length > 280000) throw fail(400, 'bad_image')
      await kv.set(`img:${c.id}:${kind}`, m[1]); return { ok: true }
    }
  }

  if (POST && a === 'event') { if (!EVENTS.has(body.name)) throw fail(400, 'bad_event'); brandOf(body.brand); await metric(kv, body.brand, body.name); return { ok: true } }

  if (a === 'cron' && b1 === 'email') {
    if (headers.authorization !== `Bearer ${env.cronSecret}` || !env.cronSecret) throw fail(401, 'nope')
    if (!env.emailEnabled) return { sent: 0 }
    let sent = 0
    for (const token of new Set(await kv.lrange('reminders'))) {
      const r = await getJ(kv, `rem:${token}`); if (!r || r.sent) continue
      await env.sendEmail({ to: r.email, subject: 'Open your Christmas wishes 🎁', text: `Your wishes are ready on the Giving Tree: ${origin}/me/${token}\n\nThis is the one email we said we'd send.` })
      r.sent = true; await kv.set(`rem:${token}`, JSON.stringify(r), { exat: WIPE_AT }); sent++
    }
    return { sent }
  }

  if (a === 'admin') {
    if (!env.adminSecret || headers.authorization !== `Bearer ${env.adminSecret}`) throw fail(401, 'nope')
    if (GET && b1 === 'metrics') { const brand = brandOf(query.brand).slug, vals = await kv.mget(METRICS.map(m => `m:${brand}:${m}`)); return { ...Object.fromEntries(METRICS.map((m, i) => [m, Number(vals[i] || 0)])), ...(await tree(kv, env, brand)) } }
    if (GET && b1 === 'review') return { wishes: (await mgetJ(kv, [...new Set(await kv.lrange('review'))].map(id => `w:${id}`))).filter(w => w.status === 'review') }
    if (POST && b1 === 'review') { const w = await getJ(kv, `w:${b2}`); if (!w) throw fail(404, 'no_wish'); if (body.action !== 'approve' && body.action !== 'reject') throw fail(400, 'bad_action'); w.status = body.action === 'approve' ? 'ok' : 'rejected'; await kv.set(`w:${w.id}`, JSON.stringify(w), { exat: WIPE_AT }); return { status: w.status } }
  }

  // Test helpers for the demo panel. Only when the date can be faked, never on the live site.
  if (env.devClock && POST && a === 'demo') {
    if (b1 === 'card') { const c = await createCard(kv, t, 'demo-' + rid(6), { brand: body.brand, name: body.name, design: body.design, hook: body.hook }); return { id: c.id } }
    if (b1 === 'friend') {
      const c = await cardById(kv, body.to), used = new Set((await branch(kv, c)).kids.map(k => k.hook)), d = 'demo-' + rid(6)
      let hook = Number(body.hook) || 0; while (used.has(hook)) hook++
      await createCard(kv, t, d, { brand: c.brand, name: body.name, design: body.design, hook, parent: c.id })
      await storeWish(kv, c, { from: firstName(body.name), text: body.text, kind: 'friend' }, t)
      const br = brandOf(c.brand) // the made-up friend's open obeys the cap, like a real one
      if (sample(env, br) * br.per + Number(await kv.get(`given:${c.brand}`) || 0) + br.per <= br.cap) { await kv.set(`open:${c.id}:${d}`, '1'); await kv.incrby(`given:${c.brand}`, br.per); await kv.incrby(`count:${c.id}`, 1) }
      return { ok: true }
    }
  }
  throw fail(404, 'not_found')
}

export async function handle(req, kv, env = {}) {
  const headers = req.headers || {}, clock = env.devClock && headers['x-gt-clock'] ? Date.parse(headers['x-gt-clock']) : NaN, t = Number.isNaN(clock) ? Date.now() : clock
  let device = (env.devClock && headers['x-gt-device']) || cookies(headers.cookie).gt_d, setCookie
  if (!device) { device = rid(16); setCookie = `gt_d=${device}; Path=/; Max-Age=15552000; HttpOnly; SameSite=Lax; Secure` }
  const origin = env.origin || `https://${headers['x-forwarded-host'] || headers.host || 'christmas.mosaicads.ai'}`
  try {
    const out = await route(req, kv, env, { t, device, origin })
    const extra = { ...(out.type ? out.headers : {}), ...(setCookie ? { 'set-cookie': setCookie } : {}) }
    return out.type ? { status: 200, type: out.type, text: out.text, b64: out.b64, headers: extra } : { status: 200, json: out, headers: extra }
  } catch (e) {
    if (e.status) return { status: e.status, json: { error: e.error } }
    console.error(e); return { status: 500, json: { error: 'server' } }
  }
}
