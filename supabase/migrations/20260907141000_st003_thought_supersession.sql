-- ST-003: Open Brain Memory Retrieval
-- Preserve supersession history without deleting stale thoughts.

ALTER TABLE public.thoughts
  ADD COLUMN IF NOT EXISTS superseded_by UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'thoughts_superseded_by_fkey'
      AND conrelid = 'public.thoughts'::regclass
  ) THEN
    ALTER TABLE public.thoughts
      ADD CONSTRAINT thoughts_superseded_by_fkey
      FOREIGN KEY (superseded_by)
      REFERENCES public.thoughts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_thoughts_superseded_by
  ON public.thoughts(superseded_by)
  WHERE superseded_by IS NOT NULL;

COMMENT ON COLUMN public.thoughts.superseded_by IS
  'ST-003: points to the newer thought that supersedes this thought; stale thoughts are retained for audit/history.';
