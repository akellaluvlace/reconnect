# Step 3 — Supabase Core: Schema, Auth, RLS

**Status:** NOT STARTED
**Week:** 1 (Day 2-3)
**Default Owners:** Backend + Security

---

## Goal

Set up multi-tenant database + auth + baseline security (RLS).

---

## Deliverables

- Supabase project (EU region for GDPR)
- Initial schema migration (11 tables)
- RLS enabled + baseline policies + helper functions
- Generated TypeScript types for DB

---

## Definition of Done (Step Level)

- [ ] Migrations apply cleanly
- [ ] RLS policies verified (basic isolation)
- [ ] Auth flow functional in dev (sign up, login, session)
- [ ] TypeScript types generated
- [ ] All micro steps complete

---

## Micro Steps

### 3.1 — Create Supabase Project

**Owner:** Backend
**Supporting:** DevOps
**Status:** PENDING
**Branch:** `step03-1-supabase-project`

**Allowed Paths:**
- `supabase/config.toml`
- `.env.example`

**Tasks:**
- [ ] Go to supabase.com → New Project
- [ ] Configure project:
  - Name: `reconnect-mvp`
  - Region: **West EU (Ireland)** ← GDPR compliance
  - Database password: Generate strong, save securely
- [ ] Wait for project provisioning
- [ ] Get connection details:
  - Project URL
  - Anon Key
  - Service Role Key (keep secret!)
- [ ] Initialize local Supabase:
```bash
supabase init
supabase link --project-ref [PROJECT_REF]
```
- [ ] Update `.env.example`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server only, never expose
```

**Security Checklist:**
- [ ] Service role key NOT in any frontend code
- [ ] Database password stored in password manager
- [ ] Region is West EU (Ireland)

**DoD Commands:**
```bash
supabase status
```

**Output:** Supabase project created and linked

---

### 3.2 — Create Initial Schema Migration

**Owner:** Backend
**Supporting:** Architect
**Status:** PENDING
**Branch:** `step03-2-initial-schema`

**Allowed Paths:**
- `supabase/migrations/20260201000000_initial_schema.sql`

**Tasks:**
- [ ] Create migration file: `supabase/migrations/20260201000000_initial_schema.sql`
- [ ] Implement all 11 tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORGANIZATIONS (Tenants)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'interviewer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PLAYBOOKS
-- ============================================
CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  job_description JSONB,
  market_insights JSONB,
  candidate_profile JSONB,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTERVIEW STAGES
-- ============================================
CREATE TABLE interview_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  duration_minutes INTEGER,
  focus_areas JSONB DEFAULT '[]',
  suggested_questions JSONB DEFAULT '[]',
  assigned_interviewer_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CANDIDATES
-- ============================================
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cv_url TEXT,
  linkedin_url TEXT,
  salary_expectation JSONB,
  current_stage_id UUID REFERENCES interview_stages(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hired', 'rejected', 'withdrawn')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INTERVIEWS
-- ============================================
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES interview_stages(id),
  interviewer_id UUID REFERENCES users(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recording_url TEXT,
  transcript TEXT,
  transcript_metadata JSONB,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FEEDBACK
-- ============================================
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id UUID REFERENCES users(id) NOT NULL,
  ratings JSONB NOT NULL,  -- Array of {category, score (1-4), notes?}
  notes TEXT,
  pros JSONB DEFAULT '[]',
  cons JSONB DEFAULT '[]',
  focus_areas_confirmed BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI SYNTHESIS
-- ============================================
CREATE TABLE ai_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  synthesis_type TEXT NOT NULL,
  content JSONB NOT NULL,
  model_used TEXT,
  prompt_version TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COLLABORATORS
-- ============================================
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'interviewer')),
  assigned_stages UUID[],
  invite_token TEXT UNIQUE,
  invited_by UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SHARE LINKS
-- ============================================
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_playbooks_org ON playbooks(organization_id);
CREATE INDEX idx_playbooks_status ON playbooks(status);
CREATE INDEX idx_candidates_playbook ON candidates(playbook_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_feedback_interview ON feedback(interview_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_playbooks_updated_at
  BEFORE UPDATE ON playbooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**DoD Commands:**
```bash
supabase db reset
# Should apply without errors
```

**Output:** Initial schema migration created

---

### 3.3 — Create RLS Policies Migration

**Owner:** Backend
**Supporting:** Security
**Status:** PENDING
**Branch:** `step03-3-rls-policies`

**Allowed Paths:**
- `supabase/migrations/20260201000001_rls_policies.sql`

**Tasks:**
- [ ] Create migration file: `supabase/migrations/20260201000001_rls_policies.sql`
- [ ] Enable RLS on all tables
- [ ] Create helper functions
- [ ] Create baseline policies

```sql
-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_synthesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_org_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- ORGANIZATION POLICIES
-- ============================================
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (id = get_user_org_id());

CREATE POLICY "Admins can update own organization" ON organizations
  FOR UPDATE USING (id = get_user_org_id() AND is_org_admin());

-- ============================================
-- USER POLICIES
-- ============================================
CREATE POLICY "Users can view members of own org" ON users
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (organization_id = get_user_org_id() AND is_org_admin());

-- ============================================
-- PLAYBOOK POLICIES
-- ============================================
CREATE POLICY "Users can view org playbooks" ON playbooks
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Managers+ can create playbooks" ON playbooks
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Managers+ can update playbooks" ON playbooks
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND is_org_manager_or_admin()
  );

CREATE POLICY "Admins can delete playbooks" ON playbooks
  FOR DELETE USING (organization_id = get_user_org_id() AND is_org_admin());

-- ============================================
-- INTERVIEW STAGES POLICIES
-- ============================================
CREATE POLICY "Users can view playbook stages" ON interview_stages
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "Managers+ can manage stages" ON interview_stages
  FOR ALL USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
    AND is_org_manager_or_admin()
  );

-- ============================================
-- CANDIDATES POLICIES
-- ============================================
CREATE POLICY "Users can view playbook candidates" ON candidates
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "Managers+ can manage candidates" ON candidates
  FOR ALL USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
    AND is_org_manager_or_admin()
  );

-- ============================================
-- FEEDBACK POLICIES (Blind until submitted)
-- ============================================
CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (interviewer_id = auth.uid());

CREATE POLICY "Managers can view all feedback" ON feedback
  FOR SELECT USING (is_org_manager_or_admin());

CREATE POLICY "Interviewers can submit feedback" ON feedback
  FOR INSERT WITH CHECK (interviewer_id = auth.uid());

CREATE POLICY "Users can update own feedback" ON feedback
  FOR UPDATE USING (interviewer_id = auth.uid());

-- ============================================
-- AI SYNTHESIS POLICIES
-- ============================================
CREATE POLICY "Managers+ can view synthesis" ON ai_synthesis
  FOR SELECT USING (
    candidate_id IN (
      SELECT c.id FROM candidates c
      JOIN playbooks p ON c.playbook_id = p.id
      WHERE p.organization_id = get_user_org_id()
    )
    AND is_org_manager_or_admin()
  );

-- ============================================
-- COLLABORATORS POLICIES
-- ============================================
CREATE POLICY "Users can view playbook collaborators" ON collaborators
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "Managers+ can manage collaborators" ON collaborators
  FOR ALL USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
    AND is_org_manager_or_admin()
  );

-- ============================================
-- SHARE LINKS POLICIES
-- ============================================
CREATE POLICY "Users can view playbook share links" ON share_links
  FOR SELECT USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "Managers+ can manage share links" ON share_links
  FOR ALL USING (
    playbook_id IN (SELECT id FROM playbooks WHERE organization_id = get_user_org_id())
    AND is_org_manager_or_admin()
  );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (organization_id = get_user_org_id() AND is_org_admin());

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (organization_id = get_user_org_id());
```

**Security Checklist:**
- [ ] All tables have RLS enabled
- [ ] Helper functions use SECURITY DEFINER
- [ ] Org isolation verified in policies
- [ ] Role-based access enforced

**DoD Commands:**
```bash
supabase db reset
# Should apply without errors
```

**Output:** RLS policies migration created

---

### 3.4 — Configure Authentication

**Owner:** Backend
**Supporting:** Security
**Status:** PENDING
**Branch:** `step03-4-auth-config`

**Allowed Paths:**
- `apps/web/src/lib/supabase/client.ts`
- `apps/web/src/lib/supabase/server.ts`
- `apps/web/src/lib/supabase/middleware.ts`

**Tasks:**
- [ ] Create Supabase client utilities:

```typescript
// apps/web/src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```typescript
// apps/web/src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}
```

```typescript
// apps/web/src/lib/supabase/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}
```

- [ ] Configure Supabase Auth settings in dashboard:
  - Enable email/password
  - Enable magic link
  - Configure email templates
  - Enable Google OAuth
  - Enable Microsoft OAuth

**DoD Commands:**
```bash
pnpm typecheck
```

**Output:** Auth client utilities created

---

### 3.5 — Generate TypeScript Types

**Owner:** Backend
**Supporting:** None
**Status:** PENDING
**Branch:** `step03-5-db-types`

**Allowed Paths:**
- `packages/database/src/types.ts`

**Tasks:**
- [ ] Generate types from Supabase:
```bash
supabase gen types typescript --local > packages/database/src/types.ts
```

- [ ] Export types from package:
```typescript
// packages/database/src/index.ts
export type { Database } from './types';
export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];

// Convenience types
export type Organization = Tables['organizations']['Row'];
export type User = Tables['users']['Row'];
export type Playbook = Tables['playbooks']['Row'];
export type InterviewStage = Tables['interview_stages']['Row'];
export type Candidate = Tables['candidates']['Row'];
export type Interview = Tables['interviews']['Row'];
export type Feedback = Tables['feedback']['Row'];
export type AISynthesis = Tables['ai_synthesis']['Row'];
export type Collaborator = Tables['collaborators']['Row'];
export type ShareLink = Tables['share_links']['Row'];
export type AuditLog = Tables['audit_logs']['Row'];
```

**DoD Commands:**
```bash
pnpm typecheck
```

**Output:** TypeScript types generated and exported

---

### 3.6 — Verify RLS Tenant Isolation

**Owner:** Security
**Supporting:** Backend
**Status:** PENDING
**Branch:** `step03-6-rls-verification`

**Allowed Paths:**
- `supabase/seed.sql` (test data)

**Tasks:**
- [ ] Create test seed data:
```sql
-- Create two test organizations
INSERT INTO organizations (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Org A', 'org-a'),
  ('22222222-2222-2222-2222-222222222222', 'Org B', 'org-b');

-- Create test users (requires auth.users entries first)
-- This is typically done via Supabase dashboard or auth API
```

- [ ] Verify isolation scenarios:
  1. User in Org A cannot see Org B data
  2. User in Org A cannot modify Org B data
  3. Interviewer cannot create playbooks
  4. Manager can create playbooks
  5. Feedback is blind until submitted

**Security Checklist:**
- [ ] Cross-org SELECT returns empty
- [ ] Cross-org INSERT/UPDATE/DELETE fails
- [ ] Role permissions enforced
- [ ] No data leakage in error messages

**DoD Commands:**
```bash
supabase db reset
# Run manual verification queries
```

**Output:** RLS tenant isolation verified

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 3.1 Supabase Project | Backend | PENDING | step03-1-supabase-project |
| 3.2 Initial Schema | Backend | PENDING | step03-2-initial-schema |
| 3.3 RLS Policies | Backend | PENDING | step03-3-rls-policies |
| 3.4 Auth Config | Backend | PENDING | step03-4-auth-config |
| 3.5 DB Types | Backend | PENDING | step03-5-db-types |
| 3.6 RLS Verification | Security | PENDING | step03-6-rls-verification |

---

## Dependencies

- **Blocks:** Step 5 (Web App Shell), Step 7 (Playbook Creation)
- **Blocked By:** Step 2 (Monorepo Foundation)

---

## Notes

- 3.1 must complete first
- 3.2 and 3.3 must be sequential (RLS depends on schema)
- 3.4 can run parallel with 3.2/3.3
- 3.5 depends on 3.2
- 3.6 depends on 3.2, 3.3, requires Security review
