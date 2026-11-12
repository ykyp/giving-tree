import { Suspense, useEffect, useMemo, useState, lazy } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useStore } from './store'
import { LOOK } from './config'
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
import { DEMO } from './lib/api'
// Test tools: only when run on a developer's machine, or in the single-file demo. Never in the site's own build.
const Panel = import.meta.env.DEV || DEMO ? lazy(() => import('./ui/Panel')) : null

function detectTier() {
  try { if (window.__tier) return window.__tier
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent), cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4
    if (!mobile) return cores >= 8 ? 'high' : 'mid'
    return cores >= 6 && mem >= 4 ? 'mid' : 'low' } catch (e) { return 'mid' }
}
const hasWebGL2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2') } catch (e) { return false } })()

function WalkGate() { const on = useStore(s => s.phase === 'explore' && s.exploreMode === 'walk'); return on ? <Walk /> : null }

export default function App() {
  const tree = useStore(s => s.tree), tierPref = useStore(s => s.tier)
  const [autoTier, setAutoTier] = useState(detectTier)
  const tier = tierPref === 'auto' ? autoTier : tierPref
  // how the scene is dressed. `per` is only set on a tree that has giving switched on.
  const brand = useMemo(() => ({ ...LOOK, slug: tree.slug, name: tree.name, per: tree.giving?.perGift || null }), [tree.slug, tree.name, tree.giving?.perGift])
  useEffect(() => { document.documentElement.style.setProperty('--accent', brand.accent) }, [brand])
  useEffect(() => { useStore.getState().boot() }, [])
  // real card and Christmas links are the phone alone; the notes and controls are for the demo
  const testMode = useStore(s => !!s.apiInfo?.testMode), solo = !testMode || !Panel // the public site is the card and nothing else
  // Sharpness: the tier's limit, or less on a very large window so a big screen never draws more than about 3.6 million
  // pixels a frame (a phone at 2x draws under one million).
  const [area, setArea] = useState(() => window.innerWidth * window.innerHeight)
  useEffect(() => { const on = () => setArea(window.innerWidth * window.innerHeight); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  const maxDpr = Math.max(1, Math.min(tier === 'high' ? 2 : tier === 'mid' ? 1.5 : 1, Math.sqrt(3.6e6 / area)))
  const dpr = [1, maxDpr]
  return (
    <div className={'wrap' + (solo ? ' solo' : '')}>
      {!solo && Panel && <Suspense fallback={null}><Panel tier={tier} /></Suspense>}
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
        ) : <div className="nogl"><div><p className="nogl-t">3D isn’t available on this device</p><p className="sub">Try opening this link in another browser, or on a newer phone.</p></div></div>}
        <Overlay brand={brand} />
      </div>
    </div>
  )
}
