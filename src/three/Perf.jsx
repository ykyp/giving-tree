// What a frame costs, for developers: add ?perf to a tree's address. Loaded only in development and test mode.
import { useEffect } from 'react'
import { addEffect, addAfterEffect, useThree } from '@react-three/fiber'

export default function Perf({ tier, dpr }) {
  const gl = useThree(s => s.gl)
  useEffect(() => {
    const el = document.createElement('pre'); el.className = 'perf'; document.getElementById('phone')?.appendChild(el)
    gl.info.autoReset = false // the effects draw in many passes; count them all as one frame
    let frames = 0, since = performance.now(), fps = 0, calls = 0, tris = 0
    const before = addEffect(() => { gl.info.autoReset = false; gl.info.reset() }) // read gl.info each time: a restored context gets a new one
    const after = addAfterEffect(() => {
      const info = gl.info
      frames++; calls = info.render.calls; tris = info.render.triangles
      const t = performance.now(); if (t - since < 500) return
      fps = Math.round(frames * 1000 / (t - since)); frames = 0; since = t
      el.textContent = `${fps} fps · ${tier} · ${dpr}x\n${calls} draws · ${(tris / 1000).toFixed(0)}k tris\n${info.memory.geometries} geo · ${info.memory.textures} tex · ${info.programs?.length ?? 0} prog`
      window.__perf = { fps, tier, dpr, calls, triangles: tris, geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? 0 }
    })
    return () => { before(); after(); gl.info.autoReset = true; el.remove(); delete window.__perf }
  }, [gl, tier, dpr])
  return null
}
