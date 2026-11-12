-- Runs the deletion promised on the privacy page: wishes and reminder emails, at 03:00 UTC on 1 February.
-- Needs pg_cron, which Supabase provides. On a plain Postgres (the tests) this file does nothing.
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('giving-tree-purge', '0 3 1 2 *', 'select purge_personal()');
  end if;
end $$;
