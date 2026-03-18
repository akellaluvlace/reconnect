# Step 10.2 Manual Testing Checklist

**Date:** 2026-03-11
**Scope:** Recording Pipeline + Feedback Submission + Security Hardening
**Pre-requisites:** Dev server running (`pnpm dev`), logged in as admin at `app.axil.ie` (or localhost:3000), Supabase dashboard open.

---

## Phase 1: Database Verification (no external APIs needed)

Run these in Supabase SQL Editor or `psql`.

### 1.1 Migration #30 columns exist

```sql
-- Should return calendar_event_id, transcript_doc_id (from migration #30)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'interviews'
  AND column_name IN ('calendar_event_id', 'transcript_doc_id', 'recording_status',
                      'meet_conference_id', 'pipeline_log', 'retry_count', 'meet_link');
```

Expected: 7 rows. `recording_status` = TEXT, `pipeline_log` = ARRAY (jsonb[]), `retry_count` = INTEGER default 0.

- [ ] All 7 columns present

### 1.2 feedback.collaborator_id column

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'feedback' AND column_name = 'collaborator_id';
```

Expected: UUID, nullable.

- [ ] `collaborator_id` column exists with UUID type

### 1.3 platform_google_config.interview_calendar_id

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'platform_google_config' AND column_name = 'interview_calendar_id';
```

- [ ] `interview_calendar_id` column exists with TEXT type

### 1.4 interview_transcripts table

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'interview_transcripts'
ORDER BY ordinal_position;
```

Expected: `id`, `interview_id`, `transcript`, `metadata`, `created_at`. Unique constraint on `interview_id`.

```sql
-- Verify unique constraint
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'interview_transcripts' AND constraint_type = 'UNIQUE';
```

- [ ] Table exists with correct schema
- [ ] Unique constraint on `interview_id`

### 1.5 recording_status CHECK constraint

```sql
-- Try inserting an invalid status — should fail
INSERT INTO interviews (candidate_id, status, recording_status)
VALUES ('00000000-0000-0000-0000-000000000000', 'scheduled', 'INVALID_STATUS');
-- Expected: CHECK constraint violation
```

Valid states: `scheduled`, `pending`, `uploaded`, `transcribed`, `synthesizing`, `completed`, `failed_recording`, `failed_download`, `failed_transcription`, `failed_synthesis`, `no_consent`

- [ ] Invalid status rejected by CHECK constraint

### 1.6 RLS smoke test (IDOR protection)

Log in as admin of Org A. Get an interview ID from Org B (if multi-org data exists).

```bash
# From browser console or curl — should return 404, not the interview data
fetch('/api/interviews/OTHER_ORG_INTERVIEW_ID', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scheduled_at: '2026-04-01T10:00:00Z' })
}).then(r => console.log(r.status));
```

- [ ] Returns 404 (not 200 or 403) for cross-org interview

---

## Phase 2: Interview Scheduling (needs Google APIs)

### 2.1 Schedule interview — happy path

From the Debrief tab (or curl):

```bash
# Replace $TOKEN with your auth cookie/token
curl -X POST http://localhost:3000/api/interviews \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{
    "candidate_id": "REAL_CANDIDATE_UUID",
    "stage_id": "REAL_STAGE_UUID",
    "interviewer_email": "rcoffey@axil.ie",
    "scheduled_at": "2026-04-01T10:00:00Z",
    "duration_minutes": 60
  }'
```

Check response:

- [ ] Status 201
- [ ] `data.meet_link` is a valid `https://meet.google.com/...` URL
- [ ] `data.calendar_event_id` is populated
- [ ] `data.meet_conference_id` is populated
- [ ] `data.recording_status` = `"scheduled"`
- [ ] `data.status` = `"scheduled"`

Check Google Calendar:

- [ ] Event appears in "Axil Interviews" secondary calendar (not primary)
- [ ] Consent notice in event description: "This interview will be recorded..."
- [ ] Interviewer listed as attendee
- [ ] Meet link attached to the event

Check DB:

```sql
SELECT id, calendar_event_id, meet_link, meet_conference_id, recording_status, pipeline_log
FROM interviews WHERE id = 'INTERVIEW_ID';
```

- [ ] `pipeline_log` has 1 entry with `{from: null, to: "scheduled"}`

### 2.2 Reschedule (PATCH)

```bash
curl -X PATCH http://localhost:3000/api/interviews/INTERVIEW_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{"scheduled_at": "2026-04-02T14:00:00Z"}'
```

- [ ] Status 200
- [ ] Calendar event time updated (check Google Calendar UI)
- [ ] `pipeline_log` now has 2 entries (original + reschedule trace)
- [ ] Attendees should receive updated invite email

### 2.3 Reschedule — no calendar configured (503)

```sql
-- Temporarily clear interview_calendar_id
UPDATE platform_google_config SET interview_calendar_id = NULL;
```

```bash
curl -X PATCH http://localhost:3000/api/interviews/INTERVIEW_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{"scheduled_at": "2026-04-03T14:00:00Z"}'
```

- [ ] Status 503
- [ ] Error: "Google Calendar integration not configured"

```sql
-- Restore it
UPDATE platform_google_config SET interview_calendar_id = 'ORIGINAL_VALUE';
```

### 2.4 Cancel (DELETE)

```bash
curl -X DELETE http://localhost:3000/api/interviews/INTERVIEW_ID \
  -H "Cookie: $AUTH_COOKIE"
```

- [ ] Status 200, `{ "success": true }`
- [ ] Calendar event removed from Google Calendar
- [ ] Interview `status` = `"cancelled"` in DB
- [ ] `pipeline_log` has cancellation entry with `{to: "cancelled"}`
- [ ] Attendees receive cancellation email

### 2.5 No-consent

Create a new scheduled interview first (2.1 again), then:

```bash
curl -X POST http://localhost:3000/api/interviews/INTERVIEW_ID/no-consent \
  -H "Cookie: $AUTH_COOKIE"
```

- [ ] Status 200
- [ ] `recording_status` = `"no_consent"` in DB
- [ ] `pipeline_log` has entry with `{to: "no_consent"}`

### 2.6 No-consent — invalid state

Try no-consent on the already-cancelled interview from 2.4:

```bash
curl -X POST http://localhost:3000/api/interviews/CANCELLED_INTERVIEW_ID/no-consent \
  -H "Cookie: $AUTH_COOKIE"
```

- [ ] Status 404 (optimistic lock prevents transition from `cancelled`)

---

## Phase 3: Cron Recording Pipeline

### 3.1 Simulated Phase 1 — detect completed interviews

Create a test interview with `scheduled_at` in the past:

```sql
-- Option A: manually insert
INSERT INTO interviews (candidate_id, stage_id, status, recording_status, scheduled_at, meet_link, meet_conference_id, pipeline_log, retry_count)
VALUES (
  'REAL_CANDIDATE_UUID',
  'REAL_STAGE_UUID',
  'scheduled',
  'scheduled',
  NOW() - INTERVAL '45 minutes',
  'https://meet.google.com/test-code',
  'test-code',
  '{}',
  0
)
RETURNING id;

-- Option B: PATCH an existing interview's scheduled_at to 45 min ago
UPDATE interviews SET scheduled_at = NOW() - INTERVAL '45 minutes'
WHERE id = 'EXISTING_INTERVIEW_ID' AND recording_status = 'scheduled';
```

Hit the cron endpoint:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/recording-pipeline
```

- [ ] Status 200
- [ ] `stats.phase1` >= 1 (interview transitioned)
- [ ] Interview `recording_status` = `"pending"` in DB
- [ ] `pipeline_log` has entry `{from: "scheduled", to: "pending"}`

### 3.2 Simulated Phase 2 — no conference record (retry)

Hit cron again (the interview is now `pending` but no real Meet conference exists):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/recording-pipeline
```

- [ ] `retry_count` incremented to 1 in DB
- [ ] `pipeline_log` has retry entry: "No conference record yet, retry 1/3"
- [ ] Interview stays in `pending` state

### 3.3 Simulated Phase 3 — exhausted retries

Fast-forward retries:

```sql
UPDATE interviews SET retry_count = 3
WHERE id = 'TEST_INTERVIEW_ID' AND recording_status = 'pending';
```

Hit cron:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/recording-pipeline
```

- [ ] Interview `recording_status` = `"failed_transcription"` in DB
- [ ] `stats.failed` >= 1 in response
- [ ] `pipeline_log` has "Max retries (3) exhausted" entry

### 3.4 Cron auth — invalid secret

```bash
curl -H "Authorization: Bearer wrong-secret" \
  http://localhost:3000/api/cron/recording-pipeline
```

- [ ] Status 401

```bash
# No auth header at all
curl http://localhost:3000/api/cron/recording-pipeline
```

- [ ] Status 401

### 3.5 Cron — Google env not configured

Temporarily unset `GOOGLE_RECORDING_CLIENT_ID` env var and restart dev server, then hit cron:

- [ ] Status 503, error: "Google Recording not configured"

(Restore env var after.)

---

## Phase 4: Manual Upload (Whisper)

### 4.1 Happy path — small audio file

Prepare a small .mp3 or .wav file (< 25MB). Create or use an existing interview in `scheduled` state.

```bash
curl -X POST http://localhost:3000/api/transcription/upload \
  -H "Cookie: $AUTH_COOKIE" \
  -F "interview_id=INTERVIEW_ID" \
  -F "file=@/path/to/test-audio.mp3"
```

- [ ] Status 200 (if OPENAI_API_KEY set)
- [ ] Response has `transcript_length` and `duration`
- [ ] Interview `recording_status` = `"transcribed"` in DB
- [ ] `interview_transcripts` row created with `metadata.source = "whisper"`
- [ ] `pipeline_log` has 2 entries: `uploaded` and `transcribed`

### 4.2 No Whisper API key

Temporarily unset `OPENAI_API_KEY`, restart dev server:

```bash
curl -X POST http://localhost:3000/api/transcription/upload \
  -H "Cookie: $AUTH_COOKIE" \
  -F "interview_id=INTERVIEW_ID" \
  -F "file=@/path/to/test-audio.mp3"
```

- [ ] Status 503, error: "Whisper API not configured"
- [ ] Interview `recording_status` = `"uploaded"` (file stored but not transcribed)

### 4.3 File too large

```bash
# Create a dummy 101MB file
dd if=/dev/zero of=/tmp/big-file.mp3 bs=1M count=101 2>/dev/null

curl -X POST http://localhost:3000/api/transcription/upload \
  -H "Cookie: $AUTH_COOKIE" \
  -F "interview_id=INTERVIEW_ID" \
  -F "file=@/tmp/big-file.mp3;type=audio/mpeg"
```

- [ ] Status 400, error: "File too large (max 100MB)"

### 4.4 Wrong file type

```bash
curl -X POST http://localhost:3000/api/transcription/upload \
  -H "Cookie: $AUTH_COOKIE" \
  -F "interview_id=INTERVIEW_ID" \
  -F "file=@/path/to/document.pdf;type=application/pdf"
```

- [ ] Status 400, error: "Unsupported file type"

### 4.5 Invalid interview_id

```bash
curl -X POST http://localhost:3000/api/transcription/upload \
  -H "Cookie: $AUTH_COOKIE" \
  -F "interview_id=not-a-uuid" \
  -F "file=@/path/to/test-audio.mp3"
```

- [ ] Status 400, error: "Invalid interview_id"

---

## Phase 5: Collaborator Feedback

### 5.1 Setup — get a valid collaborator token

```sql
SELECT invite_token, id, email, playbook_id, assigned_stages, expires_at
FROM collaborators
WHERE expires_at > NOW()
LIMIT 1;
```

Get an interview for the collaborator's playbook:

```sql
SELECT i.id AS interview_id, i.stage_id, s.playbook_id
FROM interviews i
JOIN interview_stages s ON i.stage_id = s.id
WHERE s.playbook_id = 'COLLABORATOR_PLAYBOOK_ID'
  AND i.status = 'scheduled'
LIMIT 1;
```

### 5.2 Feedback page renders

Open in browser (incognito — no auth session):

```
http://localhost:3000/auth/collaborator/feedback?token=TOKEN_HERE&interview_id=INTERVIEW_ID
```

- [ ] Page loads without auth redirect
- [ ] Shows stage name and playbook title
- [ ] Focus areas listed from the stage
- [ ] Rating scale 1-4 (not 1-5)
- [ ] "All focus areas discussed" confirmation checkbox present

### 5.3 Submit feedback — happy path

Fill in all fields and submit:

- [ ] Status 201 on API response
- [ ] Success message shown in UI
- [ ] Feedback row in DB with `collaborator_id` set:

```sql
SELECT id, interview_id, collaborator_id, ratings, pros, cons, focus_areas_confirmed
FROM feedback
WHERE interview_id = 'INTERVIEW_ID' AND collaborator_id = 'COLLABORATOR_ID';
```

- [ ] `collaborator_id` matches the collaborator
- [ ] `ratings` has score 1-4 per category
- [ ] `focus_areas_confirmed` = true

### 5.4 Duplicate submission blocked

Revisit the same URL after submitting:

```
http://localhost:3000/auth/collaborator/feedback?token=TOKEN&interview_id=INTERVIEW_ID
```

- [ ] Shows "Feedback Already Submitted" card (not the form)

Submit via curl to verify API-level block:

```bash
curl -X POST http://localhost:3000/api/feedback/collaborator \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_HERE",
    "interview_id": "INTERVIEW_ID",
    "ratings": [{"category": "Technical Skills", "score": 3}],
    "pros": ["Good communicator"],
    "cons": ["Needs more experience"],
    "focus_areas_confirmed": true
  }'
```

- [ ] Status 409, error: "You have already submitted feedback"

### 5.5 Expired token

```sql
-- Set expiry to past
UPDATE collaborators SET expires_at = '2025-01-01'
WHERE invite_token = 'TOKEN_HERE';
```

Visit the page:

- [ ] Shows "Invitation Expired" card

API call:

- [ ] Status 404, error: "Token expired"

```sql
-- Restore expiry
UPDATE collaborators SET expires_at = '2027-01-01'
WHERE invite_token = 'TOKEN_HERE';
```

### 5.6 Wrong stage / cross-playbook access

Get an interview from a DIFFERENT playbook:

```sql
SELECT i.id FROM interviews i
JOIN interview_stages s ON i.stage_id = s.id
WHERE s.playbook_id != 'COLLABORATOR_PLAYBOOK_ID'
LIMIT 1;
```

```bash
curl -X POST http://localhost:3000/api/feedback/collaborator \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_HERE",
    "interview_id": "WRONG_PLAYBOOK_INTERVIEW_ID",
    "ratings": [{"category": "X", "score": 3}],
    "pros": ["X"],
    "cons": ["Y"],
    "focus_areas_confirmed": true
  }'
```

- [ ] Status 403, error: "Interview does not belong to your assigned playbook"

### 5.7 Invalid token

```bash
curl -X POST http://localhost:3000/api/feedback/collaborator \
  -H "Content-Type: application/json" \
  -d '{
    "token": "totally-fake-token",
    "interview_id": "INTERVIEW_ID",
    "ratings": [{"category": "X", "score": 3}],
    "pros": ["X"],
    "cons": ["Y"],
    "focus_areas_confirmed": true
  }'
```

- [ ] Status 404, error: "Invalid token"

---

## Phase 6: Real End-to-End Recording (optional, 20 min)

This tests the full pipeline: schedule → Meet call → auto-record → cron fetches transcript.

### 6.1 Setup

1. Schedule an interview via API (Phase 2.1) with `scheduled_at` = 5 minutes from now
2. Note the `meet_link` from the response

### 6.2 Conduct the meeting

1. Open `meet_link` in Chrome (logged in as rcoffey@axil.ie)
2. Open `meet_link` in incognito/different browser (as "candidate")
3. Talk for 1-2 minutes — recording should auto-start (banner visible)
4. End the meeting from both sides

### 6.3 Wait for Google processing

Google takes 3-10 minutes to generate the transcript doc and conference record. Wait 5 minutes.

### 6.4 Trigger cron

First, backdate the interview so Phase 1 fires:

```sql
UPDATE interviews SET scheduled_at = NOW() - INTERVAL '45 minutes'
WHERE id = 'INTERVIEW_ID';
```

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/recording-pipeline
```

- [ ] Phase 1: `recording_status` → `pending`

Wait 1 minute, hit cron again:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/recording-pipeline
```

- [ ] Phase 2: Conference record found
- [ ] Transcript retrieved (Google Docs export or Meet API entries)
- [ ] `recording_status` → `transcribed`
- [ ] `interview_transcripts` row created
- [ ] Transcript content is readable and matches conversation

```sql
SELECT transcript, metadata FROM interview_transcripts
WHERE interview_id = 'INTERVIEW_ID';
```

- [ ] `metadata.source` = `"google_docs"` or `"meet_api_entries"`
- [ ] `metadata.char_count` > 0
- [ ] Transcript text is coherent

---

## Phase 7: UI Components (browser testing)

### 7.1 Schedule Interview Dialog

Navigate to Debrief tab for a playbook with candidates:

- [ ] "Schedule Interview" button visible for admin/manager
- [ ] Dialog opens with candidate, stage, interviewer, date/time fields
- [ ] Calendar picker works, time picker works
- [ ] Duration dropdown: 15, 30, 45, 60, 90, 120 min options
- [ ] Submit creates interview and shows Meet link

### 7.2 Interview Card

On Debrief page, with scheduled interviews:

- [ ] Cards show interview status badge (scheduled/pending/transcribed/etc)
- [ ] Meet link displayed and clickable
- [ ] Reschedule button works (opens dialog, updates time)
- [ ] Cancel button works (confirms, deletes calendar event)
- [ ] "Mark No Consent" button visible and functional
- [ ] Manual Upload button visible for appropriate states

### 7.3 Pipeline Log Viewer

Click on an interview with pipeline_log entries:

- [ ] Log entries displayed chronologically
- [ ] Each entry shows: timestamp, from → to state, detail text
- [ ] Empty state message when no log entries

### 7.4 Manual Upload Component

Click "Upload Recording" on an interview card:

- [ ] File picker accepts audio/video types
- [ ] Shows file size and name after selection
- [ ] Upload progress indicator
- [ ] Success/error feedback after upload
- [ ] Rejects files > 100MB with clear error

---

## Cleanup After Testing

```sql
-- Remove test interviews (use with care)
DELETE FROM interview_transcripts WHERE interview_id IN (SELECT id FROM interviews WHERE meet_link LIKE '%test%');
DELETE FROM feedback WHERE interview_id IN (SELECT id FROM interviews WHERE meet_link LIKE '%test%');
DELETE FROM interviews WHERE meet_link LIKE '%test%';

-- Restore any modified collaborator expiry dates
-- UPDATE collaborators SET expires_at = '2027-01-01' WHERE ...;

-- Ensure platform_google_config.interview_calendar_id is restored if cleared in 2.3
```

---

## Phase 0: Pre-Testing Verification

Run these BEFORE starting any other phase.

### 0.1 Google OAuth tokens — correct client ID

The recording pipeline uses the **new** Google Cloud project ("Axil Recording", client ID `954767992422-...`). If `platform_google_config` still has tokens from the old client (`635645976716-...`), all Google API calls will fail.

```sql
SELECT id, google_access_token IS NOT NULL AS has_access_token,
       google_refresh_token IS NOT NULL AS has_refresh_token,
       google_token_expiry
FROM platform_google_config
LIMIT 1;
```

- [ ] Row exists with `has_access_token = true` and `has_refresh_token = true`

Verify the tokens were issued for the correct client:

```bash
# Decode the access token (if it's a JWT) or test it directly
curl -H "Authorization: Bearer ACCESS_TOKEN_HERE" \
  "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1"
```

- [ ] Returns 200 (tokens are valid and from the correct project)

**If tokens are from old client or expired:** Re-run the OAuth flow by visiting:
```
http://localhost:3000/api/google/callback
```
This will redirect to Google consent, issue new tokens for client `954767992422-...`, and persist them.

### 0.2 Supabase Storage bucket — `recordings`

The manual upload route stores audio files in a `recordings` bucket. Verify it exists.

1. Open Supabase Dashboard → Storage
2. Check for a bucket named `recordings`

- [ ] `recordings` bucket exists

**If missing:** Create it in Supabase Dashboard → Storage → "New bucket":
- Name: `recordings`
- Public: **No** (private)
- File size limit: 100MB
- Allowed MIME types: `audio/*,video/*`

Or via SQL:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recordings', 'recordings', false, 104857600, ARRAY['audio/*', 'video/*']);
```

- [ ] Bucket created and accessible

---

## Pass/Fail Summary

| Phase | Tests | Passed | Notes |
|-------|-------|--------|-------|
| 0. Pre-Testing | 3 | | |
| 1. Database | 6 | | |
| 2. Scheduling | 6 | | |
| 3. Cron Pipeline | 5 | | |
| 4. Manual Upload | 5 | | |
| 5. Collaborator Feedback | 7 | | |
| 6. E2E Recording | 4 | | |
| 7. UI Components | 4 | | |
| **Total** | **40** | | |
