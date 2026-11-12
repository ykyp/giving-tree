// Shared by the server-rule tests: a fresh repository and a caller with a fake device and clock.
// By default the repository is in memory. With GT_TEST_DB set to a Postgres address, every test world gets its own
// throwaway schema built from supabase/migrations, so the same suites prove the SQL (`npm run test:db`).
import fs from 'node:fs'
import { handle } from '../../server/app.js'
import { memoryRepo } from '../../server/repo-memory.js'
import { postgresRepo } from '../../server/repo-postgres.js'

export const DEC5 = '2026-12-05T12:00:00Z'
export const ADMIN = 'Bearer s3'
export const ON_POSTGRES = !!process.env.GT_TEST_DB

const MIGRATIONS = 'supabase/migrations'
/** A Postgres repository in a new schema. Calls wait until the schema is built. */
function throwawayPostgres() {
  const schema = 't_' + Math.random().toString(36).slice(2, 12)
  const ready = (async () => {
    const { default: postgres } = await import('postgres')
    const sql = postgres(process.env.GT_TEST_DB, { max: 1, idle_timeout: 1, onnotice: () => {}, connection: { search_path: schema } })
    await sql.unsafe(`create schema ${schema}`)
    for (const f of fs.readdirSync(MIGRATIONS).sort()) await sql.unsafe(fs.readFileSync(`${MIGRATIONS}/${f}`, 'utf8'))
    return postgresRepo(sql)
  })()
  return new Proxy({}, { get: (_, method) => async (...args) => (await ready)[method](...args) })
}

export function world(env = {}, repo = ON_POSTGRES ? throwawayPostgres() : memoryRepo()) {
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
