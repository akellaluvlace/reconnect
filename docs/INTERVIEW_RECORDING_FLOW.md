# Interview Recording Flow — Full Architecture

**Created:** 2026-02-20
**Status:** DECIDED — all key decisions locked

---

## Overview

Rec+onnect uses a **shared platform-level Google Workspace account** to manage all interview meetings and recordings. This is NOT a per-org integration — one Rec+onnect Google account serves all organizations on the platform.

---

## Key Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Google account model | **Shared Rec+onnect account** (platform-level) | Simpler than per-org. One Workspace subscription. Centralized control. |
| Meeting tool | **Google Meet** (via Calendar API) | Recordings auto-save to organizer's Drive. Meet API provides structured access. |
| Auto-recording | **Google Workspace admin setting** | "Meetings are recorded by default" — Business Standard tier or higher. |
| Recording trigger | **Workspace org policy (auto-record default)** | Recording starts automatically per Meet rules when meeting begins. Host/co-host can override. Not dependent on specific join order. |
| Recording storage | **Rec+onnect's Google Drive** | All recordings centralized in `Meet Recordings/` folder. Isolation via app-layer RLS (no folder moves for MVP). |
| Recording retrieval | **Meet REST API → Drive API** | `conferenceRecords.recordings.list()` returns `driveDestination.fileId`. Direct download by ID. |
| Transcription | **OpenAI Whisper-1** | Audio → text. Stored in `interview_transcripts` (service_role only). |
| Analysis | **Claude (Opus)** | Transcript + feedback forms → synthesis. Text-only, no emotion/voice inference. |
| Workspace tier | **Business Standard** (minimum) | Cheapest tier with Meet recording. Admin auto-record setting available. |

---

## Full Flow (End-to-End)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SCHEDULING                                                    │
│                                                                  │
│  Admin/Manager creates interview in Rec+onnect                  │
│       ↓                                                         │
│  App calls Google Calendar API (as Rec+onnect account)          │
│  - Creates Calendar event with conferenceData (Meet link)       │
│  - Adds interviewer as CO-HOST                                  │
│  - Adds candidate as attendee                                   │
│  - Auto-record = ON (Workspace admin policy default)            │
│       ↓                                                         │
│  Meet link stored on `interviews.meet_link`                     │
│  Meeting code extracted + stored (e.g., "abc-defg-hij")         │
│  Email notification sent to interviewer + candidate             │
│                                                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 2. INTERVIEW                                                     │
│                                                                  │
│  Interviewer joins Meet call (co-host)                          │
│       ↓                                                         │
│  Auto-recording starts (Workspace org policy default)           │
│  Host/co-host can override. All participants see notification.  │
│       ↓                                                         │
│  Interview happens (max 8 hours recording)                      │
│       ↓                                                         │
│  Meeting ends → recording processes on Google's side            │
│  (processing time ≈ meeting duration, sometimes longer)         │
│                                                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 3. RECORDING RETRIEVAL                                           │
│                                                                  │
│  App polls Meet API:                                            │
│  - conferenceRecords.list(filter=space.meeting_code="abc-...")  │
│  - Then: conferenceRecords.recordings.list(parent=...)          │
│  - Returns recording metadata + driveDestination.fileId         │
│       ↓                                                         │
│  Recording already in Rec+onnect's Drive: Meet Recordings/      │
│       ↓                                                         │
│  Stores `drive_file_id` on interview row (no file move — MVP)   │
│  Updates `interviews.recording_status` = 'uploaded'             │
│                                                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 4. TRANSCRIPTION                                                 │
│                                                                  │
│  App downloads recording from Drive (Drive API files.get)       │
│       ↓                                                         │
│  Extract audio from MP4 video (ffmpeg: mp4 → m4a/mp3)          │
│  Meet recordings are video files (500MB+). Whisper limit = 25MB │
│  Audio extraction reduces file to ~5-15MB for a 1hr interview   │
│       ↓                                                         │
│  Sends audio to OpenAI Whisper-1 API                            │
│  - response_format: verbose_json                                │
│  - Returns: transcript text + segments + language + duration    │
│       ↓                                                         │
│  Stored in `interview_transcripts` table (service_role only)    │
│  Updates `interviews.recording_status` = "completed"            │
│                                                                  │
│  Privacy: transcript NEVER exposed to client/UI                 │
│  Only the synthesis pipeline reads it server-side               │
│                                                                  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
┌────────────────────────────────▼────────────────────────────────┐
│ 5. FEEDBACK + SYNTHESIS                                          │
│                                                                  │
│  Interviewers submit structured feedback forms:                 │
│  - Ratings (1-4 per category)                                   │
│  - Pros / Cons (JSONB arrays)                                   │
│  - Notes                                                        │
│  - Focus areas confirmed (boolean, required)                    │
│       ↓                                                         │
│  When all feedback collected (or manager triggers):             │
│       ↓                                                         │
│  Claude Opus synthesizes:                                       │
│  - ALL feedback forms + transcript (if available)               │
│  - 150K token soft limit, 60/30 head/tail truncation            │
│  - Text-only analysis, NO hire/no-hire recommendation           │
│  - Mandatory EU AI Act disclaimer                               │
│       ↓                                                         │
│  Result stored in `ai_synthesis` table                          │
│  Displayed in Debrief chapter with disclaimer                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Google APIs Used

| API | Purpose | OAuth Scope |
|-----|---------|-------------|
| **Google Calendar API** | Create events with Meet links, set co-hosts | `https://www.googleapis.com/auth/calendar.events` |
| **Google Meet REST API** | List conference records + recordings, get `driveDestination.fileId` | `https://www.googleapis.com/auth/meetings.space.readonly` (least privilege) — `.space.created` also works if creating/managing spaces directly |
| **Google Drive API (read)** | Download Meet recording files by `fileId` | `https://www.googleapis.com/auth/drive.meet.readonly` — specific scope for Meet-created artifacts (recordings, transcripts, notes). **NOT `drive.file`** — that only covers files the app created, not files created by Meet. |
| **Google Drive API (write)** | Move recordings into org folder structure (`files.update` with `addParents/removeParents`) | Requires a write-capable Drive scope. Exact scope TBD during implementation — `drive.meet.readonly` is read-only and won't cover moves. |

**MVP Decision (LOCKED): Don't move files.** Use `drive.meet.readonly` only. Recordings stay in the `Meet Recordings/` folder where Meet saves them. App references recordings by `drive_file_id` — no folder reorganization needed. This avoids requesting write-capable Drive scope and keeps permissions minimal. Org isolation is enforced at the app layer (RLS), not the Drive folder layer.

---

## Drive Storage (MVP)

**MVP: No folder reorganization.** Recordings stay in the default `Meet Recordings/` folder where Google Meet saves them. The app accesses recordings by `drive_file_id` only — never by folder path or filename.

```
Rec+onnect Drive/
└── Meet Recordings/
    ├── Meeting recording - 2026-02-20T10:00.mp4
    ├── Meeting recording - 2026-02-20T14:00.mp4
    └── ...
```

**Isolation:** Enforced at the app layer via RLS (`interviews` → `candidates` → `playbooks` → `organizations`), not at the Drive folder level. End users never see or access Drive directly — only the backend reads files by ID.

**Post-MVP upgrade path:** If folder organization is desired later, upgrade Drive scope from `drive.meet.readonly` to a write-capable scope and implement file moves into per-org folder trees.

---

## Recording Matching (No Guesswork)

The Meet REST API provides a direct `conferenceRecord` → `recording` → `driveDestination.fileId` chain.

**What we store at scheduling time (from Calendar API):**
- Calendar `events.insert` response includes `conferenceData` with the Meet link URL
- The Meet link contains the **meeting code** (e.g., `meet.google.com/abc-defg-hij` → code is `abc-defg-hij`)
- Store the **Meet link** on `interviews.meet_link` (already exists)
- Extract and store the **meeting code** for later Meet API lookup

**How we discover the conferenceRecord after the meeting (verified API):**
1. After interview `completed_at`, call:
   ```
   conferenceRecords.list(filter='space.meeting_code="abc-defg-hij" AND start_time>="2026-02-20T09:00:00Z" AND start_time<="2026-02-20T11:00:00Z"')
   ```
   Time window prevents false matches when meeting codes are reused (recurring meetings). The Meet API supports filtering by `space.meeting_code`, `space.name`, `start_time`, `end_time` ([docs](https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords/list))
2. This returns the `conferenceRecords/{id}` resource for that meeting
3. Store the full resource name on `interviews.meet_conference_id`
4. Call:
   ```
   conferenceRecords.recordings.list(parent="conferenceRecords/{id}")
   ```
   Returns `driveDestination.file` = exact Drive file ID
5. Download by file ID via Drive API — no filename parsing, no folder scanning

**Key:** The `conferenceRecord` resource name is discovered **post-meeting** (not known at scheduling time). The **meeting code** (from the Meet link) is the deterministic bridge between Calendar and Meet API.

---

## Recording Processing Timeline

```
Meeting ends
    ↓ (Google processing: ~1x meeting duration)
Recording available in Drive
    ↓ (App polls or webhook)
App retrieves file ID via Meet API
    ↓ (immediate)
App downloads audio via Drive API
    ↓ (depends on file size)
Whisper transcription
    ↓ (~0.5x meeting duration)
Transcript stored, status = completed
```

**Polling strategy:** After meeting `completed_at`, poll Meet API every 5 minutes for up to 2 hours. If no recording found, mark as `recording_status = 'failed'` and allow manual retry.

---

## Multi-Tenant Isolation

All orgs share one Google account. Isolation is enforced entirely at the **application layer** — Drive is never exposed to end users:

- Backend accesses recordings only by `drive_file_id` — no folder browsing, no filename exposure
- `interviews.drive_file_id` is per-interview, accessed through org-scoped RLS: `interviews` → `candidates` → `playbooks` → `organizations`
- No org can see another org's recordings — the RLS chain prevents cross-tenant access at the DB level
- The shared Drive is an opaque storage layer — only the Rec+onnect backend reads from it via service account

---

## Database Tables Involved

| Table | Columns | Role |
|-------|---------|------|
| `platform_google_config` | tokens, settings | **NEW** — shared Rec+onnect account credentials |
| `organizations` | `drive_folder_id` | Reserved for post-MVP folder organization (column exists, unused for MVP) |
| `interviews` | `meet_link`, `meet_conference_id`, `drive_file_id`, `recording_status`, `recording_consent_at` | Per-interview Meet + recording state |
| `interview_transcripts` | `transcript`, `metadata` | Whisper output (service_role only) |

---

## Compliance

| Requirement | How It's Met |
|------------|--------------|
| **Recording consent (pre-meeting)** | Candidate receives interview invite with recording notice. Candidate confirms consent in Rec+onnect before interview (stored as `recording_consent_at`). If no consent: recording should not proceed (interviewer notified). |
| **Recording consent (in-meeting)** | Meet shows automatic recording notification to all participants when recording starts. |
| **No-consent fallback** | If candidate declines recording: interview proceeds without recording. Interviewer takes manual notes. Feedback forms still usable. AI synthesis runs on feedback only (no transcript). |
| **EU AI Act** | Text-only analysis. No emotion/voice/biometric inference. Mandatory disclaimer on synthesis. |
| **GDPR / Retention** | Rec+onnect targets 1-year retention. Drive recordings retained per Workspace/Vault retention rules (configure to match). Auto-reachout to candidate at 1 year. Erasure path exists. |
| **Data isolation** | Transcripts: service_role only. Recordings: app-layer folder isolation. |
| **Blind feedback** | Interviewers see only own feedback. Managers see all. Synthesis after all submitted. |

### Consent Gate Flow

```
1. Interview scheduled → candidate receives email with recording notice
2. Candidate clicks link → lands on consent page in Rec+onnect
3. Candidate checks "I consent to this interview being recorded" → timestamp saved
4. If consent given: interview proceeds normally, auto-record active
5. If consent NOT given by interview time: interviewer sees "no recording consent" warning
   → interview happens without recording → feedback-only synthesis
```

**GUARDRAIL — This is a known liability.** Google Meet's auto-record is an org policy — we cannot programmatically disable recording for a single meeting via API. This means recording starts regardless of consent status. If consent is not captured:
- The interviewer is responsible for manually stopping recording if it starts
- If a recording is created without consent: treat as a reportable incident → delete the recording from Drive → log the event
- Document this in the interviewer onboarding/training materials

### Sub-Processors (Data Processing)

| Sub-Processor | Data Processed | Purpose | DPA Required |
|---------------|---------------|---------|--------------|
| **Google (Workspace)** | Audio/video recordings | Meeting hosting + recording storage | Yes — Google Workspace agreement |
| **OpenAI** | Audio files (sent to Whisper API) | Speech-to-text transcription | Yes — OpenAI DPA |
| **Anthropic** | Transcript text + feedback text (sent to Claude) | AI synthesis | Yes — Anthropic DPA |
| **Supabase** | All structured data + transcripts | Database hosting | Yes — Supabase DPA |
| **Vercel** | App hosting, no PII at rest | Web app hosting | Yes — Vercel DPA |

All sub-processors process data in accordance with GDPR. Not used for model training by default (API/commercial tier). Retention per vendor policy and DPA agreements — providers may retain data briefly for abuse monitoring. Verify exact retention terms in each vendor's DPA before production launch.

---

## What Changed From Previous Design

| Before | After |
|--------|-------|
| Per-org Google Drive account, admin connects | **Shared Rec+onnect account**, platform-level |
| `org_drive_connections` table (per-org tokens) | **`platform_google_config`** (single row) |
| Manual recording upload to Supabase Storage → Drive | **Auto-record via Meet** → recording already on Drive |
| In-browser `MediaRecorder` as primary recording method | **Google Meet auto-recording** as primary method |
| Filename guessing to find recordings | **Meet API** `conferenceRecords.list(space.meeting_code=...)` → exact Drive file ID |
| Admin OAuth flow per org | **Platform admin** configures once |
| Per-org folder tree in Drive | **No folder moves (MVP)** — recordings stay in `Meet Recordings/`, referenced by `drive_file_id` |

---

## Implementation Order (Guardrail)

Build and verify each piece INDEPENDENTLY before connecting them:

1. **Google OAuth + token storage** — verify refresh works, health check endpoint responds
2. **Calendar event creation** — verify event appears in Google Calendar with Meet link
3. **Meet API recording retrieval** — schedule a real test meeting, let it record, verify `conferenceRecords.recordings.list()` returns the Drive file ID
4. **Drive download** — verify file downloads correctly by ID
5. **Whisper transcription** — feed downloaded audio to Whisper, verify transcript output
6. **End-to-end** — only AFTER steps 1-5 individually work, connect the full pipeline

Do NOT skip straight to step 6. The mock gap from unit testing means we have zero confidence that API calls work until verified against real Google APIs.

---

## Fallback: Manual Upload

If auto-recording fails (interviewer disables it, technical issue, non-Meet interview):

1. Interviewer uploads recording file manually via Debrief page
2. App stores file in **Supabase Storage** (MVP — no Drive write scope needed)
3. Whisper pipeline downloads from Supabase Storage URL and transcribes as normal
4. Same synthesis flow applies

This is a safety net, not the primary path. Post-MVP: if write-capable Drive scope is added, manual uploads could also go to Drive.
