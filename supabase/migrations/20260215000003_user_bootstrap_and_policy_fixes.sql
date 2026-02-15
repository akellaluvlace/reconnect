-- ============================================
-- H3: Auto-create user profile + org on signup
-- H5: Add missing ai_synthesis INSERT/UPDATE/DELETE policies
-- H6: Restrict audit_logs INSERT to own user_id
-- ============================================

-- ============================================
-- H3: Trigger to bootstrap user profile on signup
-- Creates a new organization + user record when
-- a new auth.users row is inserted.
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  org_slug TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  org_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]', '-', 'g'))
              || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.organizations (name, slug)
  VALUES (user_name || '''s Organization', org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, email, name, organization_id, role)
  VALUES (NEW.id, NEW.email, user_name, new_org_id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- H5: ai_synthesis — add INSERT/UPDATE/DELETE policies
-- ============================================
CREATE POLICY "Managers+ can create synthesis" ON public.ai_synthesis
  FOR INSERT WITH CHECK (
    public.candidate_belongs_to_user_org(candidate_id)
    AND public.is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can update synthesis" ON public.ai_synthesis
  FOR UPDATE USING (
    public.candidate_belongs_to_user_org(candidate_id)
    AND public.is_org_manager_or_admin()
  );

CREATE POLICY "Admins can delete synthesis" ON public.ai_synthesis
  FOR DELETE USING (
    public.candidate_belongs_to_user_org(candidate_id)
    AND public.is_org_admin()
  );

-- ============================================
-- H6: Restrict audit_logs INSERT — user can only
-- log actions attributed to themselves
-- ============================================
DROP POLICY "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    organization_id = public.get_user_org_id()
    AND user_id = (SELECT auth.uid())
  );
