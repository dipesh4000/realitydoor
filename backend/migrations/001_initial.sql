create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

create table if not exists public.renter_sessions (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    expires_at timestamptz not null,
    program text not null default 'LIHTC' check (program = 'LIHTC'),
    area_name text not null default 'Albany, GA MSA',
    fiscal_year integer not null default 2026,
    consent_version text,
    deleted_at timestamptz
);

create table if not exists public.official_sources (
    id text primary key,
    title text not null,
    publisher text not null,
    canonical_url text not null,
    program text not null,
    fiscal_year integer,
    effective_from date,
    retrieved_at timestamptz not null default now(),
    sha256 text not null,
    local_path text,
    metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.mtsp_limits (
    id bigint generated always as identity primary key,
    source_id text not null references public.official_sources(id),
    fiscal_year integer not null,
    area_name text not null,
    area_code text,
    income_band integer not null check (income_band between 20 and 80),
    household_size integer not null check (household_size between 1 and 8),
    income_limit integer not null check (income_limit >= 0),
    limit_type text not null default 'regular',
    effective_from date not null,
    unique (fiscal_year, area_name, income_band, household_size, limit_type)
);

create table if not exists public.rules (
    id text primary key,
    source_id text not null references public.official_sources(id),
    title text not null,
    category text not null,
    program text not null default 'LIHTC',
    fiscal_year integer,
    effective_from date,
    plain_english text not null,
    deterministic_spec jsonb,
    active boolean not null default true
);

create table if not exists public.rule_chunks (
    id bigint generated always as identity primary key,
    rule_id text references public.rules(id),
    source_id text not null references public.official_sources(id),
    page_number integer,
    section_reference text,
    content text not null,
    content_tsv tsvector generated always as (to_tsvector('english', content)) stored,
    embedding extensions.vector,
    metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.renter_sessions(id) on delete cascade,
    original_name text not null,
    storage_path text not null unique,
    mime_type text not null,
    size_bytes bigint not null check (size_bytes >= 0),
    sha256 text not null,
    document_type text not null default 'unknown',
    status text not null default 'uploaded',
    page_count integer,
    uploaded_at timestamptz not null default now(),
    processed_at timestamptz,
    error_code text
);

create table if not exists public.processing_jobs (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    status text not null default 'queued',
    attempts integer not null default 0,
    created_at timestamptz not null default now(),
    started_at timestamptz,
    completed_at timestamptz,
    error_message text
);

create table if not exists public.extracted_fields (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    field_name text not null,
    raw_value text,
    normalized_value jsonb,
    confidence numeric(5,4) not null check (confidence between 0 and 1),
    page_number integer,
    bounding_box jsonb,
    source_text text,
    status text not null default 'extracted',
    created_at timestamptz not null default now()
);

create table if not exists public.field_actions (
    id bigint generated always as identity primary key,
    field_id uuid not null references public.extracted_fields(id) on delete cascade,
    session_id uuid not null references public.renter_sessions(id) on delete cascade,
    action text not null,
    previous_value jsonb,
    new_value jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.calculations (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.renter_sessions(id) on delete cascade,
    method text not null,
    inputs jsonb not null,
    result numeric(14,2) not null,
    rule_id text not null,
    source_ids jsonb not null,
    created_at timestamptz not null default now()
);

create table if not exists public.checklist_requirements (
    id text primary key,
    program text not null,
    fiscal_year integer not null,
    document_type text not null,
    minimum_count integer not null default 1,
    max_age_days integer,
    applies_when jsonb not null default '{}'::jsonb,
    source_ids jsonb not null
);

create table if not exists public.readiness_issues (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.renter_sessions(id) on delete cascade,
    issue_type text not null,
    severity text not null,
    title text not null,
    description text,
    related_document_id uuid references public.documents(id) on delete cascade,
    rule_id text,
    resolved_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.packets (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.renter_sessions(id) on delete cascade,
    storage_path text not null unique,
    status text not null default 'generated',
    generated_at timestamptz not null default now(),
    expires_at timestamptz not null
);

create table if not exists public.deletion_events (
    id bigint generated always as identity primary key,
    session_id uuid,
    deleted_at timestamptz not null default now(),
    documents_deleted integer not null default 0,
    packets_deleted integer not null default 0,
    success boolean not null,
    request_id text
);

create index if not exists idx_sessions_expires_at on public.renter_sessions(expires_at);
create index if not exists idx_documents_session_id on public.documents(session_id);
create index if not exists idx_fields_document_id on public.extracted_fields(document_id);
create index if not exists idx_mtsp_lookup on public.mtsp_limits(fiscal_year, area_name, income_band, household_size);
create index if not exists idx_rule_chunks_fts on public.rule_chunks using gin(content_tsv);

alter table public.renter_sessions enable row level security;
alter table public.documents enable row level security;
alter table public.extracted_fields enable row level security;
alter table public.field_actions enable row level security;
alter table public.calculations enable row level security;
alter table public.readiness_issues enable row level security;
alter table public.packets enable row level security;

revoke all on public.renter_sessions from anon, authenticated;
revoke all on public.documents from anon, authenticated;
revoke all on public.extracted_fields from anon, authenticated;
revoke all on public.field_actions from anon, authenticated;
revoke all on public.calculations from anon, authenticated;
revoke all on public.readiness_issues from anon, authenticated;
revoke all on public.packets from anon, authenticated;

