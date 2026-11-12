import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../store'
import { now } from '../lib/util'
import { chime, whoosh, bells } from '../lib/audio'
import { FLY_DUR } from './CameraRig'

// Moves the story on between beats that don't need a tap, plays the beat sounds, and drops in live gifts.
const afterHang = s => s.view !== 'send' ? 'crown' : s.parent ? (s.parent.left || s.parent.own ? 'crown' : 'wishfor') : s.clock.phase === 'advent' ? 'seal' : 'crown'
const AUTO = { arrival: [FLY_DUR, s => 'dark'], lighting: [4.6, s => s.view === 'send' ? 'choose' : 'gift'], unwrap: [2.7, () => 'meet'], settling: [2.8, afterHang], crowning: [6.4, () => 'greeting'], mearrive: [5, s => s.afterArrive(s)] }
export default function Director() {
  useEffect(() => useStore.subscribe((s, p) => {
    if (s.phase === p.phase) return
    const c = { lighting: [[523.25, 659.25, 783.99, 1046.5, 1318.5], .12], choose: [[784, 988], .1], engrave: [[1046.5, 1318.5], .1], unwrap: [[784, 988, 1175], .09], crowning: [[1046.5, 1318.5, 1568, 2093], .13] }[s.phase]
    if (c) chime(c[0], c[1]); if (s.phase === 'greeting' || s.phase === 'arrival') whoosh()
    if (s.phase === 'mearrive' && s.me?.released) bells()
    // the ornament is on the tree: save the card, and keep the hooks round it free
    if (s.phase === 'settling' && s.view === 'send') { s.createCard().catch(() => s.toastMsg("We couldn't save your ornament. Check your connection."))
      if (!s.parent) useStore.setState({ branchView: { hook: s.heroHook, kids: [] } }) }
  }), [])
  useFrame(() => {
    const s = useStore.getState(), t = now(), a = AUTO[s.phase]
    if (a && t - s.phaseAt > a[0]) s.setPhase(a[1](s))
  })
  return null
}
