import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBoxGeometry } from 'three-stdlib'
import { useStore } from '../store'
import { seeded, now } from '../lib/util'
import { litLevel, glow } from './shared'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const canvasTex = (w, h, draw, repeat) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) } return t }
const HOUSE_COLS = ['#e8dcc4', '#c76f4f', '#8fae96', '#6e86a8', '#d4a94e', '#c98b8b', '#efe9df', '#a7b8c9']

/* ---------- layout (deterministic) ---------- */
function buildLayout() {
  const r = seeded(21), houses = [], lamps = [], pines = []
  // lane houses, both sides
  for (const side of [-1, 1]) for (let z = 26; z < 104;) { const w = 6 + r() * 2.5; houses.push({ x: side * (9 + r() * .6), z: z + w / 2, w, d: 7, h: 4.5 + r() * 3.5, face: side < 0 ? Math.PI / 2 : -Math.PI / 2, c: HOUSE_COLS[Math.floor(r() * HOUSE_COLS.length)] }); z += w + .6 }
  // square ring, leaving the lane opening
  for (let i = 0; i < 18; i++) { const a = Math.PI / 2 + 0.42 + (i / 17) * (Math.PI * 2 - 0.84); const R = 28 + r() * 2.5, w = 7 + r() * 2.5
    houses.push({ x: Math.cos(a) * R, z: Math.sin(a) * R, w, d: 7, h: 5 + r() * 4, face: Math.atan2(-Math.cos(a), -Math.sin(a)), c: HOUSE_COLS[Math.floor(r() * HOUSE_COLS.length)] }) }
  for (let z = 26; z < 104; z += 12) for (const s of [-1, 1]) lamps.push([s * 4.8, z])
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; if (Math.sin(a) > 0.3) continue; lamps.push([Math.cos(a) * 15.5, Math.sin(a) * 15.5]) }
  for (let i = 0; i < 220; i++) { const a = r() * 6.28, R = 40 + r() * 75, x = Math.cos(a) * R, z = Math.sin(a) * R; if (Math.abs(x) < 18 && z > 10) continue; pines.push([x, z, 4 + r() * 6]) }
  return { houses, lamps, pines }
}
const LAYOUT = buildLayout()

export function Environment() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl), es = new THREE.Scene()
    es.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'varying vec3 vP; void main(){ float y=vP.y; vec3 c=mix(vec3(.05,.06,.14), vec3(.13,.16,.34), smoothstep(-.3,.6,y)); c+=vec3(.5,.55,.7)*smoothstep(.8,1.,y)*.5; gl_FragColor=vec4(c,1.); }' })))
    const blob = (c, i, p, s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) })); m.position.set(...p); es.add(m) }
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; blob(0xffb35c, 5 + Math.random() * 4, [Math.cos(a) * 8, -1 + Math.random() * 5, Math.sin(a) * 8], .45 + Math.random() * .4) }
    blob(0xcfe0ff, 6, [-6, 12, 6], 1.6); blob(0xffffff, 3, [5, 8, -6], 1); blob(0xff6aa0, 3, [8, 1, 3], .6)
    const env = pm.fromScene(es, .03).texture; scene.environment = env; pm.dispose(); return () => env.dispose()
  }, [gl, scene])
  return null
}

export function Sky() {
  const stars = useMemo(() => { const n = 900, p = new Float32Array(n * 3), ph = new Float32Array(n)
    for (let i = 0; i < n; i++) { const th = Math.random() * 6.28, y = .08 + Math.random() * .9, r = Math.sqrt(1 - y * y); p.set([Math.cos(th) * r * 280, y * 280, Math.sin(th) * r * 280], i * 3); ph[i] = Math.random() * 6.28 }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aPh', new THREE.BufferAttribute(ph, 1)); return g }, [])
  const mat = useMemo(() => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, uniforms: { uTime: { value: 0 } },
    vertexShader: 'attribute float aPh; uniform float uTime; varying float vA; void main(){ vA=.3+.5*(.5+.5*sin(uTime*1.3+aPh)); gl_PointSize=2.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying float vA; void main(){ gl_FragColor=vec4(1.,1.,1.,vA); }' }), [])
  const moon = useMemo(() => canvasTex(256, 256, (x) => { const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(255,250,235,1)'); g.addColorStop(.17, 'rgba(255,248,230,1)'); g.addColorStop(.2, 'rgba(220,230,255,.35)'); g.addColorStop(1, 'rgba(200,215,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256) }), [])
  useFrame(() => { mat.uniforms.uTime.value = now() })
  return (<group>
    <mesh><sphereGeometry args={[300, 32, 16]} /><shaderMaterial side={THREE.BackSide} depthWrite={false} fog={false}
      vertexShader="varying float vY; void main(){ vY=normalize(position).y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }"
      fragmentShader="varying float vY; void main(){ vec3 a=vec3(.2,.19,.38), b=vec3(.07,.1,.27), c=vec3(.02,.035,.11); vec3 col = vY<0.08 ? mix(a,b,smoothstep(-.05,.08,vY)) : mix(b,c,smoothstep(.08,.6,vY)); gl_FragColor=vec4(col,1.); }" /></mesh>
    <points geometry={stars} material={mat} />
    <sprite position={[-110, 120, -190]} scale={[55, 55, 1]}><spriteMaterial map={moon} fog={false} depthWrite={false} transparent /></sprite>
  </group>)
}

export function Ground() {
  const snowTex = useMemo(() => canvasTex(256, 256, (x) => { x.fillStyle = '#7f7f7f'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 9000; i++) { const v = 100 + Math.random() * 60; x.fillStyle = `rgb(${v},${v},${v})`; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2.2, 0, 7); x.fill() } }, [60, 60]), [])
  const cobble = useMemo(() => canvasTex(512, 512, (x, w) => { x.fillStyle = '#8c8f9e'; x.fillRect(0, 0, w, w); const r = seeded(9)
    for (let y = 0; y < 16; y++) for (let i = 0; i < 16; i++) { const v = 150 + r() * 50; x.fillStyle = `rgb(${v},${v},${v + 8})`; x.beginPath(); x.roundRect(i * 32 + (y % 2) * 16 + 2, y * 32 + 2, 28, 28, 8); x.fill() }
    x.globalAlpha = .55; x.fillStyle = '#eef2fa'; for (let i = 0; i < 260; i++) { x.beginPath(); x.ellipse(r() * w, r() * w, 6 + r() * 30, 4 + r() * 16, r() * 3, 0, 7); x.fill() } }, [10, 10]), [])
  return (<group>
    <mesh rotation-x={-Math.PI / 2}><circleGeometry args={[260, 64]} /><meshStandardMaterial color={0xd9e1f3} roughness={.85} bumpMap={snowTex} bumpScale={1.2} envMapIntensity={.25} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .01, 0]}><circleGeometry args={[19, 64]} /><meshStandardMaterial map={cobble} color={0xb9bfcf} roughness={.75} envMapIntensity={.35} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .012, 62]}><planeGeometry args={[11, 86]} /><meshStandardMaterial map={cobble} color={0xb9bfcf} roughness={.75} envMapIntensity={.35} /></mesh>
  </group>)
}

export function Village({ brand }) {
  const view = useStore(s => s.view), from = useStore(s => s.from)
  const parts = useMemo(() => {
    const { houses, lamps, pines } = LAYOUT, r = seeded(33), n = houses.length, o = new THREE.Object3D(), m4 = new THREE.Matrix4()
    const body = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, .04).translate(0, .5, 0), new THREE.MeshStandardMaterial({ roughness: .9, envMapIntensity: .25 }), n)
    const roof = new THREE.InstancedMesh(new THREE.CylinderGeometry(.62, .62, 1, 3, 1).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe6ecf6, roughness: .8, envMapIntensity: .3 }), n)
    const chim = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x6b4a3a, roughness: 1 }), n)
    const winMat = new THREE.MeshBasicMaterial({ color: 0x5a4630, toneMapped: false })
    const wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(.9, 1.2), winMat, n * 8)
    const doorG = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 2.2, .12), new THREE.MeshStandardMaterial({ color: 0x4a2c1c, roughness: .7 }), n)
    const wreath = new THREE.InstancedMesh(new THREE.TorusGeometry(.32, .1, 8, 18), new THREE.MeshStandardMaterial({ color: 0x1f5a35, roughness: .9 }), n)
    const smokePts = []
    let wi = 0
    houses.forEach((h, i) => {
      o.position.set(h.x, 0, h.z); o.rotation.set(0, h.face, 0); o.scale.set(h.w, h.h, h.d); o.updateMatrix(); body.setMatrixAt(i, o.matrix); body.setColorAt(i, new THREE.Color(h.c))
      const base = new THREE.Matrix4().compose(V(h.x, 0, h.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, h.face, 0)), V(1, 1, 1))
      o.position.set(0, h.h + .45, 0); o.rotation.set(0, 0, 0); o.scale.set(h.w * 1.12, 1.6, h.d * 1.1); o.updateMatrix(); roof.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
      const cx = (r() - .5) * h.w * .5; o.position.set(cx, h.h + 1.1, -h.d * .15); o.scale.set(.7, 1.6, .7); o.updateMatrix(); chim.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
      if (i % 3 === 0) smokePts.push(V(cx, h.h + 2, -h.d * .15).applyMatrix4(base))
      const cols = Math.max(2, Math.floor(h.w / 2)), rows = h.h > 6 ? 2 : 1
      for (let ry = 0; ry < rows; ry++) for (let k = 0; k < cols; k++) { if (ry === 0 && k === Math.floor(cols / 2)) continue; if (r() < .18) continue
        o.position.set((-.5 + (k + .5) / cols) * h.w, 1.6 + ry * 2.6, h.d / 2 + .02); o.scale.set(1, 1, 1); o.updateMatrix(); wins.setMatrixAt(wi++, m4.multiplyMatrices(base, o.matrix)) }
      o.position.set(((Math.floor(cols / 2) + .5) / cols - .5) * h.w, 1.1, h.d / 2 + .04); o.updateMatrix(); doorG.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
      o.position.y = 1.6; o.position.z = h.d / 2 + .14; o.updateMatrix(); wreath.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
    })
    wins.count = wi
    // lamps
    const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(.08, .12, 4.2, 10).translate(0, 2.1, 0), new THREE.MeshStandardMaterial({ color: 0x14182c, roughness: .5, metalness: .6 }), lamps.length)
    const headMat = new THREE.MeshBasicMaterial({ color: 0x806040, toneMapped: false })
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(.22, 14, 10), headMat, lamps.length)
    lamps.forEach(([x, z], i) => { post.setMatrixAt(i, m4.makeTranslation(x, 0, z)); head.setMatrixAt(i, m4.makeTranslation(x, 4.3, z)) })
    // pines with snowy tips
    const pg = new THREE.ConeGeometry(1, 1, 9).translate(0, .5, 0)
    const pineA = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: 0x173826, roughness: 1 }), pines.length * 3)
    const pineS = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: 0xe3e9f4, roughness: .9 }), pines.length)
    pines.forEach(([x, z, h], i) => { for (let k = 0; k < 3; k++) { o.position.set(x, h * k * .26, z); o.rotation.set(0, 0, 0); o.scale.set(h * (.38 - k * .09), h * .5, h * (.38 - k * .09)); o.updateMatrix(); pineA.setMatrixAt(i * 3 + k, o.matrix) }
      o.position.set(x, h * .62, z); o.scale.set(h * .14, h * .3, h * .14); o.updateMatrix(); pineS.setMatrixAt(i, o.matrix) })
    // garland lights across the lane + lamp glows (one points cloud)
    const gl = []; for (let z = 30; z < 100; z += 10) { for (let i = 0; i <= 24; i++) { const u = i / 24, x = -8.6 + u * 17.2; gl.push([x, 6.2 - Math.sin(u * Math.PI) * 1.4, z, i % 3]) } }
    lamps.forEach(([x, z]) => gl.push([x, 4.3, z, 3]))
    const P = new Float32Array(gl.length * 3), C = new Float32Array(gl.length * 3), S = new Float32Array(gl.length)
    const pal = [[1, .55, .35], [1, .85, .5], [.6, .85, 1], [1, .8, .55]]
    gl.forEach(([x, y, z, c], i) => { P.set([x, y, z], i * 3); C.set(pal[c], i * 3); S[i] = c === 3 ? 3.2 : 1 })
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(P, 3)); gg.setAttribute('color', new THREE.BufferAttribute(C, 3)); gg.setAttribute('aS', new THREE.BufferAttribute(S, 1))
    const glMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { uL: { value: 0 }, uMap: { value: glow }, uScale: { value: 800 }, uTime: { value: 0 } },
      vertexShader: 'attribute float aS; uniform float uL,uScale,uTime; varying vec3 vC; varying float vA; void main(){ vC=color; vA=(.25+.75*uL)*(.85+.15*sin(uTime*2.+position.x)); vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=min(uScale*.09*aS/-mv.z, uScale*.05); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D uMap; varying vec3 vC; varying float vA; void main(){ gl_FragColor=vec4(vC*texture2D(uMap,gl_PointCoord).a*vA,1.); }' })
    const glPts = new THREE.Points(gg, glMat); glPts.frustumCulled = false
    ;[body, roof, chim, wins, doorG, wreath, post, head, pineA, pineS].forEach(m => { m.frustumCulled = false })
    return { body, roof, chim, wins, winMat, doorG, wreath, post, head, headMat, pineA, pineS, glPts, glMat, smokePts }
  }, [])

  const banner = useMemo(() => canvasTex(1024, 192, (x, w, h) => {
    x.fillStyle = '#7d1020'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8c46a'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20)
    x.fillStyle = '#ffe3ad'; x.textAlign = 'center'; x.textBaseline = 'middle'
    if (view === 'open') { x.font = '86px "Great Vibes", cursive'; x.fillText(`${from} sent you something`, w / 2, h / 2 + 6) }
    else { x.font = '84px "Great Vibes", cursive'; x.fillText(`${brand.name} · Christmas Square`, w / 2, h / 2 + 6) }
  }), [brand, view, from])
  const archCurve = useMemo(() => new THREE.QuadraticBezierCurve3(V(-4.6, 6, 21), V(0, 8.6, 21), V(4.6, 6, 21)), [])
  const archLights = useMemo(() => { const pts = archCurve.getPoints(40); const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => p.clone().add(V(0, .05, .3)))); return g }, [archCurve])
  const smoke = useRef()

  useFrame(({ size, gl }) => {
    const L = litLevel(), t = now()
    parts.winMat.color.setRGB(.35 + 1.9 * L, .27 + 1.35 * L, .17 + .62 * L)
    parts.headMat.color.setRGB(.5 + 1.8 * L, .38 + 1.3 * L, .22 + .7 * L)
    parts.glMat.uniforms.uL.value = L; parts.glMat.uniforms.uTime.value = t; parts.glMat.uniforms.uScale.value = size.height * gl.getPixelRatio()
    if (smoke.current) smoke.current.children.forEach((s, i) => { const k = ((t * .12 + i * .137) % 1); const base = parts.smokePts[i % parts.smokePts.length]
      s.position.set(base.x + Math.sin(t * .5 + i) * .4 * k, base.y + k * 5, base.z + k * .8); s.material.opacity = .22 * Math.sin(k * Math.PI); s.scale.setScalar(1 + k * 3) })
  })

  return (<group>
    {['body', 'roof', 'chim', 'wins', 'doorG', 'wreath', 'post', 'head', 'pineA', 'pineS', 'glPts'].map(k => <primitive key={k} object={parts[k]} />)}
    <group ref={smoke}>{Array.from({ length: Math.min(30, parts.smokePts.length * 3) }, (_, i) =>
      <sprite key={i}><spriteMaterial map={glow} color={0xc9d2e6} transparent opacity={.2} depthWrite={false} /></sprite>)}</group>
    {/* garland arch with the brand banner */}
    {[-4.6, 4.6].map(x => <group key={x} position={[x, 0, 21]}>
      <mesh position={[0, 3, 0]}><cylinderGeometry args={[.32, .38, 6, 16]} /><meshStandardMaterial color={0x2a4d36} roughness={.95} /></mesh>
    </group>)}
    <mesh><tubeGeometry args={[archCurve, 40, .42, 10, false]} /><meshStandardMaterial color={0x1f5a35} roughness={1} /></mesh>
    <points geometry={archLights}><pointsMaterial map={glow} color={0xffd08a} size={.7} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    <mesh position={[0, 5.15, 21.1]}><planeGeometry args={[8, 1.5]} /><meshStandardMaterial map={banner} roughness={.8} side={THREE.DoubleSide} emissive={'#ffffff'} emissiveMap={banner} emissiveIntensity={.25} /></mesh>
    <Church /><Hills /><Stalls /><Benches /><Rink /><Carousel /><Birds />
  </group>)
}

function Church() {
  const winMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x5a4630, toneMapped: false }), [])
  useFrame(() => { const L = litLevel(); winMat.color.setRGB(.35 + 1.6 * L, .27 + 1.1 * L, .17 + .55 * L) })
  return (<group position={[-16, 0, -58]} rotation={[0, .25, 0]}>
    <mesh position={[0, 4.5, 0]}><boxGeometry args={[10, 9, 18]} /><meshStandardMaterial color={0xd8cfc0} roughness={.95} /></mesh>
    <mesh position={[0, 10.5, 0]} rotation={[0, 0, 0]} scale={[10.8, 3, 18.6]}><cylinderGeometry args={[.6, .6, 1, 3]} /><meshStandardMaterial color={0xe6ecf6} roughness={.8} /></mesh>
    <mesh position={[0, 8, 10]}><boxGeometry args={[4.2, 16, 4.2]} /><meshStandardMaterial color={0xd0c6b6} roughness={.95} /></mesh>
    <mesh position={[0, 21, 10]}><coneGeometry args={[3, 10, 4]} /><meshStandardMaterial color={0x3d4a6b} roughness={.7} /></mesh>
    {[-3, 0, 3].map(z => <mesh key={z} position={[5.02, 4.5, z * 1.6]} rotation={[0, Math.PI / 2, 0]} material={winMat}><planeGeometry args={[1.2, 3.2]} /></mesh>)}
    <mesh position={[0, 12, 12.12]} material={winMat}><circleGeometry args={[.9, 24]} /></mesh>
  </group>)
}
function Hills() {
  const r = seeded(3)
  return (<group>{Array.from({ length: 14 }, (_, i) => { const a = i / 14 * 6.28 + r() * .3, R = 150 + r() * 40, s = 40 + r() * 35
    return <mesh key={i} position={[Math.cos(a) * R, -s * .6, Math.sin(a) * R]} scale={[s * 1.6, s, s * 1.2]}><sphereGeometry args={[1, 24, 12]} /><meshStandardMaterial color={0xc9d3ea} roughness={1} /></mesh> })}</group>)
}
function Stalls() {
  const canopy = useMemo(() => canvasTex(256, 64, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f3eee4' : '#b3122e'; x.fillRect(i * 32, 0, 32, 64) } }), [])
  const lightsMat = useRef()
  useFrame(() => { if (lightsMat.current) lightsMat.current.opacity = .25 + .75 * litLevel() })
  const pos = [[-10.5, 9.5, .9], [-13.5, -3.5, 1.4], [12.8, 4, -1.4]]
  const lg = useMemo(() => { const p = []; pos.forEach(([x, z, a]) => { for (let i = 0; i <= 12; i++) { const u = i / 12 - .5; p.push(V(x + Math.cos(a) * u * 3.4, 2.75 - Math.abs(Math.sin(u * 6.28)) * .12, z - Math.sin(a) * u * 3.4)) } }); return new THREE.BufferGeometry().setFromPoints(p) }, [])
  return (<group>
    {pos.map(([x, z, a], i) => <group key={i} position={[x, 0, z]} rotation={[0, a, 0]}>
      <mesh position={[0, .55, 0]}><boxGeometry args={[3.2, 1.1, 1.4]} /><meshStandardMaterial color={0x7a4a2a} roughness={.85} /></mesh>
      {[-1.5, 1.5].map(px => <mesh key={px} position={[px, 1.5, -.55]}><boxGeometry args={[.12, 3, .12]} /><meshStandardMaterial color={0x5e3b20} /></mesh>)}
      <mesh position={[0, 2.95, -.1]} rotation={[-.35, 0, 0]}><boxGeometry args={[3.6, .08, 1.9]} /><meshStandardMaterial map={canopy} roughness={.8} /></mesh>
      {[-.9, 0, .9].map(px => <mesh key={px} position={[px, 1.25, .1]}><boxGeometry args={[.5, .3, .5]} /><meshStandardMaterial color={['#e8c46a', '#a5122a', '#0e5a3c'][(px + .9) / .9 | 0]} roughness={.5} /></mesh>)}
    </group>)}
    <points geometry={lg}><pointsMaterial ref={lightsMat} map={glow} color={0xffcf86} size={.55} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></points>
  </group>)
}
function Benches() {
  return (<group>{[[-7.5, 6, .6], [7.5, 6, -.6], [-8, -5, 2.4], [8, -5, -2.4]].map(([x, z, a], i) => <group key={i} position={[x, 0, z]} rotation={[0, a, 0]}>
    <mesh position={[0, .5, 0]}><boxGeometry args={[2, .1, .5]} /><meshStandardMaterial color={0x6b4a2e} roughness={.8} /></mesh>
    <mesh position={[0, .85, -.23]}><boxGeometry args={[2, .5, .06]} /><meshStandardMaterial color={0x6b4a2e} roughness={.8} /></mesh>
    <mesh position={[0, .56, 0]}><boxGeometry args={[2, .04, .5]} /><meshStandardMaterial color={0xeef2fa} roughness={.9} /></mesh>
    {[-.85, .85].map(px => <mesh key={px} position={[px, .25, 0]}><boxGeometry args={[.08, .5, .45]} /><meshStandardMaterial color={0x1d2030} metalness={.6} roughness={.4} /></mesh>)}
  </group>)}</group>)
}
function Rink() {
  const sk = useRef(); const cols = ['#a5122a', '#1b4d8f', '#e8c46a', '#0e5a3c']
  useFrame(() => { const t = now(); sk.current?.children.forEach((g, i) => { const a = t * (.35 + i * .04) + i * 1.6, R = 2.4 + (i % 2) * 1.1; g.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); g.rotation.set(0, -a, .18) }) })
  return (<group position={[-12, 0, -8]}>
    <mesh rotation-x={-Math.PI / 2} position={[0, .03, 0]}><circleGeometry args={[4.8, 48]} /><meshStandardMaterial color={0xcfe6ff} metalness={.3} roughness={.08} envMapIntensity={1.6} /></mesh>
    <mesh rotation-x={Math.PI / 2} position={[0, .45, 0]}><torusGeometry args={[4.9, .07, 6, 64]} /><meshStandardMaterial color={0xe8e2d4} roughness={.6} /></mesh>
    <group ref={sk}>{cols.map((c, i) => <group key={i}>
      <mesh position={[0, .75, 0]}><capsuleGeometry args={[.22, .7, 4, 10]} /><meshStandardMaterial color={c} roughness={.8} /></mesh>
      <mesh position={[0, 1.42, 0]}><sphereGeometry args={[.17, 12, 8]} /><meshStandardMaterial color={0xe7c3a3} roughness={.8} /></mesh>
      <mesh position={[0, 1.58, 0]}><sphereGeometry args={[.15, 10, 6, 0, 6.3, 0, 1.4]} /><meshStandardMaterial color={['#f3eee4', '#a5122a', '#1b2d6b', '#e8c46a'][i]} roughness={.9} /></mesh>
    </group>)}</group>
  </group>)
}
function Carousel() {
  const rot = useRef(), roofTex = useMemo(() => canvasTex(512, 64, (x) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#f3eee4' : '#1b4d8f'; x.fillRect(i * 32, 0, 32, 64) } }), [])
  const lightsMat = useRef()
  useFrame(() => { const t = now(); if (rot.current) { rot.current.rotation.y = t * .35; rot.current.children.forEach((c, i) => { if (c.userData.horse) c.position.y = 1.2 + Math.sin(t * 2 + i) * .25 }) } if (lightsMat.current) lightsMat.current.opacity = .3 + .7 * litLevel() })
  const ring = useMemo(() => new THREE.BufferGeometry().setFromPoints(Array.from({ length: 36 }, (_, i) => V(Math.cos(i / 36 * 6.28) * 4.1, 3.9, Math.sin(i / 36 * 6.28) * 4.1))), [])
  return (<group position={[12.5, 0, -8]}>
    <mesh position={[0, .2, 0]}><cylinderGeometry args={[4.2, 4.3, .4, 40]} /><meshStandardMaterial color={0x7d1020} roughness={.6} /></mesh>
    <group ref={rot}>
      {Array.from({ length: 10 }, (_, i) => { const a = i / 10 * 6.28; return [
        <mesh key={'p' + i} position={[Math.cos(a) * 3.3, 2.1, Math.sin(a) * 3.3]}><cylinderGeometry args={[.05, .05, 3.6, 8]} /><meshStandardMaterial color={0xe8c46a} metalness={.9} roughness={.25} /></mesh>,
        <mesh key={'h' + i} userData={{ horse: true }} position={[Math.cos(a) * 3.3, 1.2, Math.sin(a) * 3.3]} rotation={[0, -a, 0]}><boxGeometry args={[.25, .5, 1]} /><meshStandardMaterial color={['#f3eee4', '#c9a35a', '#b3122e'][i % 3]} roughness={.5} /></mesh>] })}
      <mesh position={[0, 4.6, 0]}><coneGeometry args={[4.6, 1.8, 32, 1, true]} /><meshStandardMaterial map={roofTex} roughness={.7} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, 2.1, 0]}><cylinderGeometry args={[.5, .5, 3.6, 16]} /><meshStandardMaterial color={0xe8c46a} metalness={.6} roughness={.4} /></mesh>
    </group>
    <points geometry={ring}><pointsMaterial ref={lightsMat} map={glow} color={0xffdca0} size={.7} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></points>
  </group>)
}
function Birds() {
  const g = useRef(); const geo = useMemo(() => { const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-.5, .15, 0, 0, 0, 0, 0, 0, 0, .5, .15, 0]), 3)); return b }, [])
  useFrame(() => { const t = now(); g.current?.children.forEach((b, i) => { const a = t * .12 + i * .9, R = 34 + i * 3; b.position.set(Math.cos(a) * R, 20 + Math.sin(t + i) * 1.5 + i, Math.sin(a) * R - 10); b.rotation.y = -a; b.scale.set(1.4, 1 + Math.sin(t * 9 + i) * .8, 1.4) }) })
  return <group ref={g}>{Array.from({ length: 7 }, (_, i) => <lineSegments key={i} geometry={geo}><lineBasicMaterial color={0x10142a} /></lineSegments>)}</group>
}

export function Snow({ tier }) {
  const count = tier === 'high' ? 5000 : tier === 'mid' ? 3000 : 1200
  const { geo, mat } = useMemo(() => {
    const s = new Float32Array(count * 4); for (let i = 0; i < count; i++) s.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4)
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); g.setAttribute('aS', new THREE.BufferAttribute(s, 4))
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uMap: { value: glow }, uScale: { value: 800 }, uSpeed: { value: 1 } },
      vertexShader: `attribute vec4 aS; uniform float uTime,uScale,uSpeed; uniform vec3 uCam; varying float vA;
        void main(){ vec3 box=vec3(46.,24.,46.); vec3 p = aS.xyz*box; p.y -= uTime*(.6+aS.w*.9)*uSpeed; p.x += sin(uTime*.6+aS.w*20.)*.5;
          p = mod(p - uCam + box*.5, box) + uCam - box*.5; p.y = max(p.y, 0.);
          vec4 mv=modelViewMatrix*vec4(p,1.); vA=(.45+.55*aS.w)*smoothstep(23.,8.,length(mv.xyz)); gl_PointSize=min((1.+aS.w*2.2)*uScale*.035/-mv.z, 26.); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ gl_FragColor=vec4(1.,1.,1.,texture2D(uMap,gl_PointCoord).a*vA); }' })
    return { geo: g, mat: m }
  }, [count])
  useFrame(({ camera, size, gl }) => { const st = useStore.getState(); mat.uniforms.uTime.value = now(); mat.uniforms.uCam.value.copy(camera.position); mat.uniforms.uScale.value = size.height * gl.getPixelRatio()
    mat.uniforms.uSpeed.value = st.phase === 'crowning' || st.phase === 'greeting' ? 1.5 : 1 })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

export function Lights() {
  const a = useRef(), b = useRef(), c = useRef(), d = useRef()
  useFrame(({ scene }) => { const L = litLevel(); if (a.current) { a.current.intensity = L * 22; b.current.intensity = L * 16; c.current.intensity = L * 10; d.current.intensity = L * 14 } scene.environmentIntensity = .35 + .75 * L })
  return (<group>
    <hemisphereLight args={[0x8899dd, 0x2b2238, .75]} />
    <directionalLight color={0xc8d6ff} intensity={1.05} position={[-30, 40, 24]} />
    <pointLight ref={a} color={0xffaa55} position={[.4, 3, 1.8]} distance={14} decay={1.3} intensity={0} />
    <pointLight ref={b} color={0xffb866} position={[-.5, 6, 1.2]} distance={12} decay={1.3} intensity={0} />
    <pointLight ref={c} color={0xffa04a} position={[0, 1.6, 4.5]} distance={9} decay={1.4} intensity={0} />
    <pointLight ref={d} color={0xffb070} position={[0, 4, 30]} distance={30} decay={1.2} intensity={0} />
  </group>)
}
