// Talks to /api. With no server behind the page (a static preview, or before the store is connected) the same rules
// run in this browser instead, and the demo panel says so.
import { handle } from '../../server/app.js'
import { memoryKv } from '../../server/kv-memory.js'

const lsGet = k => { try { return localStorage.getItem(k) } catch (e) { return null } }
const lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} }
const newDevice = () => 'd' + Math.random().toString(36).slice(2, 12)

export const api = { info: { ok: false }, local: false, clockIso: null, device: lsGet('gt-dev-device') || newDevice() }
lsSet('gt-dev-device', api.device)
let kv = null

/**
 * Demo mode (rules run in this browser) is only for pages with no API at all: the single-file preview, which says so
 * with a <meta name="gt-demo">, or a static host where /api/health is missing. If the API exists but can't serve
 * (no store, or the network failed) the page must say so and stop: a wish saved only in this browser reaches no one.
 */
export async function bootApi() {
  api.local = false; api.info = { ok: false }
  if (!document.querySelector('meta[name="gt-demo"]')) {
    let r; try { r = await fetch('/api/health') } catch (e) { return }
    const isJson = (r.headers.get('content-type') || '').includes('json')
    if (isJson) { const j = await r.json().catch(() => ({})); if (r.ok && j.ok) api.info = j; if (r.status !== 404) return }
    else if (r.status >= 500) return
  }
  api.local = true; api.info = { ok: true, email: false, devClock: true }
  kv = memoryKv({ load: () => { try { return JSON.parse(lsGet('gt-demo-store') || '{}') } catch (e) { return {} } }, save: d => lsSet('gt-demo-store', JSON.stringify(d)) })
}
export function newDeviceId() { api.device = newDevice(); lsSet('gt-dev-device', api.device) }

async function call(method, path, body) {
  const headers = { 'content-type': 'application/json' }
  if (api.info.devClock) { headers['x-gt-device'] = api.device; if (api.clockIso) headers['x-gt-clock'] = api.clockIso }
  if (api.local) {
    const [p, qs] = path.split('?'), out = await handle({ method, path: p, query: Object.fromEntries(new URLSearchParams(qs || '')), body: body || {}, headers: { ...headers, 'user-agent': navigator.userAgent } }, kv, { devClock: true, sampleTotals: true, origin: location.origin })
    if (out.status >= 400) throw Object.assign(new Error(out.json.error), { code: out.json.error })
    return out.json ?? out.text
  }
  const r = await fetch('/api/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' })
  const isJson = (r.headers.get('content-type') || '').includes('json'), data = isJson ? await r.json() : await r.text()
  if (!r.ok) throw Object.assign(new Error(data.error || 'request failed'), { code: data.error })
  return data
}
export const get = path => call('GET', path)
export const post = (path, body = {}) => call('POST', path, body)
export const track = (name, brand) => { post('event', { name, brand }).catch(() => {}) }

/** One-tap .ics: a real URL on the live site, a generated file in the no-server demo. */
export async function addToCalendar(token) {
  if (!api.local) { location.href = `/api/ics/${token}`; return }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([await get(`ics/${token}`)], { type: 'text/calendar' })); a.download = 'christmas-wishes.ics'; a.click()
}
