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

function detectTier() {
  try { if (window.__tier) return window.__tier
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent), cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4
    if (!mobile) return cores >= 8 ? 'high' : 'mid'
    return cores >= 6 && mem >= 4 ? 'mid' : 'low' } catch (e) { return 'mid' }
}
const hasWebGL2 = (() => { try { return !!document.createElement('canvas').getContext('webgl2') } catch (e) { return false } })()

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
