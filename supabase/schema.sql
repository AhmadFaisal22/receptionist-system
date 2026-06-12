-- ============================================================
-- SEG Solar visitor log — Supabase schema + security policies
-- Run this in the Supabase SQL editor when moving off demo mode.
--
-- Security model:
--   * The Next.js server is the ONLY database client, using the
--     service_role key (server-side env var, never NEXT_PUBLIC_).
--   * RLS is ENABLED on every table with NO policies for anon or
--     authenticated roles => deny-by-default for any leaked anon key.
--   * service_role bypasses RLS by design.
-- ============================================================

create extension if not exists pgcrypto;

-- Sequential, human-readable visit numbers: SEG-0001, SEG-0002, …
create sequence if not exists visit_code_seq start 1;

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  department text not null check (char_length(department) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    default 'SEG-' || lpad(nextval('visit_code_seq')::text, 4, '0'),
  status text not null default 'pending'
    check (status in ('pending', 'checked_in', 'checked_out')),
  name text not null check (char_length(name) between 2 and 80),
  institution text not null check (char_length(institution) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 20),
  -- A preset chip value (meeting/delivery/…) or free text typed under "Other".
  purpose text not null check (char_length(purpose) between 2 and 120),
  host_id uuid references employees (id) on delete set null,
  host_name text not null check (char_length(host_name) between 2 and 80),
  host_department text not null default '',
  -- Data URLs (selfie ~200 KB after client-side downscale, signature ~20 KB).
  -- Migrate to Storage buckets + signed URLs if volume ever makes this heavy.
  photo_data text check (photo_data is null or photo_data like 'data:image/%'),
  signature_data text not null check (signature_data like 'data:image/png;base64,%'),
  lang text not null default 'id' check (lang in ('id', 'en', 'zh')),
  -- Secret held only by the visitor's device; authorizes self check-out.
  exit_token uuid not null default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  submitted_date date not null default ((now() at time zone 'Asia/Jakarta')::date),
  checkin_at timestamptz,
  checkout_at timestamptz,
  checkout_method text check (checkout_method in ('qr', 'staff', 'auto'))
);

create index if not exists visits_submitted_date_idx on visits (submitted_date);
create index if not exists visits_exit_token_idx on visits (exit_token);
create index if not exists visits_status_idx on visits (status);

-- ------------------------------------------------------------
-- Row Level Security: enabled, deny-by-default.
-- No policies are created for anon/authenticated on purpose:
-- with RLS enabled and zero policies, those roles can do NOTHING,
-- so a leaked anon key exposes no visitor data (names, phones,
-- photos, signatures are personal data under Indonesia's UU PDP).
-- ------------------------------------------------------------
alter table employees enable row level security;
alter table visits enable row level security;

-- If you ever move the check-in INSERT into the browser (anon key),
-- scope it tightly — and NEVER add a SELECT policy on visits for anon
-- (it would leak exit tokens and personal data). Example only:
--   create policy "anon can check in"
--     on visits for insert to anon
--     with check (
--       status = 'pending'
--       and checkin_at is null and checkout_at is null
--     );
--   create policy "anon can read active employee names"
--     on employees for select to anon
--     using (active = true);

-- ------------------------------------------------------------
-- Auto-close visits left open from previous days (flagged 'auto'
-- so the log book stays honest for audits).
-- ------------------------------------------------------------
create or replace function auto_close_stale()
returns void
language sql
security definer
set search_path = public
as $$
  update visits
  set status = 'checked_out',
      checkout_at = (submitted_date::timestamp + time '23:59') at time zone 'Asia/Jakarta',
      checkout_method = 'auto'
  where status <> 'checked_out'
    and submitted_date < (now() at time zone 'Asia/Jakarta')::date;
$$;

revoke execute on function auto_close_stale() from public, anon, authenticated;

-- ------------------------------------------------------------
-- Delete visitor selfies older than the retention window.
-- Personal data under Indonesia's UU PDP — keep the photo only as
-- long as needed. The rest of the log row (name, signature, times)
-- is retained for the audit trail.
-- ------------------------------------------------------------
create or replace function purge_expired_photos(retention_days int default 30)
returns void
language sql
security definer
set search_path = public
as $$
  update visits
  set photo_data = null
  where photo_data is not null
    and submitted_at < now() - make_interval(days => retention_days);
$$;

revoke execute on function purge_expired_photos(int) from public, anon, authenticated;

-- Optional: run nightly without app traffic (Supabase pg_cron).
--   select cron.schedule('auto-close-visits', '5 0 * * *', 'select auto_close_stale()');
--   select cron.schedule('purge-photos', '15 0 * * *', 'select purge_expired_photos(30)');

-- Seed the employee directory (edit to your real staff, or use /admin).
insert into employees (name, department) values
  ('Rina Wijaya', 'HR'),
  ('Andi Prasetyo', 'Warehouse'),
  ('Hartono', 'QA'),
  ('Dian Putri', 'Finance'),
  ('Slamet Riyadi', 'Production'),
  ('Mei Lin', 'Engineering')
on conflict do nothing;
