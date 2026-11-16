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
