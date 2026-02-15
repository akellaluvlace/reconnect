-- Fix: Wrap auth.uid() in (SELECT auth.uid()) so it evaluates once per query, not per row
-- Add missing index on feedback.interviewer_id

-- Index for feedback lookups by interviewer
CREATE INDEX idx_feedback_interviewer ON public.feedback(interviewer_id);

-- ============================================
-- USERS — fix update policy
-- ============================================
DROP POLICY "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- ============================================
-- FEEDBACK — fix all 3 policies
-- ============================================
DROP POLICY "Users can view feedback" ON public.feedback;
CREATE POLICY "Users can view feedback" ON public.feedback
  FOR SELECT USING (
    interviewer_id = (SELECT auth.uid())
    OR public.is_org_manager_or_admin()
  );

DROP POLICY "Interviewers can submit feedback" ON public.feedback;
CREATE POLICY "Interviewers can submit feedback" ON public.feedback
  FOR INSERT WITH CHECK (interviewer_id = (SELECT auth.uid()));

DROP POLICY "Users can update own feedback" ON public.feedback;
CREATE POLICY "Users can update own feedback" ON public.feedback
  FOR UPDATE USING (interviewer_id = (SELECT auth.uid()));
