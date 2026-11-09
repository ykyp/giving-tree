// Builds the publishable page: fonts + inlined CSS + the single app.js bundle.
import fs from 'fs'
const css = fs.readFileSync('page.css', 'utf8')
fs.mkdirSync('publish', { recursive: true })
fs.copyFileSync('dist/app.js', 'publish/app.js')
fs.writeFileSync('publish/index.html', `<title>The Giving Tree</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600&family=Instrument+Serif:ital@0;1&family=Great+Vibes&family=Caveat:wght@600&display=swap">
<style>
${css}
</style>
<div id="root"></div>
<script type="module" src="app.js"></script>
`)
console.log('publish/ ready', (fs.statSync('publish/app.js').size / 1024).toFixed(0) + ' KB')
