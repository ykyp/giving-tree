import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { TREE } from '../config'
import { useStore } from '../store'
import { seeded, clamp, easeBack, now } from '../lib/util'
import { shared, litLevel, glow } from './shared'

export const Rsil = y => Math.max(0.1, 4.9 * Math.pow(clamp(1 - (y - TREE.base) / (TREE.top - TREE.base), 0, 1), 1.08) + 0.08)
export const TOP_Y = TREE.top + 0.5

/* ---------- branch layout (tier-independent, so hooks are identical on every device) ---------- */
const BRANCHES = []
{
  const r = seeded(77), T = 50
  for (let i = 0; i < T; i++) {
    const h = i / (T - 1), y = TREE.base + Math.pow(h, 0.92) * (TREE.top - TREE.base - 0.3), R = Rsil(y)
    const nb = Math.max(5, Math.round(6 + 11 * (1 - h))), a0 = r() * 6.28
    for (let b = 0; b < nb; b++) {
      const a = a0 + b * 6.2832 / nb + (r() - .5) * 0.4
      BRANCHES.push({ a, y, h, L: R * (0.9 + r() * 0.16), droop: -0.16 - 0.26 * (1 - h), seed: Math.floor(r() * 1e6) })
    }
  }
}
const ptOf = (B, s) => new THREE.Vector3(Math.cos(B.a) * s, B.y + B.droop * s + 0.06 * s * s, Math.sin(B.a) * s)
const tgOf = (B, s) => new THREE.Vector3(Math.cos(B.a), B.droop + 0.12 * s, Math.sin(B.a)).normalize()
// hang points at the branch tips, spaced out
{
  const all = BRANCHES.filter(B => B.y > 1.5 && B.y < TREE.top - 1.4).map(B => { const s = B.L * 0.95, d = new THREE.Vector3(Math.cos(B.a), 0, Math.sin(B.a))
    return { p: ptOf(B, s).addScaledVector(d, 0.08).add(new THREE.Vector3(0, -0.12, 0)), n: d, y: B.y } })
  const r = seeded(5), keep = []
  all.map(h => [r(), h]).sort((a, b) => a[0] - b[0]).forEach(([, h]) => { if (keep.every(k => k.p.distanceTo(h.p) > 0.8)) keep.push(h) })
  keep.sort((a, b) => a.y - b.y); shared.hooks = keep
}

function twigTexture() {
  // drawn at twice the size it is laid out in, so needles stay crisp when a branch fills a phone screen
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d'); x.scale(2, 2); const r = seeded(31)
  const stemY = s => 128 - Math.sin(s * 3.1) * 6
  const needle = (px, py, ang, len, w, dark) => { const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len
    const g = x.createLinearGradient(px, py, ex, ey); g.addColorStop(0, dark ? '#0c2618' : '#143522'); g.addColorStop(.55, dark ? '#1b4a2e' : '#275f39'); g.addColorStop(1, dark ? '#346f45' : '#5b9460')
    x.strokeStyle = g; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke() }
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 1) for (let k = 0; k < 9; k++) { const s = 0.1 + k * 0.095, px = 10 + s * 490, py = stemY(s), side = k % 2 ? 1 : -1, a = side * (0.55 + r() * 0.2), len = 150 - k * 9
      for (let t = 0; t < 1; t += 0.04) { const tx = px + Math.cos(a) * t * len, ty = py + Math.sin(a) * t * len; for (const sd of [-1, 1]) needle(tx, ty, a + sd * (0.95 + r() * 0.3), (26 + r() * 12) * (1 - t * .45), 2.5, r() < .5) }
      x.strokeStyle = '#4a3524'; x.lineWidth = 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len * .95, py + Math.sin(a) * len * .95); x.stroke() }
    for (let s = 0.02; s < 0.98; s += pass ? 0.008 : 0.012) { const px = 10 + s * 490, py = stemY(s), taper = 1 - 0.55 * s
      for (const side of [-1, 1]) { const lean = (0.12 + r() * 0.5) * 0.9; needle(px, py, side < 0 ? -Math.PI / 2 + lean : Math.PI / 2 - lean, (44 + r() * 22) * taper, pass ? 3 : 3.4, pass === 0) } }
  }
  x.strokeStyle = '#5a4028'; x.lineWidth = 4; x.beginPath(); for (let s = 0; s <= 1; s += 0.02) { const px = 10 + s * 490, py = stemY(s); s ? x.lineTo(px, py) : x.moveTo(px, py) } x.stroke()
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t
}

export default function Tree({ tier, brand }) {
  const needleMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: twigTexture(), alphaTest: 0.42, side: THREE.DoubleSide, roughness: .8, envMapIntensity: .12, emissive: new THREE.Color(0xff9a40), emissiveIntensity: 0 })
    m.userData.uTime = { value: 0 }
    m.onBeforeCompile = sh => { sh.uniforms.uTime = m.userData.uTime
      const R = `(4.9 * pow(clamp(1. - (fy - ${TREE.base.toFixed(2)}) / ${(TREE.top - TREE.base).toFixed(2)}, 0., 1.), 1.08) + .08)`
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime; varying float vSnowN; varying float vAO;')
        // volumetric foliage normals: every card faces outward-and-up from the trunk, so the crown lights as one mass
        .replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>
          vec4 wp0 = vec4(position, 1.);
          vec3 n0 = objectNormal;
          #ifdef USE_INSTANCING
            wp0 = instanceMatrix * wp0; n0 = mat3(instanceMatrix) * objectNormal;
          #endif
          n0 = normalize(n0); vSnowN = n0.y;
          float fy = wp0.y, rr0 = length(wp0.xz), Rr = ${R};
          vec3 shellN = normalize(vec3(wp0.x, rr0 * .45 + .35, wp0.z));
          transformedNormal = normalMatrix * normalize(mix(n0 * (n0.y < 0. ? -1. : 1.), shellN, .82));
          vAO = mix(.28, 1., smoothstep(.2, .95, rr0 / Rr)) * mix(.8, 1., smoothstep(1., 4., fy));`)
        .replace('#include <project_vertex>', `
          vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif
          float rr = length(mvPosition.xz);
          float sw = sin(uTime*1.1 + mvPosition.y*0.55 + mvPosition.x*0.3) * 0.018 * rr;
          mvPosition.x += sw; mvPosition.z += sw*0.5; mvPosition.y += sin(uTime*1.7 + mvPosition.x)*0.006*rr;
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;`)
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vSnowN; varying float vAO;')
        // keep the shell normal on back faces too (no flip), or half the cards go black
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);')
        .replace('#include <color_fragment>', `#include <color_fragment>
          { float ny = gl_FrontFacing ? vSnowN : -vSnowN; float lum = dot(diffuseColor.rgb, vec3(.3,.6,.1));
            float snowAmt = smoothstep(.55, .95, ny) * smoothstep(.07, .2, lum) * .5 * smoothstep(.55, .9, vAO);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.8,.86,1.), snowAmt) * vAO; }`) }
    m.customProgramCacheKey = () => 'needles'
    return m
  }, [])

  const cards = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0.5, 0, 0)
    const mats = [], cols = [], Q = new THREE.Quaternion(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
    const side = tier !== 'low', step = tier === 'low' ? 0.42 : 0.33
    const add = (pos, tan, len, wid, roll, yaw, col) => {
      X.copy(tan); if (yaw) { Q.setFromAxisAngle(up, yaw); X.applyQuaternion(Q) }
      Z.copy(up).addScaledVector(X, -up.dot(X)).normalize(); if (roll) { Q.setFromAxisAngle(X, roll); Z.applyQuaternion(Q) }
      Y.crossVectors(Z, X).normalize()
      const m = new THREE.Matrix4().makeBasis(X.clone().multiplyScalar(len), Y.clone().multiplyScalar(wid), Z.clone()); m.setPosition(pos); mats.push(m); cols.push(col)
    }
    for (const B of BRANCHES) { const r = seeded(B.seed), K = Math.max(2, Math.round(B.L / step))
      for (let k = 0; k < K; k++) { const s = (k / K) * B.L * 0.92 + 0.06, d = s / B.L
        const br = (0.42 + 0.58 * Math.pow(d, 0.7)) * (0.82 + r() * 0.3) * (0.92 + B.h * 0.18), col = new THREE.Color(br * 0.93, br, br * 0.88)
        const len = (0.62 + r() * 0.22) * (k === K - 1 ? 0.85 : 1), wid = 0.55 + r() * 0.12
        add(ptOf(B, s), tgOf(B, s), len, wid, (r() - .5) * 0.7, 0, col)
        if (side && d > 0.2) { add(ptOf(B, s), tgOf(B, s), len * .72, wid * .85, .35 + r() * .3, .62 + r() * .2, col.clone().multiplyScalar(.92))
          add(ptOf(B, s), tgOf(B, s), len * .72, wid * .85, -.35 - r() * .3, -.62 - r() * .2, col.clone().multiplyScalar(.92)) }
        // a steeply rolled card for volume, so branches read as fluffy sprays rather than flat slats
        if (side && d > 0.35 && r() < .7) add(ptOf(B, s).add(new THREE.Vector3(0, .05, 0)), tgOf(B, s), len * .66, wid * .8, (r() < .5 ? 1 : -1) * (1.0 + r() * .35), (r() - .5) * .5, col.clone().multiplyScalar(.85)) } }
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; add(new THREE.Vector3(Math.cos(a) * .05, TREE.top - 0.7, Math.sin(a) * .05), new THREE.Vector3(Math.cos(a) * .25, 1, Math.sin(a) * .25).normalize(), .95, .38, 0, 0, new THREE.Color(1, 1, .95)) }
    const im = new THREE.InstancedMesh(geo, needleMat, mats.length)
    mats.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, cols[i]) }); im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false
    return im
  }, [tier, needleMat])

  /* string lights */
  const N = tier === 'low' ? 380 : 560
  const lights = useMemo(() => {
    const P = new Float32Array(N * 3), C = new Float32Array(N * 3), T = new Float32Array(N), r = seeded(91)
    const pal = [[1, .78, .45], [1, .78, .45], [1, .78, .45], [1, .6, .3], [1, .86, .62]]
    for (let i = 0; i < N; i++) { const t = i / N, y = TREE.base + 0.4 + t * (TREE.top - TREE.base - 0.9), rad = Rsil(y + 0.3) * 0.93 + 0.05, a = t * 6.2832 * 12 + (r() - .5) * .1
      P.set([Math.cos(a) * rad, y + Math.sin(a * 3) * .05, Math.sin(a) * rad], i * 3); C.set(pal[Math.floor(r() * pal.length)], i * 3); T[i] = t }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('aT', new THREE.BufferAttribute(T, 1))
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.03, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), N)
    const m4 = new THREE.Matrix4(); for (let i = 0; i < N; i++) { m4.makeTranslation(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); bulbs.setMatrixAt(i, m4); bulbs.setColorAt(i, new THREE.Color(.08, .07, .06)) }
    bulbs.frustumCulled = false
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uTime: { value: 0 }, uLight: { value: 0 }, uMap: { value: glow }, uScale: { value: 800 }, uPulse: { value: 1 } },
      vertexShader: `attribute float aT; uniform float uTime,uLight,uScale,uPulse; varying float vA; varying vec3 vC;
        void main(){ float on=clamp((uLight-aT)*25.,0.,1.); vA=on*(.75+.25*sin(uTime*2.+aT*90.))*uPulse; vC=color;
          vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=min(uScale*.13/-mv.z, uScale*.03); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uMap; varying float vA; varying vec3 vC; void main(){ gl_FragColor=vec4(vC*texture2D(uMap,gl_PointCoord).a*vA*.85,1.); }` })
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false
    return { bulbs, pts, mat, C, lastN: -1 }
  }, [N])

  const topper = useRef(), topGlow = useRef(), halo = useRef()
  const disc = useMemo(() => {
    if (brand.star !== 'logo') return null
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')
    const g = x.createRadialGradient(110, 100, 10, 128, 128, 128); g.addColorStop(0, '#ffe7a8'); g.addColorStop(1, '#c98f37'); x.fillStyle = g; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill()
    x.strokeStyle = 'rgba(90,55,10,.5)'; x.lineWidth = 8; x.beginPath(); x.arc(128, 128, 108, 0, 7); x.stroke()
    x.fillStyle = '#5a3712'; x.font = 'italic 150px "Instrument Serif", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(brand.mono || '★', 128, 140)
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex
  }, [brand])
  const starGeo = useMemo(() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .22 : .55; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y) } s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelThickness: .06, bevelSize: .045, bevelSegments: 3 }); g.center(); return g }, [])

  useFrame(({ size, gl, camera }) => {
    const t = now(), L = litLevel(), st = useStore.getState()
    needleMat.userData.uTime.value = t; needleMat.emissiveIntensity = L * 0.05
    lights.mat.uniforms.uTime.value = t; lights.mat.uniforms.uLight.value = L * 1.04; lights.mat.uniforms.uScale.value = size.height * gl.getPixelRatio()
    const pulse = st.clock.pulse ? 1.25 + Math.sin(t * 4.5) * .95 : 1; lights.mat.uniforms.uPulse.value = pulse
    const n = Math.floor(L * N); if (n !== lights.lastN) { lights.lastN = n; const c = new THREE.Color()
      for (let i = 0; i < N; i++) { if (i < n) c.setRGB(lights.C[i * 3] * 1.6, lights.C[i * 3 + 1] * 1.3, lights.C[i * 3 + 2] * .9); else c.setRGB(.08, .07, .06); lights.bulbs.setColorAt(i, c) }
      lights.bulbs.instanceColor.needsUpdate = true }
    if (halo.current) { halo.current.material.opacity = L * 0.22 * pulse; const c = camera.position, l = Math.hypot(c.x, c.z) || 1; halo.current.position.set(-c.x / l * 6, 6.6, -c.z / l * 6) }
    // star: floats above the tree in 'crown', drops onto the top in 'crowning', sits there afterwards
    const ph = st.phase, show = ['crown', 'crowning', 'greeting', 'explore', 'mearrive', 'branch', 'parcels', 'gave', 'thanks', 'selfwish'].includes(ph)
    if (topper.current) { topper.current.visible = show
      let y = TOP_Y, glowA = .6
      if (ph === 'crown') { y = TOP_Y + 2.2 + Math.sin(t * 2) * 0.12; glowA = .8 + Math.sin(t * 4) * .2 }
      else if (ph === 'crowning') { const k = easeBack((t - st.phaseAt) / 1.4); y = TOP_Y + 2.2 * (1 - k); const fl = Math.max(0, 1 - Math.abs(t - st.phaseAt - 1.4) / .4); glowA = .6 + fl; topGlow.current.scale.setScalar(4 + fl * 5) }
      topper.current.position.y = y; topper.current.rotation.y = Math.sin(t * .5) * .4; topGlow.current.material.opacity = Math.min(1, glowA) }
  })

  const onStar = e => { e.stopPropagation(); const st = useStore.getState(); if (st.phase === 'crown') st.setPhase('crowning') }
  return (
    <group>
      <primitive object={cards} />
      <mesh position={[0, TREE.base + 5.9, 0]}><coneGeometry args={[3.7, 11.8, 32, 1, true]} /><meshStandardMaterial color={0x173a24} roughness={1} side={THREE.DoubleSide} envMapIntensity={.1} /></mesh>
      <mesh position={[0, .75, 0]}><cylinderGeometry args={[.2, .36, 1.9, 14]} /><meshStandardMaterial color={0x3b2617} roughness={1} /></mesh>
      <Skirt />
      <primitive object={lights.bulbs} /><primitive object={lights.pts} />
      <sprite ref={halo} position={[0, 6.6, -3]} scale={[24, 24, 1]}><spriteMaterial map={glow} color={0xffa050} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
      <group ref={topper} position={[0, TOP_Y, 0]} scale={1.45} visible={false} onClick={onStar}>
        {disc ? <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.58, .58, .11, 48]} /><meshStandardMaterial attach="material" map={disc} emissive="#ffffff" emissiveMap={disc} emissiveIntensity={.5} metalness={.4} roughness={.35} /></mesh>
          : <mesh geometry={starGeo}><meshStandardMaterial color={0xffd27a} emissive={0xffa53a} emissiveIntensity={1.6} metalness={.8} roughness={.25} /></mesh>}
        <sprite ref={topGlow} scale={[4, 4, 1]}><spriteMaterial map={glow} color={0xffd27a} transparent opacity={.6} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
        <mesh><sphereGeometry args={[1.1, 8, 6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      </group>
    </group>
  )
}

function Skirt() {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#7d1020'; x.fillRect(0, 0, 256, 256)
    for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? 0 : 255},0,20,${Math.random() * .12})`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2) }
    x.strokeStyle = '#f1e6d0'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 118, 0, 7); x.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }, [])
  return <mesh position={[0, .03, 0]}><cylinderGeometry args={[3.5, 3.55, .05, 56]} /><meshStandardMaterial map={tex} roughness={.95} envMapIntensity={.2} /></mesh>
}
