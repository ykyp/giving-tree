import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '../store'
import { now, clamp, ease } from '../lib/util'
import { crunch } from '../lib/audio'
import { shared, glow } from './shared'
import { crowd } from './Crowd'
import { POIS, walkable, collide, clampTarget } from './village'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const EYE = 1.62
/** Walking state, shared with the minimap and labels. Forward = (−sin yaw, 0, −cos yaw). */
export const walk = shared.walk = { pos: V(0, 0, 9), yaw: 0, pitch: -.06, target: null, poi: null, look: null, speed: 0, lastDrag: -9, phase: 0, enter: 0, from: null, stuck: 0, marker: V(), markerT: -9 }
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a))

export function walkTo(x, z, poiId = null) {
  const t = clampTarget(walk.pos, { x, z }); walk.target = V(t.x, 0, t.z); walk.poi = poiId; walk.look = null; walk.stuck = 0
  walk.marker.set(t.x, .04, t.z); walk.markerT = now(); useStore.setState({ poi: null })
}
export function walkToPoi(id) {
  const p = POIS.find(q => q.id === id); if (!p) return
  if (Math.hypot(walk.pos.x - p.stand[0], walk.pos.z - p.stand[1]) < .6) { walk.look = V(...p.look); useStore.setState({ poi: id }); return }
  walkTo(p.stand[0], p.stand[1], id)
}
/** Walk to a spot in front of an ornament and look at it. */
export function walkToOrnament(wp, hook) {
  const h = shared.hooks[hook]; const s = { x: h.p.x + h.n.x * 2.6, z: h.p.z + h.n.z * 2.6 }
  walkTo(s.x, s.z); walk.lookAfter = wp.clone()
}

export default function Walk() {
  const { camera, gl, scene } = useThree()
  const view = useStore(s => s.view)
  const ring = useRef()

  // start: take over from wherever the camera is, then settle at eye height
  useEffect(() => {
    const c = camera.position, inside = walkable(c.x, c.z) && c.y < 6
    walk.pos.set(inside ? c.x : 0, 0, inside ? c.z : (view === 'tree' ? 20 : 19)); collide(walk.pos)
    const d = V(); camera.getWorldDirection(d); walk.yaw = inside ? Math.atan2(-d.x, -d.z) : 0; walk.pitch = inside ? clamp(Math.asin(d.y), -.5, .5) : -.04
    walk.target = null; walk.look = inside ? null : V(0, 6.8, 0); walk.from = { p: c.clone(), q: camera.quaternion.clone(), fov: camera.fov }; walk.enter = now(); shared.scene = scene
    return () => { walk.target = null; camera.fov = 40; camera.updateProjectionMatrix() }
  }, [])

  // drag to look around
  useEffect(() => {
    const el = gl.domElement; let down = null, moved = 0
    const pd = e => { down = { x: e.clientX, y: e.clientY }; moved = 0 }
    const pm = e => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; down = { x: e.clientX, y: e.clientY }; moved += Math.abs(dx) + Math.abs(dy)
      if (moved > 6) { walk.yaw += dx * .0055; walk.pitch = clamp(walk.pitch + dy * .0045, -.6, .55); walk.lastDrag = now(); walk.look = null } }
    const pu = () => { down = null }
    el.addEventListener('pointerdown', pd); window.addEventListener('pointermove', pm); window.addEventListener('pointerup', pu)
    return () => { el.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu) }
  }, [gl])

  // focusing an ornament while walking: walk up to it
  useEffect(() => useStore.subscribe((s, p) => {
    if (s.focus === p.focus || s.focus == null) return
    if (s.focus === 'hero') { if (s.heroHook >= 0) walkToOrnament(shared.heroBody, s.heroHook) }
    else { const o = crowd.list.find(x => x.id === s.focus); if (o?.wp) walkToOrnament(o.wp, o.hook) }
  }), [])

  useFrame((_, dtRaw) => {
    const t = now(), dt = Math.min(dtRaw, 1 / 20)
    if (walk.target) {
      const dx = walk.target.x - walk.pos.x, dz = walk.target.z - walk.pos.z, dist = Math.hypot(dx, dz)
      if (dist < .12) { walk.target = null; walk.speed = 0
        if (walk.poi) { const p = POIS.find(q => q.id === walk.poi); walk.look = V(...p.look); useStore.setState({ poi: walk.poi }); walk.poi = null }
        if (walk.lookAfter) { walk.look = walk.lookAfter; walk.lookAfter = null } }
      else {
        walk.speed = Math.min(2.8, walk.speed + 5 * dt, dist * 2.4 + .25)
        const step = walk.speed * dt, ox = walk.pos.x, oz = walk.pos.z
        walk.pos.x += dx / dist * step; walk.pos.z += dz / dist * step; collide(walk.pos)
        if (!walkable(walk.pos.x, walk.pos.z)) { walk.pos.x = ox; walk.pos.z = oz }
        const moved = Math.hypot(walk.pos.x - ox, walk.pos.z - oz)
        walk.stuck = moved < step * .3 ? walk.stuck + dt : 0; if (walk.stuck > .5) { walk.target = null; walk.speed = 0 }
        const before = Math.sin(walk.phase); walk.phase += moved * 4.6; if (before > 0 && Math.sin(walk.phase) <= 0 || before < 0 && Math.sin(walk.phase) >= 0) crunch()
        if (t - walk.lastDrag > 1.2) { walk.yaw += angDiff(walk.yaw, Math.atan2(-dx, -dz)) * Math.min(1, dt * 3.2); walk.pitch += (-.05 - walk.pitch) * Math.min(1, dt * 2) }
      }
    }
    if (walk.look && !walk.target) { const e = V(walk.pos.x, EYE, walk.pos.z), d = walk.look.clone().sub(e), h = Math.hypot(d.x, d.z)
      walk.yaw += angDiff(walk.yaw, Math.atan2(-d.x, -d.z)) * Math.min(1, dt * 3); walk.pitch += (clamp(Math.atan2(d.y, h), -.6, .55) - walk.pitch) * Math.min(1, dt * 3) }

    const bob = walk.target ? Math.sin(walk.phase) * .03 : 0
    const p = V(walk.pos.x, EYE + Math.abs(bob), walk.pos.z), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(walk.pitch, walk.yaw, bob * .15, 'YXZ'))
    const k = ease((t - walk.enter) / 1.6)
    if (k < 1 && walk.from) { camera.position.lerpVectors(walk.from.p, p, k); camera.quaternion.slerpQuaternions(walk.from.q, q, k) }
    else { camera.position.copy(p); camera.quaternion.copy(q) }
    // a walking eye needs a wider lens than the cinematic shots, especially on a tall phone screen
    const fov = 40 + 22 * k; if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix() }
    if (ring.current) { const a = t - walk.markerT; ring.current.visible = a < 1.4; ring.current.position.copy(walk.marker); ring.current.scale.setScalar(.6 + a * .6); ring.current.material.opacity = Math.max(0, .9 - a * .65) }
  })

  const onGround = e => { if (e.delta > 8) return; e.stopPropagation(); walkTo(e.point.x, e.point.z) }
  return (<group>
    <mesh rotation-x={-Math.PI / 2} position={[0, .03, 20]} onClick={onGround}><planeGeometry args={[120, 220]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
    {POIS.filter(p => p.id !== 'arch').map(p => <mesh key={p.id} position={[p.look[0], 1.5, p.look[2]]} onClick={e => { if (e.delta > 8) return; e.stopPropagation(); walkToPoi(p.id) }}>
      <cylinderGeometry args={[p.id === 'tree' ? 2.2 : p.id === 'rink' ? 4.6 : p.id === 'carousel' ? 4.2 : p.id === 'church' ? 5 : 1.6, 1, 3, 10]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>)}
    <mesh ref={ring} rotation-x={-Math.PI / 2} visible={false}><ringGeometry args={[.32, .42, 32]} /><meshBasicMaterial color={[2.2, 1.8, 1]} toneMapped={false} transparent depthWrite={false} /></mesh>
  </group>)
}
