alter table public.documents
    add column if not exists safety_flags jsonb not null default '[]'::jsonb;

alter table public.extracted_fields
    add column if not exists note text;

create index if not exists idx_documents_session_uploaded
    on public.documents(session_id, uploaded_at desc);

create index if not exists idx_packets_session_generated
    on public.packets(session_id, generated_at desc);
