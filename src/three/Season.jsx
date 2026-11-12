import * as THREE from 'three'
import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useStore } from '../store'
import { seeded, now } from '../lib/util'
import { glow } from './shared'
import { LAYOUT, CHURCH } from './village'

/** Christmas morning: presents piled under every tree in the village. */
function Presents({ brand }) {
  const parts = useMemo(() => {
    const r = seeded(2512), spots = []
    for (let i = 0; i < 46; i++) { const a = r() * 6.283, d = 3.7 + r() * 1.7; if (Math.abs(Math.atan2(Math.cos(a), Math.sin(a))) < .22) continue; spots.push([Math.cos(a) * d, Math.sin(a) * d, .3 + r() * .4]) } // leaves the front clear
    for (const [x, z, h] of LAYOUT.pines) { if (Math.hypot(x, z) > 70) continue; const n = 3 + Math.floor(r() * 3), R = h * .3 + .3; for (let i = 0; i < n; i++) { const a = r() * 6.283; spots.push([x + Math.cos(a) * R, z + Math.sin(a) * R, .3 + r() * .4]) } }
    const n = spots.length
    const box = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0), new THREE.MeshStandardMaterial({ roughness: .5, envMapIntensity: .7 }), n)
    const rib = new THREE.InstancedMesh(mergeGeometries([new THREE.BoxGeometry(1.02, 1.02, .16).translate(0, .5, 0), new THREE.BoxGeometry(.16, 1.02, 1.02).translate(0, .5, 0)]), new THREE.MeshStandardMaterial({ color: 0xe8c46a, metalness: .6, roughness: .3 }), n)
    const o = new THREE.Object3D(), c = new THREE.Color()
    spots.forEach(([x, z, s], i) => { o.position.set(x, 0, z); o.rotation.y = r() * 3.14; o.scale.set(s * (.9 + r() * .5), s * (.7 + r() * .6), s * (.9 + r() * .5)); o.updateMatrix(); box.setMatrixAt(i, o.matrix); rib.setMatrixAt(i, o.matrix); box.setColorAt(i, c.set(brand.palette[Math.floor(r() * brand.palette.length)])) })
    box.frustumCulled = rib.frustumCulled = false
    return { box, rib }
  }, [brand])
  return <><primitive object={parts.box} /><primitive object={parts.rib} /></>
}

/** New Year's Eve: fireworks over the church. Everything is computed in the shader. */
function Fireworks() {
  const { geo, mat } = useMemo(() => {
    const B = 22, P = 110, r = seeded(3112), n = B * P, O = new Float32Array(n * 3), D = new Float32Array(n * 3), C = new Float32Array(n * 3), T = new Float32Array(n), v = new THREE.Vector3(), cols = [[1, .55, .3], [1, .85, .4], [.5, .8, 1], [1, .4, .7], [.6, 1, .6]]
    for (let b = 0; b < B; b++) {
      // six over the church, and a ring of sixteen low round the square: a phone screen is narrow, so some must be in shot from any side
      const far = b >= 6, a = (b - 6) / 16 * 6.283 + .2, ox = far ? Math.cos(a) * 75 : CHURCH.x + (r() - .5) * 38, oz = far ? Math.sin(a) * 75 : CHURCH.z + (r() - .5) * 24, oy = far ? 22 + r() * 10 : 34 + r() * 16, off = r() * 5, col = cols[b % cols.length]
      for (let i = 0; i < P; i++) { v.set(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(11 + r() * 7); O.set([ox, oy, oz], (b * P + i) * 3); D.set([v.x, v.y, v.z], (b * P + i) * 3); C.set(col, (b * P + i) * 3); T[b * P + i] = off }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(O, 3)); g.setAttribute('aDir', new THREE.BufferAttribute(D, 3)); g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('aT', new THREE.BufferAttribute(T, 1))
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { uTime: { value: 0 }, uMap: { value: glow }, uScale: { value: 800 } },
      vertexShader: `attribute vec3 aDir; attribute float aT; uniform float uTime,uScale; varying float vA; varying vec3 vC;
        void main(){ float age=mod(uTime+aT,5.); float k=1.-exp(-age*1.8); vec3 p=position+aDir*k; p.y-=age*age*.55; vA=age<.05?0.:pow(max(0.,1.-age/2.6),1.4); vC=color;
          vec4 mv=modelViewMatrix*vec4(p,1.); gl_PointSize=min(uScale*1.9/-mv.z,uScale*.04); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: 'uniform sampler2D uMap; varying float vA; varying vec3 vC; void main(){ gl_FragColor=vec4(vC*texture2D(uMap,gl_PointCoord).a*vA*1.15,1.); }' })
    return { geo: g, mat: m }
  }, [])
  useFrame(({ size, gl }) => { mat.uniforms.uTime.value = now(); mat.uniforms.uScale.value = size.height * gl.getPixelRatio() })
  return <points geometry={geo} material={mat} frustumCulled={false} />
}

export default function Season({ brand }) {
  const phase = useStore(s => s.clock.phase)
  return <>{phase !== 'advent' && <Presents brand={brand} />}{phase === 'nye' && <Fireworks />}</>
}
