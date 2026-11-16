import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { DEMO } from './lib/api'
import { report } from './lib/health'
import Home from './pages/Home'
import SentWish from './pages/SentWish'

// The 3D scene is big, so it only loads when someone enters a tree. The home page and a sent wish are plain pages.
// If its script will not load (a new version went out while this tab was open, or the network dropped), reload once to
// pick up the new one; if that fails too, say so. Remembered for the tab, so it can never reload in a loop.
const RELOADED = 'gt-scene-reloaded'
const SceneFailed = () => <main className="pre"><h1>The tree didn’t load</h1><p className="lede">Check your connection, then try again.</p><p><button type="button" className="btn primary" onClick={() => location.reload()}>Try again</button></p></main>
const Scene = lazy(() => import('./App').catch(e => {
  report('chunk_error', String(e?.message || e))
  let first = false; try { first = !sessionStorage.getItem(RELOADED); sessionStorage.setItem(RELOADED, '1') } catch (x) {}
  if (first && navigator.onLine !== false) { location.reload(); return new Promise(() => {}) }
  return { default: SceneFailed }
}))
const Ops = lazy(() => import('./pages/Ops'))
const path = location.pathname
const Page = /^\/ops\/?$/.test(path) && !DEMO ? Ops : DEMO || /^\/(t|c|me)\//.test(path) ? Scene : /^\/w\//.test(path) ? SentWish : Home
const Loading = () => <main className="pre"><h1>The Giving Tree</h1><p className="fine">The tree is loading.</p></main>
createRoot(document.getElementById('root')).render(<Suspense fallback={<Loading />}><Page /></Suspense>)
