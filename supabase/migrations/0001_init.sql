-- Athleon Arena — initial schema (Phase 1)
-- Single venue, single multi-use court at launch; architected for multi-court,
-- multi-sport, multi-venue. Adapted from the technical plan with client changes:
--   * no QR check-in / kiosk / venue hardware agent / devices / lights
--   * 3-way payments (online stub, bank transfer + proof, cash on arrival)
--   * ops manually confirms manual payments
--   * one capability token does roster + scoring
--   * persisted court display mode (headline | scorecard)

create extension if not exists btree_gist;       -- no-double-booking guarantee
create extension if not exists pgcrypto;          -- gen_random_uuid()

-- ============================================================================
-- Enums
-- ============================================================================
create type booking_status as enum (
  'pending_payment',      -- online checkout pending (gateway), 15-min hold
  'pending_verification', -- bank transfer awaiting ops verification of proof
  'reserved',             -- pay cash on arrival; holds until slot, no auto-expiry
  'confirmed',            -- payment confirmed (by gateway or ops)
  'checked_in',           -- ops marked the customer arrived
  'in_progress',          -- session running (auto at starts_at)
  'completed',            -- session ended
  'cancelled',
  'expired',              -- hold lapsed unpaid
  'no_show'               -- never arrived
);

create type booking_source as enum ('online', 'walk_in', 'ops');
create type payment_method  as enum ('online', 'bank_transfer', 'cash_on_arrival');
create type staff_role      as enum ('scorer', 'ops_manager', 'owner', 'admin');

-- ============================================================================
-- Venue topology & sports
-- ============================================================================
create table venues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  timezone   text not null default 'Asia/Karachi',
  -- bank details (for transfers), whatsapp number, phone, socials live here
  settings   jsonb not null default '{}',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- A sport is a ROW + a registered code module. Adding badminton = row + module.
create table sports (
  id            text primary key,        -- 'cricket' | 'futsal' | 'padel' | ...
  name          text not null,
  module_key    text not null,           -- key in the SportRegistry
  roster_schema jsonb not null,          -- {"roles":[...],"maxPlayers":8,"teamCount":2}
  display_order int  not null default 0,
  is_active     boolean not null default true
);

create table courts (
  id        uuid primary key default gen_random_uuid(),
  venue_id  uuid not null references venues(id) on delete cascade,
  name      text not null,
  surface   text,
  is_active boolean not null default true
);

create table court_sports (
  court_id           uuid not null references courts(id) on delete cascade,
  sport_id           text not null references sports(id),
  changeover_minutes int  not null default 0,
  primary key (court_id, sport_id)
);

create table court_schedules (
  id           uuid primary key default gen_random_uuid(),
  court_id     uuid not null references courts(id) on delete cascade,
  day_of_week  int  not null check (day_of_week between 0 and 6), -- 0=Sun
  opens        time not null,
  closes       time not null,
  slot_minutes int  not null default 60
);

create table court_blocks (
  id        uuid primary key default gen_random_uuid(),
  court_id  uuid not null references courts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  reason    text
);

-- ============================================================================
-- Pricing & memberships (owner-configurable rules)
-- ============================================================================
create table pricing_rules (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid references venues(id) on delete cascade,
  court_id       uuid references courts(id) on delete cascade,
  sport_id       text references sports(id),
  days_of_week   int[],
  time_from      time,
  time_to        time,
  price_per_slot numeric(10,2) not null,
  currency       text not null default 'PKR',
  label          text,
  priority       int  not null default 0,
  is_active      boolean not null default true
);

create table membership_plans (
  id                    text primary key,   -- 'silver' | 'gold' | 'elite'
  name                  text not null,
  monthly_price         numeric(10,2) not null,
  discount_pct          numeric(5,2)  not null default 0,
  free_practice_hours   int not null default 0,
  priority_booking_days int not null default 0,
  perks                 jsonb not null default '[]',
  display_order         int  not null default 0,
  is_active             boolean not null default true
);

-- ============================================================================
-- Customers, bookings, payments
-- ============================================================================
create table customers (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null unique,
  full_name  text,
  email      text,
  created_at timestamptz not null default now()
);

create table memberships (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  plan_id     text not null references membership_plans(id),
  starts_on   date not null,
  ends_on     date not null,
  status      text not null default 'active'  -- active | expired | cancelled
);

create table bookings (
  id               uuid primary key default gen_random_uuid(),
  venue_id         uuid not null references venues(id),
  court_id         uuid not null references courts(id),
  sport_id         text not null references sports(id),
  customer_id      uuid references customers(id),
  match_type       text not null default 'friendly',
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  status           booking_status not null default 'pending_payment',
  source           booking_source not null default 'online',
  payment_method   payment_method not null default 'cash_on_arrival',
  hold_expires_at  timestamptz,
  arrived_at       timestamptz,
  arrival_marked_by uuid,                    -- staff_users(id); FK added after that table
  amount_due       numeric(10,2) not null,
  currency         text not null default 'PKR',
  notes            text,
  management_token uuid not null unique default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  constraint valid_window check (ends_at > starts_at)
);

-- The hard guarantee: two live bookings can never overlap on the same court.
alter table bookings add constraint bookings_no_overlap
  exclude using gist (
    court_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending_payment','pending_verification','reserved',
                      'confirmed','checked_in','in_progress'));

create index bookings_court_time_idx on bookings (court_id, starts_at);
create index bookings_status_idx on bookings (status);
create index bookings_hold_idx on bookings (hold_expires_at) where hold_expires_at is not null;

create table payments (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references bookings(id) on delete cascade,
  provider     text not null,            -- 'easypaisa_jazzcash' | 'bank_transfer' | 'cash'
  provider_ref text,
  amount       numeric(10,2) not null,
  currency     text not null default 'PKR',
  status       text not null,            -- initiated | pending_verification | succeeded | failed | refunded
  method       text,                     -- card | wallet | bank | cash
  note         text,
  verified_by  uuid,                     -- staff_users(id)
  verified_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index payments_booking_idx on payments (booking_id);

-- Bank-transfer screenshots (Supabase Storage, private bucket)
create table payment_proofs (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references bookings(id) on delete cascade,
  storage_path text not null,
  note         text,
  uploaded_at  timestamptz not null default now()
);

-- ============================================================================
-- Teams, players, matches, events
-- ============================================================================
create table teams (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references bookings(id) on delete cascade,
  side          char(1) not null check (side in ('A','B')),
  name          text,
  captain_name  text,
  contact_phone text,
  logo_url      text,
  unique (booking_id, side)
);

create table players (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references teams(id) on delete cascade,
  name      text not null,
  jersey_no int,
  role      text,
  photo_url text,
  sort_order int not null default 0
);

create table matches (
  id         uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id) on delete cascade,
  sport_id   text not null references sports(id),
  format     jsonb not null,
  status     text not null default 'scheduled', -- scheduled | live | completed | abandoned
  result     jsonb,
  created_at timestamptz not null default now()
);

-- Event sourcing: the immutable truth of every match. Score is DERIVED.
create table match_events (
  id              bigint generated always as identity primary key,
  match_id        uuid not null references matches(id) on delete cascade,
  seq             int  not null,
  type            text not null,
  payload         jsonb not null default '{}',
  recorded_by     uuid,                          -- staff_users(id), null for token-scored
  recorded_via    text not null default 'staff', -- 'staff' | 'manage_token' | 'system'
  reverted_by_seq int,
  created_at      timestamptz not null default now(),
  unique (match_id, seq)
);
create index match_events_match_seq_idx on match_events (match_id, seq);

-- Persisted display mode for each court's big screen (truth row; broadcast = speed)
create table court_display_state (
  court_id   uuid primary key references courts(id) on delete cascade,
  mode       text not null default 'headline' check (mode in ('headline','scorecard')),
  match_id   uuid references matches(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Staff, flags, audit
-- ============================================================================
create table staff_users (
  id        uuid primary key,            -- == auth.users.id
  email     text not null unique,
  full_name text not null,
  role      staff_role not null,
  venue_id  uuid references venues(id),  -- null = all venues (owner/admin)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Deferred FKs now that staff_users exists
alter table bookings    add constraint bookings_arrival_marked_by_fkey
  foreign key (arrival_marked_by) references staff_users(id);
alter table payments    add constraint payments_verified_by_fkey
  foreign key (verified_by) references staff_users(id);
alter table match_events add constraint match_events_recorded_by_fkey
  foreign key (recorded_by) references staff_users(id);

create table feature_flags (
  key     text primary key,
  enabled boolean not null default false,
  config  jsonb not null default '{}'
);

create table audit_log (
  id         bigint generated always as identity primary key,
  actor      text not null,           -- 'staff:<id>' | 'customer:<id>' | 'system'
  action     text not null,
  entity     text not null,
  entity_id  text,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log (entity, created_at desc);

-- ============================================================================
-- Atomic event append (per-match seq under row lock — PostgREST has no client tx)
-- ============================================================================
create or replace function append_match_event(
  p_match_id     uuid,
  p_type         text,
  p_payload      jsonb,
  p_recorded_by  uuid,
  p_recorded_via text
) returns match_events
language plpgsql
as $$
declare
  v_seq int;
  v_row match_events;
begin
  -- serialize concurrent scorers on the same match
  perform 1 from matches where id = p_match_id for update;
  select coalesce(max(seq), 0) + 1 into v_seq from match_events where match_id = p_match_id;
  insert into match_events (match_id, seq, type, payload, recorded_by, recorded_via)
  values (p_match_id, v_seq, p_type, p_payload, p_recorded_by, p_recorded_via)
  returning * into v_row;
  return v_row;
end;
$$;

-- ============================================================================
-- Worker tick: expire holds, promote/complete sessions, mark no-shows.
-- Idempotent; safe to run every minute (pg_cron) or via POST /api/internal/tick.
-- ============================================================================
create or replace function athleon_tick() returns void
language plpgsql
as $$
begin
  -- 1. expire stale holds (online + bank transfer)
  update bookings set status = 'expired'
   where status in ('pending_payment','pending_verification')
     and hold_expires_at is not null
     and hold_expires_at < now();

  -- 2. promote checked-in sessions to in_progress at start time
  update bookings set status = 'in_progress'
   where status = 'checked_in' and starts_at <= now();

  -- 3. complete in-progress sessions at end time
  update bookings set status = 'completed'
   where status = 'in_progress' and ends_at <= now();

  -- abandon any still-live match whose booking just completed
  update matches m set status = 'abandoned'
   where m.status = 'live'
     and exists (select 1 from bookings b
                  where b.id = m.booking_id and b.status = 'completed');

  -- 4. no-shows: reserved/confirmed sessions that ended without arrival
  update bookings set status = 'no_show'
   where status in ('reserved','confirmed')
     and ends_at <= now()
     and arrived_at is null;
end;
$$;

-- Best-effort: schedule the tick every minute if pg_cron is available.
do $$
begin
  perform 1 from pg_extension where extname = 'pg_cron';
  if found then
    perform cron.schedule('athleon-tick', '* * * * *', $cron$select athleon_tick();$cron$);
  end if;
exception when others then
  -- pg_cron not enabled; the /api/internal/tick endpoint covers this in dev.
  null;
end;
$$;

-- ============================================================================
-- Storage buckets
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', false),
       ('payment-proofs', 'payment-proofs', false),
       ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- ============================================================================
-- RLS: enable on every table, define NO anon/authenticated policies.
-- All access flows through Next.js route handlers using the service-role key,
-- which bypasses RLS. This is the single-app posture; per-role RLS can be
-- layered later without touching app code.
-- ============================================================================
alter table venues               enable row level security;
alter table sports               enable row level security;
alter table courts               enable row level security;
alter table court_sports         enable row level security;
alter table court_schedules      enable row level security;
alter table court_blocks         enable row level security;
alter table pricing_rules        enable row level security;
alter table membership_plans     enable row level security;
alter table customers            enable row level security;
alter table memberships          enable row level security;
alter table bookings             enable row level security;
alter table payments             enable row level security;
alter table payment_proofs       enable row level security;
alter table teams                enable row level security;
alter table players              enable row level security;
alter table matches              enable row level security;
alter table match_events         enable row level security;
alter table court_display_state  enable row level security;
alter table staff_users          enable row level security;
alter table feature_flags        enable row level security;
alter table audit_log            enable row level security;
