// Shared helpers for the API routes (Vercel Node functions). Server-side only: uses the service-role key.
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
export const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null

export const BLOCK = /(fuck|shit|cunt|nazi|hitler|admin|mosaicads|official|https?:|www\.)/i
const BOTS = /bot|crawler|spider|facebookexternalhit|whatsapp|slackbot|twitterbot|discordbot|telegrambot|linkedinbot|embedly|preview|headless/i

export function send(res, status, body) { res.status(status).setHeader('Cache-Control', 'no-store').json(body) }
export function guard(req, res, method) {
  if (!db) { send(res, 503, { error: 'Database not connected yet. Add the Supabase integration in Vercel.' }); return false }
  if (req.method !== method) { send(res, 405, { error: `Use ${method}` }); return false }
  return true
}
export const isBot = req => BOTS.test(req.headers['user-agent'] || '')

/** A first-party device id (cookie), salted and hashed before it is stored. No fingerprinting. */
export function deviceHash(req, res) {
  const m = /(?:^|;\s*)gt_dev=([a-f0-9-]{36})/.exec(req.headers.cookie || '')
  let id = m && m[1]
  if (!id) { id = crypto.randomUUID(); res.setHeader('Set-Cookie', `gt_dev=${id}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`) }
  return crypto.createHash('sha256').update((process.env.DEVICE_SALT || 'giving-tree') + id).digest('hex')
}
export const shortId = () => crypto.randomBytes(5).toString('base64url').slice(0, 7)
export const cleanName = s => String(s || '').trim().split(/\s+/)[0].replace(/[^\p{L}' -]/gu, '').slice(0, 12)
/** Wishes open on 25 Dec, 00:00 in the earliest time zone (UTC+14) = 24 Dec 10:00 UTC. */
export const UNLOCK = new Date('2026-12-24T10:00:00Z')
