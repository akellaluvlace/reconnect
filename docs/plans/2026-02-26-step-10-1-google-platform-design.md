# Step 10.1 — Platform Google Setup + Migration #25

**Date:** 2026-02-26
**Status:** APPROVED
**Builds on:** `docs/plans/2026-02-23-recording-pipeline-design.md`

## Summary

Platform-level Google integration: OAuth token management, Calendar/Meet/Drive API helpers, VTT parser, and migration #25 (11-state recording state machine + audit log columns).

## Decision: Drop `uploading` state, unify state machine

Old DB had 7 states including `uploading` (manual file upload intermediate). Replaced with unified 11-state machine — manual uploads go straight to `uploaded`. Cleaner, one state machine for both paths.

## Decision: No `googleapis` SDK

Use raw `fetch()` against Google REST APIs. Avoids the heavy `googleapis` npm package (~80MB). We only call 4 endpoints total — Calendar create event, Meet list conference records, Meet list transcripts, Drive download file.

## Migration #25

```sql
-- Migrate existing data before constraint change
UPDATE interviews SET recording_status = 'failed_recording'
  WHERE recording_status = 'failed';
UPDATE interviews SET recording_status = 'uploaded'
  WHERE recording_status = 'uploading';

-- Drop old CHECK, add 11-state machine
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_recording_status_check;
ALTER TABLE interviews ADD CONSTRAINT interviews_recording_status_check
  CHECK (recording_status IN (
    'scheduled', 'pending', 'uploaded', 'transcribed',
    'synthesizing', 'completed',
    'failed_recording', 'failed_download', 'failed_transcription', 'failed_synthesis',
    'no_consent'
  ));

-- Audit log + retry budget
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS pipeline_log JSONB[] DEFAULT '{}';
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
```

## Domain Types Update

```typescript
export type RecordingStatus =
  | "scheduled"
  | "pending"
  | "uploaded"
  | "transcribed"
  | "synthesizing"
  | "completed"
  | "failed_recording"
  | "failed_download"
  | "failed_transcription"
  | "failed_synthesis"
  | "no_consent";
```

## Google Client Wrapper (`lib/google/client.ts`)

- Reads `platform_google_config` single row via service_role
- Auto-refreshes access token 5 min before expiry
- Updates DB with new token + expiry on refresh
- Returns `{ accessToken, email }` for use by helpers
- All errors logged, never swallowed

## API Helpers

### `calendar.ts` — `createMeetEvent(params)`
- POST `https://www.googleapis.com/calendar/v3/calendars/primary/events`
- `conferenceDataVersion: 1` + `createRequest` for auto Meet link
- Interviewer as co-host (attendee with `organizer` or appropriate role)
- Returns `{ meetLink, meetingCode, calendarEventId }`

### `meet.ts` — `getConferenceRecord(meetingCode)` + `getTranscriptFileId(conferenceRecordId)`
- GET `https://meet.googleapis.com/v2/conferenceRecords?filter=space.meeting_code="{code}"`
- GET `https://meet.googleapis.com/v2/conferenceRecords/{id}/transcripts`
- Returns transcript entry with Drive file reference

### `drive.ts` — `downloadTranscriptFile(fileId)`
- GET `https://www.googleapis.com/drive/v3/files/{fileId}?alt=media`
- Returns raw VTT/SBV text (~50KB)

### `vtt-parser.ts` — `parseVTT(raw)`
- Handles both WebVTT and SBV formats
- Returns `{ plainText: string, segments: { start: string, end: string, speaker: string, text: string }[] }`
- Strips WEBVTT header, NOTE blocks, style tags

## Routes

### `GET /api/google/callback` — One-time OAuth setup
- Receives `?code=` from Google consent screen
- Exchanges for access_token + refresh_token via `https://oauth2.googleapis.com/token`
- Stores tokens in `platform_google_config`
- Redirects to admin settings page with success message
- Used once during initial platform setup

### `GET /api/google/health` — Token health check (cron every 15 min)
- Calls `getGoogleClient()` (triggers refresh if needed)
- Returns `{ status, tokenExpiresAt, email, scopesValid }`
- Logs failures to server console
- After 2 consecutive failures: flag for admin attention

## Environment Variables

```
GOOGLE_RECORDING_CLIENT_ID=635645976716-...apps.googleusercontent.com
GOOGLE_RECORDING_CLIENT_SECRET=GOCSPX-...
GOOGLE_RECORDING_REDIRECT_URI=http://localhost:3000/api/google/callback
```

Production redirect URI: `https://app.axil.ie/api/google/callback`

## OAuth Scopes

```
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/meetings.space.readonly
https://www.googleapis.com/auth/drive.meet.readonly
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/20260226000001_recording_status_states.sql` | CREATE — migration #25 |
| `packages/database/src/domain-types.ts` | MODIFY — update RecordingStatus |
| `apps/web/src/lib/google/client.ts` | CREATE — OAuth client wrapper |
| `apps/web/src/lib/google/calendar.ts` | CREATE — Calendar API helper |
| `apps/web/src/lib/google/meet.ts` | CREATE — Meet API helper |
| `apps/web/src/lib/google/drive.ts` | CREATE — Drive API helper |
| `apps/web/src/lib/google/vtt-parser.ts` | CREATE — VTT/SBV parser |
| `apps/web/src/app/api/google/callback/route.ts` | CREATE — OAuth callback |
| `apps/web/src/app/api/google/health/route.ts` | CREATE — Health check |

## NOT in 10.1 (deferred to 10.2)

- Cron state machine endpoint
- Interview scheduling API
- Manual synthesis trigger
- Schedule dialog UI
- Recording status UI updates
- Manual upload refactor

## Security

- Tokens stored in `platform_google_config` (RLS enabled, NO policies = service_role only)
- Minimal scopes (3 total)
- Token refresh 5 min before expiry, not on-demand
- No tokens exposed to client
- All API calls server-side only
- OAuth callback validates `state` parameter to prevent CSRF

## Testing Strategy

Each piece tested independently:
1. Migration: apply + verify CHECK constraint
2. Client wrapper: mock token refresh, verify expiry logic
3. Calendar: mock Google API, verify event creation payload
4. Meet: mock conference record response, verify file ID extraction
5. Drive: mock file download, verify content returned
6. VTT parser: unit test with sample VTT + SBV files
7. Health check: mock client, verify status response
8. OAuth callback: mock token exchange, verify DB storage
