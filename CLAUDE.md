# Rec+onnect MVP — Command Center

AI-powered Strategic Recruitment Operations Platform. Irish market, 8-week build, multi-tenant SaaS.
Stack: Next.js App Router + Tailwind + shadcn/ui + Supabase (RLS) + Claude AI (Opus 4.6 / Sonnet 4.5) + Whisper + Resend

---

## Current State

**Step:** CMS + Platform + org approval + collaborator flow fixes done. Step 10 plan updated with missing features (feedback submission, notifications). Pending manual QA + deploy.
**Status:** Steps 1-9 complete + hardened. Step 10.1 partial (OAuth done, API helpers pending). All 4 chapters functional. CMS Admin: 7 pages with full CRUD, seed defaults, wizard integration, question bank picker, email template interpolation. Platform Superadmin: org/user management, stats, env-var gated. Org approval flow: pending/active/suspended with dashboard blocking. Collaborator prep page: public, shows stages+questions+rating guide. CMS email templates integrated into prep/reminder modals (fetch + interpolate). 644 web + 316 AI + 233 DB tests green. Typecheck clean. 0 lint errors. NOT YET DEPLOYED — pending manual QA.
**Next task:** Manual QA testing of all CMS + Platform pages. Add `PLATFORM_ADMIN_EMAILS` to Vercel. Deploy. Then Step 10.2 (recording pipeline + feedback submission + consent flow) when Google Workspace upgraded. Step 10.2b (notification system) after. A2 on hold pending pricing model.
**Blockers:** Google Workspace upgrade to Business Plus (auto-recording). Without it: no recording pipeline, no feedback submission (needs interview records).
**Deployments:** axil.ie (landing) LIVE + SSL. app.axil.ie (web app) LIVE + SSL. All OAuth redirect URIs verified. Vercel linked.
**Key gap:** FeedbackForm component exists but is never rendered — no page where collaborators submit feedback. Planned for 10.2 task D.

**Build order:** ~~10.1~~ → ~~all hardening~~ → ~~Option A~~ → ~~prefetch fix~~ → ~~production audit~~ → ~~Alignment chapter~~ → ~~Alignment enhancements~~ → ~~Debrief chapter (D2-D4)~~ → ~~CMS Admin Controls~~ → ~~Platform Superadmin~~ → ~~Org approval~~ → ~~Collaborator prep page~~ → ~~CMS email integration~~ → 10.2 (recording + feedback + consent) → 10.2b (notifications) → 10.3-10.8

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
- [ ] All migrations deployed to production (currently 28, including FK cascade fix + cache phase + stage refinements + coverage analysis)
- [ ] Env vars set in Vercel (Supabase, Anthropic, Tavily, OpenAI, Resend, Google)
- [x] Rate limiting on AI endpoints — in-memory per-user throttle (10 req/min) on all 10 AI routes
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
- **~~Anthropic API credits exhausted~~** Topped up 2026-03-01. AI generation working. ~$0.80/playbook (with 2 improvement loops).
- **Data retention cron:** Not implemented. Needs client decision: build now or defer.
- **Audit logging:** No admin action logging. Low risk for beta, needed for production.
- **~~Rate limiting~~:** DONE (2026-03-07). In-memory per-user throttle, 10 req/min, all AI routes.
- **~~Lint errors~~:** DONE (2026-03-07). 0 errors (was 25). Fixed `no-explicit-any`, unescaped entities, react-hooks issues.

### Pipeline Flow Issues (updated 2026-03-03)
- **~~Deep research fire-and-forget — no recovery.~~** ALREADY FIXED: 8-minute polling timeout → amber retry banner → `handleRetryDeepResearch()` re-triggers with same cache_key. Implemented in `market-intelligence-panel.tsx`.
- **~~Vercel function timeout on deep research.~~** FIXED (2026-03-03): `maxDuration=300` on ALL AI route handlers (11 routes). Vercel Pro supports up to 300s. Strategy route was timing out at 120s — bumped in resilience round.
- **~~Candidate profile — no gating on Alignment page.~~** FIXED (2026-03-05): Profile prompt now enriched with emerging_premium skills, stage_types_summary, coverage_gaps. Stale detection warns when strategy updated. Inline editing + AI refine per-section.
- **Stage generation latency: 81-90s consistently.** Confirmed across 2 runs (81s and 90s). Near timeout boundary. **Fix:** Monitor in production, consider splitting into smaller calls if timeouts occur.
- **`parseJsonb` transient failure on page load.** Quick-phase market data can fail validation when Discovery page loads during deep research. Causes brief `null` marketInsights state. Self-resolves when polling updates. **Fix (low priority):** Use a looser schema for quick-phase data, or handle null gracefully in tab gating (already does — tabs stay locked).
- **Stage question count under target.** AI consistently generates 4-5 questions when prompt asks for 6+. Confirmed across 8 stages in 2 runs. Not random — AI self-limits. **Fix (low priority):** Strengthen prompt constraints or add retry on under-count.
- **AI score optimism bias: +6.5 points average.** Across 6 measurements, AI overestimates coverage by 5-14 points. One anomaly of -12. Programmatic score override is essential and working. No action needed — just awareness.
- **~~Competitor listings cache write error.~~** FIXED (2026-03-02): Migration adds `'listings'` to cache phase CHECK constraint.
- **~~Triple refinement generation on same input.~~** FIXED (2026-03-02): Input hash guard skips identical regeneration. Regenerate button disabled during generation.
- **~~Merge `replaces` miss.~~** FIXED (2026-03-02): Better warning message includes existing FA names. Merge warnings surfaced to user via toast.
- **~~Anchored coverage fallback to full re-eval + score regression.~~** FIXED (2026-03-03): When most FAs change, anchoring provides 0 benefit (all entries re-eval). AI was also reclassifying gap severity non-deterministically (minor→critical), causing 81%→78% regression. Fixed with: (1) gap severity floor — existing gaps can only decrease in severity, never increase, (2) monotonic score clamp — `Math.max(rawScore, previousScore)`. Trace now logs `raw_score`, `previous_score`, `clamped`.
- **~~P0 — Coverage score STUCK at 81-82%.~~** FIXED (2026-03-02): Gap-targeted re-evaluation + deterministic fallback. Prompt now tells AI which FA was SPECIFICALLY ADDED for which gap. If AI still misses, fallback forces gap to covered(weak). Guarantees monotonic score improvement. Prompt version bumped to 2.0.0. 5 new tests.
- **~~AI refinement cap: 2 iterations max.~~** REMOVED (2026-03-04): Recommendations panel deleted (Option A). Coverage improvements now done via direct stage editing + re-analysis. No cap needed.

---

## Session End Protocol

Before ending a session, ALWAYS do these:

1. **Update `.claude/SWARM_STATUS.md`** — mark completed micro steps, update Current Work table, add blockers if any
2. **Update this file's "Current State" section** — set correct step, status, next task, blockers
3. **Add 1-line entry to Recent Sessions below** — keep only last 5 entries
4. Do NOT create separate session log files

---

## Recent Sessions

- **2026-03-08:** CMS Admin Controls + Platform Superadmin (12 tasks). 7 admin pages with full CRUD, generic API, seed defaults, wizard integration, question bank picker, email template interpolation. Platform superadmin (org/user mgmt, stats, env-var gated). Code review: 5 fixes (org scoping, explicit columns, seed error check, email error sanitization, Link nav). 644 web tests green. Pending manual QA.
- **2026-03-07 (b):** Debrief chapter unlocked + D2/D3/D4 built. Candidate comparison (side-by-side grid), bias detection (TDD, 12 tests), activity timeline. Review fixes: parallel fetches (Promise.allSettled), failure warnings, memoized refs, transcript leak fixed (select("*") → explicit columns), role error logged. 25 lint errors → 0. Rate limiting on all 10 AI routes (in-memory, 10 req/min). 575 web tests green.
- **2026-03-07:** Alignment enhancements (A1,A3,A4,A5,A6). Process health warnings, competitive offer intelligence, interview prep email, feedback reminder email. Resend fixed (RESEND_FROM_EMAIL env var added to Vercel). Collaborator invite accept page built (/auth/collaborator?token=). 563 web tests green. Debrief features logged in memory. Client feedback round 3 processed.
- **2026-03-05:** Alignment chapter Tier 1+2+3 complete. Editable candidate profile (inline edit, tag editor, AI refine per-section), stale detection amber banner, "How to Use" guide, nav grouping with progress dots, enriched profile prompt, interactive process overview with scorecard preview, collaborator stage assignment, readiness checklist, share link preview. Fixed input focus loss bug (inner components → plain render functions). Resend domain not verified — client emailed. Proposal doc created (docs/client-proposal-alignment-debrief.md).
- **2026-03-04 (e):** AI package dead code cleanup. Deleted 11 files (8 source + 3 test): anchored-coverage, stage-refinements, merge-refinement-diff pipelines/prompts/schemas/tests. Removed barrel exports, config entries, ./merge subpath. 528 web + 316 AI tests green.
> Keep max 5 entries. Remove oldest when adding new.
