-- Scene health: counts of how the 3D scene behaved on visitors' devices (specs/012-production-scene).
-- Only the name, the tree and the time are kept: nothing about the device or the person.
alter table events drop constraint if exists events_name_check;
alter table events add constraint events_name_check check (name in (
  'share_v1', 'share_v2', 'saved_calendar', 'saved_selfsend', 'saved_email', 'returned',
  'no_webgl', 'gl_lost', 'gl_restored', 'scene_error', 'chunk_error', 'tier_low'));
