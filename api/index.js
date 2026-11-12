// The one Vercel function: vercel.json rewrites every /api/* path here.
import { createHash } from 'node:crypto'
import postgres from 'postgres'
import { handle } from '../server/app.js'
import { postgresRepo } from '../server/repo-postgres.js'

// The Supabase integration on Vercel sets POSTGRES_URL (the pooled address) and the SUPABASE_* values.
// `prepare: false` is what the transaction pooler needs; one connection per function instance is enough.
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
const salt = process.env.DEVICE_SALT
const sql = dbUrl ? postgres(dbUrl, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} }) : null
const repo = sql ? postgresRepo(sql) : null

const resendKey = process.env.RESEND_API_KEY
async function sendEmail({ to, subject, text }) {
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }) })
  if (!r.ok) throw new Error('email failed: ' + r.status)
}
async function notify(text) { if (process.env.OPS_WEBHOOK_URL) await fetch(process.env.OPS_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) }) }

/** An operator is someone signed in through Supabase Auth whose email is in the operators table. */
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const publicKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY
async function operator(headers) {
  const token = /^Bearer (.+)$/.exec(headers.authorization || '')?.[1]
  if (!token || !supabaseUrl || !publicKey) return false
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: publicKey, authorization: `Bearer ${token}` } })
    if (!r.ok) return false
    const user = await r.json()
    return !!user.email && !!user.email_confirmed_at && await repo.isOperator(user.email)
  } catch (e) { return false }
}

// Nothing here can fake the date or the device: those tools exist only on the local dev server.
const env = {
  emailEnabled: process.env.EMAIL_REMINDERS === 'on' && !!(resendKey && process.env.EMAIL_FROM), sendEmail, notify, operator,
  cronSecret: process.env.CRON_SECRET, origin: process.env.PUBLIC_ORIGIN,
  hashDevice: async id => createHash('sha256').update(salt + id).digest('hex'), // only a salted hash of the device cookie is stored
}

export default async function handler(req, res) {
  // No database, or no salt for device hashes: say so. The page then shows "The tree can't be reached just now".
  if (!repo || !salt) { res.status(503).json({ ok: false, error: 'no_store' }); return }
  const { p, ...query } = req.query
  const path = p || req.url.split('?')[0].replace(/^\/api\//, '')
  const out = await handle({ method: req.method, path, query, body: req.body || {}, headers: req.headers }, repo, env)
  for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v)
  if (out.json) { res.setHeader('x-robots-tag', 'noindex'); res.setHeader('cache-control', 'no-store'); res.status(out.status).json(out.json); return }
  res.setHeader('content-type', out.type)
  res.status(out.status).send(out.b64 ? Buffer.from(out.b64, 'base64') : out.text)
}
