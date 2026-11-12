// Runs the server-rule suites against a real Postgres: `npm run test:db`.
// Set GT_TEST_DB to a database you can throw schemas into, e.g. postgres://gt@127.0.0.1:54329/gt
// Never point it at the production database. Each test builds its own schema (t_…); they are dropped first and last.
import { spawnSync } from 'node:child_process'
import postgres from 'postgres'

const url = process.env.GT_TEST_DB
if (!url) { console.error('Set GT_TEST_DB to a throwaway Postgres address first.'); process.exit(2) }
if (/supabase\.(co|com)/.test(url) && process.env.GT_TEST_DB_REMOTE !== 'yes') { console.error('GT_TEST_DB points at Supabase. Tests belong on a local or throwaway database.'); process.exit(2) }
async function sweep() {
  const sql = postgres(url, { max: 1, onnotice: () => {} })
  for (const { nspname } of await sql`select nspname from pg_namespace where nspname ~ '^t_[a-z0-9]{6,12}$'`) await sql.unsafe(`drop schema ${nspname} cascade`)
  await sql.end()
}
await sweep()
const run = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/server/*.test.js'].concat(process.argv.slice(2)), { stdio: 'inherit', env: process.env, shell: false })
await sweep()
process.exit(run.status ?? 1)
