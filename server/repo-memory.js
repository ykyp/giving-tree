// The repository the rules in app.js depend on, kept in memory. Used by the tests, by `npm run dev` (saved to a file)
// and by the single-file demo (saved in the browser). server/repo-postgres.js implements the same operations on Supabase.
//
// Shapes
//   tree    { slug, kind: 'global'|'community', name, published, giving }
//   giving  { enabled, status: 'off'|'live'|'paused'|'ended', sponsor, charityName, charityReg, perGift, cap, given,
//             starts, ends, agreementSigned, payout }
//   card    { id, token, tree, name, design, hook, parent, branchName, device, at, hidden }
//   wish    { id, to, from, text, kind: 'friend'|'self', device, status: 'ok'|'review'|'rejected', at, opened, reported }
import { WIPE_AT } from '../shared/season.js'

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const rid = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => ALPHABET[b % ALPHABET.length]).join('')
export const GIVING_OFF = { enabled: false, status: 'off', sponsor: null, charityName: null, charityReg: null, perGift: null, cap: null, given: 0, starts: null, ends: null, agreementSigned: false, payout: null }
export const GLOBAL_TREE = { slug: 'global', kind: 'global', name: 'The Giving Tree', published: true, giving: { ...GIVING_OFF } }
/** Giving can only be live with every setting present and the agreement signed. */
export const givingComplete = g => !!(g.enabled && g.agreementSigned && g.sponsor && g.charityName && g.charityReg && g.perGift > 0 && g.cap > 0)

const EMPTY = () => ({ trees: {}, cards: {}, tokens: {}, kids: {}, wishes: {}, wishList: {}, opens: {}, gifts: [], events: [], returned: {}, reminders: {}, previews: {}, limits: {}, removals: [], sent: {}, reports: {}, seq: 0 })

export function memoryRepo({ load, save, now = Date.now, seed = [] } = {}) {
  const s = { ...EMPTY(), ...(load?.() || {}) }
  for (const t of [GLOBAL_TREE, ...seed]) if (!s.trees[t.slug]) s.trees[t.slug] = structuredClone(t)
  const persist = () => save?.(s)
  const copy = v => v == null ? null : structuredClone(v)
  /** Wishes and emails are deleted on 1 February. */
  const purge = () => { if (now() >= WIPE_AT && (Object.keys(s.wishes).length || Object.keys(s.reminders).length || Object.keys(s.sent).length)) { s.wishes = {}; s.wishList = {}; s.reminders = {}; s.sent = {}; persist() } }
  const cardsOf = slug => Object.values(s.cards).filter(c => c.tree === slug)
  const opensOf = id => Object.entries(s.opens).filter(([k]) => k.startsWith(id + '|')).map(([, o]) => o)

  return {
    // ---- trees ----
    async getTree(slug) { return copy(s.trees[slug]) },
    async listTrees() { return Object.values(s.trees).map(copy) },
    async createTree({ slug, name, published = true, createdBy = null }) { if (s.trees[slug]) return null; s.trees[slug] = { slug, kind: 'community', name, published, createdBy, giving: { ...GIVING_OFF } }; persist(); return copy(s.trees[slug]) },
    /** One report per device per tree. Returns how many devices have reported it. */
    async reportTree(slug, device, at) { (s.reports[slug] ||= {})[device] ||= at; persist(); return Object.keys(s.reports[slug]).length },
    async takeDownTree(slug, at) { const t = s.trees[slug]; if (!t || t.kind === 'global') return false; t.published = false; t.takenDownAt = at; persist(); return true },
    async setGiving(slug, giving) { const t = s.trees[slug]; if (!t) return null; t.giving = { ...t.giving, ...giving, given: t.giving.given }; persist(); return copy(t) },
    async counts(slug) { purge(); const ids = new Set(cardsOf(slug).map(c => c.id)); return { ornaments: cardsOf(slug).filter(c => !c.hidden).length, wishes: Object.values(s.wishes).filter(w => ids.has(w.to) && w.status === 'ok').length } },
    /** Newest first. `since` is the cursor from the last call; only newer ornaments come back. */
    async latestOrnaments(slug, since = 0, n = 120) {
      const list = cardsOf(slug).filter(c => !c.hidden && c.seq > since).sort((a, b) => b.seq - a.seq).slice(0, n)
      return { ornaments: list.map(c => ({ id: c.id, name: c.name, design: c.design, hook: c.hook, parent: c.parent, at: c.at })), cursor: Math.max(since, ...cardsOf(slug).map(c => c.seq), 0) }
    },
    async keepsakeNames(slug) { return cardsOf(slug).filter(c => !c.hidden).sort((a, b) => a.seq - b.seq).map(c => c.name) },

    // ---- cards and branches ----
    async createCard({ tree, name, design, hook, parent, device, at }) {
      const c = { id: rid(9), token: rid(24), tree, name, design, hook, parent: parent || null, branchName: null, device, at, hidden: false, seq: ++s.seq }
      s.cards[c.id] = c; s.tokens[c.token] = c.id; if (c.parent) (s.kids[c.parent] ||= []).push(c.id); persist(); return copy(c)
    },
    async getCard(id) { return copy(s.cards[id]) },
    async getCardByToken(token) { return copy(s.cards[s.tokens[token]]) },
    async getBranch(id) { return { kids: (s.kids[id] || []).map(k => s.cards[k]).filter(c => c && !c.hidden).map(copy), opened: opensOf(id).filter(o => o.reason !== 'own').length, gifts: opensOf(id).filter(o => o.counted).length } },
    async setBranchName(id, name) { s.cards[id].branchName = name; persist() },
    async usedHooks(parentId) { return [s.cards[parentId]?.hook, ...(s.kids[parentId] || []).map(k => s.cards[k]?.hook)] },

    // ---- wishes ----
    /** One friend wish per device per card, one self-wish per card: a second returns null. */
    async leaveWish({ to, from, text, kind, device, status, at }) {
      purge()
      const dup = Object.values(s.wishes).some(w => w.to === to && (kind === 'self' ? w.kind === 'self' : w.kind === 'friend' && w.device === device))
      if (dup) return null
      const w = { id: rid(12), to, from, text, kind, device, status, at, opened: false, reported: false }
      s.wishes[w.id] = w; (s.wishList[to] ||= []).push(w.id); persist(); return copy(w)
    },
    /** The ornaments on a tree this device has left a wish for. */
    async wishedOn(slug, device) { purge(); return [...new Set(Object.values(s.wishes).filter(w => w.kind === 'friend' && w.device === device && s.cards[w.to]?.tree === slug).map(w => w.to))] },
    async hasWished(cardId, device) { purge(); return Object.values(s.wishes).some(w => w.to === cardId && w.kind === 'friend' && w.device === device) },
    async wishesFor(cardId) { purge(); return (s.wishList[cardId] || []).map(id => s.wishes[id]).filter(Boolean).map(copy) },
    async getWish(id) { purge(); return copy(s.wishes[id]) },
    async markOpened(id) { if (s.wishes[id]) { s.wishes[id].opened = true; persist() } },
    async reportWish(id) { if (s.wishes[id]) { Object.assign(s.wishes[id], { status: 'review', reported: true }); persist() } },
    async reviewQueue() { purge(); return Object.values(s.wishes).filter(w => w.status === 'review').sort((a, b) => a.at - b.at).map(copy) },
    async decideWish(id, status) { if (!s.wishes[id]) return null; s.wishes[id].status = status; persist(); return status },
    async oldestWaiting() { purge(); const q = Object.values(s.wishes).filter(w => w.status === 'review'); return q.length ? Math.min(...q.map(w => w.at)) : null },

    // ---- wishes sent to someone who has no ornament yet ----
    async sendWish({ tree, from, to, text, design = null, device, status, at }) { purge(); const token = rid(24); s.sent[token] = { token, tree, from, to, text, design, device, status, at, claimedBy: null, claimedAt: null }; persist(); return { token } },
    /** Never includes the words. */
    async getSentWish(token) { purge(); const w = s.sent[token]; return w ? { token: w.token, tree: w.tree, from: w.from, to: w.to, design: w.design ?? null, device: w.device, status: w.status, claimedBy: w.claimedBy } : null },
    /** Turns a sent wish into an ordinary wish for this card. Once, and never for its own sender. */
    async claimSentWish(token, cardId, at) {
      purge(); const w = s.sent[token], c = s.cards[cardId]
      if (!w || w.status === 'rejected') return 'no_wish'
      if (w.claimedAt != null) return 'claimed'
      if (c.device === w.device) return 'own_wish'
      if (c.tree !== w.tree) return 'wrong_tree'
      if (Object.values(s.wishes).some(x => x.to === cardId && x.kind === 'friend' && x.device === w.device)) return 'already'
      const wish = { id: rid(12), to: cardId, from: w.from, text: w.text, kind: 'friend', device: w.device, status: w.status, at: w.at, opened: false, reported: false }
      s.wishes[wish.id] = wish; (s.wishList[cardId] ||= []).push(wish.id); w.claimedBy = cardId; w.claimedAt = at; persist(); return 'ok'
    },

    // ---- opens and the gift record ----
    /**
     * The first open of a card by a device. Atomic: a gift is released only if the tree's giving is live, in its dates,
     * and the pot stays within its cap. With giving off the open is still recorded (for the measures) and nothing is given.
     */
    async recordOpen({ cardId, device, at, day }) {
      const card = s.cards[cardId], key = cardId + '|' + device
      if (card.device === device) { s.opens[key] ||= { counted: false, reason: 'own', at }; persist(); return { counted: false, reason: 'own' } }
      if (s.opens[key]) return { counted: false, reason: 'again' }
      const g = s.trees[card.tree].giving, done = reason => { s.opens[key] = { counted: false, reason, at }; persist(); return { counted: false, reason } }
      if (!g.enabled || g.status === 'off' || !givingComplete(g)) return done('off')
      if (g.status === 'paused') return done('paused')
      if (g.status === 'ended' || (g.ends && day > g.ends)) return done('closed')
      if (g.starts && day < g.starts) return done('off')
      if (g.given + g.perGift > g.cap) return done('cap')
      g.given += g.perGift; s.gifts.push({ tree: card.tree, cardId, amount: g.perGift, name: card.name, at }); s.opens[key] = { counted: true, reason: null, at }; persist()
      return { counted: true, amount: g.perGift }
    },
    async gifts(slug) { return s.gifts.filter(x => x.tree === slug).map(copy) },

    // ---- measures ----
    async addEvent(tree, name, at) { s.events.push({ tree, name, at }); persist() },
    /** True the first time a card's owner comes back after release. */
    async markReturned(cardId) { if (s.returned[cardId]) return false; s.returned[cardId] = true; persist(); return true },
    async measures(slug, releaseAt) {
      purge()
      const ids = new Set(cardsOf(slug).map(c => c.id)), ev = n => s.events.filter(e => e.tree === slug && e.name === n).length
      const opens = Object.entries(s.opens).filter(([k, o]) => ids.has(k.split('|')[0]) && o.reason !== 'own').map(([, o]) => o)
      const wishes = Object.values(s.wishes).filter(w => ids.has(w.to))
      return { cards: ids.size, wishes: wishes.filter(w => w.kind === 'friend').length, self_wishes: wishes.filter(w => w.kind === 'self').length,
        opens_v1: opens.filter(o => o.at < releaseAt).length, opens_v2: opens.filter(o => o.at >= releaseAt).length,
        share_v1: ev('share_v1'), share_v2: ev('share_v2'), saved_calendar: ev('saved_calendar'), saved_selfsend: ev('saved_selfsend'), saved_email: ev('saved_email'), returns: ev('returned'),
        given: s.trees[slug].giving.given }
    },

    // ---- reminders, previews ----
    async saveReminder(token, r) { purge(); s.reminders[token] = { ...r, sent: false }; persist() },
    async hasReminder(token) { purge(); return !!s.reminders[token] },
    async unsentReminders() { purge(); return Object.entries(s.reminders).filter(([, r]) => !r.sent).map(([token, r]) => ({ token, ...r })) },
    async markReminderSent(token) { if (s.reminders[token]) { s.reminders[token].sent = true; persist() } },
    async savePreview(cardId, kind, b64) { s.previews[cardId + '|' + kind] = b64; persist() },
    async getPreview(cardId, kind) { return s.previews[cardId + '|' + kind] || null },

    // ---- operators ----
    async hideCard(id, hidden) { if (!s.cards[id]) return null; s.cards[id].hidden = !!hidden; persist(); return s.cards[id].hidden },
    /** A removal request: the ornament leaves the tree and its wishes are deleted. */
    async removeCard(id, note, at) {
      if (!s.cards[id]) return false
      s.cards[id].hidden = true; s.cards[id].removedAt = at
      for (const w of s.wishList[id] || []) delete s.wishes[w]
      delete s.wishList[id]; s.removals.push({ cardId: id, note: note || null, at }); persist(); return true
    },

    // ---- abuse limits ----
    /** Counts one attempt; false once `max` attempts were already made in this window. */
    async hit(device, action, windowMs, max, at) {
      const k = `${device}|${action}|${Math.floor(at / windowMs)}`, n = (s.limits[k] || 0) + 1
      if (n > max) return false
      s.limits[k] = n; persist(); return true
    },
    async sweepLimits(at) { const day = 864e5; for (const k of Object.keys(s.limits)) if (!k.endsWith('|' + Math.floor(at / day)) && !k.endsWith('|' + Math.floor(at / 36e5))) delete s.limits[k]; persist() },
  }
}
