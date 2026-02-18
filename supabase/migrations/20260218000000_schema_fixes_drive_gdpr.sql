-- ============================================
-- Migration #7: Schema fixes, Drive integration, GDPR
-- ============================================
-- This migration covers:
--   1. Missing indexes (8) for common query patterns
--   2. Ratings CHECK constraint enforcing 1-4 range
--   3. Fix feedback INSERT policy — add org membership check
--   4. Fix feedback UPDATE policy — add org membership check
--   5. Share link public validation policy (anonymous access)
--   6. Fix handle_new_user() slug for non-ASCII names (Irish fadas)
--   7. Drive integration table + interview/candidate columns
--   8. Indexes for new Drive/GDPR columns
-- ============================================


-- ============================================
-- 1. MISSING INDEXES
-- Performance indexes for common JOIN/WHERE patterns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_interviews_stage
  ON public.interviews(stage_id);

CREATE INDEX IF NOT EXISTS idx_interviews_interviewer
  ON public.interviews(interviewer_id);

CREATE INDEX IF NOT EXISTS idx_candidates_current_stage
  ON public.candidates(current_stage_id);

CREATE INDEX IF NOT EXISTS idx_ai_synthesis_candidate
  ON public.ai_synthesis(candidate_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_interview_stages_playbook
  ON public.interview_stages(playbook_id);

CREATE INDEX IF NOT EXISTS idx_collaborators_playbook
  ON public.collaborators(playbook_id);

CREATE INDEX IF NOT EXISTS idx_collaborators_email
  ON public.collaborators(email);


-- ============================================
-- 2. RATINGS CHECK CONSTRAINT (1-4, not 1-5)
-- Enforces that every score in the JSONB ratings
-- array is between 1 and 4 inclusive.
-- Uses a validation function (CHECK can't contain subqueries).
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_ratings_scores(ratings JSONB)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN ratings = '[]'::jsonb THEN true
    WHEN jsonb_array_length(ratings) = 0 THEN true
    ELSE (
      SELECT bool_and(
        (elem->>'score') IS NOT NULL
        AND (elem->>'score')::int BETWEEN 1 AND 4
      )
      FROM jsonb_array_elements(ratings) AS elem
    )
  END;
$$ LANGUAGE sql IMMUTABLE SET search_path = '';

ALTER TABLE public.feedback
  ADD CONSTRAINT chk_ratings_scores CHECK (public.validate_ratings_scores(ratings));


-- ============================================
-- 3. FIX FEEDBACK INSERT POLICY
-- Add org membership check to prevent cross-tenant
-- writes. An interviewer must belong to the same
-- org as the candidate being interviewed.
-- ============================================

DROP POLICY IF EXISTS "Interviewers can submit feedback" ON public.feedback;

CREATE POLICY "Interviewers can submit feedback" ON public.feedback
  FOR INSERT WITH CHECK (
    interviewer_id = (SELECT auth.uid())
    AND public.candidate_belongs_to_user_org(
      (SELECT candidate_id FROM public.interviews WHERE id = interview_id)
    )
  );


-- ============================================
-- 4. FIX FEEDBACK UPDATE POLICY
-- Same org membership check for updates.
-- ============================================

DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;

CREATE POLICY "Users can update own feedback" ON public.feedback
  FOR UPDATE USING (
    interviewer_id = (SELECT auth.uid())
    AND public.candidate_belongs_to_user_org(
      (SELECT candidate_id FROM public.interviews WHERE id = interview_id)
    )
  );


-- ============================================
-- 5. SHARE LINK PUBLIC VALIDATION POLICY
-- Allows anonymous users (via magic link auth or
-- public token check) to validate that a share
-- link exists, is active, and not expired.
-- ============================================

DROP POLICY IF EXISTS "Anyone can validate active share link" ON public.share_links;
CREATE POLICY "Anyone can validate active share link" ON public.share_links
  FOR SELECT USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));


-- ============================================
-- 6. FIX handle_new_user() SLUG
-- The previous regex '[^a-zA-Z0-9]' did not use
-- the '+' quantifier, producing slugs like
-- 'sean-o--brien' for names with consecutive
-- special chars. Also did not strip leading/
-- trailing hyphens or handle empty slugs
-- (e.g., a name that is entirely non-ASCII).
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  org_slug TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Strip non-ASCII and non-alphanumeric chars, collapse runs to single hyphen
  org_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]+', '-', 'g'));
  -- Remove leading/trailing hyphens
  org_slug := regexp_replace(org_slug, '^-+|-+$', '', 'g');
  -- Fallback if slug is empty (e.g., entirely non-ASCII name like "Seán")
  IF org_slug = '' THEN
    org_slug := 'org';
  END IF;
  -- Append UUID fragment for uniqueness
  org_slug := org_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.organizations (name, slug)
  VALUES (user_name || '''s Organization', org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, email, name, organization_id, role)
  VALUES (NEW.id, NEW.email, user_name, new_org_id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- ============================================
-- 7. DRIVE INTEGRATION TABLES & COLUMNS
-- ============================================

-- Org-level Google Drive connection
-- One account per org, admin connects once.
-- All interview recordings stored on Drive.
-- AI pipeline (Whisper -> Claude) pulls from Drive.
CREATE TABLE IF NOT EXISTS public.org_drive_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  drive_root_folder_id TEXT,
  connected_by UUID NOT NULL REFERENCES public.users(id),
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.org_drive_connections ENABLE ROW LEVEL SECURITY;

-- Per-operation policies (no FOR ALL per project rules)
CREATE POLICY "Admins can view drive connection" ON public.org_drive_connections
  FOR SELECT USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can insert drive connection" ON public.org_drive_connections
  FOR INSERT WITH CHECK (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can update drive connection" ON public.org_drive_connections
  FOR UPDATE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can delete drive connection" ON public.org_drive_connections
  FOR DELETE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

-- Extend interviews table with Drive metadata
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS recording_status TEXT DEFAULT 'pending'
    CHECK (recording_status IN ('pending', 'uploading', 'uploaded', 'transcribing', 'completed', 'failed'));

-- GDPR: retention tracking on candidates
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS retained_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gdpr_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gdpr_deletion_requested_at TIMESTAMPTZ;

-- Apply updated_at trigger to new table
CREATE TRIGGER set_org_drive_connections_updated_at
  BEFORE UPDATE ON public.org_drive_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================
-- 8. INDEXES FOR NEW COLUMNS
-- Partial indexes to avoid indexing NULLs
-- ============================================

CREATE INDEX IF NOT EXISTS idx_interviews_drive_file
  ON public.interviews(drive_file_id)
  WHERE drive_file_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_retained_until
  ON public.candidates(retained_until)
  WHERE retained_until IS NOT NULL;
