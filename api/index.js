// The one Vercel function: vercel.json rewrites every /api/* path here.
import { handle } from '../server/app.js'
import { redisKv } from '../server/kv-redis.js'

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
const kv = url && token ? redisKv(url, token) : null
const resendKey = process.env.RESEND_API_KEY

async function sendEmail({ to, subject, text }) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }) })
  if (!r.ok) throw new Error('email failed: ' + r.status)
}
const env = { emailEnabled: process.env.EMAIL_REMINDERS === 'on' && !!(resendKey && process.env.EMAIL_FROM), sendEmail, cronSecret: process.env.CRON_SECRET, adminSecret: process.env.ADMIN_SECRET, origin: process.env.PUBLIC_ORIGIN }

export default async function handler(req, res) {
  if (!kv) { res.status(503).json({ ok: false, error: 'no_store' }); return }
  const path = req.query.p || req.url.split('?')[0].replace(/^\/api\//, '')
  const out = await handle({ method: req.method, path, query: req.query, body: req.body || {}, headers: req.headers }, kv, env)
  for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v)
  res.setHeader('x-robots-tag', 'noindex')
  if (out.json) { res.setHeader('cache-control', 'no-store'); res.status(out.status).json(out.json); return }
  res.setHeader('content-type', out.type)
  res.status(out.status).send(out.b64 ? Buffer.from(out.b64, 'base64') : out.text)
}
