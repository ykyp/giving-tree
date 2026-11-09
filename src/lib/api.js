// Client for the API routes in /api. If they answer, the page runs on real data ("online");
// if not (preview, local demo), everything falls back to the built-in sample data.
import { createClient } from '@supabase/supabase-js'

export const api = { online: false, sb: null, ornaments: null }
async function j(path, opt = {}) {
  const r = await fetch(path, { ...opt, headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: opt.body && JSON.stringify(opt.body) })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(d.error || r.statusText), { status: r.status })
  return d
}
export async function connect(brand) {
  try { const t = await j(`/api/tree?brand=${encodeURIComponent(brand)}`); api.online = true; api.ornaments = t.ornaments; return t }
  catch (e) { api.online = false; return null }
}
export const createCard = body => j('/api/cards', { method: 'POST', body })
export const openCard = cardId => j('/api/open', { method: 'POST', body: { cardId } })
export const getCard = id => j(`/api/card?id=${encodeURIComponent(id)}`)
export const getMe = token => j(`/api/me?token=${encodeURIComponent(token)}`)

/** Live feed: every new gift on this tree, pushed by Supabase Realtime. */
export async function subscribeGifts(brand, onGift) {
  try {
    const cfg = await j('/api/config'); if (!cfg.url || !cfg.anonKey) return
    api.sb = api.sb || createClient(cfg.url, cfg.anonKey, { auth: { persistSession: false } })
    api.sb.channel('gifts-' + brand).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gifts', filter: `brand=eq.${brand}` }, p => onGift(p.new)).subscribe()
  } catch (e) {}
}
export async function getOrnament(id) {
  if (!api.sb) return null
  const { data } = await api.sb.from('public_ornaments').select('id,sender_name,design,hook,created_at').eq('id', id).maybeSingle()
  return data
}
/** Map a database tree row onto the page's brand object (keeps the look, takes the numbers). */
export function mergeBrand(b, row) {
  if (!row) return b
  b.name = row.name; b.per = row.per_gift_pence; b.cap = row.cap_pence; b.opened = Math.round(row.given_pence / row.per_gift_pence)
  b.charity = { name: row.charity_name, reg: row.charity_reg || 'to be confirmed' }; b.status = row.status
  const d = s => s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
  if (row.starts_at) b.start = d(row.starts_at); if (row.ends_at) b.end = d(row.ends_at) + ' ' + row.ends_at.slice(0, 4)
  return b
}
