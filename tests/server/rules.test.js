import test from 'node:test'
import assert from 'node:assert/strict'
import { handle } from '../../server/app.js'
import { memoryKv } from '../../server/kv-memory.js'
import { world, DEC5 } from './helpers.js'

const XMAS = '2026-12-25T09:00:00Z'

test('counting: own device, bots and repeat opens never give; the first new device does', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  assert.equal((await call('POST', 'open', { body: { id: A.id } })).json.reason, 'own')
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'B', ua: 'WhatsApp/2.0' })).json.reason, 'bot')
  const first = (await call('POST', 'open', { body: { id: A.id }, dev: 'B' })).json
  assert.equal(first.counted, true); assert.equal(first.tree.given, 10)
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'B' })).json.reason, 'again')
})

test('counting: stops at the cap and rolls the attempt back', async () => {
  const kv = memoryKv(); await kv.set('given:mosaicads', String(50000 - 5))
  const { call, card } = world({ devClock: true }, kv), P = await card('Pot', 'P')
  assert.deepEqual((await call('POST', 'open', { body: { id: P.id }, dev: 'Q' })).json, { counted: false, reason: 'cap' })
  assert.equal(await kv.get('given:mosaicads'), '49995')
})

test('pot complete: an open at the cap is refused and the branch page says the tree is complete', async () => {
  const kv = memoryKv(); await kv.set('given:mosaicads', '50000')
  const { call, card } = world({ devClock: true }, kv), P = await card('Pot', 'P')
  assert.equal((await call('POST', 'open', { body: { id: P.id }, dev: 'Q' })).json.reason, 'cap')
  assert.equal((await call('GET', `me/${P.token}`, { query: { day: '2026-12-05' } })).json.tree.complete, true)
})

test('names: blocked names are refused', async () => {
  const { call } = world()
  assert.equal((await call('POST', 'card', { body: { brand: 'mosaicads', name: 'admin', design: 2, hook: 30 } })).status, 400)
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
  const env = { devClock: true, adminSecret: 's3' }, { call, card } = world(env), A = await card('Maria', 'A'), auth = 'Bearer s3'
  assert.deepEqual((await call('POST', 'wish', { body: { to: A.id, from: 'Spam', text: 'visit www.buy.com now' }, dev: 'D' })).json, { sealed: true })
  assert.equal((await call('GET', `me/${A.token}`, { query: { day: '2026-12-05' } })).json.wishes.length, 0)
  const queue = (await call('GET', 'admin/review', { auth })).json.wishes; assert.equal(queue.length, 1)
  assert.equal((await call('POST', `admin/review/${queue[0].id}`, { auth, body: { action: 'approve' } })).json.status, 'ok')
  assert.equal((await call('GET', `me/${A.token}`, { query: { day: '2026-12-05' } })).json.wishes.length, 1)
})

test('before Christmas: names and counts, no words, and nothing can be opened', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  await call('POST', 'open', { body: { id: A.id }, dev: 'B' }); await card('Tom', 'B', { parent: A.id, hook: 31 })
  await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year for you' }, dev: 'B' })
  const me = (await call('GET', `me/${A.token}`, { query: { day: '2026-12-05' } })).json
  assert.equal(me.released, false); assert.equal(me.wishes[0].from, 'Tom'); assert.equal('text' in me.wishes[0], false)
  assert.deepEqual(me.stats, { ornaments: 2, opened: 1, given: 10 })
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
  const prev = (await call('GET', `preview/${A.id}`)).text; assert.match(prev, /Maria hung/); assert.equal(prev.includes(A.token), false)
})

test('freeze: after 1 January 12:00 UTC no cards and no gifts; the keepsake keeps names and totals', async () => {
  const { call, card } = world(), A = await card('Maria', 'A'), after = '2027-01-02T00:00:00Z'
  await call('POST', 'open', { body: { id: A.id }, dev: 'B' })
  const late = await call('POST', 'card', { body: { brand: 'mosaicads', name: 'Late', design: 0, hook: 1 }, clock: after }); assert.equal(late.status, 410); assert.equal(late.json.error, 'frozen')
  assert.equal((await call('POST', 'open', { body: { id: A.id }, dev: 'Z', clock: after })).json.reason, 'closed')
  const k = (await call('GET', 'keepsake/mosaicads', { clock: after })).json; assert.deepEqual(k.names, ['Maria']); assert.equal(k.given, 10)
})

test('deletion: wishes are gone on 1 February 2027; the card stays', async () => {
  let now = Date.UTC(2026, 11, 5); const kv = memoryKv({ now: () => now }), { call, card } = world({ devClock: true }, kv), A = await card('Maria', 'A')
  await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year' }, dev: 'B' })
  assert.equal((await kv.lrange(`wl:${A.id}`)).length, 1)
  now = Date.UTC(2027, 1, 1)
  assert.equal((await kv.lrange(`wl:${A.id}`)).length, 0); assert.ok(await kv.get(`card:${A.id}`))
})

test('production: demo routes are closed, the fake clock is ignored, and the device cookie is HttpOnly', async () => {
  const kv = memoryKv(), live = (method, path, body, headers = {}) => handle({ method, path, body, headers }, kv, {})
  assert.equal((await live('POST', 'demo/card', { brand: 'mosaicads', name: 'x', design: 0, hook: 0 })).status, 404)
  assert.equal((await live('POST', 'card', { brand: 'mosaicads', name: 'Liv', design: 0, hook: 1 }, { 'x-gt-clock': '2027-06-01T00:00:00Z', cookie: 'gt_d=abc' })).status, Date.now() < Date.UTC(2027, 0, 1, 12) ? 200 : 410)
  assert.match((await live('GET', 'health')).headers['set-cookie'], /HttpOnly/)
})

test('link previews: the thank-you preview uses the branch name and the exact amount', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  await call('POST', 'open', { body: { id: A.id }, dev: 'B' })
  assert.match((await call('GET', `preview/${A.id}`, { query: { t: '1' } })).text, /Thank you from Maria&#39;s branch.*Our branch gave £0\.10/)
  await call('POST', `me/${A.token}/branch`, { body: { name: 'The Georgiou family' } })
  assert.match((await call('GET', `preview/${A.id}`, { query: { t: '1' } })).text, /Thank you from The Georgiou family/)
})
