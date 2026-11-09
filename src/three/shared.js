import * as THREE from 'three'
import { useStore } from '../store'
import { now, clamp, easeOut } from '../lib/util'
// Mutable, per-frame state shared between scene components (kept out of React to avoid re-renders).
export const shared = window.__shared = {
  camera: null, gl: null, scene: null,
  hooks: [],            // [{p, n, y}] hang points on the tree
  hookHi: -1,           // hook under the dragged ornament
  heroPos: new THREE.Vector3(), heroVisible: false, heroBody: new THREE.Vector3(),
  dragging: false, hangAz: 0, hangY: 6.6, hangR: 21, hangS: { az: 0, y: 6.6, r: 21 }, orbiting: null,
  crowdWorld: [],       // [{id, name, design, mins, wp, hook, you}]
  focusPos: null, focusHook: -1,
  snapshot: null,       // fn(name) -> dataURL of the hero close-up
  skipArrival: false,
}
const AFTER_LIGHT = new Set(['choose', 'engrave', 'gift', 'unwrap', 'hang', 'settling', 'crown', 'crowning', 'greeting', 'explore'])
/** 0 = dark square, 1 = everything lit. */
export function litLevel() {
  const s = useStore.getState()
  if (s.phase === 'lighting') return clamp((now() - s.phaseAt) / 4.2, 0, 1)
  return AFTER_LIGHT.has(s.phase) ? 1 : 0
}
export const glow = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.22, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c) })()
export { easeOut }
