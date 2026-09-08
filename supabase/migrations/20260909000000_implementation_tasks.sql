-- Amir Dev Brain — Decoupled Implementation Task Engine v1
-- PostgreSQL remains the authoritative source of truth for implementation tasks.

create table if not exists public.implementation_tasks (
  task_id text primary key,
  decision_id text not null references public.decisions(id) on delete restrict,
  decision_revision int not null default 1,
  decision_sha256 text not null,
  status text not null check (
    status in (
      'READY',
      'QUEUED',
      'DISPATCHED',
      'RUNNING',
      'CODING',
      'VERIFYING',
      'PR_CREATING',
      'PR_READY',
      'FAILED',
      'POLICY_BLOCKED'
    )
  ),
  repository text not null,
  base_ref text not null,
  branch_name text,
  pr_number int,
  pr_url text,
  scope_config jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint implementation_tasks_scope_config_is_object
    check (jsonb_typeof(scope_config) = 'object')
);

create index if not exists implementation_tasks_decision_id_idx
  on public.implementation_tasks(decision_id);

create index if not exists implementation_tasks_status_idx
  on public.implementation_tasks(status);

create index if not exists implementation_tasks_repository_idx
  on public.implementation_tasks(repository);

create index if not exists implementation_tasks_created_at_idx
  on public.implementation_tasks(created_at desc);

create or replace function public.touch_implementation_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_implementation_tasks_updated_at
  on public.implementation_tasks;

create trigger trg_touch_implementation_tasks_updated_at
before update on public.implementation_tasks
for each row
execute function public.touch_implementation_tasks_updated_at();

comment on table public.implementation_tasks is
  'Authoritative implementation tasks derived from approved Amir Dev Brain decisions.';

comment on column public.implementation_tasks.decision_id is
  'Required parent decision. Anonymous implementation tasks are forbidden.';

comment on column public.implementation_tasks.scope_config is
  'Execution scope configuration. Empty or invalid objects must fail closed in the dispatcher.';

comment on column public.implementation_tasks.idempotency_key is
  'Unique dispatch idempotency key used to prevent duplicate execution attempts.';
