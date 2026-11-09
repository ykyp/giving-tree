import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBoxGeometry } from 'three-stdlib'
import { useStore } from '../store'
import { seeded, now } from '../lib/util'
import { litLevel, glow } from './shared'
import { LAYOUT, STALLS, RINK, CAROUSEL, POSTBOX, CHURCH, SNOWMEN, SLEIGH, SQUARE_R } from './village'

const V = (x, y, z) => new THREE.Vector3(x, y, z)
const canvasTex = (w, h, draw, repeat) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) } return t }
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
    <sprite position={[-175, 150, -120]} scale={[50, 50, 1]}><spriteMaterial map={moon} fog={false} depthWrite={false} transparent /></sprite>
  </group>)
}

/* ---------- ground: deep snow, drifts away from the paths, trodden snow on the cobbles ---------- */
function valueNoise(seed) {
  const r = seeded(seed), N = 256, g = new Float32Array(N * N); for (let i = 0; i < g.length; i++) g[i] = r()
  const at = (x, y) => g[((y & 255) * N) + (x & 255)]
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    return (at(xi, yi) * (1 - u) + at(xi + 1, yi) * u) * (1 - v) + (at(xi, yi + 1) * (1 - u) + at(xi + 1, yi + 1) * u) * v }
  return (x, y) => n(x, y) * .55 + n(x * 2.1, y * 2.1) * .28 + n(x * 4.3, y * 4.3) * .17
}
// distance (m) from a point to the nearest walkable path/square edge (0 inside)
function edgeDist(x, z) {
  const dSq = Math.hypot(x, z) - SQUARE_R
  const dLane = z > 12 && z < 104 ? Math.abs(x) - 4.4 : 99, dBack = z < -18 && z > -60 ? Math.abs(x) - 4.4 : 99
  return Math.max(0, Math.min(dSq, dLane, dBack))
}
// glints: a hashed cell pattern in world space that only lights up at the right viewing angle
function sparkle(mat, density = .9925, strength = 2.2) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed,1.)).xyz;')
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
      { vec2 c = floor(vWP.xz*34.); float h = h21(c);
        if (h > ${density.toFixed(4)}) { vec2 f = fract(vWP.xz*34.)-.5; float d = 1.-smoothstep(.0,.22,length(f));
          vec3 vd = normalize(cameraPosition - vWP); float ph = h21(c+7.1)*6.283;
          float tw = pow(max(0., sin(dot(vd, vec3(cos(ph),.6,sin(ph)))*22.)), 8.);
          float fade = 1.-smoothstep(6.,26.,length(cameraPosition-vWP));
          gl_FragColor.rgb += vec3(.95,.97,1.)*d*tw*fade*${strength.toFixed(2)}; } }`)
  }
  mat.customProgramCacheKey = () => 'sparkle' + density
  return mat
}
/** Tileable value noise: lattice of period P cells, sampled in lattice units (wraps seamlessly every P). */
function tileNoise(seed, P) {
  const r = seeded(seed), g = new Float32Array(P * P); for (let i = 0; i < g.length; i++) g[i] = r()
  const at = (x, y) => g[(((y % P) + P) % P) * P + (((x % P) + P) % P)]
  return (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    return (at(xi, yi) * (1 - u) + at(xi + 1, yi) * u) * (1 - v) + (at(xi, yi + 1) * (1 - u) + at(xi + 1, yi + 1) * u) * v }
}
/** Seamless height field (S×S) from several octaves + per-pixel grain. */
function heightField(S, seed, octs, grain) {
  const ns = octs.map(([P], k) => tileNoise(seed + k * 31, P)), h = new Float32Array(S * S), r = seeded(seed + 99)
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { let v = 0; octs.forEach(([P, a], k) => { v += ns[k](i * P / S, j * P / S) * a }); h[j * S + i] = v + (r() - .5) * grain }
  return h
}
/** Normal map texture from a height field (wrapping Sobel). */
function normalTex(h, S, strength, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data
  const H = (i, j) => h[((j + S) % S) * S + ((i + S) % S)]
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const dx = (H(i + 1, j) - H(i - 1, j)) * strength, dy = (H(i, j + 1) - H(i, j - 1)) * strength, l = Math.hypot(dx, dy, 1), k = (j * S + i) * 4
    d[k] = (-dx / l * .5 + .5) * 255; d[k + 1] = (dy / l * .5 + .5) * 255; d[k + 2] = (1 / l * .5 + .5) * 255; d[k + 3] = 255 }
  x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 16; return t
}
/** Colour texture from a height field: snow is near-white; dips go a little bluer, crests a little warmer. */
function snowColTex(h, S, base, depth, repeat, extra) {
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data
  let lo = 1e9, hi = -1e9; for (const v of h) { lo = Math.min(lo, v); hi = Math.max(hi, v) }
  for (let k = 0; k < S * S; k++) { const t = (h[k] - lo) / (hi - lo), sh = 1 - depth * (1 - t)
    d[k * 4] = base[0] * sh * (1 - .025 * (1 - t)); d[k * 4 + 1] = base[1] * sh; d[k * 4 + 2] = Math.min(255, base[2] * (sh + .02 * (1 - t))); d[k * 4 + 3] = 255 }
  x.putImageData(img, 0, 0); if (extra) extra(x, S)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 16; return t
}
export function Ground() {
  const { snowMat, geo, trod, trodN } = useMemo(() => {
    const nz = valueNoise(13)
    // deep snow: wind-smoothed undulation (large) + crystalline grain (fine), carried mostly by the normal map
    const S = 512
    const macro = heightField(S, 5, [[3, .6], [6, .3], [12, .1]], 0)
    const fine = heightField(S, 11, [[16, .45], [32, .3], [64, .15]], .22)
    const col = snowColTex(macro, S, [240, 244, 251], .07, [12, 12])
    const nrm = normalTex(fine, S, 2.2, [150, 150])
    const snowMat = sparkle(new THREE.MeshStandardMaterial({ map: col, normalMap: nrm, normalScale: new THREE.Vector2(.55, .55), roughness: .86, envMapIntensity: .3, color: 0xffffff }), .993, 1.8)
    // displaced terrain: flat where you walk, rising into soft drifts beyond
    const geo = new THREE.PlaneGeometry(420, 420, 230, 230); geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i) + 20, e = edgeDist(x, z), ramp = Math.min(1, e / 6)
      let h = ramp * ramp * (.25 + .55 * nz(x / 9 + 30, z / 9 + 30))
      if (e > 30) h += Math.min(1, (e - 30) / 40) * nz(x / 30, z / 30) * 3.5
      pos.setY(i, h - .02); pos.setZ(i, z) }
    geo.computeVertexNormals()
    // packed snow on the paths: same white, a touch greyer, compressed into footprint trails (no bare cobbles)
    const ph = heightField(S, 23, [[4, .5], [8, .3], [24, .2]], .12)
    const fr = seeded(41)
    for (let n = 0; n < 70; n++) { let px = fr() * S, py = fr() * S; const a = fr() * 6.28
      for (let k = 0; k < 8; k++) { const fx = px + Math.cos(a) * k * 26 + Math.cos(a + 1.57) * (k % 2 ? 7 : -7), fy = py + Math.sin(a) * k * 26 + Math.sin(a + 1.57) * (k % 2 ? 7 : -7)
        for (let dj = -10; dj <= 10; dj++) for (let di = -10; di <= 10; di++) { const lx = di * Math.cos(-a) - dj * Math.sin(-a), ly = di * Math.sin(-a) + dj * Math.cos(-a), q = (lx / 9) ** 2 + (ly / 4.5) ** 2
          if (q < 1) { const ix = (((Math.round(fx) + di) % S) + S) % S, iy = (((Math.round(fy) + dj) % S) + S) % S; ph[iy * S + ix] -= .22 * (1 - q) } } } }
    const trod = snowColTex(ph, S, [226, 231, 241], .12, [1, 1])
    const trodN = normalTex(ph, S, 3, [1, 1])
    return { snowMat, geo, trod, trodN }
  }, [])
  // one material per surface so each gets a texture repeat matching its real size (≈5 m per tile)
  const trodMat = useMemo(() => { const mk = (rx, rz) => { const t = trod.clone(), n = trodN.clone(); t.needsUpdate = n.needsUpdate = true; t.repeat.set(rx, rz); n.repeat.set(rx, rz)
      return sparkle(new THREE.MeshStandardMaterial({ map: t, normalMap: n, normalScale: new THREE.Vector2(.6, .6), roughness: .7, metalness: 0, envMapIntensity: .4 }), .996, 1.4) }
    return { sq: mk(9, 9), lane: mk(8.4 / 5.3, 92 / 5.3), back: mk(8.4 / 5.3, 42 / 5.3) } }, [trod, trodN])
  const edgeRing = useMemo(() => { const g = new THREE.RingGeometry(SQUARE_R - 1.4, SQUARE_R + .4, 96, 1); g.rotateX(-Math.PI / 2); return g }, [])
  return (<group>
    <mesh geometry={geo} material={snowMat} />
    <mesh rotation-x={-Math.PI / 2} position={[0, .01, 0]} material={trodMat.sq}><circleGeometry args={[SQUARE_R - .2, 96]} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .012, 58]} material={trodMat.lane}><planeGeometry args={[8.4, 92]} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .012, -39]} material={trodMat.back}><planeGeometry args={[8.4, 42]} /></mesh>
    <mesh geometry={edgeRing} position={[0, .03, 0]} material={snowMat} />
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
    const winTex = canvasTex(128, 160, (x, w, h) => {
      const g = x.createRadialGradient(w / 2, h * .62, 6, w / 2, h * .55, h * .7); g.addColorStop(0, '#fff2cf'); g.addColorStop(.55, '#ffc978'); g.addColorStop(1, '#b8692e'); x.fillStyle = g; x.fillRect(0, 0, w, h)
      x.fillStyle = 'rgba(160,40,40,.55)'; x.beginPath(); x.moveTo(10, 10); x.quadraticCurveTo(34, 70, 22, h - 14); x.lineTo(10, h - 14); x.fill(); x.beginPath(); x.moveTo(w - 10, 10); x.quadraticCurveTo(w - 34, 70, w - 22, h - 14); x.lineTo(w - 10, h - 14); x.fill()
      x.fillStyle = 'rgba(60,30,10,.25)'; x.fillRect(w * .3, h * .7, w * .4, h * .2)
      x.fillStyle = '#2b1e14'; x.fillRect(0, 0, w, 10); x.fillRect(0, 0, 10, h); x.fillRect(w - 10, 0, 10, h); x.fillRect(0, h - 16, w, 16); x.fillRect(w / 2 - 4, 0, 8, h); x.fillRect(0, h * .45, w, 7)
      x.fillStyle = '#eef3fb'; x.beginPath(); x.ellipse(w / 2, h - 15, w * .55, 7, 0, Math.PI, 0); x.fill() })
    const winMat = new THREE.MeshBasicMaterial({ map: winTex, color: 0x5a4630, toneMapped: false })
    const wins = new THREE.InstancedMesh(new THREE.PlaneGeometry(.9, 1.2), winMat, n * 8)
    const stone = new THREE.MeshStandardMaterial({ color: 0x6d6a72, roughness: .95 })
    const chimCap = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stone, n)
    const plinth = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), stone, n)
    const step = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, .2, .7), stone, n)
    const porch = new THREE.InstancedMesh(new THREE.CylinderGeometry(.62, .62, 1, 3, 1).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe6ecf6, roughness: .8 }), n)
    const porchUnder = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: .9 }), n)
    const lantern = new THREE.InstancedMesh(new THREE.BoxGeometry(.18, .26, .18), undefined, n)
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
      const dx = ((Math.floor(cols / 2) + .5) / cols - .5) * h.w
      o.position.set(dx, 1.1, h.d / 2 + .04); o.updateMatrix(); doorG.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
      o.position.set(cx, h.h + 1.95, -h.d * .15); o.scale.set(.9, .14, .9); o.updateMatrix(); chimCap.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
      o.position.set(0, 0, 0); o.scale.set(h.w + .08, .55, h.d + .08); o.updateMatrix(); plinth.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
      o.position.set(dx, .1, h.d / 2 + .38); o.scale.set(1, 1, 1); o.updateMatrix(); step.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
      o.position.set(dx, 2.62, h.d / 2 + .42); o.scale.set(2, .55, .9); o.updateMatrix(); porch.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
      o.position.set(dx, 2.45, h.d / 2 + .42); o.scale.set(1.9, .1, .85); o.updateMatrix(); porchUnder.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
      o.position.set(dx + .95, 1.95, h.d / 2 + .14); o.scale.set(1, 1, 1); o.updateMatrix(); lantern.setMatrixAt(i, m4.multiplyMatrices(base, o.matrix))
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
    lantern.material = headMat
    ;[body, roof, chim, wins, doorG, wreath, post, head, pineA, pineS, icicles, piles, chimCap, plinth, step, porch, porchUnder, lantern].forEach(m => { m.frustumCulled = false })
    return { body, roof, chim, wins, winMat, doorG, wreath, post, head, headMat, pineA, pineS, glPts, glMat, smokePts, icicles, piles, chimCap, plinth, step, porch, porchUnder, lantern }
  }, [])

  const [fontsIn, setFontsIn] = useState(0)
  useEffect(() => { document.fonts?.load('112px "Great Vibes"').then(() => setFontsIn(1)).catch(() => {}) }, [])
  const banner = useMemo(() => canvasTex(1024, 192, (x, w, h) => {
    x.fillStyle = '#7d1020'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8c46a'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 20)
    x.fillStyle = '#ffe3ad'; x.textAlign = 'center'; x.textBaseline = 'middle'
    x.font = '112px "Great Vibes", cursive'; x.fillText('Merry Christmas', w / 2, h / 2 + 8)
  }), [fontsIn])
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
    {['body', 'roof', 'chim', 'wins', 'doorG', 'wreath', 'post', 'head', 'pineA', 'pineS', 'glPts', 'icicles', 'piles', 'chimCap', 'plinth', 'step', 'porch', 'porchUnder', 'lantern'].map(k => <primitive key={k} object={parts[k]} />)}
    <group ref={smoke}>{Array.from({ length: Math.min(30, parts.smokePts.length * 3) }, (_, i) =>
      <sprite key={i}><spriteMaterial map={glow} color={0xc9d2e6} transparent opacity={.2} depthWrite={false} /></sprite>)}</group>
    {/* garland arch with the brand banner */}
    {[-4.6, 4.6].map(x => <group key={x} position={[x, 0, 21]}>
      <mesh position={[0, 3, 0]}><cylinderGeometry args={[.32, .38, 6, 16]} /><meshStandardMaterial color={0x2a4d36} roughness={.95} /></mesh>
    </group>)}
    <mesh><tubeGeometry args={[archCurve, 40, .42, 10, false]} /><meshStandardMaterial color={0x1f5a35} roughness={1} /></mesh>
    <points geometry={archLights}><pointsMaterial map={glow} color={0xffd08a} size={.7} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></points>
    <mesh position={[0, 5.3, 21.1]}><planeGeometry args={[6.4, 1.2]} /><meshStandardMaterial map={banner} roughness={.8} side={THREE.DoubleSide} emissive={'#ffffff'} emissiveMap={banner} emissiveIntensity={.25} /></mesh>
    <Church /><Hills /><Stalls /><Benches /><Rink /><Carousel /><Birds />
    <Snowmen /><CandyCanes /><Fence /><Postbox /><Sleigh /><SquareLights /><BackArch /><LightPools /><Mist />
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
  useFrame(({ scene }) => { const L = litLevel(); if (a.current) { a.current.intensity = L * 9; b.current.intensity = L * 7; c.current.intensity = L * 6; d.current.intensity = L * 14 } scene.environmentIntensity = .35 + .75 * L })
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
  const { geo, mat, wire } = useMemo(() => {
    const pts = [], col = [], pal = [[1, .8, .45], [1, .5, .35], [.55, .85, 1], [.6, 1, .6]]
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2 + .1, A = V(Math.cos(a) * .3, 12.8, Math.sin(a) * .3), B = V(Math.cos(a) * 19.2, 3.4, Math.sin(a) * 19.2)
      for (let i = 1; i < 34; i++) { const u = i / 34; const p = A.clone().lerp(B, u); p.y -= Math.sin(u * Math.PI) * 2.2; if (Math.hypot(p.x, p.z) < Math.max(0, 5 * (1 - (p.y - .9) / 12.6))) continue; pts.push(p); col.push(...pal[(i + k) % 4]) } }
    const g = new THREE.BufferGeometry().setFromPoints(pts); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3))
    const m = new THREE.PointsMaterial({ map: glow, size: .3, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })
    const wp = []; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2 + .1, A = V(Math.cos(a) * .3, 12.8, Math.sin(a) * .3), B = V(Math.cos(a) * 19.2, 3.4, Math.sin(a) * 19.2)
      let prev = null; for (let i = 0; i <= 34; i++) { const u = i / 34, p = A.clone().lerp(B, u); p.y -= Math.sin(u * Math.PI) * 2.2; if (Math.hypot(p.x, p.z) < Math.max(0, 5 * (1 - (p.y - .9) / 12.6))) { prev = null; continue } if (prev) wp.push(prev, p); prev = p } }
    const wire = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wp), new THREE.LineBasicMaterial({ color: 0x141a22, transparent: true, opacity: .7 }))
    return { geo: g, mat: m, wire }
  }, [])
  useFrame(() => { mat.opacity = litLevel() * (.85 + Math.sin(now() * 2) * .1) })
  return <group><points geometry={geo} material={mat} frustumCulled={false} /><primitive object={wire} /></group>
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

/* Warm pools of light on the snow under lamps, at doors, by the stalls and round the tree (additive decals). */
function LightPools() {
  const { mesh, mat } = useMemo(() => {
    const tex = canvasTex(128, 128, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,190,110,.9)'); g.addColorStop(.35, 'rgba(255,170,90,.38)'); g.addColorStop(1, 'rgba(255,150,70,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w) })
    const spots = [[0, 0, 13]]
    LAYOUT.lamps.forEach(([x, z]) => spots.push([x, z, 6.5]))
    LAYOUT.houses.forEach(h => { const fx = Math.sin(h.face), fz = Math.cos(h.face); spots.push([h.x + fx * (h.d / 2 + 1.6), h.z + fz * (h.d / 2 + 1.6), 4.2]) })
    STALLS.forEach(s => spots.push([s.x + Math.sin(s.a) * 1.6, s.z + Math.cos(s.a) * 1.6, 6]))
    spots.push([CAROUSEL.x, CAROUSEL.z, 12])
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 })
    const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, spots.length)
    const m = new THREE.Matrix4(); spots.forEach(([x, z, s], i) => mesh.setMatrixAt(i, m.compose(V(x, .06, z), new THREE.Quaternion(), V(s, 1, s)))); mesh.frustumCulled = false
    return { mesh, mat }
  }, [])
  useFrame(() => { mat.opacity = .22 + .5 * litLevel() })
  return <primitive object={mesh} />
}

/* Low drifting mist at the edges of the village: soft billboards hugging the snow, kept out of the square's centre. */
function Mist() {
  const { group, mats } = useMemo(() => {
    const tex = canvasTex(256, 128, (x, w, h) => { x.translate(w / 2, h / 2); x.scale(1, .45); const g = x.createRadialGradient(0, 0, 2, 0, 0, w * .46); g.addColorStop(0, 'rgba(210,220,245,.5)'); g.addColorStop(.6, 'rgba(210,220,245,.18)'); g.addColorStop(1, 'rgba(210,220,245,0)'); x.fillStyle = g; x.fillRect(-w, -h * 2, w * 2, h * 4) })
    const r = seeded(77), group = new THREE.Group(), mats = []
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, R = 21 + r() * 9; let x = Math.cos(a) * R, z = Math.sin(a) * R
      if (i > 19) { x = (r() - .5) * 7; z = 30 + r() * 60 }
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, fog: true })
      const sp = new THREE.Sprite(m); const sc = 10 + r() * 10; sp.scale.set(sc, sc * .32, 1); sp.position.set(x, sc * .1, z); sp.userData = { x, z, ph: r() * 6.28, sp: .15 + r() * .2 }
      group.add(sp); mats.push(m)
    }
    return { group, mats }
  }, [])
  useFrame(() => { const t = now(); group.children.forEach(s => { const u = s.userData; s.position.x = u.x + Math.sin(t * u.sp + u.ph) * 1.6; s.material.opacity = .32 + Math.sin(t * u.sp * 1.3 + u.ph) * .12 }) })
  return <primitive object={group} />
}
