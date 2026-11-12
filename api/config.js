// GET /api/config → the PUBLIC Supabase settings the browser needs for the live feed (anon key only, never the service key)
import { send } from './_lib.js'
export default function handler(req, res) {
  send(res, 200, { url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null, anonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null })
}
