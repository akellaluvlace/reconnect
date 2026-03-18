# Step 10 — Integrations, Hardening, Beta, Delivery

**Status:** IN PROGRESS (10.1 OAuth verified, CMS + Platform done)
**Week:** 7-8
**Default Owners:** DevOps + QA + Security + Architect

---

## Goal

Make it reliable + shippable: Google Drive recording storage (core AI pipeline backbone), collaborator feedback flow, notification system, performance, security, beta testing, handover.

---

## Deliverables

- Google Drive OAuth + recording storage (org-level, core backbone for AI analysis pipeline)
- Collaborator feedback submission (public page, no login required)
- Notification system (email-based, configurable per user)
- Bug fixing + optimization (bundle, query speed, UX polish)
- Security checklist pass (auth on all routes, rate limiting AI, safe uploads, logs)
- Prod deployment + beta plan (5–10 testers)
- Documentation + handover checklist

---

## Definition of Done (Step Level)

- [ ] Production deployed with correct env vars and migrations
- [ ] Beta scenarios pass (playbook full loop, invites, feedback submission, recording, transcription, synthesis, share)
- [ ] All notification emails working (feedback submitted, synthesis ready, daily reminders)
- [ ] Docs delivered + handover complete
- [ ] All micro steps complete

---

## What's Already Done (Steps 1-9 + pre-10 work)

These are COMPLETED and should not be re-done:

- [x] **10.1 Google OAuth verified** — "Axil Recording" client, tokens in `platform_google_config`, refresh working
- [x] **CMS Admin Controls** — 7 admin pages with full CRUD, seed defaults, wizard integration, question bank picker, email template interpolation (2026-03-08)
- [x] **Platform Superadmin** — Env-var gated, org/user management, stats dashboard (2026-03-08)
- [x] **Org approval flow** — `status` column on organizations, pending/active/suspended, dashboard blocking (2026-03-09)
- [x] **Rate limiting** — In-memory per-user throttle (10 req/min) on all 10 AI routes (2026-03-07)
- [x] **Lint cleanup** — 0 errors (2026-03-07)
- [x] **Collaborator prep page** — `/auth/collaborator?token=X` shows stages, focus areas, questions, rating guide (2026-03-09)
- [x] **CMS email template integration** — Prep/reminder modals fetch CMS templates, interpolate `{{variables}}`, fall back to defaults (2026-03-09)
- [x] **All 4 chapters functional** — Discovery, Process, Alignment, Debrief UI built
- [x] **644 web + 316 AI + 233 DB tests green. Typecheck clean.**

---

## Guardrails (Burn Prevention)

These are lessons from Steps 1-9. Violating them has caused real bugs.

### Mock Gap Risk
All 644 web tests mock Supabase. This means:
- A `.eq("nonexistent_column", value)` would pass tests silently
- An RLS policy mismatch between API route and DB would be invisible
- **RULE:** Every new API route in Step 10 MUST be manually tested against the real dev server before marking complete. This is non-negotiable — the Zod v3→v4 crash was only caught by E2E, not unit tests.

### Google Integration (10.2) — Build Incrementally
Do NOT build the full Meet→Drive→Whisper→Claude pipeline in one batch.
1. First: Calendar event creation + Meet link. Verify event appears in calendar.
2. Then: Meet API recording retrieval. Verify file ID comes back.
3. Then: Drive download VTT. Verify transcription works.
4. Each step should be independently testable and committable.

### Token Counting
`truncateTranscript()` exists in `packages/ai/src/prompts/feedback-synthesis.ts` (150K soft limit, 60/30 head/tail split). It IS called in the pipeline. BUT:
- The route does NOT surface whether truncation happened. Add `transcript_truncated: boolean` to the response metadata so the UI can show "Partial transcript analyzed" when relevant.
- Very long interviews (3+ hours) may produce transcripts that exceed even the truncation budget when combined with feedback. Monitor in beta.

### Pre-Live Testing Checklist (Before Beta)
Run these BEFORE giving any beta tester access:
- [ ] Deploy all pending migrations to production
- [ ] Verify RLS: log in as admin, manager, interviewer — each should see correct data scope
- [ ] Verify blind feedback: interviewer cannot see other interviewers' feedback
- [ ] Verify share links: expired link returns 404, revoked link returns 404
- [ ] Verify transcript privacy: no route returns raw transcript text to client
- [ ] Verify AI disclaimer: every AI-generated output shows the disclaimer
- [ ] Click through every page: Landing → Login → Playbooks → Discovery → Process → Alignment → Debrief
- [ ] Test empty states: new org with no playbooks, playbook with no stages, stage with no interviews
- [ ] Test error states: disconnect network during AI generation, submit invalid feedback
- [ ] Cross-browser: Chrome + Firefox + Edge (desktop only, 1024px min)
- [ ] Verify collaborator feedback submission works end-to-end (magic link → prep → feedback → manager sees it)
- [ ] Verify notification emails fire correctly (feedback submitted, synthesis ready)

### Data Retention (1-Year Requirement)
This is a compliance requirement documented in the spec but has NO implementation yet.
- Needs: cron job or Supabase pg_cron to check `created_at` > 1 year
- Needs: auto-reachout email to candidate asking opt-in/out
- Needs: if no response, archive or delete data
- **Decision needed:** Build in Step 10.3 (bug fixes) or defer to post-MVP? Flag for client.

---

## Micro Steps

### 10.1 — Platform Google Account Setup + OAuth

> **STATUS: PARTIALLY DONE** — OAuth client verified, tokens stored. Remaining: Google API helpers + migration.

> **CRITICAL**: Google Drive + Meet is the core recording infrastructure.
> The AI pipeline depends on this. Not an export feature.
> See `docs/INTERVIEW_RECORDING_FLOW.md` for full architecture.
> See `docs/plans/2026-02-23-recording-pipeline-design.md` for revised design (state machine, VTT primary, manual synthesis).

**Owner:** Backend
**Supporting:** Security
**Status:** IN PROGRESS
**Branch:** `step10-1-google-platform-oauth`

**Allowed Paths:**
- `apps/web/src/app/api/google/**`
- `apps/web/src/lib/google/**`
- `supabase/migrations/` (migration #29+)

**Architecture (Client Decision 2026-02-20, revised 2026-02-23):**
- **Shared Axil Google Workspace account** (platform-level, NOT per-org)
- **Business Plus tier** (REQUIRED for auto-recording + auto-transcription — client upgrading from Standard)
- **Admin setting:** "Meetings are recorded by default" + transcription enabled in Workspace admin console
- **All recordings → Axil's Drive** (`Meet Recordings/` folder, no moves for MVP — isolation via app-layer RLS)
- **Meet API** provides exact Drive file IDs for recording AND transcript retrieval (no filename guessing)
- **DB table:** `platform_google_config` (single-row, service_role only) — migration #19 deployed, tokens verified 2026-02-26
- **PRIMARY transcript source:** Google Meet built-in transcription (VTT/SBV files, ~50KB). Whisper = fallback for manual uploads only.
- **Synthesis trigger:** MANUAL — admin/manager clicks button when all feedback is in. NOT auto-chained to transcription.

**Already Done:**
- [x] Google Cloud project created ("Axil Recording" client)
- [x] OAuth 2.0 credentials configured (5 scopes: openid, email, calendar.events, meetings.space.readonly, drive.meet.readonly)
- [x] Redirect URIs configured (localhost + app.axil.ie)
- [x] Tokens stored in `platform_google_config` (refresh_token present, verified 2026-02-26)
- [x] `platform_google_config` migration deployed (#19)

**Remaining Tasks:**
- [ ] Create migration: updated `recording_status` CHECK constraint + `pipeline_log JSONB[]` + `retry_count INTEGER`:
  ```sql
  -- States: scheduled, pending, uploaded, transcribing, transcribed, synthesizing, completed
  -- Failed: failed_recording, failed_download, failed_transcription, failed_synthesis, no_consent
  ALTER TABLE interviews ADD COLUMN IF NOT EXISTS pipeline_log JSONB[] DEFAULT '{}';
  ALTER TABLE interviews ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
  ```

- [ ] Create Google client wrapper (`apps/web/src/lib/google/client.ts`):
  - Read tokens from `platform_google_config` (single row, service_role)
  - Auto-refresh 5 min before expiry (NOT on-demand — prevents race conditions)
  - Return authenticated google client
  - Log all token refresh events

- [ ] Create platform config management:
  - Health check endpoint (`GET /api/google/health`) — cron every 15 min
  - Alert on 2 consecutive health check failures

- [ ] Create Google API helper modules (separate files for testability):
  - `apps/web/src/lib/google/calendar.ts` — `createMeetEvent(params)`: Calendar API create event with conferenceData + co-host
  - `apps/web/src/lib/google/meet.ts` — `getConferenceRecord(meetingCode)`: Meet API `conferenceRecords.list()` + `transcripts.list()` → transcript file ID
  - `apps/web/src/lib/google/drive.ts` — `downloadTranscriptFile(fileId)`: Drive API download VTT/SBV file
  - `apps/web/src/lib/google/vtt-parser.ts` — Parse VTT/SBV → plain text + segments array

**Blocker:** Google Workspace upgrade from Business Standard → Business Plus (client action required)

**Security Checklist:**
- [x] Tokens stored in `platform_google_config` (RLS enabled, NO policies = service_role only)
- [x] Minimal scopes requested
- [ ] Token refresh 5 min before expiry, not on-demand
- [x] No tokens exposed to client
- [ ] API calls always go through server-side routes
- [ ] Health check cron every 15 min

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
# Test: create Meet event, verify Meet link returned
# Test: health check endpoint returns valid token status
```

**Output:** Platform Google integration working (auth + Calendar + Meet + Drive APIs)

---

### 10.2 — Interview Scheduling + Recording Pipeline + Feedback Submission

> Critical path: Schedule → Meet auto-records → Drive → VTT transcript → Feedback → Synthesis.
> See `docs/INTERVIEW_RECORDING_FLOW.md` for the complete flow.
> See `docs/plans/2026-02-23-recording-pipeline-design.md` for state machine + vulnerability map.

**Owner:** Backend
**Supporting:** Frontend, AI Engineer
**Status:** PENDING
**Branch:** `step10-2-recording-pipeline`

**Allowed Paths:**
- `apps/web/src/app/api/google/meet/route.ts`
- `apps/web/src/app/api/google/recordings/route.ts`
- `apps/web/src/app/api/interviews/**`
- `apps/web/src/app/api/cron/**`
- `apps/web/src/app/api/consent/**`
- `apps/web/src/app/auth/collaborator/**`
- `apps/web/src/lib/google/**`
- `apps/web/src/components/debrief/**`

**The Complete Interview Flow (end-to-end):**
```
1. Manager schedules interview in Axil (Debrief chapter)
   → App creates Calendar event (Axil account = organizer)
   → Interviewer added as CO-HOST (triggers auto-record on join)
   → Candidate added as attendee
   → Email sent to interviewer + candidate (Resend)
   → Status = 'scheduled'

2. Recording consent (before interview)
   → Candidate receives consent email with token-based link
   → Candidate clicks accept/decline at /api/consent/[token]
   → If declined: status = 'no_consent', synthesis runs on feedback only

3. Interview happens on Google Meet
   → Auto-recorded + auto-transcribed (Google Workspace Business Plus)

4. Post-interview: Cron retrieves transcript
   → Cron polls Meet API every 5 min for VTT file ID
   → Downloads VTT from Drive (~50KB)
   → Parses VTT → stores in interview_transcripts (service_role only)
   → Status: pending → uploaded → transcribed

5. Interviewer submits feedback (no login required)
   → Collaborator clicks link from prep/reminder email
   → /auth/collaborator/feedback?token=X&interview_id=Y
   → Sees focus areas for their assigned stage
   → Rates each 1-4, adds pros/cons, confirms focus areas discussed
   → POSTs to /api/feedback
   → Manager notified via email "Feedback submitted by [name]"

6. Manager triggers AI synthesis (manual)
   → All feedback collected? Manager clicks "Generate Synthesis"
   → Input: transcript (if available) + ALL feedback forms + candidate context
   → Output: summary, consensus, strengths, concerns, rating overview
   → Manager notified via email when complete
   → Status = 'completed'
```

**State Machine (recording_status):**
```
scheduled → pending → uploaded → transcribed → [MANUAL] → synthesizing → completed
                   → no_consent
                   → failed_recording → (retry up to 3x)
         uploaded → failed_transcription → (retry up to 3x)
     synthesizing → failed_synthesis → (retry up to 3x)
```

**Tasks:**

**A. Interview Scheduling API:**
- [ ] `POST /api/interviews` — Create interview + Meet event:
  - Auth check (admin/manager), validate candidate_id + stage_id
  - Call `createMeetEvent()` from 10.1 (adds interviewer as co-host)
  - Store `meet_link`, `meet_conference_id` on interview row
  - Set `recording_status = 'scheduled'`
  - Append to `pipeline_log`: `{ from: null, to: 'scheduled', ts, detail: 'interview created' }`
  - Send email to interviewer (with Meet link + prep info)
  - Send recording consent email to candidate (Resend)
- [ ] `PATCH /api/interviews/[id]` — Reschedule (update Calendar event)
- [ ] `DELETE /api/interviews/[id]` — Cancel (delete Calendar event)

**B. Recording Pipeline Cron:**
- [ ] Create cron endpoint (`POST /api/cron/recording-pipeline`):
  - Vercel Cron: runs every 5 minutes
  - Authenticated via `CRON_SECRET` header (Vercel sets automatically)
  - Queries interviews in retriable states: `pending`, `uploaded`
  - For each:
    1. **Consent gate:** If `recording_consent_at IS NULL`, set `no_consent`, skip
    2. **Optimistic lock:** `UPDATE SET recording_status='next_state' WHERE status='current_state' RETURNING id`
    3. **pending → uploaded:** Poll Meet API for transcript file, get VTT file ID, store `drive_file_id`
    4. **uploaded → transcribed:** Download VTT from Drive, parse with `vtt-parser.ts`, store in `interview_transcripts`
  - Append every transition to `pipeline_log`
  - Respect retry budget: `retry_count <= 3`, increment on failure

**C. Transcript Retrieval (VTT — primary source):**
- [ ] `conferenceRecords.transcripts.list(parent="conferenceRecords/{id}")` → transcript file reference
- [ ] Download VTT/SBV file from Drive (~50KB, not 100-300MB video)
- [ ] Parse VTT to plain text + segments via `vtt-parser.ts`
- [ ] Store in `interview_transcripts` table (service_role only)
- [ ] **No ffmpeg, no Whisper, no large downloads for auto-recorded interviews**

**D. Collaborator Feedback Submission Page (NEW — was missing from plan):**
> Questionnaire Q7.4-Q7.5: ratings 1-4, focus areas confirmed required.
> `FeedbackForm` component already exists at `components/debrief/feedback-form.tsx` — needs wiring.

- [ ] Create feedback submission page: `/auth/collaborator/feedback` (public, no login)
  - Token-based auth (same `invite_token` as prep page)
  - Query param: `interview_id` (links feedback to specific interview)
  - Page shows: stage name, focus areas, rating guide
  - Renders existing `FeedbackForm` component
  - On submit: POST `/api/feedback` (needs auth modification — currently requires Supabase session)
  - Success: "Thank you" confirmation page
  - Already submitted: show read-only view of their feedback
- [ ] Create service-role feedback submission route: `POST /api/feedback/collaborator`
  - Validates `invite_token` + `interview_id`
  - Verifies collaborator is assigned to the interview's stage
  - Sets `interviewer_id` from collaborator record (not from auth session)
  - Same Zod validation as existing `/api/feedback` POST
  - Returns 201 on success
- [ ] Add feedback link to prep page footer ("After your interview, submit feedback here")
- [ ] Add feedback link to reminder emails
- [ ] Fallback: If no `interview_id` exists yet, allow feedback linked to stage only (pre-recording-pipeline)

**E. Recording Consent Flow:**
- [ ] `POST /api/consent/[token]` — Record candidate's consent decision
  - Token validated against interview record
  - Sets `recording_consent_at` on accept
  - Sets `recording_status = 'no_consent'` on decline
  - Interview proceeds either way — recording is opt-in
- [ ] Consent email template (exists in `lib/email/templates.ts` as `recordingConsentHtml()`)
- [ ] Consent UI page: simple accept/decline with explanation

**F. Manual Synthesis Trigger:**
- [ ] Button in Debrief UI: "Generate Synthesis" (visible when transcript OR feedback exists)
- [ ] `POST /api/interviews/[id]/synthesis` — triggers `generateFeedbackSynthesis()` pipeline
  - Input: transcript (if available) + ALL feedback forms + candidate context
  - Sets `recording_status = 'synthesizing'` → `'completed'` on success
  - Manager/admin only (role check)
  - Add `transcript_truncated: boolean` to response metadata

**G. Interview Scheduling UI:**
- [ ] ScheduleDialog component (date picker + time + interviewer select)
- [ ] Shows generated Meet link after scheduling
- [ ] Recording status indicator on interview cards (state machine states with icons)
- [ ] "Retry" button on failed states (up to 3 retries)
- [ ] Pipeline log viewer (expandable, shows state transitions)

**H. Manual Upload Fallback (Whisper path):**
- [ ] Upload button on interview card (if auto-record failed or non-Meet interview)
- [ ] Accepts audio file (max 100MB) → uploads to **Supabase Storage**
- [ ] Whisper-1 API transcribes audio → stores in `interview_transcripts`
- [ ] Same synthesis flow applies after transcription
- [ ] Client-side + server-side file size validation

**Guardrails:**
- Optimistic locking on all state transitions (prevents double-processing)
- Retry budget: max 3 per failed state, then terminal
- Pipeline audit log: every transition appended to `pipeline_log JSONB[]`
- Consent hard gate: `no_consent` if `recording_consent_at IS NULL`
- Cron deduplication: `UPDATE WHERE status=X RETURNING id` — atomic claim

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
# Test: schedule interview → verify Meet link + status='scheduled'
# Test: cron advances pending → uploaded → transcribed (with mock Meet API)
# Test: collaborator submits feedback via public page → manager sees it in Debrief
# Test: manual synthesis trigger works
# Test: consent gate blocks recording retrieval when null
# Test: retry budget enforced (max 3)
```

**Output:** Full recording pipeline + feedback submission + consent flow

---

### 10.2b — Notification System

> Questionnaire Q10.1-Q10.6: All notification types = "Yes", email only, configurable.
> DB column `users.notification_preferences` already exists (JSONB, defaults to all-on).

**Owner:** Backend
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step10-2b-notifications`

**Allowed Paths:**
- `apps/web/src/app/api/feedback/route.ts`
- `apps/web/src/app/api/ai/synthesize-feedback/route.ts`
- `apps/web/src/app/api/cron/**`
- `apps/web/src/app/(dashboard)/settings/**`
- `apps/web/src/lib/email/**`
- `apps/web/src/lib/notifications.ts` (new)

**Client Requirements (from questionnaire):**

| Q# | Notification | Client Answer | Status |
|----|-------------|---------------|--------|
| 10.1 | Notify collaborators when assigned | Yes | NOT BUILT |
| 10.2 | Notify manager when feedback submitted | Yes | NOT BUILT |
| 10.3 | Notify when AI synthesis is ready | Yes | NOT BUILT |
| 10.4 | Reminder emails for pending feedback | Yes | MANUAL ONLY (no auto) |
| 10.5 | Email only (no in-app) | Email only | Architecture matches |
| 10.6 | User notification preferences | Configurable | DB EXISTS, no UI |

**Tasks:**

**A. Notification Helper (`lib/notifications.ts`):**
- [ ] Create `notifyManager(playbookId, type, data)` helper:
  - Looks up playbook creator (or org admins/managers)
  - Checks `user.notification_preferences[type]` — skips if false
  - Sends email via Resend
  - Supports types: `feedback_submitted`, `synthesis_ready`, `all_feedback_collected`
- [ ] Create `notifyCollaborator(collaboratorId, type, data)` helper:
  - Sends to collaborator email
  - Supports types: `stage_assigned`, `feedback_reminder`

**B. Feedback Submitted → Notify Manager (Q10.2):**
- [ ] In `POST /api/feedback` (and new `POST /api/feedback/collaborator`):
  - After successful insert, call `notifyManager(playbookId, 'feedback_submitted', { interviewerName, stageName, ratingSummary })`
  - Email: "Feedback submitted by [name] for [stage] — average rating: X/4"
  - Link to Debrief page
- [ ] Create email template `feedbackSubmittedHtml()` in `lib/email/templates.ts`
- [ ] Add CMS template_type `feedback_submitted` support

**C. All Feedback Collected → Notify Manager:**
- [ ] After feedback insert, check: are all assigned collaborators' feedback in for this candidate?
  - Count interviews for candidate → count feedback entries → if equal, trigger
  - `notifyManager(playbookId, 'all_feedback_collected', { candidateName, feedbackCount })`
  - Email: "All feedback collected for [candidate] — ready for synthesis"
  - Include "Generate Synthesis" deep link

**D. Synthesis Complete → Notify Manager (Q10.3):**
- [ ] In `POST /api/ai/synthesize-feedback`:
  - After synthesis saved to `ai_synthesis` table, call `notifyManager(playbookId, 'synthesis_ready', { candidateName })`
  - Email: "AI synthesis ready for [candidate] — view results"
  - Link to Debrief page

**E. Stage Assignment → Notify Collaborator (Q10.1):**
- [ ] In `PATCH /api/collaborators/[id]` when `assigned_stages` changes:
  - Send email to collaborator listing assigned stage names
  - Include link to their prep page (`/auth/collaborator?token=X`)

**F. Automated Daily Feedback Reminders (Q10.4):**
- [ ] Create cron endpoint (`POST /api/cron/feedback-reminders`):
  - Vercel Cron: runs daily at 9am Dublin time
  - Authenticated via `CRON_SECRET`
  - Query: interviews completed > 24h ago with no feedback from assigned collaborator
  - For each: send reminder email (using CMS template if available, else default)
  - Track: don't re-send if already reminded in last 24h (add `last_reminder_sent_at` to collaborators or use a simple log)
  - Respect `notification_preferences.reminders` on the manager side

**G. Notification Preferences UI:**
- [ ] Add "Notifications" section to Settings page (`/settings`)
- [ ] Toggles for each notification type:
  - Feedback submitted (default: on)
  - All feedback collected (default: on)
  - Synthesis ready (default: on)
  - Reminders (default: on)
- [ ] `PATCH /api/users/preferences` — updates `notification_preferences` JSONB
- [ ] Read preferences in all notification helpers before sending

**Email Templates to Create:**
- [ ] `feedbackSubmittedHtml()` — interviewer name, stage, rating summary
- [ ] `allFeedbackCollectedHtml()` — candidate name, feedback count, synthesis link
- [ ] `synthesisReadyHtml()` — candidate name, view link
- [ ] `stageAssignedHtml()` — stage list, prep page link
- [ ] Add CMS `template_type` support for each (so orgs can customise)

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
# Test: submit feedback → manager receives email
# Test: all feedback in → manager receives "ready for synthesis" email
# Test: synthesis completes → manager receives email
# Test: stage assignment → collaborator receives email
# Test: cron sends daily reminders for pending feedback
# Test: notification preferences respected (toggle off → no email)
```

**Output:** Complete notification system per client questionnaire

---

### 10.3 — Bug Fixes & Optimization

**Owner:** Frontend + Backend
**Supporting:** QA
**Status:** PENDING
**Branch:** `step10-3-bugfixes-optimization`

**Tasks:**
- [ ] Review all reported issues from manual QA + beta
- [ ] Fix critical bugs first
- [ ] Test edge cases:
  - Empty states
  - Long text inputs
  - Network errors
  - Concurrent updates

- [ ] Performance optimization:
  - Analyze bundle size (target <200KB initial)
  - Implement code splitting
  - Optimize images (WebP, lazy loading)
  - Database query optimization
  - API response time audit (<500ms except AI)

- [ ] Cross-browser testing:
  - Chrome (latest)
  - Firefox (latest)
  - Edge (latest)

- [ ] Desktop layout verification (min 1024px)

- [ ] Dead code cleanup:
  - Remove unused `FeedbackForm` import if wired into collaborator page
  - Verify all components are actually rendered somewhere

**DoD Commands:**
```bash
pnpm build
# Check bundle analyzer
# Run Lighthouse
```

**Output:** Bugs fixed, performance targets met

---

### 10.4 — Security Audit

**Owner:** Security
**Supporting:** Backend
**Status:** PENDING
**Branch:** `step10-4-security-audit`

**Tasks:**
- [ ] Security checklist (VERIFIED items from hardening — re-verify against live DB):
  - [ ] All API routes authenticated (82 tests cover auth matrix — verify against real Supabase)
  - [ ] RLS policies tested with multiple roles (233 DB tests — re-run after latest migration deploy)
  - [ ] No sensitive data in client logs (grep for `console.log` in production code — should use `console.error` only)
  - [ ] Environment variables secured (check Vercel env config)
  - [ ] CORS configured correctly (Next.js default is same-origin — verify)
  - [x] Rate limiting on AI endpoints (DONE 2026-03-07: in-memory per-user throttle, 10 req/min, all 10 AI routes)
  - [ ] Input validation on all forms (all routes have Zod `.max()` — verified)
  - [ ] XSS prevention (React auto-escapes, `sanitizeInput()` on AI prompts — verified)
  - [ ] CSRF protection (Next.js API routes use SameSite cookies — verify)
  - [ ] Secure file upload (type/size validation on manual upload component — verify)
  - [ ] Audit logging for sensitive ops (**NOT IMPLEMENTED** — consider for admin actions: delete playbook, revoke invite, etc.)
  - [ ] `interviewer_id` always from auth, never from body (mutation test M12 verified)
  - [ ] Share link data scope minimal (verified — name, stage, questions, feedback form only)
  - [ ] Transcript never in client response (verified — service_role only access)
  - [ ] Collaborator feedback route validates token + stage assignment (no unauthorized feedback)
  - [ ] Notification emails don't leak sensitive data (no salary, no AI synthesis content in email body)

- [ ] EU AI Act compliance verification:
  - [ ] No emotion inference
  - [ ] No voice analysis
  - [ ] No biometric processing
  - [ ] Human review disclaimers present
  - [ ] Recording consent implemented
  - [ ] No hire/no-hire recommendation anywhere

- [ ] GDPR compliance verification:
  - [ ] Data retention awareness (1-year policy documented, cron deferred to post-MVP or built in 10.3)
  - [ ] Erasure path exists (manual for MVP — admin can delete playbook + cascade)
  - [ ] No data export required (client confirmed: "all stays in system")

**DoD Commands:**
```bash
# Manual security review
# Automated security scan (if available)
```

**Output:** Security audit passed

---

### 10.5 — Production Deployment

**Owner:** DevOps
**Supporting:** Architect
**Status:** PENDING
**Branch:** `step10-5-production-deploy`

**Tasks:**
- [ ] Deployment checklist:
  - [ ] Production environment variables set in Vercel (including `PLATFORM_ADMIN_EMAILS`, `CRON_SECRET`)
  - [ ] All database migrations applied to production
  - [ ] DNS configured for domains (axil.ie + app.axil.ie — ALREADY DONE)
  - [ ] SSL certificates active (ALREADY DONE)
  - [ ] Error monitoring set up (Sentry or similar)
  - [ ] Vercel Cron configured (recording-pipeline every 5min, feedback-reminders daily)
  - [ ] Backup strategy confirmed

- [ ] Production URLs:
  - Landing: `https://axil.ie` (LIVE)
  - App: `https://app.axil.ie` (LIVE, needs latest deploy)

- [ ] Verify deployment:
  - All pages load
  - Auth works (email/password + Google + Microsoft)
  - AI endpoints respond
  - Database queries work
  - CMS admin pages functional
  - Platform admin pages functional
  - Collaborator magic link works
  - Feedback submission works

**DoD Commands:**
```bash
vercel --prod
# Smoke test production
```

**Output:** Production deployed and live

---

### 10.6 — Beta Testing

**Owner:** QA
**Supporting:** All
**Status:** PENDING
**Branch:** `step10-6-beta-testing`

**Tasks:**
- [ ] Beta setup:
  - Client provides ~10 beta testers (actual clients, per questionnaire Q14.2)
  - Create test accounts
  - Provide beta testing guide
  - Set up feedback form (per questionnaire Q14.3: "Form and direct")

- [ ] Test scenarios (critical path — must all pass):
  1. Create organization and invite team member
  2. Create complete playbook: wizard → Discovery (market research + strategy + JD) → Process (stages + questions + coverage) → Alignment (candidate profile + collaborators + share link) → Debrief
  3. Invite collaborator by email → verify magic link works → collaborator sees prep page with stages + questions
  4. Schedule interview via Meet → verify Meet link + calendar event created
  5. Recording consent: candidate receives consent email → accepts/declines
  6. Record interview (auto-record) → verify recording retrieval → verify VTT transcription
  7. Collaborator submits feedback via public page → verify ratings (1-4), pros/cons, focus areas confirmed
  8. Verify blind feedback: collaborator cannot see others' feedback
  9. Manager receives "feedback submitted" email notification
  10. Second collaborator submits → manager receives "all feedback collected" notification
  11. Generate AI synthesis → verify disclaimer shows → verify no hire/no-hire recommendation
  12. Manager receives "synthesis ready" email notification
  13. Share playbook via link → verify limited data scope → verify expired link blocked
  14. Verify consent decline flow: candidate declines → no recording → feedback-only synthesis
  15. CMS: admin customises email template → verify it appears in collaborator emails
  16. Platform: superadmin can view/manage orgs, activate/suspend

- [ ] Edge case scenarios (should not crash):
  1. Delete a stage that has interviews → interviews should have `stage_id = NULL` (FK cascade)
  2. Very long text in all fields (test with 5000-char notes)
  3. Generate AI insights with minimal data (1 feedback, no transcript)
  4. Revoke share link → verify immediate access loss
  5. Expired collaborator invite → verify rejection on prep page
  6. Suspended org → verify dashboard blocked
  7. Pending org → verify "waiting for approval" page shown

- [ ] Feedback collection:
  - Set up feedback form or channel
  - Daily check-ins with client
  - Prioritize and fix reported issues

**DoD Commands:**
```bash
# Manual testing by beta users
# Track issues in GitHub/Linear
```

**Output:** Beta testing completed

---

### 10.7 — Documentation

**Owner:** Architect
**Supporting:** All
**Status:** PENDING
**Branch:** `step10-7-documentation`

**Tasks:**
- [ ] Create user documentation:
  - Getting started guide
  - Feature walkthrough (all 4 chapters)
  - CMS admin guide (CMS.md already created — expand if needed)
  - FAQ

- [ ] Create admin documentation:
  - User management
  - Organization settings
  - CMS configuration
  - Integration setup (Google Drive)
  - Platform superadmin guide

- [ ] Create technical documentation:
  - Architecture overview
  - Environment variables reference
  - Database schema
  - API endpoints
  - Recording pipeline state machine

- [ ] Create runbooks:
  - Deployment process
  - Rollback procedure
  - Common issues and fixes
  - Google token refresh troubleshooting

**DoD Commands:**
```bash
# Review docs for completeness
```

**Output:** Documentation delivered

---

### 10.8 — Handover & Final Delivery

**Owner:** Architect + DevOps
**Supporting:** All
**Status:** PENDING
**Branch:** N/A (coordination step)

**Tasks:**
- [ ] Handover meeting with client:
  - Demo all features
  - Walk through admin functions
  - Walk through CMS + Platform admin
  - Answer questions

- [ ] Transfer ownership:
  - [ ] Vercel project ownership
  - [ ] Supabase project access
  - [ ] GitHub repository (if applicable)
  - [ ] Environment variables documentation
  - [ ] API keys and credentials
  - [ ] Google Workspace recording account credentials

- [ ] Final invoice:
  - €2,500 + VAT = €3,075

- [ ] Warranty period begins:
  - 30 days bug fixes within scope
  - Does not include new features
  - Does not include client modifications

- [ ] Optional ongoing support discussion:
  - €150/month for basic maintenance

**DoD Commands:**
```bash
# Handover checklist complete
# Final invoice sent
# Client confirmation received
```

**Output:** Project delivered

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 10.1 Platform Google Setup | Backend | IN PROGRESS (OAuth done, helpers pending) | step10-1-google-platform-oauth |
| 10.2 Recording + Feedback | Backend | PENDING (blocked: Workspace upgrade) | step10-2-recording-pipeline |
| 10.2b Notifications | Backend | PENDING | step10-2b-notifications |
| 10.3 Bug Fixes | Frontend + Backend | PENDING | step10-3-bugfixes-optimization |
| 10.4 Security Audit | Security | PENDING | step10-4-security-audit |
| 10.5 Production Deploy | DevOps | PENDING | step10-5-production-deploy |
| 10.6 Beta Testing | QA | PENDING | step10-6-beta-testing |
| 10.7 Documentation | Architect | PENDING | step10-7-documentation |
| 10.8 Handover | Architect | PENDING | N/A |

---

## Dependencies

- **Blocks:** None (final step)
- **Blocked By:** Google Workspace Business Plus upgrade (client action)
- **Soft Dependencies:** 10.1 → 10.2 → 10.2b → 10.3 → 10.4 → 10.5 → 10.6 → 10.7 → 10.8

---

## Milestone

**End of Week 8: Final payment (€2,500 + VAT)**

---

## Post-Delivery

### 30-Day Warranty
- Bug fixes within delivered scope
- Does NOT include:
  - Client modifications
  - Third-party integration issues
  - Hosting/infrastructure problems
  - Feature requests

### Optional Ongoing Support (€150/month)
- Basic maintenance
- QA of code revisions
- Edge-case bug fixes
- Priority response
- Does NOT include new feature development

### Future Enhancement Opportunities
- Mobile apps (iOS/Android)
- Calendar integrations (Google Calendar, Outlook)
- ATS integrations (Greenhouse, Lever)
- Custom analytics dashboard
- Multi-language support
- Payment/billing system (Stripe)
- Data retention cron (1-year auto-reachout)
- Audit logging for admin actions
- White-label branding per org (Q4.2: "Yes, optional")
- Playbook duplication/templates (A2 — on hold pending pricing model)
