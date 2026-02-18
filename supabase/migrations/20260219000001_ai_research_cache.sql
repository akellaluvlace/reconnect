-- AI Research Cache: stores deep research results per org with 30-day TTL
CREATE TABLE public.ai_research_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cache_key text NOT NULL,
  search_params jsonb NOT NULL,
  results jsonb NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]',
  phase text NOT NULL DEFAULT 'deep' CHECK (phase IN ('quick', 'deep')),
  model_used text,
  prompt_version text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(organization_id, cache_key, phase)
);

ALTER TABLE public.ai_research_cache ENABLE ROW LEVEL SECURITY;

-- Org members can read their own org's cache
CREATE POLICY "ai_research_cache_select"
  ON public.ai_research_cache FOR SELECT
  USING (organization_id = (SELECT public.get_user_org_id()));

-- Org members can insert cache entries for their org
CREATE POLICY "ai_research_cache_insert"
  ON public.ai_research_cache FOR INSERT
  WITH CHECK (organization_id = (SELECT public.get_user_org_id()));

-- Org members can delete expired cache entries for their org
CREATE POLICY "ai_research_cache_delete"
  ON public.ai_research_cache FOR DELETE
  USING (organization_id = (SELECT public.get_user_org_id()));

-- Index for cache lookups
CREATE INDEX idx_ai_research_cache_lookup
  ON public.ai_research_cache (organization_id, cache_key, phase);

-- Index for cleanup of expired entries
CREATE INDEX idx_ai_research_cache_expiry
  ON public.ai_research_cache (expires_at);
