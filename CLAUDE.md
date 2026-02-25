# Rec+onnect MVP — Command Center

AI-powered Strategic Recruitment Operations Platform. Irish market, 8-week build, multi-tenant SaaS.
Stack: Next.js App Router + Tailwind + shadcn/ui + Supabase (RLS) + Claude AI (Opus 4.6 / Sonnet 4.5) + Whisper + Resend

---

## Current State

**Step:** Step 10 DESIGN APPROVED — ready for implementation
**Status:** Steps 1-9 complete + hardened. Premium design polish + Phosphor duotone icons. Step 10 recording pipeline redesigned: state machine (12 states), Google Meet VTT as primary transcript (not Whisper), manual synthesis trigger, optimistic locking, pipeline audit log, retry budget. Design doc at `docs/plans/2026-02-23-recording-pipeline-design.md`. 12 vulnerabilities mapped with mitigations. 476 web + 293 AI tests green. 24 migrations. Typecheck clean.
**Next task:** Step 10.1 (Platform Google setup + migration #25) → 10.2 (recording pipeline implementation).
**Blockers:** None — all API keys available. Google Workspace account setup needed for live Meet/Drive testing.

**Build order:** 10.1 (migration #25 + Google OAuth + helpers) → 10.2 (cron + state machine + UI) → 10.3-10.8

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

- **NO git commands without explicit user approval** — never commit, push, branch, checkout, stash, reset, or any other git operation unless the user explicitly asks for it. This includes creating commits after completing work. Always wait for the user to say "commit", "push", etc.

- **Desktop-only** — no mobile responsive, min 1024px
- **Ratings 1-4** — NOT 1-5
- **NO AI hire/no-hire recommendation** — highlights only, human decides
- **Email-only notifications** — no in-app, use Resend
- **Auth:** Email+password + Google OAuth + Microsoft OAuth — NO LinkedIn
- **No PDF/CSV export** — everything stays in system
- **Google Drive + Meet = core recording infrastructure** — **shared Rec+onnect Google Workspace account** (platform-level, NOT per-org). App creates Meet events with interviewer as co-host → auto-record on join → recording saved to Rec+onnect's Drive → Meet API retrieves exact file ID → Whisper transcribes → Claude synthesizes. Per-org folder isolation in shared Drive. See `docs/INTERVIEW_RECORDING_FLOW.md`.
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

| `apps/web/.next/dev/logs/next-development.log` | When debugging AI pipeline flow — contains all `[TRACE:]` and `[AI:]` logs |
| `packages/ai/src/tracer.ts` | Reference for trace format and `checkParams()` helper |
| `packages/ai/src/logger.ts` | Reference for API call logging format and `pipelineLogger` stats |

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

## Pipeline Tracer Protocol

Two instrumentation layers trace every AI pipeline call. **Check these logs FIRST when debugging flow issues — before reading source code.**

### Where: `apps/web/.next/dev/logs/next-development.log`

### PipelineTrace (`[TRACE:pipeline:step]`) — data flow
Every pipeline has `PipelineTrace` wired in (`packages/ai/src/tracer.ts`). Shows what params went in, what came out, what was missing.

**Reading the chain — look for these in sequence:**
1. `[TRACE:quickInsights]` → wizard generates quick market data
2. `[TRACE:deepInsights]` + `[TRACE:deepResearch]` → background deep research (60-80s)
3. `[TRACE:generateHiringStrategy]` → should show `salary_range`, `required_skills_count > 0`
4. `[TRACE:generateJobDescription]` → should show `has_market_context=true, has_strategy_context=true`
5. `[TRACE:generateStages]` → should show `has_jd_context=true, has_strategy_context=true`
6. `[TRACE:analyzeCoverage]` → should show `stages_count > 0, required_requirements > 0`
7. `[TRACE:generateCandidateProfile]` → should show `has_market_skills=true` (after fix)

**Red flags:** `has_*_context=false`, `*_count=0`, `FAIL`, `warnings_count > 0`, `"No context data provided"`

### PipelineLogger (`[AI:endpoint]`) — API calls
Every Anthropic API call logged (`packages/ai/src/logger.ts`). Format: `[AI:endpoint] model=X tokens=IN+OUT latency=Xms stop=X`

**Red flags:** `latency > 60000ms`, `COERCED`, `ERROR=`, `stop=max_tokens`

### DO NOT check Playwright logs (`.playwright-mcp/`) — those are E2E test console captures, not pipeline traces.

---

## Pre-Beta Checklist (Gate Before 10.6)

Everything below MUST pass before any beta tester gets access. Not optional.

### Infrastructure
- [ ] All migrations deployed to production (currently 22, including FK cascade fix)
- [ ] Env vars set in Vercel (Supabase, Anthropic, Tavily, OpenAI, Resend, Google)
- [ ] Rate limiting on AI endpoints (not implemented yet — add in 10.3 or 10.4)
- [ ] Error monitoring (Sentry or equivalent) configured

### Data Integrity
- [ ] RLS verified against real DB: admin sees all, manager sees org, interviewer sees assigned
- [ ] Blind feedback verified: interviewer cannot see others' feedback via API or UI
- [ ] Share link data scope verified: no salary, CV, AI synthesis, or full playbook data leaks
- [ ] Transcript privacy verified: no API route returns raw transcript to client
- [ ] FK cascades work: deleting a stage doesn't crash interviews or candidates

### UI/UX
- [ ] Every page click-tested: Landing → Login → Register → Playbooks list → Wizard → Discovery → Process → Alignment → Debrief
- [ ] Empty states: new org (no playbooks), empty playbook (no stages), empty stage (no interviews)
- [ ] Error states: network failure during AI generation, invalid form submission, expired session
- [ ] Cross-browser: Chrome + Firefox + Edge (desktop, 1024px min)
- [ ] AI disclaimer visible on every AI-generated output

### Compliance
- [ ] EU AI Act: text-only analysis, no emotion/voice inference, human review disclaimer
- [ ] Recording consent flow: candidate can decline, interview proceeds without recording
- [ ] No hire/no-hire recommendation anywhere in UI or AI output
- [ ] Data retention plan communicated to client (1-year auto-reachout is spec'd but not built — confirm deferral)

### Known Gaps (Accept or Fix Before Beta)
- **Data retention cron:** Not implemented. Needs client decision: build now or defer.
- **Audit logging:** No admin action logging. Low risk for beta, needed for production.
- **Rate limiting:** No AI endpoint rate limiting. Could allow credit burn during beta if abused.
- **16 lint errors:** All `no-explicit-any` in test files. Zero production impact.

### Pipeline Flow Issues (identified 2026-02-22 via tracer logs)
- **Deep research fire-and-forget — no recovery.** Wizard fires `keepalive` fetch and navigates away. If the request dies (network, browser kill), deep research never runs. User is stuck on Market Research tab with Strategy locked forever. **Fix:** Add "Retry deep research" button that shows after polling times out (~120s with no phase change).
- **Vercel function timeout on deep research.** Deep research takes 60-80s of server work after returning 202. **Decision:** Use Vercel Pro (300s timeout). Verify `maxDuration` is set on the deep research route handler. If hobby tier ever used, deep research will silently die.
- **Candidate profile — no gating on Alignment page.** User can navigate to Alignment and generate candidate profile with zero context (no strategy, no market skills, no JD). Tracer confirmed: "No context data provided — profile will be based on model knowledge only". **Fix:** Disable Generate button until `hiringStrategy` exists, or show warning explaining profile quality depends on completing Discovery + Process first.
- **Stage generation latency variance.** 81s to 124s across runs. Same model, similar input. Near timeout boundary. **Fix:** Monitor in production, consider splitting into smaller calls if timeouts occur.
- **`parseJsonb` transient failure on page load.** Quick-phase market data can fail validation when Discovery page loads during deep research. Causes brief `null` marketInsights state. Self-resolves when polling updates. **Fix (low priority):** Use a looser schema for quick-phase data, or handle null gracefully in tab gating (already does — tabs stay locked).
- **Stage question count under target.** AI consistently generates 4-5 questions when prompt asks for 6+. Not a data flow issue — AI compliance. **Fix (low priority):** Strengthen prompt constraints or add retry on under-count.

---

## Session End Protocol

Before ending a session, ALWAYS do these:

1. **Update `.claude/SWARM_STATUS.md`** — mark completed micro steps, update Current Work table, add blockers if any
2. **Update this file's "Current State" section** — set correct step, status, next task, blockers
3. **Add 1-line entry to Recent Sessions below** — keep only last 5 entries
4. Do NOT create separate session log files

---

## Recent Sessions

- **2026-02-23 (d):** Step 10 recording pipeline design. Vulnerability analysis (12 risks). State machine architecture. VTT primary transcript. Manual synthesis trigger. Design doc written. Step-10 file updated. MEMORY + CLAUDE.md updated.
- **2026-02-23 (c):** Premium design polish — warm cream CSS variables, teal-tinted borders/shadows, card-surface utility class. Phosphor duotone icons across 35 files. Only shadcn/ui primitives retain lucide-react. 476 web tests green. Typecheck clean.
- **2026-02-23 (b):** Dashboard UI overhaul (teal/gold/cream design system). Competitor Listings + Discovery intelligence + code review fixes. 476 web + 293 AI tests green.
- **2026-02-23 (a):** Competitor Listings feature: Tavily search, DB-persisted JSONB, dead link filtering. Discovery cross-references: strategy ← market data, JD ← strategy+market hints.
- **2026-02-22 (a):** Sequential pipeline enforced. Wizard → quick insights only. Discovery tabs gated. Candidate profile receives market_key_skills. 476 web tests green.
> Keep max 5 entries. Remove oldest when adding new.
