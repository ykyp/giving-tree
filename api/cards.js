// POST /api/cards  { brand, name, design, hook?, branchOf?, branchName? }  → { id, url, ownerToken }
import { db, send, guard, deviceHash, shortId, cleanName, BLOCK } from './_lib.js'
export default async function handler(req, res) {
  if (!guard(req, res, 'POST')) return
  const { brand = 'mosaicads', design, hook = null, branchOf = null, branchName = null } = req.body || {}
  const name = cleanName(req.body?.name)
  if (!name) return send(res, 400, { error: 'Add your first name for the ornament.' })
  if (BLOCK.test(name) || (branchName && BLOCK.test(branchName))) return send(res, 422, { error: "That name can't go on an ornament. Try your first name." })
  if (!(Number.isInteger(design) && design >= 0 && design <= 7)) return send(res, 400, { error: 'Pick an ornament.' })
  const row = { id: shortId(), brand, sender_name: name, design, hook, branch_of: branchOf, branch_name: branchName?.slice(0, 30) || null, creator_device: deviceHash(req, res) }
  const { data, error } = await db.from('cards').insert(row).select('id, owner_token').single()
  if (error) return send(res, 400, { error: error.message })
  const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`
  send(res, 201, { id: data.id, url: `${base}/c/${data.id}`, ownerToken: data.owner_token, christmasUrl: `${base}/me/${data.owner_token}` })
}
