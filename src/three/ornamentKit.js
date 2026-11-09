import * as THREE from 'three'
import { amt, seeded } from '../lib/util'

/* ---------- name surfaces ----------
 * Every engraved ornament has a band UV. Names are painted onto a canvas in the design's style:
 * crowd ornaments share one 2048² atlas (128 cells of 256×128); the hero ornament gets its own 1024×512 canvas
 * so letters can appear one by one while the person types.
 */
export const SCRIPT = '"Great Vibes", "Snell Roundhand", "Brush Script MT", cursive'
export const HAND = 'Caveat, "Comic Sans MS", cursive'
export const TAG_DESIGNS = new Set([3, 4, 5])
export const BAND_DESIGNS = new Set([0, 1, 2, 6, 7])

function letters(x, txt, cx, cy, fill, size, font, opt) {
  x.font = `${opt?.weight || ''} ${size}px ${font}`
  x.textAlign = 'left'; x.textBaseline = 'middle'
  const w = x.measureText(txt).width; let px = cx - w / 2
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i], cw = x.measureText(ch).width
    const a = (opt?.times ? Math.max(0, Math.min(1, (opt.t - (opt.times[i] ?? -9)) / 0.35)) : 1) * (opt?.ghost ? .32 : 1)
    if (a > 0) {
      x.globalAlpha = a
      if (opt?.shadow !== false) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillText(ch, px + 1, cy + 1.5) }
      x.fillStyle = fill; x.fillText(ch, px, cy)
      if (opt?.times && a < 1) { x.globalAlpha = (1 - a) * 0.9; x.fillStyle = '#fff8dc'; x.beginPath(); x.arc(px + cw / 2, cy, size * 0.35 * (1 - a) + 2, 0, 7); x.fill() }
    }
    px += cw
  }
  x.globalAlpha = 1
}

/** Paint one ornament surface. Cell is 256k × 128k at (x0,y0). */
export function paintSurface(x, x0, y0, k, design, color, name, opt = {}) {
  const W = 256 * k, H = 128 * k, s = v => v * k
  x.save(); x.beginPath(); x.rect(x0, y0, W, H); x.clip(); x.clearRect(x0, y0, W, H)
  const nm = (name || '').slice(0, 11), big = nm.length > 7
  const two = (cy, fill, size, font = SCRIPT) => { for (const cx of [x0 + s(64), x0 + s(192)]) letters(x, nm, cx, cy, fill, size, font, opt) }
  if (design === 0) { // glass bauble
    x.fillStyle = color; x.fillRect(x0, y0, W, H)
    x.fillStyle = '#e9c66c'; x.fillRect(x0, y0 + s(40), W, s(2.5)); x.fillRect(x0, y0 + s(86), W, s(2.5))
    for (let i = 0; i < 16; i++) { x.beginPath(); x.arc(x0 + s(8 + i * 16), y0 + s(24), s(1.6), 0, 7); x.arc(x0 + s(8 + i * 16), y0 + s(104), s(1.6), 0, 7); x.fill() }
    two(y0 + s(64), '#f6dc92', s(big ? 28 : 34))
  } else if (design === 1) { // candy stripe
    x.fillStyle = '#f3efe6'; x.fillRect(x0, y0, W, H); x.save(); x.translate(x0, y0); x.rotate(-0.5); x.fillStyle = color
    for (let i = -10; i < 20; i++) x.fillRect(s(i * 22), s(-80), s(10), s(320)); x.restore()
    x.fillStyle = '#f6f2ea'; x.fillRect(x0, y0 + s(44), W, s(40)); x.fillStyle = color; x.fillRect(x0, y0 + s(44), W, s(2)); x.fillRect(x0, y0 + s(82), W, s(2))
    two(y0 + s(64), color, s(big ? 26 : 32))
  } else if (design === 2 || design === 6) { // ribbed finial / frosted icicle
    const ice = design === 6
    x.fillStyle = ice ? '#dfeaf6' : color; x.fillRect(x0, y0, W, H)
    x.fillStyle = ice ? 'rgba(120,150,190,.18)' : 'rgba(0,0,0,.18)'; for (let i = 0; i < 16; i++) x.fillRect(x0 + s(i * 16), y0, s(5), H)
    x.fillStyle = 'rgba(255,255,255,.16)'; for (let i = 0; i < 16; i++) x.fillRect(x0 + s(i * 16 + 8), y0, s(2), H)
    const cy = ice ? 34 : 52
    x.fillStyle = ice ? '#eef5fc' : color; x.fillRect(x0, y0 + s(cy - 18), W, s(36)); x.fillStyle = ice ? '#b7c8dc' : '#e9c66c'; x.fillRect(x0, y0 + s(cy - 18), W, s(2)); x.fillRect(x0, y0 + s(cy + 16), W, s(2))
    two(y0 + s(cy), ice ? '#5a7290' : '#f6dc92', s(big ? 22 : 28))
  } else if (design === 7) { // brand bauble: mark at u=.25, name at u=.75
    x.fillStyle = opt.brandAccent || color; x.fillRect(x0, y0, W, H)
    x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(x0 + s(64), y0 + s(64), s(30), 0, 7); x.fill()
    if (opt.brandMono) { x.fillStyle = opt.brandAccent || color; x.font = `italic ${s(44)}px "Instrument Serif", Georgia, serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(opt.brandMono, x0 + s(64), y0 + s(68)) }
    else { const cols = ['#ff4f8b', '#f2c46d', '#5fb08f', '#1b2350']; for (let i = 0; i < 4; i++) { x.fillStyle = cols[i]; x.fillRect(x0 + s(48 + (i % 2) * 17), y0 + s(48 + (i >> 1) * 17), s(15), s(15)) } }
    letters(x, nm, x0 + s(192), y0 + s(64), '#ffffff', s(big ? 28 : 34), SCRIPT, opt)
  } else { // kraft gift tag, hole at top centre
    const L = x0 + s(8), T = y0 + s(6), R = x0 + s(248), B = y0 + s(122), c = s(22)
    x.beginPath(); x.moveTo(L + c, T); x.lineTo(R - c, T); x.lineTo(R, T + c); x.lineTo(R, B - s(6)); x.quadraticCurveTo(R, B, R - s(6), B); x.lineTo(L + s(6), B); x.quadraticCurveTo(L, B, L, B - s(6)); x.lineTo(L, T + c); x.closePath()
    const g = x.createLinearGradient(L, T, R, B); g.addColorStop(0, '#ead1a6'); g.addColorStop(1, '#cba978'); x.fillStyle = g; x.fill()
    x.strokeStyle = 'rgba(90,60,25,.35)'; x.lineWidth = s(2); x.stroke()
    x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(x0 + s(128), y0 + s(20), s(7), 0, 7); x.fill(); x.globalCompositeOperation = 'source-over'
    x.strokeStyle = '#b8891c'; x.lineWidth = s(2.5); x.beginPath(); x.arc(x0 + s(128), y0 + s(20), s(9.5), 0, 7); x.stroke()
    letters(x, nm, x0 + s(128), y0 + s(64), '#43280f', s(big ? 40 : 50), HAND, { ...opt, shadow: false, weight: '600' })
    x.font = `600 ${s(21)}px ${HAND}`; x.fillStyle = '#6b4a22'; x.textAlign = 'center'; x.fillText(`gave ${amt(opt.per ?? 10)}`, x0 + s(128), y0 + s(101))
  }
  x.restore()
}

/* ---------- crowd atlas ---------- */
export const ATLAS = document.createElement('canvas'); ATLAS.width = ATLAS.height = 2048
const AX = ATLAS.getContext('2d')
export const atlasTex = new THREE.CanvasTexture(ATLAS); atlasTex.colorSpace = THREE.SRGBColorSpace; atlasTex.anisotropy = 8
export const cellUV = i => { const col = i % 8, row = i >> 3; return [(col * 256 + 4) / 2048, 1 - (row * 128 + 124) / 2048, 248 / 2048, 120 / 2048] }
export function drawCell(i, design, color, name, opt) { const col = i % 8, row = i >> 3; paintSurface(AX, col * 256, row * 128, 1, design, color, name, opt); atlasTex.needsUpdate = true }
export function atlasify(mat) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aCell;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = vMapUv * aCell.zw + aCell.xy;\n#endif')
  }
  mat.customProgramCacheKey = () => 'atlas'
  return mat
}

/* ---------- geometry (hook at y=0, body hangs below) ---------- */
function doubleSided(geo) {
  const pos = geo.attributes.position.array, nor = geo.attributes.normal.array, uv = geo.attributes.uv.array, idx = geo.index.array, n = pos.length / 3
  const P = new Float32Array(pos.length * 2), N = new Float32Array(nor.length * 2), UV = new Float32Array(uv.length * 2)
  P.set(pos); P.set(pos, pos.length); N.set(nor); for (let i = 0; i < nor.length; i++) N[nor.length + i] = -nor[i]
  UV.set(uv); for (let i = 0; i < n; i++) { UV[uv.length + i * 2] = 1 - uv[i * 2]; UV[uv.length + i * 2 + 1] = uv[i * 2 + 1] }
  const I = []; for (let i = 0; i < idx.length; i += 3) I.push(idx[i], idx[i + 1], idx[i + 2], idx[i] + n, idx[i + 2] + n, idx[i + 1] + n)
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(UV, 2)); g.setIndex(I); return g
}
const lathe = pts => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 36)
const sphereGeo = new THREE.SphereGeometry(0.2, 40, 28)
const finialGeo = lathe([[0, -0.53], [0.018, -0.46], [0.05, -0.35], [0.1, -0.19], [0.15, -0.06], [0.168, 0.02], [0.154, 0.1], [0.1, 0.16], [0.054, 0.19], [0.043, 0.22]])
const icicleGeo = lathe([[0, -0.78], [0.012, -0.68], [0.03, -0.5], [0.055, -0.28], [0.08, -0.08], [0.09, 0.02], [0.08, 0.1], [0.05, 0.15], [0.038, 0.18]])
export const mosaicGeo = new THREE.IcosahedronGeometry(0.19, 2)
const flakeGeo = (() => { const s = new THREE.Shape(); for (let i = 0; i < 24; i++) { const a = Math.PI / 2 + i * Math.PI / 12, r = [0.24, 0.085, 0.145, 0.085][i % 4]; const px = Math.cos(a) * r, py = Math.sin(a) * r; i ? s.lineTo(px, py) : s.moveTo(px, py) } s.closePath()
  const h = new THREE.Path(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const px = Math.cos(a) * .035, py = Math.sin(a) * .035; i ? h.lineTo(px, py) : h.moveTo(px, py) } h.closePath(); s.holes.push(h)
  const g = new THREE.ExtrudeGeometry(s, { depth: .024, bevelEnabled: true, bevelThickness: .01, bevelSize: .007, bevelSegments: 2 }); g.center(); return g })()
const starGeo = (() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.09 : 0.23; const px = Math.cos(a) * r, py = Math.sin(a) * r; i ? s.lineTo(px, py) : s.moveTo(px, py) } s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: true, bevelThickness: .02, bevelSize: .016, bevelSegments: 3 }); g.center(); return g })()
export const tagGeo = doubleSided(new THREE.PlaneGeometry(0.2, 0.1).translate(0, -0.05 + 0.0156, 0))
export const capGeo = new THREE.CylinderGeometry(0.036, 0.04, 0.055, 16).translate(0, -0.0275, 0)
export const loopGeo = new THREE.TorusGeometry(0.017, 0.005, 6, 14).translate(0, 0.007, 0)
export const capMat = new THREE.MeshStandardMaterial({ color: 0xd8b45c, metalness: 1, roughness: .28, envMapIntensity: 1.4 })

export function mosaicColors(accent) {
  const g = mosaicGeo, n = g.attributes.position.count, c = new Float32Array(n * 3), cc = new THREE.Color(), r = seeded(17)
  const choices = ['#e6e9f0', '#e6e9f0', '#cfd4de', accent, '#e0b84f', '#7fc4a4', '#f6f7fb']
  for (let f = 0; f < n / 3; f++) { cc.set(choices[Math.floor(r() * choices.length)]); for (let k = 0; k < 3; k++) c.set([cc.r, cc.g, cc.b], (f * 3 + k) * 3) }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3))
}
mosaicColors('#ff4f8b')

const phys = o => new THREE.MeshPhysicalMaterial(o)
/** front: rotation.y that shows the name to a camera on +z. tagX: where the paper tag hangs. */
export const DESIGNS = [
  { geo: sphereGeo, top: 0.2 + 0.055, atlas: true, front: 0, mat: () => phys({ metalness: .72, roughness: .1, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.8 }) },
  { geo: sphereGeo, top: 0.2 + 0.055, atlas: true, front: 0, mat: () => phys({ metalness: 0, roughness: .3, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.3 }) },
  { geo: finialGeo, top: 0.22 + 0.055, atlas: true, front: -Math.PI / 2, mat: () => phys({ metalness: .9, roughness: .17, envMapIntensity: 2 }) },
  { geo: mosaicGeo, top: 0.19 + 0.055, atlas: false, tagX: 0.25, front: -0.25, mat: () => phys({ vertexColors: true, metalness: 1, roughness: .06, flatShading: true, envMapIntensity: 2.4 }) },
  { geo: starGeo, top: 0.23 + 0.04, atlas: false, tagX: 0.25, front: -0.25, mat: () => phys({ color: 0xe2b04a, metalness: 1, roughness: .24, envMapIntensity: 2 }) },
  { geo: flakeGeo, top: 0.24 + 0.04, atlas: false, tagX: 0.26, front: -0.25, mat: () => phys({ color: 0xf5f7ff, metalness: .1, roughness: .22, iridescence: 1, iridescenceIOR: 1.35, sheen: .7, sheenColor: new THREE.Color(0xbfd8ff), envMapIntensity: 1.6 }) },
  { geo: icicleGeo, top: 0.18 + 0.055, atlas: true, front: -Math.PI / 2, mat: () => phys({ metalness: 0, roughness: .14, clearcoat: 1, transparent: true, opacity: .9, envMapIntensity: 2.2 }) },
  { geo: sphereGeo, top: 0.2 + 0.055, atlas: true, front: Math.PI, mat: () => phys({ metalness: .35, roughness: .22, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.5 }) },
]
export const crowdMats = DESIGNS.map(d => { const m = d.mat(); if (d.atlas) { m.map = atlasTex; atlasify(m) } return m })
export const tagMatAtlas = atlasify(new THREE.MeshStandardMaterial({ map: atlasTex, alphaTest: .5, roughness: .85, envMapIntensity: .4 }))
export const designColor = (di, pal, accent) => di === 7 ? accent : pal[[0, 3, 4, 0, 0, 0, 0, 0][di]] || pal[0]
