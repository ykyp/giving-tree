-- The Giving Tree: every table. Run with `supabase db push`.
-- Design: specs/002-production-launch/data-model.md. Times are milliseconds since 1970 (bigint), as the rules use them.
-- Nothing here names a schema, so the same file builds a throwaway copy for the tests.

-- A tree: the global one, or a community's. Giving is a setting, off unless someone switches it on.
create table trees (
  slug text primary key check (slug ~ '^[a-z0-9-]{3,30}$'),
  kind text not null default 'community' check (kind in ('global', 'community')),
  name text not null check (char_length(name) between 1 and 40),
  published boolean not null default false,
  giving_enabled boolean not null default false,
  giving_status text not null default 'off' check (giving_status in ('off', 'live', 'paused', 'ended')),
  sponsor_name text,
  charity_name text,
  charity_reg text,
  per_gift_pence int check (per_gift_pence > 0),
  cap_pence int check (cap_pence > 0),
  given_pence int not null default 0 check (given_pence >= 0),
  starts_on date,
  ends_on date,
  agreement_signed boolean not null default false,
  payout text,
  created_at timestamptz not null default now(),
  constraint under_cap check (cap_pence is null or given_pence <= cap_pence),
  -- giving can only be on with every setting present and the charity agreement signed
  constraint giving_needs_everything check (giving_status = 'off' or (giving_enabled and agreement_signed
    and coalesce(sponsor_name, '') <> '' and coalesce(charity_name, '') <> '' and coalesce(charity_reg, '') <> ''
    and per_gift_pence is not null and cap_pence is not null))
);
create unique index one_global_tree on trees (kind) where kind = 'global';

-- A card is one person's ornament. `token` is their private Christmas link and is never sent to anyone else.
create table cards (
  id text primary key,
  token text not null unique,
  tree text not null references trees(slug),
  name text not null check (char_length(name) between 1 and 12),
  design smallint not null check (design between 0 and 7),
  hook smallint not null check (hook between 0 and 999),
  parent text references cards(id),              -- the card it was invited by: the branch it hangs on
  branch_name text check (char_length(branch_name) <= 28),
  device text not null,                          -- salted hash of the creator's device cookie
  hidden boolean not null default false,
  removed_at bigint,
  at bigint not null,
  seq bigserial unique                           -- order hung; the cursor for "what's new on the tree"
);
create index cards_tree_seq on cards (tree, seq desc);
create index cards_parent on cards (parent);

-- A wish for someone's ornament. Deleted on 1 February 2027.
create table wishes (
  id text primary key,
  card_id text not null references cards(id) on delete cascade,
  from_name text not null check (char_length(from_name) between 1 and 12),
  body text not null check (char_length(body) between 1 and 140),
  kind text not null check (kind in ('friend', 'self')),
  device text not null,
  status text not null default 'ok' check (status in ('ok', 'review', 'rejected')),
  opened boolean not null default false,
  reported boolean not null default false,
  at bigint not null
);
create index wishes_card on wishes (card_id, at);
create unique index one_wish_per_device on wishes (card_id, device) where kind = 'friend';
create unique index one_self_wish on wishes (card_id) where kind = 'self';
create index wishes_review on wishes (at) where status = 'review';

-- The first time a device opens a card. `counted` is only ever true on a tree with giving live.
create table opens (
  card_id text not null references cards(id) on delete cascade,
  device text not null,
  counted boolean not null default false,
  reason text,                                   -- own | off | paused | closed | cap
  at bigint not null,
  primary key (card_id, device)
);

-- The permanent record of every gift released. sum(amount_pence) for a tree always equals trees.given_pence.
create table gifts (
  id bigserial primary key,
  tree text not null references trees(slug),
  card_id text references cards(id) on delete set null,
  amount_pence int not null check (amount_pence > 0),
  name text not null,
  at bigint not null
);
create index gifts_tree on gifts (tree, id);

-- Counts for the measures. No device, no card.
create table events (
  id bigserial primary key,
  tree text not null references trees(slug),
  name text not null check (name in ('share_v1', 'share_v2', 'saved_calendar', 'saved_selfsend', 'saved_email', 'returned')),
  at bigint not null
);
create index events_tree on events (tree, name);
create table returned (card_id text primary key references cards(id) on delete cascade);

-- Optional reminder email (off at launch). Deleted on 1 February 2027.
create table reminders (
  token text primary key references cards(token) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  news boolean not null default false,
  tree text not null,
  sent boolean not null default false
);

-- The close-up picture a card's owner uploads for link previews.
create table previews (
  card_id text not null references cards(id) on delete cascade,
  kind text not null check (kind in ('invite', 'thanks')),
  jpeg_b64 text not null check (char_length(jpeg_b64) <= 280000),
  primary key (card_id, kind)
);

create table removals (id bigserial primary key, card_id text not null, note text, at bigint not null);
create table limits (key text primary key, count int not null);
create table operators (email text primary key, added_at timestamptz not null default now());

-- The browser never reads these tables: everything goes through the server. Row-level security with no policies
-- shuts out the public API keys completely.
alter table trees enable row level security;
alter table cards enable row level security;
alter table wishes enable row level security;
alter table opens enable row level security;
alter table gifts enable row level security;
alter table events enable row level security;
alter table returned enable row level security;
alter table reminders enable row level security;
alter table previews enable row level security;
alter table removals enable row level security;
alter table limits enable row level security;
alter table operators enable row level security;

-- The one tree every site starts with. Giving is off.
insert into trees (slug, kind, name, published) values ('global', 'global', 'The Giving Tree', true);
