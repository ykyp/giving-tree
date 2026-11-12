// Talks to the server at /api. The single-file demo build (no server at all) runs the same rules in the browser
// instead; nothing else ever does. If the server can't serve, the page says so rather than pretend.
const lsGet = k => { try { return localStorage.getItem(k) } catch (e) { return null } }
const lsSet = (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} }
const newDevice = () => 'd' + Math.random().toString(36).slice(2, 12)
export const DEMO = import.meta.env.MODE === 'demo'

export const api = { info: { ok: false }, local: false, clockIso: null, device: null }
let local = null, booting = null

export function bootApi() { return booting ||= boot().finally(() => { booting = null }) }
async function boot() {
  api.info = { ok: false }
  if (DEMO) {
    const { localServer } = await import('./local.js')
    local = localServer({ load: () => { try { return JSON.parse(lsGet('gt-demo-repo') || '{}') } catch (e) { return {} } }, save: d => lsSet('gt-demo-repo', JSON.stringify(d)) })
    api.local = true; api.info = { ok: true, email: false, testMode: true }
  } else {
    try { const r = await fetch('/api/health'); const j = await r.json(); if (r.ok && j.ok) api.info = j } catch (e) {}
  }
  // test tools (local development and the demo only): a pretend device and date
  if (api.info.testMode) { api.device = lsGet('gt-dev-device') || newDevice(); lsSet('gt-dev-device', api.device); const d = lsGet('gt-demo-date'); api.clockIso = d ? new Date(d).toISOString() : null }
  return api.info
}
export function newDeviceId() { api.device = newDevice(); lsSet('gt-dev-device', api.device) }

async function call(method, path, body) {
  const headers = { 'content-type': 'application/json' }
  if (api.info.testMode) { headers['x-gt-device'] = api.device; if (api.clockIso) headers['x-gt-clock'] = api.clockIso }
  if (local) {
    const [p, qs] = path.split('?'), out = await local({ method, path: p, query: Object.fromEntries(new URLSearchParams(qs || '')), body: body || {}, headers: { ...headers, 'user-agent': navigator.userAgent } })
    if (out.status >= 400) throw Object.assign(new Error(out.json?.error), { code: out.json?.error })
    return out.json ?? out.text
  }
  const r = await fetch('/api/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' })
  const isJson = (r.headers.get('content-type') || '').includes('json'), data = isJson ? await r.json() : await r.text()
  if (!r.ok) throw Object.assign(new Error(data.error || 'request failed'), { code: data.error })
  return data
}
export const get = path => call('GET', path)
export const post = (path, body = {}) => call('POST', path, body)
export const track = (name, tree) => { post('event', { name, tree }).catch(() => {}) }

/** One-tap .ics: a real address on the site, a generated file in the demo. */
export async function addToCalendar(token) {
  if (!api.local) { location.href = `/api/ics/${token}`; return }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([await get(`ics/${token}`)], { type: 'text/calendar' })); a.download = 'christmas-wishes.ics'; a.click()
}
/** The branches this phone has hung, one per tree. Kept on the phone only. */
export const myBranches = () => { try { return Object.values(JSON.parse(lsGet('gt3-mine') || '{}')) } catch (e) { return [] } }
