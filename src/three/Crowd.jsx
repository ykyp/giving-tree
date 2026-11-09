import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../store'
import { NAMES } from '../config'
import { seeded, hashStr, now, easeOut } from '../lib/util'
import { shared } from './shared'
import { DESIGNS, crowdMats, tagMatAtlas, tagGeo, capGeo, capMat, cellUV, drawCell, TAG_DESIGNS, mosaicColors, mosaicGeo } from './ornamentKit'

/* ---------- rope physics (verlet): a rope only pulls when it is taut ---------- */
const G = new THREE.Vector3(0, -9.8, 0), tmpV = new THREE.Vector3()
export function ropeStep(o, A, dt) {
  const steps = 3, h = dt / steps
  for (let i = 0; i < steps; i++) {
    tmpV.copy(o.bob).sub(o.prev).multiplyScalar(0.986)
    o.prev.copy(o.bob); o.bob.add(tmpV).addScaledVector(G, h * h)
    tmpV.copy(o.bob).sub(A); const d = tmpV.length(); if (d > o.L) o.bob.copy(A).addScaledVector(tmpV, o.L / d)
  }
}

export const MAXO = 120
export const crowd = { list: [], nextId: 1 }
const usedCells = () => new Set(crowd.list.map(o => o.cell))
export const usedHooks = () => { const s = new Set(crowd.list.map(o => o.hook)); const h = useStore.getState().heroHook; if (h >= 0) s.add(h); return s }
export function freeHooks() { const u = usedHooks(); return shared.hooks.map((_, i) => i).filter(i => !u.has(i)) }

function makeOrn(name, design, color, cell, hook, r, mins) {
  return { id: crowd.nextId++, name, design, color, cell, hook, mins, ph: r() * 6.28, dir: r() < .5 ? -1 : 1, L: 0.16 + r() * 0.08, bob: null, prev: null, dropAt: 0, fs: undefined }
}
export function populate(brand) {
  crowd.list = []; const r = seeded(hashStr(brand.slug) % 100000 + 3), hooks = shared.hooks.map((_, i) => i).sort(() => r() - .5)
  const n = Math.min(MAXO - 6, Math.floor(shared.hooks.length * 0.66))
  for (let k = 0; k < n; k++) {
    const o = makeOrn(NAMES[k < 5 ? k : Math.floor(r() * NAMES.length)], Math.floor(r() * 8), brand.palette[Math.floor(r() * brand.palette.length)], 8 + k, hooks[k], r, k < 5 ? [2, 5, 9, 14, 21][k] : Math.floor(30 + r() * 4000))
    crowd.list.push(o); drawCell(o.cell, o.design, o.color, o.name, { per: brand.per, brandAccent: brand.accent, brandMono: brand.mono })
  }
  crowd.dirty = true
}
/** A gift arriving live: the ornament drops from above onto a free hook and swings. */
export function addLive(brand) {
  let free = freeHooks(), hook, cell
  const cells = usedCells(); for (let c = 8; c < 128; c++) if (!cells.has(c)) { cell = c; break }
  if (!free.length || cell === undefined || crowd.list.length >= MAXO) { const old = crowd.list.reduce((a, o) => o.mins > a.mins ? o : a, crowd.list[0]); crowd.list = crowd.list.filter(o => o !== old); hook = old.hook; cell = old.cell }
  else hook = free[Math.floor(Math.random() * free.length)]
  crowd.list.forEach(o => o.mins += 1)
  const name = NAMES[Math.floor(Math.random() * NAMES.length)], r = Math.random
  const o = makeOrn(name, Math.floor(r() * 8), brand.palette[Math.floor(r() * brand.palette.length)], cell, hook, r, 0)
  const A = shared.hooks[hook].p; o.bob = A.clone().add(new THREE.Vector3((r() - .5) * .8, 3.5, (r() - .5) * .8)); o.prev = o.bob.clone(); o.dropAt = now()
  drawCell(cell, o.design, o.color, name, { per: brand.per, brandAccent: brand.accent, brandMono: brand.mono })
  crowd.list.push(o); crowd.dirty = true; return o
}

const M = { cap: new THREE.Matrix4(), body: new THREE.Matrix4(), tag: new THREE.Matrix4(), t: new THREE.Matrix4(), r: new THREE.Matrix4(), s: new THREE.Matrix4() }
const Q = new THREE.Quaternion(), DOWN = new THREE.Vector3(0, -1, 0), C = new THREE.Vector3(), D = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1)
/** Shared by crowd and hero: compute cap/body/tag matrices for an ornament hanging from A. */
export const ORN_SCALE = 1.3
export function hangMatrices(o, A, t, design, scale = 1, out = M) {
  scale *= ORN_SCALE
  if (o.bob) C.copy(o.bob)
  else { const sw = 0.07 * Math.sin(t * 1.15 + o.ph), L = o.L * ORN_SCALE; C.set(A.x + Math.sin(sw) * L, A.y - Math.cos(sw) * L, A.z) }
  D.copy(C).sub(A).normalize(); Q.setFromUnitVectors(DOWN, D)
  out.cap.compose(C, Q, ONE.set(scale, scale, scale))
  let spin = o.ph + t * 0.5 * o.dir
  if (o.faceCam && shared.camera) { const fa = Math.atan2(shared.camera.position.x - C.x, shared.camera.position.z - C.z) + DESIGNS[design].front
    o.fs = o.fs === undefined ? spin : o.fs + Math.atan2(Math.sin(fa - o.fs), Math.cos(fa - o.fs)) * 0.08; spin = o.fs }
  else if (o.fs !== undefined) { o.ph = o.fs - t * 0.5 * o.dir; o.fs = undefined }
  M.r.makeRotationY(spin)
  out.body.copy(out.cap).multiply(M.t.makeTranslation(0, -DESIGNS[design].top, 0)).multiply(M.r)
  out.tag.copy(out.cap).multiply(M.r).multiply(M.t.makeTranslation(DESIGNS[design].tagX || .25, -0.05, 0)).multiply(M.s.makeRotationZ(0.08))
  return C
}

export default function Crowd({ brand }) {
  const meshes = useMemo(() => DESIGNS.map((d, i) => {
    const geo = d.geo.clone(); if (d.atlas) geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array(MAXO * 4), 4))
    if (i === 3) geo.setAttribute('color', mosaicGeo.attributes.color)
    const m = new THREE.InstancedMesh(geo, crowdMats[i], MAXO); m.count = 0; m.frustumCulled = false; m.userData.list = []; return m }), [])
  const tags = useMemo(() => { const g = tagGeo.clone(); g.setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array(MAXO * 4), 4)); const m = new THREE.InstancedMesh(g, tagMatAtlas, MAXO); m.count = 0; m.frustumCulled = false; return m }, [])
  const caps = useMemo(() => { const m = new THREE.InstancedMesh(capGeo, capMat, MAXO); m.count = 0; m.frustumCulled = false; return m }, [])
  const threads = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXO * 6), 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcaa65a, transparent: true, opacity: .8 })); l.frustumCulled = false; return l }, [])

  useEffect(() => { mosaicColors(brand.accent); meshes[3].geometry.setAttribute('color', mosaicGeo.attributes.color); populate(brand) }, [brand, meshes])

  function rebuild() {
    meshes.forEach(m => m.userData.list = [])
    const tl = []
    crowd.list.forEach(o => { const m = meshes[o.design]; o.k = m.userData.list.length; m.userData.list.push(o); if (TAG_DESIGNS.has(o.design)) { o.tk = tl.length; tl.push(o) } })
    meshes.forEach((m, i) => { if (DESIGNS[i].atlas) { const a = m.geometry.attributes.aCell; m.userData.list.forEach((o, k) => a.array.set(cellUV(o.cell), k * 4)); a.needsUpdate = true } m.count = m.userData.list.length })
    const ta = tags.geometry.attributes.aCell; tl.forEach((o, k) => ta.array.set(cellUV(o.cell), k * 4)); ta.needsUpdate = true; tags.count = tl.length
    caps.count = crowd.list.length; threads.geometry.setDrawRange(0, crowd.list.length * 2); crowd.dirty = false
  }

  useFrame((_, dtRaw) => {
    if (crowd.dirty) rebuild()
    const t = now(), dt = Math.min(dtRaw, 1 / 30), tp = threads.geometry.attributes.position.array, focus = useStore.getState().focus
    const world = []
    crowd.list.forEach((o, i) => {
      const A = shared.hooks[o.hook].p
      if (o.bob) { ropeStep(o, A, dt); if (t - o.dropAt > 3.2) { o.bob = null } }
      o.faceCam = focus === o.id
      const scale = o.dropAt ? Math.min(1, (t - o.dropAt) / 0.25 + 0.2) : 1
      const c = hangMatrices(o, A, t, o.design, scale)
      meshes[o.design].setMatrixAt(o.k, M.body); caps.setMatrixAt(i, M.cap); if (TAG_DESIGNS.has(o.design)) tags.setMatrixAt(o.tk, M.tag)
      tp[i * 6] = A.x; tp[i * 6 + 1] = A.y; tp[i * 6 + 2] = A.z; tp[i * 6 + 3] = c.x; tp[i * 6 + 4] = c.y; tp[i * 6 + 5] = c.z
      if (!o.wp) o.wp = new THREE.Vector3(); o.wp.setFromMatrixPosition(M.body)
      world.push(o)
    })
    shared.crowdWorld = world
    meshes.forEach(m => m.instanceMatrix.needsUpdate = true); tags.instanceMatrix.needsUpdate = true; caps.instanceMatrix.needsUpdate = true; threads.geometry.attributes.position.needsUpdate = true
  })

  const onClick = (e, mesh) => {
    const st = useStore.getState(); if (st.phase !== 'explore' || e.delta > 8) return
    e.stopPropagation(); const o = mesh.userData.list[e.instanceId]; if (o) useStore.setState({ focus: o.id })
  }
  return (
    <group>
      {meshes.map((m, i) => <primitive key={i} object={m} onClick={e => onClick(e, m)} />)}
      <primitive object={tags} /><primitive object={caps} /><primitive object={threads} />
    </group>
  )
}
