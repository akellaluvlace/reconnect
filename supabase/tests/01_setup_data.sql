-- ============================================
-- File: 01_setup_data.sql — Create test scenario
-- ============================================
-- Test Scenario:
--   Org A ("Acme Corp") — admin, manager, interviewer
--   Org B ("Beta Inc") — admin only
--   External collaborator assigned to Org A's playbook
--   Full data: playbook, stages, candidates, interviews, feedback,
--              share links, CMS data
-- ============================================

-- ============================================
-- DISABLE TRIGGER (we create test data manually)
-- ============================================
-- Can't ALTER TABLE auth.users (not owner). Instead, replace the
-- trigger function with a no-op. ROLLBACK restores the original.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $noop$ BEGIN RETURN NEW; END; $noop$
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================
-- FIXED TEST UUIDs
-- ============================================
-- Users
-- admin_a:    a0000000-0000-0000-0000-000000000001
-- manager_a:  a0000000-0000-0000-0000-000000000002
-- viewer_a:   a0000000-0000-0000-0000-000000000003
-- admin_b:    b0000000-0000-0000-0000-000000000001
-- collab_ext: c0000000-0000-0000-0000-000000000001
--
-- Orgs
-- org_a:      aa000000-0000-0000-0000-000000000001
-- org_b:      bb000000-0000-0000-0000-000000000001
--
-- Playbooks
-- pb_a1:      1a000000-0000-0000-0000-000000000001
-- pb_b1:      1b000000-0000-0000-0000-000000000001
--
-- Stages
-- st_a1_s1:   2a000000-0000-0000-0000-000000000001
-- st_a1_s2:   2a000000-0000-0000-0000-000000000002
--
-- Candidates
-- cand_a1:    ca000000-0000-0000-0000-000000000001
-- cand_b1:    cb000000-0000-0000-0000-000000000001
--
-- Interviews
-- int_a1:     3a000000-0000-0000-0000-000000000001
--
-- Feedback
-- fb_a1:      fa000000-0000-0000-0000-000000000001
--
-- Share Links
-- sl_a1:      4a000000-0000-0000-0000-000000000001
--
-- Collaborator
-- collab_a1:  da000000-0000-0000-0000-000000000001

-- ============================================
-- AUTH USERS (minimal entries for auth.uid() lookups)
-- ============================================
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, raw_user_meta_data, created_at, updated_at)
VALUES
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'admin@acme.test', crypt('TestPass123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"name":"Admin Acme"}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'manager@acme.test', crypt('TestPass123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"name":"Manager Acme"}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'viewer@acme.test', crypt('TestPass123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"name":"Viewer Acme"}'::jsonb, now(), now()),
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'admin@beta.test', crypt('TestPass123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"name":"Admin Beta"}'::jsonb, now(), now()),
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'collab@external.test', crypt('TestPass123!', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"name":"External Collab"}'::jsonb, now(), now());

-- ============================================
-- ORGANIZATIONS
-- ============================================
INSERT INTO public.organizations (id, name, slug) VALUES
  ('aa000000-0000-0000-0000-000000000001', 'Acme Corp', 'acme-corp-test'),
  ('bb000000-0000-0000-0000-000000000001', 'Beta Inc', 'beta-inc-test');

-- ============================================
-- USERS (public.users — org membership + roles)
-- ============================================
INSERT INTO public.users (id, email, name, organization_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@acme.test', 'Admin Acme', 'aa000000-0000-0000-0000-000000000001', 'admin'),
  ('a0000000-0000-0000-0000-000000000002', 'manager@acme.test', 'Manager Acme', 'aa000000-0000-0000-0000-000000000001', 'manager'),
  ('a0000000-0000-0000-0000-000000000003', 'viewer@acme.test', 'Viewer Acme', 'aa000000-0000-0000-0000-000000000001', 'interviewer'),
  ('b0000000-0000-0000-0000-000000000001', 'admin@beta.test', 'Admin Beta', 'bb000000-0000-0000-0000-000000000001', 'admin'),
  ('c0000000-0000-0000-0000-000000000001', 'collab@external.test', 'External Collab', 'bb000000-0000-0000-0000-000000000001', 'interviewer');
  -- NOTE: collab_ext is in org_b (auto-created by handle_new_user in real flow)
  -- but accesses org_a data via collaborator row

-- ============================================
-- PLAYBOOKS
-- ============================================
INSERT INTO public.playbooks (id, organization_id, created_by, title, status, department) VALUES
  ('1a000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Senior Engineer Hire', 'active', 'Engineering'),
  ('1b000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Marketing Lead', 'active', 'Marketing');

-- ============================================
-- INTERVIEW STAGES
-- ============================================
INSERT INTO public.interview_stages (id, playbook_id, order_index, name, type, duration_minutes, description, focus_areas, suggested_questions) VALUES
  ('2a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 0, 'Phone Screen', 'screening', 30, 'Initial phone screening', '[{"area":"communication"}]'::jsonb, '[{"q":"Tell me about yourself"}]'::jsonb),
  ('2a000000-0000-0000-0000-000000000002', '1a000000-0000-0000-0000-000000000001', 1, 'Technical Interview', 'technical', 60, 'Deep technical assessment', '[{"area":"coding"},{"area":"system design"}]'::jsonb, '[{"q":"Design a URL shortener"}]'::jsonb);

-- ============================================
-- CANDIDATES
-- ============================================
INSERT INTO public.candidates (id, playbook_id, name, email, status, current_stage_id) VALUES
  ('ca000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'Alice Candidate', 'alice@candidate.test', 'active', '2a000000-0000-0000-0000-000000000001'),
  ('cb000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000001', 'Bob Candidate', 'bob@candidate.test', 'active', NULL);

-- ============================================
-- INTERVIEWS
-- ============================================
INSERT INTO public.interviews (id, candidate_id, stage_id, interviewer_id, scheduled_at, status) VALUES
  ('3a000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', now() + interval '1 day', 'scheduled');

-- ============================================
-- FEEDBACK (from viewer_a on interview_a1)
-- ============================================
INSERT INTO public.feedback (id, interview_id, interviewer_id, ratings, pros, cons, focus_areas_confirmed) VALUES
  ('fa000000-0000-0000-0000-000000000001', '3a000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003',
   '[{"category":"communication","score":3},{"category":"technical","score":2}]'::jsonb,
   '["Good communicator","Relevant experience"]'::jsonb,
   '["Needs more depth in system design"]'::jsonb,
   true);

-- ============================================
-- SHARE LINKS
-- ============================================
INSERT INTO public.share_links (id, playbook_id, token, created_by, is_active, expires_at) VALUES
  ('4a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'test-share-token-abc123', 'a0000000-0000-0000-0000-000000000001', true, now() + interval '7 days');

-- ============================================
-- COLLABORATOR (external user assigned to Org A playbook)
-- ============================================
INSERT INTO public.collaborators (id, playbook_id, email, name, role, assigned_stages, invite_token, invited_by, accepted_at, expires_at) VALUES
  ('da000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001', 'collab@external.test', 'External Collab', 'interviewer',
   ARRAY['2a000000-0000-0000-0000-000000000001']::uuid[], 'invite-token-xyz789',
   'a0000000-0000-0000-0000-000000000001', now(), now() + interval '30 days');

-- ============================================
-- CMS DATA (Org A)
-- ============================================
INSERT INTO public.cms_skills (id, organization_id, name, category) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Python', 'Technical');

INSERT INTO public.cms_industries (id, organization_id, name) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Technology');

INSERT INTO public.cms_levels (id, organization_id, name, order_index) VALUES
  ('e2000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Senior', 0);

INSERT INTO public.cms_stage_templates (id, organization_id, name, type) VALUES
  ('e3000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Phone Screen Template', 'screening');

INSERT INTO public.cms_questions (id, organization_id, question, category) VALUES
  ('e4000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Describe your biggest technical challenge', 'behavioral');

INSERT INTO public.cms_jd_templates (id, organization_id, name, content) VALUES
  ('e5000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Standard JD', '{"sections":["about","requirements"]}'::jsonb);

INSERT INTO public.cms_email_templates (id, organization_id, name, template_type, subject, body_html) VALUES
  ('e6000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'Interview Invite', 'invite', 'You have an interview', '<p>Hello</p>');

-- ============================================
-- CMS DATA (Org B — for cross-tenant tests)
-- ============================================
INSERT INTO public.cms_skills (id, organization_id, name, category) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000001', 'Marketing Analytics', 'Business');

-- ============================================
-- AUDIT LOG ENTRY
-- ============================================
INSERT INTO public.audit_logs (id, organization_id, user_id, action, entity_type, entity_id) VALUES
  ('99000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'playbook.created', 'playbook', '1a000000-0000-0000-0000-000000000001');

-- ============================================
-- NOTE: handle_new_user() stays as no-op for setup data.
-- It gets restored in 04_triggers.sql for trigger tests,
-- then replaced with no-op again afterward.
-- The ROLLBACK at the end restores the real function.
-- ============================================

SELECT 'Test data created: 2 orgs, 5 users, 2 playbooks, 2 stages, 2 candidates, 1 interview, 1 feedback, 1 share link, 1 collaborator, 7 CMS rows' AS status;
