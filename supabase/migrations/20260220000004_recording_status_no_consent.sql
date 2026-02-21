-- ============================================
-- Migration #20: Add 'no_consent' to recording_status CHECK
-- ============================================
-- When candidate declines recording consent, recording is skipped.
-- Synthesis runs on feedback only (no transcript).
-- See docs/INTERVIEW_RECORDING_FLOW.md → Consent Gate Flow.
-- ============================================

ALTER TABLE public.interviews
  DROP CONSTRAINT IF EXISTS interviews_recording_status_check;

ALTER TABLE public.interviews
  ADD CONSTRAINT interviews_recording_status_check
  CHECK (recording_status IN ('pending', 'uploading', 'uploaded', 'transcribing', 'completed', 'failed', 'no_consent'));
