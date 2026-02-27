# Step 10.1 — Platform Google Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the platform-level Google integration — OAuth token management, Calendar/Meet/Drive API helpers, transcript parser, and migration #25 (11-state recording state machine).

**Architecture:** Raw `fetch()` against Google REST APIs (no `googleapis` SDK). Single shared Workspace account with tokens in `platform_google_config` (service_role only). Meet API transcript entries provide structured text directly — no VTT file download needed for auto-recorded interviews.

**Tech Stack:** Next.js App Router, Supabase (service_role for platform config), Google Calendar/Meet/Drive REST APIs, Vitest for tests.

---

## Task 1: Migration #25 — Recording Status State Machine

**Files:**
- Create: `supabase/migrations/20260226000001_recording_status_states.sql`

**Step 1: Write the migration**

```sql
-- ============================================
-- Migration #25: Recording Status State Machine
-- ============================================
-- Updates CHECK constraint from 7 states to 11-state machine.
-- Adds pipeline audit log + retry budget columns.
-- See docs/plans/2026-02-23-recording-pipeline-design.md
-- ============================================

-- Migrate existing data BEFORE dropping constraint
UPDATE public.interviews SET recording_status = 'failed_recording'
  WHERE recording_status = 'failed';
UPDATE public.interviews SET recording_status = 'uploaded'
  WHERE recording_status = 'uploading';

-- Drop old constraint
ALTER TABLE public.interviews
  DROP CONSTRAINT IF EXISTS interviews_recording_status_check;

-- Add 11-state machine constraint
ALTER TABLE public.interviews
  ADD CONSTRAINT interviews_recording_status_check
  CHECK (recording_status IN (
    'scheduled',
    'pending',
    'uploaded',
    'transcribed',
    'synthesizing',
    'completed',
    'failed_recording',
    'failed_download',
    'failed_transcription',
    'failed_synthesis',
    'no_consent'
  ));

-- Pipeline audit log — every state transition appended here
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS pipeline_log JSONB[] DEFAULT '{}';

-- Retry budget — max 3 retries per failed state
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

COMMENT ON COLUMN public.interviews.pipeline_log IS 'Audit log of recording pipeline state transitions. Each entry: {from, to, ts, detail}';
COMMENT ON COLUMN public.interviews.retry_count IS 'Number of retry attempts for failed recording pipeline states. Max 3.';
```

**Step 2: Apply migration to dev DB**

Run:
```bash
cd "C:/Users/Akella/Re+onnect" && npx supabase db push --db-url "postgresql://postgres.vfufxduwywrnwbjtwdjz:V%24rtG%245WB2RPESE@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
```
Expected: Migration applies successfully.

**Step 3: Regenerate Supabase types**

Run:
```bash
cd "C:/Users/Akella/Re+onnect" && npx supabase gen types typescript --project-id vfufxduwywrnwbjtwdjz > packages/database/src/types.ts
```
Expected: `types.ts` updated with `pipeline_log` and `retry_count` columns.

**Step 4: Commit**

```bash
git add supabase/migrations/20260226000001_recording_status_states.sql packages/database/src/types.ts
git commit -m "feat: migration #25 — 11-state recording pipeline + audit log + retry budget"
```

---

## Task 2: Update Domain Types

**Files:**
- Modify: `packages/database/src/domain-types.ts` (line ~10, RecordingStatus type)

**Step 1: Write the failing test**

Create: `packages/database/src/__tests__/domain-types.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import type { RecordingStatus } from "../domain-types";

describe("RecordingStatus", () => {
  it("accepts all 11 state machine states", () => {
    const validStates: RecordingStatus[] = [
      "scheduled",
      "pending",
      "uploaded",
      "transcribed",
      "synthesizing",
      "completed",
      "failed_recording",
      "failed_download",
      "failed_transcription",
      "failed_synthesis",
      "no_consent",
    ];
    expect(validStates).toHaveLength(11);
  });

  it("rejects old states at type level", () => {
    // These should NOT compile — removed from union:
    // "uploading", "transcribing", "failed"
    // Verified by TypeScript, not runtime test.
    // This test documents the change.
    const state: RecordingStatus = "scheduled";
    expect(state).toBe("scheduled");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter @reconnect/database test -- --run`
Expected: FAIL — current type doesn't include `scheduled`, `transcribed`, etc.

**Step 3: Update RecordingStatus in domain-types.ts**

Replace line ~10:
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
  | "no_consent"; // CHECK constraint — see migration #25
```

**Step 4: Run test to verify it passes**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter @reconnect/database test -- --run`
Expected: PASS

**Step 5: Run typecheck to find any broken consumers**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm typecheck`
Expected: May find errors in `recording-status.tsx` (references old states `uploading`, `transcribing`, `failed`). Fix in Task 3.

**Step 6: Commit**

```bash
git add packages/database/src/domain-types.ts packages/database/src/__tests__/domain-types.test.ts
git commit -m "feat: update RecordingStatus to 11-state machine"
```

---

## Task 3: Update Recording Status Component

**Files:**
- Modify: `apps/web/src/components/debrief/recording-status.tsx`

**Step 1: Update STATUS_CONFIG to match new states**

Replace the entire `STATUS_CONFIG` object:

```typescript
"use client";

import {
  Circle,
  CheckCircle,
  CircleNotch,
  XCircle,
  Prohibit,
  CloudArrowDown,
  Waveform,
  Brain,
  CalendarBlank,
  Clock,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; Icon: Icon; spinning?: boolean }
> = {
  scheduled: {
    label: "Scheduled",
    color: "border-border/60 bg-muted/40 text-muted-foreground",
    Icon: CalendarBlank,
  },
  pending: {
    label: "Pending",
    color: "border-amber-200 bg-amber-50 text-amber-800",
    Icon: Clock,
  },
  uploaded: {
    label: "Recording Found",
    color: "border-blue-200 bg-blue-50 text-blue-800",
    Icon: CloudArrowDown,
  },
  transcribed: {
    label: "Transcribed",
    color: "border-teal-200 bg-teal-50 text-teal-800",
    Icon: Waveform,
  },
  synthesizing: {
    label: "Synthesizing",
    color: "border-purple-200 bg-purple-50 text-purple-800",
    Icon: CircleNotch,
    spinning: true,
  },
  completed: {
    label: "Ready",
    color: "border-green-200 bg-green-50 text-green-800",
    Icon: CheckCircle,
  },
  failed_recording: {
    label: "No Recording",
    color: "border-red-200 bg-red-50 text-red-800",
    Icon: XCircle,
  },
  failed_download: {
    label: "Download Failed",
    color: "border-red-200 bg-red-50 text-red-800",
    Icon: XCircle,
  },
  failed_transcription: {
    label: "Transcription Failed",
    color: "border-red-200 bg-red-50 text-red-800",
    Icon: XCircle,
  },
  failed_synthesis: {
    label: "Synthesis Failed",
    color: "border-red-200 bg-red-50 text-red-800",
    Icon: XCircle,
  },
  no_consent: {
    label: "No Consent",
    color: "border-border/60 bg-muted/40 text-muted-foreground",
    Icon: Prohibit,
  },
};
```

Update the render logic to use `spinning` flag:
```typescript
<Icon
  size={12}
  weight={config.spinning ? "bold" : "duotone"}
  className={config.spinning ? "animate-spin" : undefined}
/>
```

**Step 2: Run typecheck**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm typecheck`
Expected: PASS — no more references to old states.

**Step 3: Commit**

```bash
git add apps/web/src/components/debrief/recording-status.tsx
git commit -m "feat: update recording status badges for 11-state machine"
```

---

## Task 4: Google Env Validation

**Files:**
- Create: `apps/web/src/lib/google/env.ts`
- Create: `apps/web/src/__tests__/lib/google/env.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Google env validation", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("exports all three env vars when set", async () => {
    vi.stubEnv("GOOGLE_RECORDING_CLIENT_ID", "test-client-id");
    vi.stubEnv("GOOGLE_RECORDING_CLIENT_SECRET", "test-secret");
    vi.stubEnv("GOOGLE_RECORDING_REDIRECT_URI", "http://localhost:3000/api/google/callback");

    // Dynamic import to pick up stubbed env
    const mod = await import("@/lib/google/env");
    expect(mod.googleClientId).toBe("test-client-id");
    expect(mod.googleClientSecret).toBe("test-secret");
    expect(mod.googleRedirectUri).toBe("http://localhost:3000/api/google/callback");
  });
});
```

**Step 2: Write the implementation**

```typescript
// apps/web/src/lib/google/env.ts

const clientId = process.env.GOOGLE_RECORDING_CLIENT_ID;
const clientSecret = process.env.GOOGLE_RECORDING_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_RECORDING_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  // Warn but don't crash — allows app to start without Google config
  // (other features still work). Google routes will fail with clear error.
  console.warn(
    `[Google] Missing config: CLIENT_ID=${clientId ? "set" : "MISSING"}, ` +
    `CLIENT_SECRET=${clientSecret ? "set" : "MISSING"}, ` +
    `REDIRECT_URI=${redirectUri ? "set" : "MISSING"}`
  );
}

export const googleClientId = clientId ?? "";
export const googleClientSecret = clientSecret ?? "";
export const googleRedirectUri = redirectUri ?? "";

/** Scopes requested for the platform recording pipeline */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/drive.meet.readonly",
] as const;
```

**Step 3: Add env vars to vitest.config.ts**

Add to `test.env`:
```typescript
GOOGLE_RECORDING_CLIENT_ID: "test-google-client-id",
GOOGLE_RECORDING_CLIENT_SECRET: "test-google-secret",
GOOGLE_RECORDING_REDIRECT_URI: "http://localhost:3000/api/google/callback",
```

**Step 4: Run test**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter web test -- --run src/__tests__/lib/google/env.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/google/env.ts apps/web/src/__tests__/lib/google/env.test.ts apps/web/vitest.config.ts
git commit -m "feat: Google env validation + scopes constant"
```

---

## Task 5: Google Client Wrapper (Token Management)

**Files:**
- Create: `apps/web/src/lib/google/client.ts`
- Create: `apps/web/src/__tests__/lib/google/client.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getGoogleTokens, refreshGoogleTokens } from "@/lib/google/client";

function singleRowBuilder(data: unknown, error: unknown = null) {
  const builder: Record<string, any> = {};
  ["select", "eq", "limit"].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue({ data, error });
  return builder;
}

function updateBuilder(data: unknown = null, error: unknown = null) {
  const builder: Record<string, any> = {};
  ["update", "eq"].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.then = (resolve: any) => resolve({ data, error });
  return builder;
}

const MOCK_CONFIG = {
  id: "aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee",
  google_email: "platform@axil.ie",
  access_token: "ya29.valid-token",
  refresh_token: "1//refresh-token",
  token_expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1hr from now
  scopes: ["calendar.events", "meetings.space.readonly", "drive.meet.readonly"],
  auto_record_enabled: true,
  workspace_domain: "axil.ie",
};

describe("getGoogleTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tokens when config exists and token is fresh", async () => {
    mockFrom.mockReturnValue(singleRowBuilder(MOCK_CONFIG));

    const result = await getGoogleTokens();

    expect(result.accessToken).toBe("ya29.valid-token");
    expect(result.email).toBe("platform@axil.ie");
    expect(result.needsRefresh).toBe(false);
  });

  it("flags needsRefresh when token expires within 5 minutes", async () => {
    const nearExpiry = {
      ...MOCK_CONFIG,
      token_expiry: new Date(Date.now() + 3 * 60 * 1000).toISOString(), // 3 min
    };
    mockFrom.mockReturnValue(singleRowBuilder(nearExpiry));

    const result = await getGoogleTokens();

    expect(result.needsRefresh).toBe(true);
  });

  it("throws when no platform config exists", async () => {
    mockFrom.mockReturnValue(
      singleRowBuilder(null, { code: "PGRST116", message: "0 rows" })
    );

    await expect(getGoogleTokens()).rejects.toThrow("Google platform not configured");
  });
});

describe("refreshGoogleTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exchanges refresh_token for new access_token via Google OAuth2", async () => {
    // First call: getGoogleTokens to get refresh_token
    mockFrom.mockReturnValue(singleRowBuilder(MOCK_CONFIG));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "ya29.new-token",
        expires_in: 3600,
      }),
    });

    // Second call: update DB
    mockFrom.mockReturnValue(updateBuilder());

    const result = await refreshGoogleTokens();

    expect(result.accessToken).toBe("ya29.new-token");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws on Google OAuth2 error", async () => {
    mockFrom.mockReturnValue(singleRowBuilder(MOCK_CONFIG));

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "invalid_grant" }),
    });

    await expect(refreshGoogleTokens()).rejects.toThrow("Token refresh failed");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter web test -- --run src/__tests__/lib/google/client.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// apps/web/src/lib/google/client.ts

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { googleClientId, googleClientSecret } from "./env";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  email: string;
  tokenExpiry: Date;
  needsRefresh: boolean;
}

/**
 * Read Google platform tokens from platform_google_config.
 * Flags needsRefresh if token expires within 5 minutes.
 */
export async function getGoogleTokens(): Promise<GoogleTokens> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("platform_google_config")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("Google platform not configured — run OAuth setup first");
  }

  const tokenExpiry = new Date(data.token_expiry);
  const needsRefresh = tokenExpiry.getTime() - Date.now() < TOKEN_REFRESH_BUFFER_MS;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    email: data.google_email,
    tokenExpiry,
    needsRefresh,
  };
}

/**
 * Refresh the Google access token using the stored refresh_token.
 * Updates platform_google_config with new token + expiry.
 */
export async function refreshGoogleTokens(): Promise<{ accessToken: string }> {
  const tokens = await getGoogleTokens();

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: tokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Token refresh failed: ${res.status} ${err.error ?? "unknown"}`);
  }

  const data = await res.json();
  const newExpiry = new Date(Date.now() + data.expires_in * 1000);

  // Update DB with new token
  const supabase = createServiceRoleClient();
  await supabase
    .from("platform_google_config")
    .update({
      access_token: data.access_token,
      token_expiry: newExpiry.toISOString(),
    })
    .eq("id", (await getGoogleTokens()).accessToken ? undefined : undefined);

  // Simpler: update the single row
  await supabase
    .from("platform_google_config")
    .update({
      access_token: data.access_token,
      token_expiry: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("google_email", tokens.email);

  return { accessToken: data.access_token };
}

/**
 * Get a valid Google access token, refreshing if needed.
 * This is the main entry point for all Google API calls.
 */
export async function getValidGoogleToken(): Promise<string> {
  const tokens = await getGoogleTokens();

  if (tokens.needsRefresh) {
    const refreshed = await refreshGoogleTokens();
    return refreshed.accessToken;
  }

  return tokens.accessToken;
}
```

**Step 4: Run tests**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter web test -- --run src/__tests__/lib/google/client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/lib/google/client.ts apps/web/src/__tests__/lib/google/client.test.ts
git commit -m "feat: Google client wrapper with token management"
```

---

## Task 6: Calendar API Helper

**Files:**
- Create: `apps/web/src/lib/google/calendar.ts`
- Create: `apps/web/src/__tests__/lib/google/calendar.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/google/client", () => ({
  getValidGoogleToken: vi.fn().mockResolvedValue("ya29.mock-token"),
}));

import { createMeetEvent } from "@/lib/google/calendar";

describe("createMeetEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates calendar event with Meet conferenceData", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "event-123",
        conferenceData: {
          conferenceId: "abc-defg-hij",
          entryPoints: [
            { entryPointType: "video", uri: "https://meet.google.com/abc-defg-hij" },
          ],
        },
        htmlLink: "https://calendar.google.com/event?eid=xxx",
      }),
    });

    const result = await createMeetEvent({
      title: "Interview: Jane Doe — Senior Engineer",
      startTime: "2026-03-01T10:00:00Z",
      endTime: "2026-03-01T11:00:00Z",
      interviewerEmail: "interviewer@company.com",
      candidateEmail: "jane@example.com",
      description: "Axil interview — recording enabled",
    });

    expect(result.meetLink).toBe("https://meet.google.com/abc-defg-hij");
    expect(result.meetingCode).toBe("abc-defg-hij");
    expect(result.calendarEventId).toBe("event-123");

    // Verify request payload
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("calendar/v3/calendars/primary/events");
    expect(url).toContain("conferenceDataVersion=1");

    const body = JSON.parse(options.body);
    expect(body.conferenceData.createRequest.conferenceSolutionKey.type).toBe("hangoutsMeet");
    expect(body.attendees).toHaveLength(2);
  });

  it("throws on Calendar API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: "insufficient permissions" } }),
    });

    await expect(
      createMeetEvent({
        title: "Test",
        startTime: "2026-03-01T10:00:00Z",
        endTime: "2026-03-01T11:00:00Z",
        interviewerEmail: "a@b.com",
      })
    ).rejects.toThrow("Calendar API error");
  });
});
```

**Step 2: Write the implementation**

```typescript
// apps/web/src/lib/google/calendar.ts

import { getValidGoogleToken } from "./client";
import { randomUUID } from "crypto";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface CreateMeetEventParams {
  title: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  interviewerEmail: string;
  candidateEmail?: string;
  description?: string;
}

interface MeetEventResult {
  meetLink: string;
  meetingCode: string;
  calendarEventId: string;
  htmlLink: string;
}

/**
 * Create a Google Calendar event with a Meet video conference link.
 * The platform account is the organizer; interviewer is added as attendee.
 */
export async function createMeetEvent(params: CreateMeetEventParams): Promise<MeetEventResult> {
  const token = await getValidGoogleToken();

  const attendees = [
    { email: params.interviewerEmail },
  ];
  if (params.candidateEmail) {
    attendees.push({ email: params.candidateEmail });
  }

  const event = {
    summary: params.title,
    description: params.description ?? "Axil interview — recording enabled by default",
    start: { dateTime: params.startTime },
    end: { dateTime: params.endTime },
    attendees,
    conferenceData: {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const url = `${CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Calendar API error: ${res.status} ${err.error?.message ?? "unknown"}`);
  }

  const data = await res.json();

  const videoEntry = data.conferenceData?.entryPoints?.find(
    (ep: { entryPointType: string }) => ep.entryPointType === "video"
  );

  if (!videoEntry?.uri) {
    throw new Error("Calendar event created but no Meet link returned");
  }

  // Extract meeting code from URL: https://meet.google.com/abc-defg-hij → abc-defg-hij
  const meetingCode = data.conferenceData.conferenceId
    ?? videoEntry.uri.split("/").pop()
    ?? "";

  return {
    meetLink: videoEntry.uri,
    meetingCode,
    calendarEventId: data.id,
    htmlLink: data.htmlLink ?? "",
  };
}
```

**Step 3: Run tests**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter web test -- --run src/__tests__/lib/google/calendar.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/google/calendar.ts apps/web/src/__tests__/lib/google/calendar.test.ts
git commit -m "feat: Calendar API helper — create Meet events"
```

---

## Task 7: Meet API Helper

**Files:**
- Create: `apps/web/src/lib/google/meet.ts`
- Create: `apps/web/src/__tests__/lib/google/meet.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/google/client", () => ({
  getValidGoogleToken: vi.fn().mockResolvedValue("ya29.mock-token"),
}));

import { getConferenceRecord, getTranscriptEntries } from "@/lib/google/meet";

describe("getConferenceRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("finds conference record by meeting code", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        conferenceRecords: [
          {
            name: "conferenceRecords/abc123",
            startTime: "2026-03-01T10:00:00Z",
            endTime: "2026-03-01T11:00:00Z",
          },
        ],
      }),
    });

    const result = await getConferenceRecord("abc-defg-hij");

    expect(result).toBe("conferenceRecords/abc123");
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("conferenceRecords");
    expect(url).toContain("abc-defg-hij");
  });

  it("returns null when no conference record found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ conferenceRecords: [] }),
    });

    const result = await getConferenceRecord("no-such-meeting");
    expect(result).toBeNull();
  });
});

describe("getTranscriptEntries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches transcript entries from conference record", async () => {
    // First call: list transcripts
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transcripts: [
          {
            name: "conferenceRecords/abc123/transcripts/t1",
            startTime: "2026-03-01T10:00:00Z",
            endTime: "2026-03-01T11:00:00Z",
          },
        ],
      }),
    });

    // Second call: list transcript entries (page 1)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        transcriptEntries: [
          {
            name: "conferenceRecords/abc123/transcripts/t1/entries/e1",
            participant: "participants/p1",
            text: "Hello, welcome to the interview.",
            startTime: "2026-03-01T10:00:10Z",
            endTime: "2026-03-01T10:00:15Z",
            languageCode: "en",
          },
          {
            name: "conferenceRecords/abc123/transcripts/t1/entries/e2",
            participant: "participants/p2",
            text: "Thank you for having me.",
            startTime: "2026-03-01T10:00:16Z",
            endTime: "2026-03-01T10:00:20Z",
            languageCode: "en",
          },
        ],
      }),
    });

    const result = await getTranscriptEntries("conferenceRecords/abc123");

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].text).toBe("Hello, welcome to the interview.");
    expect(result.plainText).toContain("Hello, welcome to the interview.");
    expect(result.plainText).toContain("Thank you for having me.");
  });

  it("returns empty when no transcripts exist", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ transcripts: [] }),
    });

    const result = await getTranscriptEntries("conferenceRecords/abc123");
    expect(result.entries).toHaveLength(0);
    expect(result.plainText).toBe("");
  });
});
```

**Step 2: Write the implementation**

```typescript
// apps/web/src/lib/google/meet.ts

import { getValidGoogleToken } from "./client";

const MEET_API = "https://meet.googleapis.com/v2";

export interface TranscriptEntry {
  participant: string;
  text: string;
  startTime: string;
  endTime: string;
  languageCode?: string;
}

export interface TranscriptResult {
  entries: TranscriptEntry[];
  plainText: string;
  transcriptName: string | null;
}

/**
 * Find the conference record for a meeting by its meeting code.
 * Returns the conference record resource name, or null if not found.
 */
export async function getConferenceRecord(meetingCode: string): Promise<string | null> {
  const token = await getValidGoogleToken();

  const filter = encodeURIComponent(`space.meeting_code="${meetingCode}"`);
  const url = `${MEET_API}/conferenceRecords?filter=${filter}&pageSize=1`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Meet API error: ${res.status} ${err.error?.message ?? "unknown"}`);
  }

  const data = await res.json();
  const records = data.conferenceRecords ?? [];

  return records.length > 0 ? records[0].name : null;
}

/**
 * Get all transcript entries for a conference record.
 * Uses the Meet REST API transcript entries endpoint (paginated).
 * Returns structured entries + assembled plain text.
 */
export async function getTranscriptEntries(conferenceRecordName: string): Promise<TranscriptResult> {
  const token = await getValidGoogleToken();

  // Step 1: List transcripts for this conference
  const transcriptsUrl = `${MEET_API}/${conferenceRecordName}/transcripts?pageSize=1`;
  const transcriptsRes = await fetch(transcriptsUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!transcriptsRes.ok) {
    const err = await transcriptsRes.json().catch(() => ({}));
    throw new Error(`Meet Transcripts API error: ${transcriptsRes.status} ${err.error?.message ?? "unknown"}`);
  }

  const transcriptsData = await transcriptsRes.json();
  const transcripts = transcriptsData.transcripts ?? [];

  if (transcripts.length === 0) {
    return { entries: [], plainText: "", transcriptName: null };
  }

  const transcriptName = transcripts[0].name;

  // Step 2: Paginate through all transcript entries
  const allEntries: TranscriptEntry[] = [];
  let pageToken: string | undefined;

  do {
    const entriesUrl = new URL(`${MEET_API}/${transcriptName}/entries`);
    entriesUrl.searchParams.set("pageSize", "100");
    if (pageToken) {
      entriesUrl.searchParams.set("pageToken", pageToken);
    }

    const entriesRes = await fetch(entriesUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!entriesRes.ok) {
      const err = await entriesRes.json().catch(() => ({}));
      throw new Error(`Meet Transcript Entries API error: ${entriesRes.status} ${err.error?.message ?? "unknown"}`);
    }

    const entriesData = await entriesRes.json();
    const entries = entriesData.transcriptEntries ?? [];

    for (const entry of entries) {
      allEntries.push({
        participant: entry.participant ?? "Unknown",
        text: entry.text ?? "",
        startTime: entry.startTime ?? "",
        endTime: entry.endTime ?? "",
        languageCode: entry.languageCode,
      });
    }

    pageToken = entriesData.nextPageToken;
  } while (pageToken);

  // Assemble plain text from entries
  const plainText = allEntries.map((e) => e.text).join("\n");

  return { entries: allEntries, plainText, transcriptName };
}
```

**Step 3: Run tests**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter web test -- --run src/__tests__/lib/google/meet.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/google/meet.ts apps/web/src/__tests__/lib/google/meet.test.ts
git commit -m "feat: Meet API helper — conference records + transcript entries"
```

---

## Task 8: Drive API Helper

**Files:**
- Create: `apps/web/src/lib/google/drive.ts`
- Create: `apps/web/src/__tests__/lib/google/drive.test.ts`

**Context:** Drive API is used as fallback for downloading VTT/SBV files when transcript entries API returns empty (rare edge case), and for future recording video access.

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("@/lib/google/client", () => ({
  getValidGoogleToken: vi.fn().mockResolvedValue("ya29.mock-token"),
}));

import { downloadDriveFile, getDriveFileMetadata } from "@/lib/google/drive";

describe("getDriveFileMetadata", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns file metadata", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "file-123",
        name: "transcript.vtt",
        mimeType: "text/vtt",
        size: "52000",
      }),
    });

    const result = await getDriveFileMetadata("file-123");

    expect(result.name).toBe("transcript.vtt");
    expect(result.mimeType).toBe("text/vtt");
  });
});

describe("downloadDriveFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("downloads file content as text", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "WEBVTT\n\n00:00:01.000 --> 00:00:05.000\nHello world",
    });

    const result = await downloadDriveFile("file-123");

    expect(result).toContain("WEBVTT");
    expect(result).toContain("Hello world");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("files/file-123");
    expect(url).toContain("alt=media");
  });

  it("throws on 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: "File not found" } }),
    });

    await expect(downloadDriveFile("missing")).rejects.toThrow("Drive API error: 404");
  });
});
```

**Step 2: Write the implementation**

```typescript
// apps/web/src/lib/google/drive.ts

import { getValidGoogleToken } from "./client";

const DRIVE_API = "https://www.googleapis.com/drive/v3";

interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: string;
}

/**
 * Get metadata for a Drive file (name, type, size).
 */
export async function getDriveFileMetadata(fileId: string): Promise<DriveFileMetadata> {
  const token = await getValidGoogleToken();

  const url = `${DRIVE_API}/files/${fileId}?fields=id,name,mimeType,size`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Drive API error: ${res.status} ${err.error?.message ?? "unknown"}`);
  }

  return res.json();
}

/**
 * Download a Drive file's content as text.
 * Used for VTT/SBV transcript files (~50KB).
 */
export async function downloadDriveFile(fileId: string): Promise<string> {
  const token = await getValidGoogleToken();

  const url = `${DRIVE_API}/files/${fileId}?alt=media`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Drive API error: ${res.status} ${err.error?.message ?? "unknown"}`);
  }

  return res.text();
}
```

**Step 3: Run tests**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter web test -- --run src/__tests__/lib/google/drive.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/google/drive.ts apps/web/src/__tests__/lib/google/drive.test.ts
git commit -m "feat: Drive API helper — file metadata + download"
```

---

## Task 9: VTT/SBV Parser (Fallback)

**Files:**
- Create: `apps/web/src/lib/google/vtt-parser.ts`
- Create: `apps/web/src/__tests__/lib/google/vtt-parser.test.ts`

**Context:** Fallback parser for when Drive VTT/SBV files are available but Meet transcript entries API returns empty. Also useful for manual VTT uploads.

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { parseVTT, parseSBV } from "@/lib/google/vtt-parser";

const SAMPLE_VTT = `WEBVTT

00:00:01.000 --> 00:00:05.000
Speaker 1: Hello, welcome to the interview.

00:00:06.000 --> 00:00:10.000
Speaker 2: Thank you for having me.

00:00:11.000 --> 00:00:20.000
Speaker 1: Let's start with your background.
Can you tell me about your experience?`;

const SAMPLE_SBV = `0:00:01.000,0:00:05.000
Hello, welcome to the interview.

0:00:06.000,0:00:10.000
Thank you for having me.

0:00:11.000,0:00:20.000
Let's start with your background.
Can you tell me about your experience?`;

describe("parseVTT", () => {
  it("parses WebVTT into segments", () => {
    const result = parseVTT(SAMPLE_VTT);

    expect(result.segments).toHaveLength(3);
    expect(result.segments[0].start).toBe("00:00:01.000");
    expect(result.segments[0].end).toBe("00:00:05.000");
    expect(result.segments[0].text).toContain("Hello, welcome");
  });

  it("assembles plain text from all segments", () => {
    const result = parseVTT(SAMPLE_VTT);

    expect(result.plainText).toContain("Hello, welcome to the interview.");
    expect(result.plainText).toContain("Thank you for having me.");
    expect(result.plainText).toContain("Can you tell me about your experience?");
  });

  it("extracts speaker labels when present", () => {
    const result = parseVTT(SAMPLE_VTT);

    expect(result.segments[0].speaker).toBe("Speaker 1");
    expect(result.segments[1].speaker).toBe("Speaker 2");
  });

  it("handles empty input", () => {
    const result = parseVTT("");
    expect(result.segments).toHaveLength(0);
    expect(result.plainText).toBe("");
  });

  it("handles VTT with NOTE blocks", () => {
    const vttWithNotes = `WEBVTT

NOTE This is a comment

00:00:01.000 --> 00:00:05.000
Hello world`;

    const result = parseVTT(vttWithNotes);
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].text).toBe("Hello world");
  });
});

describe("parseSBV", () => {
  it("parses SBV format into segments", () => {
    const result = parseSBV(SAMPLE_SBV);

    expect(result.segments).toHaveLength(3);
    expect(result.segments[0].start).toBe("0:00:01.000");
    expect(result.segments[0].end).toBe("0:00:05.000");
    expect(result.segments[0].text).toBe("Hello, welcome to the interview.");
  });

  it("handles multiline text in segments", () => {
    const result = parseSBV(SAMPLE_SBV);

    expect(result.segments[2].text).toContain("Let's start with your background.");
    expect(result.segments[2].text).toContain("Can you tell me about your experience?");
  });
});
```

**Step 2: Write the implementation**

```typescript
// apps/web/src/lib/google/vtt-parser.ts

export interface TranscriptSegment {
  start: string;
  end: string;
  speaker: string;
  text: string;
}

export interface ParsedTranscript {
  segments: TranscriptSegment[];
  plainText: string;
}

/**
 * Parse WebVTT format into structured segments.
 * Handles WEBVTT header, NOTE blocks, and speaker labels ("Speaker 1: text").
 */
export function parseVTT(raw: string): ParsedTranscript {
  if (!raw.trim()) {
    return { segments: [], plainText: "" };
  }

  const segments: TranscriptSegment[] = [];
  // Split into blocks separated by blank lines
  const blocks = raw.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");

    // Skip WEBVTT header and NOTE blocks
    if (lines[0]?.startsWith("WEBVTT") || lines[0]?.startsWith("NOTE")) {
      continue;
    }

    // Find the timestamp line (contains " --> ")
    const tsLineIdx = lines.findIndex((l) => l.includes(" --> "));
    if (tsLineIdx === -1) continue;

    const tsParts = lines[tsLineIdx].split(" --> ");
    if (tsParts.length !== 2) continue;

    const start = tsParts[0].trim();
    const end = tsParts[1].trim();

    // Text is everything after the timestamp line
    const textLines = lines.slice(tsLineIdx + 1).join("\n").trim();
    if (!textLines) continue;

    // Extract speaker label if present ("Speaker 1: text")
    let speaker = "";
    let text = textLines;
    const speakerMatch = textLines.match(/^([^:]+):\s+(.+)/s);
    if (speakerMatch) {
      speaker = speakerMatch[1].trim();
      text = speakerMatch[2].trim();
    }

    segments.push({ start, end, speaker, text });
  }

  const plainText = segments.map((s) => s.text).join("\n");
  return { segments, plainText };
}

/**
 * Parse SBV (SubViewer) format into structured segments.
 * SBV uses comma-separated timestamps: "H:MM:SS.mmm,H:MM:SS.mmm"
 */
export function parseSBV(raw: string): ParsedTranscript {
  if (!raw.trim()) {
    return { segments: [], plainText: "" };
  }

  const segments: TranscriptSegment[] = [];
  const blocks = raw.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 2) continue;

    // First line: timestamps separated by comma
    const tsParts = lines[0].split(",");
    if (tsParts.length !== 2) continue;

    const start = tsParts[0].trim();
    const end = tsParts[1].trim();

    // Rest is text
    const text = lines.slice(1).join("\n").trim();
    if (!text) continue;

    segments.push({ start, end, speaker: "", text });
  }

  const plainText = segments.map((s) => s.text).join("\n");
  return { segments, plainText };
}
```

**Step 3: Run tests**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter web test -- --run src/__tests__/lib/google/vtt-parser.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/lib/google/vtt-parser.ts apps/web/src/__tests__/lib/google/vtt-parser.test.ts
git commit -m "feat: VTT/SBV transcript parser"
```

---

## Task 10: OAuth Callback Route

**Files:**
- Create: `apps/web/src/app/api/google/callback/route.ts`
- Create: `apps/web/src/__tests__/api/google/callback.test.ts`

**Context:** One-time route used during initial platform setup. Admin visits Google consent screen → redirected here with auth code → exchange for tokens → store in `platform_google_config`.

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

const { mockServiceFrom } = vi.hoisted(() => ({
  mockServiceFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { GET } from "@/app/api/google/callback/route";

const MOCK_ADMIN = { id: "user-1", email: "admin@axil.ie" };

function makeReq(code?: string, state?: string) {
  const url = new URL("http://localhost:3000/api/google/callback");
  if (code) url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  return new NextRequest(url);
}

function upsertBuilder(data: unknown = null, error: unknown = null) {
  const builder: Record<string, any> = {};
  builder.upsert = vi.fn().mockReturnValue(builder);
  builder.then = (resolve: any) => resolve({ data, error });
  return builder;
}

describe("GET /api/google/callback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 if not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await GET(makeReq("auth-code"));
    expect(res.status).toBe(401);
  });

  it("returns 400 if no auth code", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_ADMIN }, error: null });

    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it("exchanges code for tokens and stores in platform_google_config", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_ADMIN }, error: null });

    // User role check
    const userBuilder: Record<string, any> = {};
    ["select", "eq"].forEach((m) => { userBuilder[m] = vi.fn().mockReturnValue(userBuilder); });
    userBuilder.single = vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null });

    mockFrom.mockReturnValue(userBuilder);

    // Token exchange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "ya29.new",
        refresh_token: "1//refresh",
        expires_in: 3600,
        scope: "calendar.events meetings.space.readonly drive.meet.readonly",
      }),
    });

    // Userinfo for email
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ email: "platform@axil.ie" }),
    });

    // DB upsert
    mockServiceFrom.mockReturnValue(upsertBuilder());

    const res = await GET(makeReq("valid-auth-code"));

    // Should redirect to settings on success
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("/settings");
  });
});
```

**Step 2: Write the implementation**

```typescript
// apps/web/src/app/api/google/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { googleClientId, googleClientSecret, googleRedirectUri, GOOGLE_SCOPES } from "@/lib/google/env";

/**
 * One-time OAuth callback: exchanges auth code for tokens, stores in platform_google_config.
 * Only admins can authorize the platform Google account.
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // Get auth code from query params
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      console.error("[Google OAuth] Token exchange failed:", err);
      return NextResponse.json(
        { error: `Token exchange failed: ${err.error ?? "unknown"}` },
        { status: 502 }
      );
    }

    const tokens = await tokenRes.json();

    // Get Google email for this account
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userinfo = userinfoRes.ok
      ? await userinfoRes.json()
      : { email: "unknown" };

    // Store tokens in platform_google_config (upsert — singleton)
    const serviceClient = createServiceRoleClient();
    const { error: dbError } = await serviceClient
      .from("platform_google_config")
      .upsert({
        google_email: userinfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scopes: tokens.scope?.split(" ") ?? [],
        auto_record_enabled: true,
        workspace_domain: userinfo.email?.split("@")[1] ?? null,
      });

    if (dbError) {
      console.error("[Google OAuth] DB storage failed:", dbError);
      return NextResponse.json({ error: "Failed to store tokens" }, { status: 500 });
    }

    // Redirect to settings page with success
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/settings/integrations?google=connected`);
  } catch (err) {
    console.error("[Google OAuth] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Helper: Generate the Google OAuth consent URL for initial setup.
 * Admin visits this URL → authorizes → redirected to callback route above.
 */
export function getGoogleOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: googleRedirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",    // Get refresh_token
    prompt: "consent",         // Force consent screen every time (ensures refresh_token)
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
```

**Step 3: Run tests**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter web test -- --run src/__tests__/api/google/callback.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/app/api/google/callback/route.ts apps/web/src/__tests__/api/google/callback.test.ts
git commit -m "feat: Google OAuth callback route — token exchange + storage"
```

---

## Task 11: Health Check Route

**Files:**
- Create: `apps/web/src/app/api/google/health/route.ts`
- Create: `apps/web/src/__tests__/api/google/health.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetGoogleTokens } = vi.hoisted(() => ({
  mockGetGoogleTokens: vi.fn(),
}));

vi.mock("@/lib/google/client", () => ({
  getGoogleTokens: mockGetGoogleTokens,
  getValidGoogleToken: vi.fn().mockResolvedValue("ya29.mock"),
}));

import { GET } from "@/app/api/google/health/route";

describe("GET /api/google/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns healthy when tokens are valid", async () => {
    mockGetGoogleTokens.mockResolvedValue({
      accessToken: "ya29.valid",
      email: "platform@axil.ie",
      tokenExpiry: new Date(Date.now() + 3600000),
      needsRefresh: false,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.email).toBe("platform@axil.ie");
  });

  it("returns degraded when token needs refresh", async () => {
    mockGetGoogleTokens.mockResolvedValue({
      accessToken: "ya29.expiring",
      email: "platform@axil.ie",
      tokenExpiry: new Date(Date.now() + 60000),
      needsRefresh: true,
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("degraded");
  });

  it("returns error when platform not configured", async () => {
    mockGetGoogleTokens.mockRejectedValue(new Error("Google platform not configured"));

    const res = await GET();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("error");
  });
});
```

**Step 2: Write the implementation**

```typescript
// apps/web/src/app/api/google/health/route.ts

import { NextResponse } from "next/server";
import { getGoogleTokens } from "@/lib/google/client";

/**
 * Google platform health check.
 * Called by Vercel Cron every 15 minutes.
 * Returns token status + expiry info.
 */
export async function GET() {
  try {
    const tokens = await getGoogleTokens();

    const status = tokens.needsRefresh ? "degraded" : "healthy";

    return NextResponse.json({
      status,
      email: tokens.email,
      tokenExpiresAt: tokens.tokenExpiry.toISOString(),
      needsRefresh: tokens.needsRefresh,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Google Health] Check failed:", message);

    return NextResponse.json(
      { status: "error", detail: message },
      { status: 503 }
    );
  }
}
```

**Step 3: Run tests**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter web test -- --run src/__tests__/api/google/health.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/app/api/google/health/route.ts apps/web/src/__tests__/api/google/health.test.ts
git commit -m "feat: Google health check endpoint"
```

---

## Task 12: Barrel Export + Final Verification

**Files:**
- Create: `apps/web/src/lib/google/index.ts`

**Step 1: Create barrel export**

```typescript
// apps/web/src/lib/google/index.ts

export { getGoogleTokens, refreshGoogleTokens, getValidGoogleToken } from "./client";
export { createMeetEvent } from "./calendar";
export { getConferenceRecord, getTranscriptEntries } from "./meet";
export { downloadDriveFile, getDriveFileMetadata } from "./drive";
export { parseVTT, parseSBV } from "./vtt-parser";
export { googleClientId, googleClientSecret, googleRedirectUri, GOOGLE_SCOPES } from "./env";
export type { TranscriptEntry, TranscriptResult } from "./meet";
export type { TranscriptSegment, ParsedTranscript } from "./vtt-parser";
```

**Step 2: Run full typecheck**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm typecheck`
Expected: PASS — no type errors across the entire monorepo.

**Step 3: Run all web tests**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm --filter web test -- --run`
Expected: All tests pass (existing 476 + new ~25 Google tests).

**Step 4: Run lint**

Run: `cd "C:/Users/Akella/Re+onnect" && pnpm lint`
Expected: PASS (same known lint warnings as before, no new ones).

**Step 5: Commit**

```bash
git add apps/web/src/lib/google/index.ts
git commit -m "feat: Google integration barrel export + verification"
```

---

## Task 13: Manual Integration Test (OAuth Flow)

**Context:** No automated test can verify real Google API interaction. This is a manual step.

**Step 1: Start dev server**

Run: `cd "C:/Users/Akella/Re+onnect/apps/web" && pnpm dev`

**Step 2: Visit Google OAuth consent URL**

Build the URL manually (or create a temp button in settings):
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=635645976716-4djh0o9pi2a8tn913hkjmhd9tui998f9.apps.googleusercontent.com&
  redirect_uri=http://localhost:3000/api/google/callback&
  response_type=code&
  scope=https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/meetings.space.readonly https://www.googleapis.com/auth/drive.meet.readonly&
  access_type=offline&
  prompt=consent
```

**Step 3: Authorize with the Axil Workspace account**

Sign in with the platform Google Workspace account → Grant permissions → Redirected to `/settings/integrations?google=connected`.

**Step 4: Verify tokens stored**

Check Supabase Dashboard → Table Editor → `platform_google_config`:
- Should have 1 row
- `google_email` = Workspace email
- `access_token` = starts with "ya29."
- `refresh_token` = starts with "1//"
- `token_expiry` = ~1 hour from now

**Step 5: Test health check**

Visit: `http://localhost:3000/api/google/health`
Expected: `{ "status": "healthy", "email": "...", "tokenExpiresAt": "..." }`

---

## Summary

| Task | What | Tests |
|------|------|-------|
| 1 | Migration #25 (11 states + audit log + retry) | DB-level verification |
| 2 | Domain types update | Type test |
| 3 | Recording status component | Typecheck |
| 4 | Google env validation | 1 test |
| 5 | Google client wrapper (tokens) | 4 tests |
| 6 | Calendar API helper | 2 tests |
| 7 | Meet API helper | 4 tests |
| 8 | Drive API helper | 3 tests |
| 9 | VTT/SBV parser | 6 tests |
| 10 | OAuth callback route | 3 tests |
| 11 | Health check route | 3 tests |
| 12 | Barrel export + full verification | Full suite |
| 13 | Manual OAuth integration test | Manual |

**Total new test files:** 8
**Total new tests:** ~26
**Total new source files:** 9 (+ 1 migration)
**Total modified files:** 3 (domain-types, recording-status component, vitest.config)
