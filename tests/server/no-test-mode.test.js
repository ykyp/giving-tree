import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { handle } from '../../server/app.js'
import { memoryRepo } from '../../server/repo-memory.js'

test('no test mode on a deployed copy: the production function never switches it on, whatever its settings', () => {
  const src = fs.readFileSync('api/index.js', 'utf8')
  assert.equal(/testMode/.test(src), false, 'api/index.js must not mention testMode'); assert.equal(/TEST_MODE/.test(src), false, 'api/index.js must not read TEST_MODE')
})

test('no test mode on a deployed copy: without it, the date and device cannot be faked and the test routes do not exist', async () => {
  const repo = memoryRepo(), env = { hashDevice: async id => 'h:' + id }
  const call = (method, path, body, headers = {}) => handle({ method, path, body, headers: { cookie: 'gt_d=real-device', ...headers } }, repo, env)
  assert.equal((await call('GET', 'health')).json.testMode, false)
  for (const p of ['demo/card', 'demo/friend']) assert.equal((await call('POST', p, { tree: 'global', name: 'x', design: 0, hook: 0, to: 'x' })).status, 404)
  const made = (await call('POST', 'card', { tree: 'global', name: 'Ada', design: 0, hook: 2 }, { 'x-gt-device': 'pretend', 'x-gt-clock': '2026-12-25T09:00:00Z' })).json
  assert.equal((await repo.getCard(made.id)).device, 'h:real-device')
  await handle({ method: 'POST', path: 'wish', body: { to: made.id, from: 'Tom', text: 'Sealed' }, headers: { cookie: 'gt_d=other' } }, repo, env)
  const me = (await call('GET', `me/${made.token}`, null, { 'x-gt-clock': '2026-12-25T09:00:00Z' })).json
  if (Date.now() < Date.UTC(2026, 11, 24, 10)) { assert.equal(me.released, false); assert.equal('text' in me.wishes[0], false) }
})
