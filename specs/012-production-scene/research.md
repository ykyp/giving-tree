# Research: production scene

**Context loss.** *Decision*: listen on the canvas for `webglcontextlost` / `webglcontextrestored`; show a notice;
offer a reload if nothing comes back in 5 s. *Why*: three's renderer already calls `preventDefault` on loss and
rebuilds its GPU state on restore, and every texture here is drawn from a canvas kept in memory, so restore needs no
reload. What is missing is telling the visitor. iOS Safari often never restores, hence the timed reload offer.
*Alternatives*: remount the `<Canvas>` on loss (loses scene state, hooks and camera; rejected); reload at once
(loses a half-written wish; rejected).

**Script-load failure.** *Decision*: wrap the dynamic `import('./App')`; on failure reload once, remembered in
`sessionStorage`; on a second failure render a message with a retry button. *Why*: after a deploy an open tab asks
for a chunk name that no longer exists; a reload fetches the new entry. The one-reload memory prevents loops when
the network is simply down. *Alternatives*: Vite's `vite:preloadError` event (only covers preload, not the import
itself); a service worker (far more than this needs).

**Crashes.** *Decision*: a React error boundary round the canvas only; the overlay stays mounted. R3F rethrows
render-loop errors into React, so one boundary sees both.

**Readiness.** *Decision*: after the scene's Suspense content mounts, `await gl.compileAsync(scene, camera)`
(three ≥ 0.159, uses `KHR_parallel_shader_compile` where present), then wait two frames, then lift the cover; a
time limit of 8 s lifts it regardless. *Why*: 48 programs compile on first draw today, which is the visible stall
and pop-in. *Alternatives*: drei `useProgress` (tracks loaders; this scene loads no files, so it reports nothing).

**Caching.** *Decision*: `Cache-Control: public, max-age=31536000, immutable` for `/chunks/(.*)` in `vercel.json`.
*Why*: Vercel serves static files with `max-age=0, must-revalidate` unless told otherwise; chunk names carry a
content hash so they can never go stale. `app.js` and `style.css` keep fixed names (server pages link to them) and
keep revalidating.

**Lowest level.** *Decision*: ground plane 230² segments on high, 160² on mid, 110² on low (105,800 → 51,200 →
24,200 triangles); bulb spheres 8×6 on high and mid, 6×4 on low. *Why*: the ground is a quarter of all triangles
and its relief is carried by the normal map; the displacement only shapes distant drifts. Hooks are computed from
the tree, not the ground, so nothing tappable moves. Mid changes are held to what cannot be seen in the starting view.

**Health counts.** *Decision*: reuse the `events` table and `POST event`; add names `no_webgl`, `gl_lost`,
`gl_restored`, `scene_error`, `chunk_error`, `tier_low`; one of each per tab (client) and 12 a day per device
(server). Messages go to the existing `POST log`, which already strips private links. *Alternatives*: a hosted
error tracker (a new processor of visitor data and a new account; rejected for now).

**Debug handles.** *Decision*: `window.__shared`, `window.__heroCanvas` and `window.__tier` only when
`import.meta.env.DEV` or the demo build. The dev panel and the browser checks keep working; the live site exposes none.
