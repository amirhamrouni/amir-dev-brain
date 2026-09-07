-- English Twin / Open Brain logical language namespace
-- Approved by Amir on 2026-09-07.
-- One canonical Open Brain database; language separation is enforced by physical namespace columns
-- and hard pre-filtering before vector similarity ranking.

ALTER TABLE public.thoughts
  ADD COLUMN IF NOT EXISTS target_language TEXT NULL,
  ADD COLUMN IF NOT EXISTS memory_scope TEXT NOT NULL DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS cross_language BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.thoughts.target_language IS
  'BCP-47-ish target language tag used as a hard retrieval namespace, e.g. en, nl, fr. NULL means legacy/unscoped and is never implicitly included in a language-scoped retrieval.';
COMMENT ON COLUMN public.thoughts.memory_scope IS
  'Logical memory workspace inside the single Open Brain database, e.g. english-twin, learner, council, global.';
COMMENT ON COLUMN public.thoughts.cross_language IS
  'Explicit opt-in allowing this thought to participate in another target-language retrieval when the caller also enables cross-language retrieval.';

-- Normalize language tags and permit legacy/core writers to pass namespace in metadata
-- without changing the upstream OB1 upsert_thought signature.
CREATE OR REPLACE FUNCTION public.sync_thought_language_namespace()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.metadata ? 'target_language' THEN
    NEW.target_language := NULLIF(lower(replace(trim(NEW.metadata->>'target_language'), '_', '-')), '');
  ELSIF NEW.target_language IS NOT NULL THEN
    NEW.target_language := NULLIF(lower(replace(trim(NEW.target_language), '_', '-')), '');
  END IF;

  IF NEW.metadata ? 'memory_scope' THEN
    NEW.memory_scope := COALESCE(NULLIF(lower(trim(NEW.metadata->>'memory_scope')), ''), 'global');
  ELSE
    NEW.memory_scope := COALESCE(NULLIF(lower(trim(NEW.memory_scope)), ''), 'global');
  END IF;

  IF NEW.metadata ? 'cross_language' THEN
    NEW.cross_language := CASE lower(trim(NEW.metadata->>'cross_language'))
      WHEN 'true' THEN TRUE
      WHEN '1' THEN TRUE
      WHEN 'yes' THEN TRUE
      ELSE FALSE
    END;
  ELSE
    NEW.cross_language := COALESCE(NEW.cross_language, FALSE);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_thought_language_namespace ON public.thoughts;
CREATE TRIGGER trg_sync_thought_language_namespace
BEFORE INSERT OR UPDATE OF target_language, memory_scope, cross_language, metadata
ON public.thoughts
FOR EACH ROW
EXECUTE FUNCTION public.sync_thought_language_namespace();

-- Indexes support namespace narrowing before vector ranking.
CREATE INDEX IF NOT EXISTS idx_thoughts_target_language_scope
  ON public.thoughts ((lower(target_language)), memory_scope)
  WHERE target_language IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_thoughts_cross_language_scope
  ON public.thoughts (memory_scope, created_at DESC)
  WHERE cross_language IS TRUE;

-- Additive RPC: keep upstream match_thoughts untouched for backwards compatibility.
-- MATERIALIZED makes the namespace candidate set explicit before pgvector distance work.
CREATE OR REPLACE FUNCTION public.match_thoughts_namespaced(
  query_embedding vector(1536),
  p_target_language TEXT,
  p_memory_scope TEXT DEFAULT NULL,
  p_include_cross_language BOOLEAN DEFAULT FALSE,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT,
  source TEXT,
  created_at TIMESTAMPTZ,
  target_language TEXT,
  memory_scope TEXT,
  cross_language BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  WITH namespace_filtered AS MATERIALIZED (
    SELECT t.*
    FROM public.thoughts t
    WHERE
      -- Hard language boundary. NULL/legacy rows do not leak into scoped retrieval.
      (
        lower(t.target_language) = lower(NULLIF(trim(p_target_language), ''))
        OR (p_include_cross_language IS TRUE AND t.cross_language IS TRUE)
      )
      AND (
        p_memory_scope IS NULL
        OR t.memory_scope = lower(NULLIF(trim(p_memory_scope), ''))
      )
      AND (filter = '{}'::jsonb OR t.metadata @> filter)
  )
  SELECT
    t.id,
    t.content,
    t.metadata,
    (1 - (t.embedding <=> query_embedding))::FLOAT AS similarity,
    t.source,
    t.created_at,
    t.target_language,
    t.memory_scope,
    t.cross_language
  FROM namespace_filtered t
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT GREATEST(match_count, 1);
$$;

COMMENT ON FUNCTION public.match_thoughts_namespaced(vector, TEXT, TEXT, BOOLEAN, FLOAT, INT, JSONB) IS
  'English Twin namespace retrieval: target_language/memory_scope are filtered before semantic vector ranking; cross-language memories require explicit opt-in on both stored thought and retrieval request.';
