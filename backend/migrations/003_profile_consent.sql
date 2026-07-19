alter table public.renter_sessions
  add column if not exists household_size integer not null default 3 check (household_size between 1 and 8),
  add column if not exists income_band integer not null default 60 check (income_band in (50, 60)),
  add column if not exists consent_version text,
  add column if not exists consented_at timestamptz;

create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.renter_sessions(id) on delete cascade,
  consent_version text not null,
  accepted boolean not null,
  created_at timestamptz not null default now()
);
