-- ============================================
-- Migration #29: Organization status for platform access control
-- ============================================
-- Adds status column to organizations ('active', 'pending', 'suspended').
-- Existing orgs default to 'active'. New signups get 'pending'.
-- Platform admin can activate/suspend orgs.
-- ============================================

-- 1. Add status column with default 'active' (safe for existing rows)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'pending', 'suspended'));

-- 2. Update handle_new_user() to create orgs with status = 'pending'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_name TEXT;
  org_slug TEXT;
BEGIN
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Strip non-ASCII and non-alphanumeric chars, collapse runs to single hyphen
  org_slug := lower(regexp_replace(user_name, '[^a-zA-Z0-9]+', '-', 'g'));
  -- Remove leading/trailing hyphens
  org_slug := regexp_replace(org_slug, '^-+|-+$', '', 'g');
  -- Fallback if slug is empty (e.g., entirely non-ASCII name like "Sean")
  IF org_slug = '' THEN
    org_slug := 'org';
  END IF;
  -- Append UUID fragment for uniqueness
  org_slug := org_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.organizations (name, slug, status)
  VALUES (user_name || '''s Organization', org_slug, 'pending')
  RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, email, name, organization_id, role)
  VALUES (NEW.id, NEW.email, user_name, new_org_id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. Index for quick status lookups
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
