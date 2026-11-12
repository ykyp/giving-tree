// The rules running in this browser, for the single-file demo only. Never loaded by the real site.
import { handle } from '../../server/app.js'
import { memoryRepo } from '../../server/repo-memory.js'
import { TEST_TREES } from '../../server/seed-test.js'

export function localServer({ load, save }) {
  const repo = memoryRepo({ seed: TEST_TREES, load, save })
  return req => handle(req, repo, { testMode: true, origin: location.origin })
}
