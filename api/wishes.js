// POST /api/wishes  { cardId, fromName, body, fromCard? }  → { ok, unlockAt }   (a wish left on someone's ornament)
import { db, send, guard, cleanName, BLOCK, UNLOCK } from './_lib.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'POST')) return
  const { cardId, fromCard = null } = req.body || {}
  const fromName = cleanName(req.body?.fromName), body = String(req.body?.body || '').trim().slice(0, 140)
  if (!fromName || !body) return send(res, 400, { error: 'Write a wish and sign it with your first name.' })
  const flagged = BLOCK.test(body) || BLOCK.test(fromName)
  const unlockAt = new Date() > UNLOCK ? new Date() : UNLOCK // late arrivals: opens immediately
  const { error } = await db.from('wishes').insert({ card_id: cardId, from_card: fromCard, from_name: fromName, body, unlock_at: unlockAt.toISOString(), flagged })
  if (error) return send(res, 400, { error: 'That ornament no longer exists.' })
  send(res, 201, { ok: true, unlockAt: unlockAt.toISOString(), review: flagged })
}
