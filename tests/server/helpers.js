// Shared by the server-rule tests: a fresh in-memory repository and a caller with a fake device and clock.
import { handle } from '../../server/app.js'
import { memoryRepo } from '../../server/repo-memory.js'

export const DEC5 = '2026-12-05T12:00:00Z'
export const ADMIN = 'Bearer s3'
export function world(env = {}, repo = memoryRepo()) {
  env = { testMode: true, adminSecret: 's3', ...env }
  const call = (method, path, { body, dev = 'A', clock = DEC5, query, ua = 'Mozilla/5.0', auth } = {}) =>
    handle({ method, path, body, query, headers: { 'x-gt-device': dev, 'x-gt-clock': clock, 'user-agent': ua, ...(auth ? { authorization: auth } : {}) } }, repo, env)
  const card = async (name, dev, extra = {}, clock = DEC5) => (await call('POST', 'card', { body: { tree: 'global', name, design: 1, hook: 30, ...extra }, dev, clock })).json
  /** A community tree with giving switched on and live: 10p a gift, into a pot of `cap` pence. */
  const givingTree = async (slug = 'coffee', cap = 500) => {
    await call('POST', 'admin/trees', { auth: ADMIN, body: { slug, name: 'Coffee Club' } })
    return call('POST', `admin/trees/${slug}/giving`, { auth: ADMIN, body: { enabled: true, status: 'live', sponsor: 'Larkfield Coffee', charityName: 'Shelter Example', charityReg: '123456', perGift: 10, cap, agreementSigned: true } })
  }
  return { repo, call, card, givingTree }
}
