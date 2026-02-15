-- ============================================
-- Fix RLS policies:
-- 1. Replace FOR ALL with specific operations (eliminates overlapping permissive policies)
-- 2. Merge dual SELECT on feedback into single policy with OR
-- 3. Add helper function for playbook org check (reduces subquery repetition)
-- ============================================

-- Helper: check if a playbook belongs to the current user's org
CREATE OR REPLACE FUNCTION playbook_belongs_to_user_org(pb_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM playbooks WHERE id = pb_id AND organization_id = get_user_org_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if a candidate belongs to the current user's org
CREATE OR REPLACE FUNCTION candidate_belongs_to_user_org(cand_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM candidates c
    JOIN playbooks p ON c.playbook_id = p.id
    WHERE c.id = cand_id AND p.organization_id = get_user_org_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- INTERVIEW STAGES — replace FOR ALL
-- ============================================
DROP POLICY "Managers+ can manage stages" ON interview_stages;

CREATE POLICY "Managers+ can insert stages" ON interview_stages
  FOR INSERT WITH CHECK (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can update stages" ON interview_stages
  FOR UPDATE USING (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can delete stages" ON interview_stages
  FOR DELETE USING (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

-- Update SELECT to use helper too
DROP POLICY "Users can view playbook stages" ON interview_stages;
CREATE POLICY "Users can view playbook stages" ON interview_stages
  FOR SELECT USING (playbook_belongs_to_user_org(playbook_id));

-- ============================================
-- CANDIDATES — replace FOR ALL
-- ============================================
DROP POLICY "Managers+ can manage candidates" ON candidates;

CREATE POLICY "Managers+ can insert candidates" ON candidates
  FOR INSERT WITH CHECK (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can update candidates" ON candidates
  FOR UPDATE USING (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can delete candidates" ON candidates
  FOR DELETE USING (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

-- Update SELECT to use helper
DROP POLICY "Users can view playbook candidates" ON candidates;
CREATE POLICY "Users can view playbook candidates" ON candidates
  FOR SELECT USING (playbook_belongs_to_user_org(playbook_id));

-- ============================================
-- INTERVIEWS — replace FOR ALL
-- ============================================
DROP POLICY "Managers+ can manage interviews" ON interviews;

CREATE POLICY "Managers+ can insert interviews" ON interviews
  FOR INSERT WITH CHECK (
    candidate_belongs_to_user_org(candidate_id)
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can update interviews" ON interviews
  FOR UPDATE USING (
    candidate_belongs_to_user_org(candidate_id)
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can delete interviews" ON interviews
  FOR DELETE USING (
    candidate_belongs_to_user_org(candidate_id)
    AND is_org_manager_or_admin()
  );

-- Update SELECT to use helper
DROP POLICY "Users can view org interviews" ON interviews;
CREATE POLICY "Users can view org interviews" ON interviews
  FOR SELECT USING (candidate_belongs_to_user_org(candidate_id));

-- ============================================
-- FEEDBACK — merge dual SELECT into one policy
-- ============================================
DROP POLICY "Users can view own feedback" ON feedback;
DROP POLICY "Managers can view all feedback" ON feedback;

CREATE POLICY "Users can view feedback" ON feedback
  FOR SELECT USING (
    interviewer_id = auth.uid()
    OR is_org_manager_or_admin()
  );

-- ============================================
-- COLLABORATORS — replace FOR ALL
-- ============================================
DROP POLICY "Managers+ can manage collaborators" ON collaborators;

CREATE POLICY "Managers+ can insert collaborators" ON collaborators
  FOR INSERT WITH CHECK (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can update collaborators" ON collaborators
  FOR UPDATE USING (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can delete collaborators" ON collaborators
  FOR DELETE USING (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

-- Update SELECT to use helper
DROP POLICY "Users can view playbook collaborators" ON collaborators;
CREATE POLICY "Users can view playbook collaborators" ON collaborators
  FOR SELECT USING (playbook_belongs_to_user_org(playbook_id));

-- ============================================
-- SHARE LINKS — replace FOR ALL
-- ============================================
DROP POLICY "Managers+ can manage share links" ON share_links;

CREATE POLICY "Managers+ can insert share links" ON share_links
  FOR INSERT WITH CHECK (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can update share links" ON share_links
  FOR UPDATE USING (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can delete share links" ON share_links
  FOR DELETE USING (
    playbook_belongs_to_user_org(playbook_id)
    AND is_org_manager_or_admin()
  );

-- Update SELECT to use helper
DROP POLICY "Users can view playbook share links" ON share_links;
CREATE POLICY "Users can view playbook share links" ON share_links
  FOR SELECT USING (playbook_belongs_to_user_org(playbook_id));

-- ============================================
-- AI SYNTHESIS — update to use helper
-- ============================================
DROP POLICY "Managers+ can view synthesis" ON ai_synthesis;
CREATE POLICY "Managers+ can view synthesis" ON ai_synthesis
  FOR SELECT USING (
    candidate_belongs_to_user_org(candidate_id)
    AND is_org_manager_or_admin()
  );
