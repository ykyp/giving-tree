import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../store'
import { BRANDS } from '../config'
import { now } from '../lib/util'
import { chime, whoosh } from '../lib/audio'
import { addLive } from './Crowd'
import { FLY_DUR } from './CameraRig'

// Moves the story on between beats that don't need a tap, plays the beat sounds, and drops in live gifts.
const AUTO = { arrival: [FLY_DUR, s => 'dark'], lighting: [4.6, s => s.view === 'send' ? 'choose' : 'gift'], unwrap: [2.7, () => 'hang'], settling: [2.8, () => 'crown'], crowning: [6.4, () => 'greeting'] }
export default function Director() {
  const nextLive = useRef(now() + 5)
  useEffect(() => useStore.subscribe((s, p) => {
    if (s.phase === p.phase) return
    const c = { lighting: [[523.25, 659.25, 783.99, 1046.5, 1318.5], .12], choose: [[784, 988], .1], engrave: [[1046.5, 1318.5], .1], unwrap: [[784, 988, 1175], .09], crowning: [[1046.5, 1318.5, 1568, 2093], .13] }[s.phase]
    if (c) chime(c[0], c[1]); if (s.phase === 'greeting' || s.phase === 'arrival') whoosh()
  }), [])
  useFrame(() => {
    const s = useStore.getState(), t = now(), a = AUTO[s.phase]
    if (a && t - s.phaseAt > a[0]) s.setPhase(a[1](s))
    if (t > nextLive.current) { nextLive.current = t + 4 + Math.random() * 4.5
      const b = BRANDS[s.brandKey]
      if (s.live && !document.hidden && (s.phase === 'greeting' || s.phase === 'explore') && b.opened * b.per < b.cap) {
        b.opened++; const o = addLive(b); if (s.phase === 'explore') s.toastMsg(`${o.name}'s card just gave ${b.per < 100 ? b.per + 'p' : '£' + b.per / 100}`); s.bump(); chime([1568], 0, .04) } }
  })
  return null
}
