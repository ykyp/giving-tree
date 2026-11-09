// Asset pipeline (spec v3 §4.3): raw Blender exports in assets/raw/*.glb → compressed models in public/models/.
// Steps per file: dedup → prune → weld → (LOD1 via simplify) → Draco geometry → KTX2 textures (UASTC normals, ETC1S colour).
// Run: npm run assets            (needs the KTX-Software `toktx` binary on PATH for the ktx2 step; it is skipped with a warning if missing)
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const RAW = 'assets/raw', OUT = 'public/models'
const BUDGET_KB = { tree: 1600, ornaments: 400, village: 2200, giftbox: 150, environment: 500 }
fs.mkdirSync(OUT, { recursive: true })
const hasToktx = (() => { try { execSync('toktx --version', { stdio: 'ignore' }); return true } catch { return false } })()
const run = c => { console.log('  $ ' + c); execSync(c, { stdio: 'inherit' }) }
const files = fs.existsSync(RAW) ? fs.readdirSync(RAW).filter(f => f.endsWith('.glb')) : []
if (!files.length) console.log(`No raw models in ${RAW}/ yet. Drop Blender exports there (tree.glb, ornaments.glb, village.glb, giftbox.glb, environment.glb).`)
let total = 0
for (const f of files) {
  const name = path.basename(f, '.glb'), src = path.join(RAW, f), tmp = path.join(OUT, `${name}.tmp.glb`), out = path.join(OUT, `${name}.glb`), lod1 = path.join(OUT, `${name}.lod1.glb`)
  console.log(`\n▸ ${name}`)
  run(`npx gltf-transform dedup ${src} ${tmp}`)
  run(`npx gltf-transform prune ${tmp} ${tmp}`)
  run(`npx gltf-transform weld ${tmp} ${tmp}`)
  if (hasToktx) { run(`npx gltf-transform uastc ${tmp} ${tmp} --slots "{normalTexture,occlusionTexture,metallicRoughnessTexture}"`); run(`npx gltf-transform etc1s ${tmp} ${tmp} --slots "{baseColorTexture,emissiveTexture}"`) }
  else console.warn('  ! toktx not found: textures left as PNG/JPEG (install KTX-Software for KTX2)')
  run(`npx gltf-transform simplify ${tmp} ${lod1} --ratio 0.35 --error 0.001`)
  run(`npx gltf-transform draco ${lod1} ${lod1}`)
  run(`npx gltf-transform draco ${tmp} ${out}`)
  fs.rmSync(tmp)
  const kb = fs.statSync(out).size / 1024; total += kb
  const b = Object.entries(BUDGET_KB).find(([k]) => name.startsWith(k))
  console.log(`  ${name}.glb ${kb.toFixed(0)} KB${b ? ` (budget ${b[1]} KB${kb > b[1] ? ' — OVER' : ''})` : ''}`)
}
if (files.length) console.log(`\nTotal ${total.toFixed(0)} KB (first-load budget 6000 KB)`)
