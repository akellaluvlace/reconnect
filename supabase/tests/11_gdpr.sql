-- ============================================
-- File: 11_gdpr.sql — GDPR deletion cascade tests
-- Verify FK SET NULL behavior when a user is deleted
-- ============================================

DO $$ DECLARE _cat TEXT := 'GDPR'; _count BIGINT; _val TEXT;
BEGIN
  -- ========== CREATE A SACRIFICIAL USER ==========
  -- This user will be deleted to test cascades.
  -- handle_new_user() was replaced with no-op in 04_triggers.sql,
  -- so inserting into auth.users won't auto-create org/user.
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, raw_user_meta_data, created_at, updated_at)
  VALUES ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
    'sacrifice@acme.test', crypt('TestPass123!', gen_salt('bf')), now(), 'authenticated', 'authenticated',
    '{"name":"Sacrifice User"}'::jsonb, now(), now());

  INSERT INTO public.users (id, email, name, organization_id, role)
  VALUES ('d0000000-0000-0000-0000-000000000001', 'sacrifice@acme.test', 'Sacrifice User',
    'aa000000-0000-0000-0000-000000000001', 'interviewer');

  -- Create data referencing this user
  INSERT INTO public.playbooks (id, organization_id, created_by, title)
  VALUES ('1a000000-0000-0000-0000-000000000098', 'aa000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001', 'Sacrifice Playbook');

  INSERT INTO public.interview_stages (id, playbook_id, order_index, name, assigned_interviewer_id)
  VALUES ('2a000000-0000-0000-0000-000000000098', '1a000000-0000-0000-0000-000000000098', 0,
    'Sacrifice Stage', 'd0000000-0000-0000-0000-000000000001');

  INSERT INTO public.candidates (id, playbook_id, name)
  VALUES ('ca000000-0000-0000-0000-000000000098', '1a000000-0000-0000-0000-000000000098', 'Test Candidate');

  INSERT INTO public.interviews (id, candidate_id, stage_id, interviewer_id, status)
  VALUES ('3a000000-0000-0000-0000-000000000098', 'ca000000-0000-0000-0000-000000000098',
    '2a000000-0000-0000-0000-000000000098', 'd0000000-0000-0000-0000-000000000001', 'completed');

  INSERT INTO public.feedback (id, interview_id, interviewer_id, ratings, focus_areas_confirmed)
  VALUES ('fa000000-0000-0000-0000-000000000098', '3a000000-0000-0000-0000-000000000098',
    'd0000000-0000-0000-0000-000000000001', '[{"category":"test","score":3}]'::jsonb, true);

  INSERT INTO public.collaborators (id, playbook_id, email, invited_by, expires_at)
  VALUES ('da000000-0000-0000-0000-000000000098', '1a000000-0000-0000-0000-000000000098',
    'guest@test.test', 'd0000000-0000-0000-0000-000000000001', now() + interval '7 days');

  INSERT INTO public.share_links (id, playbook_id, token, created_by)
  VALUES ('4a000000-0000-0000-0000-000000000098', '1a000000-0000-0000-0000-000000000098',
    'sacrifice-token-123', 'd0000000-0000-0000-0000-000000000001');

  INSERT INTO public.audit_logs (id, organization_id, user_id, action, entity_type)
  VALUES ('99000000-0000-0000-0000-000000000098', 'aa000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001', 'test.action', 'test');

  -- Verify all references exist before deletion
  PERFORM _test_assert(_cat, 'Pre-delete: playbook.created_by is set',
    (SELECT created_by FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000098') = 'd0000000-0000-0000-0000-000000000001');
  PERFORM _test_assert(_cat, 'Pre-delete: interview.interviewer_id is set',
    (SELECT interviewer_id FROM public.interviews WHERE id = '3a000000-0000-0000-0000-000000000098') = 'd0000000-0000-0000-0000-000000000001');
  PERFORM _test_assert(_cat, 'Pre-delete: feedback.interviewer_id is set',
    (SELECT interviewer_id FROM public.feedback WHERE id = 'fa000000-0000-0000-0000-000000000098') = 'd0000000-0000-0000-0000-000000000001');

  -- ========== DELETE THE USER ==========
  -- This should succeed (not blocked by FK RESTRICT)
  BEGIN
    -- Delete from public.users first (has FK to auth.users with CASCADE)
    -- Actually auth.users CASCADE will delete public.users
    DELETE FROM auth.users WHERE id = 'd0000000-0000-0000-0000-000000000001';
    PERFORM _test_pass(_cat, 'User deletion succeeds (not blocked by FKs)');
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'User deletion succeeds (not blocked by FKs)', SQLERRM);
  END;

  -- ========== VERIFY CASCADE/SET NULL BEHAVIOR ==========
  -- public.users row should be deleted (CASCADE from auth.users)
  SELECT count(*) FROM public.users WHERE id = 'd0000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'public.users row deleted (CASCADE)', _count, 0);

  -- Playbook still exists, created_by is NULL
  PERFORM _test_assert(_cat, 'Playbook preserved after user deletion',
    EXISTS (SELECT 1 FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000098'));
  PERFORM _test_assert(_cat, 'playbooks.created_by set to NULL',
    (SELECT created_by FROM public.playbooks WHERE id = '1a000000-0000-0000-0000-000000000098') IS NULL);

  -- Interview still exists, interviewer_id is NULL
  PERFORM _test_assert(_cat, 'Interview preserved after user deletion',
    EXISTS (SELECT 1 FROM public.interviews WHERE id = '3a000000-0000-0000-0000-000000000098'));
  PERFORM _test_assert(_cat, 'interviews.interviewer_id set to NULL',
    (SELECT interviewer_id FROM public.interviews WHERE id = '3a000000-0000-0000-0000-000000000098') IS NULL);

  -- Stage still exists, assigned_interviewer_id is NULL
  PERFORM _test_assert(_cat, 'Stage preserved after user deletion',
    EXISTS (SELECT 1 FROM public.interview_stages WHERE id = '2a000000-0000-0000-0000-000000000098'));
  PERFORM _test_assert(_cat, 'interview_stages.assigned_interviewer_id set to NULL',
    (SELECT assigned_interviewer_id FROM public.interview_stages WHERE id = '2a000000-0000-0000-0000-000000000098') IS NULL);

  -- Feedback still exists, interviewer_id is NULL
  PERFORM _test_assert(_cat, 'Feedback preserved after user deletion',
    EXISTS (SELECT 1 FROM public.feedback WHERE id = 'fa000000-0000-0000-0000-000000000098'));
  PERFORM _test_assert(_cat, 'feedback.interviewer_id set to NULL',
    (SELECT interviewer_id FROM public.feedback WHERE id = 'fa000000-0000-0000-0000-000000000098') IS NULL);

  -- Collaborator still exists, invited_by is NULL
  PERFORM _test_assert(_cat, 'Collaborator preserved after user deletion',
    EXISTS (SELECT 1 FROM public.collaborators WHERE id = 'da000000-0000-0000-0000-000000000098'));
  PERFORM _test_assert(_cat, 'collaborators.invited_by set to NULL',
    (SELECT invited_by FROM public.collaborators WHERE id = 'da000000-0000-0000-0000-000000000098') IS NULL);

  -- Share link still exists, created_by is NULL
  PERFORM _test_assert(_cat, 'Share link preserved after user deletion',
    EXISTS (SELECT 1 FROM public.share_links WHERE id = '4a000000-0000-0000-0000-000000000098'));
  PERFORM _test_assert(_cat, 'share_links.created_by set to NULL',
    (SELECT created_by FROM public.share_links WHERE id = '4a000000-0000-0000-0000-000000000098') IS NULL);

  -- Audit log still exists, user_id is NULL
  PERFORM _test_assert(_cat, 'Audit log preserved after user deletion',
    EXISTS (SELECT 1 FROM public.audit_logs WHERE id = '99000000-0000-0000-0000-000000000098'));
  PERFORM _test_assert(_cat, 'audit_logs.user_id set to NULL',
    (SELECT user_id FROM public.audit_logs WHERE id = '99000000-0000-0000-0000-000000000098') IS NULL);

END $$;

SELECT 'GDPR cascade tests complete' AS status;
