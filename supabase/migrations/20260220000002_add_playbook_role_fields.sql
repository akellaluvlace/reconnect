-- Migration #18: Add role-level fields to playbooks
-- These fields are collected during wizard Step 2 (Role Details)
-- and needed by all downstream AI pipelines (strategy, JD, stages, coverage).

ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL;

COMMENT ON COLUMN public.playbooks.level IS 'Seniority level (e.g., Junior, Mid, Senior, Lead, Director)';
COMMENT ON COLUMN public.playbooks.industry IS 'Industry sector (e.g., Technology, Finance, Healthcare)';
COMMENT ON COLUMN public.playbooks.skills IS 'Array of required skill tags, stored as JSONB string array';
COMMENT ON COLUMN public.playbooks.location IS 'Primary location for the role (e.g., Dublin, Remote Ireland)';
