# Rec+onnect MVP - Master Implementation Plan

**Project:** AI-powered Strategic Recruitment Operations Platform
**Duration:** 8 Weeks
**Budget:** €10,000 (ex-VAT)
**Client:** Robert Coffey
**Developer:** Akella inMotion (Nikita Akella)
**Created:** February 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Pre-Development Phase](#2-pre-development-phase)
3. [Week 1: Foundation + Landing Page](#3-week-1-foundation--landing-page)
4. [Week 2: UI Shell + AI Setup](#4-week-2-ui-shell--ai-setup)
5. [Week 3: Discovery Chapter](#5-week-3-discovery-chapter)
6. [Week 4: Process Chapter](#6-week-4-process-chapter)
7. [Week 5: Alignment Chapter](#7-week-5-alignment-chapter)
8. [Week 6: Debrief Chapter](#8-week-6-debrief-chapter)
9. [Week 7: Google Drive + Polish](#9-week-7-google-drive--polish)
10. [Week 8: Beta Testing + Delivery](#10-week-8-beta-testing--delivery)
11. [Technical Reference](#11-technical-reference)
12. [Risk Mitigation](#12-risk-mitigation)
13. [Post-Delivery](#13-post-delivery)

---

## 1. Project Overview

### 1.1 What We're Building

Rec+onnect is an AI-powered recruitment platform with **4 core chapters**:

| Chapter | Purpose | Key Features |
|---------|---------|--------------|
| **Discovery** | Market research & JD creation | AI market insights, JD generator with styles |
| **Process** | Interview workflow design | Stage builder, discipline-specific templates, questions |
| **Alignment** | Team coordination | Candidate profiles, collaborators, shareable links |
| **Debrief** | Feedback collection & synthesis | Recording, transcription, AI feedback comparison |

### 1.2 Technology Stack

```
Frontend:     React 18 + TypeScript + Tailwind CSS + Shadcn/ui
State:        Zustand
Forms:        React Hook Form + Zod
Backend:      Supabase (PostgreSQL + Auth + Storage + Edge Functions)
Hosting:      Vercel (Edge deployment)
AI Primary:   Claude Opus 4.6 (deep research, full effort) + Claude Sonnet 4.5 (fast ops)
AI Feedback:  Claude Opus 4.6 (compliant feedback synthesis)
Transcription: Whisper API (OpenAI)
Email:        Resend (email-only notifications)
Recording Storage: Google Drive API (org-level — core backbone for interview recordings + AI analysis pipeline)
Analytics:    Google Analytics 4
Monorepo:     Turborepo
Platform:     Desktop-only (min 1024px), Light mode first
```

### 1.3 Critical Compliance Requirements

**EU AI Act (Article 5(1)(f) - BANNED):**
- NO voice hesitation analysis
- NO confidence detection from audio
- NO lie detection
- NO video/body language analysis
- NO biometric emotion inference
- **TEXT-BASED ANALYSIS ONLY**

**GDPR Requirements:**
- Human review required for all AI decisions
- Inform candidates before recording
- Data retention: 1 year, then auto reachout to candidate to opt in/out
- Right to erasure implementation required (build GDPR deletion flow)
- No auto-delete rejected candidates (all stays in system until retention limit)
- Default timezone: Europe/Dublin

### 1.4 Client Decisions Summary (from Onboarding Questionnaire)

| Decision | Answer | Impact |
|----------|--------|--------|
| Platform type | SaaS multi-company | Multi-tenant architecture confirmed |
| Candidate-facing | Internal only | No candidate portal needed |
| User multi-org | NO (1 org per user) | Simplifies data isolation |
| White-label | Optional per org | Org settings includes branding |
| Responsive | Desktop only (min 1024px) | No mobile UI work needed |
| Style | Modern, light mode first | Design system focus |
| Auth primary | Email + password (strict) | Standard Supabase auth |
| Social auth | Google + Microsoft, NO LinkedIn | 2 OAuth providers |
| 2FA | No | Skip for MVP |
| Collaborator access | Magic link (no full account) | Token-based session needed |
| Admin per org | 1 designated person | Single admin role |
| Playbook creation | HM can create, no approval | Simplified workflow |
| Feedback visibility | Interviewer: own only; HM: all | Blind feedback confirmed |
| Rating scale | 1-4 | NOT 1-5, update all schemas |
| AI recommendation | NO hire/no-hire | Highlights only, human decides |
| Focus areas | 2-3 per interview, 3-5 questions each | AI generation constraint |
| Notifications | Email-only | No in-app notification system |
| Data retention | 1 year + auto reachout | GDPR compliance flow |
| Exports | NO PDF, NO CSV | All stays in system |
| Default timezone | Europe/Dublin | Server + display default |
| CMS admin | Skills, industries, levels, templates, questions, JD templates, emails | Admin-only management screens |
| Playbook templates | NO reusable templates | Explicitly excluded |
| Pricing model | Per playbook, tiered TBC | Manual invoicing for MVP |
| Free trial | One playbook | Onboarding flow consideration |
| Default stages | HR screen + reference check (removable) | AI-generated defaults |
| Competitor names | Show company names (not actively hiring required) | Market insights display |

---

## 2. Pre-Development Phase

### 2.1 Client Checklist (Before Kickoff)

- [ ] Signed Project Agreement
- [ ] Deposit paid (€6,150 inc VAT)
- [ ] Onboarding Questionnaire completed
- [ ] Domain purchased/decided
- [ ] Logo files provided (SVG/PNG)
- [ ] Brand colors (hex codes)

### 2.2 Developer Environment Setup

#### Step 1: Install Prerequisites
```bash
# Verify Node.js 20.x
node --version

# Verify npm 10.x
npm --version

# Install global CLIs
npm install -g turbo supabase vercel
```

#### Step 2: VS Code Extensions
```
dbaeumer.vscode-eslint
esbenp.prettier-vscode
bradlc.vscode-tailwindcss
prisma.prisma
eamodio.gitlens
rangav.vscode-thunder-client
```

#### Step 3: Create External Accounts

| Service | URL | Priority | Purpose |
|---------|-----|----------|---------|
| Supabase | supabase.com | Week 1 | Database, Auth, Storage |
| Vercel | vercel.com | Week 1 | Hosting |
| Anthropic | console.anthropic.com | Week 1 | Claude API |
| Google Analytics | analytics.google.com | Week 1 | Landing tracking |
| Resend | resend.com | Week 3 | Email |
| OpenAI | platform.openai.com | Week 5 | Whisper |
| Google Cloud | console.cloud.google.com | Week 6 | Drive API |

---

## 3. Week 1: Foundation + Landing Page

### 3.1 Day 1-2: Project Infrastructure

#### Task 1.1: Initialize Monorepo
```bash
mkdir reconnect && cd reconnect
git init

# Create directory structure
mkdir -p apps/web apps/landing
mkdir -p packages/ui packages/database packages/ai packages/config
mkdir -p supabase/migrations supabase/functions
```

#### Task 1.2: Create Root package.json
```json
{
  "name": "reconnect",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules",
    "db:push": "cd apps/web && npx supabase db push",
    "db:generate": "cd apps/web && npx supabase gen types typescript --local > src/types/database.ts"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

#### Task 1.3: Create turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "type-check": {}
  }
}
```

#### Task 1.4: Initialize Main App (apps/web)
```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Core dependencies
npm install @supabase/supabase-js @supabase/ssr zustand zod react-hook-form @hookform/resolvers

# UI dependencies
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select \
  @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-tooltip \
  class-variance-authority clsx tailwind-merge lucide-react

# AI dependencies
npm install @anthropic-ai/sdk openai

# Utilities
npm install resend date-fns nanoid
```

#### Task 1.5: Initialize Landing Page (apps/landing)
```bash
cd ../landing
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
npm install clsx tailwind-merge lucide-react

# Configure next.config.js for static export
# output: 'export'
```

### 3.2 Day 2-3: Database Schema & Auth

#### Task 2.1: Create Supabase Project
1. Go to supabase.com → New Project
2. Name: `reconnect-mvp`
3. Region: `West EU (Ireland)` ← GDPR compliance
4. Save database password securely

#### Task 2.2: Create Initial Migration
File: `supabase/migrations/20260201000000_initial_schema.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'interviewer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playbooks
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

-- Interview Stages
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

-- Candidates
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

-- Interviews
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

-- Feedback (ratings 1-4, NO hire/no-hire recommendation per client decision)
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id UUID REFERENCES users(id) NOT NULL,
  ratings JSONB NOT NULL,                          -- Array of {category, score (1-4), notes?}
  notes TEXT,
  pros JSONB DEFAULT '[]',                         -- Structured array of strengths
  cons JSONB DEFAULT '[]',                         -- Structured array of concerns
  focus_areas_confirmed BOOLEAN NOT NULL DEFAULT false,  -- Required: confirm focus areas discussed
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Synthesis
CREATE TABLE ai_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  synthesis_type TEXT NOT NULL,
  content JSONB NOT NULL,
  model_used TEXT,
  prompt_version TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborators
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

-- Share Links
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

-- Audit Logs
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

-- Indexes
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_playbooks_org ON playbooks(organization_id);
CREATE INDEX idx_playbooks_status ON playbooks(status);
CREATE INDEX idx_candidates_playbook ON candidates(playbook_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_feedback_interview ON feedback(interview_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Updated_at trigger
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

#### Task 2.3: Create RLS Policies Migration
File: `supabase/migrations/20260201000001_rls_policies.sql`

```sql
-- Enable RLS on all tables
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

-- Helper functions
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

-- Organization policies
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (id = get_user_org_id());

CREATE POLICY "Admins can update own organization" ON organizations
  FOR UPDATE USING (id = get_user_org_id() AND is_org_admin());

-- User policies
CREATE POLICY "Users can view members of own org" ON users
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- Playbook policies
CREATE POLICY "Users can view org playbooks" ON playbooks
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "Managers+ can create playbooks" ON playbooks
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Managers+ can update playbooks" ON playbooks
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Admins can delete playbooks" ON playbooks
  FOR DELETE USING (organization_id = get_user_org_id() AND is_org_admin());

-- Feedback policies (blind until submitted; interviewers see only own, HM/admin see all)
CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (interviewer_id = auth.uid());

CREATE POLICY "Managers can view all feedback" ON feedback
  FOR SELECT USING (get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Interviewers can submit feedback" ON feedback
  FOR INSERT WITH CHECK (interviewer_id = auth.uid());

-- Salary expectations: managers + admin only (enforced at API level, not RLS)
```

#### Task 2.4: Apply Migrations
```bash
supabase login
supabase link --project-ref [PROJECT_REF]
supabase db push
supabase gen types typescript --local > apps/web/src/types/database.ts
```

### 3.3 Day 3-5: Landing Page

#### Task 3.1: Landing Page Structure
```
apps/landing/src/
├── app/
│   ├── page.tsx              # Homepage
│   ├── layout.tsx            # Root layout
│   └── sitemap.ts            # XML sitemap generator
├── components/
│   ├── header.tsx            # Navigation
│   ├── footer.tsx            # Footer with links
│   ├── hero-section.tsx      # Hero with CTA
│   ├── features-section.tsx  # 4 chapters overview
│   ├── how-it-works.tsx      # Step-by-step flow
│   ├── pricing-section.tsx   # Pricing (or contact)
│   ├── testimonials.tsx      # Social proof
│   └── cta-section.tsx       # Final CTA
└── lib/
    └── analytics.ts          # GA4 setup
```

#### Task 3.2: Page Sections to Implement

1. **Hero Section**
   - Headline: "Hire with clarity. Not chaos."
   - Subheadline: "We help you hire with confidence"
   - Primary CTA: **"Book a Demo"** (client-specified)
   - Hero image or product screenshot
   - Design inspiration: ta.guru (likes style/layout)

2. **Solution Section**
   - Pain points in recruitment
   - How Rec+onnect solves them (4 chapters)

3. **How It Works**
   - Step-by-step visual flow

4. **Book a Demo Section**
   - Contact form + email link (both required)
   - Calendar integration placeholder

5. **Sign In**
   - Link to app login

6. **Footer**
   - Contact info, legal links

#### Task 3.3: SEO Implementation
- [ ] Meta tags (title, description)
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] JSON-LD structured data
- [ ] XML sitemap
- [ ] robots.txt
- [ ] Canonical URLs

#### Task 3.4: Analytics Setup
- [ ] Google Analytics 4 property
- [ ] Event tracking (CTA clicks, scroll depth)
- [ ] Conversion goals

#### Task 3.5: Performance Targets
- Lighthouse score: 90+
- FCP: <1.5s
- LCP: <2.5s
- CLS: <0.1

### 3.4 Week 1 Deliverables Checklist

- [ ] Monorepo structure created
- [ ] apps/web initialized with dependencies
- [ ] apps/landing initialized
- [ ] Database schema migrated
- [ ] RLS policies applied
- [ ] TypeScript types generated
- [ ] Authentication flow working
- [ ] Landing page live on staging
- [ ] SEO and analytics configured
- [ ] Weekly progress report sent

---

## 4. Week 2: UI Shell + AI Setup

### 4.1 Day 1-2: Application Shell

#### Task 4.1: Create Directory Structure
```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard home
│   │   ├── playbooks/
│   │   │   ├── page.tsx                # List
│   │   │   ├── new/page.tsx            # Create
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Overview
│   │   │       ├── discovery/page.tsx
│   │   │       ├── process/page.tsx
│   │   │       ├── alignment/page.tsx
│   │   │       └── debrief/page.tsx
│   │   ├── candidates/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── team/
│   │   │   ├── page.tsx
│   │   │   └── invitations/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── organization/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── integrations/page.tsx
│   │   └── admin/                          # CMS Admin (admin role only)
│   │       ├── skills/page.tsx             # Skills taxonomy
│   │       ├── industries/page.tsx         # Industry categories
│   │       ├── levels/page.tsx             # Job level definitions
│   │       ├── templates/page.tsx          # Stage templates
│   │       ├── questions/page.tsx          # Question bank
│   │       ├── jd-templates/page.tsx       # JD templates
│   │       └── emails/page.tsx             # Email templates
│   ├── api/
│   │   ├── ai/
│   │   │   ├── market-insights/route.ts
│   │   │   ├── generate-jd/route.ts
│   │   │   ├── generate-stages/route.ts
│   │   │   └── synthesize-feedback/route.ts
│   │   ├── transcription/route.ts
│   │   └── google-drive/
│   │       ├── auth/route.ts
│   │       ├── callback/route.ts
│   │       └── upload/route.ts
│   └── share/[token]/page.tsx
├── components/
│   ├── auth/
│   ├── dashboard/
│   ├── playbooks/
│   ├── discovery/
│   ├── process/
│   ├── alignment/
│   ├── debrief/
│   ├── candidates/
│   ├── team/
│   └── ui/                             # Shadcn components
├── hooks/
├── lib/
│   ├── supabase/
│   ├── ai/
│   │   ├── claude.ts
│   │   ├── prompts/
│   │   └── schemas/
│   └── utils/
├── stores/
└── types/
```

#### Task 4.2: Layout Components
- [ ] Main layout with sidebar navigation
- [ ] Header with user menu, notifications
- [ ] Responsive sidebar (hamburger on mobile)
- [ ] Loading states and skeletons

#### Task 4.3: UI Components (Shadcn/ui)
- [ ] Button variants
- [ ] Input fields with validation
- [ ] Select/dropdown with search
- [ ] Modal/dialog system
- [ ] Toast notifications
- [ ] Data tables
- [ ] Cards and grids
- [ ] Tabs
- [ ] Badges/tags
- [ ] Avatar with fallback
- [ ] Empty states
- [ ] Error boundaries

### 4.2 Day 2-4: Claude Integration

#### Task 5.1: Create AI Client
File: `apps/web/src/lib/ai/claude.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AI_CONFIG = {
  marketInsights: {
    model: 'claude-opus-4-6',               // Deep research, full effort
    temperature: 0.3,
    maxTokens: 4096,
  },
  jdGeneration: {
    model: 'claude-sonnet-4-5-20250929',    // Fast JD generation
    temperature: 0.4,
    maxTokens: 2048,
  },
  stageGeneration: {
    model: 'claude-sonnet-4-5-20250929',    // Stage + question generation
    temperature: 0.2,
    maxTokens: 1024,
    // Constraint: 2-3 focus areas per stage, 3-5 questions per focus area
  },
  feedbackSynthesis: {
    model: 'claude-opus-4-6',               // Compliant synthesis, full effort
    temperature: 0.1,
    maxTokens: 2048,
    // NO hire/no-hire recommendation - highlights only
  },
};

export { anthropic };
```

#### Task 5.2: Create Zod Schemas
File: `apps/web/src/lib/ai/schemas/job-description.ts`

```typescript
import { z } from 'zod';

export const JobDescriptionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.object({
    required: z.array(z.string()),
    preferred: z.array(z.string()),
  }),
  benefits: z.array(z.string()),
  salary_range: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string().default('EUR'),  // Auto-detect, mostly EUR
  }).optional(),
  location: z.string().optional(),
  remote_policy: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type JobDescription = z.infer<typeof JobDescriptionSchema>;

// NOTE: JD style should "always ask" user (no default style)
// JD length: Standard (editable)
```

File: `apps/web/src/lib/ai/schemas/market-insights.ts`

```typescript
import { z } from 'zod';

export const MarketInsightsSchema = z.object({
  salary: z.object({
    min: z.number(),
    max: z.number(),
    median: z.number(),
    currency: z.string(),
    source: z.string(),
    confidence: z.number(),
  }),
  competition: z.object({
    companies_hiring: z.array(z.string()),
    job_postings_count: z.number(),
    market_saturation: z.enum(['low', 'medium', 'high']),
  }),
  time_to_hire: z.object({
    average_days: z.number(),
    range: z.object({ min: z.number(), max: z.number() }),
  }),
  candidate_availability: z.object({
    level: z.enum(['scarce', 'limited', 'moderate', 'abundant']),
    description: z.string(),
  }),
  key_skills: z.object({
    required: z.array(z.string()),
    emerging: z.array(z.string()),
    declining: z.array(z.string()),
  }),
  trends: z.array(z.string()),
  generated_at: z.string(),
  model_used: z.string(),
});

export type MarketInsights = z.infer<typeof MarketInsightsSchema>;
```

#### Task 5.3: Create Prompt Templates
File: `apps/web/src/lib/ai/prompts/jd-generation.ts`

```typescript
export const JD_GENERATION_PROMPT = `
You are an expert HR consultant generating job descriptions for the Irish market.

INPUTS:
- Role: {{role}}
- Level: {{level}}
- Industry: {{industry}}
- Company Context: {{company_context}}
- Style: {{style}}

OUTPUT: Return ONLY valid JSON matching this structure:
{
  "title": "string",
  "summary": "string",
  "responsibilities": ["string"],
  "requirements": {
    "required": ["string"],
    "preferred": ["string"]
  },
  "benefits": ["string"],
  "salary_range": { "min": number, "max": number, "currency": "EUR" },
  "confidence": number (0-1)
}

Style guidelines:
- formal: Professional, corporate language
- creative: Engaging, modern startup tone
- concise: Short, bullet-point focused

Include Ireland-specific considerations (visa sponsorship, remote work policies).
`;
```

### 4.3 Day 4-5: Playbook Creation Flow

#### Task 6.1: Playbook Wizard Steps
1. **Step 1: Basic Info** - title, department
2. **Step 2: Role Details** - level, skills, industry
3. **Step 3: AI Generation** - trigger AI, show results

#### Task 6.2: Create Playbook Store
File: `apps/web/src/stores/playbook-store.ts`

```typescript
import { create } from 'zustand';

interface PlaybookDraft {
  step: number;
  basicInfo: { title: string; department: string };
  roleDetails: { level: string; skills: string[]; industry: string };
  generatedContent: {
    jobDescription?: JobDescription;
    marketInsights?: MarketInsights;
    interviewStages?: InterviewStage[];
  };
}

interface PlaybookStore {
  draft: PlaybookDraft;
  setStep: (step: number) => void;
  updateBasicInfo: (info: Partial<PlaybookDraft['basicInfo']>) => void;
  updateRoleDetails: (details: Partial<PlaybookDraft['roleDetails']>) => void;
  setGeneratedContent: (content: Partial<PlaybookDraft['generatedContent']>) => void;
  resetDraft: () => void;
}

export const usePlaybookStore = create<PlaybookStore>((set) => ({
  draft: {
    step: 1,
    basicInfo: { title: '', department: '' },
    roleDetails: { level: '', skills: [], industry: '' },
    generatedContent: {},
  },
  setStep: (step) => set((state) => ({ draft: { ...state.draft, step } })),
  updateBasicInfo: (info) => set((state) => ({
    draft: { ...state.draft, basicInfo: { ...state.draft.basicInfo, ...info } }
  })),
  updateRoleDetails: (details) => set((state) => ({
    draft: { ...state.draft, roleDetails: { ...state.draft.roleDetails, ...details } }
  })),
  setGeneratedContent: (content) => set((state) => ({
    draft: { ...state.draft, generatedContent: { ...state.draft.generatedContent, ...content } }
  })),
  resetDraft: () => set({
    draft: {
      step: 1,
      basicInfo: { title: '', department: '' },
      roleDetails: { level: '', skills: [], industry: '' },
      generatedContent: {},
    }
  }),
}));
```

### 4.4 Week 2 Deliverables Checklist

- [ ] Application shell with navigation
- [ ] Dashboard layout responsive
- [ ] Auth flows (login, register, forgot password)
- [ ] Claude integration configured
- [ ] Zod schemas for AI outputs
- [ ] Prompt templates created
- [ ] Playbook creation wizard (basic)
- [ ] Component library established
- [ ] Weekly progress report sent

---

## 5. Week 3: Discovery Chapter

### 5.1 Day 1-2: Market Insights Engine

#### Task 7.1: Two-Phase Generation Architecture

**Phase 1 (Immediate):** Claude Sonnet returns preliminary data
**Phase 2 (Background):** Claude Opus performs deep research

#### Task 7.2: Create Market Insights API
File: `apps/web/src/app/api/ai/market-insights/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { anthropic, AI_CONFIG } from '@/lib/ai/claude';
import { MarketInsightsSchema } from '@/lib/ai/schemas/market-insights';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role, level, industry, playbook_id } = await req.json();

  // Phase 1: Quick insights with Sonnet
  const quickResponse = await anthropic.messages.create({
    model: AI_CONFIG.jdGeneration.model,
    max_tokens: AI_CONFIG.jdGeneration.maxTokens,
    temperature: AI_CONFIG.jdGeneration.temperature,
    messages: [{
      role: 'user',
      content: buildMarketInsightsPrompt({ role, level, industry, phase: 'quick' }),
    }],
  });

  const quickContent = quickResponse.content[0];
  if (quickContent.type !== 'text') {
    return NextResponse.json({ error: 'Invalid response' }, { status: 500 });
  }

  const quickInsights = MarketInsightsSchema.parse(JSON.parse(quickContent.text));

  // Store quick results
  await supabase
    .from('playbooks')
    .update({ market_insights: { ...quickInsights, phase: 'quick' } })
    .eq('id', playbook_id);

  // Trigger Phase 2 in background (Edge Function or queue)
  // This would be a separate async process

  return NextResponse.json({
    insights: quickInsights,
    status: 'quick_complete',
    deep_research_pending: true,
  });
}
```

### 5.2 Day 2-4: JD Generator

#### Task 8.1: JD Generator Component Features
- [ ] AI-generated job description from inputs
- [ ] Style selector (formal, creative, concise)
- [ ] Rich text editor (Tiptap)
- [ ] Section reordering
- [ ] Regenerate individual sections
- [ ] Copy to clipboard
- [ ] Export formats

#### Task 8.2: Install Tiptap
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

#### Task 8.3: Create JD Editor Component
File: `apps/web/src/components/discovery/jd-editor.tsx`

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface JDEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function JDEditor({ content, onChange }: JDEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="border rounded-lg">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="prose max-w-none p-4" />
    </div>
  );
}
```

### 5.3 Day 4-5: Discovery Chapter UI

#### Task 9.1: Discovery Page Layout
```
Discovery Chapter
├── Header (chapter title, navigation)
├── Input Panel
│   ├── Role details form
│   ├── Style selector
│   └── Generate button
├── Results Panel
│   ├── Market Insights Card
│   │   ├── Salary range visualization
│   │   ├── Competition overview
│   │   ├── Time to hire
│   │   ├── Availability indicator
│   │   ├── Key skills tags
│   │   └── Trends list
│   └── Job Description Card
│       ├── Style tabs
│       ├── Rich text editor
│       └── Actions (copy, export, regenerate)
└── Footer (save, next chapter)
```

#### Task 9.2: Components to Build
- [ ] Market Insights dashboard cards
- [ ] Salary range visualization (bar chart)
- [ ] Skills tag cloud
- [ ] Competition indicator
- [ ] JD editor with toolbar
- [ ] Loading states for AI generation

### 5.4 Week 3 Deliverables Checklist

- [ ] Market Insights API working
- [ ] Two-phase generation (quick + deep)
- [ ] JD Generator with styles
- [ ] Tiptap editor integrated
- [ ] Discovery chapter UI complete
- [ ] Data saved to database
- [ ] Weekly progress report sent

---

## 6. Week 4: Process Chapter

### 6.1 Day 1-2: Interview Stage Generator

#### Task 10.1: Stage Schema
```typescript
interface InterviewStage {
  name: string;
  type: 'screening' | 'technical' | 'behavioral' | 'cultural' | 'final' | 'custom';
  duration_minutes: number;
  description: string;
  focus_areas: {                    // 2-3 per interview (client requirement)
    name: string;
    weight: number; // 1-4
  }[];
  suggested_questions: {            // 3-5 per focus area (client requirement)
    question: string;
    purpose: string;
    look_for: string[];
  }[];
}

// Default stages: HR screen + reference check (both removable)
// Discipline templates inform AI generation but user can always modify
```

#### Task 10.2: Discipline-Specific Templates

| Discipline | Default Stages |
|------------|----------------|
| Software Engineering | Screening, Technical Assessment, Coding Exercise, System Design, Cultural |
| Sales | Screening, Role Play, Presentation, Manager Interview |
| Marketing | Screening, Portfolio Review, Case Study, Cultural |
| Finance | Screening, Technical Questions, Case Study, Cultural |
| General | Screening, Behavioral, Cultural Fit |

### 6.2 Day 2-4: Stage Management UI

#### Task 11.1: Stage Card Component
```
┌─────────────────────────────────────────┐
│ 1. Phone Screening          [30 min] ▼  │
├─────────────────────────────────────────┤
│ Focus Areas:                            │
│ • Communication skills                  │
│ • Role motivation                       │
│ • Salary expectations                   │
│                                         │
│ Suggested Questions:                    │
│ • "Tell me about your experience..."    │
│ • "What interests you about..."         │
│                                         │
│ Assigned: [Select interviewer ▼]        │
│                                         │
│ [Edit] [Remove]                         │
└─────────────────────────────────────────┘
```

#### Task 11.2: Features to Implement
- [ ] Vertical stage list with drag-and-drop (dnd-kit)
- [ ] Expandable stage cards
- [ ] Add custom stage button
- [ ] Edit stage modal
- [ ] Remove stage (with confirmation)
- [ ] Assign interviewer dropdown
- [ ] Duration estimates with total timeline

### 6.3 Day 4-5: Question Bank

#### Task 12.1: Question Features
- [ ] AI-suggested questions per stage
- [ ] Question purpose and "what to look for"
- [ ] Add custom questions
- [ ] Save to organization's question bank
- [ ] Reuse across playbooks
- [ ] Question categories/tags

### 6.4 Week 4 Deliverables Checklist

- [ ] Interview stage generator API
- [ ] Discipline-specific templates
- [ ] Stage management UI with drag-drop
- [ ] Question suggestions working
- [ ] Question bank storage
- [ ] Mid-project milestone reached
- [ ] **Invoice #2 sent (€2,500 + VAT)**
- [ ] Weekly progress report sent

---

## 7. Week 5: Alignment Chapter

### 7.1 Day 1-2: Candidate Profile Builder

#### Task 13.1: Profile Structure
```typescript
interface CandidateProfile {
  experience: {
    min_years: number;
    max_years: number;
    level: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  };
  skills: {
    required: string[];
    preferred: string[];
    nice_to_have: string[];
  };
  industries: {
    preferred: string[];
    excluded: string[];
  };
  education: {
    level?: string;
    fields?: string[];
    required: boolean;
  };
  other_requirements: string[];
}
```

#### Task 13.2: UI Components
- [ ] Experience level selector (slider)
- [ ] Skills input with autocomplete
- [ ] Industry multi-select
- [ ] Education requirements
- [ ] Custom requirements field
- [ ] AI suggestions button

### 7.2 Day 2-3: Process Summary View

#### Task 14.1: Summary Dashboard
- [ ] Total stages count
- [ ] Estimated timeline (sum + buffer)
- [ ] Interviewers involved
- [ ] Key focus areas across stages
- [ ] Stage timeline visualization
- [ ] Print-friendly view

### 7.3 Day 3-4: Collaborator System

#### Task 15.1: Collaborator Features
- [ ] Invite by email
- [ ] Role assignment (viewer, interviewer)
- [ ] Assign to specific stages
- [ ] Magic link invitations
- [ ] Pending invitations list
- [ ] Resend/revoke access

#### Task 15.2: Email Integration (Resend)
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCollaboratorInvite(params: {
  email: string;
  inviterName: string;
  playbookTitle: string;
  stageName: string;
  magicLink: string;
}) {
  await resend.emails.send({
    from: 'Rec+onnect <noreply@reconnect.io>',
    to: params.email,
    subject: `You've been invited to interview for ${params.playbookTitle}`,
    html: renderInviteEmail(params),
  });
}
```

### 7.4 Day 4-5: Shareable Links

#### Task 16.1: Features
- [ ] Generate read-only shareable link
- [ ] Expiration options (7/30 days, custom)
- [ ] Optional password protection
- [ ] View counter
- [ ] Revoke link
- [ ] Public view page (/share/[token])

### 7.5 Week 5 Deliverables Checklist

- [ ] Candidate profile builder complete
- [ ] Process summary view
- [ ] Collaborator invitation system
- [ ] Email templates working
- [ ] Shareable links functional
- [ ] Public share page
- [ ] Weekly progress report sent

---

## 8. Week 6: Debrief Chapter

### 8.1 Day 1-2: Interview Recording

#### Task 17.1: Browser Recording (MediaRecorder API)
```typescript
'use client';

import { useState, useRef } from 'react';

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    const chunks: Blob[] = [];

    mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.current.onstop = () => {
      setAudioBlob(new Blob(chunks, { type: 'audio/webm' }));
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  return { isRecording, audioBlob, startRecording, stopRecording };
}
```

#### Task 17.2: Recording UI Features
- [ ] Start/stop controls
- [ ] Recording timer
- [ ] Audio level visualization
- [ ] Upload to Supabase Storage
- [ ] Alternative: Upload external recording

### 8.2 Day 2-3: Transcription Pipeline

#### Task 18.1: Whisper Integration
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const audioResponse = await fetch(audioUrl);
  const audioBlob = await audioResponse.blob();

  const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',
    response_format: 'text',
  });

  return transcription;
}
```

#### Task 18.2: Pipeline Flow
1. Audio uploaded to Supabase Storage
2. API route triggered
3. Audio sent to Whisper API
4. Transcript stored in database
5. UI updated via polling/realtime

### 8.3 Day 3-4: Feedback Forms

#### Task 19.1: Feedback Structure
```typescript
interface InterviewFeedback {
  interview_id: string;
  interviewer_id: string;
  ratings: {
    category: string;
    score: number; // 1-4 (per client decision)
    notes?: string;
  }[];
  overall_notes: string;
  pros: string[];           // Structured array of strengths
  cons: string[];           // Structured array of concerns
  focus_areas_confirmed: boolean;  // Required: confirm focus areas were discussed
  // NO recommendation field - client decision: highlights only, human decides
}
```

#### Task 19.2: UI Components
- [ ] Rating scales (1-4 numbers, with optional guide per client)
- [ ] Structured feedback sections
- [ ] Pros/cons input (multi-item, stored as JSONB arrays)
- [ ] Focus areas confirmation checkbox (required before submit)
- [ ] Rich text notes
- [ ] Submit confirmation
- [ ] Edit within time limit
- [ ] NO recommendation/hire selector (client decision: human decides)

#### Task 19.3: Access Control
- Blind feedback: Interviewers can't see others' until submitted
- Hiring Manager + admin see all immediately
- Salary expectations: managers + admin only
- Time-limited editing after submission

### 8.4 Day 4-5: AI Feedback Synthesis

#### Task 20.1: COMPLIANCE WARNING
```
EU AI ACT COMPLIANCE - MANDATORY
================================
- NO emotion detection
- NO voice analysis
- NO biometric inference
- TEXT-BASED ONLY

All synthesis must include disclaimer:
"This AI-generated summary is for informational purposes only.
All hiring decisions must be made by humans."
```

#### Task 20.2: Synthesis Schema (NO hire/no-hire — highlights only)
```typescript
interface FeedbackSynthesis {
  summary: string;
  consensus: {
    areas_of_agreement: string[];
    areas_of_disagreement: string[];
  };
  key_strengths: string[];       // Highlight points from feedback
  key_concerns: string[];        // Highlight points from feedback
  discussion_points: string[];   // Topics for hiring team to discuss
  rating_overview: {
    average_score: number;       // Average across all ratings (1-4 scale)
    total_feedback_count: number;
    score_distribution: { score: number; count: number }[];
  };
  // NO recommendation_breakdown — client decision: human decides
  disclaimer: string; // ALWAYS required
}
```

#### Task 20.3: Features
- [ ] Collect all feedback for candidate
- [ ] Send to Claude (text only)
- [ ] Generate structured comparison
- [ ] Highlight divergent opinions
- [ ] Flag vague/missing feedback
- [ ] Display with AI disclaimer

### 8.5 Week 6 Deliverables Checklist

- [ ] Recording functionality working
- [ ] Supabase Storage integration
- [ ] Transcription pipeline complete
- [ ] Feedback forms implemented
- [ ] Blind feedback access control
- [ ] AI synthesis working (compliant)
- [ ] Debrief chapter complete
- [ ] Weekly progress report sent

---

## 9. Week 7: Google Drive Integration + Polish

> **CRITICAL**: Google Drive is the CORE STORAGE BACKBONE for interview recordings.
> The AI analysis pipeline (Whisper transcription → Claude synthesis) depends on recordings
> being stored in Drive. This is NOT an export feature — it IS the recording infrastructure.

### 9.1 Day 1-3: Google Drive Integration

#### Ownership Model (Client Decision 2026-02-16)
- **Org-level**: One Google Drive account per organization
- **Admin connects once**: OAuth with offline access, refresh token stored per org
- **All recordings go to org Drive**: Organized in folder structure per playbook/candidate
- **Users set up Meet links**: Through the same Google integration
- **Revocation**: When admin disconnects, Drive link breaks; existing files remain on Drive (org owns them)
- **AI pipeline dependency**: Whisper pulls audio from Drive → transcribes → Claude analyzes transcript

#### Task 21.1: OAuth Flow Setup
```typescript
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Platform-level auth: shared Rec+onnect account (NOT per-org)
// See docs/INTERVIEW_RECORDING_FLOW.md for full architecture
export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.meet.readonly', // Meet recording download
      'https://www.googleapis.com/auth/calendar.events',      // Meet link creation
      'https://www.googleapis.com/auth/meetings.space.readonly', // Conference record lookup
    ],
    prompt: 'consent',
  });
}
```

#### Task 21.2: Features
- [ ] Org-level OAuth authorization flow (admin connects, tokens stored per org)
- [ ] Save interview recordings to org Drive (automatic after recording)
- [ ] Folder organization: org → playbook → candidate → stage
- [ ] Google Meet link creation for scheduled interviews
- [ ] AI pipeline integration: recording URL from Drive → Whisper → transcript → Claude
- [ ] Revoke access option (admin only)
- [ ] Connection status dashboard in org settings

### 9.2 Day 3-4: Bug Fixes & Optimization

#### Task 22.1: Bug Fixing
- [ ] Review all reported issues
- [ ] Fix critical bugs first
- [ ] Test edge cases
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Desktop-only verification (min 1024px, no mobile requirement per client)

#### Task 22.2: Performance Optimization
- [ ] Analyze bundle size (target <200KB)
- [ ] Implement code splitting
- [ ] Optimize images
- [ ] Database query optimization
- [ ] API response time audit (<500ms except AI)

### 9.3 Day 4-5: Security Audit

#### Task 23.1: Security Checklist
- [ ] All API routes authenticated
- [ ] RLS policies tested with multiple roles
- [ ] No sensitive data in client logs
- [ ] Environment variables secured
- [ ] CORS configured correctly
- [ ] Rate limiting on AI endpoints
- [ ] Input validation on all forms
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Secure file upload (type/size validation)
- [ ] Audit logging for sensitive ops

### 9.4 Week 7 Deliverables Checklist

- [ ] Google Drive integration complete
- [ ] All known bugs fixed
- [ ] Security audit passed
- [ ] Performance targets met
- [ ] Ready for beta
- [ ] Weekly progress report sent

---

## 10. Week 8: Beta Testing + Delivery

### 10.1 Day 1: Production Deployment

#### Task 24.1: Deployment Checklist
- [ ] Production environment variables set
- [ ] Database migrations applied to prod
- [ ] DNS configured for domains
- [ ] SSL certificates active
- [ ] Error monitoring (Sentry) set up
- [ ] Analytics verified
- [ ] Backup strategy confirmed

#### Task 24.2: Production URLs
- Landing: `https://reconnect.io` (or client domain)
- App: `https://app.reconnect.io` (or client domain)

### 10.2 Day 2-4: Beta Testing

#### Task 25.1: Beta Process
- [ ] Client provides 5-10 beta testers
- [ ] Create test accounts
- [ ] Provide beta testing guide
- [ ] Set up feedback collection
- [ ] Daily check-ins with client
- [ ] Prioritize and fix reported issues

#### Task 25.2: Test Scenarios
1. Create organization and invite team member
2. Create complete playbook (all 4 chapters)
3. Invite collaborator to interview stage
4. Record interview and view transcription
5. Submit feedback and view AI synthesis
6. Share playbook via link
7. Export to Google Drive

### 10.3 Day 4-5: Final Delivery

#### Task 26.1: Documentation
- [ ] User guide
- [ ] Admin guide
- [ ] API documentation

#### Task 26.2: Handover
- [ ] All critical beta bugs fixed
- [ ] Handover meeting with client
- [ ] Transfer ownership:
  - [ ] GitHub repository (if applicable)
  - [ ] Vercel projects
  - [ ] Environment variables documentation
- [ ] Transition plan for ongoing support

### 10.4 Week 8 Deliverables Checklist

- [ ] Production deployed and live
- [ ] Beta testing completed
- [ ] All critical bugs fixed
- [ ] Documentation delivered
- [ ] Project handover complete
- [ ] **Final invoice sent (€2,500 + VAT)**
- [ ] 30-day warranty period begins

---

## 11. Technical Reference

### 11.1 Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Email
RESEND_API_KEY=re_...

# Google
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...
```

### 11.2 API Routes Summary

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/auth/*` | Various | Authentication | Public/Required |
| `/api/playbooks` | GET/POST | List/Create playbooks | Required |
| `/api/playbooks/:id` | GET/PATCH/DELETE | Playbook CRUD | Required |
| `/api/playbooks/:id/stages` | GET/POST | Manage stages | Required |
| `/api/ai/market-insights` | POST | Generate insights | Required |
| `/api/ai/generate-jd` | POST | Generate JD | Required |
| `/api/ai/generate-stages` | POST | Generate stages | Required |
| `/api/ai/synthesize-feedback` | POST | Synthesize feedback | Required |
| `/api/transcription` | POST | Transcribe audio | Required |
| `/api/google-drive/*` | Various | Drive integration | Required |
| `/api/share/:token` | GET | Public playbook view | Public |

### 11.3 RBAC Permissions

| Role | Playbooks | Candidates | Team | Settings | Feedback | Salary Data |
|------|-----------|------------|------|----------|----------|-------------|
| Admin (1 per org) | Full CRUD | Full CRUD | Manage all | Full + CMS | View all | View |
| Manager (HM) | Create/Edit | Full CRUD | View only | Limited | View all | View |
| Interviewer | View assigned | View assigned | View only | None | Own only | Hidden |

**CMS Admin Controls (admin only):**
- Skills taxonomy, Industry/discipline categories, Job level definitions
- Interview stage templates, Question bank, JD templates, Email templates
- NO reusable playbook templates (client decision)

### 11.4 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case.tsx | `playbook-card.tsx` |
| Hooks | use-[name].ts | `use-playbook.ts` |
| Types | lowercase.ts | `database.ts` |
| API Routes | route.ts in folders | `api/playbooks/route.ts` |
| Database tables | snake_case | `interview_stages` |
| Database columns | snake_case | `created_at` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE` |

---

## 12. Risk Mitigation

### 12.1 AI Bias Risk
**Risk:** AI could inadvertently introduce bias (like Amazon's 2018 resume screener)

**Mitigation:**
- Explicit disclaimers requiring human review
- Gendered-language detection
- Never allow AI to reject candidates without human confirmation
- Log all AI decisions for audit

### 12.2 API Reliability Risk
**Risk:** OpenAI/Anthropic outages could impact functionality

**Mitigation:**
- Graceful degradation
- Fallback models
- Exponential backoff
- Cached responses where appropriate
- Clear error states in UI

### 12.3 Prompt Injection Risk
**Risk:** Malicious content in resumes could manipulate AI

**Mitigation:**
- Never pass raw candidate text directly to prompts
- Sanitize all user inputs
- Validate outputs against Zod schemas
- Monitor for anomalous AI responses

### 12.4 Transcription Accuracy Risk
**Risk:** Whisper may have reduced accuracy for Irish accents

**Mitigation:**
- Quality indicators in UI
- Manual correction option
- Option to edit transcripts
- Confidence scores displayed

---

## 13. Post-Delivery

### 13.1 30-Day Warranty
**Included:**
- Bug fixes within delivered scope

**NOT Included:**
- Client modifications
- Third-party integration issues
- Hosting/infrastructure problems
- Feature requests

### 13.2 Optional Ongoing Support (€150/month)
- Basic maintenance
- QA of code revisions
- Edge-case bug fixes
- Priority response
- Does NOT include new feature development

### 13.3 Future Enhancement Opportunities
- Mobile apps (iOS/Android)
- Calendar integrations
- ATS integrations
- Custom analytics dashboard
- Multi-language support
- Payment/billing system

### 13.4 Monthly Cost Estimates (Client Responsibility)

| Service | Low Usage | High Usage |
|---------|-----------|------------|
| Supabase Pro | $25 | $25 |
| Vercel Pro | $20 | $20 |
| Claude API | $50 | $200 |
| Whisper API | $10 | $50 |
| Resend | $0 | $20 |
| **Total** | **~$105** | **~$315** |

---

## Payment Schedule Summary

| Milestone | Amount (ex-VAT) | Amount (inc-VAT) | Due |
|-----------|-----------------|------------------|-----|
| Deposit | €5,000 | €6,150 | Before kickoff |
| Mid-project | €2,500 | €3,075 | End of Week 4 |
| Final | €2,500 | €3,075 | After beta (Week 8) |
| **Total** | **€10,000** | **€12,300** | |

---

*Document Version: 1.0*
*Created: February 2026*
*Author: Akella inMotion*
