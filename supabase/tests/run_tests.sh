#!/usr/bin/env bash
# ============================================
# run_tests.sh — Execute the full database test suite
# Usage: bash supabase/tests/run_tests.sh
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
mkdir -p "$RESULTS_DIR"

# Timestamp for this run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$RESULTS_DIR/run_${TIMESTAMP}.log"
SUMMARY_FILE="$RESULTS_DIR/summary_${TIMESTAMP}.txt"

# Database connection — session-mode pooler (port 5432)
DB_URL="${DATABASE_URL:-postgresql://postgres.vfufxduwywrnwbjtwdjz:V\$rtG\$5WB2RPESE@aws-1-eu-west-1.pooler.supabase.com:5432/postgres}"

echo "============================================"
echo "  Rec+onnect Database Test Suite"
echo "  $(date)"
echo "============================================"
echo ""

# Concatenate all test files in order
TEST_FILES=(
  "$SCRIPT_DIR/00_begin.sql"
  "$SCRIPT_DIR/01_setup_data.sql"
  "$SCRIPT_DIR/02_schema.sql"
  "$SCRIPT_DIR/03_functions.sql"
  "$SCRIPT_DIR/04_triggers.sql"
  "$SCRIPT_DIR/05_constraints.sql"
  "$SCRIPT_DIR/06_rls_isolation.sql"
  "$SCRIPT_DIR/07_rls_roles.sql"
  "$SCRIPT_DIR/08_rls_collaborator.sql"
  "$SCRIPT_DIR/09_rls_privacy.sql"
  "$SCRIPT_DIR/10_rls_cms.sql"
  "$SCRIPT_DIR/11_gdpr.sql"
  "$SCRIPT_DIR/99_results.sql"
)

# Verify all files exist
echo "Checking test files..."
for f in "${TEST_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: Missing test file: $f"
    exit 1
  fi
  echo "  OK: $(basename "$f")"
done
echo ""

# Concatenate and run
echo "Running tests against remote database..."
echo "Log: $LOG_FILE"
echo ""

cat "${TEST_FILES[@]}" | psql "$DB_URL" \
  --no-psqlrc \
  --set ON_ERROR_STOP=0 \
  --pset border=1 \
  --pset format=aligned \
  2>&1 | tee "$LOG_FILE"

# Extract summary
echo ""
echo "============================================"
echo "  Run complete. Full log: $LOG_FILE"
echo "============================================"

# Copy summary lines to separate file
grep -E '(PASS|FAIL|TOTAL|passed|failed)' "$LOG_FILE" > "$SUMMARY_FILE" 2>/dev/null || true
echo "Summary: $SUMMARY_FILE"
