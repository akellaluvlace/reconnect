-- Add competitor_listings JSONB column to playbooks (same pattern as hiring_strategy, job_description)
ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS competitor_listings jsonb DEFAULT NULL;

COMMENT ON COLUMN public.playbooks.competitor_listings IS 'Cached competitor job listings from Tavily search, stored as JSONB array';
