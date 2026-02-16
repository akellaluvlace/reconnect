# Rec+onnect MVP — Command Center

AI-powered Strategic Recruitment Operations Platform. Irish market, 8-week build, multi-tenant SaaS.
Stack: Next.js App Router + Tailwind + shadcn/ui + Supabase (RLS) + Claude AI (Opus 4.6 / Sonnet 4.5) + Whisper + Resend

---

## Current State

**Step:** 4 — Landing Page (COMPLETE)
**Status:** Steps 1-5 complete. Step 4 landing page built with premium design. Deep audit done. All P0 blockers resolved.
**Next task:** Schema migration #7 (Drive tables, recording metadata, GDPR) then Step 7 (Playbook Creation)
**Blockers:** External services (Google Cloud, Azure, Anthropic, OpenAI, Resend) — client setting up this week. Not blocking migration or Step 7.

**Corrected build order:** ~~4~~ → Migration #7 → 7 → 6 → 8 → 10.1-10.2 → 9 → 10.3-10.8

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
4. Verify: run DoD commands from the step file (lint, typecheck, tests)
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

- **2026-02-16 (d):** Landing page content expansion. Added 5 new sections: stats bar (with gold-tinted illustration + Irish market stats), problem section (3 pain points), trust badges (EU AI Act/GDPR/Human Oversight/EU Data), FAQ accordion (8 questions from research), CTA rewrite ("Join the founding 50" with scarcity + perks). Removed "Not chaos" from hero. Renamed How It Works → Why Rec+onnect (feature differentiators). Build clean.
- **2026-02-16 (c):** Landing page design polish. Hero image swap (AI-gen interview photo with navy/gold blending), solution section redesigned to alternating 2-col layout with Streamline Brooklyn illustrations + gold tint CSS, How It Works rewritten as 2x2 icon cards with hover effects. Removed boilerplate SVGs. All checks clean.
- **2026-02-16 (b):** Step 4 Landing Page COMPLETE. Premium design (navy/gold/cream), 7 sections (hero, solution, how-it-works, CTA, contact, header, footer), scroll animations, SEO+JSON-LD+GA4, static export. Typecheck+lint+build all clean.
- **2026-02-16 (a):** Deep architecture audit. Resolved 3 P0 blockers (Drive ownership, share link scope, share link password). Locked 3 tech decisions (magic link auth, transcript+feedback synthesis, UUID[] assigned_stages). Found 5 DB schema gaps + step ordering fix. Updated all docs.
- **2026-02-15 (d):** Code review fix session — fixed all 25 issues (3 critical, 7 high, 8 medium, 7 low). Added user bootstrap trigger, ai_synthesis policies, error boundaries, middleware auth fix, OAuth callback email verification. Migration pushed. Typecheck 6/6, lint 2/2.

> Keep max 5 entries. Remove oldest when adding new.
