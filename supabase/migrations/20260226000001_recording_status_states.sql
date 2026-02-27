-- ============================================
-- Migration #25: Recording Status State Machine
-- ============================================
-- Updates CHECK constraint from 7 states to 11-state machine.
-- Adds pipeline audit log + retry budget columns.
-- See docs/plans/2026-02-23-recording-pipeline-design.md
-- ============================================

-- Migrate existing data BEFORE dropping constraint
UPDATE public.interviews SET recording_status = 'failed_recording'
  WHERE recording_status = 'failed';
UPDATE public.interviews SET recording_status = 'uploaded'
  WHERE recording_status = 'uploading';

-- Drop old constraint
ALTER TABLE public.interviews
  DROP CONSTRAINT IF EXISTS interviews_recording_status_check;

-- Add 11-state machine constraint
ALTER TABLE public.interviews
  ADD CONSTRAINT interviews_recording_status_check
  CHECK (recording_status IN (
    'scheduled',
    'pending',
    'uploaded',
    'transcribed',
    'synthesizing',
    'completed',
    'failed_recording',
    'failed_download',
    'failed_transcription',
    'failed_synthesis',
    'no_consent'
  ));

-- Pipeline audit log — every state transition appended here
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS pipeline_log JSONB[] DEFAULT '{}';

-- Retry budget — max 3 retries per failed state
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.interviews.pipeline_log IS 'Audit log of recording pipeline state transitions. Each entry: {from, to, ts, detail}';
COMMENT ON COLUMN public.interviews.retry_count IS 'Number of retry attempts for failed recording pipeline states. Max 3.';
