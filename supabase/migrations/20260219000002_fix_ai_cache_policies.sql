-- Fix ai_research_cache: add UPDATE policy (required for upsert),
-- remove redundant index, add NOT NULL constraints on audit columns.

-- 1. Add UPDATE policy (upsert with onConflict requires UPDATE permission)
CREATE POLICY "ai_research_cache_update"
  ON public.ai_research_cache FOR UPDATE
  USING (organization_id = (SELECT public.get_user_org_id()))
  WITH CHECK (organization_id = (SELECT public.get_user_org_id()));

-- 2. Drop redundant index (UNIQUE constraint already creates an implicit index)
DROP INDEX IF EXISTS public.idx_ai_research_cache_lookup;

-- 3. Add NOT NULL constraints on audit columns
ALTER TABLE public.ai_research_cache
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN model_used SET NOT NULL,
  ALTER COLUMN prompt_version SET NOT NULL;
