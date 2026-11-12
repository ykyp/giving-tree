import test from 'node:test'
import assert from 'node:assert/strict'
import { memoryRepo } from '../../server/repo-memory.js'
import { world } from './helpers.js'

const send = (call, extra = {}, dev = 'S') => call('POST', 'sent', { body: { tree: 'global', from: 'Eleni', to: 'Tom', text: 'A calm year for you', ...extra }, dev })

test('sent wishes: sending returns only a link; its page shows names, never the words', async () => {
  const { call } = world(), r = await send(call)
  assert.equal(r.status, 200); assert.deepEqual(Object.keys(r.json), ['token']); assert.match(r.json.token, /^[\w]{24}$/)
  const seen = (await call('GET', `sent/${r.json.token}`, { dev: 'T' })).json
  assert.deepEqual({ from: seen.from, to: seen.to, claimed: seen.claimed, mine: seen.mine, tree: seen.tree.slug }, { from: 'Eleni', to: 'Tom', claimed: false, mine: false, tree: 'global' })
  assert.equal(JSON.stringify(seen).includes('calm year'), false)
  assert.equal((await call('GET', `sent/${r.json.token}`, { dev: 'S' })).json.mine, true)
  for (const bad of [{ text: '' }, { text: 'x'.repeat(141) }]) assert.equal((await send(call, bad)).json.error, 'bad_wish')
  for (const bad of [{ from: '' }, { to: '' }, { to: 'admin' }]) assert.equal((await send(call, bad)).json.error, 'bad_name')
  assert.equal((await send(call, { tree: 'nope' })).json.error, 'no_tree'); assert.equal((await call('GET', 'sent/nope')).status, 404)
})

test('sent wishes: hanging an ornament from the link keeps the wish, sealed like any other, and the link is used up', async () => {
  const { call } = world(), token = (await send(call)).json.token
  const tom = (await call('POST', 'card', { body: { tree: 'global', name: 'Tom', design: 1, hook: 30, sent: token }, dev: 'T' })).json
  assert.equal(tom.sent, 'ok')
  const before = (await call('GET', `me/${tom.token}`, { dev: 'T', query: { day: '2026-12-05' } })).json
  assert.deepEqual(before.wishes.map(w => [w.from, w.kind, 'text' in w]), [['Eleni', 'friend', false]]); assert.equal(before.stats.wishes, 1)
  const xmas = (await call('GET', `me/${tom.token}`, { dev: 'T', query: { day: '2026-12-25' }, clock: '2026-12-25T09:00:00Z' })).json
  assert.equal(xmas.wishes[0].text, 'A calm year for you')
  assert.equal((await call('GET', `sent/${token}`, { dev: 'X' })).json.claimed, true)
  const second = (await call('POST', 'card', { body: { tree: 'global', name: 'Ana', design: 1, hook: 31, sent: token }, dev: 'X' })).json
  assert.equal(second.sent, 'claimed'); assert.ok(second.id, 'the ornament is still hung')
  assert.equal((await call('GET', `me/${second.token}`, { dev: 'X' })).json.wishes.length, 0)
})

test('sent wishes: someone who already has a branch claims it without a second ornament', async () => {
  const { call, card } = world(), token = (await send(call)).json.token, tom = await card('Tom', 'T')
  assert.equal((await call('GET', `sent/${token}`, { dev: 'T', query: { me: tom.token } })).json.canClaimHere, true)
  assert.deepEqual((await call('POST', `sent/${token}/claim`, { body: { me: tom.token }, dev: 'T' })).json, { ok: true })
  assert.equal((await call('GET', `me/${tom.token}`, { dev: 'T' })).json.wishes.length, 1)
  const again = await call('POST', `sent/${token}/claim`, { body: { me: tom.token }, dev: 'T' }); assert.equal(again.status, 409); assert.equal(again.json.error, 'claimed')
})

test('sent wishes: not by the sender, not on another tree, and not a second wish from the same sender', async () => {
  const { call, card } = world(), token = (await send(call)).json.token
  const eleni = await card('Eleni', 'S'); assert.equal((await call('POST', `sent/${token}/claim`, { body: { me: eleni.token }, dev: 'S' })).json.error, 'own_wish')
  assert.equal((await call('GET', `sent/${token}`, { dev: 'S', query: { me: eleni.token } })).json.canClaimHere, false)
  const slug = (await call('POST', 'tree', { body: { name: 'Class 4B' }, dev: 'C' })).json.slug, far = await card('Far', 'F', { tree: slug })
  assert.equal((await call('POST', `sent/${token}/claim`, { body: { me: far.token }, dev: 'F' })).json.error, 'wrong_tree')
  const tom = await card('Tom', 'T'); await call('POST', 'wish', { body: { to: tom.id, from: 'Eleni', text: 'An ordinary wish' }, dev: 'S' })
  assert.equal((await call('POST', `sent/${token}/claim`, { body: { me: tom.token }, dev: 'T' })).json.error, 'already')
  assert.equal((await call('GET', `sent/${token}`, { dev: 'Q' })).json.claimed, false) // still there for someone else
})

test('sent wishes: flagged ones wait for review after claiming; they count towards the hourly limit; closed after New Year', async () => {
  const { call } = world(), flagged = (await send(call, { text: 'call me www.example.com' })).json.token
  const tom = (await call('POST', 'card', { body: { tree: 'global', name: 'Tom', design: 1, hook: 30, sent: flagged }, dev: 'T' })).json
  assert.equal(tom.sent, 'ok'); assert.equal((await call('GET', `me/${tom.token}`, { dev: 'T' })).json.wishes.length, 0)
  let ok = 0; for (let i = 0; i < 15; i++) if ((await send(call, {}, 'flood')).status === 200) ok++
  assert.equal(ok, 10)
  assert.equal((await send(call, {}, 'late')).status, 200); assert.equal((await call('POST', 'sent', { body: { tree: 'global', from: 'A', to: 'B', text: 'x' }, dev: 'z', clock: '2027-01-02T00:00:00Z' })).json.error, 'frozen')
})

test('sent wishes: deleted on 1 February 2027, claimed or not', async () => {
  let now = Date.UTC(2026, 11, 5); const repo = memoryRepo({ now: () => now }), { call } = world({}, repo), token = (await send(call)).json.token
  assert.ok(await repo.getSentWish(token)); now = Date.UTC(2027, 1, 1); assert.equal(await repo.getSentWish(token), null)
})
