-- Deletes wishes and reminder emails on 1 February (privacy promise in the plan).
-- Needs the pg_cron extension: Supabase → Database → Extensions → enable "pg_cron", then run this.
create extension if not exists pg_cron;
select cron.schedule('giving-tree-purge', '0 3 1 2 *', $$ delete from wishes; delete from reminders; $$);
