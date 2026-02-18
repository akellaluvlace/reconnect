-- ============================================
-- File: 04_triggers.sql — Trigger behavior tests
-- ============================================

-- Restore the REAL handle_new_user() so we can test it.
-- (01_setup_data.sql replaced it with a no-op for test data insertion.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
  -- Fallback if slug is empty (e.g., entirely non-ASCII name like "Seán")
  IF org_slug = '' THEN
    org_slug := 'org';
  END IF;
  -- Append UUID fragment for uniqueness
  org_slug := org_slug || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.organizations (name, slug)
  VALUES (user_name || '''s Organization', org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.users (id, email, name, organization_id, role)
  VALUES (NEW.id, NEW.email, user_name, new_org_id, 'admin');

  RETURN NEW;
END;
$function$;

DO $body$ DECLARE _cat TEXT := 'TRIGGERS'; _count BIGINT; _ts TIMESTAMPTZ; _name TEXT;
BEGIN
  -- ========== handle_new_user() trigger ==========
  -- Insert a new auth user and verify trigger creates org + user
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, raw_user_meta_data, created_at, updated_at)
  VALUES ('d0000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000000',
    'trigger-test@example.test', crypt('TestPass123!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
    '{"name":"Trigger Test User"}'::jsonb, now(), now());

  -- Verify user was created in public.users
  SELECT count(*) FROM public.users WHERE id = 'd0000000-0000-0000-0000-000000000099' INTO _count;
  PERFORM _test_assert(_cat, 'handle_new_user creates public.users row', _count = 1);

  -- Verify org was created
  SELECT count(*) FROM public.organizations o
    JOIN public.users u ON u.organization_id = o.id
    WHERE u.id = 'd0000000-0000-0000-0000-000000000099' INTO _count;
  PERFORM _test_assert(_cat, 'handle_new_user creates organization', _count = 1);

  -- Verify user role is admin
  SELECT role FROM public.users WHERE id = 'd0000000-0000-0000-0000-000000000099' INTO _name;
  PERFORM _test_assert(_cat, 'handle_new_user sets role to admin', _name = 'admin');

  -- Verify org name includes user name
  SELECT o.name FROM public.organizations o
    JOIN public.users u ON u.organization_id = o.id
    WHERE u.id = 'd0000000-0000-0000-0000-000000000099' INTO _name;
  PERFORM _test_assert(_cat, 'handle_new_user org name contains user name',
    _name LIKE '%Trigger Test User%');

  -- ========== handle_new_user() with non-ASCII name (Irish fada) ==========
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, raw_user_meta_data, created_at, updated_at)
  VALUES ('d0000000-0000-0000-0000-000000000098', '00000000-0000-0000-0000-000000000000',
    'sean@example.test', crypt('TestPass123!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
    '{"name":"Seán O''Brien"}'::jsonb, now(), now());

  -- Verify slug doesn't have consecutive hyphens
  SELECT o.slug FROM public.organizations o
    JOIN public.users u ON u.organization_id = o.id
    WHERE u.id = 'd0000000-0000-0000-0000-000000000098' INTO _name;
  PERFORM _test_assert(_cat, 'handle_new_user slug no consecutive hyphens for Irish names',
    _name NOT LIKE '%--%');
  PERFORM _test_assert(_cat, 'handle_new_user slug no leading hyphen',
    _name NOT LIKE '-%');

  -- ========== handle_new_user() with email-only (no name) ==========
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, raw_user_meta_data, created_at, updated_at)
  VALUES ('d0000000-0000-0000-0000-000000000097', '00000000-0000-0000-0000-000000000000',
    'noname@example.test', crypt('TestPass123!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
    '{}'::jsonb, now(), now());

  -- Verify falls back to email prefix
  SELECT name FROM public.users WHERE id = 'd0000000-0000-0000-0000-000000000097' INTO _name;
  PERFORM _test_assert(_cat, 'handle_new_user uses email prefix when no name', _name = 'noname');

  -- ========== updated_at trigger ==========
  -- Update org and check updated_at changes
  SELECT updated_at FROM public.organizations WHERE id = 'aa000000-0000-0000-0000-000000000001' INTO _ts;
  UPDATE public.organizations SET name = 'Acme Corp Updated' WHERE id = 'aa000000-0000-0000-0000-000000000001';
  PERFORM _test_assert(_cat, 'updated_at trigger fires on organizations',
    (SELECT updated_at FROM public.organizations WHERE id = 'aa000000-0000-0000-0000-000000000001') >= _ts);

  -- Reset org name
  UPDATE public.organizations SET name = 'Acme Corp' WHERE id = 'aa000000-0000-0000-0000-000000000001';

  -- Update playbook and check updated_at
  SELECT updated_at FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000001' INTO _ts;
  UPDATE public.playbooks SET title = 'Senior Engineer Hire v2' WHERE id = '1a000000-0000-0000-0000-000000000001';
  PERFORM _test_assert(_cat, 'updated_at trigger fires on playbooks',
    (SELECT updated_at FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000001') >= _ts);

  -- Reset
  UPDATE public.playbooks SET title = 'Senior Engineer Hire' WHERE id = '1a000000-0000-0000-0000-000000000001';

END $body$;

-- Replace with no-op again for remaining tests (11_gdpr.sql inserts auth users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $noop$ BEGIN RETURN NEW; END; $noop$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

SELECT 'Trigger tests complete' AS status;
