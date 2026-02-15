# PLAN.md — Rec+onnect MVP Execution Plan

**Project:** Rec+onnect MVP (8 weeks)
**Mode:** Swarm workflow (Lead → Specialists → Gates → Merge)
**Core chapters:** Discovery → Process → Alignment → Debrief
**Status:** READY TO EXECUTE

---

## Step Files

Each macro step is fully detailed in the `../steps/` directory:

| Step | File | Status |
|------|------|--------|
| 1 | [step-01-pre-development.md](../steps/step-01-pre-development.md) | NOT STARTED |
| 2 | [step-02-monorepo-foundation.md](../steps/step-02-monorepo-foundation.md) | NOT STARTED |
| 3 | [step-03-supabase-core.md](../steps/step-03-supabase-core.md) | NOT STARTED |
| 4 | [step-04-landing-page.md](../steps/step-04-landing-page.md) | NOT STARTED |
| 5 | [step-05-web-app-shell.md](../steps/step-05-web-app-shell.md) | NOT STARTED |
| 6 | [step-06-ai-platform.md](../steps/step-06-ai-platform.md) | NOT STARTED |
| 7 | [step-07-playbook-creation.md](../steps/step-07-playbook-creation.md) | NOT STARTED |
| 8 | [step-08-chapters-discovery-process.md](../steps/step-08-chapters-discovery-process.md) | NOT STARTED |
| 9 | [step-09-chapters-alignment-debrief.md](../steps/step-09-chapters-alignment-debrief.md) | NOT STARTED |
| 10 | [step-10-integrations-delivery.md](../steps/step-10-integrations-delivery.md) | NOT STARTED |

---

## Swarm Rules for This Plan

* Work proceeds **Step 1 → Step 10 in order**.
* Each step has **3–10 micro-steps** defined in its file.
* A step is **Done only when DoD is green** (checks + acceptance criteria).
* Always enforce compliance: **text-based analysis only**, **human review**, **candidate recording notice**, retention/erasure support. 

---

## Step 1 — Pre-Development Setup

### Goal

Ensure project kickoff readiness: agreements, access, brand inputs, dev environment.

### Deliverables

* Client checklist complete (agreement, deposit, onboarding, domain, logo, colors)
* Developer environment prepared (Node, CLIs, VS Code extensions)
* Accounts ready (Supabase, Vercel, Anthropic, GA4, Resend, OpenAI, Google Cloud)

### Definition of Done

* All required accounts created and keys stored securely
* Repo created + initial README + project structure agreed

### Default Owners

* Lead/Architect + Release/DevOps

---

### Micro Steps

#### Step 1.1 — Verify Client Prerequisites
**Owner agent:** Lead/Architect
**Supporting agents:** None
**Allowed paths:** `docs/`, `README.md`
**API/DB contracts:** None
**Tests required:** None
**DoD commands:** Manual verification checklist
**Security/compliance checklist:** N/A

**Tasks:**
- [ ] Confirm signed Project Agreement received
- [ ] Confirm deposit paid (€6,150 inc VAT)
- [ ] Confirm Onboarding Questionnaire completed
- [ ] Confirm domain purchased/decided
- [ ] Confirm logo files received (SVG/PNG)
- [ ] Confirm brand colors (hex codes) documented

**Output:** Client readiness checklist (all green or blockers documented)

---

#### Step 1.2 — Set Up Developer Environment
**Owner agent:** Release/DevOps
**Supporting agents:** Lead/Architect
**Allowed paths:** `docs/setup.md`, `.nvmrc`, `.node-version`
**API/DB contracts:** None
**Tests required:** `node --version`, `pnpm --version`
**DoD commands:**
```bash
node --version  # Expect 20.x
pnpm --version  # Expect 8.x+
turbo --version
supabase --version
vercel --version
```
**Security/compliance checklist:** N/A

**Tasks:**
- [ ] Verify Node.js 20.x installed
- [ ] Verify pnpm 8.x installed
- [ ] Install global CLIs: `pnpm add -g turbo supabase vercel`
- [ ] Configure VS Code extensions (ESLint, Prettier, Tailwind, GitLens)
- [ ] Document setup in `docs/setup.md`

**Output:** All CLI versions verified, setup docs created

---

#### Step 1.3 — Create External Service Accounts
**Owner agent:** Release/DevOps
**Supporting agents:** Security/Compliance
**Allowed paths:** `.env.example`, `docs/accounts.md`
**API/DB contracts:** None
**Tests required:** None (manual verification)
**DoD commands:** Manual API key validation
**Security/compliance checklist:**
- [ ] All API keys stored in password manager (not in code)
- [ ] .env.example created with placeholder keys

**Tasks:**
- [ ] Create Supabase project (West EU - Ireland region for GDPR)
- [ ] Create Vercel account/team
- [ ] Create Anthropic account (Claude API)
- [ ] Create Google Analytics 4 property
- [ ] Document account credentials securely
- [ ] Create `.env.example` with all required variables

**Accounts to create (Week 1 priority):**
| Service | URL | Purpose |
|---------|-----|---------|
| Supabase | supabase.com | Database, Auth, Storage |
| Vercel | vercel.com | Hosting |
| Anthropic | console.anthropic.com | Claude API |
| Google Analytics | analytics.google.com | Landing tracking |

**Accounts to create (Later weeks):**
| Service | URL | Purpose | Week |
|---------|-----|---------|------|
| Resend | resend.com | Email | 3 |
| OpenAI | platform.openai.com | Whisper | 5 |
| Google Cloud | console.cloud.google.com | Drive API | 6 |

**Output:** All Week 1 accounts created, .env.example ready

---

#### Step 1.4 — Initialize Git Repository
**Owner agent:** Release/DevOps
**Supporting agents:** Lead/Architect
**Allowed paths:** All (initial repo setup)
**API/DB contracts:** None
**Tests required:** `git status`
**DoD commands:**
```bash
git status
git log --oneline -1
```
**Security/compliance checklist:**
- [ ] .gitignore includes .env, node_modules, .next, etc.
- [ ] No secrets committed

**Tasks:**
- [ ] Initialize git repository
- [ ] Create `.gitignore` (Node, Next.js, Supabase, env files)
- [ ] Create initial `README.md` with project overview
- [ ] Create branch protection rules (if using GitHub)
- [ ] Set up branch naming convention documentation

**Output:** Git repo initialized with README and .gitignore

---

#### Step 1.5 — Document Project Structure Agreement
**Owner agent:** Lead/Architect
**Supporting agents:** All agents (review)
**Allowed paths:** `docs/architecture.md`, `PLAN.md`
**API/DB contracts:** Directory structure contract
**Tests required:** None
**DoD commands:** Document review complete
**Security/compliance checklist:** N/A

**Tasks:**
- [ ] Document agreed directory structure:
  ```
  reconnect/
  ├── apps/
  │   ├── web/          # Main application
  │   └── landing/      # Marketing site
  ├── packages/
  │   ├── ui/           # Shared UI components
  │   ├── database/     # Supabase types & queries
  │   ├── ai/           # Claude integration
  │   └── config/       # Shared configuration
  ├── supabase/
  │   ├── migrations/   # Database migrations
  │   └── functions/    # Edge functions
  └── docs/             # Documentation
  ```
- [ ] Document technology choices and versions
- [ ] Document naming conventions
- [ ] Get sign-off from all agent roles

**Output:** `docs/architecture.md` created and agreed

---

### Step 1 Completion Criteria

All micro steps (1.1 - 1.5) must be complete before proceeding to Step 2.

| Micro Step | Owner | Status |
|------------|-------|--------|
| 1.1 Client Prerequisites | Architect | PENDING |
| 1.2 Dev Environment | DevOps | PENDING |
| 1.3 Service Accounts | DevOps | PENDING |
| 1.4 Git Repository | DevOps | PENDING |
| 1.5 Project Structure | Architect | PENDING |

---

## Step 2 — Monorepo Foundation

### Goal

Create a stable Turborepo foundation for app + landing + shared packages.

### Deliverables

* Monorepo structure: `apps/web`, `apps/landing`, `packages/*`, `supabase/*`
* Root scripts (`dev`, `build`, `lint`, `type-check`, db helpers)
* Turbo pipeline configured 

### Definition of Done

* `pnpm|npm` install works
* `turbo run dev` starts both apps (or staged)
* `turbo run lint` and `turbo run type-check` succeed

### Default Owners

* Release/DevOps + Lead/Architect

---

## Step 3 — Supabase Core: Schema, Auth, RLS

### Goal

Set up multi-tenant database + auth + baseline security (RLS).

### Deliverables

* Supabase project (EU region for GDPR)
* Initial schema migration (orgs/users/playbooks/stages/candidates/interviews/feedback/ai_synthesis/collab/share_links/audit_logs)
* RLS enabled + baseline policies + helper functions
* Generated TS types for DB 

### Definition of Done

* Migrations apply cleanly
* RLS policies verified (basic isolation)
* Auth flow functional in dev (sign up, login, session)

### Default Owners

* Backend/Data + Security/Compliance

---

## Step 4 — Landing Page (Marketing Site)

### Goal

Ship a production-grade landing page with SEO + GA4 tracking.

### Deliverables

* Landing sections (Hero, Problem/Solution, 4-chapter features, How it Works, CTA, Footer)
* SEO: meta tags, OG/Twitter, JSON-LD, sitemap, robots, canonical
* GA4: basic events (CTA clicks, scroll depth) + conversion goals
* Performance targets (Lighthouse 90+ etc.) 

### Definition of Done

* Landing deployed on staging
* Lighthouse targets met (or documented exceptions)
* GA4 events visible

### Default Owners

* Frontend Builder + Release/DevOps

---

## Step 5 — Web App Shell + Core UI Library

### Goal

Create the app skeleton and reusable UI patterns for the dashboard experience.

### Deliverables

* App Router structure with auth routes + dashboard routes
* Layout: sidebar nav, header, responsiveness
* Core UI components: forms, modals, toasts, tables, empty/loading states, error boundaries 

### Definition of Done

* User can authenticate and access dashboard shell
* Navigation + placeholder pages exist for playbooks/candidates/team/settings

### Default Owners

* Frontend Builder + Lead/Architect

---

## Step 6 — AI Platform Setup (Claude + Schemas + Prompts)

### Goal

Create a safe, structured AI layer that never ships “free-form” outputs.

### Deliverables

* Claude client config (Opus for deep, Sonnet for fast)
* Zod schemas (JD, Market Insights, Stages, Synthesis)
* Prompt templates with strict JSON-only outputs
* Basic error handling & output validation
* “prompt_version” + “model_used” capture plan 

### Definition of Done

* API test route returns schema-valid JSON
* Validation failures handled gracefully (no app crash)
* Compliance guardrails documented

### Default Owners

* AI Engineer + Security/Compliance

---

## Step 7 — Playbook Creation Flow (Wizard + Persistence)

### Goal

Enable creation of a Playbook and storage of generated content.

### Deliverables

* Playbook wizard: basic info → role details → AI generation
* Zustand store for draft
* DB persistence for playbooks, draft/active states
* UX states: loading, error, retry, save, resume 

### Definition of Done

* User can create a playbook and revisit it
* Generated content stored and reloadable

### Default Owners

* Frontend Builder + Backend/Data + QA/Test Engineer

---

## Step 8 — Chapters: Discovery + Process

### Goal

Ship the first half of the core product loop.

### Deliverables

**Discovery**

* Market Insights (two-phase: quick + deep research)
* JD Generator (styles + Tiptap editing + regenerate sections)
* Save results to playbook 

**Process**

* Stage generator API + discipline templates
* Stage management UI (drag/drop, edit, assign interviewer, total timeline)
* Question suggestions + question bank foundation 

### Definition of Done

* User can complete Discovery + Process end-to-end for a playbook
* Data saved and reloadable
* Basic tests added for key flows

### Default Owners

* Frontend Builder + Backend/Data + AI Engineer + QA/Test Engineer (+ Security review on AI)

---

## Step 9 — Chapters: Alignment + Debrief

### Goal

Ship collaboration + feedback loop + compliant synthesis.

### Deliverables

**Alignment**

* Candidate profile builder
* Process summary dashboard
* Collaborator system + Resend email invites
* Share links + public read-only page (/share/[token]) 

**Debrief**

* Recording (MediaRecorder) + upload
* Whisper transcription pipeline
* Feedback forms + blind feedback rules
* AI synthesis (text-only, disclaimer, divergence highlights) 

### Definition of Done

* Teams can collaborate end-to-end: invite → assign → record → transcribe → submit feedback → view synthesis
* Compliance gates satisfied (see below)

### Compliance Gate (Mandatory)

* **Text-only synthesis** (no emotion/hesitation/lie detection)
* **Candidate informed before recording**
* **Human review disclaimer present**
* Retention/erasure path designed (MVP-level) 

### Default Owners

* Frontend Builder + Backend/Data + AI Engineer + QA/Test Engineer + Security/Compliance

---

## Step 10 — Integrations, Hardening, Beta, Delivery

### Goal

Make it reliable + shippable: Drive export, performance, security, beta testing, handover.

### Deliverables

* Google Drive OAuth + upload/export flows
* Bug fixing + optimization (bundle, query speed, UX polish)
* Security checklist pass (auth on all routes, rate limiting AI, safe uploads, logs)
* Prod deployment + beta plan (5–10 testers)
* Documentation + handover checklist 

### Definition of Done

* Production deployed with correct env vars and migrations
* Beta scenarios pass (playbook full loop, invites, recording, transcription, synthesis, share, export)
* Docs delivered + handover complete

### Default Owners

* Release/DevOps + QA/Test Engineer + Security/Compliance + Lead/Architect

---

## Appendix — Step Template You’ll Use Later

When you break each step into 3–6 micro-steps, use this template:

* **Micro-step X.Y Title**

  * Owner agent:
  * Allowed files:
  * API / DB contract:
  * Tests required:
  * DoD commands:
  * Output report format:
