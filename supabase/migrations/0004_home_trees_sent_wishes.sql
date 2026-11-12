-- Trees that visitors create, reports of them, and wishes sent to someone who has no ornament yet.
-- Design: specs/003-home-and-own-trees/data-model.md

alter table trees add column created_by text;        -- salted device hash of the creator; null for the shared tree
alter table trees add column taken_down_at bigint;   -- set when an operator, or three reports, take it down

create table tree_reports (
  tree text not null references trees(slug) on delete cascade,
  device text not null,
  at bigint not null,
  primary key (tree, device)
);

-- A wish for someone by name. It becomes an ordinary wish when they hang an ornament from its link.
create table sent_wishes (
  token text primary key,
  tree text not null references trees(slug),
  from_name text not null check (char_length(from_name) between 1 and 12),
  to_name text not null check (char_length(to_name) between 1 and 12),
  body text not null check (char_length(body) between 1 and 140),
  device text not null,
  status text not null default 'ok' check (status in ('ok', 'review', 'rejected')),
  at bigint not null,
  claimed_by text references cards(id) on delete set null,
  claimed_at bigint
);
alter table tree_reports enable row level security;
alter table sent_wishes enable row level security;

-- Claiming, all at once: the sent wish must be unclaimed, not the claimer's own, and for the claimer's tree.
create function claim_sent_wish(p_token text, p_card text, p_wish_id text, p_at bigint) returns text
language plpgsql as $$
declare s sent_wishes%rowtype; c cards%rowtype;
begin
  select * into s from sent_wishes where token = p_token for update;
  if not found or s.status = 'rejected' then return 'no_wish'; end if;
  if s.claimed_at is not null then return 'claimed'; end if;
  select * into c from cards where id = p_card;
  if c.device = s.device then return 'own_wish'; end if;
  if c.tree <> s.tree then return 'wrong_tree'; end if;
  insert into wishes (id, card_id, from_name, body, kind, device, status, at)
    values (p_wish_id, p_card, s.from_name, s.body, 'friend', s.device, s.status, s.at) on conflict do nothing;
  if not found then return 'already'; end if;   -- this sender has already left this person a wish
  update sent_wishes set claimed_by = p_card, claimed_at = p_at where token = p_token;
  return 'ok';
end $$;

-- 1 February 2027: sent wishes go with the rest.
create or replace function purge_personal() returns void language sql as $$ delete from wishes; delete from reminders; delete from sent_wishes; $$;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function claim_sent_wish(text, text, text, bigint), purge_personal() from public, anon, authenticated;
  end if;
end $$;
