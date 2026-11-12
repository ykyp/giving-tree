import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { BLOCK, DESIGN_META } from '../config'
import { ago } from '../lib/util'
import { copy as words, money } from '../../shared/copy.js'
import { ensure, setSound, chime, bells } from '../lib/audio'
import { Greeting, Meet, SealSelf, WishFor, Home, Parcels, Gave, Thanks, SelfCoda, Keepsake } from './Wishes'
import { shared } from '../three/shared'
import { crowd } from '../three/Crowd'
import { PoiLabels, Minimap, PoiCard } from './WalkHUD'
import { walkToOrnament } from '../three/Walk'

const startOwn = () => { useStore.setState(st => ({ view: 'send', myName: '', engraveTimes: [], heroHook: -1, focus: null, poi: null, cardP: null, run: st.run + 1 })); useStore.getState().setPhase('choose') }

/** The site's own mark: a small tree with a star. */
const Mark = ({ big }) => <svg className={'mark' + (big ? ' big' : '')} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l1 2.2 2.3.2-1.8 1.5.6 2.3L12 6.5 9.9 7.7l.6-2.3L8.7 3.9l2.3-.2z" fill="#f2c46d" /><path d="M12 7l5 6h-2.6l3.6 5H6l3.6-5H7z" fill="#2f7a4d" /><rect x="11" y="18" width="2" height="3.5" rx=".5" fill="#8a5a33" /></svg>
const Hand = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V5a2 2 0 0 1 4 0v6" /><path d="M13 10.5V9a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-.5a6 6 0 0 1-5-2.7L3 15a2 2 0 0 1 3.3-2.2L9 15" /></svg>
const Arrow = ({ d }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>

export default function Overlay({ brand }) {
  const s = useStore()
  const { phase, view, phaseAt } = s
  const [intro, setIntro] = useState(true), [autoBtn, setAutoBtn] = useState(false)
  useEffect(() => { if (phase === 'arrival') { setIntro(true); const t = setTimeout(() => setIntro(false), 1500); return () => clearTimeout(t) } setIntro(false) }, [phase, s.run])
  useEffect(() => { setAutoBtn(false); if (phase === 'hang') { const t = setTimeout(() => setAutoBtn(true), 8000); return () => clearTimeout(t) } }, [phase, s.run])
  // browsers only allow sound after a tap, so the Christmas bells also ring on the first one
  const rang = useRef(false)
  useEffect(() => { const ring = () => { if (rang.current || useStore.getState().clock.phase === 'advent') return; rang.current = true; ensure(); bells() }; window.addEventListener('pointerdown', ring); return () => window.removeEventListener('pointerdown', ring) }, [])

  const tapAction = { arrival: () => s.setPhase('dark'), dark: () => s.setPhase('lighting'), gift: () => { s.tryOpen(); s.setPhase('unwrap') }, crown: () => s.setPhase('crowning'), mearrive: () => s.setPhase(s.afterArrive(s)) }[phase]
  const prompt = { dark: 'Tap to light the tree', gift: s.thanksFrom ? `Tap to open ${s.from}'s thank-you` : `Tap to open ${s.from}'s gift`, crown: 'Tap the star to put it on top' }[phase]
  const onTap = () => { ensure(); tapAction?.() }

  if (s.unreachable) return (
    <div className="unreach" role="alert">
      <p className="nogl-t">The tree can’t be reached just now</p>
      <p className="sub">Please try again in a moment.</p>
      <button type="button" className="btn primary" onClick={() => s.boot()}>Try again</button>
    </div>)
  return (
    <>
      {tapAction && <button className="tap" type="button" aria-label={prompt || 'Skip'} onClick={onTap} />}
      {prompt && <div className="pill pulse" key={phase}><Hand />{prompt}</div>}
      {(phase === 'mearrive' || (phase === 'arrival' && !intro)) && <div className="skip">Tap to skip</div>}

      {phase === 'choose' && <Chooser />}
      {phase === 'engrave' && <Engrave />}
      {phase === 'hang' && <>
        <div className="pill"><Hand />{s.parent ? `Drag your ornament onto ${s.from}'s branch` : 'Drag your ornament onto a glowing hook'}</div>
        <div className="turn-hint">Drag to go round · pinch or double-tap to zoom</div>
        <div className="zoom"><button type="button" aria-label="Zoom in" onClick={() => shared.zoomBy?.(.75)}>+</button><button type="button" aria-label="Zoom out" onClick={() => shared.zoomBy?.(1.33)}>−</button></div>
        <button type="button" className="turn l" aria-label="Turn left around the tree" onClick={() => { shared.hangAz += .7 }}><Arrow d="m15 18-6-6 6-6" /></button>
        <button type="button" className="turn r" aria-label="Turn right around the tree" onClick={() => { shared.hangAz -= .7 }}><Arrow d="m9 18 6-6-6-6" /></button>
        <div className="drag-hint" aria-hidden="true" />
        {autoBtn && <button type="button" className="btn ghost auto" onClick={() => { ensure(); useStore.setState({ autoHang: true }) }}>Auto-hang it for me</button>}
      </>}
      {(phase === 'settling') && <Chip />}

      {phase === 'meet' && <Meet brand={brand} />}
      {phase === 'seal' && <SealSelf />}
      {phase === 'wishfor' && <WishFor />}
      {phase === 'greeting' && <Greeting brand={brand} />}
      {phase === 'branch' && <Home brand={brand} />}
      {phase === 'parcels' && <Parcels />}
      {phase === 'gave' && <Gave brand={brand} />}
      {phase === 'thanks' && <Thanks brand={brand} />}
      {phase === 'selfwish' && <SelfCoda />}
      {phase === 'explore' && (view === 'keepsake' ? <Keepsake brand={brand} /> : <Explore brand={brand} />)}
      <Labels />
      <Toast />
      <div className="topbar">
        {phase === 'explore' && view !== 'tree' && view !== 'keepsake' && <button type="button" className="back" aria-label="Back" onClick={() => { useStore.setState({ focus: null }); s.setPhase(view === 'me' ? s.myHome() : 'greeting') }}><Arrow d="m15 18-6-6 6-6" /></button>}
        <span className="brand"><Mark />{s.tree.name}</span>
        <button type="button" className="snd" aria-label={s.sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={s.sound} onClick={() => { useStore.setState({ sound: !s.sound }); setSound(!s.sound) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" /><path d={s.sound ? 'M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14' : 'm22 9-6 6m0-6 6 6'} /></svg></button>
      </div>
      <div className={'intro' + (intro && phase === 'arrival' ? '' : ' gone')}>
        <Mark big />
        <div className="by">{s.tree.name}</div><div className="bar"><i /></div>
      </div>
    </>
  )
}

function Chooser() {
  const sel = useStore(s => s.sel), D = DESIGN_META[sel]
  const go = d => { useStore.setState({ sel: (sel + d + 8) % 8 }); chime([1046.5], 0, .05) }
  const sx = useRef(null)
  return (
    <div className="chooser" onPointerDown={e => sx.current = e.clientX} onPointerUp={e => { if (sx.current != null && Math.abs(e.clientX - sx.current) > 50) go(e.clientX < sx.current ? 1 : -1); sx.current = null }}>
      <div className="lbl">
        <button type="button" className="arrow" aria-label="Previous ornament" onClick={() => go(-1)}><Arrow d="m15 18-6-6 6-6" /></button>
        <div className="nm2">{D.label}<small>{D.sub}</small></div>
        <button type="button" className="arrow" aria-label="Next ornament" onClick={() => go(1)}><Arrow d="m9 18 6-6-6-6" /></button>
      </div>
      <div className="dots">{DESIGN_META.map((_, i) => <i key={i} className={i === sel ? 'on' : ''} />)}</div>
      <button type="button" className="btn primary" onClick={() => { ensure(); useStore.setState({ design: sel }); useStore.getState().setPhase('engrave') }}>Choose this one</button>
    </div>
  )
}

function Engrave() {
  const myName = useStore(s => s.myName), [err, setErr] = useState(''), ref = useRef()
  useEffect(() => { const t = setTimeout(() => ref.current?.focus(), 900); return () => clearTimeout(t) }, [])
  const done = () => { const n = myName.trim(); if (!n) { setErr('Add your first name for the ornament.'); return }
    if (BLOCK.test(n)) { setErr("That name can't go on an ornament. Try your first name."); return } ref.current?.blur(); useStore.getState().setPhase('hang') }
  return (
    <form className="engrave" onSubmit={e => { e.preventDefault(); done() }}>
      <label htmlFor="nameIn">This goes on your ornament</label>
      <input id="nameIn" ref={ref} value={myName} placeholder="Your first name" maxLength={12} autoComplete="given-name" autoCapitalize="words"
        onChange={e => { setErr(''); const v = e.target.value.replace(/[^\p{L}' -]/gu, '').replace(/\s.*/, ''); useStore.getState().typeName(v); if (v.length > myName.length) chime([1568 + v.length * 40], 0, .03) }} />
      <p className="err" role="alert">{err}</p>
      <div className="btnrow">
        <button type="button" className="btn ghost" onClick={() => useStore.getState().setPhase('choose')}>Pick another</button>
        <button type="submit" className="btn primary" disabled={!myName.trim()}>Done</button>
      </div>
    </form>
  )
}

function Chip() {
  const s = useStore(), ref = useRef()
  useEffect(() => { let raf; const loop = () => { raf = requestAnimationFrame(loop); const cam = shared.camera, el = ref.current; if (!cam || !el) return
    const p = shared.heroPos.clone().add(new THREE.Vector3(0, .45, 0)).project(cam), r = el.parentElement.getBoundingClientRect()
    el.style.left = Math.max(90, Math.min(r.width - 90, (p.x * .5 + .5) * r.width)) + 'px'; el.style.top = Math.max(140, (-p.y * .5 + .5) * r.height) + 'px' }; loop(); return () => cancelAnimationFrame(raf) }, [])
  const name = s.myName
  return <div className="ochip" ref={ref}><b>{name}</b><span>your ornament is on the tree</span></div>
}

function Explore({ brand }) {
  const s = useStore(), [hint, setHint] = useState(true), [open, setOpen] = useState(false), walking = s.exploreMode === 'walk'
  useEffect(() => { setHint(true); const t = setTimeout(() => setHint(false), 6000); return () => clearTimeout(t) }, [s.exploreMode])
  const fo = s.focus == null ? null : s.focus === 'hero' ? { name: s.view === 'open' ? s.from : s.myName, design: s.design, mins: 0, you: true } : crowd.list.find(o => o.id === s.focus)
  const g = s.tree.giving, pct = g ? Math.min(100, g.given / g.cap * 100) : 0, empty = s.counts.ornaments === 0
  const rows = s.ornaments.slice(0, 8).map(o => ({ n: o.name, when: ago(Math.max(0, Math.round((Date.now() - o.at) / 60000))) }))
  return (<>
    <div className={'hint' + (hint ? '' : ' fade')}>{walking ? 'Tap to walk · drag to look · pinch to zoom · tap a sign to go there' : 'Drag to look around · pinch to zoom · tap an ornament'}</div>
    {walking && <><PoiLabels /><Minimap /></>}
    {walking && <Coach />}
    <button type="button" className="mode" onClick={() => useStore.setState({ exploreMode: walking ? 'orbit' : 'walk', poi: null, focus: null })}>{walking ? 'Tree view' : 'Walk around'}</button>
    {s.heroHook >= 0 && s.view !== 'tree' && !fo && !s.poi && <button type="button" className="btn ghost findme" onClick={() => useStore.setState({ focus: 'hero' })}>Find my ornament</button>}
    {!fo && <PoiCard brand={brand} onOwn={startOwn} bottom={s.view === 'tree' ? 108 : 16} />}
    {fo && <div className="fcard"><div className="who"><b>{fo.name}</b><span>{DESIGN_META[fo.design].label} · {fo.you ? (s.view === 'open' ? 'just now' : 'your ornament') : `hung ${ago(fo.mins)}`}</span></div>
      <button type="button" className="x" aria-label="Close" onClick={() => useStore.setState({ focus: null })}>×</button></div>}
    {s.view === 'tree' && !fo && <div className={'sheet' + (open ? '' : ' peek')}>
      <button type="button" className="grab" aria-expanded={open} onClick={() => setOpen(!open)}><span className="t1">{s.tree.name}</span><span className="t2">{empty ? 'Be the first to hang an ornament' : words.treeLine({ giving: g, counts: s.counts })} · {open ? 'tap to close' : 'tap for details'}</span></button>
      <div className="sheet-in">
        {g && <><p className="disc">{words.disclosure({ giving: g })}</p>
          <span className="chip"><span className="live" />{g.given >= g.cap ? 'Pot complete. Thank you' : g.status === 'paused' ? 'Giving is paused' : g.status === 'ended' ? 'Giving has ended' : 'Live'}</span></>}
        <div className="stats">{g
          ? <><div className="stat"><b>{money(g.given)}</b><span>GIVEN SO FAR</span></div><div className="stat"><b>{s.counts.ornaments.toLocaleString('en-GB')}</b><span>ORNAMENTS</span></div></>
          : <><div className="stat"><b>{s.counts.ornaments.toLocaleString('en-GB')}</b><span>{s.counts.ornaments === 1 ? 'ORNAMENT' : 'ORNAMENTS'}</span></div><div className="stat"><b>{s.counts.wishes.toLocaleString('en-GB')}</b><span>{s.counts.wishes === 1 ? 'WISH SHARED' : 'WISHES SHARED'}</span></div></>}</div>
        {g && <div className="pot"><div className="tr"><i style={{ width: pct.toFixed(1) + '%' }} /></div><div className="lb"><span>{Math.round(pct)}% of the {money(g.cap)} pot</span><span>{g.given >= g.cap ? 'Complete' : `${money(g.cap - g.given)} left`}</span></div></div>}
        {rows.length > 0 && <div className="list"><h4>Just hung</h4>{rows.map((r, i) => <div key={i} className="r"><span className="tt" /><div className="w">{r.n}<small>hung an ornament · {r.when}</small></div></div>)}</div>}
        <button type="button" className="btn primary" onClick={() => s.openTree(s.tree.slug, { fresh: !s.mine })}>{s.mine ? 'Go to my branch' : 'Hang an ornament'}</button>
      </div>
    </div>}
  </>)
}

function Labels() {
  const host = useRef(), pool = useRef([])
  useEffect(() => { let raf; const v = new THREE.Vector3(), toC = new THREE.Vector3()
    const loop = () => { raf = requestAnimationFrame(loop); const s = useStore.getState(), cam = shared.camera, el = host.current; if (!el || !cam) return
      const show = []
      if (s.phase === 'explore') {
        const list = shared.crowdWorld.map(o => ({ name: o.name, wp: o.wp, hook: o.hook, you: false, id: o.id }))
        if (s.heroHook >= 0 && shared.heroVisible) list.push({ name: s.view === 'open' ? s.from : s.myName, wp: shared.heroBody, hook: s.heroHook, you: true, id: 'hero' })
        const r = el.getBoundingClientRect()
        for (const o of list) { if (!o.wp || o.id === s.focus) continue; const d = o.wp.distanceTo(cam.position); if (d > 7) continue
          const h = shared.hooks[o.hook]; toC.copy(cam.position).sub(o.wp).normalize(); if (h.n.x * toC.x + h.n.z * toC.z < .05) continue
          v.copy(o.wp).project(cam); if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue
          show.push({ o, d, x: (v.x * .5 + .5) * r.width, y: (-v.y * .5 + .5) * r.height }) }
        show.sort((a, b) => a.d - b.d); show.length = Math.min(show.length, 10)
      }
      while (pool.current.length < show.length) { const d = document.createElement('div'); d.className = 'olabel'; el.appendChild(d); pool.current.push(d) }
      pool.current.forEach((d, i) => { const c = show[i]; if (!c) { d.style.opacity = 0; return }
        d.textContent = c.o.name; d.className = 'olabel' + (c.o.you ? ' you' : ''); d.style.opacity = String(Math.max(0, Math.min(1, (7 - c.d) / 2)))
        d.style.transform = `translate(${c.x}px,${c.y + 26}px) translate(-50%,0)` }) }
    loop(); return () => cancelAnimationFrame(raf) }, [])
  return <div className="labels" ref={host} />
}

function Toast() {
  const toast = useStore(s => s.toast), at = useStore(s => s.toastAt), [on, setOn] = useState(false)
  useEffect(() => { if (!toast) return; setOn(true); const t = setTimeout(() => setOn(false), 2500); return () => clearTimeout(t) }, [toast, at])
  return <div className={'toast' + (on ? ' on' : '')} role="status"><span className="tt" />{toast}</div>
}

/** First time someone walks: a pulsing hand on the snow until their first step. */
function Coach() {
  const [show, setShow] = useState(() => { try { return !localStorage.getItem('gt3-walked') } catch (e) { return true } })
  useEffect(() => { if (!show) return; let raf; const loop = () => { raf = requestAnimationFrame(loop); if (shared.walk?.target) { setShow(false); try { localStorage.setItem('gt3-walked', '1') } catch (e) {} } }; loop(); return () => cancelAnimationFrame(raf) }, [show])
  if (!show) return null
  return <div className="coach" aria-hidden="true"><span className="coach-ring" /><span className="coach-hand"><Hand /></span><span className="coach-t">Tap the snow to walk there</span></div>
}
