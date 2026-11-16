// How the 3D scene behaved on visitors' devices, as counts the team can read (specs/012-production-scene).
import test from 'node:test'
import assert from 'node:assert/strict'
import { world, ADMIN } from './helpers.js'

test('scene health: counted per tree, limited per device, with nothing about the device kept', async () => {
  const { call } = world()
  for (const name of ['no_webgl', 'gl_lost', 'gl_restored', 'scene_error', 'chunk_error', 'tier_low']) assert.equal((await call('POST', 'event', { body: { name, tree: 'global' }, dev: 'A' })).json.ok, true)
  await call('POST', 'event', { body: { name: 'gl_lost', tree: 'global' }, dev: 'B' })
  // before the page knows its tree, or with a slug that does not exist, it still counts, against the shared tree
  assert.equal((await call('POST', 'event', { body: { name: 'chunk_error', tree: 'no-such-tree' }, dev: 'B' })).status, 200)
  assert.equal((await call('POST', 'event', { body: { name: 'made_up', tree: 'global' }, dev: 'B' })).status, 400)
  // an older one is in the total but not in the last day
  await call('POST', 'event', { body: { name: 'gl_lost', tree: 'global' }, dev: 'C', clock: '2026-12-02T12:00:00Z' })
  const m = (await call('GET', 'admin/measures', { query: { tree: 'global' }, auth: ADMIN })).json
  assert.deepEqual(m.scene.gl_lost, { total: 3, day: 2 }); assert.deepEqual(m.scene.chunk_error, { total: 2, day: 2 }); assert.deepEqual(m.scene.no_webgl, { total: 1, day: 1 })
  assert.equal(JSON.stringify(m.scene).includes('device'), false)
  // one device cannot inflate the numbers: 12 a day, then it is told to slow down
  let last; for (let i = 0; i < 13; i++) last = await call('POST', 'event', { body: { name: 'gl_lost', tree: 'global' }, dev: 'D' })
  assert.equal(last.status, 429)
  assert.equal((await call('GET', 'admin/measures', { query: { tree: 'global' }, auth: ADMIN })).json.scene.gl_lost.total, 15)
})
