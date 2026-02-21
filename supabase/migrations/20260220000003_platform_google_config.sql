-- ============================================
-- Migration #19: Platform Google Config + Interview Meet Fields
-- ============================================
-- Changes the Drive model from per-org to shared platform account.
-- See docs/INTERVIEW_RECORDING_FLOW.md for full architecture.
--
-- 1. New table: platform_google_config (single-row, platform-level)
-- 2. New column: interviews.meet_conference_id (Meet API recording lookup)
-- 3. New column: organizations.drive_folder_id (org's root folder in shared Drive)
-- 4. Deprecate: org_drive_connections (no longer needed, kept for migration safety)
-- ============================================


-- ============================================
-- 1. PLATFORM GOOGLE CONFIG
-- Single-row table for the shared Rec+onnect Google Workspace account.
-- Stores OAuth tokens + Meet/Drive settings.
-- Only super-admin (service_role) should access this.
-- ============================================

CREATE TABLE IF NOT EXISTS public.platform_google_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  auto_record_enabled BOOLEAN DEFAULT true,
  workspace_domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce single row — only one platform Google account
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_google_config_singleton
  ON public.platform_google_config ((true));

-- RLS: enabled but NO policies = service_role only (same pattern as interview_transcripts)
ALTER TABLE public.platform_google_config ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at
CREATE TRIGGER set_platform_google_config_updated_at
  BEFORE UPDATE ON public.platform_google_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================
-- 2. INTERVIEWS: Meet Conference ID
-- Stores the Google Meet conference record ID for
-- programmatic recording retrieval via Meet REST API.
-- ============================================

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS meet_conference_id TEXT;

CREATE INDEX IF NOT EXISTS idx_interviews_meet_conference
  ON public.interviews(meet_conference_id)
  WHERE meet_conference_id IS NOT NULL;


-- ============================================
-- 3. ORGANIZATIONS: Drive Folder ID
-- Each org gets a root folder in the shared Drive.
-- App creates this folder when first interview is scheduled.
-- ============================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;


-- ============================================
-- 4. DEPRECATE org_drive_connections
-- The per-org model is replaced by platform_google_config.
-- Table kept for migration safety — no data loss.
-- Drop RLS policies to signal deprecation (no new reads/writes).
-- ============================================

-- Remove all RLS policies (signals: do not use this table)
DROP POLICY IF EXISTS "Admins can view drive connection" ON public.org_drive_connections;
DROP POLICY IF EXISTS "Admins can insert drive connection" ON public.org_drive_connections;
DROP POLICY IF EXISTS "Admins can update drive connection" ON public.org_drive_connections;
DROP POLICY IF EXISTS "Admins can delete drive connection" ON public.org_drive_connections;

-- Add deprecation comment
COMMENT ON TABLE public.org_drive_connections IS
  'DEPRECATED (migration #19): Replaced by platform_google_config. '
  'Kept for migration safety. Do not use in new code. '
  'See docs/INTERVIEW_RECORDING_FLOW.md.';
