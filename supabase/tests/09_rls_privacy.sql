-- ============================================
-- File: 09_rls_privacy.sql — Transcript privacy + share link security
-- ============================================

DO $$ DECLARE _cat TEXT := 'RLS_PRIVACY'; _count BIGINT;
BEGIN
  -- ========== INTERVIEW TRANSCRIPTS — SERVICE ROLE ONLY ==========
  -- Insert a transcript as service role (postgres)
  INSERT INTO public.interview_transcripts (id, interview_id, transcript, metadata)
  VALUES ('5a000000-0000-0000-0000-000000000001', '3a000000-0000-0000-0000-000000000001',
    'This is a confidential transcript of the interview...', '{"duration_seconds":1800}'::jsonb);

  -- Admin cannot read transcripts
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');
  SELECT count(*) FROM public.interview_transcripts INTO _count;
  PERFORM _test_assert_count(_cat, 'Admin cannot read interview_transcripts', _count, 0);
  PERFORM _test_reset();

  -- Manager cannot read transcripts
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000002');
  SELECT count(*) FROM public.interview_transcripts INTO _count;
  PERFORM _test_assert_count(_cat, 'Manager cannot read interview_transcripts', _count, 0);
  PERFORM _test_reset();

  -- Interviewer cannot read transcripts
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000003');
  SELECT count(*) FROM public.interview_transcripts INTO _count;
  PERFORM _test_assert_count(_cat, 'Interviewer cannot read interview_transcripts', _count, 0);
  PERFORM _test_reset();

  -- Collaborator cannot read transcripts
  PERFORM _test_as_user('c0000000-0000-0000-0000-000000000001');
  SELECT count(*) FROM public.interview_transcripts INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator cannot read interview_transcripts', _count, 0);
  PERFORM _test_reset();

  -- Other org admin cannot read transcripts
  PERFORM _test_as_user('b0000000-0000-0000-0000-000000000001');
  SELECT count(*) FROM public.interview_transcripts INTO _count;
  PERFORM _test_assert_count(_cat, 'Other org admin cannot read interview_transcripts', _count, 0);
  PERFORM _test_reset();

  -- Service role (postgres) CAN read — verify data exists
  SELECT count(*) FROM public.interview_transcripts INTO _count;
  PERFORM _test_assert_count(_cat, 'Service role CAN read interview_transcripts', _count, 1);

  -- ========== SHARE LINKS — ORG MEMBERS ONLY ==========
  -- Org A admin can see share links
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');
  SELECT count(*) FROM public.share_links INTO _count;
  PERFORM _test_assert_count(_cat, 'Org A admin can see own share links', _count, 1);
  PERFORM _test_reset();

  -- Org A manager can see share links
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000002');
  SELECT count(*) FROM public.share_links INTO _count;
  PERFORM _test_assert_count(_cat, 'Org A manager can see own share links', _count, 1);
  PERFORM _test_reset();

  -- Org B admin CANNOT see org A share links
  PERFORM _test_as_user('b0000000-0000-0000-0000-000000000001');
  SELECT count(*) FROM public.share_links INTO _count;
  PERFORM _test_assert_count(_cat, 'Org B admin cannot enumerate org A share links', _count, 0);
  PERFORM _test_reset();

  -- Collaborator CANNOT see share links (not in org)
  PERFORM _test_as_user('c0000000-0000-0000-0000-000000000001');
  SELECT count(*) FROM public.share_links
    WHERE playbook_id = '1a000000-0000-0000-0000-000000000001' INTO _count;
  PERFORM _test_assert_count(_cat, 'Collaborator cannot see share links', _count, 0);
  PERFORM _test_reset();

  -- ========== DRIVE CONNECTIONS — ADMIN ONLY ==========
  INSERT INTO public.org_drive_connections (id, organization_id, access_token, refresh_token, token_expiry, connected_by)
  VALUES ('dc000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001',
    'encrypted_access_token', 'encrypted_refresh_token', now() + interval '1 hour',
    'a0000000-0000-0000-0000-000000000001');

  -- Admin can see
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');
  SELECT count(*) FROM public.org_drive_connections INTO _count;
  PERFORM _test_assert_count(_cat, 'Admin can see drive connections', _count, 1);
  PERFORM _test_reset();

  -- Manager cannot see
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000002');
  SELECT count(*) FROM public.org_drive_connections INTO _count;
  PERFORM _test_assert_count(_cat, 'Manager cannot see drive connections', _count, 0);
  PERFORM _test_reset();

  -- Other org admin cannot see
  PERFORM _test_as_user('b0000000-0000-0000-0000-000000000001');
  SELECT count(*) FROM public.org_drive_connections INTO _count;
  PERFORM _test_assert_count(_cat, 'Other org admin cannot see drive connections', _count, 0);
  PERFORM _test_reset();

END $$;

SELECT 'RLS privacy tests complete' AS status;
