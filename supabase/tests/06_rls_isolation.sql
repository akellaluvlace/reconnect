-- ============================================
-- File: 06_rls_isolation.sql — Cross-tenant isolation tests
-- Org A users must NOT see Org B data and vice versa
-- ============================================

DO $$ DECLARE _cat TEXT := 'RLS_ISOLATION'; _count BIGINT;
BEGIN
  -- ========== AS ADMIN_A: can see Org A, not Org B ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');

  -- Organizations
  SELECT count(*) FROM public.organizations INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only 1 organization', _count, 1);

  -- Playbooks
  SELECT count(*) FROM public.playbooks INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only org_a playbooks', _count, 1);

  SELECT count(*) FROM public.playbooks WHERE id = '1b000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a cannot see org_b playbook', _count, 0);

  -- Candidates
  SELECT count(*) FROM public.candidates WHERE id = 'cb000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a cannot see org_b candidate', _count, 0);

  -- Interview stages
  SELECT count(*) FROM public.interview_stages INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only org_a stages', _count, 2);

  -- Users (org members)
  SELECT count(*) FROM public.users WHERE organization_id = 'bb000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a cannot see org_b users', _count, 0);

  -- CMS skills
  SELECT count(*) FROM public.cms_skills INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only org_a skills', _count, 1);

  SELECT count(*) FROM public.cms_skills WHERE id = 'f0000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a cannot see org_b skill', _count, 0);

  -- Share links
  SELECT count(*) FROM public.share_links INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only org_a share links', _count, 1);

  -- Audit logs
  SELECT count(*) FROM public.audit_logs INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees org_a audit logs', _count, 1);

  PERFORM _test_reset();

  -- ========== AS ADMIN_B: can see Org B, not Org A ==========
  PERFORM _test_as_user('b0000000-0000-0000-0000-000000000001');

  SELECT count(*) FROM public.organizations INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_b sees only 1 organization', _count, 1);

  SELECT count(*) FROM public.playbooks INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_b sees only org_b playbooks', _count, 1);

  SELECT count(*) FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_b cannot see org_a playbook', _count, 0);

  SELECT count(*) FROM public.candidates WHERE id = 'ca000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_b cannot see org_a candidate', _count, 0);

  SELECT count(*) FROM public.interviews INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_b sees 0 interviews (none in org_b)', _count, 0);

  SELECT count(*) FROM public.feedback INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_b sees 0 feedback (not manager of org_a)', _count, 0);

  SELECT count(*) FROM public.share_links INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_b cannot see org_a share links', _count, 0);

  SELECT count(*) FROM public.cms_skills INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_b sees only org_b skills', _count, 1);

  SELECT count(*) FROM public.audit_logs INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_b sees 0 audit logs (org_a logs hidden)', _count, 0);

  PERFORM _test_reset();

  -- ========== CMS CROSS-TENANT (all 7 tables) ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');

  SELECT count(*) FROM public.cms_industries INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only org_a industries', _count, 1);
  SELECT count(*) FROM public.cms_levels INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only org_a levels', _count, 1);
  SELECT count(*) FROM public.cms_stage_templates INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only org_a stage templates', _count, 1);
  SELECT count(*) FROM public.cms_questions INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only org_a questions', _count, 1);
  SELECT count(*) FROM public.cms_jd_templates INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only org_a JD templates', _count, 1);
  SELECT count(*) FROM public.cms_email_templates INTO _count;
  PERFORM _test_assert_count(_cat, 'admin_a sees only org_a email templates', _count, 1);

  PERFORM _test_reset();
END $$;

SELECT 'RLS isolation tests complete' AS status;
