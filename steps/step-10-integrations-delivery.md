# Step 10 — Integrations, Hardening, Beta, Delivery

**Status:** NOT STARTED
**Week:** 7-8
**Default Owners:** DevOps + QA + Security + Architect

---

## Goal

Make it reliable + shippable: Google Drive recording storage (core AI pipeline backbone), performance, security, beta testing, handover.

---

## Deliverables

- Google Drive OAuth + recording storage (org-level, core backbone for AI analysis pipeline)
- Bug fixing + optimization (bundle, query speed, UX polish)
- Security checklist pass (auth on all routes, rate limiting AI, safe uploads, logs)
- Prod deployment + beta plan (5–10 testers)
- Documentation + handover checklist

---

## Definition of Done (Step Level)

- [ ] Production deployed with correct env vars and migrations
- [ ] Beta scenarios pass (playbook full loop, invites, recording, transcription, synthesis, share, export)
- [ ] Docs delivered + handover complete
- [ ] All micro steps complete

---

## Guardrails (Burn Prevention)

These are lessons from Steps 1-9. Violating them has caused real bugs.

### Mock Gap Risk
All 476 web tests mock Supabase. This means:
- A `.eq("nonexistent_column", value)` would pass tests silently
- An RLS policy mismatch between API route and DB would be invisible
- **RULE:** Every new API route in Step 10 MUST be manually tested against the real dev server before marking complete. This is non-negotiable — the Zod v3→v4 crash was only caught by E2E, not unit tests.

### Google Integration (10.1-10.2) — Build Incrementally
Do NOT build the full Meet→Drive→Whisper→Claude pipeline in one batch.
1. First: Google OAuth + token storage + health check. Verify tokens refresh.
2. Then: Calendar event creation + Meet link. Verify event appears in calendar.
3. Then: Meet API recording retrieval. Verify file ID comes back.
4. Then: Drive download + Whisper. Verify transcription works.
5. Each step should be independently testable and committable.

### Token Counting
`truncateTranscript()` exists in `packages/ai/src/prompts/feedback-synthesis.ts` (150K soft limit, 60/30 head/tail split). It IS called in the pipeline. BUT:
- The route does NOT surface whether truncation happened. Add `transcript_truncated: boolean` to the response metadata so the UI can show "Partial transcript analyzed" when relevant.
- Very long interviews (3+ hours) may produce transcripts that exceed even the truncation budget when combined with feedback. Monitor in beta.

### Pre-Live Testing Checklist (Before Beta)
Run these BEFORE giving any beta tester access:
- [ ] Deploy migration #22 (FK cascade fix) to production
- [ ] Verify RLS: log in as admin, manager, interviewer — each should see correct data scope
- [ ] Verify blind feedback: interviewer cannot see other interviewers' feedback
- [ ] Verify share links: expired link returns 404, revoked link returns 404
- [ ] Verify transcript privacy: no route returns raw transcript text to client
- [ ] Verify AI disclaimer: every AI-generated output shows the disclaimer
- [ ] Click through every page: Landing → Login → Playbooks → Discovery → Process → Alignment → Debrief
- [ ] Test empty states: new org with no playbooks, playbook with no stages, stage with no interviews
- [ ] Test error states: disconnect network during AI generation, submit invalid feedback
- [ ] Cross-browser: Chrome + Firefox + Safari + Edge (desktop only, 1024px min)

### Data Retention (1-Year Requirement)
This is a compliance requirement documented in the spec but has NO implementation yet.
- Needs: cron job or Supabase pg_cron to check `created_at` > 1 year
- Needs: auto-reachout email to candidate asking opt-in/out
- Needs: if no response, archive or delete data
- **Decision needed:** Build in Step 10.3 (bug fixes) or defer to post-MVP? Flag for client.

### Known Lint Debt
16 `no-explicit-any` errors in test files (mock builders use `any` by design). 8 `no-unused-vars` warnings. All pre-existing, none in production code. Don't waste time on these — they're test infrastructure.

---

## Micro Steps

### 10.1 — Platform Google Account Setup + OAuth

> **CRITICAL**: Google Drive + Meet is the core recording infrastructure.
> The AI pipeline depends on this. Not an export feature.
> See `docs/INTERVIEW_RECORDING_FLOW.md` for full architecture.
> See `docs/plans/2026-02-23-recording-pipeline-design.md` for revised design (state machine, VTT primary, manual synthesis).

**Owner:** Backend
**Supporting:** Security
**Status:** PENDING
**Branch:** `step10-1-google-platform-oauth`

**Allowed Paths:**
- `apps/web/src/app/api/google/**`
- `apps/web/src/lib/google/**`
- `supabase/migrations/` (migration #25)

**Architecture (Client Decision 2026-02-20, revised 2026-02-23):**
- **Shared Rec+onnect Google Workspace account** (platform-level, NOT per-org)
- **Business Standard tier** (minimum) — enables Meet auto-recording + auto-transcription
- **Admin setting:** "Meetings are recorded by default" + transcription enabled in Workspace admin console
- **All recordings → Rec+onnect's Drive** (`Meet Recordings/` folder, no moves for MVP — isolation via app-layer RLS)
- **Meet API** provides exact Drive file IDs for recording AND transcript retrieval (no filename guessing)
- **DB table:** `platform_google_config` (single-row, service_role only) — migration #19 deployed
- **PRIMARY transcript source:** Google Meet built-in transcription (VTT/SBV files, ~50KB). Whisper = fallback for manual uploads only.
- **Synthesis trigger:** MANUAL — admin/manager clicks button when all feedback is in. NOT auto-chained to transcription.

**Tasks:**
- [ ] Create migration #25: updated `recording_status` CHECK constraint + `pipeline_log JSONB[]` + `retry_count INTEGER`:
  ```sql
  -- States: scheduled, pending, uploaded, transcribing, transcribed, synthesizing, completed
  -- Failed: failed_recording, failed_download, failed_transcription, failed_synthesis, no_consent
  ALTER TABLE interviews ADD COLUMN IF NOT EXISTS pipeline_log JSONB[] DEFAULT '{}';
  ALTER TABLE interviews ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
  ```

- [ ] Set up Google Cloud project:
  - Enable Google Drive API + Google Calendar API + Google Meet REST API
  - Create OAuth 2.0 credentials for the Rec+onnect service account
  - Configure consent screen (internal — Workspace domain only)
  - Add authorized redirect URIs
  - Scopes: `drive.meet.readonly`, `calendar.events`, `meetings.space.readonly`

- [ ] Create Google client wrapper (`apps/web/src/lib/google/client.ts`):
  - Read tokens from `platform_google_config` (single row, service_role)
  - Auto-refresh 5 min before expiry (NOT on-demand — prevents race conditions)
  - Return authenticated google client
  - Log all token refresh events

- [ ] Create platform config management:
  - Internal admin route to store/refresh tokens in `platform_google_config`
  - Health check endpoint (`GET /api/google/health`) — cron every 15 min
  - Alert on 2 consecutive health check failures

- [ ] Create Google API helper modules (separate files for testability):
  - `apps/web/src/lib/google/calendar.ts` — `createMeetEvent(params)`: Calendar API create event with conferenceData + co-host
  - `apps/web/src/lib/google/meet.ts` — `getConferenceRecord(meetingCode)`: Meet API `conferenceRecords.list()` + `transcripts.list()` → transcript file ID
  - `apps/web/src/lib/google/drive.ts` — `downloadTranscriptFile(fileId)`: Drive API download VTT/SBV file
  - `apps/web/src/lib/google/vtt-parser.ts` — Parse VTT/SBV → plain text + segments array

**Security Checklist:**
- [ ] Tokens stored in `platform_google_config` (RLS enabled, NO policies = service_role only)
- [ ] Minimal scopes requested
- [ ] Token refresh 5 min before expiry, not on-demand
- [ ] No tokens exposed to client
- [ ] API calls always go through server-side routes
- [ ] Health check cron every 15 min

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
# Test: create Meet event, verify Meet link returned
# Test: health check endpoint returns valid token status
```

**Output:** Platform Google integration working (auth + Calendar + Meet + Drive APIs) + migration #25 deployed

---

### 10.2 — Interview Scheduling + Recording Pipeline (State Machine)

> Critical path: Meet auto-records → Drive → VTT transcript → manual synthesis trigger.
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
- `apps/web/src/lib/google/**`
- `apps/web/src/components/debrief/**`

**The Revised Recording Flow:**
```
1. User schedules interview in Rec+onnect
2. App creates Calendar event (Rec+onnect account = organizer)
   - Interviewer added as CO-HOST (triggers auto-record on join)
   - Candidate added as attendee
   - Auto-record = ON (Workspace admin default)
3. Meet link + meeting code stored on interviews row. Status = 'scheduled'
4. Interview happens → auto-recorded + auto-transcribed (Google Workspace)
5. Interview completed → status = 'pending'
6. Cron polls Meet API for transcript (NOT video) → gets VTT file ID
7. VTT downloaded + parsed → status = 'transcribed'
8. Admin clicks "Generate Synthesis" when feedback is ready → status = 'completed'
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
- [ ] Create interview scheduling API:
  - `POST /api/interviews` — Create interview + Meet event:
    - Auth check, validate candidate_id + stage_id
    - Call `createMeetEvent()` from 10.1 (adds interviewer as co-host)
    - Store `meet_link`, `meet_conference_id` on interview row
    - Set `recording_status = 'scheduled'`
    - Append to `pipeline_log`: `{ from: null, to: 'scheduled', ts, detail: 'interview created' }`
    - Send email notification to interviewer + candidate (Resend)
  - `PATCH /api/interviews/[id]` — Reschedule (update Calendar event)
  - `DELETE /api/interviews/[id]` — Cancel (delete Calendar event)

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

- [ ] Transcript retrieval (VTT — primary source):
  - `conferenceRecords.transcripts.list(parent="conferenceRecords/{id}")` → transcript file reference
  - Download VTT/SBV file from Drive (~50KB, not 100-300MB video)
  - Parse VTT to plain text + segments via `vtt-parser.ts`
  - Store in `interview_transcripts` table (service_role only)
  - **No ffmpeg, no Whisper, no large downloads for auto-recorded interviews**

- [ ] Manual synthesis trigger:
  - Button in Debrief UI: "Generate Synthesis" (visible when transcript OR feedback exists)
  - `POST /api/interviews/[id]/synthesis` — triggers `generateFeedbackSynthesis()` pipeline
  - Input: transcript (if available) + ALL feedback forms + candidate context
  - Sets `recording_status = 'synthesizing'` → `'completed'` on success
  - Manager/admin only (role check)

- [ ] Create interview scheduling UI:
  - ScheduleDialog component (date picker + time + interviewer select)
  - Shows generated Meet link after scheduling
  - Recording status indicator on interview cards (state machine states with icons)
  - "Retry" button on failed states (up to 3 retries)
  - Pipeline log viewer (expandable, shows state transitions)

- [ ] Consent gate (hard requirement):
  - Before any recording retrieval, verify `interviews.recording_consent_at IS NOT NULL`
  - If null when interview completes: skip recording pipeline, mark `no_consent`
  - Synthesis runs on feedback forms only (no transcript)
  - Interviewer sees "no recording consent" warning in UI pre-meeting

- [ ] Manual upload fallback (Whisper path):
  - Upload button on interview card (if auto-record failed or non-Meet interview)
  - Accepts audio file (max 100MB) → uploads to **Supabase Storage**
  - Whisper-1 API transcribes audio → stores in `interview_transcripts`
  - Same synthesis flow applies after transcription
  - Client-side + server-side file size validation

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
# Test: manual synthesis trigger works
# Test: consent gate blocks recording retrieval when null
# Test: retry budget enforced (max 3)
```

**Output:** Full recording pipeline with state machine, cron orchestration, manual synthesis trigger

---

### 10.3 — Bug Fixes & Optimization

**Owner:** Frontend + Backend
**Supporting:** QA
**Status:** PENDING
**Branch:** `step10-3-bugfixes-optimization`

**Tasks:**
- [ ] Review all reported issues
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
  - Safari (latest)
  - Edge (latest)

- [ ] Desktop layout verification (min 1024px)

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
  - [ ] RLS policies tested with multiple roles (233 DB tests — re-run after migration #22 deploy)
  - [ ] No sensitive data in client logs (grep for `console.log` in production code — should use `console.error` only)
  - [ ] Environment variables secured (check Vercel env config)
  - [ ] CORS configured correctly (Next.js default is same-origin — verify)
  - [ ] Rate limiting on AI endpoints (**NOT IMPLEMENTED** — add before beta. Options: Vercel rate limiting, or middleware-level IP limiting)
  - [ ] Input validation on all forms (all routes have Zod `.max()` — verified)
  - [ ] XSS prevention (React auto-escapes, `sanitizeInput()` on AI prompts — verified)
  - [ ] CSRF protection (Next.js API routes use SameSite cookies — verify)
  - [ ] Secure file upload (type/size validation on manual upload component — verify)
  - [ ] Audit logging for sensitive ops (**NOT IMPLEMENTED** — consider for admin actions: delete playbook, revoke invite, etc.)
  - [ ] `interviewer_id` always from auth, never from body (mutation test M12 verified)
  - [ ] Share link data scope minimal (verified — name, stage, questions, feedback form only)
  - [ ] Transcript never in client response (verified — service_role only access)

- [ ] EU AI Act compliance verification:
  - [ ] No emotion inference
  - [ ] No voice analysis
  - [ ] No biometric processing
  - [ ] Human review disclaimers present
  - [ ] Recording consent implemented

- [ ] GDPR compliance verification:
  - [ ] Data retention awareness
  - [ ] Erasure path exists
  - [ ] Data export capability

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
  - [ ] Production environment variables set in Vercel
  - [ ] Database migrations applied to production
  - [ ] DNS configured for domains
  - [ ] SSL certificates active
  - [ ] Error monitoring set up (Sentry or similar)
  - [ ] Analytics verified
  - [ ] Backup strategy confirmed

- [ ] Production URLs:
  - Landing: `https://[domain]`
  - App: `https://app.[domain]`

- [ ] Verify deployment:
  - All pages load
  - Auth works
  - AI endpoints respond
  - Database queries work

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
  - Client provides 5-10 beta testers
  - Create test accounts
  - Provide beta testing guide

- [ ] Test scenarios (critical path — must all pass):
  1. Create organization and invite team member
  2. Create complete playbook: wizard → Discovery (market research + strategy + JD) → Process (stages + questions + coverage) → Alignment (candidate profile + collaborators + share link) → Debrief
  3. Invite collaborator by email → verify magic link works → collaborator sees only assigned stage data
  4. Schedule interview via Meet → verify Meet link + calendar event created
  5. Record interview (auto-record) → verify recording retrieval → verify transcription
  6. Submit feedback as interviewer → verify blind rules (can't see others' feedback)
  7. Submit feedback as second interviewer → manager sees all feedback
  8. Generate AI synthesis → verify disclaimer shows → verify no hire/no-hire recommendation
  9. Share playbook via link → verify limited data scope → verify expired link blocked
  10. Verify consent flow: candidate declines → no recording → feedback-only synthesis

- [ ] Edge case scenarios (should not crash):
  1. Delete a stage that has interviews → interviews should have `stage_id = NULL` (migration #22)
  2. Very long text in all fields (test with 5000-char notes)
  3. Generate AI insights with minimal data (1 feedback, no transcript)
  4. Revoke share link → verify immediate access loss
  5. Expired collaborator invite → verify rejection

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
  - Feature walkthrough
  - FAQ

- [ ] Create admin documentation:
  - User management
  - Organization settings
  - Integration setup (Google Drive)

- [ ] Create technical documentation:
  - Architecture overview
  - Environment variables reference
  - Database schema
  - API endpoints

- [ ] Create runbooks:
  - Deployment process
  - Rollback procedure
  - Common issues and fixes

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
  - Answer questions

- [ ] Transfer ownership:
  - [ ] Vercel project ownership
  - [ ] Supabase project access
  - [ ] GitHub repository (if applicable)
  - [ ] Environment variables documentation
  - [ ] API keys and credentials

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
| 10.1 Platform Google Setup | Backend | PENDING | step10-1-google-platform-oauth |
| 10.2 Recording Pipeline | Backend | PENDING | step10-2-recording-pipeline |
| 10.3 Bug Fixes | Frontend + Backend | PENDING | step10-3-bugfixes-optimization |
| 10.4 Security Audit | Security | PENDING | step10-4-security-audit |
| 10.5 Production Deploy | DevOps | PENDING | step10-5-production-deploy |
| 10.6 Beta Testing | QA | PENDING | step10-6-beta-testing |
| 10.7 Documentation | Architect | PENDING | step10-7-documentation |
| 10.8 Handover | Architect | PENDING | N/A |

---

## Dependencies

- **Blocks:** None (final step)
- **Blocked By:** Step 9 (Alignment + Debrief)

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
