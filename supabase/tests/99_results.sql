-- ============================================
-- File: 99_results.sql — Output results + summary + ROLLBACK
-- This must be the LAST file executed
-- ============================================

-- ========== RESULTS TABLE ==========
SELECT '========================================' AS "=";
SELECT '  TEST RESULTS SUMMARY' AS "=";
SELECT '========================================' AS "=";

SELECT
  category,
  count(*) FILTER (WHERE passed) AS passed,
  count(*) FILTER (WHERE NOT passed) AS failed,
  count(*) AS total
FROM _test_results
GROUP BY category
ORDER BY category;

SELECT '========================================' AS "=";
SELECT format('  TOTAL: %s passed, %s failed out of %s tests',
  count(*) FILTER (WHERE passed),
  count(*) FILTER (WHERE NOT passed),
  count(*))
FROM _test_results;
SELECT '========================================' AS "=";

-- ========== FAILURES DETAIL ==========
SELECT '' AS "=";
SELECT '  FAILED TESTS (if any):' AS "=";
SELECT '  ----------------------' AS "=";

SELECT category, test_name, detail
FROM _test_results
WHERE NOT passed
ORDER BY category, test_name;

-- ========== FULL LOG ==========
SELECT '' AS "=";
SELECT '  FULL TEST LOG:' AS "=";
SELECT '  ----------------------' AS "=";

SELECT
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS status,
  category,
  test_name,
  COALESCE(detail, '') AS detail
FROM _test_results
ORDER BY id;

-- ========== ROLLBACK ==========
-- All test data is discarded — nothing persists
ROLLBACK;

SELECT 'All test data rolled back. Database unchanged.' AS status;
