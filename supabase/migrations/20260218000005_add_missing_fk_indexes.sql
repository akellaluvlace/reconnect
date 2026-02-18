-- ============================================
-- Migration #12: Add Missing FK Indexes
-- ============================================
-- Supabase Performance Advisor: 6 "Unindexed foreign keys"
-- FK columns without indexes hurt JOIN/CASCADE performance.
-- ============================================

CREATE INDEX IF NOT EXISTS idx_playbooks_created_by
  ON public.playbooks(created_by);

CREATE INDEX IF NOT EXISTS idx_interview_stages_assigned_interviewer
  ON public.interview_stages(assigned_interviewer_id);

CREATE INDEX IF NOT EXISTS idx_collaborators_invited_by
  ON public.collaborators(invited_by);

CREATE INDEX IF NOT EXISTS idx_share_links_created_by
  ON public.share_links(created_by);

CREATE INDEX IF NOT EXISTS idx_share_links_playbook
  ON public.share_links(playbook_id);

CREATE INDEX IF NOT EXISTS idx_org_drive_connections_connected_by
  ON public.org_drive_connections(connected_by);
