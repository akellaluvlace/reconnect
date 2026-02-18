-- ============================================
-- File: 08_rls_collaborator.sql — Collaborator access tests
-- External user with magic-link auth accessing assigned data
-- ============================================

DO $$ DECLARE _cat TEXT := 'RLS_COLLABORATOR'; _count BIGINT;
BEGIN
  -- ========== COLLABORATOR (collab_ext) ==========
  -- collab_ext is in org_b but has a collaborator row for org_a's playbook
  -- assigned to stage 2a000000-...-000001 (Phone Screen) only
  PERFORM _test_as_user('c0000000-0000-0000-0000-000000000001');

  -- Can see their own collaborator record
  SELECT count(*) FROM public.collaborators
    WHERE email = 'collab@external.test' INTO _count;
  PERFORM _test_assert(_cat, 'Collaborator can see own collaborator record', _count >= 1);

  -- Can see the assigned playbook (org_a)
  SELECT count(*) FROM public.playbooks
    WHERE id = '1a000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator can see assigned playbook', _count, 1);

  -- Cannot see unassigned playbook
  -- (org_b playbook is visible via org membership, but org_a playbook only via collaborator)
  -- Actually collab_ext is in org_b, so they see pb_b1 via org membership AND pa_a1 via collaborator
  SELECT count(*) FROM public.playbooks INTO _count;
  PERFORM _test_assert(_cat, 'Collaborator sees org_b + assigned playbooks', _count = 2);

  -- Can see assigned stage (Phone Screen, s1)
  SELECT count(*) FROM public.interview_stages
    WHERE id = '2a000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator can see assigned stage (s1)', _count, 1);

  -- Cannot see unassigned stage (Technical, s2) — not in assigned_stages array
  SELECT count(*) FROM public.interview_stages
    WHERE id = '2a000000-0000-0000-0000-000000000002' INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator cannot see unassigned stage (s2)', _count, 0);

  -- Can see candidates in the assigned playbook
  SELECT count(*) FROM public.candidates
    WHERE playbook_id = '1a000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert(_cat, 'Collaborator can see candidates in assigned playbook', _count >= 1);

  -- Cannot see interviews (not the interviewer for any)
  SELECT count(*) FROM public.interviews
    WHERE interviewer_id = 'c0000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator sees 0 interviews (not assigned as interviewer)', _count, 0);

  -- Cannot view AI synthesis
  SELECT count(*) FROM public.ai_synthesis INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator cannot view AI synthesis', _count, 0);

  -- Cannot view org_a share links (not an org member of org_a)
  SELECT count(*) FROM public.share_links
    WHERE playbook_id = '1a000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator cannot see org_a share links', _count, 0);

  -- Cannot view org_a audit logs
  SELECT count(*) FROM public.audit_logs INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator cannot see audit logs', _count, 0);

  -- Cannot create playbooks in org_a
  BEGIN
    INSERT INTO public.playbooks (organization_id, created_by, title)
    VALUES ('aa000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Unauthorized');
    PERFORM _test_fail(_cat, 'Collaborator cannot create playbooks in org_a', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Collaborator cannot create playbooks in org_a');
  END;

  -- Cannot create candidates
  BEGIN
    INSERT INTO public.candidates (playbook_id, name)
    VALUES ('1a000000-0000-0000-0000-000000000001', 'Unauthorized');
    PERFORM _test_fail(_cat, 'Collaborator cannot create candidates', 'Insert succeeded');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _test_pass(_cat, 'Collaborator cannot create candidates');
  END;

  PERFORM _test_reset();

  -- ========== COLLABORATOR FEEDBACK SUBMISSION ==========
  -- First, create an interview where collab_ext is the interviewer
  INSERT INTO public.interviews (id, candidate_id, stage_id, interviewer_id, scheduled_at, status)
  VALUES ('3a000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000001',
    '2a000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
    now() + interval '2 days', 'scheduled');

  PERFORM _test_as_user('c0000000-0000-0000-0000-000000000001');

  -- Now can see their interview
  SELECT count(*) FROM public.interviews
    WHERE interviewer_id = 'c0000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator can see own interview', _count, 1);

  -- Can submit feedback on their interview
  BEGIN
    INSERT INTO public.feedback (id, interview_id, interviewer_id, ratings, focus_areas_confirmed)
    VALUES ('fa000000-0000-0000-0000-000000000002', '3a000000-0000-0000-0000-000000000002',
      'c0000000-0000-0000-0000-000000000001',
      '[{"category":"communication","score":3}]'::jsonb, true);
    PERFORM _test_pass(_cat, 'Collaborator can submit feedback on own interview');
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Collaborator can submit feedback on own interview', SQLERRM);
  END;

  -- Can view own feedback
  SELECT count(*) FROM public.feedback
    WHERE interviewer_id = 'c0000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert(_cat, 'Collaborator can view own submitted feedback', _count >= 1);

  -- Cannot view other interviewers' feedback
  SELECT count(*) FROM public.feedback
    WHERE interviewer_id = 'a0000000-0000-0000-0000-000000000003' INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator cannot view other feedback', _count, 0);

  -- Can update own feedback
  BEGIN
    UPDATE public.feedback SET ratings = '[{"category":"communication","score":4}]'::jsonb
    WHERE id = 'fa000000-0000-0000-0000-000000000002';
    PERFORM _test_pass(_cat, 'Collaborator can update own feedback');
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'Collaborator can update own feedback', SQLERRM);
  END;

  PERFORM _test_reset();

  -- ========== EXPIRED COLLABORATOR ==========
  -- Update collaborator to be expired
  UPDATE public.collaborators SET expires_at = now() - interval '1 day'
    WHERE id = 'da000000-0000-0000-0000-000000000001';

  PERFORM _test_as_user('c0000000-0000-0000-0000-000000000001');

  -- Expired collaborator should NOT see the assigned playbook via collaborator path
  -- (They still see org_b playbook via org membership)
  SELECT count(*) FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'Expired collaborator cannot see assigned playbook', _count, 0);

  -- Expired collaborator should NOT see assigned stages
  SELECT count(*) FROM public.interview_stages
    WHERE playbook_id = '1a000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'Expired collaborator cannot see assigned stages', _count, 0);

  PERFORM _test_reset();

  -- Restore collaborator expiry for other tests
  UPDATE public.collaborators SET expires_at = now() + interval '30 days'
    WHERE id = 'da000000-0000-0000-0000-000000000001';

  -- ========== UNACCEPTED COLLABORATOR ==========
  UPDATE public.collaborators SET accepted_at = NULL
    WHERE id = 'da000000-0000-0000-0000-000000000001';

  PERFORM _test_as_user('c0000000-0000-0000-0000-000000000001');

  SELECT count(*) FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'Unaccepted collaborator cannot see assigned playbook', _count, 0);

  PERFORM _test_reset();

  -- Restore accepted_at
  UPDATE public.collaborators SET accepted_at = now()
    WHERE id = 'da000000-0000-0000-0000-000000000001';

END $$;

SELECT 'RLS collaborator tests complete' AS status;
