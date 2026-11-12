import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handle } from './server/app.js'
import { memoryRepo } from './server/repo-memory.js'
import { TEST_TREES } from './server/seed-test.js'
import { headTags, pages, page } from './shared/shell.js'

// `npm run dev` runs the real rules on a file-backed repository. This is the only place test mode exists:
// the date and the device can be faked from the panel, and the demo routes work.
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
// The home page's words are in the HTML itself, from the same module the server uses for every other address.
function homeHtml() {
  const home = pages.home(), origin = (process.env.PUBLIC_ORIGIN || '').replace(/\/$/, '')
  return { name: 'giving-tree-home-html', transformIndexHtml: html => html.replace('<!--head-->', headTags({ ...home, origin })).replace('<!--body-->', home.body) }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(), homeHtml()],
  base: '/', // card and branch links live at /c/… and /me/…, so assets must resolve from the root
  build: mode === 'demo'
    // the single-file demo: everything in one script, rules included, for hosting with no server
    ? { outDir: 'dist-demo', assetsInlineLimit: 100000000, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: '[name][extname]' } } }
    // the site: a small entry for the home page, and the 3D scene as its own chunk, loaded when someone enters a tree.
    // app.js and style.css keep fixed names because server-made pages link to them (shared/shell.js).
    : { outDir: 'dist', cssCodeSplit: false, rollupOptions: { output: { entryFileNames: 'app.js', chunkFileNames: 'chunks/[name]-[hash].js', assetFileNames: '[name][extname]' } } },
}))
