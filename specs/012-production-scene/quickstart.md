# Quickstart: checking the production scene

Prerequisites: Node 22 on the path, `npm ci`.

1. **Rules**: `npm test` and, with a local database, `GT_TEST_DB=… npm run test:db`. `scene-health` covers the six
   names, the per-device limit and the counts in measures.
2. **Run**: `npm run dev`, open `http://localhost:5173/t/global?perf`. The readout shows frames per second, draw
   calls, triangles, textures and the level.
3. **Loading cover**: reload; the square's picture and "The tree is loading" show until the scene appears whole.
4. **Context loss**: in the console, `const x = document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context'); x.loseContext()`
   → the notice appears; `x.restoreContext()` → it goes and the ornaments are intact. Lose it again and wait 5 s →
   "Reload the tree" is offered.
5. **Lowest level**: pick "low" in the dev panel (or `window.__tier = 'low'` before load); the readout shows under
   300,000 triangles; ornaments hang on the same hooks.
6. **Script failure**: build, serve `dist`, delete the scene chunk, open a tree link → one reload, then the retry message.
7. **Caching (after deploy)**: `curl -sI https://<site>/chunks/<file>` shows `immutable`.
8. **Live build has no handles**: on the deployed site, `window.__shared` is `undefined`.
