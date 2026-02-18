-- ============================================
-- Migration #8: CMS Tables + Column Additions
-- ============================================
-- This migration covers 6 schema gaps:
--   SECTION 1: 7 CMS tables (org-scoped, admin-write, org-read)
--     1a. cms_skills         — Skills taxonomy
--     1b. cms_industries     — Industry categories
--     1c. cms_levels         — Job level definitions
--     1d. cms_stage_templates — Stage templates
--     1e. cms_questions      — Question bank
--     1f. cms_jd_templates   — JD templates
--     1g. cms_email_templates — Email templates (with updated_at)
--   SECTION 2: 5 column additions to existing tables
--     2a. playbooks.department
--     2b. interview_stages.description
--     2c. interviews.meet_link
--     2d. interviews.recording_consent_at
--     2e. users.notification_preferences
-- ============================================


-- ============================================
-- SECTION 1: CMS TABLES
-- ============================================


-- ============================================
-- 1a. Skills taxonomy
-- ============================================
CREATE TABLE IF NOT EXISTS public.cms_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.cms_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view skills" ON public.cms_skills
  FOR SELECT USING (
    organization_id = (SELECT public.get_user_org_id())
  );

CREATE POLICY "Admins can insert skills" ON public.cms_skills
  FOR INSERT WITH CHECK (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can update skills" ON public.cms_skills
  FOR UPDATE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can delete skills" ON public.cms_skills
  FOR DELETE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE INDEX IF NOT EXISTS idx_cms_skills_org
  ON public.cms_skills(organization_id);


-- ============================================
-- 1b. Industry categories
-- ============================================
CREATE TABLE IF NOT EXISTS public.cms_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.cms_industries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view industries" ON public.cms_industries
  FOR SELECT USING (
    organization_id = (SELECT public.get_user_org_id())
  );

CREATE POLICY "Admins can insert industries" ON public.cms_industries
  FOR INSERT WITH CHECK (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can update industries" ON public.cms_industries
  FOR UPDATE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can delete industries" ON public.cms_industries
  FOR DELETE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE INDEX IF NOT EXISTS idx_cms_industries_org
  ON public.cms_industries(organization_id);


-- ============================================
-- 1c. Job level definitions
-- ============================================
CREATE TABLE IF NOT EXISTS public.cms_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

ALTER TABLE public.cms_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view levels" ON public.cms_levels
  FOR SELECT USING (
    organization_id = (SELECT public.get_user_org_id())
  );

CREATE POLICY "Admins can insert levels" ON public.cms_levels
  FOR INSERT WITH CHECK (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can update levels" ON public.cms_levels
  FOR UPDATE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can delete levels" ON public.cms_levels
  FOR DELETE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE INDEX IF NOT EXISTS idx_cms_levels_org
  ON public.cms_levels(organization_id);


-- ============================================
-- 1d. Stage templates
-- ============================================
CREATE TABLE IF NOT EXISTS public.cms_stage_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  duration_minutes INTEGER,
  focus_areas JSONB DEFAULT '[]',
  suggested_questions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_stage_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view stage templates" ON public.cms_stage_templates
  FOR SELECT USING (
    organization_id = (SELECT public.get_user_org_id())
  );

CREATE POLICY "Admins can insert stage templates" ON public.cms_stage_templates
  FOR INSERT WITH CHECK (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can update stage templates" ON public.cms_stage_templates
  FOR UPDATE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can delete stage templates" ON public.cms_stage_templates
  FOR DELETE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE INDEX IF NOT EXISTS idx_cms_stage_templates_org
  ON public.cms_stage_templates(organization_id);


-- ============================================
-- 1e. Question bank
-- ============================================
CREATE TABLE IF NOT EXISTS public.cms_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  purpose TEXT,
  look_for JSONB DEFAULT '[]',
  category TEXT,
  stage_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view questions" ON public.cms_questions
  FOR SELECT USING (
    organization_id = (SELECT public.get_user_org_id())
  );

CREATE POLICY "Admins can insert questions" ON public.cms_questions
  FOR INSERT WITH CHECK (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can update questions" ON public.cms_questions
  FOR UPDATE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can delete questions" ON public.cms_questions
  FOR DELETE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE INDEX IF NOT EXISTS idx_cms_questions_org
  ON public.cms_questions(organization_id);


-- ============================================
-- 1f. JD templates
-- ============================================
CREATE TABLE IF NOT EXISTS public.cms_jd_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  style TEXT DEFAULT 'formal' CHECK (style IN ('formal', 'creative', 'concise')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_jd_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view JD templates" ON public.cms_jd_templates
  FOR SELECT USING (
    organization_id = (SELECT public.get_user_org_id())
  );

CREATE POLICY "Admins can insert JD templates" ON public.cms_jd_templates
  FOR INSERT WITH CHECK (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can update JD templates" ON public.cms_jd_templates
  FOR UPDATE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can delete JD templates" ON public.cms_jd_templates
  FOR DELETE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE INDEX IF NOT EXISTS idx_cms_jd_templates_org
  ON public.cms_jd_templates(organization_id);


-- ============================================
-- 1g. Email templates
-- ============================================
CREATE TABLE IF NOT EXISTS public.cms_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cms_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view email templates" ON public.cms_email_templates
  FOR SELECT USING (
    organization_id = (SELECT public.get_user_org_id())
  );

CREATE POLICY "Admins can insert email templates" ON public.cms_email_templates
  FOR INSERT WITH CHECK (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can update email templates" ON public.cms_email_templates
  FOR UPDATE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

CREATE POLICY "Admins can delete email templates" ON public.cms_email_templates
  FOR DELETE USING (
    organization_id = (SELECT public.get_user_org_id())
    AND public.is_org_admin()
  );

-- updated_at trigger (only cms_email_templates has updated_at)
CREATE TRIGGER set_cms_email_templates_updated_at
  BEFORE UPDATE ON public.cms_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_cms_email_templates_org
  ON public.cms_email_templates(organization_id);


-- ============================================
-- SECTION 2: COLUMN ADDITIONS
-- ============================================


-- ============================================
-- 2a. playbooks.department (Step 7 wizard needs it)
-- ============================================
ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS department TEXT;


-- ============================================
-- 2b. interview_stages.description
-- ============================================
ALTER TABLE public.interview_stages
  ADD COLUMN IF NOT EXISTS description TEXT;


-- ============================================
-- 2c. interviews.meet_link (Google Meet URL)
-- ============================================
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS meet_link TEXT;


-- ============================================
-- 2d. interviews.recording_consent_at
-- (per-interview GDPR consent timestamp)
-- ============================================
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS recording_consent_at TIMESTAMPTZ;


-- ============================================
-- 2e. users.notification_preferences
-- (per-user email notification toggles)
-- ============================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB
    DEFAULT '{"assigned": true, "feedback_submitted": true, "synthesis_ready": true, "reminders": true}';
