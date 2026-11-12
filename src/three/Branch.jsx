import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../store'
import { now, easeOut, hashStr, reduceMotion } from '../lib/util'
import { shared, glow } from './shared'
import { usedHooks } from './Crowd'

// Slots in the pile under an ornament: three on the bough, two on those, one on top, then a second layer behind.
const SLOTS = [[-.2, 0, .1], [0, 0, .14], [.2, 0, .1], [-.1, .19, .1], [.1, .19, .12], [0, .38, .11], [-.3, 0, -.12], [-.1, 0, -.1], [.1, 0, -.1], [.3, 0, -.12], [-.2, .19, -.1], [0, .19, -.1], [.2, .19, -.1]]
const boxG = new THREE.BoxGeometry(.18, .18, .18), lidG = new THREE.BoxGeometry(.2, .05, .2), ribbonA = new THREE.BoxGeometry(.19, .185, .035), ribbonB = new THREE.BoxGeometry(.035, .185, .19), ribbonLidA = new THREE.BoxGeometry(.205, .055, .035), ribbonLidB = new THREE.BoxGeometry(.035, .055, .205)
const gold = new THREE.MeshStandardMaterial({ color: 0xe8c46a, metalness: .7, roughness: .25 })

function Parcel({ p, slot, brand }) {
  const g = useRef(), lid = useRef(), ribbons = useRef(), openedAt = useRef(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: brand.palette[hashStr(p.id) % brand.palette.length], roughness: .45, envMapIntensity: .8 }), [p.id, brand])
  const ph = useMemo(() => hashStr(p.id) % 100 / 16, [p.id])
  useFrame(() => {
    if (!g.current) return
    const s = useStore.getState(), t = now()
    if (p.opened && openedAt.current === null) openedAt.current = s.wishOpen === p.id ? t : t - 9
    if (!p.opened) openedAt.current = null
    const k = openedAt.current === null ? -1 : t - openedAt.current
    ribbons.current.visible = k < .35
    if (k >= 0) { const e = easeOut((k - .3) / .7); lid.current.position.y = .115 + e * .3; lid.current.rotation.z = -e * .9; lid.current.position.x = e * .12; g.current.scale.setScalar(Math.max(.001, 1 - easeOut((k - 1.2) / .6))) }
    else { lid.current.position.set(0, .115, 0); lid.current.rotation.z = 0; g.current.scale.setScalar(1) }
    const shake = !reduceMotion && k < 0 && s.phase === 'parcels' ? Math.sin(t * 15 + ph) * Math.max(0, Math.sin(t * 1.3 + ph)) * .09 : 0
    g.current.rotation.z = shake; g.current.rotation.y = ph
  })
  const onClick = e => { e.stopPropagation(); const s = useStore.getState(); if (s.phase === 'parcels' && p.kind === 'friend') s.openParcel(p.id); if (s.phase === 'selfwish' && p.kind === 'self') s.openParcel(p.id) }
  return (
    <group ref={g} position={slot} onClick={onClick}>
      <mesh geometry={boxG} material={mat} />
      <group ref={ribbons}><mesh geometry={ribbonA} material={gold} /><mesh geometry={ribbonB} material={gold} /></group>
      <group ref={lid} position={[0, .115, 0]}><mesh geometry={lidG} material={mat} /><mesh geometry={ribbonLidA} material={gold} /><mesh geometry={ribbonLidB} material={gold} />
        {[-1, 1].map(i => <mesh key={i} position={[i * .035, .05, 0]} rotation={[0, 0, i * .7]} material={gold}><torusGeometry args={[.035, .01, 6, 14]} /></mesh>)}</group>
    </group>
  )
}

const HOME = new Set(['seal', 'crown', 'crowning', 'greeting', 'explore', 'mearrive', 'branch', 'parcels', 'gave', 'thanks', 'selfwish', 'settling', 'wishfor'])
/** The parcels at the foot of your ornament, on a little snowy bough. */
function Pile({ brand }) {
  const parcels = useStore(s => s.parcels), hook = useStore(s => s.heroHook), view = useStore(s => s.view), phase = useStore(s => s.phase)
  const h = shared.hooks[hook]
  if (!h || !parcels.length || view === 'open' || !HOME.has(phase)) return null
  const yaw = Math.atan2(h.n.x, h.n.z), shown = parcels.slice(0, SLOTS.length)
  return (
    <group position={[h.p.x + h.n.x * .22, h.p.y - (shown.length > 3 ? 1.38 : 1.2), h.p.z + h.n.z * .22]} rotation={[0, yaw, 0]}>
      <mesh position={[0, -.13, 0]} scale={[1, .16, .62]}><sphereGeometry args={[.52, 18, 12]} /><meshStandardMaterial color={0x1d4a2e} roughness={1} /></mesh>
      <mesh position={[0, -.1, 0]} scale={[.92, .1, .55]}><sphereGeometry args={[.52, 18, 12]} /><meshStandardMaterial color={0xe6edf8} roughness={.9} /></mesh>
      {shown.map((p, i) => <Parcel key={p.id} p={p} slot={SLOTS[i]} brand={brand} />)}
    </group>
  )
}

/** The hooks kept free around your ornament glow, as an invitation. */
function EmptyHooks() {
  const ref = useRef()
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3)); return g }, [])
  useFrame(() => {
    const s = useStore.getState(), pts = ref.current; if (!pts) return
    const on = s.view !== 'open' && s.branchView && ['greeting', 'branch', 'explore', 'seal', 'parcels', 'mearrive'].includes(s.phase)
    pts.visible = !!on; if (!on) return
    const used = usedHooks(), a = geo.attributes.position; let n = 0
    for (const i of shared.reserved) { if (used.has(i) || n >= 64) continue; const p = shared.hooks[i].p; a.setXYZ(n++, p.x, p.y, p.z) }
    a.needsUpdate = true; geo.setDrawRange(0, n); pts.material.opacity = .5 + Math.sin(now() * 2.4) * .25
  })
  return <points ref={ref} geometry={geo} frustumCulled={false}><pointsMaterial map={glow} color={0xffd27a} size={.4} transparent opacity={.6} depthWrite={false} blending={THREE.AdditiveBlending} /></points>
}

export default function Branch({ brand }) { return <><Pile brand={brand} /><EmptyHooks /></> }
