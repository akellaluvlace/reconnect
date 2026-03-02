-- Fix: allow 'listings' phase in ai_research_cache
-- The competitor-listings route writes phase='listings' but the CHECK constraint
-- only allowed 'quick' | 'deep', causing silent cache write failures on every run.

ALTER TABLE public.ai_research_cache
  DROP CONSTRAINT ai_research_cache_phase_check;

ALTER TABLE public.ai_research_cache
  ADD CONSTRAINT ai_research_cache_phase_check
  CHECK (phase IN ('quick', 'deep', 'listings'));
