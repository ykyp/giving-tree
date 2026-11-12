import test from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../../server/app.js'
import { memoryRepo } from '../../server/repo-memory.js'
import { world, ADMIN } from './helpers.js'

const XMAS = '2026-12-25T09:00:00Z'

test('giving off (the default): an open is recorded but nothing is given or claimed', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  assert.equal((await call('POST', 'open', { body: { id: A.id } })).json.reason, 'own')
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'B', ua: 'WhatsApp/2.0' })).json.reason, 'bot')
  const first = (await call('POST', 'open', { body: { id: A.id }, dev: 'B' })).json
  assert.equal(first.counted, false); assert.equal(first.reason, 'off'); assert.equal(first.tree.giving, null)
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'B' })).json.reason, 'again')
  const me = (await call('GET', `me/${A.token}`, { query: { day: '2026-12-05' } })).json
  assert.deepEqual(me.stats, { ornaments: 1, wishes: 0, opened: 1 }); assert.equal(me.tree.giving, null)
})

test('giving on: own device, bots and repeat opens never give; the first new device does', async () => {
  const { call, card, givingTree } = world(); await givingTree()
  const A = await card('Maria', 'A', { tree: 'coffee' })
  assert.equal((await call('POST', 'open', { body: { id: A.id } })).json.reason, 'own')
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'B', ua: 'WhatsApp/2.0' })).json.reason, 'bot')
  const first = (await call('POST', 'open', { body: { id: A.id }, dev: 'B' })).json
  assert.equal(first.counted, true); assert.equal(first.tree.giving.given, 10)
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'B' })).json.reason, 'again')
})

test('giving on: stops at the pot, and the gift record always equals the total', async () => {
  const { repo, call, card, givingTree } = world(); await givingTree('coffee', 20)
  const P = await card('Pot', 'P', { tree: 'coffee' })
  for (const d of ['Q', 'R']) assert.equal((await call('POST', 'open', { body: { id: P.id }, dev: d })).json.counted, true)
  const over = (await call('POST', 'open', { body: { id: P.id }, dev: 'S' })).json
  assert.equal(over.counted, false); assert.equal(over.reason, 'cap'); assert.equal(over.tree.giving.given, 20)
  assert.equal((await repo.gifts('coffee')).reduce((n, g) => n + g.amount, 0), 20)
  const me = (await call('GET', `me/${P.token}`, { query: { day: '2026-12-05' } })).json
  assert.equal(me.tree.giving.given, me.tree.giving.cap); assert.equal(me.stats.given, 20); assert.equal(me.stats.gifts, 2)
})

test('giving on: nothing is given while the agreement is unsigned or a setting is missing; paused gives nothing', async () => {
  const { call, card } = world(), base = { enabled: true, status: 'live', sponsor: 'Larkfield Coffee', charityName: 'Shelter Example', charityReg: '123456', perGift: 10, cap: 100 }
  await call('POST', 'admin/trees', { auth: ADMIN, body: { slug: 'coffee', name: 'Coffee Club' } })
  const unsigned = await call('POST', 'admin/trees/coffee/giving', { auth: ADMIN, body: base }); assert.equal(unsigned.status, 400); assert.equal(unsigned.json.error, 'incomplete')
  assert.equal((await call('POST', 'admin/trees/coffee/giving', { auth: ADMIN, body: { ...base, agreementSigned: true, charityReg: '' } })).json.error, 'incomplete')
  const A = await card('Maria', 'A', { tree: 'coffee' })
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'B' })).json.reason, 'off')
  assert.equal((await call('POST', 'admin/trees/coffee/giving', { auth: ADMIN, body: { ...base, agreementSigned: true, status: 'paused' } })).status, 200)
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'C' })).json.reason, 'paused')
})

test('giving on then off: the record is kept and the tree reads as wishes-only again', async () => {
  const { repo, call, card, givingTree } = world(); await givingTree()
  const A = await card('Maria', 'A', { tree: 'coffee' }); await call('POST', 'open', { body: { id: A.id }, dev: 'B' })
  const off = (await call('POST', 'admin/trees/coffee/giving', { auth: ADMIN, body: { enabled: false } })).json
  assert.equal(off.giving.status, 'off'); assert.equal(off.giving.given, 10)
  assert.equal((await call('GET', 'tree/coffee')).json.tree.giving, null)
  assert.equal((await repo.gifts('coffee')).length, 1)
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'C' })).json.reason, 'off')
})

test('names: blocked names are refused', async () => {
  const { call } = world()
  assert.equal((await call('POST', 'card', { body: { tree: 'global', name: 'admin', design: 2, hook: 30 } })).status, 400)
})

test('wishes: sealed without echoing the words, one per device, 140 characters, never to your own card', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  assert.deepEqual((await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year for you' }, dev: 'B' })).json, { sealed: true })
  const again = await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'again' }, dev: 'B' }); assert.equal(again.status, 409); assert.equal(again.json.error, 'already')
  assert.equal((await call('POST', 'wish', { body: { to: A.id, from: 'Mia', text: 'x'.repeat(141) }, dev: 'C' })).status, 400)
  assert.equal((await call('POST', 'wish', { body: { to: A.id, from: 'Mia', text: 'x'.repeat(140) }, dev: 'C' })).status, 200)
  assert.equal((await call('POST', 'wish', { body: { to: A.id, from: 'Me', text: 'hi' }, dev: 'A' })).json.error, 'own_card')
})

test('moderation: a flagged wish looks sealed to its writer, is hidden from the reader, and shows once approved', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  assert.deepEqual((await call('POST', 'wish', { body: { to: A.id, from: 'Spam', text: 'visit www.buy.com now' }, dev: 'D' })).json, { sealed: true })
  assert.equal((await call('GET', `me/${A.token}`, { query: { day: '2026-12-05' } })).json.wishes.length, 0)
  const queue = (await call('GET', 'admin/review', { auth: ADMIN })).json.wishes; assert.equal(queue.length, 1)
  assert.equal((await call('POST', `admin/review/${queue[0].id}`, { auth: ADMIN, body: { action: 'approve' } })).json.status, 'ok')
  assert.equal((await call('GET', `me/${A.token}`, { query: { day: '2026-12-05' } })).json.wishes.length, 1)
})

test('before Christmas: names and counts, no words, and nothing can be opened', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  await call('POST', 'open', { body: { id: A.id }, dev: 'B' }); await card('Tom', 'B', { parent: A.id, hook: 31 })
  await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year for you' }, dev: 'B' })
  const me = (await call('GET', `me/${A.token}`, { query: { day: '2026-12-05' } })).json
  assert.equal(me.released, false); assert.equal(me.wishes[0].from, 'Tom'); assert.equal('text' in me.wishes[0], false)
  assert.deepEqual(me.stats, { ornaments: 2, wishes: 1, opened: 1 })
  const early = await call('POST', `me/${A.token}/opened`, { body: { id: me.wishes[0].id, day: '2026-12-05' } }); assert.equal(early.status, 403); assert.equal(early.json.error, 'sealed')
})

test('Christmas: the reader opens and reports; another token cannot touch the wish', async () => {
  const { call, card } = world(), A = await card('Maria', 'A'), B = await card('Tom', 'B', { parent: A.id, hook: 31 })
  await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year for you' }, dev: 'B' })
  const me = (await call('GET', `me/${A.token}`, { query: { day: '2026-12-25' }, clock: XMAS })).json
  assert.equal(me.released, true); assert.equal(me.wishes[0].text, 'A calm year for you')
  const wid = me.wishes[0].id, day = '2026-12-25'
  assert.equal((await call('POST', `me/${B.token}/opened`, { body: { id: wid, day }, clock: XMAS })).status, 404)
  assert.equal((await call('POST', `me/${A.token}/opened`, { body: { id: wid, day }, clock: XMAS })).json.ok, true)
  await call('POST', `me/${A.token}/report`, { body: { id: wid, day }, clock: XMAS })
  assert.equal((await call('GET', `me/${A.token}`, { query: { day }, clock: XMAS })).json.wishes.length, 0)
})

test('self-wish: once per card', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  assert.equal((await call('POST', `me/${A.token}/wish`, { body: { text: 'Run a 10k' } })).json.sealed, true)
  assert.equal((await call('POST', `me/${A.token}/wish`, { body: { text: 'twice' } })).status, 409)
})

test('late arrival: a wish left on 27 December opens straight away', async () => {
  const { call, card } = world(), clock = '2026-12-27T12:00:00Z', L = await card('Late', 'L', {}, clock)
  await call('POST', 'wish', { body: { to: L.id, from: 'Tom', text: 'Better late' }, dev: 'B', clock })
  const me = (await call('GET', `me/${L.token}`, { query: { day: '2026-12-27' }, clock })).json
  assert.equal(me.released, true); assert.equal(me.wishes[0].text, 'Better late')
})

test('private links: the calendar file carries the link; public pages never carry the token', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  const ics = (await call('GET', `ics/${A.token}`)).text
  assert.match(ics, /DTSTART:20261225T090000\r\n/); assert.ok(ics.replace(/\r\n /g, '').includes(A.token))
  assert.equal(JSON.stringify((await call('GET', `card/${A.id}`, { dev: 'B' })).json).includes(A.token), false)
  assert.equal(JSON.stringify((await call('GET', 'tree/global')).json).includes(A.token), false)
  const prev = (await call('GET', `page/c/${A.id}`)).text; assert.match(prev, /Maria hung/); assert.equal(prev.includes(A.token), false)
})

test('freeze: after 1 January 12:00 UTC no cards and no gifts; the keepsake keeps names and counts', async () => {
  const { call, card, givingTree } = world(); await givingTree()
  const A = await card('Maria', 'A', { tree: 'coffee' }), after = '2027-01-02T00:00:00Z'
  await call('POST', 'open', { body: { id: A.id }, dev: 'B' })
  const late = await call('POST', 'card', { body: { tree: 'coffee', name: 'Late', design: 0, hook: 1 }, clock: after }); assert.equal(late.status, 410); assert.equal(late.json.error, 'frozen')
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'Z', clock: after })).json.reason, 'closed')
  const k = (await call('GET', 'keepsake/coffee', { clock: after })).json; assert.deepEqual(k.names, ['Maria']); assert.equal(k.tree.giving.given, 10); assert.equal(k.counts.ornaments, 1)
})

test('deletion: wishes are gone on 1 February 2027; the card stays', async () => {
  let now = Date.UTC(2026, 11, 5); const repo = memoryRepo({ now: () => now }), { call, card } = world({}, repo), A = await card('Maria', 'A')
  await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year' }, dev: 'B' })
  assert.equal((await repo.wishesFor(A.id)).length, 1)
  now = Date.UTC(2027, 1, 1)
  assert.equal((await repo.wishesFor(A.id)).length, 0); assert.ok(await repo.getCard(A.id))
})

test('removal: "remove my ornament" takes it off the tree and deletes its wishes', async () => {
  const { repo, call, card } = world(), A = await card('Maria', 'A')
  await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year' }, dev: 'B' })
  assert.equal((await call('POST', `me/${A.token}/remove`)).json.ok, true)
  assert.equal((await call('GET', 'tree/global')).json.ornaments.length, 0)
  assert.deepEqual((await call('GET', 'keepsake/global')).json.names, [])
  assert.equal((await call('GET', `card/${A.id}`, { dev: 'B' })).status, 404)
  assert.equal((await repo.wishesFor(A.id)).length, 0)
  assert.equal((await call('GET', `me/${A.token}`)).json.removed, true)
})

test('production: test routes are closed, the fake clock and device are ignored, and the device cookie is HttpOnly', async () => {
  const repo = memoryRepo(), live = (method, path, body, headers = {}) => handle({ method, path, body, headers }, repo, {})
  assert.equal((await live('POST', 'demo/card', { tree: 'global', name: 'x', design: 0, hook: 0 })).status, 404)
  assert.equal((await live('GET', 'health')).json.testMode, false)
  assert.equal((await live('POST', 'card', { tree: 'global', name: 'Liv', design: 0, hook: 1 }, { 'x-gt-clock': '2027-06-01T00:00:00Z', cookie: 'gt_d=abc' })).status, Date.now() < Date.UTC(2027, 0, 1, 12) ? 200 : 410)
  assert.match((await live('GET', 'health')).headers['set-cookie'], /HttpOnly/)
  const hashed = await handle({ method: 'POST', path: 'card', body: { tree: 'global', name: 'Ada', design: 0, hook: 2 }, headers: { cookie: 'gt_d=plain-device' } }, repo, { hashDevice: async id => 'h:' + id.length })
  assert.equal((await repo.getCard(hashed.json.id)).device, 'h:12')
})
