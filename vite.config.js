import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handle } from './server/app.js'
import { memoryRepo } from './server/repo-memory.js'
import { TEST_TREES } from './server/seed-test.js'

// `npm run dev` runs the real rules in test mode on a file-backed repository: the date can be faked from the panel.
function devApi() {
  const file = '.data/repo.json'
  return { name: 'giving-tree-dev-api', configureServer(server) {
    const repo = memoryRepo({ seed: TEST_TREES, load: () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch (e) { return {} } }, save: d => { fs.mkdirSync('.data', { recursive: true }); fs.writeFileSync(file, JSON.stringify(d)) } })
    server.middlewares.use('/api', (req, res) => {
      let raw = ''; req.on('data', c => raw += c); req.on('end', async () => {
        const u = new URL(req.url, 'http://x')
        const out = await handle({ method: req.method, path: u.pathname, query: Object.fromEntries(u.searchParams), body: raw ? JSON.parse(raw) : {}, headers: req.headers }, repo, { testMode: true, adminSecret: 'dev', origin: `http://${req.headers.host}` })
        for (const [k, v] of Object.entries(out.headers || {})) res.setHeader(k, v)
        res.statusCode = out.status; res.setHeader('content-type', out.json ? 'application/json' : out.type)
        res.end(out.json ? JSON.stringify(out.json) : out.b64 ? Buffer.from(out.b64, 'base64') : out.text)
      })
    })
  } }
}

// One self-contained bundle (no code-splitting) so it can be published as a single script file.
export default defineConfig({
  plugins: [react(), devApi()],
  base: '/', // card and Christmas links live at /c/… and /me/…, so assets must resolve from the root
  build: {
    outDir: 'dist', assetsInlineLimit: 100000000, cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: '[name][extname]' } },
  },
})
