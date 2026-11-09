import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBoxGeometry } from 'three-stdlib'
import { useStore } from '../store'
import { seeded, now } from '../lib/util'
import { litLevel, glow } from './shared'
import { LAYOUT, STALLS, RINK, CAROUSEL, POSTBOX, CHURCH, SNOWMEN, SLEIGH, SQUARE_R } from './village'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const canvasTex = (w, h, draw, repeat) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) } return t }
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
    <mesh rotation-x={-Math.PI / 2} position={[0, .012, -40]}><planeGeometry args={[10, 44]} /><meshStandardMaterial map={cobble} color={0xb9bfcf} roughness={.75} envMapIntensity={.35} /></mesh>
  </group>)
}

export function Village({ brand }) {
  const view = useStore(s => s.view), from = useStore(s => s.from)
  const parts = useMemo(() => {
    const { houses, lamps, pines } = LAYOUT, r = seeded(33), n = houses.length, o = new THREE.Object3D(), m4 = new THREE.Matrix4()
    // timber-framed walls: the texture is white plaster + dark beams, tinted per house by instance colour
    const timber = canvasTex(256, 256, (x, w) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, w); const g = x.createLinearGradient(0, 0, 0, w); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(60,40,20,.12)'); x.fillStyle = g; x.fillRect(0, 0, w, w)
      x.fillStyle = '#4a3322'; const b = 9; x.fillRect(0, 0, w, b); x.fillRect(0, w - b, w, b); x.fillRect(0, 0, b, w); x.fillRect(w - b, 0, b, w); x.fillRect(0, w * .47, w, b * .8)
      for (const px of [.25, .75]) x.fillRect(px * w - b / 2, 0, b, w)
      x.lineWidth = b * .8; x.strokeStyle = '#4a3322'; x.beginPath(); x.moveTo(0, w * .47); x.lineTo(w * .25, 0); x.moveTo(w, w * .47); x.lineTo(w * .75, 0); x.moveTo(w * .25, w); x.lineTo(0, w * .5); x.moveTo(w * .75, w); x.lineTo(w, w * .5); x.stroke() })
    const body = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, .04).translate(0, .5, 0), new THREE.MeshStandardMaterial({ map: timber, roughness: .9, envMapIntensity: .25 }), n)
    const icicles = new THREE.InstancedMesh(new THREE.ConeGeometry(.045, 1, 5).rotateX(Math.PI).translate(0, -.5, 0), new THREE.MeshStandardMaterial({ color: 0xd8ecff, roughness: .1, metalness: .1, transparent: true, opacity: .85, envMapIntensity: 2 }), n * 16)
    const piles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xeef3fb, roughness: .9 }), n * 2)
    const eave = []; let ic = 0
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
      o.position.y = 1.6; o.position.z = h.d / 2 + .14; o.scale.set(1, 1, 1); o.updateMatrix(); wreath.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
      // fairy lights along the eave, icicles below them, snow banked by the walls
      for (let k = 0; k <= 14; k++) { const ex = (-.5 + k / 14) * h.w * 1.06; eave.push([...V(ex, h.h - .02 + Math.sin(k / 14 * Math.PI) * -.06, h.d * .57).applyMatrix4(base).toArray(), 4 + (i + k) % 3]) }
      for (let k = 0; k < 15 && ic < n * 16; k++) { if (r() < .25) continue; const len = .18 + r() * .5; o.position.set((-.5 + (k + .5) / 15) * h.w, h.h - .08, h.d * .56); o.scale.set(1, len, 1); o.updateMatrix(); icicles.setMatrixAt(ic++, m4.multiplyMatrices(base, o.matrix)) }
      for (const sx of [-1, 1]) { o.position.set(sx * h.w * .38, .05, h.d / 2 + .35); o.scale.set(1 + r() * .8, .35 + r() * .2, .6); o.updateMatrix(); piles.setMatrixAt(i * 2 + (sx > 0 ? 1 : 0), m4.multiplyMatrices(base, o.matrix)) }
    })
    wins.count = wi; icicles.count = ic
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
    lamps.forEach(([x, z]) => gl.push([x, 4.3, z, 3])); eave.forEach(e => gl.push(e))
    const P = new Float32Array(gl.length * 3), C = new Float32Array(gl.length * 3), S = new Float32Array(gl.length)
    const pal = [[1, .55, .35], [1, .85, .5], [.6, .85, 1], [1, .8, .55], [1, .35, .3], [.45, 1, .55], [1, .82, .45]]
    gl.forEach(([x, y, z, c], i) => { P.set([x, y, z], i * 3); C.set(pal[c], i * 3); S[i] = c === 3 ? 3.2 : 1 })
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(P, 3)); gg.setAttribute('color', new THREE.BufferAttribute(C, 3)); gg.setAttribute('aS', new THREE.BufferAttribute(S, 1))
    const glMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { uL: { value: 0 }, uMap: { value: glow }, uScale: { value: 800 }, uTime: { value: 0 } },
      vertexShader: 'attribute float aS; uniform float uL,uScale,uTime; varying vec3 vC; varying float vA; void main(){ vC=color; vA=(.25+.75*uL)*(.85+.15*sin(uTime*2.+position.x)); vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=min(uScale*.09*aS/-mv.z, uScale*.05); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D uMap; varying vec3 vC; varying float vA; void main(){ gl_FragColor=vec4(vC*texture2D(uMap,gl_PointCoord).a*vA,1.); }' })
    const glPts = new THREE.Points(gg, glMat); glPts.frustumCulled = false
    ;[body, roof, chim, wins, doorG, wreath, post, head, pineA, pineS, icicles, piles].forEach(m => { m.frustumCulled = false })
    return { body, roof, chim, wins, winMat, doorG, wreath, post, head, headMat, pineA, pineS, glPts, glMat, smokePts, icicles, piles }
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
    {['body', 'roof', 'chim', 'wins', 'doorG', 'wreath', 'post', 'head', 'pineA', 'pineS', 'glPts', 'icicles', 'piles'].map(k => <primitive key={k} object={parts[k]} />)}
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
    <Snowmen /><CandyCanes /><Fence /><Postbox /><Sleigh /><SquareLights /><BackArch />
  </group>)
}

function Church() {
  const winMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x5a4630, toneMapped: false }), [])
  useFrame(() => { const L = litLevel(); winMat.color.setRGB(.35 + 1.6 * L, .27 + 1.1 * L, .17 + .55 * L) })
  return (<group position={[CHURCH.x, 0, CHURCH.z]}>
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
  const pos = STALLS.map(s => [s.x, s.z, s.a])
  const signs = useMemo(() => STALLS.map(s => canvasTex(512, 128, (x, w, h) => { x.fillStyle = s.sign; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8c46a'; x.lineWidth = 6; x.strokeRect(6, 6, w - 12, h - 12)
    x.fillStyle = '#fff6e0'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '600 56px "Instrument Serif", Georgia, serif'; x.fillText(s.name, w / 2, h / 2 + 4) })), [])
  const lg = useMemo(() => { const p = []; pos.forEach(([x, z, a]) => { for (let i = 0; i <= 12; i++) { const u = i / 12 - .5; p.push(V(x + Math.cos(a) * u * 3.4, 2.75 - Math.abs(Math.sin(u * 6.28)) * .12, z - Math.sin(a) * u * 3.4)) } }); return new THREE.BufferGeometry().setFromPoints(p) }, [])
  return (<group>
    {pos.map(([x, z, a], i) => <group key={i} position={[x, 0, z]} rotation={[0, a, 0]}>
      <mesh position={[0, .55, 0]}><boxGeometry args={[3.2, 1.1, 1.4]} /><meshStandardMaterial color={0x7a4a2a} roughness={.85} /></mesh>
      {[-1.5, 1.5].map(px => <mesh key={px} position={[px, 1.5, -.55]}><boxGeometry args={[.12, 3, .12]} /><meshStandardMaterial color={0x5e3b20} /></mesh>)}
      <mesh position={[0, 2.95, -.1]} rotation={[-.35, 0, 0]}><boxGeometry args={[3.6, .08, 1.9]} /><meshStandardMaterial map={canopy} roughness={.8} /></mesh>
      <mesh position={[0, 3.35, .62]} rotation={[-.12, 0, 0]}><planeGeometry args={[2.8, .7]} /><meshStandardMaterial map={signs[i]} emissive="#ffffff" emissiveMap={signs[i]} emissiveIntensity={.35} roughness={.8} /></mesh>
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
  return (<group position={[RINK.x, 0, RINK.z]}>
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
  return (<group position={[CAROUSEL.x, 0, CAROUSEL.z]}>
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

/* ---------- Christmas village props ---------- */
function Snowmen() {
  const snow = { color: 0xf3f6fb, roughness: .85 }
  return (<group>{SNOWMEN.map(([x, z], i) => <group key={i} position={[x, 0, z]} rotation={[0, Math.atan2(-x, -z), 0]}>
    <mesh position={[0, .55, 0]}><sphereGeometry args={[.62, 20, 14]} /><meshStandardMaterial {...snow} /></mesh>
    <mesh position={[0, 1.38, 0]}><sphereGeometry args={[.44, 20, 14]} /><meshStandardMaterial {...snow} /></mesh>
    <mesh position={[0, 2, 0]}><sphereGeometry args={[.32, 20, 14]} /><meshStandardMaterial {...snow} /></mesh>
    <mesh position={[0, 2, .38]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[.06, .34, 10]} /><meshStandardMaterial color={0xe8742c} roughness={.6} /></mesh>
    {[-.11, .11].map(ex => <mesh key={ex} position={[ex, 2.1, .28]}><sphereGeometry args={[.035, 8, 6]} /><meshStandardMaterial color={0x111111} /></mesh>)}
    {[0, 1, 2].map(k => <mesh key={k} position={[0, 1.55 - k * .17, .42 - k * .015]}><sphereGeometry args={[.04, 8, 6]} /><meshStandardMaterial color={0x111111} /></mesh>)}
    <mesh position={[0, 2.38, 0]}><cylinderGeometry args={[.22, .22, .32, 18]} /><meshStandardMaterial color={0x1a1a24} roughness={.6} /></mesh>
    <mesh position={[0, 2.23, 0]}><cylinderGeometry args={[.36, .36, .04, 22]} /><meshStandardMaterial color={0x1a1a24} roughness={.6} /></mesh>
    <mesh position={[0, 1.72, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.3, .07, 8, 20]} /><meshStandardMaterial color={['#a5122a', '#1b4d8f', '#0e5a3c', '#e8c46a'][i]} roughness={.9} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * .62, 1.5, 0]} rotation={[0, 0, s * -.9]}><cylinderGeometry args={[.025, .035, .7, 5]} /><meshStandardMaterial color={0x4a3020} /></mesh>)}
  </group>)}</group>)
}
function CandyCanes() {
  const { stick, hook, tex } = useMemo(() => {
    const tex = canvasTex(64, 256, (x, w, h) => { x.fillStyle = '#f5f1ea'; x.fillRect(0, 0, w, h); x.fillStyle = '#c3122f'; for (let i = -4; i < 20; i++) { x.save(); x.translate(0, i * 22); x.transform(1, -.6, 0, 1, 0, 0); x.fillRect(0, 0, w, 10); x.restore() } }, [1, 3])
    const spots = []
    for (let z = 22; z < 102; z += 6) for (const s of [-1, 1]) spots.push([s * 4.25, z])
    for (let z = -24; z > -58; z -= 6) for (const s of [-1, 1]) spots.push([s * 4.25, z])
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; if (Math.abs(Math.cos(a)) < .2) continue; spots.push([Math.cos(a) * 19, Math.sin(a) * 19]) }
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .35, clearcoat: 1 })
    const stick = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .07, 1.3, 10).translate(0, .65, 0), mat, spots.length)
    const hook = new THREE.InstancedMesh(new THREE.TorusGeometry(.18, .07, 8, 14, Math.PI), mat, spots.length)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion()
    spots.forEach(([x, z], i) => { const a = Math.atan2(x, z); stick.setMatrixAt(i, m.makeTranslation(x, 0, z))
      q.setFromEuler(new THREE.Euler(0, a + Math.PI / 2, 0)); m.compose(V(x, 1.3, z), q, V(1, 1, 1)); m.multiply(new THREE.Matrix4().makeTranslation(-.18, 0, 0)); hook.setMatrixAt(i, m) })
    return { stick, hook, tex }
  }, [])
  return <group><primitive object={stick} /><primitive object={hook} /></group>
}
function Fence() {
  const parts = useMemo(() => {
    const R = 19.6, pts = []
    for (let i = 0; i < 520; i++) { const a = i / 520 * Math.PI * 2; if (Math.abs(a - Math.PI / 2) < .27 || Math.abs(a - Math.PI * 1.5) < .25) continue; pts.push(a) }
    const wood = new THREE.MeshStandardMaterial({ color: 0x6e4a2c, roughness: .9 }), snow = new THREE.MeshStandardMaterial({ color: 0xf0f4fb, roughness: .9 })
    const pick = new THREE.InstancedMesh(new THREE.BoxGeometry(.09, 1, .05).translate(0, .5, 0), wood, pts.length)
    const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 6, 4), snow, pts.length)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion()
    pts.forEach((a, i) => { q.setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, 0)); m.compose(V(Math.cos(a) * R, 0, Math.sin(a) * R), q, V(1, .9 + (i % 2) * .12, 1)); pick.setMatrixAt(i, m)
      caps.setMatrixAt(i, new THREE.Matrix4().compose(V(Math.cos(a) * R, 1.05 + (i % 2) * .1, Math.sin(a) * R), q, V(1, .55, 1))) })
    return { pick, caps, wood, snow }
  }, [])
  const rail = (y, a0, a1) => <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, a0]}><torusGeometry args={[19.6, .04, 4, 120, a1 - a0]} /><meshStandardMaterial color={0x6e4a2c} roughness={.9} /></mesh>
  // two arcs: east side and west side (openings at the lane and the back path)
  return (<group><primitive object={parts.pick} /><primitive object={parts.caps} />
    {[.35, .8].map(y => <group key={y}>{rail(y, -Math.PI / 2 + .25, Math.PI / 2 - .27)}{rail(y, Math.PI / 2 + .27, Math.PI * 1.5 - .25)}</group>)}</group>)
}
function Postbox() {
  const sign = useMemo(() => canvasTex(512, 160, (x, w, h) => { x.fillStyle = '#f3ead6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#a5122a'; x.lineWidth = 8; x.strokeRect(8, 8, w - 16, h - 16)
    x.fillStyle = '#a5122a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '78px "Great Vibes", cursive'; x.fillText('Letters to Santa', w / 2, h / 2 + 6) }), [])
  const red = { color: 0xb3122e, roughness: .35, metalness: .2, envMapIntensity: 1.2 }
  return (<group position={[POSTBOX.x, 0, POSTBOX.z]} rotation={[0, Math.atan2(-POSTBOX.x, -POSTBOX.z), 0]}>
    <mesh position={[0, .08, 0]}><cylinderGeometry args={[.42, .46, .16, 24]} /><meshStandardMaterial color={0x1a1a24} /></mesh>
    <mesh position={[0, .85, 0]}><cylinderGeometry args={[.36, .38, 1.4, 24]} /><meshStandardMaterial {...red} /></mesh>
    <mesh position={[0, 1.55, 0]}><sphereGeometry args={[.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial {...red} /></mesh>
    <mesh position={[0, 1.22, .36]}><boxGeometry args={[.36, .05, .04]} /><meshStandardMaterial color={0x111111} /></mesh>
    <mesh position={[0, 2.25, 0]}><planeGeometry args={[1.4, .44]} /><meshStandardMaterial map={sign} side={THREE.DoubleSide} roughness={.8} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={.3} /></mesh>
    <mesh position={[0, 1.95, -.02]}><boxGeometry args={[.05, .6, .05]} /><meshStandardMaterial color={0x1a1a24} /></mesh>
    <mesh position={[0, 1.96, 0]}><sphereGeometry args={[.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3]} /><meshStandardMaterial color={0xf0f4fb} roughness={.9} /></mesh>
  </group>)
}
function Sleigh() {
  const red = { color: 0xa5122a, roughness: .35, clearcoat: 1, envMapIntensity: 1.2 }, gold = { color: 0xd8b45c, metalness: 1, roughness: .3 }
  return (<group position={[SLEIGH.x, 0, SLEIGH.z]} rotation={[0, SLEIGH.a, 0]}>
    <mesh position={[0, .8, 0]}><boxGeometry args={[1.5, .7, 2.4]} /><meshPhysicalMaterial {...red} /></mesh>
    <mesh position={[0, 1.2, -1.05]}><boxGeometry args={[1.5, 1, .3]} /><meshPhysicalMaterial {...red} /></mesh>
    <mesh position={[0, 1.1, 1.2]} rotation={[.6, 0, 0]}><boxGeometry args={[1.5, .5, .2]} /><meshPhysicalMaterial {...red} /></mesh>
    {[-.7, .7].map(x => <mesh key={x} position={[x, .38, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[1.25, .05, 6, 30, Math.PI * .75]} /><meshStandardMaterial {...gold} /></mesh>)}
    {[[-.35, .3, '#0e5a3c'], [.35, .1, '#1b4d8f'], [0, -.5, '#e8c46a']].map(([x, z, c], i) => <mesh key={i} position={[x, 1.35, z]} rotation={[0, i, 0]}><boxGeometry args={[.5, .45, .5]} /><meshStandardMaterial color={c} roughness={.45} /></mesh>)}
    <mesh position={[0, 1.18, .2]}><boxGeometry args={[1.45, .06, 1.6]} /><meshStandardMaterial color={0xf0f4fb} roughness={.9} /></mesh>
  </group>)
}
function SquareLights() {
  // strings of lights from the tree's top out to the edge of the square, like a maypole canopy
  const { geo, mat } = useMemo(() => {
    const pts = [], col = [], pal = [[1, .8, .45], [1, .5, .35], [.55, .85, 1], [.6, 1, .6]]
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2 + .1, A = V(Math.cos(a) * .3, 8.6, Math.sin(a) * .3), B = V(Math.cos(a) * 19.2, 3.4, Math.sin(a) * 19.2)
      for (let i = 1; i < 34; i++) { const u = i / 34; const p = A.clone().lerp(B, u); p.y -= Math.sin(u * Math.PI) * 1.6; if (Math.hypot(p.x, p.z) < 3.3 - u) continue; pts.push(p); col.push(...pal[(i + k) % 4]) } }
    const g = new THREE.BufferGeometry().setFromPoints(pts); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3))
    const m = new THREE.PointsMaterial({ map: glow, size: .55, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })
    return { geo: g, mat: m }
  }, [])
  useFrame(() => { mat.opacity = litLevel() * (.85 + Math.sin(now() * 2) * .1) })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}
function BackArch() {
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(V(-4.4, 4.6, -22), V(0, 6.8, -22), V(4.4, 4.6, -22)), [])
  const lights = useMemo(() => new THREE.BufferGeometry().setFromPoints(curve.getPoints(28).map(p => p.clone().add(V(0, .05, .25)))), [curve])
  return (<group>
    {[-4.4, 4.4].map(x => <mesh key={x} position={[x, 2.3, -22]}><cylinderGeometry args={[.26, .3, 4.6, 12]} /><meshStandardMaterial color={0x2a4d36} roughness={.95} /></mesh>)}
    <mesh><tubeGeometry args={[curve, 30, .32, 8, false]} /><meshStandardMaterial color={0x1f5a35} roughness={1} /></mesh>
    <points geometry={lights}><pointsMaterial map={glow} color={0xffd08a} size={.6} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></points>
  </group>)
}
