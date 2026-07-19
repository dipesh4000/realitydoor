alter table public.renter_sessions
  add column if not exists program_selected boolean not null default false;
