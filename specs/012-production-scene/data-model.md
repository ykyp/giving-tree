# Data model: production scene

## events (existing table, widened)

| Field | Rule |
|-------|------|
| tree | existing; the tree the visitor was on (`global` when unknown) |
| name | allowed values gain `no_webgl`, `gl_lost`, `gl_restored`, `scene_error`, `chunk_error`, `tier_low` |
| at | existing; server time |

No device, no user agent, no message is stored. Rows are deleted with the tree's other data on 1 Feb 2027 as today.

## measures (what the team screen reads)

Gains `scene: { no_webgl, gl_lost, gl_restored, scene_error, chunk_error, tier_low }`, each `{ total, day }` where
`day` counts the last 24 hours.

## Client state

`ready` (false until the first compiled frame), `lost` (context lost and not yet restored), `failed` (scene error).
Held in the scene guard, not in the store: nothing else needs it.
