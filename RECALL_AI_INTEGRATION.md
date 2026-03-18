# Recall.ai Integration Plan

**Date:** 2026-03-17
**Status:** TODO — implement after commit of current session
**Priority:** High — blocks scaling beyond Robert's personal interviews
**Effort:** 2-3 days coding + 2-3 days testing

---

## What It Does

Recall.ai sends a recording bot to every scheduled interview automatically. The bot joins the Google Meet, records, transcribes, and sends the transcript back to Axil via webhook. No additional Google accounts needed. No user interaction required.

## What The User Sees

1. Admin clicks "Schedule Interview" — same as today
2. Interviewer + candidate get calendar invite with Meet link — same as today
3. They join the call. "Axil Recorder" appears as a participant
4. Interview happens normally
5. They leave
6. Transcript appears in Axil automatically — same end result as today

**No UI changes. No settings. No config screens.** It's invisible infrastructure.

## What Happens Behind The Scenes

1. Admin schedules interview → our API creates Calendar event + Meet link (already built)
2. **NEW:** Our API also calls Recall.ai to schedule the bot:
   ```
   POST https://api.recall.ai/api/v1/bot/
   Headers: { "Authorization": "Token RECALL_API_KEY" }
   Body: {
     "meeting_url": "https://meet.google.com/xxx-yyyy-zzz",
     "bot_name": "Axil Recorder",
     "join_at": "2026-03-20T14:00:00Z"
   }
   Response: { "id": "bot_abc123", "status": "ready" }
   ```
3. Bot joins the Meet at the scheduled time (auto-admitted via Recall.ai's own login pool — no extra accounts needed)
4. Bot records + transcribes during the call
5. Call ends → Recall.ai sends webhook:
   ```
   POST https://app.axil.ie/api/webhooks/recall
   Body: {
     "event": "bot.transcription_complete",
     "data": {
       "bot_id": "bot_abc123",
       "transcript": [
         { "speaker": "Robert Coffey", "text": "Tell me about...", "start_time": 0.5, "end_time": 3.2 },
         { "speaker": "Jane Doe", "text": "I have 5 years...", "start_time": 3.5, "end_time": 12.1 }
       ]
     }
   }
   ```
6. Our webhook stores transcript in `interview_transcripts` table, updates `recording_status` → `transcribed`
7. Everything downstream unchanged — feedback + transcript → Claude synthesis

## Cost

- **Per minute:** $0.50/hr recording + $0.15/hr transcription = $0.65/hr total
- **Per 30-min interview:** ~$0.33
- **Per 45-min interview:** ~$0.49
- **Per 60-min interview:** ~$0.65

| Volume | Monthly Recall.ai Cost | + AI Analysis | Total |
|--------|----------------------|---------------|-------|
| 10 interviews/week | ~$20 | ~$32 | ~$52 |
| 25 interviews/week | ~$49 | ~$80 | ~$129 |
| 50 interviews/week | ~$98 | ~$160 | ~$258 |
| 100 interviews/week | ~$196 | ~$320 | ~$516 |

No platform fee. No monthly minimum. Billed per second.

## No Additional Accounts Needed

- Bot joins anonymously or via Recall.ai's own managed Google account pool (included in pricing)
- Zero Workspace accounts to create or manage
- Zero Google costs beyond existing Workspace subscription
- The existing `recorder@axil.ie` or `rcoffey@axil.ie` accounts are NOT used by the bot

## What To Build

### 1. Environment Variable
```
RECALL_API_KEY=your_api_key_here
```

### 2. Recall.ai Client Helper
**File:** `apps/web/src/lib/recall/client.ts`
- `scheduleBot(meetUrl, joinAt, botName)` → returns bot_id
- `cancelBot(botId)` → cancels a scheduled bot
- `getBotStatus(botId)` → returns current status

### 3. Update Interview Scheduling API
**File:** `apps/web/src/app/api/interviews/route.ts`
- After creating Calendar event + Meet link, call `scheduleBot()`
- Store `recall_bot_id` on the interview row
- If Recall.ai call fails, log warning but don't fail the interview creation (graceful degradation — falls back to manual upload)

### 4. Update Interview Cancel/Reschedule
**File:** `apps/web/src/app/api/interviews/[id]/route.ts`
- On cancel: call `cancelBot()` to remove the scheduled bot
- On reschedule: cancel old bot, schedule new one

### 5. Webhook Endpoint
**File:** `apps/web/src/app/api/webhooks/recall/route.ts`
- Verify webhook signature (Recall.ai uses Svix for webhook delivery)
- On `bot.transcription_complete`: store transcript, update recording_status
- On `bot.error`: log error, update recording_status to failed
- ~50-80 lines

### 6. Migration
**File:** `supabase/migrations/XXXXXXXXXX_recall_bot_id.sql`
```sql
ALTER TABLE interviews ADD COLUMN recall_bot_id TEXT;
```

### 7. Existing Cron Pipeline
- Keep as-is for Google-native transcript fallback
- The cron will skip interviews that already have `recording_status = 'transcribed'` (set by webhook)
- No changes needed

## What NOT To Build

- No UI for Recall.ai configuration
- No settings page for recording preferences
- No bot name customization
- No manual bot trigger button
- It's invisible — just works

## Prerequisites

- [ ] Sign up at recall.ai
- [ ] Get API key
- [ ] Set up webhook URL in Recall.ai dashboard (point to `https://app.axil.ie/api/webhooks/recall`)
- [ ] Add `RECALL_API_KEY` to Vercel env vars
- [ ] Add `recall_bot_id` column to interviews table (migration)

## Consent & Transparency

The calendar invite already includes: "This interview will be recorded and transcribed."
The bot joining as "Axil Recorder" provides additional visual notice.
Google Meet also shows a recording banner when the bot records.
This satisfies EU AI Act transparency requirements.

## Reliability

- 99.9% uptime SLA from Recall.ai
- If Recall.ai is down when scheduling → interview still created, falls back to manual upload
- If bot fails to join → cron pipeline can still try Google-native transcript (if Workspace user present)
- If webhook delivery fails → Svix retries automatically with exponential backoff

## About Recall.ai

- Market leader in meeting bot APIs
- $38M Series B funding
- 3000+ companies (Instacart, Apollo.io, Calendly, ClickUp)
- Billions of minutes processed
- SOC 2, ISO 27001, GDPR, CCPA, HIPAA certified
- Supports Google Meet, Zoom, Microsoft Teams
- Speaker diarization (who said what) included
- Word-level timestamps included
