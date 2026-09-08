-- Amir Dev Brain Memory v1
-- PostgreSQL is the source of truth. Qdrant is a derived semantic index only.

create table if not exists public.decisions (
  id text primary key,
  project text not null,
  title text not null,
  question text,
  synthesis text not null,
  state text not null check (
    state in (
      'ACTIVE',
      'REVIEW_DUE',
      'EVIDENCE_STALE',
      'REVALIDATING',
      'SUPERSEDED',
      'REVOKED'
    )
  ),
  approved_by text not null,
  approved_at timestamptz not null,
  council_version text,
  model_context jsonb not null default '[]'::jsonb,
  version_bindings jsonb not null default '[]'::jsonb,
  review_policy jsonb not null default '{"maxAgeDays":90,"reviewAfter":null,"triggers":[]}'::jsonb,
  supersedes text references public.decisions(id),
  vector_status text not null default 'PENDING' check (
    vector_status in ('PENDING', 'INDEXED', 'FAILED')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decisions_not_self_superseding check (supersedes is null or supersedes <> id),
  constraint decisions_model_context_is_array check (jsonb_typeof(model_context) = 'array'),
  constraint decisions_version_bindings_is_array check (jsonb_typeof(version_bindings) = 'array'),
  constraint decisions_review_policy_is_object check (jsonb_typeof(review_policy) = 'object')
);

create table if not exists public.evidence (
  id text primary key,
  project text not null,
  artifact_type text not null default 'EVIDENCE' check (artifact_type = 'EVIDENCE'),
  evidence_type text not null,
  title text not null,
  content text,
  locator text,
  content_hash text,
  status text not null default 'VALID' check (
    status in ('VALID', 'POTENTIALLY_STALE', 'STALE', 'REVALIDATING')
  ),
  captured_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint evidence_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint evidence_has_locator_or_hash_or_content check (
    nullif(btrim(coalesce(locator, '')), '') is not null
    or nullif(btrim(coalesce(content_hash, '')), '') is not null
    or nullif(btrim(coalesce(content, '')), '') is not null
  )
);

create table if not exists public.decision_evidence (
  decision_id text not null references public.decisions(id) on delete cascade,
  evidence_id text not null references public.evidence(id) on delete cascade,
  relation text not null check (relation in ('SUPPORTS', 'CONTRADICTS', 'REVALIDATES')),
  criticality text not null check (criticality in ('CRITICAL', 'SUPPORTING', 'CONTEXTUAL')),
  created_at timestamptz not null default now(),
  primary key (decision_id, evidence_id)
);

create index if not exists decisions_project_idx
  on public.decisions(project);

create index if not exists decisions_state_idx
  on public.decisions(state);

create index if not exists decisions_vector_status_idx
  on public.decisions(vector_status);

create index if not exists decisions_approved_at_idx
  on public.decisions(approved_at desc);

create index if not exists evidence_project_idx
  on public.evidence(project);

create index if not exists evidence_status_idx
  on public.evidence(status);

create index if not exists decision_evidence_evidence_id_idx
  on public.decision_evidence(evidence_id);

create or replace function public.touch_decisions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_decisions_updated_at on public.decisions;
create trigger trg_touch_decisions_updated_at
before update on public.decisions
for each row
execute function public.touch_decisions_updated_at();

comment on table public.decisions is
  'Authoritative Amir Dev Brain decisions. PostgreSQL is the source of truth.';

comment on column public.decisions.vector_status is
  'Derived Qdrant indexing state: PENDING, INDEXED, or FAILED. It never changes decision authority.';

comment on table public.evidence is
  'Inspectable raw evidence with preserved provenance, separate from findings and decisions.';

comment on table public.decision_evidence is
  'Relationship layer between authoritative decisions and supporting/contradicting/revalidating evidence.';
