// Shared by the server-rule tests: a fresh in-memory store and a caller with a fake device and clock.
import { handle } from '../../server/app.js'
import { memoryKv } from '../../server/kv-memory.js'

export const DEC5 = '2026-12-05T12:00:00Z'
export function world(env = { devClock: true }, kv = memoryKv()) {
  const call = (method, path, { body, dev = 'A', clock = DEC5, query, ua = 'Mozilla/5.0', auth } = {}) =>
    handle({ method, path, body, query, headers: { 'x-gt-device': dev, 'x-gt-clock': clock, 'user-agent': ua, ...(auth ? { authorization: auth } : {}) } }, kv, env)
  const card = async (name, dev, extra = {}, clock = DEC5) => (await call('POST', 'card', { body: { brand: 'mosaicads', name, design: 1, hook: 30, ...extra }, dev, clock })).json
  return { kv, call, card }
}
