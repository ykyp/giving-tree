// POST /api/reminder  { token, email, brandNews }  → opt-in Christmas reminder. Deleted on 1 Feb.
import { db, send, guard } from './_lib.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'POST')) return
  const { token, email, brandNews = false } = req.body || {}
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ''))) return send(res, 400, { error: 'Check the email address.' })
  const { error } = await db.from('reminders').upsert({ owner_token: token, email: String(email).trim(), brand_news: !!brandNews })
  if (error) return send(res, 400, { error: 'This Christmas link is not valid.' })
  send(res, 201, { ok: true })
}
