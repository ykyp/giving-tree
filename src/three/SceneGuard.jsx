// What stands between the 3D scene and a blank screen (specs/012-production-scene).
//   SceneBoundary  catches a crash in the scene and shows `fallback` instead of an empty page
//   SceneWatch     lives inside the canvas: says when the first whole frame is up, and when the graphics context is
//                  lost or given back
import { Component, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

export class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { this.props.onError?.(error) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

const READY_LIMIT = 8000 // the cover lifts by then whatever happens
const FRAMES = 3         // drawn after compiling, so the first thing seen is a finished picture

export function SceneWatch({ onReady, onLost, onRestored }) {
  const { gl, scene, camera } = useThree()
  const st = useRef({ compiled: false, frames: 0, done: false })
  const finish = () => { if (!st.current.done) { st.current.done = true; onReady?.() } }

  useEffect(() => {
    const s = st.current, limit = setTimeout(finish, READY_LIMIT)
    let alive = true
    // Compile every shader before the first frame, off the main thread where the browser can. The scene is drawn into
    // the effects' own buffer, not straight to the screen, and three builds a different program for each, so compile
    // against a buffer of the same kind or the work is done twice.
    const like = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType })
    let work
    try { gl.setRenderTarget(like); work = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve() } catch (e) { work = Promise.resolve() }
    gl.setRenderTarget(null)
    work.catch(() => {}).then(() => { like.dispose(); if (alive) s.compiled = true })
    return () => { alive = false; clearTimeout(limit) }
  }, [gl, scene, camera])

  useFrame(() => { const s = st.current; if (s.compiled && !s.done && ++s.frames >= FRAMES) finish() })

  useEffect(() => {
    const el = gl.domElement
    // While the context is lost the browser answers "what are your attributes?" with nothing, and the effects library
    // reads that answer without checking whenever its passes are rebuilt, which crashed the scene at the very moment
    // it should have been waiting. Keep the last real answer for it.
    const ctx = gl.getContext(), ask = ctx.getContextAttributes.bind(ctx); let known = ask()
    ctx.getContextAttributes = () => (known = ask() || known)
    // three keeps the canvas alive through a loss and rebuilds its buffers when the context returns; every texture
    // here is drawn from a canvas held in memory, so nothing has to be fetched again
    const lost = e => { e.preventDefault(); onLost?.() }, back = () => onRestored?.()
    el.addEventListener('webglcontextlost', lost); el.addEventListener('webglcontextrestored', back)
    return () => { el.removeEventListener('webglcontextlost', lost); el.removeEventListener('webglcontextrestored', back) }
  }, [gl])
  return null
}
