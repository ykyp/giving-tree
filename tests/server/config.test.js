import test from 'node:test'
import assert from 'node:assert/strict'
import { world } from './helpers.js'

test('email off (the launch setting): no reminder is stored, health says so, and the cron sends nothing', async () => {
  const mail = [], w = world({ emailEnabled: false, cronSecret: 'c', sendEmail: async m => mail.push(m) }), A = await w.card('Maria', 'A')
  const r = await w.call('POST', `me/${A.token}/reminder`, { body: { email: 'a@example.com', news: false } }); assert.equal(r.status, 404); assert.equal(r.json.error, 'email_off')
  assert.equal((await w.call('GET', 'health')).json.email, false)
  assert.deepEqual((await w.call('GET', 'cron/email', { auth: 'Bearer c' })).json, { sent: 0 }); assert.equal(mail.length, 0)
})

test('email on: one reminder per address, sent once, with the private link', async () => {
  const mail = [], w = world({ emailEnabled: true, cronSecret: 'c', origin: 'https://tree.test', sendEmail: async m => mail.push(m) }), A = await w.card('Maria', 'A')
  assert.equal((await w.call('POST', `me/${A.token}/reminder`, { body: { email: 'not-an-email' } })).json.error, 'bad_email')
  assert.equal((await w.call('POST', `me/${A.token}/reminder`, { body: { email: 'a@example.com', news: false } })).json.ok, true)
  assert.deepEqual((await w.call('GET', 'cron/email', { auth: 'Bearer c' })).json, { sent: 1 })
  assert.deepEqual((await w.call('GET', 'cron/email', { auth: 'Bearer c' })).json, { sent: 0 })
  assert.equal(mail.length, 1); assert.equal(mail[0].to, 'a@example.com'); assert.ok(mail[0].text.includes(`https://tree.test/me/${A.token}`))
})

test('secrets: operator and cron routes are closed without the right secret, and when none is set', async () => {
  const open = world({ adminSecret: undefined })
  for (const [m, p] of [['GET', 'admin/trees'], ['GET', 'admin/measures'], ['GET', 'admin/review'], ['POST', 'admin/review/x'], ['POST', 'admin/trees'], ['POST', 'admin/cards/x/hide'], ['GET', 'cron/email'], ['GET', 'cron/ops']]) {
    assert.equal((await open.call(m, p, { query: { tree: 'global' } })).status, 401, p)
    assert.equal((await open.call(m, p, { query: { tree: 'global' }, auth: 'Bearer undefined' })).status, 401, p)
  }
  const set = world({ cronSecret: 'c' })
  assert.equal((await set.call('GET', 'admin/measures', { query: { tree: 'global' }, auth: 'Bearer wrong' })).status, 401)
  assert.equal((await set.call('GET', 'admin/measures', { query: { tree: 'global' }, auth: 'Bearer s3' })).status, 200)
  const signedIn = world({ adminSecret: undefined, operator: async h => h.authorization === 'Bearer session-of-an-operator' })
  assert.equal((await signedIn.call('GET', 'admin/review', { auth: 'Bearer session-of-an-operator' })).status, 200)
  assert.equal((await signedIn.call('GET', 'admin/review', { auth: 'Bearer someone-else' })).status, 401)
})

test('measures: counts cards, wishes, opens by visit, saves and returns, for one tree', async () => {
  const w = world(), A = await w.card('Maria', 'A')
  await w.call('POST', 'open', { body: { id: A.id }, dev: 'B' }); await w.card('Tom', 'B', { parent: A.id, hook: 31 })
  await w.call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year' }, dev: 'B' }); await w.call('POST', `me/${A.token}/wish`, { body: { text: 'Mine' } })
  await w.call('POST', 'event', { body: { name: 'share_v1', tree: 'global' } }); await w.call('POST', 'event', { body: { name: 'saved_calendar', tree: 'global' } })
  assert.equal((await w.call('POST', 'event', { body: { name: 'made_up', tree: 'global' } })).status, 400)
  assert.equal((await w.call('POST', 'event', { body: { name: 'share_v1', tree: 'nope' } })).status, 404)
  const xmas = '2026-12-25T09:00:00Z'
  await w.call('GET', `me/${A.token}`, { query: { day: '2026-12-25' }, clock: xmas }); await w.call('GET', `me/${A.token}`, { query: { day: '2026-12-25' }, clock: xmas })
  await w.call('POST', 'open', { body: { id: A.id }, dev: 'C', clock: xmas })
  const m = (await w.call('GET', 'admin/measures', { query: { tree: 'global' }, auth: 'Bearer s3' })).json
  assert.deepEqual({ cards: m.cards, wishes: m.wishes, self_wishes: m.self_wishes, opens_v1: m.opens_v1, opens_v2: m.opens_v2, share_v1: m.share_v1, saved_calendar: m.saved_calendar, returns: m.returns, given: m.given },
    { cards: 2, wishes: 1, self_wishes: 1, opens_v1: 1, opens_v2: 1, share_v1: 1, saved_calendar: 1, returns: 1, given: 0 })
})

test('operator notices: wishes waiting more than a day, and a pot passing 90% where giving is on', async () => {
  const sent = [], w = world({ cronSecret: 'c', notify: async m => sent.push(m) }), A = await w.card('Maria', 'A')
  await w.call('POST', 'wish', { body: { to: A.id, from: 'Spam', text: 'visit www.buy.com' }, dev: 'D' })
  assert.deepEqual((await w.call('GET', 'cron/ops', { auth: 'Bearer c' })).json.notes, [])
  const next = (await w.call('GET', 'cron/ops', { auth: 'Bearer c', clock: '2026-12-06T13:00:00Z' })).json.notes
  assert.equal(next.length, 1); assert.match(next[0], /waiting for review/); assert.equal(sent.length, 1)
  await w.givingTree('coffee', 20); const P = await w.card('Pot', 'P', { tree: 'coffee' })
  for (const d of ['Q', 'R']) await w.call('POST', 'open', { body: { id: P.id }, dev: d })
  assert.ok((await w.call('GET', 'cron/ops', { auth: 'Bearer c' })).json.notes.some(n => /Coffee Club: the pot is complete/.test(n)))
})

test('error log: accepted, trimmed, and never keeps a private link', async () => {
  const w = world(), lines = [], orig = console.error; console.error = l => lines.push(l)
  try { assert.equal((await w.call('POST', 'log', { body: { message: 'Failed at /me/abcdefghijklmnopqrstuvwx ' + 'x'.repeat(900), screen: 'parcels', build: 'b1' } })).json.ok, true) } finally { console.error = orig }
  assert.equal(lines.length, 1); assert.equal(lines[0].includes('abcdefghijklmnopqrstuvwx'), false); assert.ok(lines[0].length < 700)
})
