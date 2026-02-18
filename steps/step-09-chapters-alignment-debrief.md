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

### 9.1 — Build Candidate Profile Builder

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step09-1-candidate-profile`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/playbooks/[id]/alignment/page.tsx`
- `apps/web/src/components/alignment/**`

**Tasks:**
- [ ] Create Alignment page layout (tabbed or sections)
- [ ] Create CandidateProfileBuilder component:
  - Experience level selector (slider or dropdown)
  - Skills input (required, preferred, nice-to-have)
  - Industry multi-select (preferred, excluded)
  - Education requirements (optional)
  - Custom requirements field
  - AI suggestions button

**DoD Commands:**
```bash
cd apps/web && pnpm dev
```

**Output:** Candidate profile builder UI

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

### 9.7 — Implement Transcription Pipeline

**Owner:** Backend
**Supporting:** AI Engineer
**Status:** PENDING
**Branch:** `step09-7-transcription`

**Allowed Paths:**
- `apps/web/src/app/api/transcription/route.ts`
- `supabase/functions/transcribe-audio/**`

**Tasks:**
- [ ] Create transcription API route:
```typescript
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}
const openai = new OpenAI({ apiKey });

export async function POST(req: NextRequest) {
  const supabase = await createClient(); // ← MUST await

  // Validate interview_id is a valid UUID
  const { recording_url, interview_id } = await req.json();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(interview_id)) {
    return NextResponse.json({ error: 'Invalid interview ID' }, { status: 400 });
  }

  const audioResponse = await fetch(recording_url);
  if (!audioResponse.ok) {
    console.error("[transcription] Failed to fetch recording:", audioResponse.status);
    return NextResponse.json({ error: 'Failed to fetch recording' }, { status: 500 });
  }
  const audioBlob = await audioResponse.blob();

  const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',
    response_format: 'verbose_json',
  });

  // Store transcript in interview_transcripts table (NOT interviews.transcript — deprecated)
  const { error } = await supabase
    .from('interview_transcripts')
    .upsert({
      interview_id,
      content: transcription.text,
      metadata: {
        duration_seconds: transcription.duration,
        language: transcription.language,
        segments: transcription.segments,
      },
    });

  if (error) {
    console.error("[transcription] Failed to store transcript:", error.message);
    return NextResponse.json({ error: 'Failed to store transcript' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] Handle large files (chunking if needed)
- [ ] Create TranscriptionViewer component
- [ ] Add manual edit capability for transcript
- [ ] Show transcription status (processing, complete, error)

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
# Test with sample audio
```

**Output:** Transcription pipeline working

---

### 9.8 — Build Feedback Forms

**Owner:** UI Builder
**Supporting:** Frontend
**Status:** PENDING
**Branch:** `step09-8-feedback-forms`

**Allowed Paths:**
- `apps/web/src/app/(dashboard)/playbooks/[id]/debrief/page.tsx`
- `apps/web/src/components/debrief/feedback-form.tsx`

**Tasks:**
- [ ] Create Debrief page layout:
  - Candidate cards list
  - Select candidate to view/add feedback
  - Interview timeline

- [ ] Create FeedbackForm component:
```typescript
const feedbackSchema = z.object({
  ratings: z.array(z.object({
    category: z.string(),
    score: z.number().min(1).max(4),
    notes: z.string().optional(),
  })),
  overall_notes: z.string(),
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  focus_areas_confirmed: z.boolean().refine(val => val === true, {
    message: 'You must confirm that focus areas were discussed',
  }),
});
```

- [ ] Rating scales (1-4 numeric scale)
- [ ] Structured sections
- [ ] Pros/cons input (add multiple, stored as JSONB arrays)
- [ ] Focus areas confirmation checkbox (required)
- [ ] Submit confirmation
- [ ] **NO recommendation/hire/no-hire field** (human decides, not the form)

- [ ] Implement blind feedback rules:
  - Interviewers can't see others' feedback until submitted
  - Managers can see all immediately

**DoD Commands:**
```bash
cd apps/web && pnpm dev
```

**Output:** Feedback forms complete

---

### 9.9 — Implement AI Feedback Synthesis

**Owner:** AI Engineer
**Supporting:** Security
**Status:** PENDING
**Branch:** `step09-9-ai-synthesis`

**Allowed Paths:**
- `apps/web/src/app/api/ai/synthesize-feedback/route.ts`
- `packages/ai/src/prompts/feedback-synthesis.ts`
- `apps/web/src/components/debrief/ai-synthesis-panel.tsx`

**Tasks:**
- [ ] Create synthesis prompt (**COMPLIANCE CRITICAL**):
```typescript
export const FEEDBACK_SYNTHESIS_PROMPT = {
  version: '1.0.0',
  system: `You are analyzing text-based interview feedback.

COMPLIANCE REQUIREMENTS (EU AI ACT - MANDATORY):
- Analyze TEXT ONLY from interviewer feedback forms
- DO NOT infer emotions, confidence, or truthfulness
- DO NOT analyze voice, tone, or any audio signals
- DO NOT make hiring decisions or recommendations - only highlight key points
- Focus ONLY on what interviewers explicitly wrote
- NO hire/no-hire recommendation — the human hiring manager decides

OUTPUT MUST include this disclaimer:
"This AI-generated summary is for informational purposes only. All hiring decisions must be made by humans."`,

  user: (feedbacks: any[]) => `
Analyze the following interviewer feedback and provide a synthesis:

${feedbacks.map((f, i) => `
Interviewer ${i + 1}:
- Pros: ${f.pros.join(', ')}
- Cons: ${f.cons.join(', ')}
- Notes: ${f.overall_notes}
- Focus areas confirmed: ${f.focus_areas_confirmed ? 'Yes' : 'No'}
`).join('\n')}

Return JSON:
{
  "summary": "Brief overview of feedback themes",
  "consensus": {
    "areas_of_agreement": ["string"],
    "areas_of_disagreement": ["string"]
  },
  "key_strengths": ["string"],
  "key_concerns": ["string"],
  "highlights": [
    {
      "point": "string",
      "source": "Interviewer N",
      "sentiment": "positive | negative | neutral"
    }
  ],
  "discussion_points": ["string"],
  "disclaimer": "This AI-generated summary is for informational purposes only. All hiring decisions must be made by humans."
}
`,
};
```

- [ ] Create AISynthesisPanel component:
  - Display summary
  - Show consensus areas
  - Highlight divergent opinions
  - Show key highlights and points (NO recommendation breakdown)
  - **DISPLAY DISCLAIMER PROMINENTLY**
  - **NO hire/no-hire recommendation** — humans decide

**Compliance Checklist:**
- [ ] Text-only analysis confirmed
- [ ] No emotion/voice references in code
- [ ] No hire/no-hire recommendation generated
- [ ] Disclaimer is mandatory in schema
- [ ] Disclaimer displayed in UI

**DoD Commands:**
```bash
pnpm test -- feedback-synthesis
```

**Output:** AI synthesis working and compliant

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
