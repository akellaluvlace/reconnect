# Rec+onnect MVP — Command Center

AI-powered Strategic Recruitment Operations Platform. Irish market, 8-week build, multi-tenant SaaS.
Stack: Next.js App Router + Tailwind + shadcn/ui + Supabase (RLS) + Claude AI (Opus 4.6 / Sonnet 4.5) + Whisper + Resend

---

## Current State

**Step:** Step 6 COMPLETE — AI Intelligence Engine built
**Status:** Steps 1-6 complete. 15 migrations (ai_research_cache pending deploy). 233 DB tests + 74 AI tests green. Full deep research pipeline: 6 schemas, 5 pipelines (deep research, market insights, JD gen, stage gen, feedback synthesis), 6 API routes, Tavily web search, Anthropic structured output via messages.parse()+zodOutputFormat(), 30-day org-scoped cache, context injection chain, model escalation (Sonnet→Opus), EU AI Act compliance.
**Next task:** Step 7 (Playbook Creation) — all micro steps unblocked
**Blockers:** External API keys (Anthropic, Tavily, OpenAI, Resend, Google Cloud) needed for live testing. Not blocking Step 7 UI work.

**Build order:** 7 → 8 → 10.1-10.2 → 9 → 10.3-10.8

> Update this section at end of every session.

---

## Session Protocol

1. This file is auto-loaded. Read it first.
2. Read `.claude/SWARM_STATUS.md` for detailed progress and blocker list.
3. Read `steps/step-{NN}-*.md` for whichever step you're working on.
4. Read `.claude/agents/{role}.md` only if acting as a specific agent.
5. Start work. Do NOT read other docs unless the File Map below says to.

---

## Hard Constraints

These are non-negotiable client decisions. Do not ask about them — they're settled.

- **Desktop-only** — no mobile responsive, min 1024px
- **Ratings 1-4** — NOT 1-5
- **NO AI hire/no-hire recommendation** — highlights only, human decides
- **Email-only notifications** — no in-app, use Resend
- **Auth:** Email+password + Google OAuth + Microsoft OAuth — NO LinkedIn
- **No PDF/CSV export** — everything stays in system
- **Google Drive = core storage backbone** — org-level (1 account per org, admin connects once). ALL interview recordings stored on Drive. AI pipeline (Whisper → Claude) pulls recordings from Drive for transcription + analysis. Users set up Meet links through this integration. This is NOT an export feature — it IS the recording infrastructure.
- **Share links: token-only URL** — no password protection, secure random token + rate limiting
- **Share link data scope: minimal** — collaborator sees: candidate first name + role, their stage, focus areas + questions, their feedback form. NO access to other feedback, salary, CV, AI synthesis, scores, or full playbook
- **Magic link auth: Supabase Auth OTP** — clicking magic link creates temporary Supabase auth session. Existing RLS policies work unchanged via `auth.uid()`.
- **AI synthesis: transcript + feedback** — Claude analyzes BOTH the full interview transcript AND structured feedback forms. Token counting required (150K soft limit). Transcript stays server-side only.
- **1-year data retention** then auto reachout to candidate to opt in/out
- **JSONB feedback:** `ratings` (array of {category, score 1-4}), `pros`/`cons` (JSONB arrays), `focus_areas_confirmed` (boolean, required)
- **AI constraints:** 2-3 focus areas per stage, 3-5 questions per focus area
- **EU AI Act:** Text-only analysis, no emotion/voice/biometric inference, human review disclaimers mandatory
- **1 admin per org**, user belongs to ONE org only
- **CMS admin controls:** Skills, industries, levels, stage templates, question bank, JD templates, email templates

---

## File Map

Read files ONLY when the situation matches:

| File | When to Read |
|------|-------------|
| `.claude/SWARM_STATUS.md` | Every session start (progress + blockers) |
| `steps/step-{NN}-*.md` | When working on that step |
| `.claude/agents/{role}.md` | When acting as a specific agent |
| `docs/CLAUDE_SWARM.md` | If unsure about swarm rules or agent roles |
| `docs/PLAN.md` | If reviewing step order or macro plan |
| `docs/issuesFound.md` | When hitting a blocker or starting Step 3 (RLS decisions) |
| `docs/questionsAnswered.md` | When unsure about a client decision not listed above |
| `docs/MASTER_IMPLEMENTATION_PLAN.md` | For schemas, API contracts, deep technical reference |
| `docs/Reconnect_Technical_Specification_v3.md` | For original spec details |
| `docs/Reconnect_Setup_Guide.md` | During Step 1 service account setup |
| `docs/Reconnect_Project_Context.md` | For commercial terms or timeline context |

**Never read** unless debugging a past decision: `docs/DOCUMENT_REVIEW_LOG.md`, `docs/SESSION_LOG_2026-02-03.md`

---

## Work Protocol

1. Branch: `step{NN}-{micro}-{slug}` (e.g., `step03-2-rls-policies`)
2. Stay within allowed paths for your micro step
3. Implement minimal diff — don't over-engineer
4. Verify: run Definition of Done commands from the step file (lint, typecheck, tests)
5. Report: state what was done, what passed, any blockers
6. If blocked: document exact error + what you tried + options
7. **NEVER sign commits** with `Co-Authored-By` or any attribution line. Plain commit messages only.

Full rules: `docs/CLAUDE_SWARM.md` (8 agents, merge gates, compliance gates)

---

## Session End Protocol

Before ending a session, ALWAYS do these:

1. **Update `.claude/SWARM_STATUS.md`** — mark completed micro steps, update Current Work table, add blockers if any
2. **Update this file's "Current State" section** — set correct step, status, next task, blockers
3. **Add 1-line entry to Recent Sessions below** — keep only last 5 entries
4. Do NOT create separate session log files

---

## Recent Sessions

- **2026-02-18 (f):** Step 6 complete. Full AI Intelligence Engine: config+errors+retry, Anthropic client (messages.parse+zodOutputFormat), Tavily search client, 6 Zod schemas, 5 prompt templates (EU AI Act compliant), 5 pipelines (deep research 6-step, market insights 2-phase, JD gen, stage gen, feedback synthesis), ai_research_cache migration, 6 API routes, 74 golden tests. Context injection chain, model escalation, 30-day org-scoped cache.
- **2026-02-18 (e):** Phase 0 Round 2. 31 more fixes: try-catch on all async handlers, toast on sign-out, AuthListener preserves user on transient errors, middleware distinguishes auth failure from no-user, callback top-level try-catch, requireRole calls requireAuth (dedup), PUBLIC_PATHS module-level const, domain-types comment accuracy (SynthesisType no CHECK), step files 7-10 anti-patterns fixed (18 issues: missing await, error handling, UUID validation, typed clients).
- **2026-02-18 (d):** Phase 0 Round 1. 46 issues fixed: typed Supabase clients, domain types, 14 silent failures patched, admin role guards, security headers, OTP validation, password policy, autocomplete, dead links, StaggeredText perf.
- **2026-02-18 (c):** Comprehensive DB test suite (233 tests, 10 categories, all green). Found+fixed 3 bugs: auth.users permission in policies (use auth.email()), feedback cross-tenant leak, inline auth.users refs. Migrations 13-14 deployed.
- **2026-02-18 (b):** Deep review + P0 security fixes. Migrations 7-12 deployed. Fixed: collaborator RLS, share link leak, FK cascade, transcript privacy, duplicate policies, FK indexes.

> Keep max 5 entries. Remove oldest when adding new.
