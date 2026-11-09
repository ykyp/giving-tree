import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// One self-contained bundle (no code-splitting) so it can be published as a single script file.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist', assetsInlineLimit: 100000000, cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: '[name][extname]' } },
  },
})
