// GET /api/card?id=<card id>  → the public face of a card (who sent it, which ornament, which tree)
import { db, send, guard } from './_lib.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'GET')) return
  const { data } = await db.from('cards').select('id,brand,sender_name,design').eq('id', String(req.query.id || '')).eq('moderation', 'ok').maybeSingle()
  if (!data) return send(res, 404, { error: 'This card does not exist.' })
  send(res, 200, data)
}
