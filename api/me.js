// GET /api/me?token=<owner_token>  → your ornament, your branch, your wishes (sealed until 25 Dec: names only)
import { db, send, guard } from './_lib.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'GET')) return
  const token = String(req.query.token || '')
  if (!/^[0-9a-f-]{36}$/i.test(token)) return send(res, 404, { error: 'This Christmas link is not valid.' })
  const { data: card } = await db.from('cards').select('id,brand,sender_name,design,hook,branch_name,created_at').eq('owner_token', token).single()
  if (!card) return send(res, 404, { error: 'This Christmas link is not valid.' })
  const [w, branch, opens] = await Promise.all([
    db.from('wishes').select('id,from_name,body,unlock_at,created_at').eq('card_id', card.id).eq('flagged', false).order('created_at'),
    db.from('cards').select('id,sender_name,design').eq('branch_of', card.id).eq('moderation', 'ok'),
    db.from('opens').select('counted').eq('card_id', card.id).eq('counted', true),
  ])
  const now = new Date()
  const wishes = (w.data || []).map(x => new Date(x.unlock_at) <= now ? { from: x.from_name, body: x.body, open: true } : { from: x.from_name, open: false, unlockAt: x.unlock_at })
  send(res, 200, { card, branch: branch.data || [], wishes, cardsOpened: (opens.data || []).length })
}
