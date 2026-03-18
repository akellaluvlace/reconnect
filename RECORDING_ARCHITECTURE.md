# Recording & Transcription Architecture — Decision Document

**Date:** 2026-03-17
**Status:** Research complete. Decision needed.

---

## The Problem

Google Meet auto-recording/transcription requires a Workspace user (host/co-host) to physically join the call on web. No Google API can start recording programmatically. The Meet REST API v2 is read-only for recordings/transcripts. This means Axil (axil.ie) can't record interviews where only external interviewers and candidates are present.

**Confirmed by testing (2026-03-17):** Conference records ARE created for any meeting, but recordings/transcripts only generate when a Workspace user from the organizing domain joins.

---

## Recommended Architecture (Phased)

### Phase 1: Recall.ai (1-2 weeks, immediate unblock)

**What:** Bot-as-a-Service. One API call sends a named bot participant to any Meet URL. Records, transcribes, delivers via webhook.

```
POST /api/v1/bot/
{ "meeting_url": "https://meet.google.com/xxx-yyyy-zzz",
  "bot_name": "Axil Interview Recorder",
  "recording_config": { "transcript": { "provider": { "recallai_streaming": {} } } } }
```

**Cost:** ~$0.49 per 45-min interview ($0.50/hr recording + $0.15/hr transcription, billed per second). No platform fee.

**Key details:**
- Signed-in bots skip waiting room when added to calendar invite
- Each Google account supports ~30 concurrent meetings
- JSON transcripts with speaker diarization, word-level timestamps, participant names
- Webhooks for full lifecycle (joining, recording start, complete, transcript ready)
- Separate audio per participant available
- SOC 2, ISO 27001, GDPR, CCPA, HIPAA certified
- $38M Series B, 3000+ companies (Instacart, Apollo.io, Calendly)
- Works with Meet, Zoom, AND Teams

**Integration:** Replace Google transcript source with Recall.ai webhook endpoint. Existing pipeline (store transcript → AI synthesis) stays unchanged.

### Phase 2: Per-Org OAuth (4-8 weeks, zero marginal cost)

**What:** Each client connects their own Google Workspace. Meetings created under client's identity. Their recruiters ARE Workspace users, so auto-recording triggers natively.

**How:**
1. Client admin authorizes Axil via OAuth consent
2. Axil stores encrypted refresh tokens per-user
3. Calendar events created using client user's token (they become organizer)
4. Meet API spaces.patch() pre-configures auto-recording
5. Recruiter joins as host → auto-recording triggers
6. Transcript saved to recruiter's Drive → Axil retrieves via Drive API

**Cost:** $0 per interview. Clients need Workspace Business Standard ($14/user/mo) minimum, Business Plus ($22/user/mo) for auto-recording admin setting.

**Scopes needed:** calendar.events (sensitive), meetings.space.settings (non-sensitive), drive.meet.readonly (restricted — requires security assessment, 4-7 weeks, $15K-75K).

**Limitation:** Recording still requires recruiter to join. If recruiter doesn't show, no recording.

### Fallback: Manual Upload + Whisper (Already Built)

For edge cases where neither path works. Interviewer uploads audio → Whisper transcribes → pipeline continues.

---

## What NOT to Build

| Approach | Why Not |
|----------|---------|
| Self-hosted headless Chrome bot | $0.10-0.20/hr compute BUT violates Google ToS, 0.5-1 FTE maintenance, breaks on every Meet UI change |
| Google Meet Add-ons SDK | Cannot auto-join, cannot control recording |
| Meet Media API | Developer Preview only, all participants must be enrolled, GA timeline uncertain (2026-2027) |
| Companion mode | No API, disables mic/audio, still visible participant |
| RTMP streaming | Manual Calendar setup only, Enterprise edition required |
| Compliance Recording | Enterprise + Assured Controls add-on, WORM storage (can't process), wrong use case |

---

## Cost Comparison Per 45-min Interview

| Component | Cost |
|-----------|------|
| Recall.ai (recording + transcript) | ~$0.49 |
| Per-org OAuth (native Google) | $0.00 |
| Manual upload + Whisper | ~$0.27 |
| AI Analysis (Claude) | ~$0.80 |
| **Total (Recall.ai path)** | **~$1.29** |
| **Total (per-org OAuth path)** | **~$0.80** |
| **Total (manual upload path)** | **~$1.07** |

All well under the $2/interview target.

---

## Competitor Comparison

| Service | Auto-join API? | Cost/45 min | Multi-tenant? |
|---------|---------------|-------------|---------------|
| Recall.ai | Yes | ~$0.49 | Yes |
| Nylas Notetaker | Yes | ~$0.53 | Yes |
| Skribby | Yes | ~$0.26-0.49 | Yes |
| MeetingBaaS | Yes | ~$0.52 + platform fee | Yes |
| Fireflies.ai | Calendar-based only | $18-39/mo seat | No |
| Otter.ai | No programmatic API | $17-30/mo seat | No |

---

## Recommended Rollout

| Phase | What | When | Cost |
|-------|------|------|------|
| **Beta (now)** | Robert is in calls → native recording works. Manual upload fallback. | Immediate | $0 |
| **Launch** | Integrate Recall.ai. 1-2 weeks. | Before first external client | ~$0.49/interview |
| **Scale** | Per-org OAuth. 4-8 weeks. Recall.ai becomes fallback for non-Workspace clients. | Post-launch | $0/interview for Workspace clients |

---

## For Robert — Plain English

Your Google Workspace upgrade gives us the calendar, Meet links, and consent notices — that infrastructure is essential and not wasted.

For your own interviews where you're present, everything records automatically for free. For interviews your team conducts without you, we'll add a recording bot (~$0.49 per interview, ~$1.29 total including AI analysis) that joins automatically and handles everything.

Long term, when your clients connect their own Google Workspace, their recruiters trigger recording natively at zero cost. The bot stays as a backup.

---

## Technical Notes

- Meet REST API v2 is read-only for recordings/transcripts (GET/LIST only, no create/start/stop)
- Auto-recording admin setting: "won't start until host or co-host joins on web"
- Conference records created regardless of who joins (useful for detecting meetings happened)
- Google Docs transcript takes 10-30 min to appear after call ends
- Meet API transcript entries: structured (speaker + timestamp), expire after 30 days
- Google Docs transcript: persistent (no expiry)
- Drive search by meeting code works as fallback when Meet API doesn't return doc ID
- Current OAuth scopes: calendar (full), meetings.space.readonly, drive.readonly
- Recall.ai signed-in bots need dedicated Google Workspace accounts ($6-22/mo each)
- Recall.ai Login Groups enable round-robin across accounts for concurrency
