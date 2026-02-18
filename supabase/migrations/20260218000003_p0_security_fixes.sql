-- ============================================
-- Migration #10: P0 Security Fixes
-- ============================================
-- This migration fixes 4 critical security issues:
--   1. Collaborator RLS — magic-link users can access assigned data
--   2. Share links — remove cross-tenant data leak
--   3. FK cascade — enable GDPR user deletion
--   4. Transcript privacy — separate table, service-role only
-- ============================================


-- ============================================
-- SECTION 1: COLLABORATOR HELPER FUNCTION
-- ============================================
-- Checks if the current auth user is an active, non-expired
-- collaborator for the given playbook. SECURITY DEFINER bypasses
-- RLS on collaborators table to avoid circular policy evaluation.

CREATE OR REPLACE FUNCTION public.is_active_collaborator(p_playbook_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collaborators
    WHERE playbook_id = p_playbook_id
      AND email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
      AND accepted_at IS NOT NULL
      AND expires_at > now()
  )
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';


-- ============================================
-- SECTION 2: COLLABORATOR RLS POLICIES
-- ============================================
-- These are additive permissive SELECT policies.
-- They OR with existing org-member policies, so org members
-- keep full access while collaborators get scoped access.

-- 2a. Collaborators can view their own collaborator record
CREATE POLICY "Collaborators can view own record" ON public.collaborators
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
  );

-- 2b. Collaborators can view assigned playbooks
CREATE POLICY "Collaborators can view assigned playbooks" ON public.playbooks
  FOR SELECT USING (
    public.is_active_collaborator(id)
  );

-- 2c. Collaborators can view their assigned stages
-- If assigned_stages is NULL → see all stages in the playbook.
-- If assigned_stages has values → see only those specific stages.
CREATE POLICY "Collaborators can view assigned stages" ON public.interview_stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.playbook_id = interview_stages.playbook_id
        AND c.email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
        AND c.accepted_at IS NOT NULL
        AND c.expires_at > now()
        AND (c.assigned_stages IS NULL OR interview_stages.id = ANY(c.assigned_stages))
    )
  );

-- 2d. Collaborators can view candidates in assigned playbooks
-- Note: column-level filtering (first name + role only) is enforced
-- in the application layer, not here (RLS is row-level only).
CREATE POLICY "Collaborators can view assigned candidates" ON public.candidates
  FOR SELECT USING (
    public.is_active_collaborator(playbook_id)
  );

-- 2e. Collaborators can view interviews where they are the interviewer
CREATE POLICY "Collaborators can view own interviews" ON public.interviews
  FOR SELECT USING (
    interviewer_id = (SELECT auth.uid())
  );

-- 2f. Collaborators can submit feedback on their interviews
CREATE POLICY "Collaborators can submit feedback" ON public.feedback
  FOR INSERT WITH CHECK (
    interviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.candidates c ON i.candidate_id = c.id
      JOIN public.collaborators col ON col.playbook_id = c.playbook_id
      WHERE i.id = interview_id
        AND col.email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
        AND col.accepted_at IS NOT NULL
        AND col.expires_at > now()
        AND col.role = 'interviewer'
    )
  );

-- 2g. Collaborators can update their own feedback
CREATE POLICY "Collaborators can update own feedback" ON public.feedback
  FOR UPDATE USING (
    interviewer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.candidates c ON i.candidate_id = c.id
      JOIN public.collaborators col ON col.playbook_id = c.playbook_id
      WHERE i.id = interview_id
        AND col.email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
        AND col.accepted_at IS NOT NULL
        AND col.expires_at > now()
    )
  );


-- ============================================
-- SECTION 3: SHARE LINKS — REMOVE CROSS-TENANT LEAK
-- ============================================
-- Migration #9 merged two policies into:
--   playbook_belongs_to_user_org(playbook_id)
--   OR (is_active = true AND (expires_at IS NULL OR expires_at > now()))
--
-- The OR branch lets ANY authenticated user enumerate ALL active
-- share links across ALL orgs. This is a cross-tenant data leak.
--
-- Fix: Remove the public OR branch entirely. Token validation
-- happens server-side using the service_role key (bypasses RLS).

DROP POLICY IF EXISTS "Users can view share links" ON public.share_links;

CREATE POLICY "Org members can view share links" ON public.share_links
  FOR SELECT USING (
    public.playbook_belongs_to_user_org(playbook_id)
  );


-- ============================================
-- SECTION 4: FK CASCADE FOR GDPR USER DELETION
-- ============================================
-- When a user is deleted (GDPR right to erasure), FK constraints
-- with default RESTRICT block the DELETE. Fix: ON DELETE SET NULL
-- for reference columns, preserving linked records while allowing
-- the user row to be removed.

-- 4a. interviews.interviewer_id → SET NULL
ALTER TABLE public.interviews
  DROP CONSTRAINT IF EXISTS interviews_interviewer_id_fkey;
ALTER TABLE public.interviews
  ADD CONSTRAINT interviews_interviewer_id_fkey
  FOREIGN KEY (interviewer_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4b. interview_stages.assigned_interviewer_id → SET NULL
ALTER TABLE public.interview_stages
  DROP CONSTRAINT IF EXISTS interview_stages_assigned_interviewer_id_fkey;
ALTER TABLE public.interview_stages
  ADD CONSTRAINT interview_stages_assigned_interviewer_id_fkey
  FOREIGN KEY (assigned_interviewer_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4c. feedback.interviewer_id → make nullable + SET NULL
ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_interviewer_id_fkey;
ALTER TABLE public.feedback
  ALTER COLUMN interviewer_id DROP NOT NULL;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_interviewer_id_fkey
  FOREIGN KEY (interviewer_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4d. playbooks.created_by → make nullable + SET NULL
ALTER TABLE public.playbooks
  DROP CONSTRAINT IF EXISTS playbooks_created_by_fkey;
ALTER TABLE public.playbooks
  ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE public.playbooks
  ADD CONSTRAINT playbooks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4e. collaborators.invited_by → SET NULL
ALTER TABLE public.collaborators
  DROP CONSTRAINT IF EXISTS collaborators_invited_by_fkey;
ALTER TABLE public.collaborators
  ADD CONSTRAINT collaborators_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4f. share_links.created_by → SET NULL
ALTER TABLE public.share_links
  DROP CONSTRAINT IF EXISTS share_links_created_by_fkey;
ALTER TABLE public.share_links
  ADD CONSTRAINT share_links_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4g. audit_logs.user_id → SET NULL (keep logs, anonymize user)
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4h. org_drive_connections.connected_by → make nullable + SET NULL
ALTER TABLE public.org_drive_connections
  DROP CONSTRAINT IF EXISTS org_drive_connections_connected_by_fkey;
ALTER TABLE public.org_drive_connections
  ALTER COLUMN connected_by DROP NOT NULL;
ALTER TABLE public.org_drive_connections
  ADD CONSTRAINT org_drive_connections_connected_by_fkey
  FOREIGN KEY (connected_by) REFERENCES public.users(id) ON DELETE SET NULL;


-- ============================================
-- SECTION 5: TRANSCRIPT PRIVACY
-- ============================================
-- Spec: "Transcript stays server-side only"
-- Create a separate table with RLS enabled but NO policies.
-- Only accessible via service_role key (server-side API routes).
-- The interviews.transcript and interviews.transcript_metadata
-- columns are deprecated — do not use for new development.

CREATE TABLE IF NOT EXISTS public.interview_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(interview_id)
);

ALTER TABLE public.interview_transcripts ENABLE ROW LEVEL SECURITY;
-- No RLS policies intentionally.
-- Only accessible via service_role key (server-side API routes).
-- This ensures transcripts remain server-side only per EU AI Act.

CREATE INDEX IF NOT EXISTS idx_interview_transcripts_interview
  ON public.interview_transcripts(interview_id);

-- Mark deprecated columns
COMMENT ON COLUMN public.interviews.transcript
  IS 'DEPRECATED: Use interview_transcripts table. Server-side only.';
COMMENT ON COLUMN public.interviews.transcript_metadata
  IS 'DEPRECATED: Use interview_transcripts table. Server-side only.';
