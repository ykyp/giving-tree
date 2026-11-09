-- The Giving Tree: schema, counting rules, security.  Run once in Supabase → SQL Editor (or `supabase db push`).
-- Spec: claude/giving-tree-3d-spec.md (counting, compliance) and "The Giving Tree: two visits in December".

create extension if not exists pgcrypto;

-- One row per tree. The pot can never pass its cap (check constraint + the guarded update in record_open).
create table if not exists brands (
  slug text primary key,
  name text not null,
  charity_name text not null,
  charity_reg text,
  per_gift_pence int not null check (per_gift_pence > 0),
  cap_pence int not null check (cap_pence > 0),
  given_pence int not null default 0,
  starts_at date,
  ends_at date,
  agreement_signed_at timestamptz,            -- a tree cannot go live without a signed charity agreement
  status text not null default 'draft' check (status in ('draft', 'live', 'ended')),
  created_at timestamptz not null default now(),
  constraint under_cap check (given_pence <= cap_pence),
  constraint live_needs_agreement check (status <> 'live' or agreement_signed_at is not null)
);

-- A card = one sender's ornament. owner_token is the private "Christmas link"; never exposed publicly.
create table if not exists cards (
  id text primary key,                         -- short public id used in /c/{id}
  brand text not null references brands(slug),
  sender_name text not null check (char_length(sender_name) between 1 and 12),
  design smallint not null check (design between 0 and 7),
  hook smallint,                               -- which hook on the tree it hangs from
  branch_of text references cards(id),         -- the card this one was invited from (null = starts a branch)
  branch_name text check (char_length(branch_name) <= 30),
  owner_token uuid not null default gen_random_uuid() unique,
  creator_device text not null,                -- salted hash; the creator's own opens never count
  moderation text not null default 'ok' check (moderation in ('ok', 'review', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists cards_brand_created on cards (brand, created_at desc);
create index if not exists cards_branch on cards (branch_of);

-- Every open of a card by a device. Primary key = "once per card, per phone".
create table if not exists opens (
  card_id text not null references cards(id) on delete cascade,
  device_hash text not null,
  opened_at timestamptz not null default now(),
  counted boolean not null default false,
  reason text,                                 -- own | again | cap | not_live | bot
  primary key (card_id, device_hash)
);

-- The public record of every gift released (what the tree page and the live feed show).
create table if not exists gifts (
  id bigserial primary key,
  brand text not null references brands(slug),
  card_id text references cards(id) on delete set null,
  kind text not null default 'card_open' check (kind in ('card_open', 'thank_you')),
  amount_pence int not null check (amount_pence > 0),
  display_name text not null,                  -- first name on the ornament
  created_at timestamptz not null default now()
);
create index if not exists gifts_brand_created on gifts (brand, created_at desc);

-- Wishes left on someone's ornament; sealed until unlock_at (25 Dec). Deleted on 1 Feb.
create table if not exists wishes (
  id bigserial primary key,
  card_id text not null references cards(id) on delete cascade,  -- the ornament the wish is FOR
  from_card text references cards(id) on delete set null,        -- the writer's own ornament, if any
  from_name text not null check (char_length(from_name) between 1 and 12),
  body text not null check (char_length(body) between 1 and 140),
  unlock_at timestamptz not null,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists wishes_card on wishes (card_id);

-- Optional, opt-in Christmas reminder. One email per card, deleted on 1 Feb.
create table if not exists reminders (
  owner_token uuid primary key references cards(owner_token) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  brand_news boolean not null default false,
  consent_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Count an open. Atomic: the gift is released only if the pot stays under its cap.
create or replace function record_open(p_card text, p_device text, p_is_bot boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c cards%rowtype; b brands%rowtype; n int;
begin
  select * into c from cards where id = p_card;
  if not found then return jsonb_build_object('counted', false, 'reason', 'no_card'); end if;
  if p_is_bot then return jsonb_build_object('counted', false, 'reason', 'bot'); end if;
  if c.creator_device = p_device then
    insert into opens (card_id, device_hash, reason) values (p_card, p_device, 'own') on conflict do nothing;
    return jsonb_build_object('counted', false, 'reason', 'own');
  end if;
  insert into opens (card_id, device_hash) values (p_card, p_device) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('counted', false, 'reason', 'again'); end if;

  update brands set given_pence = given_pence + per_gift_pence
   where slug = c.brand and status = 'live' and given_pence + per_gift_pence <= cap_pence
         and (starts_at is null or current_date >= starts_at) and (ends_at is null or current_date <= ends_at)
  returning * into b;
  if not found then
    select * into b from brands where slug = c.brand;
    update opens set reason = case when b.status <> 'live' then 'not_live' else 'cap' end where card_id = p_card and device_hash = p_device;
    return jsonb_build_object('counted', false, 'reason', case when b.status <> 'live' then 'not_live' else 'cap' end);
  end if;

  insert into gifts (brand, card_id, amount_pence, display_name) values (c.brand, c.id, b.per_gift_pence, c.sender_name);
  update opens set counted = true where card_id = p_card and device_hash = p_device;
  return jsonb_build_object('counted', true, 'amount_pence', b.per_gift_pence, 'given_pence', b.given_pence, 'cap_pence', b.cap_pence);
end $$;

-- Public read-only view of the ornaments on a tree (no tokens, no devices).
create or replace view public_ornaments as
  select id, brand, sender_name, design, hook, branch_of, created_at from cards where moderation = 'ok';

-- Security: the browser (anon key) can only READ brands, gifts and public_ornaments.
-- Everything else goes through the API routes, which use the service-role key on the server.
alter table brands enable row level security;
alter table cards enable row level security;
alter table opens enable row level security;
alter table gifts enable row level security;
alter table wishes enable row level security;
alter table reminders enable row level security;
drop policy if exists "brands are public" on brands;
create policy "brands are public" on brands for select using (true);
drop policy if exists "gifts are public" on gifts;
create policy "gifts are public" on gifts for select using (true);
revoke all on cards, opens, wishes, reminders from anon, authenticated;
grant select on public_ornaments to anon, authenticated;
revoke execute on function record_open(text, text, boolean) from public, anon, authenticated;

-- Live feed: new gifts are pushed to everyone looking at the tree (Supabase Realtime).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table gifts; exception when duplicate_object then null; end;
  end if;
end $$;

-- Trees. MosaicAds goes live once the charity agreement is signed (set agreement_signed_at, then status = 'live').
insert into brands (slug, name, charity_name, charity_reg, per_gift_pence, cap_pence, starts_at, ends_at, status)
values ('mosaicads', 'MosaicAds', 'a UK food charity', null, 10, 50000, '2026-12-01', '2026-12-31', 'draft')
on conflict (slug) do nothing;
