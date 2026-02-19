# Step 9 — Chapters: Alignment + Debrief

**Status:** NOT STARTED
**Week:** 5-6
**Default Owners:** Frontend + UI Builder + Backend + AI Engineer + QA + Security

---

## Goal

Ship collaboration + feedback loop + compliant synthesis.

---

## Deliverables

**Alignment:**
- Candidate profile builder
- Process summary dashboard
- Collaborator system + Resend email invites
- Share links + public read-only page (/share/[token])

**Debrief:**
- Recording (MediaRecorder) + upload
- Whisper transcription pipeline
- Feedback forms + blind feedback rules
- AI synthesis (text-only, disclaimer, divergence highlights)

---

## Definition of Done (Step Level)

- [ ] Teams can collaborate end-to-end: invite → assign → record → transcribe → submit feedback → view synthesis
- [ ] Compliance gates satisfied
- [ ] All micro steps complete

---

## Compliance Gate (MANDATORY)

- [ ] **Text-only synthesis** (no emotion/hesitation/lie detection)
- [ ] **Candidate informed before recording** (notice displayed)
- [ ] **Human review disclaimer present** in synthesis
- [ ] Retention/erasure path designed (MVP-level)

---

## Micro Steps

### 9.1 — Build Candidate Profile Builder + AI Pipeline

**Owner:** UI Builder + AI Engineer
**Supporting:** Frontend, Backend
**Status:** PENDING
**Branch:** `step09-1-candidate-profile`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/playbooks/[id]/alignment/page.tsx`
- `apps/web/src/components/alignment/**`
- `packages/ai/src/schemas/candidate-profile.ts`
- `packages/ai/src/prompts/candidate-profile.ts`
- `packages/ai/src/pipelines/candidate-profile.ts`
- `apps/web/src/app/api/ai/generate-candidate-profile/route.ts`

**AI Pipeline (Pipeline #8 from AI_INTELLIGENCE_ENGINE.md):**
- [ ] Create `CandidateProfileSchema` in `packages/ai/src/schemas/candidate-profile.ts`:
```typescript
// Fields: ideal_background, must_have_skills[], nice_to_have_skills[],
// experience_range, cultural_fit_indicators[], disclaimer
// Must match CandidateProfile domain type in packages/database/src/domain-types.ts
```
- [ ] Create prompt in `packages/ai/src/prompts/candidate-profile.ts`:
  - System: recruitment profile specialist
  - User: receives JD requirements + strategy skills_priority + market key_skills
  - Context injection: jd_context + strategy_context + market_context (all slim slices)
- [ ] Create pipeline in `packages/ai/src/pipelines/candidate-profile.ts`:
  - Model: Sonnet (`candidateProfile` endpoint — already in AI_CONFIG)
  - Input: `{ role, level, industry, jd_requirements, strategy_skills_priority, market_key_skills }`
  - Output: `CandidateProfile` shape
- [ ] Create API route `POST /api/ai/generate-candidate-profile`:
  - Auth: any authenticated user
  - Zod validation on input with `.max()` on strings
  - Returns `{ data, metadata: { model_used, prompt_version, generated_at } }`

**UI Tasks:**
- [ ] Create Alignment page layout (tabbed or sections)
- [ ] Create CandidateProfileBuilder component:
  - Experience level selector (slider or dropdown)
  - Skills input (required, preferred, nice-to-have)
  - Industry multi-select (preferred, excluded)
  - Education requirements (optional)
  - Custom requirements field
  - **"AI Suggestions" button** — calls `/api/ai/generate-candidate-profile`, auto-fills form
  - Users can edit after AI fills in
  - Auto-save via `useAutoSave` hook
- [ ] Save to `playbooks.candidate_profile` (JSONB) via `PATCH /api/playbooks/[id]`

**DoD Commands:**
```bash
cd packages/ai && pnpm test
cd apps/web && pnpm lint && pnpm typecheck
```

**Output:** Candidate profile builder UI + AI pipeline (Pipeline #8)

---

### 9.2 — Build Process Summary Dashboard

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step09-2-process-summary`

**Allowed Paths:**
- `apps/web/src/components/alignment/process-summary.tsx`

**Tasks:**
- [ ] Create ProcessSummary component:
  - Total stages count
  - Estimated timeline (sum + buffer)
  - Interviewers involved list
  - Key focus areas across stages
  - Stage timeline visualization (vertical timeline)
  - Print-friendly view option

**DoD Commands:**
```bash
cd apps/web && pnpm dev
```

**Output:** Process summary dashboard

---

### 9.3 — Implement Collaborator System

**Owner:** Backend
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step09-3-collaborator-system`

**Allowed Paths:**
- `apps/web/src/app/api/collaborators/**`
- `apps/web/src/components/alignment/collaborator-*`

**Tasks:**
- [ ] Create collaborator API routes:
```typescript
// POST /api/collaborators/invite
// GET /api/collaborators
// DELETE /api/collaborators/:id
```

- [ ] Create CollaboratorManager component:
  - List current collaborators
  - Invite by email form
  - Role assignment (viewer, interviewer)
  - Assign to specific stages
  - Pending invitations list
  - Resend/revoke actions

- [ ] Generate magic link tokens
- [ ] Set expiration (default 7 days)

**Security Checklist:**
- [ ] Tokens are cryptographically random
- [ ] Tokens expire
- [ ] Revocation works

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
```

**Output:** Collaborator system backend

---

### 9.4 — Implement Email Invitations (Resend)

**Owner:** Backend
**Supporting:** DevOps
**Status:** PENDING
**Branch:** `step09-4-email-invites`

**Allowed Paths:**
- `apps/web/src/lib/email/**`
- `apps/web/src/app/api/collaborators/invite/route.ts`

**Tasks:**
- [ ] Set up Resend client:
```typescript
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}
const resend = new Resend(apiKey);

export async function sendCollaboratorInvite({
  email,
  inviterName,
  playbookTitle,
  stageName,
  magicLink,
}: {
  email: string;
  inviterName: string;
  playbookTitle: string;
  stageName?: string;
  magicLink: string;
}) {
  const { error } = await resend.emails.send({
    from: 'Rec+onnect <noreply@[domain]>',
    to: email,
    subject: `You've been invited to collaborate on ${playbookTitle}`,
    html: `
      <p>Hi,</p>
      <p>${inviterName} has invited you to collaborate on "${playbookTitle}"${stageName ? ` for the ${stageName} stage` : ''}.</p>
      <p><a href="${magicLink}">Click here to accept the invitation</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });
  if (error) {
    console.error("[email] Failed to send collaborator invite:", error);
    throw new Error("Failed to send invitation email");
  }
}
```

- [ ] Create email templates (invite, reminder)
- [ ] Handle magic link acceptance flow

**DoD Commands:**
```bash
# Test email sending (use Resend test mode)
```

**Output:** Email invitations working

---

### 9.5 — Implement Shareable Links

**Owner:** Backend
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step09-5-share-links`

**Allowed Paths:**
- `apps/web/src/app/api/share-links/**`
- `apps/web/src/app/share/[token]/page.tsx`
- `apps/web/src/components/alignment/shareable-link.tsx`

**Tasks:**
- [ ] Create share-links API routes
- [ ] Create ShareableLink component:
  - Generate link button
  - Expiration options (7/30 days, custom)
  - Copy to clipboard
  - View count display
  - Revoke link option

- [ ] Create public share page (/share/[token]):
  - Read-only playbook view
  - No authentication required
  - Limited information (no candidate data)
  - Expiration check
  - View counter increment

**Security Checklist:**
- [ ] Tokens are cryptographically random
- [ ] Expired links return 404
- [ ] No sensitive data exposed
- [ ] View count updates on access

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Test share link flow
```

**Output:** Shareable links working

---

### 9.6 — Build Audio Recording Component

**Owner:** Frontend
**Supporting:** UI Builder
**Status:** PENDING
**Branch:** `step09-6-audio-recording`

**Allowed Paths:**
- `apps/web/src/components/debrief/audio-recorder.tsx`
- `apps/web/src/hooks/use-audio-recorder.ts`

**Tasks:**
- [ ] Create useAudioRecorder hook:
```typescript
'use client';

import { useState, useRef, useCallback } from 'react';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
    });
    const chunks: Blob[] = [];

    mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.current.onstop = () => {
      setAudioBlob(new Blob(chunks, { type: 'audio/webm' }));
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.current.start();
    setIsRecording(true);

    // Timer
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  return {
    isRecording,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
  };
}
```

- [ ] Create AudioRecorder component:
  - **COMPLIANCE: Candidate informed notice before recording**
  - Consent checkbox/button
  - Start/stop controls
  - Recording timer
  - Audio level visualization (optional)
  - Upload button
  - Alternative: Upload external recording

**Compliance Checklist:**
- [ ] Notice displayed before recording
- [ ] User must confirm consent
- [ ] Recording indicator visible

**DoD Commands:**
```bash
cd apps/web && pnpm dev
# Test recording in browser
```

**Output:** Audio recording component

---

### 9.7 — Implement Transcription Pipeline (Pipeline #9)

**Owner:** Backend
**Supporting:** AI Engineer
**Status:** PENDING
**Branch:** `step09-7-transcription`

**Allowed Paths:**
- `apps/web/src/app/api/transcription/route.ts`
- `apps/web/src/lib/openai/client.ts`
- `apps/web/src/components/debrief/transcription-viewer.tsx`

**AI Pipeline (Pipeline #9 from AI_INTELLIGENCE_ENGINE.md):**
- Model: OpenAI Whisper-1
- Input: Audio file (webm from browser recording OR Google Drive URL)
- Output: Transcript text + metadata (duration, language, segments)
- Storage: `interview_transcripts` table (service_role only — NO RLS policies)
- Privacy: Transcript NEVER exposed to client. Only service_role reads it. Only synthesis pipeline uses it.

**Recording flow:**
```
Browser recording → Supabase Storage (temp)
                         ↓ (Step 10.2 adds Drive upload here)
                    Whisper API
                         ↓
                interview_transcripts table (service_role INSERT)
                         ↓
                interviews.recording_status = "completed"
```

**Tasks:**
- [ ] Create OpenAI client wrapper (`apps/web/src/lib/openai/client.ts`):
  - Env var validation (`OPENAI_API_KEY`)
  - Export `transcribeAudio(file: File)` function
- [ ] Create transcription API route (`POST /api/transcription`):
  - Auth: any authenticated user
  - UUID validation on `interview_id`
  - Fetch audio from `recording_url` (Supabase Storage or Drive URL)
  - Call Whisper API with `response_format: 'verbose_json'`
  - Use **service_role** Supabase client (NOT user client — `interview_transcripts` has no RLS policies)
  - UPSERT to `interview_transcripts` table: `{ interview_id, transcript, metadata }`
  - Update `interviews.recording_status` to `"completed"` (or `"failed"` on error)
  - Return `{ success: true, duration_seconds }`
- [ ] Handle large files (Whisper limit: 25MB; chunk if needed)
- [ ] Create TranscriptionViewer component (admin/manager only — shows transcript text)
- [ ] Show transcription status indicator on interview card

**Service-role client note:** Create `apps/web/src/lib/supabase/service-role.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
// Uses SUPABASE_SERVICE_ROLE_KEY — server-side only, NEVER import in client code
```

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
# Test with sample audio (requires OPENAI_API_KEY)
```

**Output:** Transcription pipeline working (Pipeline #9)

---

### 9.8 — Build Feedback Forms + CRUD API

**Owner:** UI Builder + Backend
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step09-8-feedback-forms`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/playbooks/[id]/debrief/page.tsx`
- `apps/web/src/components/debrief/feedback-form.tsx`
- `apps/web/src/components/debrief/feedback-list.tsx`
- `apps/web/src/app/api/feedback/route.ts`
- `apps/web/src/app/api/feedback/[id]/route.ts`

**API Routes (G6 from AI_INTELLIGENCE_ENGINE.md):**
- [ ] `POST /api/feedback` — Submit feedback for an interview:
  - Auth: authenticated user (interviewer for this stage)
  - Input Zod schema:
    ```typescript
    {
      interview_id: z.string().uuid(),
      ratings: z.array(z.object({
        category: z.string().max(200),
        score: z.number().int().min(1).max(4),
        notes: z.string().max(1000).optional(),
      })).min(1).max(20),
      pros: z.array(z.string().max(500)).max(20),
      cons: z.array(z.string().max(500)).max(20),
      notes: z.string().max(5000).optional(),
      focus_areas_confirmed: z.boolean().refine(val => val === true),
    }
    ```
  - Sets `interviewer_id` from auth user (not from body — prevent spoofing)
  - Returns created feedback row
- [ ] `GET /api/feedback?interview_id=X` — List feedback for an interview:
  - **Blind feedback rules (critical):**
    - Interviewers: see only their OWN feedback (filter by `interviewer_id = auth.uid()`)
    - Managers/Admins: see ALL feedback for the interview
  - Verify RLS policies match these rules (G9 from AI_INTELLIGENCE_ENGINE.md)

**DB Table (`feedback`):**
```
interview_id   UUID → interviews(id)
interviewer_id UUID → users(id)
ratings        JSONB  — Array<{ category, score 1-4, notes? }>
pros           JSONB  — string[]
cons           JSONB  — string[]
notes          TEXT
focus_areas_confirmed BOOLEAN (required true)
submitted_at   TIMESTAMPTZ
```

**UI Tasks:**
- [ ] Create Debrief page layout:
  - Candidate cards list
  - Select candidate to view interviews + feedback
  - Interview timeline (per stage)
- [ ] Create FeedbackForm component:
  - Rating scales (1-4 numeric scale with labels)
  - Structured pros/cons input (add multiple, JSONB arrays)
  - Overall notes textarea
  - Focus areas confirmation checkbox (required)
  - Submit confirmation dialog
  - **NO recommendation/hire/no-hire field** (human decides, not the form)
- [ ] Create FeedbackList component (blind-aware):
  - Shows all feedback if manager/admin
  - Shows only own feedback if interviewer
  - "Waiting for N more feedback" indicator
- [ ] "Generate AI Synthesis" button (visible to manager/admin only, after all feedback submitted)

**DoD Commands:**
```bash
cd apps/web && pnpm lint && pnpm typecheck
```

**Output:** Feedback forms + CRUD API + blind access control

---

### 9.9 — Complete AI Feedback Synthesis (Pipeline #10)

**Owner:** AI Engineer
**Supporting:** Security, Backend
**Status:** PENDING
**Branch:** `step09-9-ai-synthesis`

**Allowed Paths:**
- `apps/web/src/app/api/ai/synthesize-feedback/route.ts` (MODIFY — wire transcript + persist)
- `apps/web/src/components/debrief/ai-synthesis-panel.tsx`

**Pipeline status:** Schema, prompt, and pipeline are ALREADY BUILT (`packages/ai/`). This step completes the integration:

**What's already built:**
- `FeedbackSynthesisSchema` — validated output with mandatory disclaimer
- `FEEDBACK_SYNTHESIS_PROMPT` — EU AI Act compliant, text-only, no hire/no-hire
- `synthesizeFeedback()` pipeline — Opus model, accepts transcript param
- `estimateTokens()` + `truncateTranscript()` — 150K soft limit with 60/30 head/tail split
- API route `/api/ai/synthesize-feedback` — exists but has 2 stubs

**What needs to be completed:**

1. **Wire transcript fetch (G2 from AI_INTELLIGENCE_ENGINE.md):**
```typescript
// In synthesize-feedback/route.ts, replace the stub:
if (parsed.data.interview_id) {
  // Use service_role client to read from interview_transcripts
  // (table has RLS enabled but NO policies — only service_role can read)
  const serviceClient = createServiceRoleClient();
  const { data: transcriptRow, error: txError } = await serviceClient
    .from('interview_transcripts')
    .select('transcript')
    .eq('interview_id', parsed.data.interview_id)
    .single();
  if (txError && txError.code !== 'PGRST116') {
    console.error("[synthesis] Transcript fetch failed:", txError.message);
  }
  transcript = transcriptRow?.transcript ?? undefined;
}
```

2. **Persist synthesis to DB (G3 from AI_INTELLIGENCE_ENGINE.md):**
```typescript
// After successful synthesis, INSERT to ai_synthesis table:
if (parsed.data.candidate_id) {
  const { error: insertError } = await supabase
    .from('ai_synthesis')
    .insert({
      candidate_id: parsed.data.candidate_id,
      synthesis_type: 'initial',  // or 'updated' if re-running
      content: result.data as Json,
      model_used: result.metadata.model_used,
      prompt_version: result.metadata.prompt_version,
    });
  if (insertError) {
    console.error("[synthesis] Failed to persist:", insertError.message);
    // Don't fail the request — synthesis was successful, just persistence failed
  }
}
```

3. **Add `candidate_id` to request schema** (needed for DB persistence):
```typescript
const RequestSchema = z.object({
  // ...existing fields...
  candidate_id: z.string().uuid().optional(),  // ADD: needed for ai_synthesis INSERT
});
```

**UI Tasks:**
- [ ] Create AISynthesisPanel component:
  - Display summary
  - Show consensus areas (agreement + disagreement)
  - Highlight key strengths and concerns (NO recommendation)
  - Show rating overview (average score, distribution chart)
  - Show discussion points
  - **DISPLAY DISCLAIMER PROMINENTLY** (use `<AiDisclaimer />` component)
  - "Regenerate" button (re-runs synthesis with latest feedback)
  - Transcript indicator: "Includes transcript analysis" badge when transcript was used

**Compliance Checklist:**
- [ ] Text-only analysis confirmed (already in prompt)
- [ ] No emotion/voice references in code
- [ ] No hire/no-hire recommendation generated
- [ ] Disclaimer is mandatory in schema (already enforced by Zod)
- [ ] Disclaimer displayed in UI
- [ ] Transcript NEVER exposed to UI (only synthesis result)

**DoD Commands:**
```bash
cd packages/ai && pnpm test
cd apps/web && pnpm lint && pnpm typecheck
```

**Output:** AI synthesis fully wired — transcript fetch + DB persistence + UI panel

---

### 9.10 — Security Review & Tests

**Owner:** Security + QA
**Supporting:** All
**Status:** PENDING
**Branch:** `step09-10-security-tests`

**Tasks:**
- [ ] Security review:
  - Recording consent flow
  - Share link access control
  - Collaborator permissions
  - Blind feedback implementation
  - AI synthesis compliance

- [ ] Tests:
  - Collaborator invite flow
  - Share link expiration
  - Feedback blind rules
  - Synthesis schema validation

**Compliance Checklist:**
- [ ] Candidate informed notice present
- [ ] Human review disclaimer present
- [ ] No biometric inference
- [ ] Retention/erasure path exists

**DoD Commands:**
```bash
pnpm test
```

**Output:** Security review passed, tests passing

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 9.1 Candidate Profile | UI Builder | PENDING | step09-1-candidate-profile |
| 9.2 Process Summary | UI Builder | PENDING | step09-2-process-summary |
| 9.3 Collaborator System | Backend | PENDING | step09-3-collaborator-system |
| 9.4 Email Invites | Backend | PENDING | step09-4-email-invites |
| 9.5 Share Links | Backend | PENDING | step09-5-share-links |
| 9.6 Audio Recording | Frontend | PENDING | step09-6-audio-recording |
| 9.7 Transcription | Backend | PENDING | step09-7-transcription |
| 9.8 Feedback Forms | UI Builder | PENDING | step09-8-feedback-forms |
| 9.9 AI Synthesis | AI Engineer | PENDING | step09-9-ai-synthesis |
| 9.10 Security & Tests | Security + QA | PENDING | step09-10-security-tests |

---

## Dependencies

- **Blocks:** Step 10 (Integrations + Delivery)
- **Blocked By:** Step 8 (Discovery + Process)
