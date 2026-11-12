import test from 'node:test'
import assert from 'node:assert/strict'
import { world } from './helpers.js'

test('email off (the launch setting): no reminder is stored, health says so, and the cron sends nothing', async () => {
  const mail = [], w = world({ devClock: true, emailEnabled: false, cronSecret: 'c', sendEmail: async m => mail.push(m) }), A = await w.card('Maria', 'A')
  const r = await w.call('POST', `me/${A.token}/reminder`, { body: { email: 'a@example.com', news: false } }); assert.equal(r.status, 404); assert.equal(r.json.error, 'email_off')
  assert.equal((await w.call('GET', 'health')).json.email, false)
  assert.deepEqual((await w.call('GET', 'cron/email', { auth: 'Bearer c' })).json, { sent: 0 }); assert.equal(mail.length, 0)
})

test('email on: one reminder per address, sent once, with the private link', async () => {
  const mail = [], w = world({ devClock: true, emailEnabled: true, cronSecret: 'c', origin: 'https://tree.test', sendEmail: async m => mail.push(m) }), A = await w.card('Maria', 'A')
  assert.equal((await w.call('POST', `me/${A.token}/reminder`, { body: { email: 'not-an-email' } })).json.error, 'bad_email')
  assert.equal((await w.call('POST', `me/${A.token}/reminder`, { body: { email: 'a@example.com', news: false } })).json.ok, true)
  assert.deepEqual((await w.call('GET', 'cron/email', { auth: 'Bearer c' })).json, { sent: 1 })
  assert.deepEqual((await w.call('GET', 'cron/email', { auth: 'Bearer c' })).json, { sent: 0 })
  assert.equal(mail.length, 1); assert.equal(mail[0].to, 'a@example.com'); assert.ok(mail[0].text.includes(`https://tree.test/me/${A.token}`))
})

test('secrets: admin and cron routes are closed without the right secret, and when none is set', async () => {
  const open = world({ devClock: true })
  for (const [m, p] of [['GET', 'admin/metrics'], ['GET', 'admin/review'], ['POST', 'admin/review/x'], ['GET', 'cron/email']]) {
    assert.equal((await open.call(m, p, { query: { brand: 'mosaicads' } })).status, 401)
    assert.equal((await open.call(m, p, { query: { brand: 'mosaicads' }, auth: 'Bearer undefined' })).status, 401)
  }
  const set = world({ devClock: true, adminSecret: 'a', cronSecret: 'c' })
  assert.equal((await set.call('GET', 'admin/metrics', { query: { brand: 'mosaicads' }, auth: 'Bearer wrong' })).status, 401)
  assert.equal((await set.call('GET', 'admin/metrics', { query: { brand: 'mosaicads' }, auth: 'Bearer a' })).status, 200)
})

test('metrics: counts cards, wishes, opens by visit, saves and returns', async () => {
  const w = world({ devClock: true, adminSecret: 'a' }), A = await w.card('Maria', 'A')
  await w.call('POST', 'open', { body: { id: A.id }, dev: 'B' }); await w.card('Tom', 'B', { parent: A.id, hook: 31 })
  await w.call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year' }, dev: 'B' })
  await w.call('POST', 'event', { body: { name: 'share_v1', brand: 'mosaicads' } }); await w.call('POST', 'event', { body: { name: 'saved_calendar', brand: 'mosaicads' } })
  assert.equal((await w.call('POST', 'event', { body: { name: 'made_up', brand: 'mosaicads' } })).status, 400)
  const xmas = '2026-12-25T09:00:00Z'
  await w.call('GET', `me/${A.token}`, { query: { day: '2026-12-25' }, clock: xmas }); await w.call('GET', `me/${A.token}`, { query: { day: '2026-12-25' }, clock: xmas })
  await w.call('POST', 'open', { body: { id: A.id }, dev: 'C', clock: xmas })
  const m = (await w.call('GET', 'admin/metrics', { query: { brand: 'mosaicads' }, auth: 'Bearer a' })).json
  assert.deepEqual({ cards: m.cards, wishes: m.wishes, opens_v1: m.opens_v1, opens_v2: m.opens_v2, share_v1: m.share_v1, saved_calendar: m.saved_calendar, returns: m.returns, given: m.given },
    { cards: 2, wishes: 1, opens_v1: 1, opens_v2: 1, share_v1: 1, saved_calendar: 1, returns: 1, given: 20 })
})
