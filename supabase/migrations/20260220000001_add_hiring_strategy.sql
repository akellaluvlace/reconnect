-- Migration #17: Add hiring_strategy JSONB column to playbooks
-- Part of Step 8: Discovery + Process Chapters

ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS hiring_strategy JSONB DEFAULT NULL;

COMMENT ON COLUMN public.playbooks.hiring_strategy IS
  'AI-generated hiring strategy: market classification, salary positioning, process speed, skills priority';
