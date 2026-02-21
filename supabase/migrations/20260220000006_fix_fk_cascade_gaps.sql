-- Fix FK cascade gaps discovered during hardening (cascade integrity tests)
-- interviews.stage_id and candidates.current_stage_id have no ON DELETE action
-- Without this, deleting a stage causes FK constraint errors

-- interviews.stage_id → SET NULL on delete (interview survives, just loses stage ref)
ALTER TABLE public.interviews
  DROP CONSTRAINT IF EXISTS interviews_stage_id_fkey,
  ADD CONSTRAINT interviews_stage_id_fkey
    FOREIGN KEY (stage_id) REFERENCES public.interview_stages(id) ON DELETE SET NULL;

-- candidates.current_stage_id → SET NULL on delete (candidate survives, loses stage ref)
ALTER TABLE public.candidates
  DROP CONSTRAINT IF EXISTS candidates_current_stage_id_fkey,
  ADD CONSTRAINT candidates_current_stage_id_fkey
    FOREIGN KEY (current_stage_id) REFERENCES public.interview_stages(id) ON DELETE SET NULL;
