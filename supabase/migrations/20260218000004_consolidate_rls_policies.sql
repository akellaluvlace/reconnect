-- ============================================
-- Migration #11: Consolidate Duplicate RLS Policies
-- ============================================
-- Supabase Performance Advisor: 28 "Multiple Permissive Policies" warnings.
-- Root cause: Tables have 2 permissive policies for the same operation
-- (org-member policy + collaborator policy). PostgreSQL ORs all permissive
-- policies, which is correct but triggers performance warnings.
--
-- Fix: Merge each pair into ONE policy per operation using OR conditions.
--
-- Affected tables and operations:
--   playbooks:        2 SELECT → 1
--   candidates:       2 SELECT → 1
--   collaborators:    2 SELECT → 1
--   interview_stages: 2 SELECT → 1
--   interviews:       2 SELECT → 1
--   feedback:         2 INSERT → 1, 2 UPDATE → 1
-- ============================================


-- ============================================
-- 1. PLAYBOOKS — merge 2 SELECT into 1
-- ============================================
DROP POLICY IF EXISTS "Users can view org playbooks" ON public.playbooks;
DROP POLICY IF EXISTS "Collaborators can view assigned playbooks" ON public.playbooks;

CREATE POLICY "Users can view playbooks" ON public.playbooks
  FOR SELECT USING (
    organization_id = (SELECT public.get_user_org_id())
    OR public.is_active_collaborator(id)
  );


-- ============================================
-- 2. CANDIDATES — merge 2 SELECT into 1
-- ============================================
DROP POLICY IF EXISTS "Users can view playbook candidates" ON public.candidates;
DROP POLICY IF EXISTS "Collaborators can view assigned candidates" ON public.candidates;

CREATE POLICY "Users can view candidates" ON public.candidates
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM public.playbooks WHERE organization_id = (SELECT public.get_user_org_id()))
    OR public.is_active_collaborator(playbook_id)
  );


-- ============================================
-- 3. COLLABORATORS — merge 2 SELECT into 1
-- ============================================
DROP POLICY IF EXISTS "Users can view playbook collaborators" ON public.collaborators;
DROP POLICY IF EXISTS "Collaborators can view own record" ON public.collaborators;

CREATE POLICY "Users can view collaborators" ON public.collaborators
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM public.playbooks WHERE organization_id = (SELECT public.get_user_org_id()))
    OR email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
  );


-- ============================================
-- 4. INTERVIEW_STAGES — merge 2 SELECT into 1
-- ============================================
DROP POLICY IF EXISTS "Users can view playbook stages" ON public.interview_stages;
DROP POLICY IF EXISTS "Collaborators can view assigned stages" ON public.interview_stages;

CREATE POLICY "Users can view stages" ON public.interview_stages
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM public.playbooks WHERE organization_id = (SELECT public.get_user_org_id()))
    OR EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.playbook_id = interview_stages.playbook_id
        AND c.email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
        AND c.accepted_at IS NOT NULL
        AND c.expires_at > now()
        AND (c.assigned_stages IS NULL OR interview_stages.id = ANY(c.assigned_stages))
    )
  );


-- ============================================
-- 5. INTERVIEWS — merge 2 SELECT into 1
-- ============================================
DROP POLICY IF EXISTS "Users can view org interviews" ON public.interviews;
DROP POLICY IF EXISTS "Collaborators can view own interviews" ON public.interviews;

CREATE POLICY "Users can view interviews" ON public.interviews
  FOR SELECT USING (
    candidate_id IN (
      SELECT c.id FROM public.candidates c
      JOIN public.playbooks p ON c.playbook_id = p.id
      WHERE p.organization_id = (SELECT public.get_user_org_id())
    )
    OR interviewer_id = (SELECT auth.uid())
  );


-- ============================================
-- 6. FEEDBACK — merge 2 INSERT into 1, 2 UPDATE into 1
-- (SELECT is already single policy from migration #10)
-- ============================================

-- 6a. INSERT: merge org-member + collaborator
DROP POLICY IF EXISTS "Interviewers can submit feedback" ON public.feedback;
DROP POLICY IF EXISTS "Collaborators can submit feedback" ON public.feedback;

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
          AND col.email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
          AND col.accepted_at IS NOT NULL
          AND col.expires_at > now()
          AND col.role = 'interviewer'
      )
    )
  );

-- 6b. UPDATE: merge org-member + collaborator
DROP POLICY IF EXISTS "Users can update own feedback" ON public.feedback;
DROP POLICY IF EXISTS "Collaborators can update own feedback" ON public.feedback;

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
          AND col.email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
          AND col.accepted_at IS NOT NULL
          AND col.expires_at > now()
      )
    )
  );
