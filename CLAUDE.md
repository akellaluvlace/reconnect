# Rec+onnect MVP — Command Center

AI-powered Strategic Recruitment Operations Platform. Irish market, 8-week build, multi-tenant SaaS.
Stack: Next.js App Router + Tailwind + shadcn/ui + Supabase (RLS) + Claude AI (Opus 4.6 / Sonnet 4.5) + Whisper + Resend

---

## Current State

**Step:** Step 8 COMPLETE + HARDENED — Chapters: Discovery + Process
**Status:** Steps 1-8 complete + hardened. 18 migrations deployed. 233 DB tests + 232 AI tests + 82 API route tests green. 7 E2E smoke tests ready (Playwright). JSONB validation: 10 unsafe `as` casts replaced with Zod-validated `parseJsonb()`. Full AI algorithm audit done. QA review complete.
**Next task:** Step 10.1-10.2 (Drive integration) or Step 9 (Alignment + Debrief)
**Blockers:** External API keys (Anthropic, Tavily, OpenAI, Resend, Google Cloud) needed for live testing.

**Build order:** 10.1-10.2 → 9 → 10.3-10.8

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

## Review Protocol

Rules for running automated code review agents. Learned from Step 6 QA (7 agents, 90+ findings, 33% signal-to-noise ratio).

### Agent Selection

Use **3 focused agents max**, not 7 overlapping ones:

| Agent | Use For | Strength |
|-------|---------|----------|
| `pr-review-toolkit:silent-failure-hunter` | After any step completion | Best signal-to-noise — finds real silent failures |
| `pr-review-toolkit:type-design-analyzer` | After schema/type changes | Catches drift between layers (Zod vs domain vs DB) |
| `coderabbit:code-reviewer` | General coverage | Good breadth, moderate noise |

Skip multiple `superpowers:code-reviewer` instances on the same code — they duplicate each other.

### Triage Before Fixing

**Never bulk-fix all findings.** Follow this flow:

1. **Collect** — run agents, let them all finish
2. **Deduplicate** — merge identical findings across agents (expect 40-60% overlap)
3. **Present** — show the user a deduplicated list with severities
4. **Get approval** — user picks which findings to fix
5. **Fix in batches** — group by category (errors, types, validation, etc.)
6. **Test after each batch** — typecheck + test after each category, not just at the end

### False Positive Rules

- **Never trust severity labels** — automated "CRITICAL" may be wrong. Cross-reference before acting.
- **Verify existence claims** — if a tool says "version X doesn't exist" or "function Y is unused," verify with `npm view`, `grep`, etc. before changing anything.
- **Conflicting advice** — when two agents recommend different fixes for the same issue, pick the simpler one or ask the user. Don't implement both.
- **"Should add" suggestions** — agents love suggesting additions (rate limiting, concurrency limits, timeouts). These are backlog items, not blockers. Note them but don't implement unless explicitly requested.

### Blast Radius Awareness

Before implementing a review fix, check:

- **Does this type/interface have consumers?** Changing `FocusArea.area` → `FocusArea.name` is safe before Step 7 (no UI consumers), dangerous after.
- **Does this change cascade?** Tightening `code: string` → `code: AIErrorCode` requires updating every test that constructs that type.
- **Is the fix in the right layer?** Input validation (`.max()`) belongs in API routes, not in the AI package schemas.

### What NOT to Fix From Reviews

- Performance suggestions (concurrency limits, caching strategies) — backlog, not blocking
- "Add tests for X" — valid but not a fix, schedule separately
- Style preferences (import ordering, naming conventions) — ignore unless project-wide
- Architecture critiques ("should use dependency injection") — ignore for MVP

---

## Session End Protocol

Before ending a session, ALWAYS do these:

1. **Update `.claude/SWARM_STATUS.md`** — mark completed micro steps, update Current Work table, add blockers if any
2. **Update this file's "Current State" section** — set correct step, status, next task, blockers
3. **Add 1-line entry to Recent Sessions below** — keep only last 5 entries
4. Do NOT create separate session log files

---

## Recent Sessions

- **2026-02-19 (i):** Step 8 hardening. parseJsonb utility (10 unsafe JSONB casts → Zod-validated). 82 API route tests (12 files, vitest). 7 E2E smoke tests (Playwright). Typecheck clean. 232 AI + 82 web tests green.
- **2026-02-19 (h):** Post-audit QA. 3 agents (silent-failure-hunter, type-design-analyzer, CodeRabbit), 48 raw → 22 unique findings. Fixed all 6 CRITICAL (DELETE silent success, isSaving non-reactive, dead AbortController, unchecked order_index, strategy_context stripped from generate-jd+generate-stages). Fixed 9 HIGH (polling max count, division-by-zero guard, array bounds on bulk create+reorder, error.message leak, 207 handling, partial failure reporting, JD auto-save check). Fixed 1 MEDIUM (Regenerate All deletes old stages first). 103 new tests added (7 files). 232/232 AI tests green.
- **2026-02-19 (g):** AI algorithm audit + coherence verification. AI_INTELLIGENCE_ENGINE.md rewritten (10 pipelines, 11 DB columns, 9 gaps mapped). CandidateProfile disclaimer fix. Step 9 files rewritten (9.1, 9.7, 9.8, 9.9). 6-check coherence audit: all layers aligned.
- **2026-02-19 (f):** Data coherence fix. Migration #18 (level, industry, skills, location on playbooks). Fixed POST/PATCH routes, wizard Step 3 persists role details. 129 AI tests green.
- **2026-02-19 (e):** Step 8 complete. Discovery + Process: migration #17, 2 domain types, 2 AI schemas + 2 prompts, 2 new pipelines, 7 new API routes, Discovery page, Process page (dnd-kit), auto-save hook.

> Keep max 5 entries. Remove oldest when adding new.
