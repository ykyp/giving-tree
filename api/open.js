// POST /api/open  { cardId }  → { counted, reason?, amount_pence?, given_pence?, cap_pence? }
// All the rules (own device, once per phone, bots, cap, tree live) are enforced in the database function record_open.
import { db, send, guard, deviceHash, isBot } from './_lib.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'POST')) return
  const cardId = String(req.body?.cardId || '')
  if (!/^[\w-]{5,12}$/.test(cardId)) return send(res, 400, { error: 'Unknown card.' })
  const { data, error } = await db.rpc('record_open', { p_card: cardId, p_device: deviceHash(req, res), p_is_bot: isBot(req) })
  if (error) return send(res, 500, { error: error.message })
  send(res, 200, data)
}
