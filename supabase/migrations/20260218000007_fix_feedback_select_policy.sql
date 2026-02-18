-- ============================================
-- Migration #14: Fix feedback SELECT policy — add org scoping
-- ============================================
-- Bug: The feedback SELECT policy allows is_org_manager_or_admin()
-- WITHOUT org scoping, meaning any manager/admin in any org can
-- see ALL feedback across ALL organizations.
-- Fix: Add candidate_belongs_to_user_org() check for the manager path.
-- ============================================

DROP POLICY IF EXISTS "Users can view feedback" ON public.feedback;

CREATE POLICY "Users can view feedback" ON public.feedback
  FOR SELECT USING (
    interviewer_id = (SELECT auth.uid())
    OR (
      public.is_org_manager_or_admin()
      AND public.candidate_belongs_to_user_org(
        (SELECT candidate_id FROM public.interviews WHERE id = feedback.interview_id)
      )
    )
  );
