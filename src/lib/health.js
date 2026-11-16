// How the 3D scene behaved on this device, told to the team as a count: no_webgl, gl_lost, gl_restored, scene_error,
// chunk_error, tier_low. Only the name and the tree are sent, once per name per page load. An error's own message
// goes to the server log, which strips private links. (specs/012-production-scene)
import { post } from './api'

const sent = new Set()
const slugHere = () => (location.pathname.match(/^\/t\/([\w-]+)/) || [])[1] || 'global'

export function report(name, message, tree) {
  if (sent.has(name)) return
  sent.add(name)
  post('event', { name, tree: tree || slugHere() }).catch(() => {})
  if (message) post('log', { message: `${name}: ${message}`, screen: location.pathname.split('/')[1] || 'home', build: import.meta.env.MODE }).catch(() => {})
}

/**
 * Errors the page hits anywhere, sent to the server log so the team hears about them: the message and where in the
 * code, never what someone typed. At most five per page load, each different one once. The server removes private
 * links and long tokens before it writes anything down.
 */
export function watchErrors() {
  const seen = new Set()
  const send = (kind, message, where) => {
    const text = String(message || '').slice(0, 300)
    if (!text || /^Script error\.?$|ResizeObserver loop/.test(text) || seen.has(text) || seen.size >= 5) return
    seen.add(text)
    post('log', { message: `${kind}: ${text}${where ? ' @ ' + where : ''}`, screen: location.pathname.split('/')[1] || 'home', build: import.meta.env.MODE }).catch(() => {})
  }
  window.addEventListener('error', e => send('error', e.message, e.filename ? `${e.filename.split('/').pop()}:${e.lineno}` : ''))
  window.addEventListener('unhandledrejection', e => send('rejection', e.reason?.message || e.reason, ''))
}
