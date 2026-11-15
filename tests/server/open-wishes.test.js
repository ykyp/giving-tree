import test from 'node:test'
import assert from 'node:assert/strict'
import { world } from './helpers.js'

const own = (call, card, text, dev) => call('POST', `me/${card.token}/wish`, { body: { text }, dev })

test('open wishes: the wish on an ornament is readable by anyone, at once; wishes left for someone stay sealed', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  assert.equal((await call('GET', `card/${A.id}`, { dev: 'B' })).json.wish, null)
  await own(call, A, 'A year with more sea', 'A')
  await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A secret for the 25th' }, dev: 'B' })
  assert.equal((await call('GET', `card/${A.id}`, { dev: 'C' })).json.wish, 'A year with more sea')
  const tree = (await call('GET', 'tree/global', { dev: 'C' })).json
  assert.equal(tree.ornaments.find(o => o.id === A.id).wish, 'A year with more sea')
  assert.equal(JSON.stringify(tree).includes('secret'), false); assert.equal(JSON.stringify((await call('GET', `card/${A.id}`, { dev: 'C' })).json).includes('secret'), false)
  const me = (await call('GET', `me/${A.token}`, { dev: 'A', query: { day: '2026-12-05' } })).json
  assert.deepEqual(me.wishes.map(w => [w.kind, w.text]), [['self', 'A year with more sea'], ['friend', undefined]])
})

test('open wishes: a wish held by the word check is shown to its writer only', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  await own(call, A, 'call me on 07700 900123', 'A')
  assert.equal((await call('GET', `card/${A.id}`, { dev: 'B' })).json.wish, null)
  assert.equal((await call('GET', 'tree/global', { dev: 'B' })).json.ornaments[0].wish, null)
  assert.equal((await call('GET', `me/${A.token}`, { dev: 'A', query: { day: '2026-12-05' } })).json.wishes[0].text, 'call me on 07700 900123')
})

test('open wishes: one report takes a wish off the tree; reports are limited', async () => {
  const { call, card } = world(), A = await card('Maria', 'A'), B = await card('Ben', 'B', { hook: 31 })
  await own(call, A, 'Something unkind', 'A')
  assert.equal((await call('POST', `card/${B.id}/report`, { dev: 'R' })).status, 404, 'nothing to report')
  assert.equal((await call('POST', `card/${A.id}/report`, { dev: 'R' })).json.ok, true)
  assert.equal((await call('GET', `card/${A.id}`, { dev: 'C' })).json.wish, null)
  assert.equal((await call('GET', 'tree/global', { dev: 'C' })).json.ornaments.find(o => o.id === A.id).wish, null)
  assert.equal((await call('GET', 'admin/review', { auth: 'Bearer s3' })).json.wishes.length, 1)
  let slow = 0; for (let i = 0; i < 8; i++) { const c = await card('N' + i, 'o' + i, { hook: 40 + i }); await own(call, c, 'hello', 'o' + i); if ((await call('POST', `card/${c.id}/report`, { dev: 'R' })).status === 429) slow++ }
  assert.equal(slow, 4)
})
