// The repository on Postgres (Supabase in production). Same operations as server/repo-memory.js, which documents the
// shapes. `sql` is a postgres.js client; tables and functions are in supabase/migrations.
import { WIPE_AT } from '../shared/season.js'

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const rid = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => ALPHABET[b % ALPHABET.length]).join('')
const day = d => d == null ? null : typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)

const toTree = r => r && ({ slug: r.slug, kind: r.kind, name: r.name, published: r.published, createdBy: r.created_by ?? null,
  giving: { enabled: r.giving_enabled, status: r.giving_status, sponsor: r.sponsor_name, charityName: r.charity_name, charityReg: r.charity_reg, perGift: r.per_gift_pence, cap: r.cap_pence,
    given: r.given_pence, starts: day(r.starts_on), ends: day(r.ends_on), agreementSigned: r.agreement_signed, payout: r.payout } })
const toCard = r => r && ({ id: r.id, token: r.token, tree: r.tree, name: r.name, design: r.design, hook: r.hook, parent: r.parent, branchName: r.branch_name, device: r.device, at: Number(r.at), hidden: r.hidden,
  seq: Number(r.seq), ...(r.removed_at != null ? { removedAt: Number(r.removed_at) } : {}) })
const toWish = r => r && ({ id: r.id, to: r.card_id, from: r.from_name, text: r.body, kind: r.kind, device: r.device, status: r.status, at: Number(r.at), opened: r.opened, reported: r.reported })

export function postgresRepo(sql, { now = Date.now } = {}) {
  /** Wishes and emails are deleted on 1 February (a scheduled job does it; this makes sure nothing is served after). */
  const wiped = () => now() >= WIPE_AT
  return {
    // ---- trees ----
    async getTree(slug) { return toTree((await sql`select * from trees where slug = ${slug}`)[0]) || null },
    async listTrees() { return (await sql`select * from trees order by kind desc, created_at`).map(toTree) },
    async createTree({ slug, name, published = true, createdBy = null }) { return toTree((await sql`insert into trees (slug, name, published, created_by) values (${slug}, ${name}, ${published}, ${createdBy}) on conflict do nothing returning *`)[0]) || null },
    async reportTree(slug, device, at) { await sql`insert into tree_reports (tree, device, at) values (${slug}, ${device}, ${at}) on conflict do nothing`; return (await sql`select count(*)::int as n from tree_reports where tree = ${slug}`)[0].n },
    async takeDownTree(slug, at) { return (await sql`update trees set published = false, taken_down_at = ${at} where slug = ${slug} and kind <> 'global' returning slug`).length > 0 },
    /** Changes the settings, never the recorded total. */
    async setGiving(slug, g) {
      return toTree((await sql`update trees set giving_enabled = ${!!g.enabled}, giving_status = ${g.status}, sponsor_name = ${g.sponsor ?? null}, charity_name = ${g.charityName ?? null}, charity_reg = ${g.charityReg ?? null},
        per_gift_pence = ${g.perGift ?? null}, cap_pence = ${g.cap ?? null}, starts_on = ${g.starts ?? null}, ends_on = ${g.ends ?? null}, agreement_signed = ${!!g.agreementSigned}, payout = ${g.payout ?? null}
        where slug = ${slug} returning *`)[0]) || null
    },
    async counts(slug) {
      const [r] = await sql`select (select count(*) from cards where tree = ${slug} and not hidden)::int as ornaments,
        (select count(*) from wishes w join cards c on c.id = w.card_id where c.tree = ${slug} and w.status = 'ok')::int as wishes`
      return { ornaments: r.ornaments, wishes: wiped() ? 0 : r.wishes }
    },
    async latestOrnaments(slug, since = 0, n = 120) {
      const rows = await sql`select id, name, design, hook, parent, at from cards where tree = ${slug} and not hidden and seq > ${since} order by seq desc limit ${n}`
      const [c] = await sql`select coalesce(max(seq), 0)::bigint as cursor from cards where tree = ${slug}`
      return { ornaments: rows.map(r => ({ id: r.id, name: r.name, design: r.design, hook: r.hook, parent: r.parent, at: Number(r.at) })), cursor: Math.max(Number(since) || 0, Number(c.cursor)) }
    },
    async keepsakeNames(slug) { return (await sql`select name from cards where tree = ${slug} and not hidden order by seq`).map(r => r.name) },

    // ---- cards and branches ----
    async createCard({ tree, name, design, hook, parent, device, at }) {
      return toCard((await sql`insert into cards (id, token, tree, name, design, hook, parent, device, at) values (${rid(9)}, ${rid(24)}, ${tree}, ${name}, ${design}, ${hook}, ${parent || null}, ${device}, ${at}) returning *`)[0])
    },
    async getCard(id) { return toCard((await sql`select * from cards where id = ${id}`)[0]) || null },
    async getCardByToken(token) { return toCard((await sql`select * from cards where token = ${token}`)[0]) || null },
    async getBranch(id) {
      const kids = await sql`select * from cards where parent = ${id} and not hidden order by seq`
      const [o] = await sql`select count(*) filter (where reason is distinct from 'own')::int as opened, count(*) filter (where counted)::int as gifts from opens where card_id = ${id}`
      return { kids: kids.map(toCard), opened: o.opened, gifts: o.gifts }
    },
    async setBranchName(id, name) { await sql`update cards set branch_name = ${name} where id = ${id}` },
    async usedHooks(parentId) { return (await sql`select hook from cards where id = ${parentId} or parent = ${parentId}`).map(r => r.hook) },

    // ---- wishes ----
    /** One friend wish per device per card and one self-wish per card (unique indexes): a second returns null. */
    async leaveWish({ to, from, text, kind, device, status, at }) {
      if (wiped()) return null
      return toWish((await sql`insert into wishes (id, card_id, from_name, body, kind, device, status, at) values (${rid(12)}, ${to}, ${from}, ${text}, ${kind}, ${device}, ${status}, ${at}) on conflict do nothing returning *`)[0]) || null
    },
    async wishedOn(slug, device) { return wiped() ? [] : (await sql`select distinct w.card_id from wishes w join cards c on c.id = w.card_id where c.tree = ${slug} and w.kind = 'friend' and w.device = ${device}`).map(r => r.card_id) },
    async hasWished(cardId, device) { return !wiped() && (await sql`select 1 from wishes where card_id = ${cardId} and kind = 'friend' and device = ${device}`).length > 0 },
    async wishesFor(cardId) { return wiped() ? [] : (await sql`select * from wishes where card_id = ${cardId} order by at, id`).map(toWish) },
    async getWish(id) { return wiped() ? null : toWish((await sql`select * from wishes where id = ${id}`)[0]) || null },
    async markOpened(id) { await sql`update wishes set opened = true where id = ${id}` },
    async reportWish(id) { await sql`update wishes set status = 'review', reported = true where id = ${id}` },
    async reviewQueue() { return wiped() ? [] : (await sql`select * from wishes where status = 'review' order by at`).map(toWish) },
    async decideWish(id, status) { return (await sql`update wishes set status = ${status} where id = ${id} returning status`)[0]?.status || null },
    async oldestWaiting() { const [r] = await sql`select min(at) as at from wishes where status = 'review'`; return wiped() || r.at == null ? null : Number(r.at) },

    // ---- wishes sent to someone who has no ornament yet ----
    async sendWish({ tree, from, to, text, design = null, device, status, at }) { const token = rid(24); await sql`insert into sent_wishes (token, tree, from_name, to_name, body, design, device, status, at) values (${token}, ${tree}, ${from}, ${to}, ${text}, ${design}, ${device}, ${status}, ${at})`; return { token } },
    /** Never includes the words. */
    async getSentWish(token) { if (wiped()) return null; const r = (await sql`select token, tree, from_name, to_name, design, device, status, claimed_by from sent_wishes where token = ${token}`)[0]; return r ? { token: r.token, tree: r.tree, from: r.from_name, to: r.to_name, design: r.design, device: r.device, status: r.status, claimedBy: r.claimed_by } : null },
    async claimSentWish(token, cardId, at) { if (wiped()) return 'no_wish'; return (await sql`select claim_sent_wish(${token}, ${cardId}, ${rid(12)}, ${at}) as out`)[0].out },

    // ---- opens and the gift record ----
    async recordOpen({ cardId, device, at, day }) { const [r] = await sql`select record_open(${cardId}, ${device}, ${at}, ${day}) as out`; return r.out },
    async gifts(slug) { return (await sql`select tree, card_id, amount_pence, name, at from gifts where tree = ${slug} order by id`).map(g => ({ tree: g.tree, cardId: g.card_id, amount: g.amount_pence, name: g.name, at: Number(g.at) })) },

    // ---- measures ----
    async addEvent(tree, name, at) { await sql`insert into events (tree, name, at) values (${tree}, ${name}, ${at})` },
    async markReturned(cardId) { return (await sql`insert into returned (card_id) values (${cardId}) on conflict do nothing returning card_id`).length > 0 },
    async measures(slug, releaseAt) {
      const [m] = await sql`select
        (select count(*) from cards where tree = ${slug})::int as cards,
        (select count(*) from wishes w join cards c on c.id = w.card_id where c.tree = ${slug} and w.kind = 'friend')::int as wishes,
        (select count(*) from wishes w join cards c on c.id = w.card_id where c.tree = ${slug} and w.kind = 'self')::int as self_wishes,
        (select count(*) from opens o join cards c on c.id = o.card_id where c.tree = ${slug} and o.reason is distinct from 'own' and o.at < ${releaseAt})::int as opens_v1,
        (select count(*) from opens o join cards c on c.id = o.card_id where c.tree = ${slug} and o.reason is distinct from 'own' and o.at >= ${releaseAt})::int as opens_v2,
        (select given_pence from trees where slug = ${slug}) as given`
      const ev = Object.fromEntries((await sql`select name, count(*)::int as n from events where tree = ${slug} group by name`).map(r => [r.name, r.n]))
      return { ...m, share_v1: ev.share_v1 || 0, share_v2: ev.share_v2 || 0, saved_calendar: ev.saved_calendar || 0, saved_selfsend: ev.saved_selfsend || 0, saved_email: ev.saved_email || 0, returns: ev.returned || 0 }
    },

    // ---- reminders, previews ----
    async saveReminder(token, r) { await sql`insert into reminders (token, email, news, tree) values (${token}, ${r.email}, ${!!r.news}, ${r.tree}) on conflict (token) do update set email = excluded.email, news = excluded.news, sent = false` },
    async hasReminder(token) { return !wiped() && (await sql`select 1 from reminders where token = ${token}`).length > 0 },
    async unsentReminders() { return wiped() ? [] : (await sql`select token, email, news, tree from reminders where not sent`).map(r => ({ ...r })) },
    async markReminderSent(token) { await sql`update reminders set sent = true where token = ${token}` },
    async savePreview(cardId, kind, b64) { await sql`insert into previews (card_id, kind, jpeg_b64) values (${cardId}, ${kind}, ${b64}) on conflict (card_id, kind) do update set jpeg_b64 = excluded.jpeg_b64` },
    async getPreview(cardId, kind) { return (await sql`select jpeg_b64 from previews where card_id = ${cardId} and kind = ${kind}`)[0]?.jpeg_b64 || null },

    // ---- operators ----
    async isOperator(email) { return (await sql`select 1 from operators where lower(email) = lower(${email})`).length > 0 },
    async hideCard(id, hidden) { const r = (await sql`update cards set hidden = ${!!hidden} where id = ${id} returning hidden`)[0]; return r ? r.hidden : null },
    async removeCard(id, note, at) { const [r] = await sql`select remove_card(${id}, ${note || null}, ${at}) as ok`; return r.ok },

    // ---- abuse limits ----
    /** Counts one attempt; false once `max` attempts were already made in this window. One atomic statement. */
    async hit(device, action, windowMs, max, at) {
      const key = `${device}|${action}|${Math.floor(at / windowMs)}`
      return (await sql`insert into limits (key, count) values (${key}, 1) on conflict (key) do update set count = limits.count + 1 where limits.count < ${max} returning count`).length > 0
    },
    async sweepLimits(at) { const d = '%|' + Math.floor(at / 864e5), h = '%|' + Math.floor(at / 36e5), m = '%|' + Math.floor(at / 6e4); await sql`delete from limits where key not like ${d} and key not like ${h} and key not like ${m}` },
  }
}
