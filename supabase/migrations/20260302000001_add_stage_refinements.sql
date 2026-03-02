-- Add stage_refinements JSONB column to playbooks
-- Stores AI-generated refinement items (gap fixes, redundancy fixes, improvements)
-- with user curation state (selected/deselected) and user prompt

ALTER TABLE public.playbooks ADD COLUMN IF NOT EXISTS stage_refinements JSONB;
