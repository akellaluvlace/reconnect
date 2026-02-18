-- ============================================
-- File: 03_functions.sql — Helper function tests
-- ============================================

DO $$ DECLARE _cat TEXT := 'FUNCTIONS'; _result TEXT; _bool BOOLEAN; _uid UUID;
BEGIN
  -- ========== get_user_org_id() ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001'); -- admin_a
  SELECT public.get_user_org_id() INTO _uid;
  PERFORM _test_assert(_cat, 'get_user_org_id returns org_a for admin_a',
    _uid = 'aa000000-0000-0000-0000-000000000001'::uuid);

  PERFORM _test_as_user('b0000000-0000-0000-0000-000000000001'); -- admin_b
  SELECT public.get_user_org_id() INTO _uid;
  PERFORM _test_assert(_cat, 'get_user_org_id returns org_b for admin_b',
    _uid = 'bb000000-0000-0000-0000-000000000001'::uuid);

  PERFORM _test_reset();

  -- ========== get_user_role() ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');
  SELECT public.get_user_role() INTO _result;
  PERFORM _test_assert(_cat, 'get_user_role returns admin for admin_a', _result = 'admin');

  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000002');
  SELECT public.get_user_role() INTO _result;
  PERFORM _test_assert(_cat, 'get_user_role returns manager for manager_a', _result = 'manager');

  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000003');
  SELECT public.get_user_role() INTO _result;
  PERFORM _test_assert(_cat, 'get_user_role returns interviewer for viewer_a', _result = 'interviewer');

  PERFORM _test_reset();

  -- ========== is_org_admin() ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');
  SELECT public.is_org_admin() INTO _bool;
  PERFORM _test_assert(_cat, 'is_org_admin true for admin_a', _bool = true);

  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000002');
  SELECT public.is_org_admin() INTO _bool;
  PERFORM _test_assert(_cat, 'is_org_admin false for manager_a', _bool = false);

  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000003');
  SELECT public.is_org_admin() INTO _bool;
  PERFORM _test_assert(_cat, 'is_org_admin false for viewer_a', _bool = false);

  PERFORM _test_reset();

  -- ========== is_org_manager_or_admin() ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');
  SELECT public.is_org_manager_or_admin() INTO _bool;
  PERFORM _test_assert(_cat, 'is_org_manager_or_admin true for admin', _bool = true);

  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000002');
  SELECT public.is_org_manager_or_admin() INTO _bool;
  PERFORM _test_assert(_cat, 'is_org_manager_or_admin true for manager', _bool = true);

  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000003');
  SELECT public.is_org_manager_or_admin() INTO _bool;
  PERFORM _test_assert(_cat, 'is_org_manager_or_admin false for interviewer', _bool = false);

  PERFORM _test_reset();

  -- ========== playbook_belongs_to_user_org() ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');
  SELECT public.playbook_belongs_to_user_org('1a000000-0000-0000-0000-000000000001') INTO _bool;
  PERFORM _test_assert(_cat, 'playbook_belongs_to_user_org true for own org playbook', _bool = true);

  SELECT public.playbook_belongs_to_user_org('1b000000-0000-0000-0000-000000000001') INTO _bool;
  PERFORM _test_assert(_cat, 'playbook_belongs_to_user_org false for other org playbook', _bool = false);

  PERFORM _test_reset();

  -- ========== candidate_belongs_to_user_org() ==========
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001');
  SELECT public.candidate_belongs_to_user_org('ca000000-0000-0000-0000-000000000001') INTO _bool;
  PERFORM _test_assert(_cat, 'candidate_belongs_to_user_org true for own org candidate', _bool = true);

  SELECT public.candidate_belongs_to_user_org('cb000000-0000-0000-0000-000000000001') INTO _bool;
  PERFORM _test_assert(_cat, 'candidate_belongs_to_user_org false for other org candidate', _bool = false);

  PERFORM _test_reset();

  -- ========== is_active_collaborator() ==========
  PERFORM _test_as_user('c0000000-0000-0000-0000-000000000001'); -- collab_ext
  SELECT public.is_active_collaborator('1a000000-0000-0000-0000-000000000001') INTO _bool;
  PERFORM _test_assert(_cat, 'is_active_collaborator true for assigned playbook', _bool = true);

  SELECT public.is_active_collaborator('1b000000-0000-0000-0000-000000000001') INTO _bool;
  PERFORM _test_assert(_cat, 'is_active_collaborator false for unassigned playbook', _bool = false);

  -- Test with non-collaborator user
  PERFORM _test_as_user('a0000000-0000-0000-0000-000000000001'); -- admin_a
  SELECT public.is_active_collaborator('1a000000-0000-0000-0000-000000000001') INTO _bool;
  PERFORM _test_assert(_cat, 'is_active_collaborator false for org member (not collaborator)', _bool = false);

  PERFORM _test_reset();

  -- ========== validate_ratings_scores() ==========
  SELECT public.validate_ratings_scores('[]'::jsonb) INTO _bool;
  PERFORM _test_assert(_cat, 'validate_ratings_scores accepts empty array', _bool = true);

  SELECT public.validate_ratings_scores('[{"category":"test","score":1}]'::jsonb) INTO _bool;
  PERFORM _test_assert(_cat, 'validate_ratings_scores accepts score=1', _bool = true);

  SELECT public.validate_ratings_scores('[{"category":"test","score":4}]'::jsonb) INTO _bool;
  PERFORM _test_assert(_cat, 'validate_ratings_scores accepts score=4', _bool = true);

  SELECT public.validate_ratings_scores('[{"category":"test","score":0}]'::jsonb) INTO _bool;
  PERFORM _test_assert(_cat, 'validate_ratings_scores rejects score=0', _bool = false);

  SELECT public.validate_ratings_scores('[{"category":"test","score":5}]'::jsonb) INTO _bool;
  PERFORM _test_assert(_cat, 'validate_ratings_scores rejects score=5', _bool = false);

  SELECT public.validate_ratings_scores('[{"category":"a","score":2},{"category":"b","score":3}]'::jsonb) INTO _bool;
  PERFORM _test_assert(_cat, 'validate_ratings_scores accepts multiple valid scores', _bool = true);

  SELECT public.validate_ratings_scores('[{"category":"a","score":2},{"category":"b","score":5}]'::jsonb) INTO _bool;
  PERFORM _test_assert(_cat, 'validate_ratings_scores rejects if any score invalid', _bool = false);

END $$;

SELECT 'Function tests complete' AS status;
