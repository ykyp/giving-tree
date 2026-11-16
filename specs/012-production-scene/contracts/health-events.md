# Contract: scene health

## POST /api/event

Body `{ name, tree }`. `name` may now also be one of `no_webgl`, `gl_lost`, `gl_restored`, `scene_error`,
`chunk_error`, `tier_low`. For these names only: at most 12 a day per device, then `429 slow_down`. An unknown tree
slug counts against `global`. Answer `{ ok: true }`. Nothing but the name, the tree and the time is kept.

## POST /api/log (unchanged)

Body `{ message, screen, build }`: written to the server log with private links and long tokens removed.

## GET /api/admin/measures?tree= and GET /api/admin/trees (operators only)

`measures.scene[name] = { total, day }` for each of the six names.

## Static files

`/chunks/*` answers `Cache-Control: public, max-age=31536000, immutable`.
