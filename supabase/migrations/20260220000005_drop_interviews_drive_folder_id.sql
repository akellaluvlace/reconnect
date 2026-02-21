-- ============================================
-- Migration #21: Drop dead column interviews.drive_folder_id
-- ============================================
-- This column was added in migration #7 (old per-org Drive design).
-- Interviews have files (drive_file_id), not folders.
-- Column is nullable, unused by any code. Safe to drop.
-- See docs/INTERVIEW_RECORDING_FLOW.md for current architecture.
-- ============================================

ALTER TABLE public.interviews
  DROP COLUMN IF EXISTS drive_folder_id;
