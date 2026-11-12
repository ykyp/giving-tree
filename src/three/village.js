import { seeded } from '../lib/util'
import { CRATE } from '../config'

/* Village layout (metres). Square centred on the tree; the lane runs south (+z) to the arch;
 * a back path runs north (−z) to the church. Everything here is deterministic so the scene,
 * the walking colliders and the minimap always agree. */
export const HOUSE_COLS = ['#efe2c8', '#c76f4f', '#9db7a0', '#7b93b3', '#ddb45a', '#cf9393', '#f2ece2', '#b2c2d2']
export const SQUARE_R = 24, LANE = { x: 4.4, z0: 18, z1: 104 }, BACK = { x: 4.4, z0: -60, z1: -20 }

function buildLayout() {
  const r = seeded(21), houses = [], lamps = [], pines = []
  for (const side of [-1, 1]) for (let z = 26; z < 104;) { const w = 6 + r() * 2.5
    houses.push({ x: side * (9 + r() * .6), z: z + w / 2, w, d: 7, h: 4.5 + r() * 3.5, face: side < 0 ? Math.PI / 2 : -Math.PI / 2, c: HOUSE_COLS[Math.floor(r() * HOUSE_COLS.length)] }); z += w + .6 }
  for (let i = 0; i < 18; i++) { const a = Math.PI / 2 + 0.42 + (i / 17) * (Math.PI * 2 - 0.84), R = 28 + r() * 2.5, w = 7 + r() * 2.5, h = 5 + r() * 4, c = HOUSE_COLS[Math.floor(r() * HOUSE_COLS.length)]
    if (Math.abs(a - Math.PI * 1.5) < 0.24) continue // gap for the back path
    houses.push({ x: Math.cos(a) * R, z: Math.sin(a) * R, w, d: 7, h, face: Math.atan2(-Math.cos(a), -Math.sin(a)), c }) }
  for (const side of [-1, 1]) for (let z = -26; z > -58; z -= 7.5) { const w = 5.5 + r() * 1.5; houses.push({ x: side * 9.5, z, w, d: 6.5, h: 4 + r() * 2.5, face: side < 0 ? Math.PI / 2 : -Math.PI / 2, c: HOUSE_COLS[Math.floor(r() * HOUSE_COLS.length)] }) }
  for (let z = 26; z < 104; z += 12) for (const s of [-1, 1]) lamps.push([s * 4.8, z])
  for (let z = -26; z > -58; z -= 12) for (const s of [-1, 1]) lamps.push([s * 4.8, z])
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; if (Math.sin(a) > 0.3) continue; lamps.push([Math.cos(a) * 15.5, Math.sin(a) * 15.5]) }
  for (let i = 0; i < 240; i++) { const a = r() * 6.28, R = 40 + r() * 75, x = Math.cos(a) * R, z = Math.sin(a) * R
    if (Math.abs(x) < 18 && z > 10) continue; if (Math.abs(x) < 16 && z < -18 && z > -80) continue; pines.push([x, z, 4 + r() * 6]) }
  return { houses, lamps, pines }
}
export const LAYOUT = buildLayout()

export const STALLS = [
  { id: 'larkfield', x: -10.5, z: 9.5, a: 2.3, brand: null, name: 'Hot chocolate', sell: 'Hot chocolate & coffee', sign: '#e0703f' },
  { id: 'fernfield', x: -14, z: -3, a: 1.4, brand: null, name: 'Wreaths & gifts', sell: 'Wreaths & handmade gifts', sign: '#2f6b4f' },
  { id: 'mulled', x: 13.4, z: 4.2, a: -1.88, brand: null, name: 'Mulled wine', sell: 'Spiced apple & mulled wine', sign: '#7d1020' },
]
export const RINK = { x: -12, z: -9, r: 4.8 }, CAROUSEL = { x: 12.5, z: -9, r: 4.3 }, POSTBOX = { x: 6, z: 12.5 }
export const CHURCH = { x: 0, z: -68 }
export const SNOWMEN = [[7.5, 8.5], [-5.5, -15], [2.8, 44], [-3, -42]]
export const SLEIGH = { x: 3, z: -50, a: -.5 }

const stallFront = s => [Math.sin(s.a), Math.cos(s.a)]
/** Points of interest: tap a label (or the thing) to walk there; arriving opens its card. */
export const POIS = [
  { id: 'tree', label: 'The Giving Tree', at: [0, 15.4, 0], stand: [0, 14], look: [0, 7.4, 0] },
  { id: 'post', label: 'Letters to Santa', at: [POSTBOX.x, 2.3, POSTBOX.z], stand: [POSTBOX.x - 1.1, POSTBOX.z - 2.4], look: [POSTBOX.x, 1.1, POSTBOX.z] },
  ...STALLS.map(s => { const [fx, fz] = stallFront(s); return { id: s.id, label: s.name, at: [s.x, 3.7, s.z], stand: [s.x + fx * 3.6, s.z + fz * 3.6], look: [s.x, 1.4, s.z] } }),
  { id: 'rink', label: 'Skating rink', at: [RINK.x, 2.6, RINK.z], stand: [RINK.x + 6.4, RINK.z + 3.2], look: [RINK.x, .8, RINK.z] },
  { id: 'carousel', label: 'Carousel', at: [CAROUSEL.x, 6.3, CAROUSEL.z], stand: [CAROUSEL.x - 6.2, CAROUSEL.z + 3.4], look: [CAROUSEL.x, 2.4, CAROUSEL.z] },
  { id: 'church', label: 'St Nicholas Church', at: [CHURCH.x, 26, CHURCH.z + 10], stand: [0, -44], look: [0, 6, CHURCH.z + 10] },
  { id: 'arch', label: 'The lane', at: [0, 9.2, 21], stand: [0, 26], look: [0, 4, 60] },
]

/* ---------- walking: where you can stand ---------- */
export function walkable(x, z) {
  if (Math.hypot(x, z) < SQUARE_R) return true
  if (Math.abs(x) < LANE.x && z > LANE.z0 - 6 && z < LANE.z1) return true
  if (Math.abs(x) < BACK.x && z < -SQUARE_R + 6 && z > BACK.z0) return true
  return false
}
const CIRCLES = [
  [0, 0, 4.6], [RINK.x, RINK.z, RINK.r + .35], [CAROUSEL.x, CAROUSEL.z, CAROUSEL.r + .45], [POSTBOX.x, POSTBOX.z, .7], [CRATE[0], CRATE[2], 1.2],
  ...STALLS.map(s => [s.x, s.z, 2.1]), ...LAYOUT.lamps.map(([x, z]) => [x, z, .35]), [-4.6, 21, .7], [4.6, 21, .7],
  ...SNOWMEN.map(([x, z]) => [x, z, .9]), [SLEIGH.x, SLEIGH.z, 1.8],
  [-7.5, 6, 1.1], [7.5, 6, 1.1], [-8, -5, 1.1], [8, -5, 1.1],
]
const BOXES = LAYOUT.houses.map(h => ({ x: h.x, z: h.z, hw: h.w / 2 + .5, hd: h.d / 2 + .5, c: Math.cos(h.face), s: Math.sin(h.face) }))
  .concat([{ x: CHURCH.x, z: CHURCH.z, hw: 5.6, hd: 9.6, c: 1, s: 0 }, { x: CHURCH.x, z: CHURCH.z + 10, hw: 2.6, hd: 2.6, c: 1, s: 0 }])
/** Push a point out of every collider. Returns true if it moved. */
export function collide(p) {
  let moved = false
  for (const [cx, cz, r] of CIRCLES) { const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz); if (d < r && d > 1e-4) { p.x = cx + dx / d * r; p.z = cz + dz / d * r; moved = true } }
  for (const b of BOXES) {
    const dx = p.x - b.x, dz = p.z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c
    if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd) {
      let nx = lx, nz = lz; if (b.hw - Math.abs(lx) < b.hd - Math.abs(lz)) nx = Math.sign(lx || 1) * b.hw; else nz = Math.sign(lz || 1) * b.hd
      p.x = b.x + nx * b.c + nz * b.s; p.z = b.z - nx * b.s + nz * b.c; moved = true
    }
  }
  return moved
}
/** Clamp a tapped point to the furthest walkable point on the straight line from `from`. */
export function clampTarget(from, to) {
  if (walkable(to.x, to.z)) return to
  let lo = 0, hi = 1
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; walkable(from.x + (to.x - from.x) * m, from.z + (to.z - from.z) * m) ? lo = m : hi = m }
  return { x: from.x + (to.x - from.x) * lo, z: from.z + (to.z - from.z) * lo }
}
