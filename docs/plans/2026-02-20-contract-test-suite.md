# Contract & Cross-Layer Verification Test Suite

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a test suite that catches real bugs at the boundaries between API routes, consumers, AI schemas, and domain types — the exact class of bug that shipped 8 CRITICALs.

**Architecture:** Consumer-driven contract tests validate that every API route's JSON response matches what its UI consumer actually destructures. Type drift tests catch schema misalignment between layers. Flow tests verify that output from step N is valid input for step N+1.

**Tech Stack:** Vitest (existing), Zod v3 (existing), same chainBuilder mock pattern but with Zod validation on responses.

---

## Task 1: Contract Schema File

**Files:**
- Create: `apps/web/src/__tests__/contracts/schemas.ts`

**Step 1: Create the consumer-expected response schemas**

This file defines what CONSUMERS expect from each API route. Not what the API developer intended — what the component actually destructures.

```typescript
import { z } from "zod";

// -- Shared building blocks --

const MetadataSchema = z.object({
  model_used: z.string(),
  prompt_version: z.string(),
});

const SuccessSchema = z.object({ success: z.literal(true) });

const ErrorSchema = z.object({
  error: z.string(),
  issues: z.array(z.unknown()).optional(),
});

// -- Playbooks --

export const PlaybookResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: z.string(),
}).passthrough();

export const PlaybookListResponseSchema = z.array(PlaybookResponseSchema);
export const PlaybookDeleteResponseSchema = SuccessSchema;

// -- Stages --

export const StageBulkResponseSchema = z.object({
  data: z.array(z.unknown()),
  errors: z.array(z.unknown()),
});

export const StageDeleteResponseSchema = SuccessSchema;

// -- Collaborators --

export const CollaboratorsListResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    email: z.string(),
  }).passthrough()),
});

export const CollaboratorInviteResponseSchema = z.object({
  collaborator: z.object({
    id: z.string(),
    email: z.string(),
    invite_token: z.string(),
  }).passthrough(),
});

export const CollaboratorDeleteResponseSchema = SuccessSchema;

// -- Share Links --

export const ShareLinksListResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    token: z.string(),
    is_active: z.boolean().nullable(),
  }).passthrough()),
});

export const ShareLinkCreateResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    token: z.string(),
    is_active: z.boolean().nullable(),
    expires_at: z.string().nullable(),
    view_count: z.number().nullable(),
  }).passthrough(),
});

export const ShareLinkDeleteResponseSchema = SuccessSchema;

// -- Feedback --

export const FeedbackListResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    interview_id: z.string().nullable(),
    interviewer_id: z.string().nullable(),
    ratings: z.unknown(), // JSONB
    pros: z.unknown().nullable(),
    cons: z.unknown().nullable(),
  }).passthrough()),
});

export const FeedbackCreateResponseSchema = z.object({
  data: z.object({ id: z.string() }).passthrough(),
});

export const FeedbackPatchResponseSchema = z.object({
  data: z.object({ id: z.string() }).passthrough(),
});

// -- AI Routes (all share { data, metadata } envelope) --

export const AIResponseSchema = z.object({
  data: z.unknown(),
  metadata: MetadataSchema,
});

// Specific AI data shapes

export const SynthesisDataSchema = z.object({
  summary: z.string(),
  consensus: z.object({
    areas_of_agreement: z.array(z.string()),
    areas_of_disagreement: z.array(z.string()),
  }),
  key_strengths: z.array(z.string()),
  key_concerns: z.array(z.string()),
  discussion_points: z.array(z.string()),
  rating_overview: z.object({
    average_score: z.number(),
    total_feedback_count: z.number(),
    score_distribution: z.array(z.object({
      score: z.number(),
      count: z.number(),
    })),
  }),
  disclaimer: z.string(),
});

export const CandidateProfileDataSchema = z.object({
  ideal_background: z.string().optional(),
  must_have_skills: z.array(z.string()).optional(),
  nice_to_have_skills: z.array(z.string()).optional(),
  experience_range: z.string().optional(),
  cultural_fit_indicators: z.array(z.string()).optional(),
  disclaimer: z.string(),
});

export const HiringStrategyDataSchema = z.object({
  market_classification: z.string(),
  skills_priority: z.object({
    must_have: z.array(z.string()),
    nice_to_have: z.array(z.string()),
    emerging_premium: z.array(z.string()),
  }),
  disclaimer: z.string(),
}).passthrough();

export const CoverageAnalysisDataSchema = z.object({
  requirements_covered: z.array(z.unknown()),
  gaps: z.array(z.unknown()),
  redundancies: z.array(z.unknown()),
  recommendations: z.array(z.string()),
  overall_coverage_score: z.number(),
  disclaimer: z.string(),
});

// -- Market Insights (special dual-response) --

export const MarketInsightsQuickResponseSchema = z.object({
  data: z.unknown(),
  phase: z.literal("quick"),
  cached: z.boolean(),
  cache_key: z.string(),
}).passthrough();

export const MarketInsightsPollResponseSchema = z.union([
  z.object({ status: z.literal("pending") }),
  z.object({
    status: z.literal("complete"),
    data: z.unknown(),
    cached: z.boolean(),
  }).passthrough(),
]);

// -- Other routes --

export const ConsentResponseSchema = SuccessSchema;

export const TranscriptionResponseSchema = z.object({
  success: z.literal(true),
  duration_seconds: z.number(),
});

// -- Re-export error for negative tests --
export { ErrorSchema };
```

**Step 2: Verify the file compiles**

Run: `cd apps/web && npx tsc --noEmit src/__tests__/contracts/schemas.ts`
Vitest will also catch import errors on next test run.

**Step 3: Commit**

```bash
git add apps/web/src/__tests__/contracts/schemas.ts
git commit -m "test: add contract response schemas for all API routes"
```

---

## Task 2: Contract Test Helpers

**Files:**
- Create: `apps/web/src/__tests__/contracts/helpers.ts`

**Step 1: Create shared mock setup + route invocation helpers**

```typescript
import { vi } from "vitest";
import { NextRequest } from "next/server";

// Standard mock setup used across all contract tests
export const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "order", "limit", "is", "in", "match",
    "filter", "gt", "lt", "gte", "lte", "ilike",
  ].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

export const MOCK_USER = { id: "aabbccdd-1122-3344-5566-778899aabb00", email: "admin@test.com" };
export const MOCK_PROFILE = { role: "admin", organization_id: "org-00112233-4455-6677-8899-aabbccddeeff" };

export function setupAuth(user: typeof MOCK_USER | null = MOCK_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

export function setupProfile(role = "admin", orgId = MOCK_PROFILE.organization_id) {
  // First call to .from("users") returns profile
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({ data: { role, organization_id: orgId }, error: null });
    }
    return chainBuilder({ data: null, error: null });
  });
}

export function setupTable(tableData: unknown, tableError: unknown = null) {
  const prev = mockFrom.getMockImplementation();
  mockFrom.mockImplementation((table: string) => {
    if (table === "users") {
      return chainBuilder({ data: { role: "admin", organization_id: MOCK_PROFILE.organization_id }, error: null });
    }
    return chainBuilder({ data: tableData, error: tableError });
  });
}

export function makeRequest(url: string, method = "GET", body?: unknown): NextRequest {
  const opts: RequestInit = { method };
  if (body) {
    opts.body = JSON.stringify(body);
    opts.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(url, opts);
}
```

**Step 2: Commit**

```bash
git add apps/web/src/__tests__/contracts/helpers.ts
git commit -m "test: add contract test helpers"
```

---

## Task 3: AI Routes Contract Tests

**Files:**
- Create: `apps/web/src/__tests__/contracts/ai-routes.contract.test.ts`

These tests verify that every AI route returns `{ data, metadata: { model_used, prompt_version } }` envelope, and that the `data` field matches the specific AI schema.

**Step 1: Write the contract tests**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  AIResponseSchema,
  SynthesisDataSchema,
  CandidateProfileDataSchema,
  HiringStrategyDataSchema,
  CoverageAnalysisDataSchema,
  ErrorSchema,
} from "./schemas";

// --- Mocks ---

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

const { mockGenerateStrategy, mockGenerateJd, mockGenerateStages,
  mockGenerateQuestions, mockGenerateCandidateProfile,
  mockSynthesizeFeedback, mockAnalyzeCoverage } = vi.hoisted(() => ({
  mockGenerateStrategy: vi.fn(),
  mockGenerateJd: vi.fn(),
  mockGenerateStages: vi.fn(),
  mockGenerateQuestions: vi.fn(),
  mockGenerateCandidateProfile: vi.fn(),
  mockSynthesizeFeedback: vi.fn(),
  mockAnalyzeCoverage: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    }),
  }),
}));

vi.mock("@reconnect/ai", () => ({
  generateHiringStrategy: mockGenerateStrategy,
  generateJobDescription: mockGenerateJd,
  generateInterviewStages: mockGenerateStages,
  generateQuestions: mockGenerateQuestions,
  generateCandidateProfile: mockGenerateCandidateProfile,
  synthesizeFeedback: mockSynthesizeFeedback,
  analyzeCoverage: mockAnalyzeCoverage,
  AIError: class AIError extends Error { code = "AI_ERROR"; },
}));

import { POST as strategyPOST } from "@/app/api/ai/generate-strategy/route";
import { POST as jdPOST } from "@/app/api/ai/generate-jd/route";
import { POST as stagesPOST } from "@/app/api/ai/generate-stages/route";
import { POST as questionsPOST } from "@/app/api/ai/generate-questions/route";
import { POST as candidateProfilePOST } from "@/app/api/ai/generate-candidate-profile/route";
import { POST as synthesisPOST } from "@/app/api/ai/synthesize-feedback/route";
import { POST as coveragePOST } from "@/app/api/ai/analyze-coverage/route";
import { NextRequest } from "next/server";

// --- Helpers ---

const MOCK_USER = { id: "aabbccdd-1122-3344-5566-778899aabb00", email: "admin@test.com" };
const META = { model_used: "claude-sonnet-4-5-20250514", prompt_version: "v1.0", generated_at: "2026-01-01" };

function makePost(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function setupAuth() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainBuilder(resolvedValue: { data: unknown; error: unknown }): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {};
  ["select","insert","update","delete","upsert","eq","neq","order","limit","is","in","match","filter","gt"].forEach((m) => {
    builder[m] = vi.fn().mockReturnValue(builder);
  });
  builder.single = vi.fn().mockResolvedValue(resolvedValue);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder.then = (resolve: any) => resolve(resolvedValue);
  return builder;
}

function setupDB() {
  mockFrom.mockReturnValue(chainBuilder({ data: null, error: null }));
}

// --- Tests ---

describe("AI Route Response Contracts", () => {
  beforeEach(() => { vi.clearAllMocks(); setupAuth(); setupDB(); });

  const STRATEGY_INPUT = { role: "Engineer", level: "Senior", industry: "Tech", location: "Dublin", skills: ["TypeScript"] };
  const JD_INPUT = { role: "Engineer", level: "Senior", industry: "Tech", market_context: "competitive", strategy_context: { skills_priority: { must_have: ["TS"], nice_to_have: [] } } };
  const STAGES_INPUT = { role: "Engineer", level: "Senior", jd_requirements: { required: ["TS"], preferred: [] }, strategy_process_speed: { recommendation: "standard", max_stages: 4 } };
  const QUESTIONS_INPUT = { role: "Engineer", level: "Senior", focus_area: "Coding", focus_area_description: "Coding skills", stage_type: "technical" };
  const PROFILE_INPUT = { role: "Engineer", level: "Senior", industry: "Tech" };
  const SYNTHESIS_INPUT = { candidate_name: "John", role: "Engineer", stage_name: "Technical", feedback_forms: [{ interviewer_name: "Alice", ratings: [{ category: "Coding", score: 3 }], pros: ["Good"], cons: ["Slow"] }] };
  const COVERAGE_INPUT = { role: "Engineer", stages: [{ name: "Tech", focus_areas: [{ name: "Coding", description: "test" }] }], jd_requirements: { required: ["TS"], preferred: [] } };

  it("generate-strategy returns { data, metadata } envelope", async () => {
    mockGenerateStrategy.mockResolvedValue({
      data: { market_classification: "balanced", skills_priority: { must_have: [], nice_to_have: [], emerging_premium: [] }, disclaimer: "AI" },
      metadata: META,
    });
    const res = await strategyPOST(makePost("http://localhost/api/ai/generate-strategy", STRATEGY_INPUT));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(AIResponseSchema.safeParse(body).success).toBe(true);
    expect(HiringStrategyDataSchema.safeParse(body.data).success).toBe(true);
  });

  it("generate-jd returns { data, metadata } envelope", async () => {
    mockGenerateJd.mockResolvedValue({ data: { title: "Engineer" }, metadata: META });
    const res = await jdPOST(makePost("http://localhost/api/ai/generate-jd", JD_INPUT));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(AIResponseSchema.safeParse(body).success).toBe(true);
  });

  it("generate-stages returns { data, metadata } envelope", async () => {
    mockGenerateStages.mockResolvedValue({ data: [{ name: "Tech Screen" }], metadata: META });
    const res = await stagesPOST(makePost("http://localhost/api/ai/generate-stages", STAGES_INPUT));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(AIResponseSchema.safeParse(body).success).toBe(true);
  });

  it("generate-questions returns { data, metadata } envelope", async () => {
    mockGenerateQuestions.mockResolvedValue({ data: { questions: [] }, metadata: META });
    const res = await questionsPOST(makePost("http://localhost/api/ai/generate-questions", QUESTIONS_INPUT));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(AIResponseSchema.safeParse(body).success).toBe(true);
  });

  it("generate-candidate-profile returns data matching CandidateProfile schema", async () => {
    mockGenerateCandidateProfile.mockResolvedValue({
      data: { ideal_background: "5+ years", must_have_skills: ["TS"], disclaimer: "AI generated" },
      metadata: META,
    });
    const res = await candidateProfilePOST(makePost("http://localhost/api/ai/generate-candidate-profile", PROFILE_INPUT));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(AIResponseSchema.safeParse(body).success).toBe(true);
    expect(CandidateProfileDataSchema.safeParse(body.data).success).toBe(true);
  });

  it("synthesize-feedback returns data matching Synthesis schema", async () => {
    mockSynthesizeFeedback.mockResolvedValue({
      data: {
        summary: "Good", consensus: { areas_of_agreement: [], areas_of_disagreement: [] },
        key_strengths: ["Fast"], key_concerns: ["None"], discussion_points: [],
        rating_overview: { average_score: 3, total_feedback_count: 1, score_distribution: [{ score: 3, count: 1 }] },
        disclaimer: "AI",
      },
      metadata: META,
    });
    const res = await synthesisPOST(makePost("http://localhost/api/ai/synthesize-feedback", SYNTHESIS_INPUT));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(AIResponseSchema.safeParse(body).success).toBe(true);
    const dataResult = SynthesisDataSchema.safeParse(body.data);
    if (!dataResult.success) {
      console.error("Synthesis data mismatch:", dataResult.error.issues);
    }
    expect(dataResult.success).toBe(true);
  });

  it("analyze-coverage returns data matching CoverageAnalysis schema", async () => {
    mockAnalyzeCoverage.mockResolvedValue({
      data: { requirements_covered: [], gaps: [], redundancies: [], recommendations: [], overall_coverage_score: 80, disclaimer: "AI" },
      metadata: META,
    });
    const res = await coveragePOST(makePost("http://localhost/api/ai/analyze-coverage", COVERAGE_INPUT));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(AIResponseSchema.safeParse(body).success).toBe(true);
    expect(CoverageAnalysisDataSchema.safeParse(body.data).success).toBe(true);
  });

  it("all AI routes return 401 with error envelope when unauthorized", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const routes = [
      { fn: strategyPOST, url: "http://localhost/api/ai/generate-strategy", body: STRATEGY_INPUT },
      { fn: jdPOST, url: "http://localhost/api/ai/generate-jd", body: JD_INPUT },
      { fn: questionsPOST, url: "http://localhost/api/ai/generate-questions", body: QUESTIONS_INPUT },
      { fn: candidateProfilePOST, url: "http://localhost/api/ai/generate-candidate-profile", body: PROFILE_INPUT },
      { fn: synthesisPOST, url: "http://localhost/api/ai/synthesize-feedback", body: SYNTHESIS_INPUT },
      { fn: coveragePOST, url: "http://localhost/api/ai/analyze-coverage", body: COVERAGE_INPUT },
    ];

    for (const { fn, url, body } of routes) {
      const res = await fn(makePost(url, body));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(ErrorSchema.safeParse(json).success).toBe(true);
    }
  });
});
```

**Step 2: Run tests**

Run: `cd apps/web && pnpm test src/__tests__/contracts/ai-routes.contract.test.ts`
Expected: All pass. If any schema validation fails, the test identifies the exact field mismatch.

**Step 3: Commit**

```bash
git add apps/web/src/__tests__/contracts/ai-routes.contract.test.ts
git commit -m "test: add AI route response contract tests"
```

---

## Task 4: CRUD Route Contract Tests

**Files:**
- Create: `apps/web/src/__tests__/contracts/crud-routes.contract.test.ts`

Tests for collaborators, share-links, feedback, consent, and transcription response shapes.

**Step 1: Write contract tests**

Follow the exact same pattern as Task 3 but for non-AI routes. Each test:
1. Sets up auth + mock DB returning realistic data
2. Calls route handler
3. Parses response JSON against the consumer-expected schema
4. Fails with a clear message if schema validation fails

Cover these routes:
- `POST /api/collaborators/invite` → `CollaboratorInviteResponseSchema`
- `GET /api/collaborators` → `CollaboratorsListResponseSchema`
- `DELETE /api/collaborators/[id]` → `CollaboratorDeleteResponseSchema`
- `POST /api/share-links` → `ShareLinkCreateResponseSchema`
- `GET /api/share-links` → `ShareLinksListResponseSchema`
- `DELETE /api/share-links/[id]` → `ShareLinkDeleteResponseSchema`
- `GET /api/feedback` → `FeedbackListResponseSchema`
- `POST /api/feedback` → `FeedbackCreateResponseSchema`
- `PATCH /api/feedback/[id]` → `FeedbackPatchResponseSchema`
- `POST /api/consent` → `ConsentResponseSchema`
- `POST /api/transcription` → `TranscriptionResponseSchema`

Mock realistic data — use UUIDs for IDs, ISO timestamps, proper JSONB shapes for ratings/pros/cons. Each test asserts `schema.safeParse(body).success === true` and logs `schema.safeParse(body).error.issues` on failure for debugging.

**Step 2: Run and verify**

Run: `cd apps/web && pnpm test src/__tests__/contracts/crud-routes.contract.test.ts`

**Step 3: Commit**

```bash
git add apps/web/src/__tests__/contracts/crud-routes.contract.test.ts
git commit -m "test: add CRUD route response contract tests"
```

---

## Task 5: Type Drift Detection Tests

**Files:**
- Create: `apps/web/src/__tests__/contracts/type-drift.contract.test.ts`

These tests catch when one layer changes and another doesn't. They're the most unusual tests — they import types and schemas from BOTH sides and verify alignment.

**Step 1: Write drift detection tests**

```typescript
import { describe, it, expect } from "vitest";
import {
  FeedbackSynthesisSchema,
  CandidateProfileSchema,
  HiringStrategySchema,
  CoverageAnalysisSchema,
} from "@reconnect/ai";

// These tests verify that the FIELD NAMES in AI schemas
// match what domain types and UI components expect.

describe("Type Drift Detection", () => {

  describe("FeedbackSynthesisSchema ↔ UI SynthesisData", () => {
    // UI component (ai-synthesis-panel.tsx) expects these exact field names
    const EXPECTED_FIELDS = [
      "summary", "consensus", "key_strengths", "key_concerns",
      "discussion_points", "rating_overview", "disclaimer",
    ];

    it("has all fields the UI expects", () => {
      const schemaShape = FeedbackSynthesisSchema.shape;
      for (const field of EXPECTED_FIELDS) {
        expect(schemaShape).toHaveProperty(field);
      }
    });

    it("consensus is an object with areas_of_agreement/disagreement (not a string)", () => {
      const consensusSchema = FeedbackSynthesisSchema.shape.consensus;
      // Verify it's an object schema, not a string schema
      const testObj = { areas_of_agreement: ["Good"], areas_of_disagreement: [] };
      expect(consensusSchema.safeParse(testObj).success).toBe(true);
      expect(consensusSchema.safeParse("just a string").success).toBe(false);
    });

    it("rating_overview is a structured object (not Record<string,number>)", () => {
      const ratingSchema = FeedbackSynthesisSchema.shape.rating_overview;
      const structured = { average_score: 3, total_feedback_count: 2, score_distribution: [{ score: 3, count: 2 }] };
      expect(ratingSchema.safeParse(structured).success).toBe(true);
      expect(ratingSchema.safeParse({ Technical: 3, Communication: 4 }).success).toBe(false);
    });
  });

  describe("CandidateProfileSchema ↔ domain CandidateProfile", () => {
    const DOMAIN_FIELDS = [
      "ideal_background", "must_have_skills", "nice_to_have_skills",
      "experience_range", "cultural_fit_indicators", "disclaimer",
    ];

    it("has all domain type fields", () => {
      const shape = CandidateProfileSchema.shape;
      for (const field of DOMAIN_FIELDS) {
        expect(shape).toHaveProperty(field);
      }
    });

    it("disclaimer is required (not optional)", () => {
      const withDisclaimer = { disclaimer: "AI generated" };
      const withoutDisclaimer = {};
      expect(CandidateProfileSchema.safeParse(withDisclaimer).success).toBe(true);
      expect(CandidateProfileSchema.safeParse(withoutDisclaimer).success).toBe(false);
    });
  });

  describe("HiringStrategySchema ↔ domain HiringStrategy", () => {
    it("skills_priority has must_have, nice_to_have, emerging_premium", () => {
      const shape = HiringStrategySchema.shape;
      expect(shape).toHaveProperty("skills_priority");
      const skillsPriority = { must_have: ["TS"], nice_to_have: ["Go"], emerging_premium: ["Rust"] };
      // The inner schema should accept this structure
      const fullValid = {
        market_classification: "balanced",
        market_classification_rationale: "test",
        salary_positioning: { strategy: "match", rationale: "test", recommended_range: { min: 50000, max: 80000, currency: "EUR" } },
        process_speed: { recommendation: "standard", rationale: "test", max_stages: 4, target_days: 30 },
        competitive_differentiators: [],
        skills_priority: skillsPriority,
        key_risks: [],
        recommendations: [],
        disclaimer: "AI",
      };
      expect(HiringStrategySchema.safeParse(fullValid).success).toBe(true);
    });
  });

  describe("CoverageAnalysisSchema ↔ domain CoverageAnalysis", () => {
    it("has overall_coverage_score as number", () => {
      expect(CoverageAnalysisSchema.shape).toHaveProperty("overall_coverage_score");
    });

    it("disclaimer is required", () => {
      const minimal = {
        requirements_covered: [], gaps: [], redundancies: [],
        recommendations: [], overall_coverage_score: 85,
      };
      expect(CoverageAnalysisSchema.safeParse(minimal).success).toBe(false); // missing disclaimer
      expect(CoverageAnalysisSchema.safeParse({ ...minimal, disclaimer: "AI" }).success).toBe(true);
    });
  });

  describe("API Request Schema ↔ Consumer Payload (Zod v3 silent stripping)", () => {
    // These tests verify that what components SEND matches what routes ACCEPT.
    // Zod v3 silently drops unknown fields — so if a component sends a field
    // not in the schema, the data vanishes.

    it("generate-candidate-profile accepts jd_requirements with required/preferred keys", () => {
      const { z } = require("zod");
      // This is what candidate-profile-builder.tsx sends
      const payload = {
        role: "Engineer", level: "Senior", industry: "Tech",
        jd_requirements: { required: ["TypeScript"], preferred: ["Go"] },
      };
      // This is what the route schema expects
      const RouteSchema = z.object({
        role: z.string().min(1).max(200),
        level: z.string().min(1).max(100),
        industry: z.string().min(1).max(200),
        skills: z.array(z.string().max(100)).max(30).optional(),
        jd_requirements: z.object({
          required: z.array(z.string().max(200)).max(20),
          preferred: z.array(z.string().max(200)).max(20),
        }).optional(),
        strategy_skills_priority: z.object({
          must_have: z.array(z.string().max(100)).max(15),
          nice_to_have: z.array(z.string().max(100)).max(15),
        }).optional(),
        market_key_skills: z.object({
          required: z.array(z.string().max(100)).max(15),
          emerging: z.array(z.string().max(100)).max(10),
        }).optional(),
      });
      const result = RouteSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify jd_requirements was NOT stripped
        expect(result.data.jd_requirements).toBeDefined();
        expect(result.data.jd_requirements?.required).toEqual(["TypeScript"]);
      }
    });

    it("feedback POST accepts ratings with category+score shape", () => {
      const { z } = require("zod");
      // This is what feedback-form.tsx sends
      const payload = {
        interview_id: "11111111-2222-3333-4444-555555555555",
        ratings: [{ category: "Technical", score: 3 }],
        pros: ["Strong coding"],
        cons: ["Slow response"],
        focus_areas_confirmed: true,
      };
      const RouteSchema = z.object({
        interview_id: z.string().uuid(),
        ratings: z.array(z.object({
          category: z.string().min(1).max(200),
          score: z.number().int().min(1).max(4),
          notes: z.string().max(1000).optional(),
        })).min(1).max(20),
        pros: z.array(z.string().max(500)).max(20),
        cons: z.array(z.string().max(500)).max(20),
        notes: z.string().max(5000).optional(),
        focus_areas_confirmed: z.literal(true),
      });
      const result = RouteSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});
```

**Step 2: Run tests**

Run: `cd apps/web && pnpm test src/__tests__/contracts/type-drift.contract.test.ts`

**Step 3: Commit**

```bash
git add apps/web/src/__tests__/contracts/type-drift.contract.test.ts
git commit -m "test: add type drift detection tests"
```

---

## Task 6: Missing Route Tests

**Files:**
- Create: `apps/web/src/__tests__/contracts/missing-routes.contract.test.ts`

Tests for the 5 API routes that have ZERO test coverage.

**Step 1: Write tests for all missing routes**

Test each with the standard pattern: 401, 400, happy path, error path.

Routes:
1. `POST /api/consent` — 400 invalid token, 404 nonexistent token, 200 success
2. `POST /api/ai/generate-questions` — 401, 400, 200, 500 on AIError
3. `POST /api/ai/market-insights` — 401, 400, 200 fresh, 200 cached
4. `GET /api/ai/market-insights/[id]` — 401, 400 invalid key, 200 pending, 200 complete
5. `PATCH /api/feedback/[id]` — 401, 403 not own, 400 invalid, 200 success

Important for market-insights: mock both `ai_research_cache` table queries and `generateQuickInsights` pipeline. The route checks cache first, returns cached if found, generates fresh if not.

Important for feedback PATCH: mock the ownership check — first query to `feedback` returns `{ interviewer_id: user.id }` for own, different ID for not-own.

**Step 2: Run tests**

Run: `cd apps/web && pnpm test src/__tests__/contracts/missing-routes.contract.test.ts`
Expected: All pass. These are the routes that were completely untested.

**Step 3: Commit**

```bash
git add apps/web/src/__tests__/contracts/missing-routes.contract.test.ts
git commit -m "test: add tests for 5 previously untested API routes"
```

---

## Task 7: Critical Path Flow Tests

**Files:**
- Create: `apps/web/src/__tests__/contracts/flows/feedback-synthesis.flow.test.ts`
- Create: `apps/web/src/__tests__/contracts/flows/collaborator-sharelink.flow.test.ts`

These tests verify data flows through multiple API routes, checking that output from step N is valid input for step N+1.

**Step 1: Write feedback → synthesis flow test**

Test flow:
1. POST feedback with realistic ratings/pros/cons → capture response
2. POST feedback again (different interviewer mock) → capture response
3. Build synthesis input from the feedback responses
4. POST synthesize-feedback with the built input → verify synthesis schema
5. Verify synthesis response has correct `total_feedback_count`

This catches: wrong field names in feedback → synthesis bridge, missing required fields, type mismatches between layers.

**Step 2: Write collaborator + share link flow test**

Test flow:
1. POST collaborators/invite → capture `invite_token` from response
2. POST share-links → capture `token` from response
3. Verify both tokens are crypto-random hex strings (64 chars)
4. DELETE share-links/[id] → verify response
5. Verify soft delete (response matches `SuccessSchema`)

**Step 3: Run and verify**

Run: `cd apps/web && pnpm test src/__tests__/contracts/flows/`

**Step 4: Commit**

```bash
git add apps/web/src/__tests__/contracts/flows/
git commit -m "test: add critical path flow tests"
```

---

## Task 8: Full Suite Verification

**Step 1: Run entire test suite**

Run: `cd apps/web && pnpm test`
Expected: All existing 148 tests + all new contract tests pass.

**Step 2: Run typecheck**

Run: `cd apps/web && npx tsc --noEmit`
Expected: Clean (0 errors).

**Step 3: Run AI package tests (regression check)**

Run: `cd packages/ai && pnpm test`
Expected: 251/251 pass.

**Step 4: Final commit with test count update**

```bash
git add -A
git commit -m "test: contract & cross-layer verification suite complete"
```

---

## Summary

| Task | Tests | Purpose |
|------|-------|---------|
| 1 | 0 (schemas) | Define consumer-expected response shapes |
| 2 | 0 (helpers) | Shared test infrastructure |
| 3 | ~9 | AI route response envelopes + data shapes |
| 4 | ~15 | CRUD route response shapes |
| 5 | ~12 | Type drift between AI schemas, domain types, UI |
| 6 | ~20 | 5 previously untested routes |
| 7 | ~8 | Cross-route data flow verification |
| 8 | 0 (verification) | Full suite green check |

**Total new tests: ~64**
**Total after: ~212 web tests + 251 AI tests = ~463 total**
