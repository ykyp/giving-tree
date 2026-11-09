import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { BLOCK, DESIGN_META } from '../config'
import { amt, money, ago, now } from '../lib/util'
import { ensure, setSound, chime } from '../lib/audio'
import { shared } from '../three/shared'
import { crowd } from '../three/Crowd'
import { PoiLabels, Minimap, PoiCard } from './WalkHUD'
import { walkToOrnament } from '../three/Walk'

const startOwn = () => { useStore.setState(st => ({ view: 'send', myName: '', engraveTimes: [], heroHook: -1, focus: null, poi: null, run: st.run + 1 })); useStore.getState().setPhase('choose') }

const Hand = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V5a2 2 0 0 1 4 0v6" /><path d="M13 10.5V9a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-.5a6 6 0 0 1-5-2.7L3 15a2 2 0 0 1 3.3-2.2L9 15" /></svg>
const Arrow = ({ d }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>

export default function Overlay({ brand }) {
  const s = useStore()
  const { phase, view, phaseAt } = s
  const [intro, setIntro] = useState(true), [autoBtn, setAutoBtn] = useState(false), [share, setShare] = useState(null)
  useEffect(() => { if (phase === 'arrival') { setIntro(true); const t = setTimeout(() => setIntro(false), 1500); return () => clearTimeout(t) } setIntro(false) }, [phase, s.run])
  useEffect(() => { setAutoBtn(false); if (phase === 'hang') { const t = setTimeout(() => setAutoBtn(true), 8000); return () => clearTimeout(t) } }, [phase, s.run])
  useEffect(() => { setShare(null) }, [s.run])

  const tapAction = { arrival: () => s.setPhase('dark'), dark: () => s.setPhase('lighting'), gift: () => { s.tryOpen(); s.setPhase('unwrap') }, crown: () => s.setPhase('crowning') }[phase]
  const prompt = { dark: 'Tap to light the tree', gift: `Tap to open ${s.from}'s gift`, crown: 'Tap the star to put it on top' }[phase]
  const onTap = () => { ensure(); tapAction?.() }

  return (
    <>
      {tapAction && <button className="tap" type="button" aria-label={prompt || 'Skip'} onClick={onTap} />}
      {prompt && <div className="pill pulse" key={phase}><Hand />{prompt}</div>}
      {phase === 'arrival' && !intro && <div className="skip">Tap to skip</div>}

      {phase === 'choose' && <Chooser />}
      {phase === 'engrave' && <Engrave />}
      {phase === 'hang' && <>
        <div className="pill"><Hand />{view === 'send' ? 'Drag your ornament onto a glowing hook' : `Drag ${s.from}'s ornament onto the tree`}</div>
        <div className="turn-hint">Drag to go round · pinch or double-tap to zoom</div>
        <div className="zoom"><button type="button" aria-label="Zoom in" onClick={() => shared.zoomBy?.(.75)}>+</button><button type="button" aria-label="Zoom out" onClick={() => shared.zoomBy?.(1.33)}>−</button></div>
        <button type="button" className="turn l" aria-label="Turn left around the tree" onClick={() => { shared.hangAz += .7 }}><Arrow d="m15 18-6-6 6-6" /></button>
        <button type="button" className="turn r" aria-label="Turn right around the tree" onClick={() => { shared.hangAz -= .7 }}><Arrow d="m9 18 6-6-6-6" /></button>
        <div className="drag-hint" aria-hidden="true" />
        {autoBtn && <button type="button" className="btn ghost auto" onClick={() => { ensure(); useStore.setState({ autoHang: true }) }}>Auto-hang it for me</button>}
      </>}
      {(phase === 'settling') && <Chip />}

      {(phase === 'greeting') && <Greeting brand={brand} onShare={() => setShare(s.createCard())} />}
      {share && <ShareSheet link={share} brand={brand} onClose={() => setShare(null)} />}
      {phase === 'explore' && <Explore brand={brand} />}
      <Labels />
      <Toast />
      <div className="topbar">
        {phase === 'explore' && view !== 'tree' && <button type="button" className="back" aria-label="Back to the greeting" onClick={() => { useStore.setState({ focus: null }); s.setPhase('greeting') }}><Arrow d="m15 18-6-6 6-6" /></button>}
        <span className="brand">{brand.mono ? <span className="mono">{brand.mono}</span> : <span className="logo"><i /><i /><i /><i /></span>}{brand.name}</span>
        <button type="button" className="snd" aria-label={s.sound ? 'Turn sound off' : 'Turn sound on'} aria-pressed={s.sound} onClick={() => { useStore.setState({ sound: !s.sound }); setSound(!s.sound) }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" /><path d={s.sound ? 'M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14' : 'm22 9-6 6m0-6 6 6'} /></svg></button>
      </div>
      <div className={'intro' + (intro && phase === 'arrival' ? '' : ' gone')}>
        {brand.mono ? <span className="mono big">{brand.mono}</span> : <span className="logo big"><i /><i /><i /><i /></span>}
        <div className="by">{brand.name}</div><div className="pr">presents</div><div className="bar"><i /></div>
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
  const name = s.view === 'send' ? s.myName : s.from
  return <div className="ochip" ref={ref}><b>{name}</b><span>{s.view === 'send' ? 'your ornament is on the tree' : `${s.from}'s card · ${amt(s.brand().per)} to ${s.brand().charity.name}`}</span></div>
}

function Greeting({ brand, onShare }) {
  const s = useStore(), r = s.openResult
  const restartOwn = startOwn
  if (s.view === 'send') return (
    <div className="finale on">
      <div className="greet"><div className="hc">Happy Christmas</div><div className="nm">from {s.myName}</div></div>
      <div className="foot">
        <p className="note">{brand.name} gives {amt(brand.per)} to {brand.charity.name} each time someone opens your card, up to {money(brand.cap)} in total.</p>
        <button type="button" className="btn primary" onClick={onShare}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="m16 6-4-4-4 4" /><path d="M12 2v13" /></svg>Send to someone</button>
        <div className="btnrow"><button type="button" className="btn ghost" onClick={() => s.setPhase('explore')}>Walk around the village</button><button type="button" className="btn ghost" onClick={() => s.restart()}>Watch again</button></div>
      </div>
    </div>)
  const msg = !r ? '' : r.counted ? null : r.reason === 'own' ? `This is your own card, so opening it here doesn't give. It gives when someone else opens it.`
    : r.reason === 'cap' ? `${brand.name}'s pot is complete. Thank you: all ${money(brand.cap)} has gone to ${brand.charity.name}.` : `This card has already given from this phone. Make your own and start the next gift.`
  return (
    <div className="finale on">
      <div className="greet"><div className="hc">Happy Christmas</div><div className="nm">from {s.from}</div></div>
      <div className="foot">
        {r?.counted ? <div className="gift"><span className="tile" /><p>Opening {s.from}'s card just gave <b>{amt(brand.per)}</b> to {brand.charity.name}, from {brand.name}. Their ornament is on the tree.</p></div>
          : <div className="gift muted"><span className="tile" /><p>{msg}</p></div>}
        <button type="button" className="btn primary" onClick={restartOwn}>Make your own ornament</button>
        <div className="btnrow"><button type="button" className="btn ghost" onClick={() => s.setPhase('explore')}>Walk around the village</button><button type="button" className="btn ghost" onClick={() => s.restart()}>Watch again</button></div>
      </div>
    </div>)
}

function ShareSheet({ link, brand, onClose }) {
  const s = useStore(), cv = useRef()
  useEffect(() => { const c = shared.snapshot?.(); const x = cv.current?.getContext('2d'); if (!x) return
    x.fillStyle = '#0a1030'; x.fillRect(0, 0, 600, 314); if (c) x.drawImage(c, 0, 0, 600, 314)
    const g = x.createLinearGradient(0, 170, 0, 314); g.addColorStop(0, 'rgba(5,8,25,0)'); g.addColorStop(1, 'rgba(5,8,25,.85)'); x.fillStyle = g; x.fillRect(0, 0, 600, 314)
    x.fillStyle = '#ffe3ad'; x.font = '60px "Great Vibes", cursive'; x.fillText(`from ${s.myName}`, 28, 282) }, [])
  const tryShare = async () => { try { if (navigator.share) { await navigator.share({ title: 'A Christmas card', text: `${s.myName} hung an ornament for you 🎄`, url: link }); return } } catch (e) {}
    s.toastMsg("Your phone's share sheet opens here on the live site.") }
  const copy = () => { try { navigator.clipboard.writeText(link).then(() => s.toastMsg('Link copied'), () => s.toastMsg(link)) } catch (e) { s.toastMsg(link) } }
  return (
    <div className="sheetmodal" role="dialog" aria-label="Send your card">
      <div className="sm-in">
        <button type="button" className="x" aria-label="Close" onClick={onClose}>×</button>
        <h3>Your card is ready</h3>
        <p className="sub">This is what it looks like when you send it.</p>
        <div className="chat"><div className="bubble">
          <div className="prev"><canvas ref={cv} width={600} height={314} /><div className="pt"><b>{s.myName} sent you a Christmas card</b><span>Open it and {brand.name} gives {amt(brand.per)} to {brand.charity.name}. Best with the sound on.</span><em>christmas.mosaicads.ai</em></div></div>
          <div className="msg">{s.myName} hung an ornament for you 🎄 <span className="u">{link}</span></div><div className="time">✓✓</div>
        </div></div>
        <div className="btnrow"><button type="button" className="btn primary" onClick={tryShare}>Share</button><button type="button" className="btn ghost" onClick={copy}>Copy link</button></div>
        <button type="button" className="btn text" onClick={() => { useStore.setState({ from: s.myName, view: 'open' }); useStore.getState().restart('open') }}>See what they'll see →</button>
      </div>
    </div>
  )
}

function Explore({ brand }) {
  const s = useStore(), [hint, setHint] = useState(true), [open, setOpen] = useState(false), walking = s.exploreMode === 'walk'
  useEffect(() => { setHint(true); const t = setTimeout(() => setHint(false), 6000); return () => clearTimeout(t) }, [s.exploreMode])
  const fo = s.focus == null ? null : s.focus === 'hero' ? { name: s.view === 'send' ? s.myName : s.from, design: s.design, mins: 0, you: true } : crowd.list.find(o => o.id === s.focus)
  const given = brand.opened * brand.per, pct = Math.min(100, given / brand.cap * 100)
  const rows = [...brand.extra.map(r => ({ n: r.n, when: 'just now', you: true })), ...crowd.list.slice().sort((a, b) => a.mins - b.mins).slice(0, 8).map(o => ({ n: o.name, when: ago(o.mins) }))].slice(0, 8)
  return (<>
    <div className={'hint' + (hint ? '' : ' fade')}>{walking ? 'Tap to walk · drag to look · pinch to zoom · tap a sign to go there' : 'Drag to look around · pinch to zoom · tap an ornament'}</div>
    {walking && <><PoiLabels /><Minimap /></>}
    {walking && <Coach />}
    <button type="button" className="mode" onClick={() => useStore.setState({ exploreMode: walking ? 'orbit' : 'walk', poi: null, focus: null })}>{walking ? 'Tree view' : 'Walk around'}</button>
    {s.heroHook >= 0 && s.view !== 'tree' && !fo && !s.poi && <button type="button" className="btn ghost findme" onClick={() => useStore.setState({ focus: 'hero' })}>Find my ornament</button>}
    {!fo && <PoiCard brand={brand} onOwn={startOwn} bottom={s.view === 'tree' ? 108 : 16} />}
    {fo && <div className="fcard"><div className="who"><b>{fo.name}</b><span>{DESIGN_META[fo.design].label} · {fo.you ? (s.view === 'send' ? 'your ornament' : 'just now') : ago(fo.mins)} · gave {amt(brand.per)} to {brand.charity.name}</span></div>
      <button type="button" className="x" aria-label="Close" onClick={() => useStore.setState({ focus: null })}>×</button></div>}
    {s.view === 'tree' && !fo && <div className={'sheet' + (open ? '' : ' peek')}>
      <button type="button" className="grab" aria-expanded={open} onClick={() => setOpen(!open)}><span className="t1">{brand.title}</span><span className="t2">{money(given)} given · {brand.opened.toLocaleString('en-GB')} cards · {open ? 'tap to close' : 'tap for details'}</span></button>
      <div className="sheet-in">
        <div className="wm" aria-hidden="true">SAMPLE</div>
        <p className="disc">{brand.name} gives {amt(brand.per)} to {brand.charity.name} (reg. {brand.charity.reg}) for every card opened, up to {money(brand.cap)}, {brand.start} to {brand.end}. Live total below.</p>
        <span className="chip"><span className="live" />{given >= brand.cap ? 'Pot complete. Thank you' : `Live · ${brand.payout}`}</span>
        <div className="stats"><div className="stat"><b>{money(given)}</b><span>GIVEN SO FAR</span></div><div className="stat"><b>{brand.opened.toLocaleString('en-GB')}</b><span>CARDS OPENED</span></div></div>
        <div className="pot"><div className="tr"><i style={{ width: pct.toFixed(1) + '%' }} /></div><div className="lb"><span>{Math.round(pct)}% of the {money(brand.cap)} pot</span><span>{given >= brand.cap ? 'Complete' : `${money(brand.cap - given)} left`}</span></div></div>
        <div className="list"><h4>Gifts coming in</h4>{rows.map((r, i) => <div key={i} className={'r' + (r.you ? ' you' : '')}><span className="tt" /><div className="w">{r.n}'s card → {brand.charity.name}<small>card opened · {r.when}{r.you ? '' : ' · sample'}</small></div><span className="a">+{amt(brand.per)}</span></div>)}</div>
        <button type="button" className="btn primary" onClick={() => s.restart('send')}>Send a card</button>
        <div className="b2b">Powered by MosaicAds. Want your brand's ads to give like this? <a href="https://mosaicads.ai" target="_blank" rel="noopener">mosaicads.ai</a></div>
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
        if (s.heroHook >= 0 && shared.heroVisible) list.push({ name: s.view === 'send' ? s.myName : s.from, wp: shared.heroBody, hook: s.heroHook, you: true, id: 'hero' })
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
