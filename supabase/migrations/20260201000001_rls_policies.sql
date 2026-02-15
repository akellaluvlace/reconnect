-- ============================================
-- Rec+onnect MVP — RLS Policies
-- Multi-tenant isolation + role-based access
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_synthesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_org_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- ORGANIZATION POLICIES
-- ============================================
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (id = get_user_org_id());

CREATE POLICY "Admins can update own organization" ON organizations
  FOR UPDATE USING (id = get_user_org_id() AND is_org_admin());

-- ============================================
-- USER POLICIES
-- ============================================
CREATE POLICY "Users can view members of own org" ON users
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (organization_id = get_user_org_id() AND is_org_admin());

-- ============================================
-- PLAYBOOK POLICIES
-- ============================================
CREATE POLICY "Users can view org playbooks" ON playbooks
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Managers+ can create playbooks" ON playbooks
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can update playbooks" ON playbooks
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Admins can delete playbooks" ON playbooks
  FOR DELETE USING (organization_id = get_user_org_id() AND is_org_admin());

-- ============================================
-- INTERVIEW STAGES POLICIES
-- ============================================
CREATE POLICY "Users can view playbook stages" ON interview_stages
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "Managers+ can manage stages" ON interview_stages
  FOR ALL USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
    AND is_org_manager_or_admin()
  );

-- ============================================
-- CANDIDATES POLICIES
-- ============================================
CREATE POLICY "Users can view playbook candidates" ON candidates
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "Managers+ can manage candidates" ON candidates
  FOR ALL USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
    AND is_org_manager_or_admin()
  );

-- ============================================
-- INTERVIEWS POLICIES
-- ============================================
CREATE POLICY "Users can view org interviews" ON interviews
  FOR SELECT USING (
    candidate_id IN (
      SELECT c.id FROM candidates c
      JOIN playbooks p ON c.playbook_id = p.id
      WHERE p.organization_id = get_user_org_id()
    )
  );

CREATE POLICY "Managers+ can manage interviews" ON interviews
  FOR ALL USING (
    candidate_id IN (
      SELECT c.id FROM candidates c
      JOIN playbooks p ON c.playbook_id = p.id
      WHERE p.organization_id = get_user_org_id()
    )
    AND is_org_manager_or_admin()
  );

-- ============================================
-- FEEDBACK POLICIES (Blind until submitted)
-- ============================================
CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (interviewer_id = auth.uid());

CREATE POLICY "Managers can view all feedback" ON feedback
  FOR SELECT USING (is_org_manager_or_admin());

CREATE POLICY "Interviewers can submit feedback" ON feedback
  FOR INSERT WITH CHECK (interviewer_id = auth.uid());

CREATE POLICY "Users can update own feedback" ON feedback
  FOR UPDATE USING (interviewer_id = auth.uid());

-- ============================================
-- AI SYNTHESIS POLICIES
-- ============================================
CREATE POLICY "Managers+ can view synthesis" ON ai_synthesis
  FOR SELECT USING (
    candidate_id IN (
      SELECT c.id FROM candidates c
      JOIN playbooks p ON c.playbook_id = p.id
      WHERE p.organization_id = get_user_org_id()
    )
    AND is_org_manager_or_admin()
  );

-- ============================================
-- COLLABORATORS POLICIES
-- ============================================
CREATE POLICY "Users can view playbook collaborators" ON collaborators
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "Managers+ can manage collaborators" ON collaborators
  FOR ALL USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
    AND is_org_manager_or_admin()
  );

-- ============================================
-- SHARE LINKS POLICIES
-- ============================================
CREATE POLICY "Users can view playbook share links" ON share_links
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "Managers+ can manage share links" ON share_links
  FOR ALL USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
    AND is_org_manager_or_admin()
  );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (organization_id = get_user_org_id() AND is_org_admin());

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());
