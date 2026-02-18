-- ============================================
-- Rec+onnect Database Test Suite
-- File: 00_begin.sql — Transaction start + test framework
-- ============================================
-- All tests run inside a single transaction that ROLLBACKs at the end.
-- No test data persists. Results are output before rollback.
-- ============================================

BEGIN;

-- ============================================
-- TEST FRAMEWORK
-- ============================================

CREATE TEMP TABLE _test_results (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  test_name TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  detail TEXT DEFAULT '',
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Grant temp table access to authenticated/anon roles so assertion
-- functions can write results while impersonating these roles.
GRANT ALL ON _test_results TO authenticated;
GRANT ALL ON _test_results TO anon;

-- Record a pass (SECURITY DEFINER ensures access to temp table regardless of current role)
CREATE OR REPLACE FUNCTION _test_pass(cat TEXT, name TEXT, det TEXT DEFAULT '')
RETURNS VOID AS $$
  INSERT INTO _test_results (category, test_name, passed, detail) VALUES (cat, name, true, det);
$$ LANGUAGE sql SECURITY DEFINER;

-- Record a fail
CREATE OR REPLACE FUNCTION _test_fail(cat TEXT, name TEXT, det TEXT DEFAULT '')
RETURNS VOID AS $$
  INSERT INTO _test_results (category, test_name, passed, detail) VALUES (cat, name, false, det);
$$ LANGUAGE sql SECURITY DEFINER;

-- Assert condition is true
CREATE OR REPLACE FUNCTION _test_assert(cat TEXT, name TEXT, cond BOOLEAN, det TEXT DEFAULT '')
RETURNS VOID AS $$
BEGIN
  IF cond THEN
    PERFORM _test_pass(cat, name, det);
  ELSE
    PERFORM _test_fail(cat, name, COALESCE(NULLIF(det, ''), 'Assertion failed'));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assert row count equals expected
CREATE OR REPLACE FUNCTION _test_assert_count(cat TEXT, name TEXT, actual BIGINT, expected BIGINT)
RETURNS VOID AS $$
BEGIN
  IF actual = expected THEN
    PERFORM _test_pass(cat, name, format('count=%s', actual));
  ELSE
    PERFORM _test_fail(cat, name, format('expected %s rows, got %s', expected, actual));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assert that a statement raises an exception
-- Usage: SELECT _test_assert_raises('cat', 'name', 'INSERT INTO ...');
CREATE OR REPLACE FUNCTION _test_assert_raises(cat TEXT, name TEXT, stmt TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE stmt;
  -- If we get here, no exception was raised
  PERFORM _test_fail(cat, name, 'Expected exception but statement succeeded');
EXCEPTION WHEN OTHERS THEN
  PERFORM _test_pass(cat, name, format('Raised: %s', SQLERRM));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simulate authenticated user (sets role + JWT claims including email)
-- NOT SECURITY DEFINER — needs to actually change the session role
CREATE OR REPLACE FUNCTION _test_as_user(uid UUID)
RETURNS VOID AS $$
DECLARE
  _email TEXT;
BEGIN
  -- Look up email while still postgres (before role switch)
  SELECT email FROM public.users WHERE id = uid INTO _email;
  EXECUTE format('SET LOCAL role = %L', 'authenticated');
  EXECUTE format('SET LOCAL "request.jwt.claims" = %L',
    json_build_object('sub', uid, 'role', 'authenticated', 'email', _email)::text);
END;
$$ LANGUAGE plpgsql;

-- Simulate anonymous user
CREATE OR REPLACE FUNCTION _test_as_anon()
RETURNS VOID AS $$
BEGIN
  EXECUTE 'SET LOCAL role = ''anon''';
  EXECUTE 'SET LOCAL "request.jwt.claims" = ''{}''';
END;
$$ LANGUAGE plpgsql;

-- Reset to service role (postgres)
CREATE OR REPLACE FUNCTION _test_reset()
RETURNS VOID AS $$
BEGIN
  RESET role;
  RESET "request.jwt.claims";
END;
$$ LANGUAGE plpgsql;

SELECT 'Test framework initialized' AS status;
