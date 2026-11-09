// GET /api/tree?brand=mosaicads  → the tree page: totals, disclosure fields, latest ornaments, latest gifts
import { db, send, guard } from './_lib.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'GET')) return
  const brand = String(req.query.brand || 'mosaicads')
  const [b, o, g] = await Promise.all([
    db.from('brands').select('slug,name,charity_name,charity_reg,per_gift_pence,cap_pence,given_pence,starts_at,ends_at,status').eq('slug', brand).single(),
    db.from('public_ornaments').select('id,sender_name,design,hook,branch_of,created_at').eq('brand', brand).order('created_at', { ascending: false }).limit(120),
    db.from('gifts').select('display_name,amount_pence,created_at').eq('brand', brand).order('created_at', { ascending: false }).limit(12),
  ])
  if (b.error) return send(res, 404, { error: 'No such tree.' })
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=30')
  res.status(200).json({ brand: b.data, ornaments: o.data || [], gifts: g.data || [] })
}
