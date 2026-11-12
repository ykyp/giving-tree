// The one Vercel function: vercel.json rewrites every /api/* path here.
import { createHash } from 'node:crypto'
import postgres from 'postgres'
import { handle } from '../server/app.js'
import { postgresRepo } from '../server/repo-postgres.js'

// The Supabase integration on Vercel sets POSTGRES_URL (the pooled address) and the SUPABASE_* values.
// `prepare: false` is what the transaction pooler needs; one connection per function instance is enough.
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL
const salt = process.env.DEVICE_SALT
let sql = null, startError = null
try { if (dbUrl) sql = postgres(dbUrl, { prepare: false, max: 1, idle_timeout: 20, connect_timeout: 10, onnotice: () => {} }) } catch (e) { startError = e }
const repo = sql ? postgresRepo(sql) : null

/**
 * What is wrong with this deployment's set-up, in plain words, for /api/health. Names settings and the kind of
 * failure only: never a value, an address or a password.
 */
const DB_ERRORS = { '28P01': 'the database password in POSTGRES_URL is wrong', '28000': 'the database user in POSTGRES_URL was refused', '3D000': 'the database named in POSTGRES_URL does not exist', '42P01': 'the tables are missing: the migrations in supabase/migrations have not been applied',
  ENOTFOUND: 'the host in POSTGRES_URL could not be found', ECONNREFUSED: 'the host in POSTGRES_URL refused the connection', ETIMEDOUT: 'the database did not answer in time', CONNECT_TIMEOUT: 'the database did not answer in time', ENETUNREACH: 'the host in POSTGRES_URL cannot be reached from Vercel', EHOSTUNREACH: 'the host in POSTGRES_URL cannot be reached from Vercel' }
async function problems() {
  const out = []
  if (!salt) out.push('DEVICE_SALT is not set for this environment')
  if (!dbUrl) { out.push('POSTGRES_URL is not set for this environment'); return out }
  if (/YOUR-PASSWORD/i.test(dbUrl)) out.push('POSTGRES_URL still contains the [YOUR-PASSWORD] placeholder')
  if ((dbUrl.match(/@/g) || []).length > 1 || dbUrl.includes('#')) out.push('POSTGRES_URL has an unencoded @ or # in it, most likely in the password: write @ as %40 and # as %23')
  let host = ''; try { host = new URL(dbUrl).hostname } catch (e) { out.push('POSTGRES_URL is not a valid address (a password with characters like @ # / : must be percent-encoded)') }
  if (/^db\.[a-z0-9]+\.supabase\.co$/.test(host)) out.push('POSTGRES_URL is the direct address (db.….supabase.co), which Vercel cannot reach; use the "Transaction pooler" address from Supabase → Connect (port 6543)')
  if (startError) { out.push('POSTGRES_URL could not be used to start a connection'); return out }
  try { await sql`select 1 from trees limit 1` } catch (e) {
    const code = e.code || e.errno || '', said = /Tenant or user not found/i.test(e.message || '') ? 'the pooler does not know this project or user: the user in POSTGRES_URL should be postgres.<project ref> and the host should be the pooler for the project\'s region' : DB_ERRORS[code]
    out.push(`The database could not be used: ${said || 'error ' + (code || 'unknown')}`)
  }
  return out
}

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
  const { p, ...query } = req.query
  const path = p || req.url.split('?')[0].replace(/^\/api\//, '')
  // The health check tests the whole chain and says what is missing. The page shows "The tree can't be reached
  // just now" whenever it is not ok, so nothing is ever accepted that could not be saved.
  if (path === 'health') {
    const found = await problems(); res.setHeader('cache-control', 'no-store'); res.setHeader('x-robots-tag', 'noindex')
    res.status(found.length ? 503 : 200).json(found.length ? { ok: false, error: 'no_store', problems: found } : { ok: true, email: env.emailEnabled, testMode: false }); return
  }
  if (!repo || !salt) { res.status(503).json({ ok: false, error: 'no_store' }); return }
  const out = await handle({ method: req.method, path, query, body: req.body || {}, headers: req.headers }, repo, env)
  for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v)
  if (out.json) { res.setHeader('x-robots-tag', 'noindex'); res.setHeader('cache-control', 'no-store'); res.status(out.status).json(out.json); return }
  res.setHeader('content-type', out.type)
  res.status(out.status).send(out.b64 ? Buffer.from(out.b64, 'base64') : out.text)
}
