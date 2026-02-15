# Rec+onnect MVP Setup Guide

Complete setup instructions for development environment, external services, and deployment.

**Estimated Setup Time:** 2-3 hours  
**Last Updated:** February 2026

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Account Setup](#2-account-setup)
   - [Supabase](#21-supabase)
   - [Vercel](#22-vercel)
   - [Anthropic (Claude)](#23-anthropic-claude)
   - [OpenAI (Whisper)](#24-openai-whisper)
   - [Resend](#25-resend)
   - [Google Cloud (Drive API)](#26-google-cloud-drive-api)
   - [Google Analytics](#27-google-analytics)
3. [Project Initialization](#3-project-initialization)
4. [Environment Configuration](#4-environment-configuration)
5. [Database Setup](#5-database-setup)
6. [Local Development](#6-local-development)
7. [Deployment](#7-deployment)
8. [Post-Deployment Checklist](#8-post-deployment-checklist)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| Node.js | 20.x LTS | https://nodejs.org |
| npm | 10.x+ | Included with Node.js |
| Git | 2.x+ | https://git-scm.com |
| VS Code | Latest | https://code.visualstudio.com |

### Verify Installation

```bash
# Check Node.js
node --version
# Expected: v20.x.x

# Check npm
npm --version
# Expected: 10.x.x

# Check Git
git --version
# Expected: git version 2.x.x
```

### Recommended VS Code Extensions

Install these extensions for the best development experience:

```
# Essential
dbaeumer.vscode-eslint
esbenp.prettier-vscode
bradlc.vscode-tailwindcss
prisma.prisma

# Helpful
formulahendry.auto-rename-tag
christian-kohler.path-intellisense
eamodio.gitlens
rangav.vscode-thunder-client
```

### Global npm Packages

```bash
# Install Turborepo CLI
npm install -g turbo

# Install Supabase CLI
npm install -g supabase

# Install Vercel CLI
npm install -g vercel
```

---

## 2. Account Setup

### 2.1 Supabase

Supabase provides PostgreSQL database, authentication, storage, and edge functions.

#### Create Account & Project

1. Go to https://supabase.com
2. Click **Start your project** → Sign up with GitHub (recommended)
3. Click **New Project**
4. Configure:
   - **Organization:** Create new or select existing
   - **Project name:** `reconnect-mvp`
   - **Database password:** Generate strong password → **SAVE THIS**
   - **Region:** `West EU (Ireland)` ← Important for GDPR
   - **Pricing Plan:** Free tier for development, Pro ($25/mo) for production
5. Click **Create new project** → Wait 2-3 minutes for provisioning

#### Get API Keys

1. In your project, go to **Settings** → **API**
2. Copy these values:

| Key | Location | Environment Variable |
|-----|----------|---------------------|
| Project URL | Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon public | Project API keys | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role | Project API keys | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ **NEVER expose `service_role` key in frontend code. Server-only.**

#### Enable Auth Providers (Optional)

1. Go to **Authentication** → **Providers**
2. Enable desired providers:

**Google OAuth:**
1. Toggle **Google** → Enabled
2. You'll need Google Cloud credentials (see section 2.6)
3. Enter Client ID and Client Secret
4. Callback URL: `https://[PROJECT_REF].supabase.co/auth/v1/callback`

**Microsoft OAuth:**
1. Toggle **Azure (Microsoft)** → Enabled
2. Create app at https://portal.azure.com → Azure Active Directory → App registrations
3. Enter Application ID and Client Secret

**LinkedIn OAuth:** REMOVED — Client decision: no LinkedIn login (8.3)

#### Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Customize templates for:
   - Confirm signup
   - Magic Link
   - Reset Password
   - Invite user
3. Update "From" email address in **Settings** → **Auth** → **SMTP Settings** (requires custom SMTP for production)

---

### 2.2 Vercel

Vercel hosts the Next.js application with automatic deployments.

#### Create Account

1. Go to https://vercel.com
2. Click **Sign Up** → Continue with GitHub (recommended)
3. Authorize Vercel to access repositories

#### Install CLI & Login

```bash
# Install globally
npm install -g vercel

# Login
vercel login
# Select login method (GitHub recommended)
```

#### Create Projects

You'll create two projects: main app and landing page.

```bash
# After initializing the monorepo (Section 3), link projects:

# Link main app
cd apps/web
vercel link
# Select: Create new project
# Project name: reconnect-app

# Link landing page
cd ../landing
vercel link
# Select: Create new project
# Project name: reconnect-landing
```

#### Configure Domains (Production)

1. Go to project **Settings** → **Domains**
2. Add custom domain:
   - App: `app.reconnect.io` (or client's domain)
   - Landing: `reconnect.io` (or client's domain)
3. Follow DNS configuration instructions
4. SSL certificates auto-provisioned

---

### 2.3 Anthropic (Claude)

Claude provides AI for market insights, JD generation, and feedback synthesis.

#### Create Account

1. Go to https://console.anthropic.com
2. Click **Sign up** → Create account with email
3. Verify email address
4. Complete onboarding

#### Get API Key

1. Go to **API Keys** in the console
2. Click **Create Key**
3. Name: `reconnect-production`
4. Copy the key immediately → **You won't see it again**

| Key | Environment Variable |
|-----|---------------------|
| API Key | `ANTHROPIC_API_KEY` |

#### Set Up Billing

1. Go to **Plans & Billing**
2. Add payment method
3. Set usage limits (recommended):
   - Soft limit: $100/month
   - Hard limit: $200/month
4. Enable usage alerts

#### API Limits & Pricing

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Context |
|-------|----------------------|------------------------|---------|
| Claude Opus 4.6 | $15.00 | $75.00 | 200K |
| Claude Sonnet 4.5 | $3.00 | $15.00 | 200K |

**Rate Limits (default tier):**
- 50 requests/minute
- 40,000 tokens/minute

---

### 2.4 OpenAI (Whisper)

Whisper API provides speech-to-text transcription for interview recordings.

#### Create Account

1. Go to https://platform.openai.com
2. Click **Sign up** → Create account
3. Verify phone number

#### Get API Key

1. Go to **API Keys** (https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Name: `reconnect-whisper`
4. Copy immediately

| Key | Environment Variable |
|-----|---------------------|
| API Key | `OPENAI_API_KEY` |

#### Set Up Billing

1. Go to **Settings** → **Billing**
2. Add payment method
3. Set monthly budget limit: $50-100 recommended
4. Enable email alerts

#### Whisper Pricing

| Model | Price |
|-------|-------|
| whisper-1 | $0.006 / minute |

**Example:** 30-minute interview = $0.18

---

### 2.5 Resend

Resend handles transactional emails (invites, notifications).

#### Create Account

1. Go to https://resend.com
2. Click **Get Started** → Sign up with GitHub or email
3. Verify email

#### Get API Key

1. Go to **API Keys**
2. Click **Create API Key**
3. Name: `reconnect-production`
4. Permission: **Full access**
5. Copy the key

| Key | Environment Variable |
|-----|---------------------|
| API Key | `RESEND_API_KEY` |

#### Configure Domain (Production)

1. Go to **Domains** → **Add Domain**
2. Enter: `reconnect.io` (or client's domain)
3. Add DNS records as instructed:
   - SPF record
   - DKIM records (3 CNAME records)
4. Click **Verify**
5. Wait for verification (can take up to 48 hours)

#### Free Tier Limits

- 3,000 emails/month
- 100 emails/day
- No custom domain required for testing

---

### 2.6 Google Cloud (Drive API)

Google Drive API enables saving recordings and exporting documents.

#### Create Project

1. Go to https://console.cloud.google.com
2. Click **Select a project** → **New Project**
3. Project name: `reconnect-mvp`
4. Click **Create**

#### Enable APIs

1. Go to **APIs & Services** → **Library**
2. Search and enable:
   - **Google Drive API**
   - **Google Picker API** (for file selection UI)

#### Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure OAuth consent screen first:
   - User Type: **External**
   - App name: `Rec+onnect`
   - User support email: your email
   - Developer contact: your email
   - Scopes: Add `../auth/drive.file`
   - Test users: Add your email
4. Back to Credentials → **Create Credentials** → **OAuth client ID**
5. Application type: **Web application**
6. Name: `Reconnect Web`
7. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://app.reconnect.io
   ```
8. Authorized redirect URIs:
   ```
   http://localhost:3000/api/google-drive/callback
   https://app.reconnect.io/api/google-drive/callback
   ```
9. Click **Create**
10. Copy credentials:

| Key | Environment Variable |
|-----|---------------------|
| Client ID | `GOOGLE_CLIENT_ID` |
| Client Secret | `GOOGLE_CLIENT_SECRET` |

#### Set Redirect URI

| Environment | Value |
|-------------|-------|
| Development | `http://localhost:3000/api/google-drive/callback` |
| Production | `https://app.reconnect.io/api/google-drive/callback` |

Set as `GOOGLE_REDIRECT_URI` environment variable.

#### Publish OAuth App (Production)

Before going live:
1. Go to **OAuth consent screen**
2. Click **Publish App**
3. Complete verification if required (may need privacy policy URL)

---

### 2.7 Google Analytics

GA4 tracks landing page and app usage.

#### Create Account & Property

1. Go to https://analytics.google.com
2. Click **Start measuring**
3. Account name: `Reconnect`
4. Property name: `Reconnect Production`
5. Business details: Select appropriate options
6. Choose **Web** platform
7. Website URL: `https://reconnect.io`
8. Stream name: `Reconnect Landing`
9. Click **Create stream**

#### Get Measurement ID

1. Go to **Admin** → **Data Streams**
2. Select your stream
3. Copy **Measurement ID** (starts with `G-`)

| Key | Environment Variable |
|-----|---------------------|
| Measurement ID | `NEXT_PUBLIC_GA_MEASUREMENT_ID` |

#### Create Second Stream (App)

1. **Admin** → **Data Streams** → **Add stream**
2. Platform: **Web**
3. URL: `https://app.reconnect.io`
4. Stream name: `Reconnect App`

#### Configure Events

Recommended events to track:
- `sign_up` - User registration
- `login` - User login
- `playbook_created` - New playbook
- `jd_generated` - AI JD generation
- `interview_recorded` - Recording completed
- `feedback_submitted` - Feedback entry

---

## 3. Project Initialization

### Clone or Initialize Repository

```bash
# Create project directory
mkdir reconnect && cd reconnect

# Initialize git
git init

# Create monorepo structure
mkdir -p apps/web apps/landing packages/ui packages/database packages/ai packages/config
mkdir -p supabase/migrations supabase/functions
```

### Initialize Root Package

```bash
# Create root package.json
cat > package.json << 'EOF'
{
  "name": "reconnect",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
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
EOF
```

### Configure Turborepo

```bash
# Create turbo.json
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {}
  }
}
EOF
```

### Initialize Main Application (apps/web)

```bash
cd apps/web

# Create Next.js app
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install core dependencies
npm install @supabase/supabase-js @supabase/ssr zustand zod react-hook-form @hookform/resolvers

# Install UI dependencies
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select \
  @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-tooltip \
  class-variance-authority clsx tailwind-merge lucide-react

# Install AI dependencies
npm install @anthropic-ai/sdk openai

# Install utilities
npm install resend date-fns nanoid

# Install dev dependencies
npm install -D @types/node @types/react @types/react-dom
```

### Initialize Landing Page (apps/landing)

```bash
cd ../landing

# Create Next.js app (static export)
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install minimal dependencies
npm install clsx tailwind-merge lucide-react

# Configure for static export - edit next.config.js:
# output: 'export'
```

### Initialize Shared Packages

```bash
# packages/database
cd ../../packages/database
npm init -y
npm install @supabase/supabase-js zod

# packages/ai
cd ../ai
npm init -y
npm install @anthropic-ai/sdk zod

# packages/ui
cd ../ui
npm init -y
npm install react react-dom
npm install -D typescript @types/react
```

### Install All Dependencies

```bash
# Return to root
cd ../..

# Install all workspaces
npm install
```

---

## 4. Environment Configuration

### Create Environment Files

```bash
# Root .env.example (copy to .env.local for development)
cat > .env.example << 'EOF'
# ===========================================
# Rec+onnect Environment Variables
# ===========================================
# Copy this file to .env.local and fill in values

# ----- Supabase -----
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ----- Anthropic (Claude) -----
ANTHROPIC_API_KEY=sk-ant-...

# ----- OpenAI (Whisper) -----
OPENAI_API_KEY=sk-...

# ----- Resend (Email) -----
RESEND_API_KEY=re_...

# ----- Google Cloud -----
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-drive/callback

# ----- Application -----
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ----- Analytics (Landing Page) -----
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...
EOF
```

### Environment by Stage

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://staging.reconnect.io` | `https://app.reconnect.io` |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/...` | `https://staging.../api/...` | `https://app.../api/...` |
| Database | Supabase Free | Supabase Free | Supabase Pro |

### Configure Vercel Environment Variables

1. Go to Vercel project **Settings** → **Environment Variables**
2. Add each variable with appropriate scope:
   - **Production**: Production deployments only
   - **Preview**: Branch/PR deployments
   - **Development**: Local development via `vercel env pull`

```bash
# Pull env vars to local
cd apps/web
vercel env pull .env.local
```

---

## 5. Database Setup

### Connect Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref [PROJECT_REF]
# Enter database password when prompted
```

### Create Initial Migration

```bash
# Create migrations directory
mkdir -p supabase/migrations

# Create initial schema migration
cat > supabase/migrations/20260201000000_initial_schema.sql << 'EOF'
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'interviewer')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playbooks table
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

-- Interview Stages table
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

-- Candidates table
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

-- Interviews table
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

-- Feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id UUID REFERENCES users(id) NOT NULL,
  ratings JSONB NOT NULL,
  notes TEXT,
  pros TEXT,
  cons TEXT,
  recommendation TEXT CHECK (recommendation IN ('strong_yes', 'yes', 'neutral', 'no', 'strong_no')),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Synthesis table
CREATE TABLE ai_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  synthesis_type TEXT NOT NULL,
  content JSONB NOT NULL,
  model_used TEXT,
  prompt_version TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collaborators table
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

-- Share Links table
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

-- Audit Logs table
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

-- Create indexes for performance
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_playbooks_org ON playbooks(organization_id);
CREATE INDEX idx_playbooks_status ON playbooks(status);
CREATE INDEX idx_candidates_playbook ON candidates(playbook_id);
CREATE INDEX idx_candidates_status ON candidates(status);
CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_feedback_interview ON feedback(interview_id);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_playbooks_updated_at
  BEFORE UPDATE ON playbooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EOF
```

### Create RLS Policies Migration

```bash
cat > supabase/migrations/20260201000001_rls_policies.sql << 'EOF'
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

-- Helper function: Get user's organization ID
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: Get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = get_user_org_id());

CREATE POLICY "Admins can update own organization"
  ON organizations FOR UPDATE
  USING (id = get_user_org_id() AND is_org_admin());

-- Users policies
CREATE POLICY "Users can view members of own org"
  ON users FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can manage org users"
  ON users FOR ALL
  USING (organization_id = get_user_org_id() AND is_org_admin());

-- Playbooks policies
CREATE POLICY "Users can view org playbooks"
  ON playbooks FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Managers+ can create playbooks"
  ON playbooks FOR INSERT
  WITH CHECK (
    organization_id = get_user_org_id() 
    AND get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Managers+ can update playbooks"
  ON playbooks FOR UPDATE
  USING (
    organization_id = get_user_org_id() 
    AND get_user_role() IN ('admin', 'manager')
  );

CREATE POLICY "Admins can delete playbooks"
  ON playbooks FOR DELETE
  USING (organization_id = get_user_org_id() AND is_org_admin());

-- Interview stages policies
CREATE POLICY "Users can view stages of accessible playbooks"
  ON interview_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playbooks 
      WHERE playbooks.id = interview_stages.playbook_id 
      AND playbooks.organization_id = get_user_org_id()
    )
  );

CREATE POLICY "Managers+ can manage stages"
  ON interview_stages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM playbooks 
      WHERE playbooks.id = interview_stages.playbook_id 
      AND playbooks.organization_id = get_user_org_id()
    )
    AND get_user_role() IN ('admin', 'manager')
  );

-- Candidates policies
CREATE POLICY "Users can view org candidates"
  ON candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playbooks 
      WHERE playbooks.id = candidates.playbook_id 
      AND playbooks.organization_id = get_user_org_id()
    )
  );

CREATE POLICY "Managers+ can manage candidates"
  ON candidates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM playbooks 
      WHERE playbooks.id = candidates.playbook_id 
      AND playbooks.organization_id = get_user_org_id()
    )
    AND get_user_role() IN ('admin', 'manager')
  );

-- Interviews policies
CREATE POLICY "Users can view relevant interviews"
  ON interviews FOR SELECT
  USING (
    interviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM candidates 
      JOIN playbooks ON playbooks.id = candidates.playbook_id
      WHERE candidates.id = interviews.candidate_id 
      AND playbooks.organization_id = get_user_org_id()
      AND get_user_role() IN ('admin', 'manager')
    )
  );

-- Feedback policies (blind until submitted)
CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  USING (interviewer_id = auth.uid());

CREATE POLICY "Managers can view all feedback after submission"
  ON feedback FOR SELECT
  USING (
    get_user_role() IN ('admin', 'manager')
    AND EXISTS (
      SELECT 1 FROM interviews
      JOIN candidates ON candidates.id = interviews.candidate_id
      JOIN playbooks ON playbooks.id = candidates.playbook_id
      WHERE interviews.id = feedback.interview_id
      AND playbooks.organization_id = get_user_org_id()
    )
  );

CREATE POLICY "Interviewers can submit feedback"
  ON feedback FOR INSERT
  WITH CHECK (interviewer_id = auth.uid());

-- AI Synthesis policies
CREATE POLICY "Managers+ can view synthesis"
  ON ai_synthesis FOR SELECT
  USING (
    get_user_role() IN ('admin', 'manager')
    AND EXISTS (
      SELECT 1 FROM candidates
      JOIN playbooks ON playbooks.id = candidates.playbook_id
      WHERE candidates.id = ai_synthesis.candidate_id
      AND playbooks.organization_id = get_user_org_id()
    )
  );

-- Audit logs policies (admin only)
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (organization_id = get_user_org_id() AND is_org_admin());
EOF
```

### Apply Migrations

```bash
# Push to Supabase
supabase db push

# Verify migration applied
supabase db diff
```

### Generate TypeScript Types

```bash
# Generate types from schema
supabase gen types typescript --local > apps/web/src/types/database.ts
```

---

## 6. Local Development

### Start Development Servers

```bash
# From root directory
npm run dev

# This starts:
# - apps/web on http://localhost:3000
# - apps/landing on http://localhost:3001
```

### Start Supabase Locally (Optional)

```bash
# Start local Supabase instance
supabase start

# This provides:
# - Local PostgreSQL on localhost:54322
# - Local Auth on localhost:54321
# - Local Storage
# - Studio UI on localhost:54323

# Stop when done
supabase stop
```

### Seed Development Data

```bash
# Create seed file
cat > supabase/seed.sql << 'EOF'
-- Create test organization
INSERT INTO organizations (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Company',
  'test-company',
  '{"default_currency": "EUR", "timezone": "Europe/Dublin"}'
);

-- Create test admin user (link to auth.users after signup)
-- Note: Run this AFTER creating a user through auth
EOF
```

### Useful Development Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Clean build cache
npm run clean

# Database operations
npm run db:push          # Push migrations
npm run db:generate      # Regenerate types
supabase db reset        # Reset local DB
supabase db dump -f dump.sql  # Backup
```

---

## 7. Deployment

### Deploy to Vercel

```bash
# Deploy main app
cd apps/web
vercel --prod

# Deploy landing page
cd ../landing
vercel --prod
```

### Configure Production Environment

1. Set all environment variables in Vercel dashboard
2. Configure custom domains
3. Enable Vercel Analytics (optional)
4. Set up preview deployments for branches

### Production Checklist

- [ ] All environment variables set in Vercel
- [ ] Custom domains configured with SSL
- [ ] Supabase upgraded to Pro plan
- [ ] Google OAuth app published
- [ ] Resend domain verified
- [ ] Error monitoring enabled (Sentry recommended)
- [ ] Backup strategy confirmed
- [ ] Rate limiting configured

---

## 8. Post-Deployment Checklist

### Security Verification

- [ ] RLS policies tested with multiple user roles
- [ ] Service role key not exposed in frontend
- [ ] CORS configured correctly
- [ ] Rate limiting active on AI endpoints
- [ ] Input validation on all forms

### Performance Verification

- [ ] Lighthouse score > 90 for landing page
- [ ] API response times < 500ms (except AI)
- [ ] Images optimized and lazy-loaded
- [ ] Bundle size < 200KB initial load

### Monitoring Setup

- [ ] Vercel Analytics enabled
- [ ] Google Analytics configured
- [ ] Error tracking (Sentry) configured
- [ ] Uptime monitoring configured
- [ ] AI usage alerts set

---

## 9. Troubleshooting

### Common Issues

**"Invalid API Key" from Anthropic/OpenAI**
- Verify key copied correctly (no extra spaces)
- Check key hasn't expired or been revoked
- Confirm billing is set up

**"RLS violation" errors**
- User not authenticated
- User trying to access different organization's data
- Check JWT token contains correct claims

**Google OAuth redirect mismatch**
- Ensure `GOOGLE_REDIRECT_URI` exactly matches Google Console config
- Check for http vs https mismatch
- Verify port number in development

**Supabase connection issues**
- Check `NEXT_PUBLIC_SUPABASE_URL` format
- Verify project is not paused (free tier pauses after 1 week inactivity)
- Check database password if using direct connection

**Vercel deployment fails**
- Check build logs for TypeScript errors
- Verify all environment variables are set
- Ensure dependencies are in correct package.json

### Getting Help

- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- Anthropic: https://docs.anthropic.com
- OpenAI: https://platform.openai.com/docs

---

## Quick Reference

### All Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Email
RESEND_API_KEY=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
```

### Monthly Cost Estimates

| Service | Low Usage | High Usage |
|---------|-----------|------------|
| Supabase Pro | $25 | $25 |
| Vercel Pro | $20 | $20 |
| Claude API | $30 | $100 |
| Whisper API | $10 | $50 |
| Resend | $0 | $20 |
| **Total** | **$85** | **$215** |

---

*Document Version: 1.0*  
*Created: February 2026*  
*Author: Akella inMotion*
