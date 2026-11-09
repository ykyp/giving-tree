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
const FLY = new THREE.CatmullRomCurve3([V(6, 30, 118), V(2, 19, 92), V(-1, 8.5, 70), V(1, 3.6, 50), V(0, 3.0, 33), V(0, 3.4, 23.5), V(0, 4.3, 20.3)], false, 'centripetal')
const FLY_LOOK = new THREE.CatmullRomCurve3([V(0, 10, 70), V(0, 6, 52), V(0, 4.5, 30), V(0, 4.2, 12), V(0, 4.6, 0)], false, 'centripetal')
export const FLY_DUR = 10.5

function shotFor(phase, s, t) {
  const k = t - s.phaseAt
  switch (phase) {
    case 'dark': return [V(0, 4.3, 20.3), V(0, 4.7, 0), 1.5]
    case 'lighting': return [V(-14, 2.6, 16), V(0, 5.4, 0), 4.6]
    case 'choose': return [V(0, 3.5, 11.8), V(0, .75, CRATE[2]), 2.6]
    case 'engrave': return [V(0, 1.95, 8.9), V(0, 1.28, HELD[2]), 1.8]
    case 'gift': return [V(-1.2, 2.5, 9.6), V(0, .6, CRATE[2]), 2.6]
    case 'unwrap': return [V(.5, 2.2, 8.9), V(0, 1.5, 5.3), 2]
    case 'hang': { const az = shared.hangAz; return [V(Math.sin(az) * 15.5, 4.7, Math.cos(az) * 15.5), V(0, 3.9, 0), 2] }
    case 'settling': { const h = shared.hooks[s.heroHook] || shared.hooks[0]; return [h.p.clone().addScaledVector(h.n, 3.1).add(V(0, .55, 0)), h.p.clone().add(V(0, -.35, 0)), 1.6] }
    case 'crown': return [V(0, 9.0, 15), V(0, 9.7, 0), 2.2]
    case 'crowning': return k < 2.4 ? [V(0, 9.0, 15), V(0, 9.7, 0), 2.2] : [V(0, 7.2, 31), V(0, 5.9, 0), 4.2]
    case 'greeting': { const a = (t - s.phaseAt) * .03; return [V(Math.sin(a) * 31, 7.2, Math.cos(a) * 31), V(0, 5.9, 0), 4.2] }
    default: return [V(0, 4.3, 20.3), V(0, 4.7, 0), 1.5]
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
  const phase = useStore(s => s.phase), view = useStore(s => s.view), focus = useStore(s => s.focus), run = useStore(s => s.run)
  const rig = useRef({ pos: V(6, 30, 118), look: V(0, 10, 70), from: null, fromLook: null, t0: 0, key: '' }).current
  const controls = useRef()
  useEffect(() => { shared.camera = camera }, [camera])

  // phase change → start a move from wherever the camera is now
  useEffect(() => { rig.from = rig.pos.clone(); rig.fromLook = rig.look.clone(); rig.t0 = now(); }, [phase, view, run])

  useFrame((_, dt) => {
    const s = useStore.getState(), t = now()
    if (s.phase === 'explore') { rig.pos.copy(camera.position); controls.current?.getTarget(rig.look); return }
    if (s.phase === 'arrival') {
      const e = reduceMotion ? 1 : ease((t - s.phaseAt) / FLY_DUR); FLY.getPoint(e, rig.pos); FLY_LOOK.getPoint(e, rig.look)
    } else {
      const [p, l, dur] = shotFor(s.phase, s, t)
      // crowning has two legs: restart the move at the pull-back
      if (s.phase === 'crowning' && t - s.phaseAt >= 2.4 && !rig.leg2) { rig.leg2 = true; rig.from = rig.pos.clone(); rig.fromLook = rig.look.clone(); rig.t0 = t }
      if (s.phase !== 'crowning') rig.leg2 = false
      const e = reduceMotion ? 1 : ease((t - rig.t0) / dur)
      cylLerp(rig.pos, rig.from || p, p, e); rig.look.lerpVectors(rig.fromLook || l, l, e)
    }
    camera.position.copy(rig.pos)
    if (!reduceMotion) { camera.position.x += Math.sin(t * .31) * .03; camera.position.y += Math.sin(t * .43) * .025 } // hand-held drift
    camera.lookAt(rig.look)
  })

  // explore: orbit controls take over the camera
  useEffect(() => {
    if (phase !== 'explore' || !controls.current) return
    const c = controls.current, tree = view === 'tree'
    c.setLookAt(camera.position.x, camera.position.y, camera.position.z, rig.look.x, rig.look.y, rig.look.z, false)
    c.setLookAt(4, tree ? 6.8 : 5.6, tree ? 20 : 19.5, 0, tree ? 6.4 : 4.6, 0, true)
  }, [phase, view])
  useEffect(() => {
    const c = controls.current; if (phase !== 'explore' || !c) return
    if (focus == null) { c.minDistance = 4; c.setLookAt(4, view === 'tree' ? 6.8 : 5.6, view === 'tree' ? 20 : 19.5, 0, view === 'tree' ? 6.4 : 4.6, 0, true); return }
    let wp, hook
    if (focus === 'hero') { wp = shared.heroBody.clone(); hook = shared.hooks[useStore.getState().heroHook] }
    else { const o = crowd.list.find(x => x.id === focus); if (!o) return; wp = o.wp.clone(); hook = shared.hooks[o.hook] }
    c.minDistance = .4; const p = wp.clone().addScaledVector(hook.n, 1.9).add(V(0, .18, 0))
    c.setLookAt(p.x, p.y, p.z, wp.x, wp.y - .05, wp.z, true)
  }, [focus, phase])
  return phase === 'explore' ? <CameraControls ref={controls} makeDefault minDistance={4} maxDistance={40} minPolarAngle={.55} maxPolarAngle={1.62} smoothTime={.45} draggingSmoothTime={.12} dollySpeed={.6} /> : null
}
