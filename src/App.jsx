import { Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useStore } from './store'
import { BRANDS } from './config'
import Tree from './three/Tree'
import Crowd from './three/Crowd'
import Hero from './three/Hero'
import Branch from './three/Branch'
import Season from './three/Season'
import CameraRig from './three/CameraRig'
import Director from './three/Director'
import Effects from './three/Effects'
import Walk from './three/Walk'
import { Environment, Sky, Ground, Village, Snow, Lights } from './three/World'
import Overlay from './ui/Overlay'
import Panel from './ui/Panel'
import { api, connect, getCard, getMe, subscribeGifts, getOrnament, mergeBrand } from './lib/api'
import { addLive } from './three/Crowd'
import { chime } from './lib/audio'

function detectTier() {
  try { if (window.__tier) return window.__tier
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent), cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4
    if (!mobile) return cores >= 8 ? 'high' : 'mid'
    return cores >= 6 && mem >= 4 ? 'mid' : 'low' } catch (e) { return 'mid' }
}
const hasWebGL2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2') } catch (e) { return false } })()

/** Decide what to show from the URL: /  ·  /c/{card}  ·  /t/{brand}  ·  /me/{christmas link}. */
async function boot() {
  const st = useStore.getState, path = location.pathname, q = new URLSearchParams(location.search)
  const m = path.match(/^\/(c|t|me)\/([\w-]+)/), kind = m?.[1], arg = m?.[2]
  let brand = q.get('brand') || (kind === 't' ? arg : 'mosaicads'), card = null, me = null
  if (kind === 'c') { try { card = await getCard(arg); brand = card.brand } catch (e) {} }
  if (kind === 'me') { try { me = await getMe(arg); brand = me.card.brand } catch (e) {} }
  if (!BRANDS[brand]) BRANDS[brand] = { ...BRANDS.mosaicads, slug: brand, extra: [], mono: brand[0].toUpperCase(), star: 'logo' }
  const tree = await connect(brand)
  if (!tree) { st().restart('send'); return } // demo mode
  document.body.classList.add('app')
  mergeBrand(BRANDS[brand], tree.brand)
  useStore.setState({ online: true, brandKey: brand, live: true, treeRev: st().treeRev + 1 })
  subscribeGifts(brand, async g => {
    const b = BRANDS[brand]; b.opened = Math.max(b.opened + 1, b.opened); const row = g.card_id && await getOrnament(g.card_id)
    if (row && addLive(b, row)) chime([1568], 0, .04)
    st().toastMsg(`${g.display_name}'s card just gave ${g.amount_pence < 100 ? g.amount_pence + 'p' : '£' + (g.amount_pence / 100).toFixed(2)}`); st().bump()
  })
  if (card) { useStore.setState({ from: card.sender_name, cardId: card.id, design: card.design }); st().restart('open'); useStore.setState({ design: card.design }); return }
  if (kind === 'c') { st().toastMsg('That card link is not valid, so here is the tree.'); st().restart('tree'); return }
  if (me) {
    st().restart('tree'); const waiting = me.wishes.filter(w => !w.open).length, open = me.wishes.filter(w => w.open).length
    st().toastMsg(open ? `${open} wish${open > 1 ? 'es' : ''} waiting for you` : waiting ? `${waiting} wish${waiting > 1 ? 'es' : ''} waiting · they open on 25 December` : `Your ornament is on the tree, ${me.card.sender_name}`)
    return
  }
  st().restart(kind === 't' ? 'tree' : 'send')
}

function WalkGate() { const on = useStore(s => s.phase === 'explore' && s.exploreMode === 'walk'); return on ? <Walk /> : null }

export default function App() {
  const brandKey = useStore(s => s.brandKey), tierPref = useStore(s => s.tier)
  const [autoTier, setAutoTier] = useState(detectTier)
  const tier = tierPref === 'auto' ? autoTier : tierPref
  const brand = BRANDS[brandKey]
  useEffect(() => { document.documentElement.style.setProperty('--accent', brand.accent) }, [brand])
  useEffect(() => { useStore.getState().boot() }, [])
  // real card and Christmas links are the phone alone; the notes and controls are for the demo
  const live = useStore(s => s.apiInfo && !s.apiInfo.devClock), solo = /^\/(c|me)\//.test(location.pathname) && live
  const dpr = tier === 'high' ? [1, 2] : tier === 'mid' ? [1, 1.5] : [1, 1]
  return (
    <div className={'wrap' + (solo ? ' solo' : '')}>
      {!solo && <Panel tier={tier} />}
      <div className="phone" id="phone">
        {hasWebGL2 ? (
          <Canvas className="gl" dpr={dpr} flat gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
            camera={{ fov: 40, near: .1, far: 700, position: [6, 30, 118] }} onCreated={({ gl }) => { gl.setClearColor('#0b1029') }}>
            <fogExp2 attach="fog" args={['#141b40', .0115]} />
            <PerformanceMonitor onDecline={() => setAutoTier(t => t === 'high' ? 'mid' : 'low')} flipflops={2} />
            <Suspense fallback={null}>
              <Environment /><Sky /><Ground /><Lights />
              <Village brand={brand} />
              <Tree tier={tier} brand={brand} />
              <Crowd brand={brand} />
              <Hero brand={brand} />
              <Branch brand={brand} />
              <Season brand={brand} />
              <Snow tier={tier} />
              <CameraRig /><Director /><WalkGate />
              <Effects tier={tier} />
            </Suspense>
          </Canvas>
        ) : <div className="nogl"><div><p className="nogl-t">3D isn’t available on this device</p><p className="sub">The live site shows the flat version of the card instead.</p></div></div>}
        <Overlay brand={brand} />
      </div>
    </div>
  )
}
