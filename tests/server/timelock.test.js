import test from 'node:test'
import assert from 'node:assert/strict'
import { world } from './helpers.js'

// A reader's own midnight on 25 December, as a UTC time, and their local date at any moment.
const midnight = offsetH => Date.UTC(2026, 11, 25) - offsetH * 3600000
const localDay = (utcMs, offsetH) => new Date(utcMs + offsetH * 3600000).toISOString().slice(0, 10)
const iso = ms => new Date(ms).toISOString()

async function sealed() {
  const w = world(), A = await w.card('Maria', 'A')
  await w.call('POST', 'wish', { body: { to: A.id, from: 'Tom', text: 'A calm year for you' }, dev: 'B' })
  const read = async (utcMs, day) => (await w.call('GET', `me/${A.token}`, { query: { day }, clock: iso(utcMs) })).json
  return { read }
}

for (const [place, off] of [['Kiritimati, UTC+14', 14], ['Auckland, UTC+13', 13], ['London, UTC+0', 0], ['New York, UTC-5', -5], ['Honolulu, UTC-10', -10]]) {
  test(`time lock: ${place} opens at its own midnight and not a minute before`, async () => {
    const { read } = await sealed(), m = midnight(off)
    const before = await read(m - 60000, localDay(m - 60000, off))
    assert.equal(before.released, false); assert.equal('text' in before.wishes[0], false)
    const at = await read(m, localDay(m, off))
    assert.equal(at.released, true); assert.equal(at.wishes[0].text, 'A calm year for you')
  })
}

test('time lock: a device clock set forward cannot open a wish before the earliest time zone reaches Christmas', async () => {
  const { read } = await sealed()
  for (const t of [Date.UTC(2026, 11, 20), Date.UTC(2026, 11, 24, 9, 59)]) {
    const r = await read(t, '2026-12-25'); assert.equal(r.released, false); assert.equal('text' in r.wishes[0], false)
    assert.equal((await read(t, '2027-01-01')).released, false)
  }
})

test('time lock: a device still on 24 December stays sealed after the earliest release', async () => {
  const { read } = await sealed(), r = await read(Date.UTC(2026, 11, 24, 23), '2026-12-24')
  assert.equal(r.released, false); assert.equal('text' in r.wishes[0], false)
})

test('time lock: a malformed device date falls back to the server date', async () => {
  const { read } = await sealed()
  assert.equal((await read(Date.UTC(2026, 11, 24, 12), 'tomorrow')).released, false)
  assert.equal((await read(Date.UTC(2026, 11, 25, 12), '9999')).released, true)
})
