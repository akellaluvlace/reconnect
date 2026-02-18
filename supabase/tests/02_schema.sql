-- ============================================
-- File: 02_schema.sql — Schema validation tests
-- Verify all tables, columns, constraints, indexes exist
-- ============================================

DO $$ DECLARE _cat TEXT := 'SCHEMA';
  _tbl TEXT; _col TEXT; _exists BOOLEAN;
BEGIN
  -- ========== TABLES EXIST ==========
  FOR _tbl IN SELECT unnest(ARRAY[
    'organizations','users','playbooks','interview_stages','candidates',
    'interviews','feedback','ai_synthesis','collaborators','share_links',
    'audit_logs','org_drive_connections','cms_skills','cms_industries',
    'cms_levels','cms_stage_templates','cms_questions','cms_jd_templates',
    'cms_email_templates','interview_transcripts'
  ]) LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = _tbl
    ) INTO _exists;
    PERFORM _test_assert(_cat, format('Table %s exists', _tbl), _exists);
  END LOOP;

  -- ========== RLS ENABLED ON ALL TABLES ==========
  FOR _tbl IN SELECT unnest(ARRAY[
    'organizations','users','playbooks','interview_stages','candidates',
    'interviews','feedback','ai_synthesis','collaborators','share_links',
    'audit_logs','org_drive_connections','cms_skills','cms_industries',
    'cms_levels','cms_stage_templates','cms_questions','cms_jd_templates',
    'cms_email_templates','interview_transcripts'
  ]) LOOP
    SELECT relrowsecurity FROM pg_class
      WHERE oid = ('public.' || _tbl)::regclass INTO _exists;
    PERFORM _test_assert(_cat, format('RLS enabled on %s', _tbl), _exists);
  END LOOP;

  -- ========== KEY COLUMNS EXIST (migrations 7-10) ==========
  -- Drive columns on interviews
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interviews' AND column_name='drive_file_id') INTO _exists;
  PERFORM _test_assert(_cat, 'interviews.drive_file_id exists', _exists);
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interviews' AND column_name='drive_folder_id') INTO _exists;
  PERFORM _test_assert(_cat, 'interviews.drive_folder_id exists', _exists);
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interviews' AND column_name='recording_status') INTO _exists;
  PERFORM _test_assert(_cat, 'interviews.recording_status exists', _exists);
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interviews' AND column_name='meet_link') INTO _exists;
  PERFORM _test_assert(_cat, 'interviews.meet_link exists', _exists);
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interviews' AND column_name='recording_consent_at') INTO _exists;
  PERFORM _test_assert(_cat, 'interviews.recording_consent_at exists', _exists);

  -- GDPR columns on candidates
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='candidates' AND column_name='retained_until') INTO _exists;
  PERFORM _test_assert(_cat, 'candidates.retained_until exists', _exists);
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='candidates' AND column_name='gdpr_consent_at') INTO _exists;
  PERFORM _test_assert(_cat, 'candidates.gdpr_consent_at exists', _exists);
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='candidates' AND column_name='gdpr_deletion_requested_at') INTO _exists;
  PERFORM _test_assert(_cat, 'candidates.gdpr_deletion_requested_at exists', _exists);

  -- Playbook department
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='playbooks' AND column_name='department') INTO _exists;
  PERFORM _test_assert(_cat, 'playbooks.department exists', _exists);

  -- Stage description
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interview_stages' AND column_name='description') INTO _exists;
  PERFORM _test_assert(_cat, 'interview_stages.description exists', _exists);

  -- User notification preferences
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='notification_preferences') INTO _exists;
  PERFORM _test_assert(_cat, 'users.notification_preferences exists', _exists);

  -- interview_transcripts columns
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='interview_transcripts' AND column_name='transcript') INTO _exists;
  PERFORM _test_assert(_cat, 'interview_transcripts.transcript exists', _exists);

  -- ========== NULLABLE FK COLUMNS (migration 10 GDPR fix) ==========
  SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='feedback' AND column_name='interviewer_id' INTO _col;
  PERFORM _test_assert(_cat, 'feedback.interviewer_id is nullable', _col = 'YES');

  SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='playbooks' AND column_name='created_by' INTO _col;
  PERFORM _test_assert(_cat, 'playbooks.created_by is nullable', _col = 'YES');

  -- ========== KEY INDEXES EXIST ==========
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='playbooks' AND indexname='idx_playbooks_created_by') INTO _exists;
  PERFORM _test_assert(_cat, 'idx_playbooks_created_by exists', _exists);
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='share_links' AND indexname='idx_share_links_playbook') INTO _exists;
  PERFORM _test_assert(_cat, 'idx_share_links_playbook exists', _exists);
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='interviews' AND indexname='idx_interviews_drive_file') INTO _exists;
  PERFORM _test_assert(_cat, 'idx_interviews_drive_file exists', _exists);
  SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='interview_transcripts' AND indexname='idx_interview_transcripts_interview') INTO _exists;
  PERFORM _test_assert(_cat, 'idx_interview_transcripts_interview exists', _exists);

  -- ========== NO DUPLICATE POLICIES PER OPERATION ==========
  PERFORM _test_assert(_cat, 'No duplicate permissive policies',
    NOT EXISTS (
      SELECT tablename, cmd, count(*)
      FROM pg_policies WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
      GROUP BY tablename, cmd HAVING count(*) > 1
    )
  );

END $$;

SELECT 'Schema tests complete' AS status;
