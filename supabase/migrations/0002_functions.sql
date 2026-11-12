-- Operations that must happen all at once.

-- A card is opened by a device. One row per card and device, ever. A gift is released only when the tree's giving is
-- live, inside its dates, and the pot stays within its cap; the gift record and the total move together.
create function record_open(p_card text, p_device text, p_at bigint, p_day date) returns jsonb
language plpgsql as $$
declare c cards%rowtype; t trees%rowtype; n int; why text;
begin
  select * into c from cards where id = p_card;
  if c.device = p_device then
    insert into opens (card_id, device, reason, at) values (p_card, p_device, 'own', p_at) on conflict do nothing;
    return jsonb_build_object('counted', false, 'reason', 'own');
  end if;
  insert into opens (card_id, device, at) values (p_card, p_device, p_at) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('counted', false, 'reason', 'again'); end if;

  select * into t from trees where slug = c.tree for update;
  why := case
    when not t.giving_enabled or t.giving_status = 'off' then 'off'
    when t.giving_status = 'paused' then 'paused'
    when t.giving_status = 'ended' or (t.ends_on is not null and p_day > t.ends_on) then 'closed'
    when t.starts_on is not null and p_day < t.starts_on then 'off'
    when t.given_pence + t.per_gift_pence > t.cap_pence then 'cap'
  end;
  if why is not null then
    update opens set reason = why where card_id = p_card and device = p_device;
    return jsonb_build_object('counted', false, 'reason', why);
  end if;

  update trees set given_pence = given_pence + per_gift_pence where slug = t.slug;
  insert into gifts (tree, card_id, amount_pence, name, at) values (t.slug, c.id, t.per_gift_pence, c.name, p_at);
  update opens set counted = true where card_id = p_card and device = p_device;
  return jsonb_build_object('counted', true, 'amount', t.per_gift_pence);
end $$;

-- A removal request: the ornament leaves the tree and its wishes are deleted.
create function remove_card(p_card text, p_note text, p_at bigint) returns boolean
language plpgsql as $$
begin
  update cards set hidden = true, removed_at = p_at where id = p_card;
  if not found then return false; end if;
  delete from wishes where card_id = p_card;
  insert into removals (card_id, note, at) values (p_card, p_note, p_at);
  return true;
end $$;

-- Wishes and reminder emails are deleted on 1 February 2027.
create function purge_personal() returns void language sql as $$ delete from wishes; delete from reminders; $$;

-- Only the server may call these. (These roles exist on Supabase; a plain Postgres used for tests has none.)
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function record_open(text, text, bigint, date), remove_card(text, text, bigint), purge_personal() from public, anon, authenticated;
  end if;
end $$;
