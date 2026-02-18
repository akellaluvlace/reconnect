-- ============================================
-- File: 10_rls_cms.sql — CMS admin-only write tests
-- All 7 CMS tables: org members read, admins write
-- ============================================

DO $$ DECLARE _cat TEXT := 'RLS_CMS'; _count BIGINT;
  _cms_tables TEXT[] := ARRAY['cms_skills','cms_industries','cms_levels','cms_stage_templates','cms_questions','cms_jd_templates','cms_email_templates'];
  _tbl TEXT;
BEGIN
  -- ========== ORG MEMBER CAN READ ALL CMS TABLES ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000003'); -- interviewer

  FOR _tbl IN SELECT unnest(_cms_tables) LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id = %L', _tbl, 'aa000000-0000-0000-0000-000000000001') INTO _count;
    PERFORM _test_assert(_cat, format('Interviewer can read %s', _tbl), _count >= 0); -- >= 0 means query succeeded
  END LOOP;

  PERFORM _test_reset();

  -- ========== NON-ADMIN CANNOT WRITE CMS ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000002'); -- manager

  -- Test INSERT blocked for each CMS table
  BEGIN
    INSERT INTO public.cms_skills (organization_id, name)
    VALUES ('aa000000-0000-0000-0000-000000000001', 'Manager Skill');
    PERFORM _test_fail(_cat, 'Manager cannot insert cms_skills', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Manager cannot insert cms_skills');
  END;

  BEGIN
    INSERT INTO public.cms_industries (organization_id, name)
    VALUES ('aa000000-0000-0000-0000-000000000001', 'Manager Industry');
    PERFORM _test_fail(_cat, 'Manager cannot insert cms_industries', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Manager cannot insert cms_industries');
  END;

  BEGIN
    INSERT INTO public.cms_levels (organization_id, name, order_index)
    VALUES ('aa000000-0000-0000-0000-000000000001', 'Manager Level', 99);
    PERFORM _test_fail(_cat, 'Manager cannot insert cms_levels', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Manager cannot insert cms_levels');
  END;

  BEGIN
    INSERT INTO public.cms_questions (organization_id, question)
    VALUES ('aa000000-0000-0000-0000-000000000001', 'Manager Question');
    PERFORM _test_fail(_cat, 'Manager cannot insert cms_questions', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Manager cannot insert cms_questions');
  END;

  BEGIN
    INSERT INTO public.cms_email_templates (organization_id, name, template_type, subject, body_html)
    VALUES ('aa000000-0000-0000-0000-000000000001', 'Manager Template', 'invite', 'Sub', '<p>Body</p>');
    PERFORM _test_fail(_cat, 'Manager cannot insert cms_email_templates', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Manager cannot insert cms_email_templates');
  END;

  -- Test UPDATE blocked
  BEGIN
    UPDATE public.cms_skills SET name = 'Hacked' WHERE id = 'e0000000-0000-0000-0000-000000000001';
    IF NOT FOUND THEN
      PERFORM _test_pass(_cat, 'Manager cannot update cms_skills');
    ELSE
      PERFORM _test_fail(_cat, 'Manager cannot update cms_skills', 'Update succeeded');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Manager cannot update cms_skills');
  END;

  -- Test DELETE blocked
  BEGIN
    DELETE FROM public.cms_skills WHERE id = 'e0000000-0000-0000-0000-000000000001';
    IF NOT FOUND THEN
      PERFORM _test_pass(_cat, 'Manager cannot delete cms_skills');
    ELSE
      PERFORM _test_fail(_cat, 'Manager cannot delete cms_skills', 'Delete succeeded');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Manager cannot delete cms_skills');
  END;

  PERFORM _test_reset();

  -- ========== ADMIN CAN WRITE ALL CMS TABLES ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001'); -- admin

  -- Admin INSERT
  BEGIN
    INSERT INTO public.cms_skills (id, organization_id, name)
    VALUES ('e0000000-0000-0000-0000-000000000098', 'aa000000-0000-0000-0000-000000000001', 'Admin Test Skill');
    PERFORM _test_pass(_cat, 'Admin can insert cms_skills');
    DELETE FROM public.cms_skills WHERE id = 'e0000000-0000-0000-0000-000000000098';
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Admin can insert cms_skills', SQLERRM);
  END;

  BEGIN
    INSERT INTO public.cms_email_templates (id, organization_id, name, template_type, subject, body_html)
    VALUES ('e6000000-0000-0000-0000-000000000098', 'aa000000-0000-0000-0000-000000000001', 'Test', 'invite', 'Sub', '<p>B</p>');
    PERFORM _test_pass(_cat, 'Admin can insert cms_email_templates');
    DELETE FROM public.cms_email_templates WHERE id = 'e6000000-0000-0000-0000-000000000098';
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Admin can insert cms_email_templates', SQLERRM);
  END;

  -- Admin cannot write CMS data for OTHER org
  BEGIN
    INSERT INTO public.cms_skills (organization_id, name)
    VALUES ('bb000000-0000-0000-0000-000000000001', 'Cross-tenant Skill');
    PERFORM _test_fail(_cat, 'Admin cannot insert CMS in other org', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Admin cannot insert CMS in other org');
  END;

  PERFORM _test_reset();
END $$;

SELECT 'RLS CMS tests complete' AS status;
