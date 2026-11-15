import test from 'node:test'
import assert from 'node:assert/strict'
import { world, ADMIN } from './helpers.js'
import { calendarLinks } from '../../shared/calendar.js'

test('team screen: the review list says whose wish it is, where, and why it is waiting; approving shows it again', async () => {
  const { call, card } = world(), A = await card('Maria', 'A')
  await call('POST', `me/${A.token}/wish`, { body: { text: 'More sea' }, dev: 'A' })
  await call('POST', `card/${A.id}/report`, { dev: 'R' })
  await call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'ring me 07700 900123' }, dev: 'B' })
  const q = (await call('GET', 'admin/review', { auth: ADMIN })).json.wishes
  assert.deepEqual(q.map(w => [w.kind, w.from, w.toName, w.treeName, w.reported]), [['self', 'Maria', 'Maria', 'The Giving Tree', true], ['friend', 'Tom', 'Maria', 'The Giving Tree', false]])
  assert.equal('device' in q[0], false, 'no device ids on the screen')
  await call('POST', `admin/review/${q[0].id}`, { auth: ADMIN, body: { action: 'approve' } })
  assert.equal((await call('GET', `card/${A.id}`, { dev: 'C' })).json.wish, 'More sea')
  assert.equal((await call('GET', 'admin/review')).status, 401)
})

test('team screen: the sign-in page is told only public values', async () => {
  assert.deepEqual((await world().call('GET', 'ops/config')).json, { auth: null })
  assert.deepEqual((await world({ opsAuth: { url: 'https://p.supabase.co', key: 'sb_publishable_x' } }).call('GET', 'ops/config')).json, { auth: { url: 'https://p.supabase.co', key: 'sb_publishable_x' } })
})

test('calendar: the file opens in place, has a reminder, and the links carry the same event and the key', async () => {
  const { call, card } = world(), A = await card('Maria', 'A'), r = await call('GET', `ics/${A.token}`)
  assert.match(r.headers['content-disposition'], /^inline/); assert.equal(r.type, 'text/calendar; charset=utf-8')
  const ics = r.text.replace(/\r\n /g, '')
  for (const line of ['BEGIN:VCALENDAR', 'METHOD:PUBLISH', 'DTSTART:20261225T090000', 'DTEND:20261225T093000', 'BEGIN:VALARM', 'TRIGGER:PT0M', 'END:VCALENDAR']) assert.ok(ics.split('\r\n').includes(line), line)
  assert.ok(ics.includes(`/me/${A.token}`)); assert.equal(r.text.split('\r\n').every(l => l.length <= 75), true)
  const l = calendarLinks('https://x.test/me/KEY')
  assert.match(l.google, /^https:\/\/calendar\.google\.com\/calendar\/render\?action=TEMPLATE&text=.+&dates=20261225T090000\/20261225T093000&details=.+KEY$/)
  assert.match(l.outlook, /^https:\/\/outlook\.live\.com\/calendar\/.+startdt=2026-12-25T09%3A00%3A00&enddt=2026-12-25T09%3A30%3A00&body=.+KEY$/)
})
