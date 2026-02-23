# Recording Pipeline Design — Revised Architecture

**Date:** 2026-02-23
**Status:** APPROVED — ready for implementation
**Supersedes:** Original Step 10.1-10.2 spec in `steps/step-10-integrations-delivery.md`

---

## Summary

Redesigned the interview recording pipeline based on vulnerability analysis. Three major changes from the original spec:

1. **Google Meet transcript as PRIMARY** — not Whisper for auto-recordings
2. **Manual synthesis trigger** — decoupled from transcription (feedback arrives hours/days later)
3. **State machine with audit log** — replaces simple status field

---

## Vulnerability Map

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | Google token refresh fails silently | HIGH | Health check cron (every 15 min). Alert on 2 consecutive failures. Token refresh 5 min before expiry, not on-demand. |
| 2 | Meet API returns no conferenceRecord | HIGH | Polling with exponential backoff (5→10→20→40 min). Max 2 hours. Then mark `failed_recording` with "no conference record found". |
| 3 | Recording not ready (Google processing delay) | MEDIUM | Polling handles this naturally. Google processing ≈ 1x meeting duration. Max 2hr window covers meetings up to ~90 min. |
| 4 | Consent not captured before interview | HIGH | Hard gate: if `recording_consent_at IS NULL` at `completed_at`, skip entire recording pipeline, set `no_consent`. Interviewer warned in UI pre-meeting. |
| 5 | Meet auto-record fires despite no consent | HIGH | Documented liability (can't disable per-meeting via API). Interviewer training: stop recording manually. If recording created without consent: delete from Drive + log incident. |
| 6 | Duplicate cron processing | MEDIUM | Optimistic locking: `UPDATE interviews SET recording_status='transcribing' WHERE recording_status='uploaded' AND id=$1 RETURNING id`. If 0 rows returned, another worker got it. |
| 7 | Cron timeout on Vercel | HIGH | Vercel Pro = 300s max function duration. VTT transcript download < 5s. Synthesis (Claude) = 15-60s. Each cron step stays under 60s individually. State machine means each step is its own function call. |
| 8 | VTT parse failure (malformed transcript) | MEDIUM | Validate VTT structure before storing. If parse fails, mark `failed_transcription` with error detail. Manual upload fallback available. |
| 9 | Drive file not accessible (permissions, deleted) | MEDIUM | Check Drive API error code. 404 = file deleted → `failed_recording`. 403 = permissions → log + alert admin. |
| 10 | Synthesis token overflow (very long interview) | LOW | `truncateTranscript()` already handles 150K soft limit with 60/30 head/tail split. Surface `transcript_truncated: boolean` in response metadata. |
| 11 | Network failure during cron step | MEDIUM | State machine + retry budget (max 3). Each failed attempt logged in `pipeline_log`. After max retries → terminal failed state. |
| 12 | Manual upload file too large | LOW | Client-side validation: max 100MB audio, max 500MB video. Server-side: reject > 500MB. Supabase Storage bucket policy enforces limit. |

---

## State Machine

```
                            ┌─────────────┐
                            │  scheduled   │ ← interview created
                            └──────┬──────┘
                                   │ interview completed_at set
                            ┌──────▼──────┐
                     ┌──────│   pending    │──────┐
                     │      └──────┬──────┘      │
                     │             │              │
              no consent     consent OK     Meet API: no recording
                     │             │              │
              ┌──────▼──────┐ ┌───▼────────┐ ┌──▼──────────────┐
              │ no_consent  │ │  uploaded   │ │ failed_recording │
              └─────────────┘ └───┬────────┘ └─────────────────┘
                                  │
                           VTT download + parse
                                  │
                           ┌──────▼──────┐     ┌─────────────────────┐
                           │ transcribed  │────▶│ failed_transcription │
                           └──────┬──────┘     └─────────────────────┘
                                  │
                           MANUAL TRIGGER
                           (admin clicks "Generate Synthesis")
                                  │
                           ┌──────▼──────┐     ┌──────────────────┐
                           │ synthesizing │────▶│ failed_synthesis  │
                           └──────┬──────┘     └──────────────────┘
                                  │
                           ┌──────▼──────┐
                           │  completed   │
                           └─────────────┘
```

**Key transitions:**
- `scheduled → pending`: Automatic when `completed_at` is set (interview ended)
- `pending → uploaded`: Cron polls Meet API, finds conference record + transcript file
- `pending → no_consent`: `recording_consent_at IS NULL` check
- `pending → failed_recording`: 2hr polling window exhausted with no recording
- `uploaded → transcribed`: VTT file downloaded from Drive and parsed
- `uploaded → failed_transcription`: VTT parse fails or Drive access error
- `transcribed → synthesizing → completed`: **Manual trigger only** — admin/manager clicks button when all feedback is submitted
- Any failed state: retryable up to 3 times via "Retry" button in UI

---

## Primary Transcript Source: Google Meet Transcript

**Decision:** Use Google Workspace's built-in Meet transcription (VTT/SBV files) as the primary transcript source. Whisper is fallback for manual audio uploads only.

**Rationale:**
- Meet recordings are MP4 video (100-300MB for a 1hr meeting)
- Whisper API limit is 25MB
- Original spec required ffmpeg MP4→audio extraction on Vercel (serverless = no ffmpeg)
- Google Meet auto-generates transcripts as `.vtt` or `.sbv` files (~50KB)
- Available via same `conferenceRecords.recordings.list()` → `driveDestination.file` path (transcript artifacts)
- Eliminates: ffmpeg dependency, large file download, Whisper API cost, 25MB limit risk

**Meet transcript artifacts:**
- Available via `conferenceRecords.transcripts.list(parent="conferenceRecords/{id}")`
- Returns `docsDestination.document` (Google Doc ID) or export as VTT
- Need to verify exact API response format during implementation

**Whisper retained for:**
- Manual audio uploads (interviewer records outside Meet)
- Fallback if Meet transcript is empty or unavailable

---

## Manual Synthesis Trigger

**Decision:** Synthesis is NOT chained to transcription. It's a manual action.

**Rationale:**
- Feedback forms arrive hours or days after the interview
- Auto-triggering synthesis immediately after transcription would miss all feedback
- Manager/admin clicks "Generate Synthesis" in the Debrief panel when ready
- Button visible only when: transcript exists OR at least 1 feedback submitted
- Button disabled with tooltip if neither condition met

**Synthesis input:**
- Transcript (if available) — from `interview_transcripts`
- ALL feedback forms for that interview — from `interview_feedback`
- Candidate context (name, role, stage)
- Existing pipeline: `generateFeedbackSynthesis()` in `@reconnect/ai`

---

## Optimistic Locking (Cron Deduplication)

```sql
-- Each cron worker atomically claims a row
UPDATE interviews
SET recording_status = 'transcribing',
    updated_at = now()
WHERE id = $1
  AND recording_status = 'uploaded'
RETURNING id;

-- If 0 rows returned → another worker already claimed it → skip
```

This prevents double-processing when cron overlaps with manual retry.

---

## Pipeline Audit Log

Every state transition is appended to `pipeline_log JSONB[]` on the interview row:

```json
[
  { "from": "scheduled", "to": "pending", "ts": "2026-02-23T10:00:00Z", "detail": "interview completed" },
  { "from": "pending", "to": "uploaded", "ts": "2026-02-23T10:35:00Z", "detail": "conference_record=xyz, transcript_file=abc" },
  { "from": "uploaded", "to": "transcribed", "ts": "2026-02-23T10:35:05Z", "detail": "vtt_parsed, segments=142, duration_seconds=3420" },
  { "from": "transcribed", "to": "synthesizing", "ts": "2026-02-24T16:00:00Z", "detail": "manual_trigger, feedback_count=3" },
  { "from": "synthesizing", "to": "completed", "ts": "2026-02-24T16:00:47Z", "detail": "synthesis_id=def, tokens=12500" }
]
```

---

## Retry Budget

- `retry_count INTEGER DEFAULT 0` on interview row
- Max 3 retries per failed state
- After 3 failures: terminal state, manual intervention required
- Each retry resets `recording_status` to the previous retriable state
- Retry button visible to admin/manager in Debrief UI

---

## Migration #25: Recording Status Update

```sql
-- Update CHECK constraint on interviews.recording_status
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_recording_status_check;
ALTER TABLE interviews ADD CONSTRAINT interviews_recording_status_check
  CHECK (recording_status IN (
    'scheduled', 'pending', 'uploaded', 'transcribing', 'transcribed',
    'synthesizing', 'completed',
    'failed_recording', 'failed_download', 'failed_transcription', 'failed_synthesis',
    'no_consent'
  ));

-- Add pipeline_log and retry_count columns
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS pipeline_log JSONB[] DEFAULT '{}';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
```

---

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `supabase/migrations/20260223_recording_status_states.sql` | Migration #25: updated CHECK constraint + pipeline_log + retry_count |
| `apps/web/src/lib/google/client.ts` | Google API client wrapper (OAuth, token refresh) |
| `apps/web/src/lib/google/meet.ts` | Meet API helpers (conference records, transcript retrieval) |
| `apps/web/src/lib/google/calendar.ts` | Calendar API helpers (event creation, co-host, Meet link) |
| `apps/web/src/lib/google/drive.ts` | Drive API helpers (VTT file download) |
| `apps/web/src/lib/google/vtt-parser.ts` | VTT/SBV transcript parser → plain text + segments |
| `apps/web/src/app/api/interviews/route.ts` | POST: create interview + Meet event. Existing file, add scheduling logic. |
| `apps/web/src/app/api/interviews/[id]/route.ts` | PATCH: reschedule. DELETE: cancel. Existing file. |
| `apps/web/src/app/api/cron/recording-pipeline/route.ts` | Vercel Cron endpoint: polls pending interviews, advances state machine |
| `apps/web/src/app/api/google/health/route.ts` | Google connection health check |
| `apps/web/src/components/debrief/interview-card.tsx` | Recording status display + retry button (existing, modify) |
| `apps/web/src/components/debrief/schedule-dialog.tsx` | Interview scheduling UI (new) |

---

## Guardrails Table

| Guardrail | Implementation |
|-----------|----------------|
| Consent hard gate | `WHERE recording_consent_at IS NOT NULL` before any recording retrieval |
| Token expiry prevention | Refresh 5 min before expiry, not on-demand. Health cron every 15 min. |
| State machine integrity | CHECK constraint on `recording_status`. Optimistic locking on transitions. |
| Retry budget | `retry_count <= 3` enforced in cron. Terminal state after max retries. |
| Audit trail | Every transition appended to `pipeline_log JSONB[]`. |
| Cron deduplication | `UPDATE ... WHERE status='X' RETURNING id` — atomic claim. |
| File size limits | Manual upload: 100MB audio, 500MB video. Supabase Storage bucket policy. |
| Transcript privacy | `interview_transcripts` table: RLS enabled, NO policies = service_role only. |
| No-consent recording deletion | If recording created without consent: Drive API delete + incident log. |
| Vercel timeout safety | Each cron step < 60s. State machine means no single function does the whole pipeline. |

---

## Implementation Order

1. Migration #25 (recording_status states + pipeline_log + retry_count)
2. Google client wrapper + token management (10.1)
3. Calendar event creation + Meet link (10.1)
4. Meet API: conference record + transcript discovery (10.2)
5. VTT parser (10.2)
6. Drive VTT download (10.2)
7. Cron endpoint: state machine orchestrator (10.2)
8. UI: schedule dialog + recording status + retry button (10.2)
9. Manual upload fallback (10.2 — Whisper path)
10. End-to-end test with real Google Workspace account

Each step verified independently before connecting to the next. No big-bang integration.

---

## Open Questions (Resolve During Implementation)

1. **Meet transcript API exact format** — Need to verify `conferenceRecords.transcripts.list()` response shape and whether it returns VTT directly or a Google Doc reference
2. **Vercel Cron configuration** — `vercel.json` cron schedule syntax, authentication of cron endpoints
3. **Google Workspace auto-transcript setting** — Verify if transcription is enabled by default on Business Standard or needs admin toggle
4. **VTT vs SBV format** — Google may return either. Parser should handle both.
