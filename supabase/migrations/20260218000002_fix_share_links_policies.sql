-- ============================================
-- Fix share_links: merge duplicate permissive SELECT policies
-- ============================================
-- Problem: Two permissive SELECT policies exist:
--   1. "Users can view playbook share links" (org members see all their links)
--   2. "Anyone can validate active share link" (any user sees ALL active links across ALL orgs)
-- The second policy is a cross-tenant data leak — an authenticated user
-- from Org A can see active share links from Org B.
-- Fix: Merge into one policy. Org members see all their links;
-- non-org users can only see active, non-expired links (for token validation).
-- ============================================

DROP POLICY IF EXISTS "Users can view playbook share links" ON public.share_links;
DROP POLICY IF EXISTS "Anyone can validate active share link" ON public.share_links;

CREATE POLICY "Users can view share links" ON public.share_links
  FOR SELECT USING (
    public.playbook_belongs_to_user_org(playbook_id)
    OR (is_active = true AND (expires_at IS NULL OR expires_at > now()))
  );
