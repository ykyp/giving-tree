import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { copy as words } from '../../shared/copy.js'
import { ensure } from '../lib/audio'
import { shared } from '../three/shared'
import { crowd } from '../three/Crowd'
import { POIS, STALLS, LAYOUT, SQUARE_R, LANE, BACK, RINK, CAROUSEL, CHURCH } from '../three/village'
import { walkTo, walkToPoi } from '../three/Walk'

const ICON = { tree: '🎄', post: '✉️', larkfield: '☕', fernfield: '🌿', mulled: '🍷', rink: '⛸️', carousel: '🎠', church: '⛪', arch: '↩' }

/** Floating signs over places you can walk to. Tap one to go there. */
export function PoiLabels() {
  const host = useRef(), els = useRef({})
  useEffect(() => { let raf; const v = new THREE.Vector3()
    const loop = () => { raf = requestAnimationFrame(loop); const cam = shared.camera, el = host.current, w = shared.walk; if (!cam || !el) return
      const r = el.getBoundingClientRect(), cur = useStore.getState().poi
      for (const p of POIS) { const d = els.current[p.id]; if (!d) continue
        v.set(...p.at); const dist = w ? Math.hypot(w.pos.x - p.at[0], w.pos.z - p.at[2]) : 30; v.project(cam)
        // hidden behind the tree? (segment camera→label passes the trunk)
        let behind = false; if (p.id !== 'tree') { const ax = cam.position.x, az = cam.position.z, bx = p.at[0] - ax, bz = p.at[2] - az, L2 = bx * bx + bz * bz, u = Math.max(0, Math.min(1, -(ax * bx + az * bz) / L2)); behind = u > 0 && u < 1 && Math.hypot(ax + bx * u, az + bz * u) < 4.2 }
        const show = !behind && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && dist > 2.5 && dist < 75 && cur !== p.id
        d.style.opacity = show ? String(Math.min(1, (75 - dist) / 20)) : '0'; d.style.pointerEvents = show ? 'auto' : 'none'
        if (show) { const sc = Math.max(.74, Math.min(1, 14 / dist + .55)); d.style.transform = `translate(${(v.x * .5 + .5) * r.width}px,${Math.max(112, (-v.y * .5 + .5) * r.height)}px) translate(-50%,-100%) scale(${sc})`
          const m = d.querySelector('.poi-d'); const txt = `${Math.round(dist)} m`; if (m.textContent !== txt) m.textContent = txt } } }
    loop(); return () => cancelAnimationFrame(raf) }, [])
  return <div className="poi-layer" ref={host}>{POIS.map(p =>
    <button key={p.id} type="button" className="poi" ref={el => els.current[p.id] = el} onClick={() => { ensure(); walkToPoi(p.id) }}><span className="poi-i" aria-hidden="true">{ICON[p.id]}</span><span className="poi-t"><b>{p.label}</b><span className="poi-d" /></span></button>)}</div>
}

/** North-up minimap centred on you. Tap it to walk to that spot. */
export function Minimap() {
  const g = useRef(), me = useRef(), R = 42, S = 52 // metres shown in radius, px radius
  useEffect(() => { let raf; const loop = () => { raf = requestAnimationFrame(loop); const w = shared.walk; if (!w || !g.current) return
    g.current.setAttribute('transform', `translate(${-w.pos.x * S / R} ${-w.pos.z * S / R})`); me.current.setAttribute('transform', `rotate(${-w.yaw * 180 / Math.PI})`) }
    loop(); return () => cancelAnimationFrame(raf) }, [])
  const m = v => v * S / R
  const onTap = e => { const b = e.currentTarget.getBoundingClientRect(), w = shared.walk; const x = (e.clientX - b.left - b.width / 2) * R / S + w.pos.x, z = (e.clientY - b.top - b.height / 2) * R / S + w.pos.z; ensure(); walkTo(x, z) }
  return (
    <svg className="minimap" viewBox={`${-S} ${-S} ${S * 2} ${S * 2}`} onClick={onTap} role="img" aria-label="Map of the village. Tap to walk there.">
      <defs><clipPath id="mmclip"><circle r={S - 1} /></clipPath></defs>
      <circle r={S} className="mm-bg" />
      <g clipPath="url(#mmclip)"><g ref={g}>
        <circle r={m(SQUARE_R)} className="mm-walk" />
        <rect x={m(-LANE.x)} y={m(LANE.z0 - 6)} width={m(LANE.x * 2)} height={m(LANE.z1 - LANE.z0 + 6)} className="mm-walk" />
        <rect x={m(-BACK.x)} y={m(BACK.z0)} width={m(BACK.x * 2)} height={m(BACK.z1 - BACK.z0 + 6)} className="mm-walk" />
        {LAYOUT.houses.map((h, i) => <rect key={i} x={m(h.x - h.w / 2)} y={m(h.z - h.d / 2)} width={m(h.w)} height={m(h.d)} transform={`rotate(${-h.face * 180 / Math.PI} ${m(h.x)} ${m(h.z)})`} className="mm-house" />)}
        <circle cx={m(RINK.x)} cy={m(RINK.z)} r={m(RINK.r)} className="mm-ice" />
        <circle cx={m(CAROUSEL.x)} cy={m(CAROUSEL.z)} r={m(CAROUSEL.r)} className="mm-thing" />
        <rect x={m(CHURCH.x - 5)} y={m(CHURCH.z - 9)} width={m(10)} height={m(18)} className="mm-house" />
        {STALLS.map(s => <circle key={s.id} cx={m(s.x)} cy={m(s.z)} r={2.6} className="mm-stall" />)}
        <circle r={m(2.6)} className="mm-tree" />
      </g></g>
      <g ref={me}><path d="M0 -7 L5 5 L0 2.5 L-5 5 Z" className="mm-me" /></g>
      <circle r={S - .5} className="mm-ring" />
    </svg>
  )
}

/** What you read when you arrive somewhere. */
export function PoiCard({ brand, onOwn, bottom }) {
  const poi = useStore(s => s.poi), heroHook = useStore(s => s.heroHook), tree = useStore(s => s.tree), counts = useStore(s => s.counts)
  if (!poi) return null
  const close = () => useStore.setState({ poi: null })
  const stall = STALLS.find(s => s.id === poi)
  let title, text, action = null
  if (poi === 'tree') { title = tree.name; text = counts.ornaments ? `${counts.ornaments.toLocaleString('en-GB')} ${counts.ornaments === 1 ? 'ornament' : 'ornaments'}, each one hung by someone. ${words.treeLine({ giving: tree.giving, counts })}.` : 'No ornaments yet. Be the first to hang one.'
    action = heroHook < 0 ? ['Hang your own ornament', onOwn] : ['Look closer', () => useStore.setState({ exploreMode: 'orbit', poi: null })] }
  else if (poi === 'post') { title = 'Letters to Santa'; text = 'Hang an ornament and the people you invite can leave you a wish for Christmas morning.'; if (heroHook < 0) action = ['Hang an ornament', onOwn] }
  else if (stall) { title = stall.name; text = `${stall.sell}. Warm hands, cold noses.` }
  else if (poi === 'rink') { title = 'Skating rink'; text = 'Round and round under the lights. Mind the corners.' }
  else if (poi === 'carousel') { title = 'The carousel'; text = 'Painted horses, brass poles and a waltz on repeat.' }
  else if (poi === 'church') { title = 'St Nicholas Church'; text = 'Carols by candlelight on Christmas Eve, 6pm. The bells ring at midnight.' }
  else if (poi === 'arch') { title = 'The lane'; text = 'The way you came in, lit all the way to the edge of the village.' }
  return (
    <div className="poicard" style={{ bottom }} role="dialog" aria-label={title}>
      <div className="pc-t"><b>{title}</b><button type="button" className="x" aria-label="Close" onClick={close}>×</button></div>
      <p>{text}</p>
      {action && <button type="button" className="btn primary" disabled={!action[1]} onClick={action[1] || undefined}>{action[0]}</button>}
    </div>
  )
}
