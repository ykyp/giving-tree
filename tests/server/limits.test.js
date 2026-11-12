import test from 'node:test'
import assert from 'node:assert/strict'
import { world } from './helpers.js'

test('limits: a burst of 100 card attempts from one device gets at most 10 through', async () => {
  const { call } = world(); let ok = 0, slow = 0
  for (let i = 0; i < 100; i++) { const r = await call('POST', 'card', { body: { tree: 'global', name: 'Bot', design: 0, hook: i }, dev: 'flood' }); if (r.status === 200) ok++; else if (r.json.error === 'slow_down') slow++ }
  assert.ok(ok <= 10, `${ok} accepted`); assert.equal(ok, 3); assert.equal(slow, 97)
  assert.equal((await call('POST', 'card', { body: { tree: 'global', name: 'Real', design: 0, hook: 5 }, dev: 'someone-else' })).status, 200)
  assert.equal((await call('POST', 'card', { body: { tree: 'global', name: 'Bot', design: 0, hook: 5 }, dev: 'flood', clock: '2026-12-06T12:00:01Z' })).status, 200)
})

test('limits: a burst of 100 wish attempts from one device gets at most 10 through', async () => {
  const { call } = world(), cards = []
  for (let i = 0; i < 100; i++) cards.push((await call('POST', 'card', { body: { tree: 'global', name: 'N' + i, design: 0, hook: i }, dev: 'owner' + i })).json.id)
  let ok = 0; for (const id of cards) if ((await call('POST', 'wish', { body: { to: id, from: 'Bot', text: 'hello' }, dev: 'flood' })).status === 200) ok++
  assert.equal(ok, 10)
})
