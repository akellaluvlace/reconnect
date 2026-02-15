# CLAUDE_SWARM.md — Rec+onnect MVP Swarm Operating System

This file is the **single source of truth** for how Claude Code should run a multi-agent ("swarm-like") workflow on this repo.

Project: **Rec+onnect MVP**
Stack: Next.js (App Router) + Tailwind + shadcn/ui + Zustand + RHF/Zod + Supabase (RLS) + Edge Functions + Vercel + Claude (Opus/Sonnet) + Whisper + Resend + Google Drive OAuth.

---

## 0) Non-Negotiable Compliance & Safety Rules

These rules override all other instructions.

### 0.1 EU AI Act / GDPR constraints (hard ban list)
We MUST NOT implement or imply features that:
- infer emotions from voice/video (biometric emotion inference),
- detect deception / "lie detection",
- analyze hesitation/confidence from tone/voice,
- do behavioral manipulation or covert persuasion.

**Debrief / recording / transcription**:
- Always show a **candidate informed notice** before recording.
- Always include **human review** disclaimers for AI-generated synthesis.
- Store the minimum viable data; support basic retention/erasure mechanisms.

### 0.2 Text-based analysis only
All AI synthesis must operate on **text transcripts + text feedback forms**. No audio "signals" analysis.

### 0.3 Least privilege
Agents may only do what their role allows.
- Reviewers and Security are read-only unless explicitly overridden.
- DB/RLS changes require Security review.

---

## 1) Repo Boundaries & Ownership (high level)

### 1.1 Apps
- `apps/web` — main MVP application
- `apps/landing` — marketing site

### 1.2 Packages
- `packages/ui` — reusable components/design system
- `packages/database` — Supabase types, query helpers, migrations interface
- `packages/ai` — prompts, schemas, clients, validators
- `packages/config` — shared config (eslint/tsconfig/etc.)

### 1.3 Supabase
- `supabase/migrations` — SQL migrations
- `supabase/functions` — Edge Functions (if used)
- RLS policies are **mandatory** for multi-tenancy.

---

## 2) Swarm Workflow — The Only Way Work Proceeds

We execute in **macro steps (1–10)**. Each macro step is broken into **3–6 micro steps**.

### 2.1 The Loop Contract ("continue until done")
For every micro step, the owner agent must repeat:

1) Plan (short)
2) Implement (minimal diff)
3) Verify (run required commands)
4) Fix failures
5) Report completion with evidence OR declare a blocker (exact error + next action)

A micro step is DONE only when its **Definition of Done** is satisfied.

### 2.2 Parallelism rules
- Max **3 active micro steps** in parallel.
- Only parallelize if file ownership doesn't collide.
- Use separate branches per micro step.

### 2.3 Branch naming
- `step{NN}-{micro}-{short-slug}`
Examples:
- `step03-db-rls-baseline`
- `step06-ai-market-insights-schema`
- `step08-ui-process-stages`

### 2.4 Merge gates
No merge unless:
- Required checks pass (lint/typecheck/tests)
- Security review complete for: auth, RLS, recording, sharing, OAuth
- AI outputs validate against Zod schemas

---

## 3) Agent Roster (8 agents) & What They Do

We use a **thin lead + thick specialists** model.

### 3.0 Model Escalation Policy

All agents can escalate to **Opus** when facing:
- Complex architectural decisions
- Multi-system debugging
- Security vulnerability analysis
- Performance optimization requiring deep reasoning

Default to **Sonnet** for routine implementation work.

### 3.1 Lead / Architect (Model: Opus)
Owns:
- macro→micro decomposition
- interface contracts (Zod, API, DB)
- ADR decisions
- final integration sequencing
- approves merges

### 3.2 Frontend Builder (Model: Sonnet, Opus for complex state/architecture)
Owns:
- App Router pages, components, UI states
- shadcn/ui patterns, RHF forms
- navigation + dashboard shell
- Tiptap integration + editor flows

**Escalate to Opus:** Complex state management, architectural decisions, performance issues

### 3.3 UI Builder (Model: Sonnet, Opus for design systems)
Owns:
- Visual implementation using Tailwind + shadcn/ui
- Design quality and hierarchy
- Accessibility compliance
- Responsive layouts
- Loading/empty/error states

**MCP Plugins:**
- **shadcn MCP** — component reference, props, examples
- **frontend-design skill** — hierarchy, spacing, visual polish
- **Figma MCP** (optional) — design token extraction

**Escalate to Opus:** Complex layouts, design system decisions, accessibility audits

### 3.4 Backend / Data (Model: Sonnet, Opus for complex RLS/queries)
Owns:
- Supabase schema/migrations
- RLS policies & helper functions
- server actions / API routes
- query layer and types integration

**Escalate to Opus:** Complex RLS design, multi-table transactions, security analysis

### 3.5 AI Engineer (Model: Opus for prompts, Sonnet for wiring)
Owns:
- prompt templates
- strict JSON outputs
- Zod schemas and runtime validation
- prompt_version + model_used tracking
- retry/fallback patterns

### 3.6 QA / Test Engineer (Model: Sonnet)
Owns:
- unit/integration tests
- Playwright smoke tests for critical flows
- regression suite for escaped bugs
- flake elimination

### 3.7 Security / Compliance (Model: Sonnet, read-mostly)
Owns:
- banned feature checks (emotion/deception/biometrics)
- consent notice + human review disclaimer checks
- RLS tenant isolation review
- secrets hygiene + OAuth scope review
- upload safety and rate limiting recommendations

### 3.8 Release / DevOps (Model: Sonnet)
Owns:
- GitHub Actions CI
- Vercel env vars & preview deployments
- Supabase migration pipeline strategy
- release checklists and deployment docs

---

## 4) How Claude Code Should Set Up Agents (Project Layout)

Create agent definition files at:

`.claude/agents/architect.md`
`.claude/agents/frontend.md`
`.claude/agents/ui-builder.md`
`.claude/agents/backend.md`
`.claude/agents/ai-engineer.md`
`.claude/agents/qa.md`
`.claude/agents/security.md`
`.claude/agents/devops.md`

Each agent file must include:
- name
- purpose
- role rules
- output format
- model escalation criteria (when to use Opus vs Sonnet)

### MCP Plugin Configuration (UI Builder)

The UI Builder agent requires these MCP plugins when available:
- **shadcn MCP** — Component documentation and usage reference
- **frontend-design skill** — Design quality checklist and patterns
- **Figma MCP** (optional) — Design token extraction from Figma files

> NOTE: If Claude Code supports YAML frontmatter for subagents in your setup, include it. If not, keep the same content without frontmatter.

---

## 5) Standard Commands (adjust to package.json if needed)

### 5.1 Repo commands (baseline)
- Install: `pnpm install`
- Dev: `pnpm dev` (or `turbo dev`)
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Unit tests: `pnpm test`
- E2E (Playwright): `pnpm e2e`

### 5.2 Supabase (typical)
- Local start: `supabase start`
- Reset: `supabase db reset`
- Apply migrations: `supabase migration up`
- Generate types: `supabase gen types typescript --local > packages/database/src/types.ts`

### 5.3 CI requirement
CI must run at minimum:
- lint + typecheck + unit tests
Optionally:
- Playwright smoke on PRs to main (or nightly)

---

## 6) Definition of Done (DoD) — Global

A micro step is "Done" only if:
- Code compiles and typechecks
- Lint passes
- Relevant tests pass (unit/integration; plus e2e for critical flows)
- No compliance bans violated
- If DB/RLS touched: tenant isolation verified
- If AI touched: Zod validation + golden tests exist
- If recording/transcription touched: consent + disclaimers present

---

## 7) Output Formats (Strict)

All agents must report in this format:

### 7.1 Completion Report (required)
**Micro step:** Step NN.X — Title
**Branch:** name
**Files changed:** list
**Commands run:** exact commands
**Results:** pass/fail summaries
**Screens/UX notes:** (frontend only)
**Risks / TODO:** short
**Ready to merge?** yes/no

### 7.2 Blocker Report (required)
**Micro step:** Step NN.X — Title
**Blocked by:** exact error + logs
**Tried:** what you attempted
**Fix options:** 1–3 options
**Recommendation:** best option + why

---

## 8) Macro Steps (High-Level Plan)

These are the macro steps. Each will be expanded into 3–6 micro steps in `PLAN.md`.

1) Pre-Development Setup (accounts, keys, baseline readiness)
2) Monorepo Foundation (apps + packages + scripts)
3) Supabase Core (schema, auth, RLS)
4) Landing Page (SEO, analytics, performance)
5) Web App Shell + Core UI (auth, dashboard, nav, common components)
6) AI Platform Setup (schemas, prompts, validation, versioning)
7) Playbook Creation Flow (wizard, persistence, regenerate)
8) Chapters: Discovery + Process
9) Chapters: Alignment + Debrief (collab, invites, recording, synthesis)
10) Integrations + Hardening + Beta + Delivery (Drive, polish, security, docs)

---

## 9) Step Execution Template (Micro Steps)

When expanding any macro step into micro steps, use:

### Step NN.X — Micro Step Title
**Owner agent:**
**Supporting agents:**
**Allowed paths:**
**API/DB contracts:**
**Tests required:**
**DoD commands:**
**Security/compliance checklist:**

---

## 10) AI System Rules (Critical)

### 10.1 Strict structured output
All AI responses must be:
- JSON-only
- Validated via Zod at runtime
- Stored with metadata: `model_used`, `prompt_version`, `generated_at`

### 10.2 Golden tests
For each AI endpoint:
- add a minimal golden test with expected schema validity
- add a "weird input" test (empty-ish, long text, odd chars)
- ensure graceful failure path (no crash; user sees retry)

### 10.3 Rate limiting & cost control
- Add basic server-side rate limiting for AI calls per org/user.
- Cache where safe (e.g., market insights quick phase).

---

## 11) Supabase / RLS Rules (Critical)

### 11.1 Tenant isolation is sacred
Any RLS change must prove:
- org A cannot read/write org B
- share links only grant the minimal read-only access intended

### 11.2 Migration discipline
- One migration per micro step touching DB.
- No hand-edits in production without migration scripts.

---

## 12) Recording / Transcription Rules (Critical)

If implementing any recording feature:
- Must show candidate notice before recording starts.
- Must log that notice was shown/accepted (MVP-level).
- Transcription is text output only; no emotion/tone inference.

---

## 13) Review & Security Gates

### 13.1 When Security must review
- Auth/session changes
- RLS/migrations
- Share links/public routes
- Recording/transcription
- OAuth integrations (Google Drive)
- File uploads

### 13.2 Reviewer checklist (short)
- boundaries respected
- naming consistent
- error handling present
- no duplication
- tests added/updated

---

## 14) How To Run This In Practice (Daily)

1) Read `CLAUDE.md` (master key file at project root — auto-loaded)
2) Read `.claude/SWARM_STATUS.md` for current progress
3) Lead selects next micro step(s)
4) Assign to owner agents (max 3 parallel)
5) Each agent works until DoD (loop contract)
6) Security/Reviewer pass
7) Open PR → CI runs → merge
8) Mark micro step done in `.claude/SWARM_STATUS.md` and update `CLAUDE.md` Current State

---

## 15) What Claude Must Do First When Starting Work

On session start:
1) Read `CLAUDE.md` (auto-loaded at project root)
2) Read `.claude/SWARM_STATUS.md` for detailed progress
3) Read `steps/step-{NN}-*.md` for current step
4) Propose branch name + DoD commands
5) Begin execution using the correct owner agent

---

## 16) Client Decisions (from Onboarding Questionnaire)

These decisions override any conflicting defaults in planning docs.

### Platform Model
- SaaS multi-company (multi-tenant)
- Internal-only (NO candidate-facing portal)
- User belongs to ONE org only (critical for data isolation)
- White-label branding per org (optional feature)
- Desktop-only (no mobile responsive requirement)

### Authentication
- Primary: Email + password (strict requirements)
- Social: Google OAuth + Microsoft OAuth
- NO LinkedIn login
- NO 2FA for MVP
- Magic links for external collaborators (without full accounts)

### Roles & Permissions
- 1 designated admin per company
- Hiring Managers CAN create playbooks (no approval workflow needed)
- Interviewers see ONLY their own feedback (blind until submitted)
- Hiring Manager sees ALL feedback
- Salary expectations visible to managers + admin only

### Feedback & Ratings
- Rating scale: 1-4 (NOT 1-5)
- NO AI hire/no-hire recommendation (highlight points only, human decides)
- Required field: confirmation that focus areas were discussed
- Feedback structure: JSONB arrays for pros/cons (not TEXT)

### AI Generation Constraints
- 2-3 focus areas per interview stage
- 3-5 questions per focus area
- AI tone: Professional / Friendly
- JD style: Always ask user (no default)
- JD length: Standard (editable)
- AI-generated disclaimers: Yes (with toggle)
- Currency: Auto-detect based on job location (mostly EUR)

### Notifications
- Email-only (NO in-app notifications for MVP)
- Configurable preferences per user
- Notify on: collaborator assignment, feedback submitted, AI synthesis ready, reminders

### Data & Compliance
- Retention: 1 year, then auto reachout to candidate to opt in/out
- Build GDPR deletion flow
- NO auto-delete rejected candidates
- NO PDF export, NO CSV export
- Default timezone: Europe/Dublin

### Landing Page
- Design inspiration: ta.guru (style/layout)
- Primary CTA: "Book a demo"
- Key messages: "Hire with clarity. Not chaos." / "We help you hire with confidence"
- Sections: Solution – How it works – Book a demo – Sign in
- Contact: Both (form + email link)

### CMS Admin Controls (org admin can edit)
- Skills taxonomy
- Industry/discipline categories
- Job level definitions
- Interview stage templates
- Question bank
- JD templates
- Email templates
- NO reusable playbook templates

### Default Interview Stages
- HR screen + reference check (both removable/optional)

### Business Model (future)
- Per-playbook charging
- Tiered pricing (TBC)
- Free trial: one playbook
- MVP billing: manual invoicing

---

END.
