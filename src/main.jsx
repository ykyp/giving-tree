import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { DEMO } from './lib/api'
import Home from './pages/Home'
import SentWish from './pages/SentWish'

// The 3D scene is big, so it only loads when someone enters a tree. The home page and a sent wish are plain pages.
const Scene = lazy(() => import('./App'))
const Ops = lazy(() => import('./pages/Ops'))
const path = location.pathname
const Page = /^\/ops\/?$/.test(path) && !DEMO ? Ops : DEMO || /^\/(t|c|me)\//.test(path) ? Scene : /^\/w\//.test(path) ? SentWish : Home
const Loading = () => <main className="pre"><h1>The Giving Tree</h1><p className="fine">The tree is loading.</p></main>
createRoot(document.getElementById('root')).render(<Suspense fallback={<Loading />}><Page /></Suspense>)
