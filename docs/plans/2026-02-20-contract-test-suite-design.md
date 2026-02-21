# Contract & Cross-Layer Verification Test Suite

**Date:** 2026-02-20
**Goal:** Find real bugs by testing the boundaries between layers, not the layers in isolation.

---

## Problem Statement

399 tests pass (251 AI + 148 web) but 8 CRITICAL bugs shipped. Every one was a mismatch between what the API returns and what the UI expects. Existing tests validate mocks, not contracts.

The mock-to-signal ratio is dangerously high: API tests verify `chainBuilder` returns hardcoded data, not that route logic is correct. Zero tests verify response shapes match consumer expectations.

---

## Architecture

```
apps/web/src/__tests__/contracts/
  schemas.ts              — Consumer-expected response Zod schemas
  helpers.ts              — Shared test utilities
  playbooks.contract.test.ts
  stages.contract.test.ts
  collaborators.contract.test.ts
  share-links.contract.test.ts
  feedback.contract.test.ts
  ai-routes.contract.test.ts
  consent.contract.test.ts
  transcription.contract.test.ts
  type-drift.contract.test.ts
  consumer-contracts.test.ts
  flows/
    playbook-lifecycle.flow.test.ts
    ai-pipeline-chain.flow.test.ts
    feedback-synthesis.flow.test.ts
    collaborator-sharelink.flow.test.ts
    consent-transcription.flow.test.ts
```

---

## Layer 1: API Response Contract Tests (~25 tests)

Every API route's `NextResponse.json()` output validated against a Zod schema derived from what the CONSUMER expects.

### Key: schemas are consumer-driven

If the consumer destructures `const { data } = await res.json()`, the schema is `z.object({ data: z.unknown() })`. If the API returns `{ share_link }`, the test FAILS.

### Routes covered

| Route | Method | Contract Shape |
|-------|--------|---------------|
| `/api/playbooks` | POST | `{ id, title, status, ... }` (unwrapped) |
| `/api/playbooks` | GET | `Array<Playbook>` |
| `/api/playbooks/[id]` | GET | `Playbook` with nested stages |
| `/api/playbooks/[id]` | PATCH | `Playbook` (updated) |
| `/api/playbooks/[id]` | DELETE | `{ success: true }` |
| `/api/playbooks/[id]/stages` | POST | `{ data: Stage[], errors: [] }` (bulk) |
| `/api/playbooks/[id]/stages/[sid]` | PATCH | `Stage` |
| `/api/playbooks/[id]/stages/[sid]` | DELETE | `{ success: true }` |
| `/api/playbooks/[id]/stages/reorder` | POST | `{ success: true }` |
| `/api/collaborators` | GET | `{ data: Collaborator[] }` |
| `/api/collaborators/invite` | POST | `{ collaborator: Collaborator }` |
| `/api/collaborators/[id]` | DELETE | `{ success: true }` |
| `/api/share-links` | GET | `{ data: ShareLink[] }` |
| `/api/share-links` | POST | `{ data: ShareLink }` |
| `/api/share-links/[id]` | DELETE | `{ success: true }` |
| `/api/feedback` | GET | `{ data: Feedback[] }` |
| `/api/feedback` | POST | `{ data: Feedback }` |
| `/api/feedback/[id]` | PATCH | `{ data: Feedback }` |
| `/api/ai/*` | POST | `{ data: T, metadata: { model_used, prompt_version } }` |
| `/api/consent` | POST | `{ success: true }` |
| `/api/transcription` | POST | `{ success: true, duration_seconds: number }` |

---

## Layer 2: Consumer Contract Tests (~15 tests)

For each component with `fetch("/api/...")`, verify the destructuring matches the schema.

### Components covered

| Component | API Call | Destructure Pattern |
|-----------|---------|-------------------|
| CandidateProfileBuilder | POST /api/ai/generate-candidate-profile | `{ data }` |
| CandidateProfileBuilder | PATCH /api/playbooks/[id] | `.ok` only |
| CollaboratorManager | POST /api/collaborators/invite | `{ collaborator }` |
| CollaboratorManager | DELETE /api/collaborators/[id] | `.ok` only |
| ShareableLink | POST /api/share-links | `{ data }` |
| ShareableLink | DELETE /api/share-links/[id] | `.ok` only |
| FeedbackForm | POST /api/feedback | `.ok` only |
| FeedbackList | GET /api/feedback | `{ data }` |
| AISynthesisPanel | GET /api/feedback (per interview) | `{ data }` |
| AISynthesisPanel | POST /api/ai/synthesize-feedback | `{ data, metadata }` |
| ManualUpload | POST /api/transcription | `success` field check |
| StrategyPanel | POST /api/ai/generate-strategy | `{ data }` |
| StageBlueprintComponent | POST /api/ai/generate-stages | response parsed |
| CoverageAnalysisPanel | POST /api/ai/analyze-coverage | `{ data }` |
| ConsentPage | POST /api/consent | `.ok` only |

---

## Layer 3: Type Drift Detection (~12 tests)

### AI Schema ↔ UI Interface alignment

| AI Schema | UI Interface | Fields to verify |
|-----------|-------------|-----------------|
| FeedbackSynthesisSchema | SynthesisData (ai-synthesis-panel) | key_strengths, key_concerns, consensus (object), rating_overview (object), disclaimer |
| CandidateProfileSchema | CandidateProfile (domain-types) | All fields match |
| HiringStrategySchema | HiringStrategy (domain-types) | skills_priority.must_have/nice_to_have |
| MarketInsightsSchema | MarketInsights (domain-types) | salary_range, top_skills, etc. |

### API Request Schema ↔ Consumer Payload alignment

Verify that what components `JSON.stringify()` in the body matches what the route's Zod schema expects. Catches the Zod v3 silent stripping problem.

| Route | Component | Fields to check |
|-------|-----------|----------------|
| generate-candidate-profile | CandidateProfileBuilder | `jd_requirements.required/preferred`, `skills` |
| synthesize-feedback | AISynthesisPanel | `feedback_forms` shape |
| feedback POST | FeedbackForm | `ratings`, `pros`, `cons`, `focus_areas_confirmed` |

### Domain Types ↔ DB Types alignment

Verify `packages/database/src/domain-types.ts` exports match Supabase generated types.

---

## Layer 4: Missing Route Tests (~20 tests)

### POST /api/consent (4 tests)
- 400 on missing/invalid token
- 404 on nonexistent token
- 200 on valid token (consent recorded)
- 500 on DB update failure

### POST /api/ai/generate-questions (4 tests)
- 401 unauthorized
- 400 invalid input
- 200 happy path
- 500 on AI error

### POST /api/ai/market-insights (4 tests)
- 401 unauthorized
- 400 invalid input
- 200 cached response
- 200 fresh response

### GET /api/ai/market-insights/[id] (4 tests)
- 401 unauthorized
- 400 invalid UUID
- 200 pending status
- 200 complete status with data

### PATCH /api/feedback/[id] (4 tests)
- 401 unauthorized
- 403 not own feedback
- 400 invalid input
- 200 happy path

---

## Layer 5: Critical Path Flow Tests (~18 tests)

### Flow 1: Playbook Lifecycle (4 tests)
1. POST /api/playbooks → response has valid UUID
2. GET /api/playbooks/[id] → returns created playbook
3. PATCH /api/playbooks/[id] → update persists
4. DELETE /api/playbooks/[id] → playbook gone

### Flow 2: AI Pipeline Chain (4 tests)
1. POST market-insights → output has `salary_range`, `top_skills`
2. POST generate-strategy (using insights) → output has `skills_priority`
3. POST generate-jd (using strategy) → output has requirements
4. POST generate-stages (using JD) → output has focus_areas per stage

### Flow 3: Feedback + Synthesis (4 tests)
1. POST feedback (interviewer A) → succeeds
2. POST feedback (interviewer B) → succeeds
3. GET feedback (as manager) → sees both
4. POST synthesize-feedback (with real feedback shapes) → synthesis matches schema

### Flow 4: Collaborator + Share Link (3 tests)
1. POST collaborators/invite → has invite_token
2. POST share-links → has token, is_active=true
3. DELETE share-links/[id] → soft deleted

### Flow 5: Consent + Transcription (3 tests)
1. POST consent → success
2. POST transcription → success with duration
3. POST synthesize-feedback (with interview_id for transcript) → metadata has transcript_included

---

## Implementation Notes

- **Framework:** Vitest (already installed)
- **Mocking:** Same chainBuilder pattern, but with Zod schema validation on response bodies
- **New dependency:** None needed
- **Run command:** `pnpm test` (same as existing)
- **Naming convention:** `*.contract.test.ts` for contracts, `*.flow.test.ts` for flows
- **Total estimated tests:** ~90
