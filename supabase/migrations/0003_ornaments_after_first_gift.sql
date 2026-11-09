-- An ornament appears on the public tree once its card has released at least one gift.
create or replace view public_ornaments as
  select c.id, c.brand, c.sender_name, c.design, c.hook, c.branch_of, c.created_at
    from cards c
   where c.moderation = 'ok' and exists (select 1 from gifts g where g.card_id = c.id);
grant select on public_ornaments to anon, authenticated;
