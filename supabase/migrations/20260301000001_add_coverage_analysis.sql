-- Add coverage_analysis JSONB column to playbooks for persistence
ALTER TABLE public.playbooks
ADD COLUMN IF NOT EXISTS coverage_analysis JSONB;

COMMENT ON COLUMN public.playbooks.coverage_analysis IS 'AI-generated coverage analysis of interview stages vs job requirements';
