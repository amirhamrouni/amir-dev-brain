-- ST-004: Dev Brain Conflict Resolution Mechanism

ALTER TABLE public.thoughts
  ADD COLUMN IF NOT EXISTS conflict_source JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS resolution_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS blocked_action BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'thoughts_resolution_status_check'
      AND conrelid = 'public.thoughts'::regclass
  ) THEN
    ALTER TABLE public.thoughts
      ADD CONSTRAINT thoughts_resolution_status_check
      CHECK (resolution_status IS NULL OR resolution_status IN ('pending','resolved','amended'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_thoughts_resolution_status
  ON public.thoughts(resolution_status)
  WHERE resolution_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_thoughts_blocked_action
  ON public.thoughts(blocked_action)
  WHERE blocked_action = TRUE;

CREATE TABLE IF NOT EXISTS public.open_brain_metadata_cache (
  thought_id UUID PRIMARY KEY REFERENCES public.thoughts(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.invalidate_open_brain_metadata_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.superseded_by IS DISTINCT FROM NEW.superseded_by
     OR OLD.resolution_status IS DISTINCT FROM NEW.resolution_status THEN
    DELETE FROM public.open_brain_metadata_cache WHERE thought_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invalidate_open_brain_metadata_cache ON public.thoughts;
CREATE TRIGGER trg_invalidate_open_brain_metadata_cache
AFTER UPDATE OF superseded_by, resolution_status ON public.thoughts
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_open_brain_metadata_cache();

COMMENT ON COLUMN public.thoughts.conflict_source IS
  'ST-004: deterministic provenance for thoughts participating in an unresolved conflict.';
COMMENT ON COLUMN public.thoughts.resolution_status IS
  'ST-004: pending/resolved/amended conflict resolution state; NULL when no conflict resolution record exists.';
COMMENT ON COLUMN public.thoughts.blocked_action IS
  'ST-004: true only when deterministic governance rules classify a pending executable action as violating an approved decision.';
