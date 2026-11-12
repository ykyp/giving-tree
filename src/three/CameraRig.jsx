import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { useStore } from '../store'
import { CRATE, HELD } from '../config'
import { now, ease, clamp, reduceMotion } from '../lib/util'
import { shared } from './shared'
import { crowd } from './Crowd'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
/* Fly-in: rooftops → down the lane → under the arch → into the square (spline, like the Diwali card's arrival). */
const FLY = new THREE.CatmullRomCurve3([V(6, 30, 132), V(2, 19, 110), V(-1, 8, 88), V(.5, 3.6, 64), V(0, 3.4, 46)], false, 'centripetal')
const FLY_LOOK = new THREE.CatmullRomCurve3([V(0, 10, 84), V(0, 6, 64), V(0, 5, 40), V(0, 6.2, 0)], false, 'centripetal')
export const FLY_DUR = 10.5

/** Close on your ornament, with the parcels below it in the upper half of the frame. */
function branchShot(s, dur) { const h = shared.hooks[s.heroHook] || shared.hooks[0]; return [h.p.clone().addScaledVector(h.n, 3.8).add(V(0, .1, 0)), h.p.clone().add(V(0, -1.25, 0)), dur] }
function shotFor(phase, s, t) {
  const k = t - s.phaseAt
  switch (phase) {
    case 'dark': return [V(0, 3.4, 46), V(0, 6.2, 0), 1.5]
    case 'lighting': return k < 2.4 ? [V(0, 3, 23), V(0, 7, 0), 2.4] : [V(-14, 2.6, 15), V(0, 7.6, 0), 2.2]
    case 'choose': return [V(0, 3.5, 13.9), V(0, .75, CRATE[2]), 2.6]
    case 'engrave': return [V(0, 1.95, 11.2), V(0, 1.28, HELD[2]), 1.8]
    case 'gift': return [V(-1.2, 2.5, 11.7), V(0, .6, CRATE[2]), 2.6]
    case 'unwrap': case 'meet': return [V(.5, 2.2, 11.2), V(0, 1.5, 7.6), 2]
    case 'wishfor': return s.view === 'open' ? [V(.5, 2.2, 11.2), V(0, 1.5, 7.6), 2] : branchShot(s, 1.6)
    case 'seal': case 'branch': case 'parcels': case 'gave': case 'thanks': case 'selfwish': return branchShot(s, 1.6)
    case 'mearrive': return branchShot(s, 4.8)
    case 'hang': { const h = shared.hangS; return [V(Math.sin(h.az) * h.r, h.y, Math.cos(h.az) * h.r), V(0, Math.max(2.2, h.y - .8 - (21 - h.r) * .05), 0), 2] }
    case 'settling': { const h = shared.hooks[s.heroHook] || shared.hooks[0]; return [h.p.clone().addScaledVector(h.n, 3.1).add(V(0, .55, 0)), h.p.clone().add(V(0, -.35, 0)), 1.6] }
    case 'crown': return [V(0, 13, 19), V(0, 14.4, 0), 2.2]
    case 'crowning': return k < 2.4 ? [V(0, 13, 19), V(0, 14.4, 0), 2.2] : [V(0, 3.2, 22.5), V(0, 10.2, 0), 4.2]
    case 'greeting': { const a = (t - s.phaseAt) * .03; return [V(Math.sin(a) * 22.5, 3.2, Math.cos(a) * 22.5), V(0, 10.2, 0), 4.2] }
    default: return [V(0, 3.4, 46), V(0, 6.2, 0), 1.5]
  }
}
// interpolate around the tree's axis so moves arc round it instead of cutting through it
function cylLerp(out, a, b, e) {
  const ra = Math.hypot(a.x, a.z), rb = Math.hypot(b.x, b.z), aa = Math.atan2(a.z, a.x), ab = Math.atan2(b.z, b.x)
  let d = ab - aa; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
  const r = ra + (rb - ra) * e, an = aa + d * e; return out.set(Math.cos(an) * r, a.y + (b.y - a.y) * e, Math.sin(an) * r)
}

export default function CameraRig() {
  const { camera } = useThree()
  const phase = useStore(s => s.phase), view = useStore(s => s.view), focus = useStore(s => s.focus), run = useStore(s => s.run), mode = useStore(s => s.exploreMode)
  const rig = useRef({ pos: V(6, 30, 118), look: V(0, 10, 70), from: null, fromLook: null, t0: 0, key: '' }).current
  const controls = useRef()
  useEffect(() => { shared.camera = camera }, [camera])

  // phase change → start a move from wherever the camera is now
  useEffect(() => { rig.from = rig.pos.clone(); rig.fromLook = rig.look.clone(); rig.t0 = now(); }, [phase, view, run])

  useFrame((_, dt) => {
    const s = useStore.getState(), t = now()
    { const h = shared.hangS, k = Math.min(1, dt * 7); h.az += (shared.hangAz - h.az) * k; h.y += (shared.hangY - h.y) * k; h.r += (shared.hangR - h.r) * k }
    if (s.phase === 'explore') { rig.pos.copy(camera.position); if (controls.current) controls.current.getTarget(rig.look); else { const d = V(0, 0, 0); camera.getWorldDirection(d); rig.look.copy(camera.position).addScaledVector(d, 10) } return }
    if (s.phase === 'arrival') {
      const e = reduceMotion ? 1 : ease((t - s.phaseAt) / FLY_DUR); FLY.getPoint(e, rig.pos); FLY_LOOK.getPoint(e, rig.look)
    } else {
      const [p, l, dur] = shotFor(s.phase, s, t)
      // crowning has two legs: restart the move at the pull-back
      if ((s.phase === 'crowning' || s.phase === 'lighting') && t - s.phaseAt >= 2.4 && !rig.leg2) { rig.leg2 = true; rig.from = rig.pos.clone(); rig.fromLook = rig.look.clone(); rig.t0 = t }
      if (s.phase !== 'crowning' && s.phase !== 'lighting') rig.leg2 = false
      const e = reduceMotion ? 1 : ease((t - rig.t0) / dur)
      cylLerp(rig.pos, rig.from || p, p, e); rig.look.lerpVectors(rig.fromLook || l, l, e)
    }
    camera.position.copy(rig.pos)
    if (!reduceMotion) { camera.position.x += Math.sin(t * .31) * .03; camera.position.y += Math.sin(t * .43) * .025 } // hand-held drift
    camera.lookAt(rig.look)
    const wide = s.phase === 'greeting' || (s.phase === 'crowning' && t - s.phaseAt >= 2.4), lane = s.phase === 'arrival' || s.phase === 'dark' || (s.phase === 'lighting' && t - s.phaseAt < 2.4), fov = wide ? 56 : lane ? 50 : 40
    if (Math.abs(camera.fov - fov) > .02) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 1.6); camera.updateProjectionMatrix() }
  })

  // explore: orbit controls take over the camera
  useEffect(() => {
    if (phase !== 'explore' || mode !== 'orbit' || !controls.current) return
    const c = controls.current, tree = view === 'tree' || view === 'keepsake'
    c.setLookAt(camera.position.x, camera.position.y, camera.position.z, rig.look.x, rig.look.y, rig.look.z, false)
    c.setLookAt(13, tree ? 6.5 : 5.5, 17.5, 0, tree ? 8.6 : 7.4, 0, true)
  }, [phase, view, mode])
  useEffect(() => {
    const c = controls.current; if (phase !== 'explore' || mode !== 'orbit' || !c) return
    if (focus == null) { c.minDistance = 4; const wide = view === 'tree' || view === 'keepsake'; c.setLookAt(13, wide ? 6.5 : 5.5, 17.5, 0, wide ? 8.6 : 7.4, 0, true); return }
    let wp, hook
    if (focus === 'hero') { wp = shared.heroBody.clone(); hook = shared.hooks[useStore.getState().heroHook] }
    else { const o = crowd.list.find(x => x.id === focus); if (!o) return; wp = o.wp.clone(); hook = shared.hooks[o.hook] }
    c.minDistance = .4; const p = wp.clone().addScaledVector(hook.n, 1.9).add(V(0, .18, 0))
    c.setLookAt(p.x, p.y, p.z, wp.x, wp.y - .05, wp.z, true)
  }, [focus, phase, mode])
  return phase === 'explore' && mode === 'orbit' ? <CameraControls ref={controls} makeDefault minDistance={4} maxDistance={23} minPolarAngle={.55} maxPolarAngle={1.62} smoothTime={.45} draggingSmoothTime={.12} dollySpeed={.6} /> : null
}
