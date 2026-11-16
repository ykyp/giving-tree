import { Suspense, useEffect, useMemo, useRef, useState, lazy } from 'react'
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
import { SceneBoundary, SceneWatch } from './three/SceneGuard'
import { report } from './lib/health'
import { DEMO } from './lib/api'
// Test tools: only when run on a developer's machine, or in the single-file demo. Never in the site's own build.
const TOOLS = import.meta.env.DEV || import.meta.env.MODE === 'demo'
const Panel = TOOLS ? lazy(() => import('./ui/Panel')) : null
const Perf = TOOLS && /[?&]perf\b/.test(location.search) ? lazy(() => import('./three/Perf')) : null

/**
 * How much scene detail a device gets (branch cards, snow, edge smoothing). This is not sharpness: see the pixel ratio
 * below. Browsers hide what a phone really is, so guess generously and let the frame rate correct it.
 */
function detectTier() {
  try { if (TOOLS && window.__tier) return window.__tier // forcing a level is a test tool
    const ua = navigator.userAgent, cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory // Android Chrome only
    const mobile = /Android|iPhone|iPad|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) // iPads say they are Macs
    if (!mobile) return cores >= 8 ? 'high' : 'mid'
    if (/Android/i.test(ua)) return (mem && mem <= 2) || cores <= 4 ? 'low' : 'mid'
    return 'mid' // iPhones and iPads: no way to tell them apart, and even old ones manage this
  } catch (e) { return 'mid' }
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
  // Sharpness is separate from detail. A phone screen packs 2 to 3 pixels into each point, so drawing at 1x and
  // stretching looks blocky. Draw at the screen's own density up to 2x (1.5x on the weakest devices), but never more
  // than about 3.6 million pixels a frame, which only matters on big screens (a phone at 2x draws about one million).
  const [area, setArea] = useState(() => window.innerWidth * window.innerHeight)
  useEffect(() => { const on = () => setArea(window.innerWidth * window.innerHeight); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on) }, [])
  const screenDpr = Math.max(1, window.devicePixelRatio || 1)
  const maxDpr = Math.max(1, Math.min(screenDpr, tier === 'low' ? 1.5 : 2, Math.sqrt(3.6e6 / area)))
  // If the frame rate drops, give up sharpness a step at a time (and take it back when things recover). Only when the
  // picture is already at its softest and still too slow does the device lose scene detail.
  const [ease, setEase] = useState(1)
  const dpr = Math.round((1 + (maxDpr - 1) * ease) * 4) / 4
  // Around the scene: a cover until its first whole frame, a notice if the graphics context goes, a message if it breaks.
  const [ready, setReady] = useState(false), [gone, setGone] = useState(null), [broken, setBroken] = useState(false) // gone: 'lost' | 'stuck'
  const stuck = useRef()
  const onLost = () => { report('gl_lost', null, tree.slug); setGone('lost'); clearTimeout(stuck.current); stuck.current = setTimeout(() => setGone(g => g && 'stuck'), 5000) }
  const onRestored = () => { report('gl_restored', null, tree.slug); clearTimeout(stuck.current); setGone(null) }
  useEffect(() => { if (!hasWebGL2) report('no_webgl', null, tree.slug); return () => clearTimeout(stuck.current) }, [])
  const reload = () => location.reload()
  return (
    <div className={'wrap' + (solo ? ' solo' : '')}>
      {!solo && Panel && <Suspense fallback={null}><Panel tier={tier} /></Suspense>}
      <div className="phone" id="phone">
        {hasWebGL2 ? (
          <SceneBoundary onError={e => { report('scene_error', String(e?.message || e), tree.slug); setBroken(true) }} fallback={null}>
          <Canvas className="gl" dpr={dpr} flat gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }}
            camera={{ fov: 40, near: .1, far: 700, position: [6, 30, 118] }} onCreated={({ gl }) => { gl.setClearColor('#0b1029') }}>
            <fogExp2 attach="fog" args={['#141b40', .0115]} />
            {/* "fast enough" is set a little under the screen's own rate: a phone locked at 60 never measures above 60, and would otherwise never get its sharpness back after a slow moment such as loading */}
            <PerformanceMonitor factor={1} step={.25} bounds={rate => rate > 100 ? [50, 90] : [38, 54]} onChange={({ factor }) => setEase(factor)}
              onDecline={({ factor }) => { if (factor <= 0) setAutoTier(t => { if (t === 'mid') report('tier_low', null, tree.slug); return t === 'high' ? 'mid' : 'low' }) }} />
            <Suspense fallback={null}>
              <Environment /><Sky /><Ground tier={tier} /><Lights />
              <Village brand={brand} />
              <Tree tier={tier} brand={brand} />
              <Crowd brand={brand} />
              <Hero brand={brand} />
              <Branch brand={brand} />
              <Season brand={brand} />
              <Snow tier={tier} />
              <CameraRig /><Director /><WalkGate />
              <Effects tier={tier} />
              <SceneWatch onReady={() => setReady(true)} onLost={onLost} onRestored={onRestored} />
              {Perf && <Perf tier={tier} dpr={dpr} />}
            </Suspense>
          </Canvas>
          </SceneBoundary>
        ) : <div className="nogl scene-msg"><div><p className="nogl-t">3D isn’t available on this device</p><p className="sub">Try opening this link in another browser, or on a newer phone.</p><p><a className="btn ghost" href="/">About {tree.name}</a></p></div></div>}
        {hasWebGL2 && !broken && <div className={'veil' + (ready ? ' off' : '')} aria-hidden={ready}><p className="fine" role="status">{ready ? '' : 'The tree is loading'}</p></div>}
        {broken && <div className="scene-msg" role="alert"><div><p className="nogl-t">The tree stopped drawing</p><p className="sub">Nothing you wrote is lost. Reloading brings it back.</p><button type="button" className="btn primary" onClick={reload}>Reload the tree</button></div></div>}
        {gone && !broken && <div className="scene-msg soft" role="status"><div><p className="nogl-t">{gone === 'stuck' ? 'The tree needs a reload' : 'One moment'}</p><p className="sub">{gone === 'stuck' ? 'Your phone took the picture away to save memory and has not given it back.' : 'Your phone paused the picture. It should be back in a second.'}</p>{gone === 'stuck' && <button type="button" className="btn primary" onClick={reload}>Reload the tree</button>}</div></div>}
        <Overlay brand={brand} />
      </div>
    </div>
  )
}
