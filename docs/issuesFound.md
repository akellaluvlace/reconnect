Cross-Doc Issue Register (Merged Master)

Docs referenced (top-of-file names):

REC+ONNECT MVP

Rec+onnect MVP Development Roadmap

PLAN.md — Rec+onnect MVP Execution Plan

Rec+onnect MVP - Master Implementation Plan

Rec+onnect Documentation Review Log

CLAUDE_SWARM.md — Rec+onnect MVP Swarm Operating System

Severity: P0 = blocker, P1 = high churn, P2 = should align.

Architecture & Runtime
RCN-001 (P0) — "React SPA" vs "Next.js App Router" conflict

Docs: REC+ONNECT MVP; Rec+onnect MVP - Master Implementation Plan; CLAUDE_SWARM.md; PLAN.md

Conflict: Spec frames client as React SPA, but repo structure + implementation plans are Next.js App Router.

Decision needed: Next.js App Router app (single codebase) vs true SPA.

Proposed resolution: Declare Next.js App Router as truth; update wording + auth/session expectations.

Owner: Architecture Agent

**Resolution Status:** RESOLVED
**Resolution:** Next.js App Router is the canonical architecture. All step files (01-10), CLAUDE_SWARM.md, MASTER_IMPLEMENTATION_PLAN.md, and agent definitions already use App Router patterns (route.ts, page.tsx, layout.tsx). The "React SPA" wording in the original spec is superseded. Any remaining SPA references in REC+ONNECT MVP spec should be treated as outdated.

RCN-002 (P0) — API orchestration layer unclear (Supabase Edge Functions vs Next.js route handlers)

Docs: REC+ONNECT MVP; Rec+onnect MVP Development Roadmap; Rec+onnect MVP - Master Implementation Plan; CLAUDE_SWARM.md

Conflict: Spec says API layer = Supabase Edge Functions, but other docs define /api/ Next route handlers (.../route.ts).

Decision needed: Primary orchestration runtime.

Proposed resolution: Choose one:

A: Next route handlers orchestrate; Edge Functions optional.

B: Edge Functions orchestrate; Next routes are thin proxies.

Owner: Architecture Agent + API Agent

**Resolution Status:** RESOLVED
**Resolution:** Next.js route handlers are the primary API orchestration layer. All step files define API routes as `apps/web/src/app/api/**/*.ts`. Edge Functions are optional for long-running async tasks (e.g., deep market insights). This is already consistent across MASTER_IMPLEMENTATION_PLAN.md, CLAUDE_SWARM.md, and all step files.

RCN-003 (P1) — JAMstack wording implies different responsibilities than the repo structure

Docs: REC+ONNECT MVP vs Rec+onnect MVP - Master Implementation Plan / CLAUDE_SWARM.md

Conflict: "JAMstack separation" implies decoupled client/API, but build assumes unified Next app.

Decision needed: One Next app vs decoupled client+Edge API.

Resolution: Rewrite architecture section to match chosen model.

Owner: Architecture Agent

**Resolution Status:** RESOLVED
**Resolution:** Resolved by RCN-001 + RCN-002. Architecture is a unified Next.js App Router application, not a decoupled JAMstack client+API. The "JAMstack" wording in the original spec is superseded.

API Surface & Routing Contracts
RCN-010 (P0) — Transcription endpoints mismatch (per-interview vs global endpoint)

Docs: REC+ONNECT MVP vs Rec+onnect MVP - Master Implementation Plan

Conflict: Spec uses /api/interviews/:id/transcribe; master plan shows /api/transcription.

Decision needed: Canonical route family.

Resolution: Pick one and update all docs + UI calls.

Owner: API Agent

**Resolution Status:** RESOLVED
**Resolution:** Canonical transcription routes follow the per-interview pattern: `/api/playbooks/[id]/interviews/[interviewId]/transcribe`. This aligns with the nested resource structure used in all step files. The global `/api/transcription` from the spec is superseded.

RCN-011 (P1) — Share link CRUD endpoints exist in spec but not in master plan API table

Docs: REC+ONNECT MVP vs Rec+onnect MVP - Master Implementation Plan

Conflict: Spec lists /api/share-links create/delete; master plan only lists /api/share/:token.

Decision needed: Manage share links via API in MVP or defer.

Resolution: Add CRUD endpoints or explicitly drop from MVP.

Owner: API Agent

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client confirmed magic links for collaborators without full accounts (5.6), which validates that share/invite links are in-scope for MVP. The CRUD endpoint alignment is a technical doc issue the dev team needs to reconcile, but the feature itself is confirmed as needed.

RCN-012 (P1) — Auth endpoints detailed vs "Supabase Auth implied"

Docs: REC+ONNECT MVP vs Rec+onnect MVP - Master Implementation Plan / CLAUDE_SWARM.md

Conflict: Spec enumerates register/login/refresh/session endpoints; other docs assume Supabase client SDK.

Decision needed: Explicit /api/auth/* wrappers vs Supabase-native auth.

Resolution: Choose one approach; delete the other from docs.

Owner: Auth Agent + API Agent

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client confirmed email+password primary login (8.1), Google login (8.2), Microsoft login (8.4), no LinkedIn (8.3), strict passwords (8.5), and no 2FA (8.6). This defines the auth surface area but does not resolve whether to use Supabase client SDK directly or wrap in custom API endpoints. Dev team must choose the implementation approach.

RCN-013 (P1) — Market insights async contract exists but job runner is undefined

Docs: REC+ONNECT MVP; Rec+onnect MVP - Master Implementation Plan

Conflict: Async endpoint + polling exists, but no defined worker model (queue/job row/cron/Edge invocation).

Decision needed: MVP async execution mechanism.

Resolution: Define "jobs" table + worker pattern.

Owner: API Agent + Infra Agent

**Resolution Status:** RESOLVED
**Resolution:** MVP async model: use a `jobs` table + polling pattern. Heavy AI tasks (deep market insights Phase 2) write a job row, return immediately, and process via Supabase Edge Function or background Next.js route. Client polls for completion. Already designed in step-08 (two-phase market insights with deep_research_id + polling). No external job queue needed for MVP.

RCN-014 (P0) — Vercel timeout risk vs "strict JSON-only" AI contract

Docs: REC+ONNECT MVP; Rec+onnect MVP - Master Implementation Plan; PLAN.md

Inconsistency:

AI endpoints require strict structured JSON.

Vercel serverless/edge + long model runtimes can time out before JSON completes.

Concrete failure mode: /api/ai/* returns 504 or truncated JSON → client validation fails.

Decision needed: Pick one:

run AI on Edge runtime (and constrain output), OR

async job model (recommended), OR

streaming + incremental parsing (complex).

Proposed resolution: MVP = async jobs for heavy tasks + keep sync calls small.

Owner: Infra Agent + API Agent + AI Agent

Acceptance criteria: Under realistic prompts, AI routes don't time out and never deliver invalid/truncated JSON.

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client confirmed NO AI hire/no-hire recommendation, highlights only (7.3), and professional/friendly AI tone (11.1). This scopes AI output to highlights and structured summaries rather than complex decision-making, which may reduce payload sizes. Client also confirmed 2-3 focus areas per interview and 3-5 questions per focus area (11.6), bounding the AI input scope. However, the runtime/timeout strategy itself is an internal technical decision that remains unresolved.

Identity / Auth / RLS Blockers
RCN-022 (P1) — Collaborator model vs org RBAC model not explicitly mapped

Docs: REC+ONNECT MVP vs Rec+onnect MVP - Master Implementation Plan

Conflict: Org roles (admin/manager/interviewer) vs collaborator roles (viewer/interviewer) + stage assignments. Missing mapping and identity model.

Decision needed: Two identity types (org members + external collaborators) or one.

Resolution: Define identity types, permission evaluation order, and how RLS handles collaborator access.

Owner: Auth Agent + DB/RLS Agent

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client provided substantial clarity on the RBAC model: 1 admin per company (5.1), hiring managers CAN create playbooks (5.2), interviewers see only their own feedback while HM sees all (5.3), salary visible to managers+admin only (5.4), just hiring manager for publishing playbooks (5.5), and magic link for collaborators without full accounts (5.6). User belongs to ONE org only (4.5). This defines the org role hierarchy clearly. Still OPEN: the technical mapping of how external magic-link collaborators fit into the identity model alongside org members, and how RLS evaluates permissions for both types.

RCN-022A (P0) — Collaborator feedback insert deadlock (Magic Link vs auth.uid() + FK)

Docs: Rec+onnect MVP - Master Implementation Plan; REC+ONNECT MVP; Rec+onnect MVP Development Roadmap

Inconsistency:

Collaborators via "Magic Link" (token-style).

Feedback modeled as authenticated interviewer action with author constraints + RLS assumptions.

Concrete failure mode: collaborator lacks auth.uid() → RLS CHECK fails; and/or no users.id exists → FK fails on interviewer_id-style author column.

Decision needed: Choose:

collaborators become real auth users (forced signup / shadow account), OR

guest collaborator writes supported by schema redesign + non-auth.uid() enforcement.

Proposed resolution: Decide before UI build; update schema + RLS + API.

Owner: Auth Agent + DB/RLS Agent + API Agent

Acceptance criteria: A collaborator entering via invite flow can submit feedback and feedback rows have a valid, auditable author reference.

**Resolution Status:** RESOLVED
**Resolution:** Decision locked (2026-02-16): Use Supabase Auth OTP magic links. Clicking magic link creates a temporary Supabase auth session → collaborator gets `auth.uid()` → existing RLS policies work unchanged. Feedback rows use normal `interviewer_id` FK referencing `auth.users`. No guest write path needed. See questionsAnswered.md 12A3.1-12A3.2.

RCN-027 (P0) — Magic link access session model is undefined (token ≠ session)

Docs: Rec+onnect MVP Development Roadmap; Rec+onnect MVP - Master Implementation Plan; REC+ONNECT MVP

Inconsistency: "Magic Link" exists as a concept, but no canonical runtime identity/session mechanism is defined.

Decision needed: How the link becomes identity:

Supabase Auth magic link/OTP (session + auth.uid()), OR

custom token session (server-enforced; RLS can't rely on auth.uid()), OR

forced signup.

Proposed resolution: Document canonical flow; align DB/RLS to it (prerequisite to solving RCN-022A cleanly).

Owner: Auth Agent + Security Agent

Acceptance criteria: Every protected read/write request has deterministic identity (auth session or defined token session w/ server enforcement).

**Resolution Status:** RESOLVED
**Resolution:** Decision locked (2026-02-16): Use Supabase Auth OTP for magic links. Clicking creates a Supabase auth session automatically. Collaborator gets `auth.uid()`, existing RLS works. No custom token session needed. See questionsAnswered.md 12A3.1.

RCN-025 (P0) — auth.users → public.users "profile row" creation guarantee missing (race condition)

Docs: Rec+onnect MVP - Master Implementation Plan; REC+ONNECT MVP; PLAN.md

Inconsistency:

RLS helpers depend on data in public.users (roles/org).

No explicit mechanism guarantees public.users row exists immediately after signup.

Concrete failure mode: user signs up → auth.users exists → dashboard queries fire → RLS helper queries public.users → missing row → access fails/denies unexpectedly.

Fix required: Postgres trigger on auth.users insert to create public.users row immediately + backfill for any existing users.

Owner: DB/RLS Agent + Infra Agent

Acceptance criteria: First post-signup authenticated request passes RLS without needing a separate "create profile" API call.

**Resolution Status:** RESOLVED
**Resolution:** Fix is well-defined: implement a Postgres trigger `on auth.users INSERT` that creates the `public.users` row with default role. This is already scoped in Step 3 (Supabase Core). Implementation action: add trigger in the initial schema migration during micro step 3.1 or 3.2.

Data Model & Storage Contracts
RCN-020 (P0) — Share link password protection is promised but not in schema

Docs: Rec+onnect MVP Development Roadmap vs REC+ONNECT MVP / Rec+onnect MVP - Master Implementation Plan

Conflict: Roadmap promises password option; schema lacks password hash.

Decision needed: Password protection in MVP or not.

Resolution: Remove from roadmap or add password_hash + UX + rate limiting.

Owner: DB/RLS Agent + Security Agent

**Resolution Status:** RESOLVED
**Resolution:** Client confirmed (2026-02-16): token-only URL is sufficient. No password protection needed. Secure random token in URL with rate limiting. No password_hash column required in schema. See questionsAnswered.md 12B.1.

RCN-021 (P1) — Feedback structure ambiguity vs UI expectations (arrays vs TEXT)

Docs: REC+ONNECT MVP vs Rec+onnect MVP - Master Implementation Plan

Conflict: Storage fields imply TEXT pros/cons; UI/flows imply multi-point structured lists.

Decision needed: JSONB arrays vs text fields.

Resolution: Lock contract; update UI + AI synthesis prompt.

Owner: DB/RLS Agent + UI Agent

**Resolution Status:** RESOLVED
**Resolution:** JSONB arrays for structured feedback. Schema locked in MASTER_IMPLEMENTATION_PLAN.md: `ratings JSONB NOT NULL` (array of {category, score 1-4, notes?}), `pros JSONB DEFAULT '[]'`, `cons JSONB DEFAULT '[]'`, `focus_areas_confirmed BOOLEAN NOT NULL DEFAULT false`. Rating scale 1-4 per client (7.4). No recommendation field.

RCN-026 (P1) — collaborators.assigned_stages column drift (Types expect it; SQL omits it)

Docs: REC+ONNECT MVP; Rec+onnect MVP - Master Implementation Plan

Inconsistency: Stage assignment is part of intended behavior, but schema/migration omits assigned_stages UUID[] (or equivalent relationship).

Dev issue: UI will implement assignment but backend won't persist/enforce it.

Fix required: Add assigned_stages UUID[] or normalize with join table.

Owner: DB/RLS Agent + API Agent

Acceptance criteria: Stage assignment is persisted, queryable, and enforced in RLS/API to limit collaborator access per stage.

**Resolution Status:** RESOLVED
**Resolution:** Client confirmed (2026-02-16): Add `assigned_stages UUID[]` column to collaborators table. Simple array, not join table. Matches existing patterns. Will be added in migration #7. See questionsAnswered.md 12A3.3.

RCN-023 (P1) — Candidate data retention + erasure is stated but not implemented as a mechanism

Docs: REC+ONNECT MVP; Rec+onnect MVP - Master Implementation Plan; Rec+onnect MVP Development Roadmap

Conflict: Retention/erasure promised; no concrete deletion workflow for DB + Storage + Drive exports + audit logs.

Decision needed: Manual admin vs cron automation; per-org settings; what "delete" means for exports.

Resolution: Add "Retention & Deletion" section listing exact deletion targets + lifecycle.

Owner: Compliance Agent + DB/RLS Agent + Integrations Agent

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client provided key policy decisions: 1-year retention then auto-reachout to candidate to opt in/out (12.1, 12.2), build GDPR flow (12.3), NO auto-delete rejected candidates (12.4), no PDF/CSV export (12.5, 12.6). This substantially scopes the retention policy. Still OPEN: the concrete implementation mechanism (cron job for 1-year reachout, what "auto-reachout" means technically, deletion targets for DB/Storage/Drive, and the detailed GDPR deletion workflow).

RCN-024 (P2) — Audit log exists but event taxonomy is missing

Docs: REC+ONNECT MVP; Rec+onnect MVP - Master Implementation Plan

Conflict: audit_logs table present, but no event list, triggers, or retention policy.

Decision needed: MVP event list + implementation layer (app vs DB triggers).

Resolution: Define taxonomy + retention.

Owner: Security Agent + Compliance Agent

**Resolution Status:** OPEN
**Resolution:** Client answers do not address audit log event taxonomy or retention. Client mentioned "have one for database" regarding security requirements beyond GDPR (13.6), but this is vague. Dev team must define the MVP event list and retention policy.

RCN-028 (P1) — RLS helper function safety contract missing (SECURITY DEFINER/search_path/guards)

Docs: Rec+onnect MVP - Master Implementation Plan; REC+ONNECT MVP

Issue: Helper-function-based policies need explicit safe standards to avoid escalation and brittleness.

Fix required: Add "RLS helper function guidelines" + review helpers for security definer/search_path/input guards.

Owner: DB/RLS Agent + Security Agent

Acceptance criteria: All helper functions used in policies follow the safe pattern and are reviewed.

**Resolution Status:** RESOLVED
**Resolution:** RLS helper function guidelines locked: all helpers must use `SECURITY DEFINER`, set `search_path = ''`, include null-guards, and be reviewed by Security agent. Pattern documented in backend.md agent file. Implementation required in step-03 (Supabase Core) before any RLS policies are created.

Security, Privacy, and Compliance
RCN-030 (P0) — Recording consent is stated but not specified (UX + evidence storage)

Docs: REC+ONNECT MVP; Rec+onnect MVP - Master Implementation Plan

Conflict: Must inform before recording, but missing: how consent is captured, stored, versioned, and enforced.

Decision needed: Consent UX + evidence model.

Resolution: Add fields like recording_consent_at, consent_text_version, consented_by.

Owner: Compliance Agent + UI Agent + DB Agent

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client confirmed in-app recording (7.1), build GDPR flow (12.3), and the platform is internal only with no candidate-facing components (4.3). Since candidates are not platform users, consent must be captured outside the platform or via the interviewer confirming consent was obtained. The required field "confirmation that focus areas were discussed" (7.5) establishes a pattern for interviewer attestation. Still OPEN: the exact consent UX (interviewer checkbox? pre-recording prompt?), evidence storage schema (consent fields), and versioning mechanism.

RCN-031 (P1) — Prompt injection mitigation is claimed but not operationalized

Docs: REC+ONNECT MVP

Conflict: You must pass transcripts into synthesis; missing concrete sanitization/hardening pattern.

Decision needed: Sanitization + prompt hardening strategy.

Resolution: Canonical safe input format (delimiters, allowlists, stripping instruction-like content).

Owner: AI Agent + Security Agent

**Resolution Status:** OPEN
**Resolution:** Client answers do not address prompt injection mitigation. Client confirmed NO AI hire/no-hire recommendation, highlights only (7.3), and AI disclaimers toggle (11.3), which scopes AI output. However, the security hardening of AI inputs (transcript sanitization, prompt delimiters) is a purely technical concern the dev team must define.

RCN-032 (P1) — Public share page scope is under-defined (GDPR risk)

Docs: Rec+onnect MVP Development Roadmap; Rec+onnect MVP - Master Implementation Plan; REC+ONNECT MVP

Conflict: Share links exist but "what's visible publicly" isn't locked.

Decision needed: Exact public scope (PII/transcripts/feedback/etc).

Resolution: Define "public view schema" and enforce in API/RLS.

Owner: Compliance Agent + API Agent

**Resolution Status:** RESOLVED
**Resolution:** Client confirmed (2026-02-16): minimal scope for share links. Collaborator sees: candidate first name + role title, their assigned stage name, focus areas + suggested questions, and their feedback form only. NOT visible: other people's feedback, salary expectations, CV/resume, AI synthesis, scores, full playbook details. GDPR-safe default — easy to widen later, hard to restrict. See questionsAnswered.md 12B.2.

RCN-033 (P2) — Transcript "confidence scoring" mentioned but not defined as measurable output

Docs: REC+ONNECT MVP

Conflict: Quality issues referenced without a defined metric/heuristic pipeline.

Decision needed: How to detect low quality (manual flag, heuristics).

Resolution: Add "Transcript Quality Heuristics" (MVP).

Owner: AI Agent

**Resolution Status:** OPEN
**Resolution:** Client answers do not address transcript quality scoring. Client confirmed in-app recording (7.1) and AI highlights only (7.3), but no mention of quality metrics. Dev team must decide: implement heuristics for MVP or defer to post-MVP.

Integrations (Google Drive, Email, External)
RCN-040 (P0) — Google Drive integration ownership model is undefined

Docs: REC+ONNECT MVP; Rec+onnect MVP - Master Implementation Plan; CLAUDE_SWARM.md

Conflict: "Save to Google Drive" exists, but not defined: whose Drive, revocation behavior, deletion propagation.

Decision needed: Ownership + lifecycle contract.

Resolution: Pick model (org admin vs per-user vs shared drive) and implement accordingly.

Owner: Integrations Agent + Compliance Agent

**Resolution Status:** RESOLVED
**Resolution:** Client confirmed (2026-02-16): Org-level Google Drive. One account per organization — admin connects once, ALL interview recordings go to that Drive. This is the CORE STORAGE BACKBONE, not an export feature. Users also connect and set up Google Meet links through this integration. The AI pipeline (Whisper transcription → Claude analysis) pulls recordings from Drive. This is the most important feature in the system. When admin disconnects, Drive link breaks but existing files remain on Drive (org owns them). See questionsAnswered.md 12A.1-12A.5.

RCN-041 (P1) — OAuth callback + deployment environment assumptions aren't standardized

Docs: Rec+onnect MVP - Master Implementation Plan

Conflict: Callback URIs shown are dev-centric; no consistent env naming for preview/prod.

Decision needed: Redirect strategy for Vercel preview/prod.

Resolution: Add "OAuth Environments" section.

Owner: Infra Agent + Integrations Agent

**Resolution Status:** OPEN
**Resolution:** Client answers do not address deployment environment configuration. Client confirmed Google login (8.2) and Microsoft login (8.4), validating that OAuth is needed, but callback URI strategy is a purely internal devops concern.

RCN-042 (P2) — Email provider responsibilities vs flows not fully wired

Docs: CLAUDE_SWARM.md; REC+ONNECT MVP

Conflict: Provider named (e.g., Resend) but no system contract (templates, deliverability, which system sends which emails).

Decision needed: Email split: Supabase vs Resend.

Resolution: Define "Email Matrix" (auth, invites, share links).

Owner: Integrations Agent + Auth Agent

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client confirmed email-only notifications (10.5), configurable notification preferences (10.6), and specific notification triggers: notify collaborators when assigned (10.1), notify manager when feedback submitted (10.2), notify when AI synthesis ready (10.3), reminder emails (10.4). Client also confirmed admin can customize email templates (Section 9). This defines the email scope comprehensively. Still OPEN: the technical split between Supabase auth emails vs Resend transactional emails, template storage, and deliverability strategy.

UI / Product Flow Contracts
RCN-050 (P1) — 4-phase workflow consistent in concept, inconsistent in enforcement points

Docs: Rec+onnect MVP - Master Implementation Plan; Rec+onnect MVP Development Roadmap; CLAUDE_SWARM.md

Conflict: Phases exist, but missing: required data to advance, who can advance, validations.

Decision needed: Phase gating rules.

Resolution: Add per-phase required-fields checklist; enforce in UI + API.

Owner: Product Agent + UI Agent + API Agent

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client provided several gating-relevant answers: hiring managers CAN create playbooks (5.2), just the hiring manager for publishing playbooks (5.5), required field is confirmation that focus areas were discussed (7.5), and feedback ratings 1-4 (7.4). These define who can advance and some required data per phase. Still OPEN: the complete per-phase required-fields checklist, validation rules, and enforcement implementation.

RCN-051 (P1) — Collaborator UX vs permissions enforcement not clearly tied

Docs: Rec+onnect MVP - Master Implementation Plan vs REC+ONNECT MVP

Conflict: Collaborators assigned to stages, but UX visibility/actions vs RLS policies are not locked.

Decision needed: Collaborator screens + restrictions.

Resolution: Define collaborator routes + RLS policies + token/session model.

Owner: UI Agent + DB/RLS Agent

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client confirmed magic link for collaborators (5.6), interviewers see only their own feedback (5.3), and salary visible to managers+admin only (5.4). This defines what collaborators SHOULD and SHOULD NOT see. Still OPEN: the specific collaborator screen designs, route definitions, and RLS policy implementations that enforce these rules. Depends on RCN-027 (magic link session model).

Project Control / Process
RCN-060 (P0) — Documentation Review Log says "aligned" but contradictions remain

Docs: Rec+onnect Documentation Review Log vs everything else

Conflict: Log claims alignment while P0 conflicts remain (RCN-001, RCN-002, RCN-010, RCN-014, RCN-020, RCN-022A, etc.).

Decision needed: Is the log outdated or based on unstated assumptions?

Resolution: Update log with "Open Issues" + explicit decisions.

Owner: Lead Agent

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** The client answers in questionsAnswered.md now provide a substantial body of explicit decisions that can be used to update the Documentation Review Log. Many previously "unstated assumptions" now have client confirmation. However, the log itself still needs to be updated to reflect these decisions and acknowledge remaining open technical issues. The Lead Agent should update the log referencing client answers.

RCN-061 (P1) — "Edge Functions (if used)" contradicts "Edge Functions are the API layer"

Docs: CLAUDE_SWARM.md vs REC+ONNECT MVP

Conflict: Swarm OS frames Edge Functions as optional; spec frames them as primary.

Decision needed: Optional or required?

Resolution: Align Swarm OS with architecture decision (RCN-002).

Owner: Architecture Agent

**Resolution Status:** RESOLVED
**Resolution:** Resolved by RCN-002. Edge Functions are optional (used only for long-running AI tasks if Vercel timeout is hit). Next.js route handlers are primary. CLAUDE_SWARM.md's "if used" phrasing is correct.

RCN-062 (P2) — Tooling commands + repo conventions aren't standardized

Docs: PLAN.md vs others

Conflict: Setup/check commands and conventions are not canonical.

Decision needed: Single "Dev Commands" contract.

Resolution: Add CONTRIBUTING or expand PLAN.md.

Owner: Infra Agent

**Resolution Status:** RESOLVED
**Resolution:** Tooling standardized in CLAUDE_SWARM.md Section 5 and step-02 (Monorepo Foundation). Commands: `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`. Supabase: `supabase start`, `supabase db reset`, `supabase gen types typescript --local`. All micro steps include DoD commands.

What's Missing Entirely (Unanswered Decisions)

These aren't contradictions — they're missing explicit answers that will cause mid-build chaos:

External collaborator identity: auth user or token-only?

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client confirmed magic link for collaborators (5.6). Product intent is clear. Technical identity model (auth user vs token-only) still needs dev team decision.

Share public scope: exactly what is visible on /share/:token?

**Resolution Status:** OPEN
**Resolution:** Client confirmed internal only (4.3) and visibility rules (5.3, 5.4) but did not define what appears on share link pages. Needs explicit client input.

Retention execution: manual vs cron; what deletion means for Drive exports.

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client confirmed 1-year retention + auto-reachout (12.1-12.2), build GDPR flow (12.3), no auto-delete rejected (12.4). Policy defined; technical execution mechanism still open.

Async jobs: queue/worker model for market insights + heavy AI.

**Resolution Status:** OPEN
**Resolution:** Client answers do not address async infrastructure. Purely technical decision for dev team.

Email split: Supabase auth emails vs Resend; templates/branding/rate limits.

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client confirmed email-only notifications (10.5), all notification types (10.1-10.4), configurable preferences (10.6), and admin-editable email templates (Section 9). Scope defined; provider split still open.

Consent evidence: how you prove "candidate informed" (versioning + timestamp + actor).

**Resolution Status:** PARTIALLY RESOLVED
**Resolution:** Client confirmed in-app recording (7.1), build GDPR flow (12.3), and required confirmation of focus areas discussed (7.5). Pattern for attestation exists; exact consent evidence schema still needs definition.

Immediate Pre-Step Checklist (Merged)

Before implementing Step 1 UI/API, lock decisions + migrations for:

~~RCN-002 + RCN-001: architecture/API runtime truth~~ **RESOLVED** — Next.js App Router + route handlers

~~RCN-025: auth → public user row creation trigger/backfill~~ **RESOLVED** — implement trigger in Step 3

~~RCN-014: AI runtime/async strategy~~ **RESOLVED** — jobs table + polling (Step 6/8)

RCN-022A + RCN-027: collaborator identity/session model (unblocks RLS + feedback writes) — **RESOLVED: Supabase Auth OTP**

RCN-026: assigned_stages schema alignment (prevents schema drift) — **RESOLVED: UUID[] column in migration #7**

---

## Resolution Summary

**Analysis Date:** 2026-02-15
**Source:** Client answers from questionsAnswered.md cross-referenced against all RCN issues.

### Counts by Status

| Status | Count |
|---|---|
| **RESOLVED** | 16 |
| **PARTIALLY RESOLVED** | 11 |
| **OPEN** | 3 |
| **Total Issues** | 30 |

### Breakdown by Severity

| Severity | RESOLVED | PARTIALLY RESOLVED | OPEN |
|---|---|---|---|
| **P0 (Blocker)** | 7 (RCN-001, RCN-002, RCN-010, RCN-025, RCN-020, RCN-022A, RCN-027) | 2 (RCN-014, RCN-030) | 0 |
| **P1 (High Churn)** | 6 (RCN-003, RCN-013, RCN-021, RCN-061, RCN-032, RCN-026) | 6 (RCN-011, RCN-012, RCN-022, RCN-023, RCN-042, RCN-050, RCN-051) | 1 (RCN-031) |
| **P2 (Should Align)** | 2 (RCN-028, RCN-062) | 1 (RCN-060) | 2 (RCN-024, RCN-033) |

*Note: "Missing Entirely" items counted as 6 additional entries (2 OPEN, 4 PARTIALLY RESOLVED).*

### Key Findings

1. **16 issues now RESOLVED** (up from 13) — added RCN-022A (collaborator feedback: Supabase Auth OTP shadow users), RCN-027 (magic link session: Supabase Auth OTP), RCN-026 (assigned_stages UUID[] column).

2. **Client answers most impactful for:** RBAC/permissions (RCN-022, RCN-051), collaborator model (RCN-022A, RCN-027), data retention (RCN-023), notification scope (RCN-042), and feedback structure (RCN-021).

3. **Remaining client decisions needed:**
   - Transcript quality scoring priority (RCN-033) -- ask client if MVP or defer

4. **Remaining technical decisions (dev team):**
   - RCN-031: Prompt injection hardening strategy
   - RCN-041: OAuth callback environments for Vercel preview/prod
   - RCN-024: Audit log event taxonomy

5. **Zero P0 blockers remain OPEN.** All P0 issues are RESOLVED or PARTIALLY RESOLVED. RCN-022A and RCN-027 are now RESOLVED (Supabase Auth OTP). Only P0 PARTIALLY RESOLVED: RCN-014 (Vercel timeout/AI contract) and RCN-030 (recording consent capture).