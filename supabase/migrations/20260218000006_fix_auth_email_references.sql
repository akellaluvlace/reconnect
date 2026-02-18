-- ============================================
-- Migration #13: Fix auth.users references in RLS policies
-- ============================================
-- Bug: RLS policies reference auth.users inline, but the
-- 'authenticated' role has no SELECT on auth.users.
-- Fix: Use auth.email() which reads from JWT claims.
-- Also update is_active_collaborator() for consistency.
-- ============================================


-- 1. Fix is_active_collaborator() — use auth.email() instead of auth.users lookup
CREATE OR REPLACE FUNCTION public.is_active_collaborator(p_playbook_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collaborators
    WHERE playbook_id = p_playbook_id
      AND email = (SELECT auth.email())
      AND accepted_at IS NOT NULL
      AND expires_at > now()
  )
$$ LANGUAGE sql SECURITY DEFINER SET search_path = '';


-- 2. Fix interview_stages SELECT policy
DROP POLICY IF EXISTS "Users can view stages" ON public.interview_stages;

CREATE POLICY "Users can view stages" ON public.interview_stages
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM public.playbooks WHERE organization_id = (SELECT public.get_user_org_id()))
    OR EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.playbook_id = interview_stages.playbook_id
        AND c.email = (SELECT auth.email())
        AND c.accepted_at IS NOT NULL
        AND c.expires_at > now()
        AND (c.assigned_stages IS NULL OR interview_stages.id = ANY(c.assigned_stages))
    )
  );


-- 3. Fix collaborators SELECT policy
DROP POLICY IF EXISTS "Users can view collaborators" ON public.collaborators;

CREATE POLICY "Users can view collaborators" ON public.collaborators
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM public.playbooks WHERE organization_id = (SELECT public.get_user_org_id()))
    OR email = (SELECT auth.email())
  );


-- 4. Fix feedback INSERT policy
DROP POLICY IF EXISTS "Interviewers can submit feedback" ON public.feedback;

CREATE POLICY "Interviewers can submit feedback" ON public.feedback
  FOR INSERT WITH CHECK (
    interviewer_id = (SELECT auth.uid())
    AND (
      public.candidate_belongs_to_user_org(
        (SELECT candidate_id FROM public.interviews WHERE id = interview_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.interviews i
        JOIN public.candidates c ON i.candidate_id = c.id
        JOIN public.collaborators col ON col.playbook_id = c.playbook_id
        WHERE i.id = interview_id
          AND col.email = (SELECT auth.email())
          AND col.accepted_at IS NOT NULL
          AND col.expires_at > now()
          AND col.role = 'interviewer'
      )
    )
  );


-- 5. Fix feedback UPDATE policy
DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;

CREATE POLICY "Users can update own feedback" ON public.feedback
  FOR UPDATE USING (
    interviewer_id = (SELECT auth.uid())
    AND (
      public.candidate_belongs_to_user_org(
        (SELECT candidate_id FROM public.interviews WHERE id = interview_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.interviews i
        JOIN public.candidates c ON i.candidate_id = c.id
        JOIN public.collaborators col ON col.playbook_id = c.playbook_id
        WHERE i.id = interview_id
          AND col.email = (SELECT auth.email())
          AND col.accepted_at IS NOT NULL
          AND col.expires_at > now()
      )
    )
  );
