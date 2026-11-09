import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '../store'
import { CRATE, HELD, TREE } from '../config'
import { now, clamp, ease, easeOut, easeBack, seeded } from '../lib/util'
import { shared, glow } from './shared'
import { DESIGNS, paintSurface, TAG_DESIGNS, tagGeo, capGeo, loopGeo, capMat, drawCell, cellUV, crowdMats, tagMatAtlas, designColor, mosaicGeo } from './ornamentKit'
import { ropeStep, hangMatrices, freeHooks } from './Crowd'
import { Rsil } from './Tree'
import { chime } from '../lib/audio'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const withCell = (geo, cell) => { const g = geo.clone(), n = g.attributes.position.count, a = new Float32Array(n * 4), uv = cellUV(cell); for (let i = 0; i < n; i++) a.set(uv, i * 4); g.setAttribute('aCell', new THREE.BufferAttribute(a, 4)); return g }

/* ---------- the crate the sender picks from ---------- */
function Crate({ brand, visible }) {
  const sel = useStore(s => s.sel)
  const items = useRef([])
  const parts = useMemo(() => {
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: .85 }), dark = new THREE.MeshStandardMaterial({ color: 0x5e3b20, roughness: .9 })
    const straw = new THREE.InstancedMesh(new THREE.CylinderGeometry(.006, .006, .28, 4), new THREE.MeshStandardMaterial({ color: 0xd9b866, roughness: 1 }), 420)
    const r = seeded(4), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
    for (let i = 0; i < 420; i++) { e.set(Math.PI / 2 + (r() - .5) * .6, r() * 6.28, (r() - .5) * .6); q.setFromEuler(e); m.compose(V((r() - .5) * 1.9, .33 + r() * .08, (r() - .5) * .8), q, V(1, 1, 1)); straw.setMatrixAt(i, m) }
    return { wood, dark, straw }
  }, [])
  const disp = useMemo(() => DESIGNS.map((d, i) => {
    const body = new THREE.Mesh(d.atlas ? withCell(d.geo, i) : (i === 3 ? (() => { const g = d.geo.clone(); g.setAttribute('color', mosaicGeo.attributes.color); return g })() : d.geo), crowdMats[i])
    const tag = TAG_DESIGNS.has(i) ? new THREE.Mesh(withCell(tagGeo, i), tagMatAtlas) : null
    return { body, tag }
  }), [])
  useEffect(() => { DESIGNS.forEach((_, i) => drawCell(i, i, designColor(i, brand.palette, brand.accent), 'Your name', { per: brand.per, brandAccent: brand.accent, brandMono: brand.mono, ghost: false })) }, [brand])
  useFrame(() => {
    const t = now()
    items.current.forEach((g, i) => { if (!g) return
      const s = i === useStore.getState().sel, row = i >> 2, col = i % 4
      const target = V(-0.75 + col * 0.5, s ? 1.05 : 0.62 + Math.sin(t * 2 + i) * .02, row ? 0.2 : -0.2)
      g.position.lerp(target, 0.12); const sc = s ? 1.25 : 0.82; g.scale.setScalar(g.scale.x + (sc - g.scale.x) * .12)
      g.children[0].rotation.y = s ? t * 1.2 + DESIGNS[i].front : t * .4 + i })
  })
  const pick = (e, i) => { e.stopPropagation(); const st = useStore.getState(); if (st.phase !== 'choose') return
    if (st.sel === i) { useStore.setState({ design: i }); st.setPhase('engrave') } else { useStore.setState({ sel: i }); chime([1046.5 + i * 60], 0, .05) } }
  return (
    <group position={CRATE} visible={visible}>
      <mesh position={[0, .03, 0]} material={parts.dark}><boxGeometry args={[2.1, .06, .95]} /></mesh>
      {[[0, .2, .45, 2.1, .32, .05], [0, .2, -.45, 2.1, .32, .05], [1.03, .2, 0, .05, .32, .95], [-1.03, .2, 0, .05, .32, .95]].map(([x, y, z, w, h, d], i) =>
        <mesh key={i} position={[x, y, z]} material={parts.wood}><boxGeometry args={[w, h, d]} /></mesh>)}
      {[-.9, -.3, .3, .9].map(x => <mesh key={x} position={[x, .2, .48]} material={parts.dark}><boxGeometry args={[.08, .34, .02]} /></mesh>)}
      <primitive object={parts.straw} />
      {disp.map((d, i) => (
        <group key={i} ref={el => items.current[i] = el} position={[-0.75 + (i % 4) * 0.5, .62, (i >> 2) ? .2 : -.2]} onClick={e => pick(e, i)}>
          <group position={[0, -DESIGNS[i].top + .25, 0]}>
            <primitive object={d.body} />
            {d.tag && <primitive object={d.tag} position={[DESIGNS[i].tagX, DESIGNS[i].top - .05, 0]} rotation={[0, 0, .08]} />}
          </group>
          <mesh position={[0, .25, 0]} geometry={capGeo} material={capMat} />
          <mesh><sphereGeometry args={[.3, 8, 6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
        </group>))}
      <sprite position={[0, .9, 0]} scale={[3, 1.6, 1]}><spriteMaterial map={glow} color={0xffc070} transparent opacity={.15} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
    </group>
  )
}

/* ---------- the wrapped gift (recipient) ---------- */
function GiftBox({ brand, from, visible }) {
  const lid = useRef(), ribbons = useRef(), tagRef = useRef()
  const tagTex = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d')
    x.fillStyle = '#ead1a6'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#b8891c'; x.lineWidth = 6; x.strokeRect(10, 10, 492, 236)
    x.fillStyle = '#43280f'; x.textAlign = 'center'; x.font = '600 52px Caveat, cursive'; x.fillText('To you,', 256, 105); x.font = '600 70px Caveat, cursive'; x.fillText(`from ${from}`, 256, 185)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }, [from])
  useFrame(() => {
    const st = useStore.getState(); if (!lid.current) return
    const k = ['unwrap', 'hang'].includes(st.phase) ? now() - st.phaseAt + (st.phase === 'hang' ? 9 : 0) : 0
    const rk = easeOut(k / .5); ribbons.current.scale.set(1, 1, 1 - rk * .98); ribbons.current.visible = rk < .97
    const lk = easeOut((k - .35) / .8); lid.current.position.set(lk * .8, .62 + Math.sin(clamp((k - .35) / .8, 0, 1) * Math.PI) * .6 - lk * .55, lk * .2); lid.current.rotation.z = -lk * 1.4
    tagRef.current.visible = k < .4
  })
  const box = new THREE.Color(brand.accent)
  return (
    <group position={CRATE} visible={visible}>
      <mesh position={[0, .31, 0]}><boxGeometry args={[.8, .62, .8]} /><meshStandardMaterial color={box} roughness={.42} envMapIntensity={.8} /></mesh>
      <group ref={ribbons}>
        <mesh position={[0, .31, 0]}><boxGeometry args={[.81, .63, .11]} /><meshStandardMaterial color={0xe8c46a} metalness={.7} roughness={.25} /></mesh>
        <mesh position={[0, .31, 0]}><boxGeometry args={[.11, .63, .81]} /><meshStandardMaterial color={0xe8c46a} metalness={.7} roughness={.25} /></mesh>
      </group>
      <group ref={lid} position={[0, .62, 0]}>
        <mesh position={[0, .07, 0]}><boxGeometry args={[.86, .14, .86]} /><meshStandardMaterial color={box} roughness={.42} /></mesh>
        <mesh position={[0, .07, 0]}><boxGeometry args={[.87, .15, .11]} /><meshStandardMaterial color={0xe8c46a} metalness={.7} roughness={.25} /></mesh>
        {[-1, 1].map(s => <mesh key={s} position={[s * .11, .2, 0]} rotation={[0, s * .3, s * .7]}><torusGeometry args={[.13, .035, 8, 24]} /><meshStandardMaterial color={0xe8c46a} metalness={.7} roughness={.25} /></mesh>)}
      </group>
      <mesh ref={tagRef} position={[.28, .45, .42]} rotation={[0, 0, -.12]}><planeGeometry args={[.34, .17]} /><meshStandardMaterial map={tagTex} roughness={.9} side={THREE.DoubleSide} /></mesh>
    </group>
  )
}

/* ---------- the hero ornament: engrave, drag, hang ---------- */
export default function Hero({ brand }) {
  const { gl, camera, scene, size } = useThree()
  const design = useStore(s => s.design), view = useStore(s => s.view), phase = useStore(s => s.phase), from = useStore(s => s.from), run = useStore(s => s.run)
  const canvas = useMemo(() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; window.__heroCanvas = c; return c }, [])
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }, [canvas])
  const parts = useMemo(() => {
    const D = DESIGNS[design], mat = D.mat(); if (D.atlas) mat.map = tex
    if (design === 6) { mat.transmission = 0.6; mat.thickness = .3; mat.ior = 1.45; mat.opacity = 1; mat.transparent = false }
    const body = new THREE.Mesh(design === 3 ? (() => { const g = D.geo.clone(); g.setAttribute('color', mosaicGeo.attributes.color); return g })() : D.geo, mat)
    const tag = TAG_DESIGNS.has(design) ? new THREE.Mesh(tagGeo, new THREE.MeshStandardMaterial({ map: tex, alphaTest: .5, roughness: .85, envMapIntensity: .4 })) : null
    const cap = new THREE.Mesh(capGeo, capMat), loop = new THREE.Mesh(loopGeo, capMat)
    ;[body, cap, loop, tag].forEach(m => { if (m) m.matrixAutoUpdate = false })
    const thread = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 1, 0)]), new THREE.LineBasicMaterial({ color: 0xcaa65a }))
    thread.frustumCulled = false
    return { body, tag, cap, loop, thread }
  }, [design, tex])
  const o = useRef({ ph: 0, dir: 1, L: 0.22, bob: null, prev: null, faceCam: false }).current
  const st8 = useRef({ pos: V(...HELD), scale: 1, spin: 0, drag: false, target: V(), auto: null, settleAt: 0, lastName: null, lastPaint: 0 }).current
  const ring = useRef(), hookPts = useRef()
  const shell = useMemo(() => { const m = new THREE.Mesh(new THREE.ConeGeometry(Rsil(TREE.base) + 0.25, TREE.top - TREE.base, 40, 1, true), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.position.y = TREE.base + (TREE.top - TREE.base) / 2; m.updateMatrixWorld(); return m }, [])
  const ray = useMemo(() => new THREE.Raycaster(), [])
  const plane = useMemo(() => new THREE.Plane(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])

  // reset per run
  useEffect(() => { shared.hangAz = 0; shared.hangY = 6.6; shared.hangR = 21; Object.assign(shared.hangS, { az: 0, y: 6.6, r: 21 }); o.bob = null; o.prev = null; st8.auto = null; st8.drag = false; shared.dragging = false; shared.hookHi = -1; st8.pos.set(CRATE[0], CRATE[1] + .6, CRATE[2]); st8.scale = .9 }, [run])

  // pointer handling for drag-and-drop (raycast against a shell hugging the tree)
  useEffect(() => {
    const el = gl.domElement
    const toNdc = e => { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); return r }
    // pointers: grab the ornament to hang it; drag anywhere else to circle the tree; pinch / scroll to zoom
    const ptrs = new Map(); let pinch0 = 0, r0 = 21
    const down = e => {
      if (useStore.getState().phase !== 'hang' || st8.auto) return
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = shared.hangR; shared.orbiting = null; return }
      const r = toNdc(e), p = st8.pos.clone().project(camera)
      const d = Math.hypot((p.x - ndc.x) * r.width / 2, (p.y - ndc.y) * r.height / 2)
      el.setPointerCapture?.(e.pointerId)
      if (d < 110) { st8.drag = true; shared.dragging = true; move(e); chime([880], 0, .05) }
      else shared.orbiting = { x: e.clientX, y: e.clientY }
    }
    const move = e => {
      const pp = ptrs.get(e.pointerId); if (pp) { pp.x = e.clientX; pp.y = e.clientY }
      if (ptrs.size === 2 && !st8.drag) { const [a, b] = [...ptrs.values()]; shared.hangR = clamp(r0 * pinch0 / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), 9, 25); return }
      if (shared.orbiting) { const dx = e.clientX - shared.orbiting.x, dy = e.clientY - shared.orbiting.y; shared.orbiting = { x: e.clientX, y: e.clientY }
        shared.hangAz -= dx * .008; shared.hangY = clamp(shared.hangY + dy * .03, 2.2, 13); return }
      if (!st8.drag) return; toNdc(e); ray.setFromCamera(ndc, camera)
      const hit = ray.intersectObject(shell, false)[0]
      if (hit) { const n = V(hit.point.x, 0, hit.point.z).normalize(); st8.target.copy(hit.point).addScaledVector(n, .35).add(V(0, -.1, 0)) }
      else { plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(V()).negate(), V(0, 6, 4)); ray.ray.intersectPlane(plane, st8.target) }
      shared.edge = Math.abs(ndc.x) > .78 ? Math.sign(ndc.x) : 0
    }
    const wheel = e => { if (useStore.getState().phase !== 'hang') return; e.preventDefault(); shared.hangR = clamp(shared.hangR * (1 + e.deltaY * .0012), 9, 25) }
    const up = e => { ptrs.delete(e.pointerId); shared.orbiting = null; if (!st8.drag) return; st8.drag = false; shared.dragging = false; shared.edge = 0
      if (shared.hookHi >= 0) attach(shared.hookHi); else chime([440], 0, .04) }
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); el.addEventListener('wheel', wheel, { passive: false })
    return () => { el.removeEventListener('wheel', wheel); window.removeEventListener('pointercancel', up); el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [gl, camera])

  function attach(i) {
    const h = shared.hooks[i]; o.bob = h.p.clone().addScaledVector(h.n, .3).add(V(0, .05, 0)); o.prev = o.bob.clone().addScaledVector(h.n, .02); o.ph = Math.random() * 6; o.dir = 1
    st8.settleAt = now(); shared.hookHi = -1
    useStore.setState({ heroHook: i }); useStore.getState().setPhase('settling'); chime([1318.5, 1568], .1)
  }
  // "Auto-hang": pick the best free hook facing the camera and fly there
  useEffect(() => useStore.subscribe((s, p) => { if (s.autoHang && !p.autoHang && s.phase === 'hang') {
    useStore.setState({ autoHang: false }); const cam = camera.position, free = freeHooks()
    let best = -1, bs = -1e9; free.forEach(i => { const h = shared.hooks[i]; const toC = cam.clone().sub(h.p).setY(0).normalize(); const sc = h.n.dot(toC) * 3 - Math.abs(h.y - 6) * .4; if (sc > bs) { bs = sc; best = i } })
    if (best >= 0) { const h = shared.hooks[best]; st8.auto = { i: best, from: st8.pos.clone(), to: h.p.clone().addScaledVector(h.n, .35), t0: now() } } } }), [camera])

  useFrame((_, dtRaw) => {
    const s = useStore.getState(), t = now(), k = t - s.phaseAt, dt = Math.min(dtRaw, 1 / 30), D = DESIGNS[design]
    const isSend = s.view === 'send', name = isSend ? s.myName : s.from
    // which phases show the hero
    const visible = (isSend && ['engrave', 'hang', 'settling', 'crown', 'crowning', 'greeting', 'explore'].includes(s.phase) && s.view !== 'tree')
      || (!isSend && s.view === 'open' && ['unwrap', 'hang', 'settling', 'crown', 'crowning', 'greeting', 'explore'].includes(s.phase))
    shared.heroVisible = visible
    ;[parts.body, parts.cap, parts.loop, parts.tag, parts.thread].forEach(m => { if (m) m.visible = visible })
    if (!visible) { if (ring.current) ring.current.visible = false; if (hookPts.current) hookPts.current.visible = false; return }

    // paint the name (letters fade in as they are typed)
    const key = `${name}|${design}|${s.brandKey}|${s.phase === 'engrave'}`
    if (key !== st8.lastName || st8.pending) {
      paintSurface(canvas.getContext('2d'), 0, 0, 4, design, designColor(design, brand.palette, brand.accent), name || 'Your name',
        { t, times: isSend && s.phase === 'engrave' ? s.engraveTimes : null, ghost: !name, per: brand.per, brandAccent: brand.accent, brandMono: brand.mono })
      tex.needsUpdate = true; st8.lastName = key; st8.pending = s.engraveTimes.some(x => t - x < .4)
    }

    let hung = false
    if (s.phase === 'engrave') {
      const e = easeOut(k / 1.1); st8.pos.lerpVectors(V(CRATE[0] + (-0.75 + (design % 4) * .5), 1.05, CRATE[2] + ((design >> 2) ? .2 : -.2)), V(...HELD), e)
      st8.scale = .9 + .7 * e; st8.spin = D.front + Math.sin(t * .8) * .35 * (1 - Math.min(1, s.myName.length)) + Math.sin(t * .6) * .12
    } else if (s.phase === 'unwrap') {
      const e = ease((k - .6) / 1.6); st8.pos.lerpVectors(V(CRATE[0], .3, CRATE[2]), V(...HELD), e); st8.scale = .2 + 1.5 * e; st8.spin = D.front + (1 - e) * 6 + Math.sin(t * .6) * .15
    } else if (s.phase === 'hang') {
      if (st8.auto) { const a = st8.auto, e = ease((t - a.t0) / 1.2); const mid = a.from.clone().lerp(a.to, .5).add(V(0, 1.2, 0))
        st8.pos.set(0, 0, 0).addScaledVector(a.from, (1 - e) ** 2).addScaledVector(mid, 2 * e * (1 - e)).addScaledVector(a.to, e * e); if (e >= 1) { const i = a.i; st8.auto = null; attach(i) } }
      else if (st8.drag) st8.pos.lerp(st8.target, .35)
      else { // rest at the "hand" position, low in the frame
        const hand = V(0, -.22, .5).unproject(camera).sub(camera.position).normalize().multiplyScalar(7).add(camera.position); st8.pos.lerp(hand, .12) }
      st8.scale += (1.15 - st8.scale) * .1; st8.spin = t * .7
      // nearest free hook
      let best = -1
      if (st8.drag) { let bd = 78; const W = size.width / 2, H = size.height / 2, pr = V(), toC = V()
        for (const i of freeHooks()) { const h = shared.hooks[i]; toC.copy(camera.position).sub(h.p).setY(0).normalize(); if (h.n.dot(toC) < .15) continue
          pr.copy(h.p).project(camera); const d = Math.hypot((pr.x - ndc.x) * W, (pr.y - ndc.y) * H); if (d < bd) { bd = d; best = i } }
        if (best >= 0) { const h = shared.hooks[best]; st8.target.copy(h.p).addScaledVector(h.n, .25).add(V(0, -.2, 0)) } }
      shared.hookHi = st8.drag ? best : -1
      if (shared.edge) shared.hangAz -= shared.edge * dt * .8
    } else if (s.heroHook >= 0) { hung = true }

    if (hung) {
      const A = shared.hooks[s.heroHook].p
      if (o.bob) { ropeStep(o, A, dt); if (t - st8.settleAt > 3.5) o.bob = null }
      o.faceCam = s.focus === 'hero' || s.phase === 'settling'
      st8.scale += (1 - st8.scale) * .1
      const c = hangMatrices(o, A, t, design, st8.scale, OUT)
      parts.cap.matrix.copy(OUT.cap); parts.body.matrix.copy(OUT.body); if (parts.tag) parts.tag.matrix.copy(OUT.tag); parts.loop.matrix.copy(OUT.cap)
      const p = parts.thread.geometry.attributes.position; p.setXYZ(0, A.x, A.y, A.z); p.setXYZ(1, c.x, c.y, c.z); p.needsUpdate = true
      st8.pos.copy(c)
    } else {
      OUT.cap.compose(st8.pos, QI, V(st8.scale, st8.scale, st8.scale))
      parts.cap.matrix.copy(OUT.cap); parts.loop.matrix.copy(OUT.cap)
      parts.body.matrix.copy(OUT.cap).multiply(T.makeTranslation(0, -D.top, 0)).multiply(R.makeRotationY(st8.spin))
      if (parts.tag) parts.tag.matrix.copy(OUT.cap).multiply(R.makeRotationY(st8.spin)).multiply(T.makeTranslation(D.tagX, -.05, 0)).multiply(R2.makeRotationZ(.08))
      const p = parts.thread.geometry.attributes.position; p.setXYZ(0, st8.pos.x, st8.pos.y + .25 * st8.scale, st8.pos.z); p.setXYZ(1, st8.pos.x, st8.pos.y, st8.pos.z); p.needsUpdate = true
    }
    shared.heroPos.copy(st8.pos); shared.heroBody.setFromMatrixPosition(parts.body.matrix)

    // drag helpers: glowing free hooks and a ring on the target hook
    if (ring.current) { const hi = shared.hookHi; ring.current.visible = hi >= 0
      if (hi >= 0) { ring.current.position.copy(shared.hooks[hi].p); ring.current.lookAt(camera.position); ring.current.scale.setScalar(1 + Math.sin(t * 8) * .12) } }
    if (hookPts.current) { hookPts.current.visible = s.phase === 'hang'
      if (s.phase === 'hang') { const free = freeHooks(), a = hookPts.current.geometry.attributes.position; let n = 0
        for (const i of free) { const h = shared.hooks[i]; if (h.n.dot(camera.position.clone().sub(h.p).setY(0).normalize()) < .2) continue; a.setXYZ(n++, h.p.x, h.p.y, h.p.z) }
        a.needsUpdate = true; hookPts.current.geometry.setDrawRange(0, n); hookPts.current.material.opacity = .5 + Math.sin(t * 3) * .25 } }
  })

  // link-preview snapshot of the hero ornament
  useEffect(() => { shared.snapshot = () => {
    const cam = new THREE.PerspectiveCamera(30, 1.91, .05, 200), b = shared.heroBody
    const h = useStore.getState().heroHook, n = h >= 0 ? shared.hooks[h].n : V(0, 0, 1)
    cam.position.copy(b).addScaledVector(n, 1.4).add(V(0, .15, 0)); cam.lookAt(b); const W = gl.domElement.width, H = gl.domElement.height
    const tmp = new THREE.WebGLRenderTarget(1200, 628, { colorSpace: THREE.SRGBColorSpace }); gl.setRenderTarget(tmp); gl.render(scene, cam)
    const px = new Uint8Array(1200 * 628 * 4); gl.readRenderTargetPixels(tmp, 0, 0, 1200, 628, px); gl.setRenderTarget(null); tmp.dispose()
    const c = document.createElement('canvas'); c.width = 1200; c.height = 628; const x = c.getContext('2d'), img = x.createImageData(1200, 628)
    for (let y = 0; y < 628; y++) img.data.set(px.subarray((627 - y) * 4800, (628 - y) * 4800), y * 4800)
    x.putImageData(img, 0, 0); return c
  } }, [gl, scene])

  const hookGeo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(600 * 3), 3)); return g }, [])
  return (
    <group>
      <Crate brand={brand} visible={view === 'send' && phase === 'choose'} />
      <GiftBox brand={brand} from={from} visible={view === 'open' && ['gift', 'unwrap', 'hang'].includes(phase)} />
      <primitive object={parts.body} />{parts.tag && <primitive object={parts.tag} />}<primitive object={parts.cap} /><primitive object={parts.loop} /><primitive object={parts.thread} />
      <mesh ref={ring} visible={false}><torusGeometry args={[.22, .025, 8, 32]} /><meshBasicMaterial color={[3, 2.4, 1.2]} toneMapped={false} /></mesh>
      <points ref={hookPts} geometry={hookGeo} frustumCulled={false}><pointsMaterial map={glow} color={0xffd27a} size={.45} transparent opacity={.6} depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    </group>
  )
}
const OUT = { cap: new THREE.Matrix4(), body: new THREE.Matrix4(), tag: new THREE.Matrix4() }
const T = new THREE.Matrix4(), R = new THREE.Matrix4(), R2 = new THREE.Matrix4(), QI = new THREE.Quaternion()
