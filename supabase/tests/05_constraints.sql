-- ============================================
-- File: 05_constraints.sql — CHECK & FK constraint tests
-- ============================================

DO $body$ DECLARE _cat TEXT := 'CONSTRAINTS';
BEGIN
  -- ========== RATINGS CHECK (1-4 only) ==========
  -- Valid: score 1-4
  PERFORM _test_assert_raises(_cat, 'Feedback rejects rating score=0',
    $$INSERT INTO public.feedback (interview_id, interviewer_id, ratings, focus_areas_confirmed)
      VALUES ('3a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003',
        '[{"category":"test","score":0}]'::jsonb, true)$$);

  PERFORM _test_assert_raises(_cat, 'Feedback rejects rating score=5',
    $$INSERT INTO public.feedback (interview_id, interviewer_id, ratings, focus_areas_confirmed)
      VALUES ('3a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003',
        '[{"category":"test","score":5}]'::jsonb, true)$$);

  PERFORM _test_assert_raises(_cat, 'Feedback rejects rating score=-1',
    $$INSERT INTO public.feedback (interview_id, interviewer_id, ratings, focus_areas_confirmed)
      VALUES ('3a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003',
        '[{"category":"test","score":-1}]'::jsonb, true)$$);

  -- ========== STATUS CHECK CONSTRAINTS ==========
  PERFORM _test_assert_raises(_cat, 'Playbook rejects invalid status',
    $$INSERT INTO public.playbooks (organization_id, created_by, title, status)
      VALUES ('aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Bad Status', 'invalid_status')$$);

  PERFORM _test_assert_raises(_cat, 'Candidate rejects invalid status',
    $$INSERT INTO public.candidates (playbook_id, name, status)
      VALUES ('1a000000-0000-0000-0000-000000000001', 'Test', 'maybe')$$);

  PERFORM _test_assert_raises(_cat, 'Interview rejects invalid status',
    $$INSERT INTO public.interviews (candidate_id, status)
      VALUES ('ca000000-0000-0000-0000-000000000001', 'pending')$$);

  PERFORM _test_assert_raises(_cat, 'Collaborator rejects invalid role',
    $$INSERT INTO public.collaborators (playbook_id, email, role, expires_at)
      VALUES ('1a000000-0000-0000-0000-000000000001', 'bad@role.test', 'admin', now() + interval '7 days')$$);

  PERFORM _test_assert_raises(_cat, 'User rejects invalid role',
    $$INSERT INTO public.users (id, email, name, organization_id, role)
      VALUES ('d0000000-0000-0000-0000-000000000050', 'bad@role.test', 'Bad', 'aa000000-0000-0000-0000-000000000001', 'superadmin')$$);

  PERFORM _test_assert_raises(_cat, 'Recording status rejects invalid value',
    $$UPDATE public.interviews SET recording_status = 'processing' WHERE id = '3a000000-0000-0000-0000-000000000001'$$);

  -- ========== FK CONSTRAINTS ==========
  PERFORM _test_assert_raises(_cat, 'Playbook rejects invalid organization_id FK',
    $$INSERT INTO public.playbooks (organization_id, created_by, title)
      VALUES ('00000000-0000-0000-0000-999999999999', 'a0000000-0000-0000-0000-000000000001', 'Orphan')$$);

  PERFORM _test_assert_raises(_cat, 'Candidate rejects invalid playbook_id FK',
    $$INSERT INTO public.candidates (playbook_id, name)
      VALUES ('00000000-0000-0000-0000-999999999999', 'Orphan')$$);

  PERFORM _test_assert_raises(_cat, 'Feedback rejects invalid interview_id FK',
    $$INSERT INTO public.feedback (interview_id, interviewer_id, ratings, focus_areas_confirmed)
      VALUES ('00000000-0000-0000-0000-999999999999', 'a0000000-0000-0000-0000-000000000003', '[]'::jsonb, true)$$);

  PERFORM _test_assert_raises(_cat, 'Interview transcript rejects invalid interview_id FK',
    $$INSERT INTO public.interview_transcripts (interview_id, transcript)
      VALUES ('00000000-0000-0000-0000-999999999999', 'some text')$$);

  -- ========== UNIQUE CONSTRAINTS ==========
  PERFORM _test_assert_raises(_cat, 'Organization slug must be unique',
    $$INSERT INTO public.organizations (name, slug) VALUES ('Dupe', 'acme-corp-test')$$);

  PERFORM _test_assert_raises(_cat, 'Share link token must be unique',
    $$INSERT INTO public.share_links (playbook_id, token) VALUES ('1a000000-0000-0000-0000-000000000001', 'test-share-token-abc123')$$);

  PERFORM _test_assert_raises(_cat, 'CMS skill name unique per org',
    $$INSERT INTO public.cms_skills (organization_id, name) VALUES ('aa000000-0000-0000-0000-000000000001', 'Python')$$);

  -- Same name in different org should succeed
  BEGIN
    INSERT INTO public.cms_skills (organization_id, name) VALUES ('bb000000-0000-0000-0000-000000000001', 'Python');
    PERFORM _test_pass(_cat, 'CMS skill same name different org succeeds');
    -- Clean up to avoid affecting later isolation tests
    DELETE FROM public.cms_skills WHERE organization_id = 'bb000000-0000-0000-0000-000000000001' AND name = 'Python';
  EXCEPTION WHEN OTHERS THEN
    PERFORM _test_fail(_cat, 'CMS skill same name different org succeeds', SQLERRM);
  END;

  -- ========== CASCADE DELETES ==========
  -- Verify deleting a playbook cascades to stages, candidates, etc.
  -- (We test this conceptually — actual cascade tested in GDPR section)
  PERFORM _test_assert(_cat, 'interview_stages has ON DELETE CASCADE from playbooks',
    EXISTS (
      SELECT 1 FROM information_schema.referential_constraints
      WHERE constraint_name = 'interview_stages_playbook_id_fkey'
        AND delete_rule = 'CASCADE'
    ));

  PERFORM _test_assert(_cat, 'candidates has ON DELETE CASCADE from playbooks',
    EXISTS (
      SELECT 1 FROM information_schema.referential_constraints
      WHERE constraint_name = 'candidates_playbook_id_fkey'
        AND delete_rule = 'CASCADE'
    ));

  PERFORM _test_assert(_cat, 'feedback has ON DELETE CASCADE from interviews',
    EXISTS (
      SELECT 1 FROM information_schema.referential_constraints
      WHERE constraint_name = 'feedback_interview_id_fkey'
        AND delete_rule = 'CASCADE'
    ));

  -- Verify user FK columns have ON DELETE SET NULL
  PERFORM _test_assert(_cat, 'interviews.interviewer_id ON DELETE SET NULL',
    EXISTS (
      SELECT 1 FROM information_schema.referential_constraints
      WHERE constraint_name = 'interviews_interviewer_id_fkey'
        AND delete_rule = 'SET NULL'
    ));

  PERFORM _test_assert(_cat, 'playbooks.created_by ON DELETE SET NULL',
    EXISTS (
      SELECT 1 FROM information_schema.referential_constraints
      WHERE constraint_name = 'playbooks_created_by_fkey'
        AND delete_rule = 'SET NULL'
    ));

  PERFORM _test_assert(_cat, 'audit_logs.user_id ON DELETE SET NULL',
    EXISTS (
      SELECT 1 FROM information_schema.referential_constraints
      WHERE constraint_name = 'audit_logs_user_id_fkey'
        AND delete_rule = 'SET NULL'
    ));

END $body$;

SELECT 'Constraint tests complete' AS status;
