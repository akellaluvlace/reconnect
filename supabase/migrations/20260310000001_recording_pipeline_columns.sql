-- ============================================================
-- Migration #30: Recording pipeline support columns
-- 1. interviews.calendar_event_id — Google Calendar event ID for update/delete
-- 2. interviews.transcript_doc_id — Google Docs transcript backup reference
-- 3. feedback.collaborator_id — links collaborator-submitted feedback
-- 4. platform_google_config.interview_calendar_id — dedicated interview calendar
-- ============================================================

-- 1. Calendar event tracking
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- 2. Google Docs transcript reference
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS transcript_doc_id TEXT;

-- 3. Collaborator feedback linkage
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feedback_collaborator
  ON public.feedback(collaborator_id) WHERE collaborator_id IS NOT NULL;

-- 4. Dedicated interview calendar ID
ALTER TABLE public.platform_google_config
  ADD COLUMN IF NOT EXISTS interview_calendar_id TEXT;
