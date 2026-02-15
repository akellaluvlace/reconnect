-- Fix: Set search_path on all SECURITY DEFINER functions
-- Prevents search_path hijacking attacks

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION is_org_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION playbook_belongs_to_user_org(pb_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.playbooks WHERE id = pb_id AND organization_id = public.get_user_org_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

CREATE OR REPLACE FUNCTION candidate_belongs_to_user_org(cand_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidates c
    JOIN public.playbooks p ON c.playbook_id = p.id
    WHERE c.id = cand_id AND p.organization_id = public.get_user_org_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';
