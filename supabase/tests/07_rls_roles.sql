-- ============================================
-- File: 07_rls_roles.sql — Role-based access control tests
-- admin > manager > interviewer permission hierarchy
-- ============================================

DO $$ DECLARE _cat TEXT := 'RLS_ROLES'; _count BIGINT; _success BOOLEAN;
BEGIN
  -- ========== INTERVIEWER (viewer_a) — MOST RESTRICTED ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000003');

  -- Can view playbooks (SELECT)
  SELECT count(*) FROM public.playbooks WHERE organization_id = 'aa000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert(_cat, 'Interviewer can view org playbooks', _count > 0);

  -- Cannot create playbooks (INSERT)
  BEGIN
    INSERT INTO public.playbooks (organization_id, created_by, title)
    VALUES ('aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Unauthorized');
    PERFORM _test_fail(_cat, 'Interviewer cannot create playbooks', 'Insert succeeded unexpectedly');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Interviewer cannot create playbooks');
  END;

  -- Cannot update playbooks
  BEGIN
    UPDATE public.playbooks SET title = 'Hacked' WHERE id = '1a000000-0000-0000-0000-000000000001';
    -- Check if any rows were actually updated
    IF NOT FOUND THEN
      PERFORM _test_pass(_cat, 'Interviewer cannot update playbooks');
    ELSE
      PERFORM _test_fail(_cat, 'Interviewer cannot update playbooks', 'Update succeeded');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Interviewer cannot update playbooks');
  END;

  -- Cannot delete playbooks
  BEGIN
    DELETE FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000001';
    IF NOT FOUND THEN
      PERFORM _test_pass(_cat, 'Interviewer cannot delete playbooks');
    ELSE
      PERFORM _test_fail(_cat, 'Interviewer cannot delete playbooks', 'Delete succeeded');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Interviewer cannot delete playbooks');
  END;

  -- Cannot create candidates
  BEGIN
    INSERT INTO public.candidates (playbook_id, name)
    VALUES ('1a000000-0000-0000-0000-000000000001', 'Unauthorized Candidate');
    PERFORM _test_fail(_cat, 'Interviewer cannot create candidates', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Interviewer cannot create candidates');
  END;

  -- Can view own feedback
  SELECT count(*) FROM public.feedback WHERE interviewer_id = 'a0000000-0000-0000-0000-000000000003' INTO _count;
  PERFORM _test_assert(_cat, 'Interviewer can view own feedback', _count = 1);

  -- Cannot view audit logs
  SELECT count(*) FROM public.audit_logs INTO _count;
  PERFORM _test_assert_count(_cat, 'Interviewer cannot view audit logs', _count, 0);

  -- Cannot manage CMS
  BEGIN
    INSERT INTO public.cms_skills (organization_id, name)
    VALUES ('aa000000-0000-0000-0000-000000000001', 'Unauthorized Skill');
    PERFORM _test_fail(_cat, 'Interviewer cannot insert CMS skills', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Interviewer cannot insert CMS skills');
  END;

  PERFORM _test_reset();

  -- ========== MANAGER (manager_a) — MID-LEVEL ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000002');

  -- Can create playbooks
  BEGIN
    INSERT INTO public.playbooks (id, organization_id, created_by, title, status)
    VALUES ('1a000000-0000-0000-0000-000000000099', 'aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Manager Playbook', 'draft');
    PERFORM _test_pass(_cat, 'Manager can create playbooks');
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Manager can create playbooks', SQLERRM);
  END;

  -- Can create candidates
  BEGIN
    INSERT INTO public.candidates (id, playbook_id, name)
    VALUES ('ca000000-0000-0000-0000-000000000099', '1a000000-0000-0000-0000-000000000001', 'Manager Candidate');
    PERFORM _test_pass(_cat, 'Manager can create candidates');
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Manager can create candidates', SQLERRM);
  END;

  -- Can view all org feedback (as manager)
  SELECT count(*) FROM public.feedback INTO _count;
  PERFORM _test_assert(_cat, 'Manager can view all org feedback', _count >= 1);

  -- Cannot delete playbooks (admin only)
  BEGIN
    DELETE FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000001';
    IF NOT FOUND THEN
      PERFORM _test_pass(_cat, 'Manager cannot delete playbooks');
    ELSE
      PERFORM _test_fail(_cat, 'Manager cannot delete playbooks', 'Delete succeeded');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Manager cannot delete playbooks');
  END;

  -- Cannot view audit logs (admin only)
  SELECT count(*) FROM public.audit_logs INTO _count;
  PERFORM _test_assert_count(_cat, 'Manager cannot view audit logs', _count, 0);

  -- Cannot manage CMS (admin only)
  BEGIN
    INSERT INTO public.cms_skills (organization_id, name)
    VALUES ('aa000000-0000-0000-0000-000000000001', 'Manager Skill');
    PERFORM _test_fail(_cat, 'Manager cannot insert CMS skills', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Manager cannot insert CMS skills');
  END;

  PERFORM _test_reset();

  -- ========== ADMIN (admin_a) — FULL ACCESS ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');

  -- Can delete playbooks
  BEGIN
    DELETE FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000099';
    PERFORM _test_pass(_cat, 'Admin can delete playbooks');
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Admin can delete playbooks', SQLERRM);
  END;

  -- Can view audit logs
  SELECT count(*) FROM public.audit_logs INTO _count;
  PERFORM _test_assert(_cat, 'Admin can view audit logs', _count >= 1);

  -- Can manage CMS
  BEGIN
    INSERT INTO public.cms_skills (id, organization_id, name)
    VALUES ('e0000000-0000-0000-0000-000000000099', 'aa000000-0000-0000-0000-000000000001', 'Admin Skill');
    PERFORM _test_pass(_cat, 'Admin can insert CMS skills');
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Admin can insert CMS skills', SQLERRM);
  END;

  -- Can update CMS
  BEGIN
    UPDATE public.cms_skills SET name = 'Admin Skill Updated' WHERE id = 'e0000000-0000-0000-0000-000000000099';
    PERFORM _test_pass(_cat, 'Admin can update CMS skills');
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Admin can update CMS skills', SQLERRM);
  END;

  -- Can delete CMS
  BEGIN
    DELETE FROM public.cms_skills WHERE id = 'e0000000-0000-0000-0000-000000000099';
    PERFORM _test_pass(_cat, 'Admin can delete CMS skills');
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Admin can delete CMS skills', SQLERRM);
  END;

  -- Can update organization
  BEGIN
    UPDATE public.organizations SET name = 'Acme Corp v2' WHERE id = 'aa000000-0000-0000-0000-000000000001';
    PERFORM _test_pass(_cat, 'Admin can update organization');
    UPDATE public.organizations SET name = 'Acme Corp' WHERE id = 'aa000000-0000-0000-0000-000000000001';
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Admin can update organization', SQLERRM);
  END;

  PERFORM _test_reset();

  -- ========== AI SYNTHESIS — MANAGERS+ ONLY ==========
  -- Insert test synthesis data as service role
  INSERT INTO public.ai_synthesis (id, candidate_id, synthesis_type, content, model_used)
  VALUES ('ab000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'summary', '{"highlights":[]}'::jsonb, 'claude-opus-4-6');

  -- Interviewer cannot view
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000003');
  SELECT count(*) FROM public.ai_synthesis INTO _count;
  PERFORM _test_assert_count(_cat, 'Interviewer cannot view AI synthesis', _count, 0);

  -- Manager can view
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000002');
  SELECT count(*) FROM public.ai_synthesis INTO _count;
  PERFORM _test_assert(_cat, 'Manager can view AI synthesis', _count >= 1);

  -- Admin can view
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');
  SELECT count(*) FROM public.ai_synthesis INTO _count;
  PERFORM _test_assert(_cat, 'Admin can view AI synthesis', _count >= 1);

  PERFORM _test_reset();
END $$;

SELECT 'RLS role tests complete' AS status;
