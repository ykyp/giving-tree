// The one Vercel function: vercel.json rewrites every /api/* path here.
import { handle } from '../server/app.js'
import { createHash } from 'node:crypto'

// The Supabase repository (server/repo-postgres.js) is the next piece of work: specs/002-production-launch/tasks.md, T008 to T011.
// Until it exists there is no store, and the page shows "The tree can't be reached just now" instead of taking wishes.
const repo = null
const resendKey = process.env.RESEND_API_KEY
async function sendEmail({ to, subject, text }) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }) })
  if (!r.ok) throw new Error('email failed: ' + r.status)
}
async function notify(text) { if (process.env.OPS_WEBHOOK_URL) await fetch(process.env.OPS_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) }) }
const env = {
  testMode: process.env.TEST_MODE === '1', // the testing deployment only
  emailEnabled: process.env.EMAIL_REMINDERS === 'on' && !!(resendKey && process.env.EMAIL_FROM), sendEmail, notify,
  cronSecret: process.env.CRON_SECRET, origin: process.env.PUBLIC_ORIGIN,
  hashDevice: async id => createHash('sha256').update((process.env.DEVICE_SALT || '') + id).digest('hex'),
}

export default async function handler(req, res) {
  if (!repo || !process.env.DEVICE_SALT) { res.status(503).json({ ok: false, error: 'no_store' }); return }
  const path = req.query.p || req.url.split('?')[0].replace(/^\/api\//, '')
  const out = await handle({ method: req.method, path, query: req.query, body: req.body || {}, headers: req.headers }, repo, env)
  for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v)
  res.setHeader('x-robots-tag', 'noindex')
  if (out.json) { res.setHeader('cache-control', 'no-store'); res.status(out.status).json(out.json); return }
  res.setHeader('content-type', out.type)
  res.status(out.status).send(out.b64 ? Buffer.from(out.b64, 'base64') : out.text)
}
