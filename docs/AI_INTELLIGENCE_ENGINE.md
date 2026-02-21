# Rec+onnect AI Intelligence Engine

**Complete Algorithm Specification — All 4 Chapters**
**Last Updated:** 2026-02-19

---

## Executive Summary

Rec+onnect runs a **chained intelligence pipeline** across the 4 playbook chapters. Each AI step receives context from the previous steps and feeds the next. This is NOT a collection of isolated AI calls — it's a connected research engine where the hiring strategy knows the market, the JD knows the strategy, the stages know the JD, and the synthesis knows everything.

**Total pipelines: 10** (7 built, 3 remaining)
**Total AI-touched DB columns: 11** across 5 tables
**Total API routes: 11** (10 built, 1 stub)

---

## 1. Full Algorithm Map

### The Chain (left-to-right = data flow)

```
CHAPTER 1: DISCOVERY                    CHAPTER 2: PROCESS
─────────────────────                   ──────────────────

Market Insights ──→ Hiring Strategy     Stage Generation ──→ Coverage Analysis
  (quick+deep)    │    │                  ↑  (per focus)      (stages vs JD)
                  │    │                  │
                  │    ├──→ JD Gen ───────┘
                  │    │     ↑
                  │    │     │ (strategy_context + market_context)
                  ↓    ↓     ↓

CHAPTER 3: ALIGNMENT                    CHAPTER 4: DEBRIEF
────────────────────                    ──────────────────

Candidate Profile ←── JD + Strategy     Whisper Transcription
  (AI suggestions)                           ↓
                                        Feedback Synthesis
                                          (transcript + all feedback forms)
```

### Pipeline Registry (10 total)

| # | Pipeline | Chapter | Model | Built? | DB Storage |
|---|----------|---------|-------|--------|------------|
| 1 | Market Insights (Quick) | Discovery | Sonnet | YES | `ai_research_cache` (phase=quick) + `playbooks.market_insights` |
| 2 | Market Insights (Deep) | Discovery | Opus | YES | `ai_research_cache` (phase=deep) + `playbooks.market_insights` |
| 3 | Hiring Strategy | Discovery | Sonnet | YES | `playbooks.hiring_strategy` |
| 4 | JD Generation | Discovery | Sonnet | YES | `playbooks.job_description` |
| 5 | Stage Generation | Process | Sonnet | YES | `interview_stages` rows |
| 6 | Question Generation | Process | Sonnet | YES | `interview_stages.suggested_questions` |
| 7 | Coverage Analysis | Process | Sonnet | YES | Component state (not persisted) |
| 8 | Candidate Profile Suggestions | Alignment | Sonnet | **NO** | `playbooks.candidate_profile` |
| 9 | Whisper Transcription | Debrief | Whisper-1 | **NO** | `interview_transcripts` |
| 10 | Feedback Synthesis | Debrief | Opus | YES (stub) | `ai_synthesis` |

---

## 2. Pipeline Specifications

### Pipeline 1-2: Market Insights (Quick + Deep)

**Purpose:** Research the real market for this role using live web data.

**Phase 1 — Quick (3-5 seconds):**
- Model: Sonnet (training knowledge only, no search)
- Input: `{ role, level, industry, location, market_focus }`
- Output: `MarketInsights` with `phase: "quick"`, no sources
- Storage: `ai_research_cache` (key = SHA-256 of normalized params, org-scoped)

**Phase 2 — Deep (15-30 seconds, background):**
- Model: Opus (6-step pipeline with live Tavily search)
- Steps: Query generation → Web search → Source scoring → Parallel extraction → Cross-referencing → Validation
- Input: Same params as quick
- Output: `MarketInsights` with `phase: "deep"`, 12-15 cited sources
- Storage: Overwrites cache entry with `phase: "deep"`, updates `playbooks.market_insights`
- Cache TTL: 30 days per org

**Output Schema (`MarketInsights`):**
```typescript
{
  phase: "quick" | "deep";
  salary: { min, max, median, currency, confidence: 0-1 };
  competition: { companies_hiring[], job_postings_count, market_saturation: "low"|"medium"|"high" };
  time_to_hire: { average_days, range: { min, max } };
  candidate_availability: { level: "scarce"|"limited"|"moderate"|"abundant", description };
  key_skills: { required[], emerging[], declining[] };
  trends: string[];
  sources?: Array<{ url, title, relevance_score, published_date? }>; // deep phase only
  metadata: { model_used, prompt_version, generated_at, source_count, confidence };
}
```

**Context injected downstream:**
- `market_context` → JD Generation: `{ salary_range, key_skills.required (top 5), demand_level, competitors (top 3) }`
- Full `market_insights` → Hiring Strategy (receives everything, not a slim context)

---

### Pipeline 3: Hiring Strategy

**Purpose:** Analyze market data and produce actionable hiring strategy with rationale on every decision.

- Model: Sonnet (temperature 0.3)
- Input: `{ role, level, industry, market_insights: MarketInsights }`
- Output: `HiringStrategy`

**Output Schema (`HiringStrategy`):**
```typescript
{
  market_classification: "employer_market" | "balanced" | "candidate_market";
  market_classification_rationale: string;
  salary_positioning: {
    strategy: "lead" | "match" | "lag";
    rationale: string;
    recommended_range: { min, max, currency };
  };
  process_speed: {
    recommendation: "fast_track" | "standard" | "thorough";
    rationale: string;
    max_stages: 2-8;
    target_days: 5-90;
  };
  competitive_differentiators: string[];          // 1-8 items
  skills_priority: {
    must_have: string[];
    nice_to_have: string[];
    emerging_premium: string[];
  };
  key_risks: Array<{ risk, mitigation }>;         // 1-6 items
  recommendations: string[];                       // 1-8 items
  disclaimer: string;                              // mandatory EU AI Act
}
```

**Context injected downstream:**
- `strategy_context` → JD Generation: `{ salary_positioning, recommended_range, differentiators (top 3), skills_priority (5+3) }`
- `strategy_context` → Stage Generation: `{ market_classification, process_speed, skills_priority (5+5), differentiators (top 3) }`

**Storage:** `playbooks.hiring_strategy` (JSONB)

---

### Pipeline 4: JD Generation

**Purpose:** Generate structured job description informed by market reality and hiring strategy.

- Model: Sonnet (temperature 0.4)
- Input: `{ role, level, industry, style, currency, market_context?, strategy_context? }`
- Output: `JobDescription`

**Output Schema (`JobDescription`):**
```typescript
{
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: { required: string[]; preferred: string[] };
  benefits: string[];
  salary_range?: { min, max, currency };
  location?: string;
  remote_policy?: string;
  seniority_signals?: string[];
  confidence: 0-1;
}
```

**Storage:** `playbooks.job_description` (JSONB)

**UI behavior:** Displayed as editable section cards. Each section can be individually regenerated. Auto-saves via debounced PATCH.

---

### Pipeline 5: Stage Generation

**Purpose:** Generate interview process stages aligned with JD requirements and hiring strategy.

- Model: Sonnet (temperature 0.2)
- Input: `{ role, level, type, description?, stage_count?, jd_context?, strategy_context? }`
- Output: `InterviewStages`

**Output Schema (`InterviewStage`):**
```typescript
{
  name: string;
  type: "screening" | "technical" | "behavioral" | "cultural" | "final" | "custom";
  duration_minutes: number;
  description: string;
  focus_areas: FocusArea[];       // 2-3 per stage (hard constraint)
  suggested_questions: SuggestedQuestion[];  // 6-15 per stage (3-5 per focus area)
  rationale?: string;             // WHY this stage matters for this role+market
}

// FocusArea:
{ name, description, weight: 1-4, rationale?: string }

// SuggestedQuestion:
{ question, purpose, look_for: string[], focus_area: string }
```

**Storage:** `interview_stages` table (one row per stage, `focus_areas` and `suggested_questions` as JSONB)

**Constraints (client decisions):**
- 2-3 focus areas per interview stage
- 3-5 questions per focus area
- Default stages: HR Screen + Reference Check (both removable)
- Stage count aligned with `strategy.process_speed.max_stages`
- Every stage and focus area includes `rationale` tied to market/JD

---

### Pipeline 6: Question Generation

**Purpose:** Regenerate questions for a single focus area within a stage.

- Model: Sonnet (temperature 0.3)
- Input: `{ role, stage_name, focus_area, level? }`
- Output: `QuestionsForFocusArea`

**Output Schema:**
```typescript
{
  focus_area: string;
  questions: Array<{
    question: string;
    purpose: string;
    look_for: string[];
  }>;  // 3-5 questions
}
```

**Storage:** Updates the parent stage's `suggested_questions` JSONB via PATCH.

---

### Pipeline 7: Coverage Analysis

**Purpose:** Cross-reference interview stages against JD requirements to find gaps and redundancies.

- Model: Sonnet (temperature 0.2)
- Input: `{ role, level, jd_requirements: { required[], preferred[], responsibilities[] }, stages: [{ name, type, focus_areas }] }`
- Output: `CoverageAnalysis`

**Output Schema (`CoverageAnalysis`):**
```typescript
{
  requirements_covered: Array<{
    requirement: string;
    covered_by_stage: string;
    covered_by_focus_area: string;
    coverage_strength: "strong" | "moderate" | "weak";
  }>;
  gaps: Array<{
    requirement: string;
    severity: "critical" | "important" | "minor";
    suggestion: string;
  }>;
  redundancies: Array<{
    focus_area: string;
    appears_in_stages: string[];
    recommendation: string;
  }>;
  recommendations: string[];          // 1-8 items
  overall_coverage_score: 0-100;
  disclaimer: string;
}
```

**Storage:** Component state only — NOT persisted to DB. Derived analysis, regenerated on demand. Rationale: coverage changes whenever stages change, so storing it creates stale data.

---

### Pipeline 8: Candidate Profile Suggestions ⚠️ NOT BUILT

**Purpose:** AI-suggest the ideal candidate profile based on JD, strategy, and market data.

**Status:** Domain type (`CandidateProfile`) exists. DB column (`playbooks.candidate_profile`) exists. No schema, prompt, pipeline, or API route built yet.

- Model: Sonnet (temperature 0.3)
- Input: `{ role, level, industry, jd_requirements, strategy_skills_priority, market_key_skills }`
- Output: `CandidateProfile`

**Output Schema (`CandidateProfile`):**
```typescript
{
  ideal_background?: string;              // "5+ years backend, FinTech preferred"
  must_have_skills?: string[];            // Hard requirements from JD + strategy
  nice_to_have_skills?: string[];         // Preferred skills from JD + strategy
  experience_range?: string;              // "3-7 years" or "Senior (5+)"
  cultural_fit_indicators?: string[];     // Soft factors
}
```

**Decision (LOCKED):** This is an AI-assisted feature, not fully automated. The UI shows a form where the user can manually fill fields OR click "AI Suggestions" to auto-populate from upstream data. Users can edit after AI fills in.

**What's needed to build (Step 9.1):**
1. `packages/ai/src/schemas/candidate-profile.ts` — Zod schema
2. `packages/ai/src/prompts/candidate-profile.ts` — prompt template
3. `packages/ai/src/pipelines/candidate-profile.ts` — pipeline function
4. `apps/web/src/app/api/ai/generate-candidate-profile/route.ts` — API route
5. Add `candidateProfile` to `AI_CONFIG` and `PROMPT_VERSIONS`
6. UI: `CandidateProfileBuilder` component with "AI Suggestions" button

**Context injection:** Receives `jd_context` (requirements.required, requirements.preferred) + `strategy_context` (skills_priority) + `market_context` (key_skills). Does NOT inject downstream — this is a leaf node.

**Storage:** `playbooks.candidate_profile` (JSONB)

---

### Pipeline 9: Whisper Transcription ⚠️ NOT BUILT

**Purpose:** Convert interview recording audio to text for AI synthesis.

**Status:** DB table (`interview_transcripts`) exists with RLS enabled but NO policies (service_role only). Step 9.7 defines the implementation.

- Model: OpenAI Whisper-1
- Input: Audio file (webm from browser recording OR from Google Drive URL)
- Output: Transcript text + metadata (duration, language, segments)

**Flow (updated 2026-02-20 — shared Rec+onnect Google account):**
```
Google Meet auto-record → Rec+onnect's Drive (auto-saved by Meet)
        ↓
Meet API: conferenceRecords.recordings.list() → driveDestination.fileId
        ↓
Drive API: files.get(fileId) → download audio
        ↓
Whisper API (audio → text)
        ↓
interview_transcripts table (service_role only)
        ↓
Feedback Synthesis pipeline
```
See `docs/INTERVIEW_RECORDING_FLOW.md` for full recording architecture.

**Storage:** `interview_transcripts` table:
```sql
interview_id UUID → interviews(id)  -- one-to-one
transcript   TEXT                     -- full text (server-side only, NEVER exposed to client)
metadata     JSONB                   -- { duration_seconds, language, segments[] }
```

**Privacy:** Transcript is NEVER sent to other interviewers. Only service_role can read. Only the synthesis pipeline uses it server-side. EU AI Act: text-only analysis, no voice/tone/emotion inference.

**Token management:** 150K soft limit on 200K context window. Truncation: 60% head + 30% tail, marks omission in middle. `estimateTokens()` and `truncateTranscript()` already built in feedback-synthesis prompt.

**What's needed to build (Step 9.7):**
1. `apps/web/src/app/api/transcription/route.ts` — accepts audio, calls Whisper, stores transcript
2. Service-role Supabase client for writing to `interview_transcripts`
3. Google Drive download integration (audio URL → Whisper)
4. Status tracking on `interviews.recording_status` enum

---

### Pipeline 10: Feedback Synthesis

**Purpose:** Cross-reference ALL interviewer feedback (structured forms + optional transcript) and produce highlights. NO hire/no-hire recommendation.

**Status:** Schema, prompt, pipeline BUILT. API route EXISTS but transcript fetch is a stub.

- Model: Opus (temperature 0.1, full effort — this is the most critical AI output)
- Input: `{ candidate_name, role, stage_name, feedback_forms[], transcript? }`
- Output: `FeedbackSynthesis`

**Output Schema (`FeedbackSynthesis`):**
```typescript
{
  summary: string;
  consensus: {
    areas_of_agreement: string[];
    areas_of_disagreement: string[];
  };
  key_strengths: string[];        // Highlights ONLY — no recommendation
  key_concerns: string[];         // Highlights ONLY — no recommendation
  discussion_points: string[];    // Points for team discussion
  rating_overview: {
    average_score: 1-4;
    total_feedback_count: number;
    score_distribution: Array<{ score: 1|2|3|4, count: number }>;
  };
  disclaimer: string;             // MANDATORY: "This AI-generated summary is for informational purposes only. All hiring decisions must be made by humans."
}
```

**Feedback input structure (`FeedbackForm`):**
```typescript
{
  interviewer_name: string;
  ratings: Array<{ category: string, score: 1-4 }>;
  pros: string[];
  cons: string[];
  notes?: string;
}
```

**Blind feedback rules:**
- Interviewers: can only see their OWN feedback until submitted
- Managers/Admins: can see ALL feedback immediately
- Synthesis: only generated AFTER all feedback is submitted (or manually triggered by manager)

**What's needed to complete (Step 9.9):**
1. Wire transcript fetch in `synthesize-feedback/route.ts` using service_role client
2. Persist synthesis result to `ai_synthesis` table (currently only returned, not stored)
3. UI: `AISynthesisPanel` component on Debrief page

**Storage:** `ai_synthesis` table:
```sql
candidate_id   UUID → candidates(id)
synthesis_type TEXT   -- "initial" | "updated" | "final"
content        JSONB  -- FeedbackSynthesis shape
model_used     TEXT
prompt_version TEXT
generated_at   TIMESTAMPTZ
```

---

## 3. Context Injection Chain (Complete)

```
┌──────────────────────────────────────────────────────────────────┐
│                    CHAPTER 1: DISCOVERY                          │
│                                                                  │
│  Market Insights ─────────────────────────────────────────────┐  │
│  (quick + deep)                                               │  │
│       │                                                       │  │
│       │ FULL market_insights                                  │  │
│       ▼                                                       │  │
│  Hiring Strategy                                              │  │
│       │                                                       │  │
│       ├── strategy_context (slim) ──→ JD Generation           │  │
│       │   { salary_positioning,        │                      │  │
│       │     differentiators (3),       │                      │  │
│       │     skills_priority (5+3) }    │                      │  │
│       │                                │                      │  │
│       │── market_context (slim) ──────→┘                      │  │
│       │   { salary_range,                                     │  │
│       │     key_skills (5),                                   │  │
│       │     demand_level,                                     │  │
│       │     competitors (3) }                                 │  │
│       │                                                       │  │
└───────┼───────────────────────────────────────────────────────┘  │
        │                                                          │
┌───────┼──────────────────────────────────────────────────────────┘
│       │           CHAPTER 2: PROCESS                          │
│       │                                                       │
│       ├── strategy_context (slim) ──→ Stage Generation        │
│       │   { market_classification,        │                   │
│       │     process_speed,                │                   │
│       │     skills_priority (5+5),        │                   │
│       │     differentiators (3) }         │                   │
│       │                                   │                   │
│       │── jd_context (slim) ─────────────→┘                   │
│       │   { required_skills (5),                              │
│       │     responsibilities (3),         ├──→ Question Gen   │
│       │     seniority_signals (3),        │    (per focus)    │
│       │     key_requirements (5) }        │                   │
│       │                                   │                   │
│       │                              Coverage Analysis        │
│       │                              (stages vs JD reqs)      │
│       │                                                       │
└───────┼───────────────────────────────────────────────────────┘
        │
┌───────┼───────────────────────────────────────────────────────┐
│       │           CHAPTER 3: ALIGNMENT                        │
│       │                                                       │
│       ├── jd_context ──────────→ Candidate Profile Suggest.   │
│       ├── strategy_context ───→     (AI-assisted, optional)   │
│       └── market_context ────→                                │
│                                                               │
│       [No downstream injection — leaf node]                   │
│                                                               │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                    CHAPTER 4: DEBRIEF                          │
│                                                               │
│  Recording ──→ Google Drive ──→ Whisper ──→ Transcript        │
│                                                ↓              │
│  Feedback Forms (per interviewer) ────────→ Synthesis          │
│    { ratings 1-4, pros, cons, notes }      (Opus, text-only)  │
│                                                               │
│  [No upstream AI context needed — works from human data]      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Key design principle:** Context flows DOWN only. Each context slice is intentionally small (~500 tokens) to avoid overwhelming downstream prompts. Full data stays in DB; AI gets just enough to make good decisions.

---

## 4. Database Tables — AI Data Map

### Tables that STORE AI output

| Table | Column(s) | AI Pipeline Source | Type |
|-------|-----------|-------------------|------|
| `playbooks` | `market_insights` | Market Insights (quick+deep) | JSONB |
| `playbooks` | `hiring_strategy` | Hiring Strategy | JSONB |
| `playbooks` | `job_description` | JD Generation | JSONB |
| `playbooks` | `candidate_profile` | Candidate Profile Suggestions | JSONB |
| `playbooks` | `level`, `industry`, `skills`, `location` | User input (wizard Step 2) | TEXT/JSONB |
| `interview_stages` | `focus_areas` | Stage Generation | JSONB |
| `interview_stages` | `suggested_questions` | Stage/Question Generation | JSONB |
| `ai_research_cache` | `results`, `sources` | Deep Research Pipeline | JSONB |
| `ai_synthesis` | `content` | Feedback Synthesis | JSONB |
| `interview_transcripts` | `transcript`, `metadata` | Whisper Transcription | TEXT/JSONB |

### Tables that FEED AI input

| Table | Used By Pipeline | What's Extracted |
|-------|-----------------|-----------------|
| `playbooks` | Strategy, JD, Stages, Coverage, Candidate Profile | role/level/industry + upstream JSONB |
| `interview_stages` | Coverage Analysis | stage names, types, focus_areas |
| `feedback` | Feedback Synthesis | ratings, pros, cons, notes |
| `interview_transcripts` | Feedback Synthesis | transcript text (service_role only) |
| `interviews` | Transcription, Synthesis | recording_url, interview_id |

### Tables NOT touched by AI

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant scoping |
| `users` | Auth + roles |
| `candidates` | Candidate records (manual) |
| `collaborators` | Invite/access management |
| `share_links` | Public URL tokens |
| `platform_google_config` | Shared Rec+onnect Google account tokens (service_role only) |
| `org_drive_connections` | DEPRECATED — replaced by `platform_google_config` |
| `cms_*` tables | Admin CMS content |
| `audit_log` | Event tracking |

---

## 5. API Route Map

### Built Routes (10)

| Route | Method | Pipeline | Auth |
|-------|--------|----------|------|
| `/api/ai/market-insights` | POST | Quick Market Insights | any user |
| `/api/ai/market-insights/[id]` | GET | Poll deep research status | any user |
| `/api/ai/market-insights/[id]` | POST | Trigger deep research | any user |
| `/api/ai/generate-strategy` | POST | Hiring Strategy | any user |
| `/api/ai/generate-jd` | POST | JD Generation | any user |
| `/api/ai/generate-stages` | POST | Stage Generation | any user |
| `/api/ai/generate-questions` | POST | Question Generation | any user |
| `/api/ai/analyze-coverage` | POST | Coverage Analysis | any user |
| `/api/ai/synthesize-feedback` | POST | Feedback Synthesis (stub) | any user |
| `/api/playbooks/[id]/stages/*` | GET/POST/PATCH/DELETE | Stage CRUD + Reorder | admin/manager |

### Routes Needed (3)

| Route | Method | Pipeline | Step |
|-------|--------|----------|------|
| `/api/ai/generate-candidate-profile` | POST | Candidate Profile Suggestions | 9.1 |
| `/api/transcription` | POST | Whisper Transcription | 9.7 |
| `/api/feedback` | POST/GET | Feedback CRUD (not AI, but feeds synthesis) | 9.8 |

---

## 6. Model Configuration

| Endpoint | Model | Temperature | Max Tokens | Use Case |
|----------|-------|-------------|------------|----------|
| `marketInsights` | claude-opus-4-6 | 0.3 | 4096 | Deep research synthesis |
| `marketInsightsQuick` | claude-sonnet-4-5 | 0.3 | 2048 | Quick preliminary insights |
| `strategyGeneration` | claude-sonnet-4-5 | 0.3 | 2048 | Hiring strategy analysis |
| `jdGeneration` | claude-sonnet-4-5 | 0.4 | 2048 | JD creation (slightly creative) |
| `stageGeneration` | claude-sonnet-4-5 | 0.2 | 1024 | Stage + question structure |
| `questionGeneration` | claude-sonnet-4-5 | 0.3 | 1024 | Per-focus-area questions |
| `coverageAnalysis` | claude-sonnet-4-5 | 0.2 | 1024 | Gap analysis |
| `candidateProfile` | claude-sonnet-4-5 | 0.3 | 1024 | Profile suggestions (TO ADD) |
| `feedbackSynthesis` | claude-opus-4-6 | 0.1 | 4096 | Critical compliance output |
| `queryGeneration` | claude-sonnet-4-5 | 0.5 | 1024 | Search query diversity |
| `sourceScoring` | claude-sonnet-4-5 | 0.1 | 1024 | Deterministic ranking |
| `sourceExtraction` | claude-sonnet-4-5 | 0.1 | 2048 | Structured data extraction |

**Model selection rationale:**
- **Opus** for deep research synthesis (needs broad knowledge + nuance) and feedback synthesis (compliance-critical, must not hallucinate recommendations)
- **Sonnet** for everything else (fast, structured output, cost-efficient)
- **Low temperature** (0.1-0.2) for analysis/scoring (deterministic)
- **Higher temperature** (0.3-0.5) for creative/diverse output (queries, JDs)

---

## 7. Compliance Requirements (EU AI Act + GDPR)

Every AI output in Rec+onnect enforces:

1. **Text-only analysis** — no emotion detection, no voice analysis, no biometric inference
2. **No hire/no-hire recommendation** — AI highlights points, humans decide
3. **Mandatory disclaimer** on every synthesis and strategy output
4. **Full audit trail** — `model_used`, `prompt_version`, `generated_at` on every API response
5. **Prompt versions tracked** in `PROMPT_VERSIONS` config — changes logged
6. **Input sanitization** — all user strings wrapped with `sanitizeInput()` before prompt interpolation
7. **Transcript privacy** — `interview_transcripts` has RLS enabled with NO policies (service_role only)
8. **Recording consent** — `interviews.recording_consent_at` timestamp required before recording
9. **1-year data retention** — auto reachout to candidate after 1 year

---

## 8. Implementation Status + Gap Analysis

### BUILT (Steps 6-8) ✅

| Component | Location | Tests |
|-----------|----------|-------|
| 8 Zod schemas | `packages/ai/src/schemas/` | 27 + 11 + 12 tests |
| 7 prompt templates | `packages/ai/src/prompts/` | 19 + 16 tests |
| 7 pipelines | `packages/ai/src/pipelines/` | 13 tests |
| Anthropic client | `packages/ai/src/client.ts` | - |
| Tavily search | `packages/ai/src/search-client.ts` | - |
| Retry + escalation | `packages/ai/src/retry.ts` | 11 tests |
| Input sanitization | `packages/ai/src/sanitize.ts` | - |
| Error hierarchy | `packages/ai/src/errors.ts` | 6 tests |
| Cache key generation | (in deep-research pipeline) | 6 tests |
| Context injection | (in strategy pipeline) | 8 + 13 tests |
| 10 API routes | `apps/web/src/app/api/ai/` | - |
| Stage CRUD (5 routes) | `apps/web/src/app/api/playbooks/[id]/stages/` | - |
| Discovery page UI | `apps/web/src/components/discovery/` | - |
| Process page UI | `apps/web/src/components/process/` | - |

**Total AI tests: 129/129 passing**

### GAPS — Must Resolve Before Step 9

| # | Gap | Severity | Resolution |
|---|-----|----------|------------|
| G1 | **Candidate Profile pipeline missing** | HIGH | Build schema + prompt + pipeline + API route during Step 9.1 |
| G2 | **Transcript fetch is a stub** | HIGH | Wire service_role client in `synthesize-feedback/route.ts` during Step 9.9 |
| G3 | **Synthesis not persisted to DB** | HIGH | Add `ai_synthesis` INSERT in synthesis route during Step 9.9 |
| G4 | **`questionGeneration` missing from PROMPT_VERSIONS** | LOW | Add `questionGeneration: "1.0.0"` to config — cosmetic but should be tracked |
| G5 | **`candidateProfile` missing from AI_CONFIG** | HIGH | Add endpoint config before Step 9.1 |
| G6 | **Feedback CRUD routes don't exist** | HIGH | Build during Step 9.8 — synthesis has nothing to synthesize without these |
| G7 | **Interview CRUD routes don't exist** | HIGH | Build during Step 9.6-9.7 — recording + scheduling |
| G8 | **Candidate CRUD routes don't exist** | MEDIUM | Build during Step 9.1 — profiles need a place to live |
| G9 | **Blind feedback RLS not verified** | MEDIUM | Verify deployed policies match master plan during Step 9.8 |

### NOT NEEDED (confirmed non-issues)

| Item | Why It's Fine |
|------|--------------|
| Coverage not persisted to DB | By design — derived analysis, regenerate on demand |
| No AI pipeline for collaboration | Collaboration is CRUD + email, not AI |
| No AI pipeline for share links | Token generation, not AI |
| Transcript column on interviews deprecated | Correct — use `interview_transcripts` table |

---

## 9. Estimated Costs

| Pipeline | Model | Est. Tokens | Est. Cost |
|----------|-------|-------------|-----------|
| Market Insights (quick) | Sonnet | ~3K in, ~2K out | ~$0.03 |
| Market Insights (deep) | Opus | ~15K in, ~4K out | ~$0.40 |
| Hiring Strategy | Sonnet | ~4K in, ~2K out | ~$0.05 |
| JD Generation | Sonnet | ~3K in, ~2K out | ~$0.04 |
| Stage Generation | Sonnet | ~3K in, ~1K out | ~$0.03 |
| Question Generation | Sonnet | ~1K in, ~1K out | ~$0.02 |
| Coverage Analysis | Sonnet | ~3K in, ~1K out | ~$0.03 |
| Candidate Profile | Sonnet | ~3K in, ~1K out | ~$0.03 |
| Feedback Synthesis | Opus | ~20K in, ~2K out | ~$0.50 |
| Whisper Transcription | Whisper-1 | ~30 min audio | ~$0.18 |

**Per playbook creation (Steps 1-2): ~$0.60-0.80**
**Per interview debrief (Step 4): ~$0.70-1.00** (transcript + synthesis)
**Per playbook full lifecycle: ~$2-4** depending on interview count

---

## 10. What This Means for Step Files

### Step 8 (Discovery + Process) — COMPLETE
All 7 pipelines for Chapters 1-2 are built and tested. No changes needed.

### Step 9 (Alignment + Debrief) — Changes Required

**9.1 (Candidate Profile):** Add AI suggestions feature:
- Build Pipeline 8 (candidate-profile schema + prompt + pipeline + route)
- Add `candidateProfile` to `AI_CONFIG` + `PROMPT_VERSIONS`
- UI: "AI Suggestions" button on CandidateProfileBuilder

**9.7 (Transcription):** Build Pipeline 9:
- Whisper API route with service_role client
- Google Drive audio download
- `interview_transcripts` INSERT

**9.8 (Feedback Forms):** Build feedback CRUD:
- POST/GET `/api/feedback` with blind access rules
- Verify blind feedback RLS policies

**9.9 (AI Synthesis):** Complete Pipeline 10:
- Wire transcript fetch via service_role in synthesis route
- Add `ai_synthesis` INSERT after successful synthesis
- UI: `AISynthesisPanel` on Debrief page

### Step 10 (Integrations) — No AI Changes
Drive OAuth + recording storage are infrastructure, not AI pipelines. The transcription pipeline (Step 9.7) depends on Drive being connected but the pipeline code itself lives in Step 9.

---

## Appendix: File Locations

```
packages/ai/src/
├── config.ts                    # Model endpoints + prompt versions
├── client.ts                    # Anthropic SDK wrapper
├── search-client.ts             # Tavily search wrapper
├── errors.ts                    # Error hierarchy
├── retry.ts                     # withRetry + withModelEscalation
├── sanitize.ts                  # Input sanitization
├── index.ts                     # Barrel exports
├── schemas/
│   ├── market-insights.ts       # MarketInsightsSchema, QuickMarketInsightsSchema
│   ├── job-description.ts       # JobDescriptionSchema
│   ├── interview-stage.ts       # InterviewStageSchema, FocusAreaSchema, QuestionsForFocusAreaSchema
│   ├── hiring-strategy.ts       # HiringStrategySchema
│   ├── coverage-analysis.ts     # CoverageAnalysisSchema
│   ├── feedback-synthesis.ts    # FeedbackSynthesisSchema
│   ├── search-results.ts        # SearchQueriesSchema, SourceScoringSchema, SourceExtractionSchema
│   └── index.ts
├── prompts/
│   ├── compliance.ts            # Shared EU AI Act compliance instructions
│   ├── market-insights.ts       # Deep research system/user prompts
│   ├── jd-generation.ts         # JD prompt with strategy_context
│   ├── stage-generation.ts      # Stage + question prompts with strategy_context
│   ├── strategy-generation.ts   # Hiring strategy prompt
│   ├── coverage-analysis.ts     # Coverage audit prompt
│   ├── feedback-synthesis.ts    # Synthesis prompt + token management
│   └── index.ts
├── pipelines/
│   ├── deep-research.ts         # 6-step deep research pipeline
│   ├── market-insights.ts       # Quick + deep market insights
│   ├── jd-generation.ts         # JD pipeline with context builders
│   ├── stage-generation.ts      # Stage pipeline + question generation
│   ├── strategy-generation.ts   # Strategy pipeline + context builders
│   ├── coverage-analysis.ts     # Coverage pipeline
│   ├── feedback-synthesis.ts    # Synthesis pipeline + token truncation
│   └── index.ts
└── __tests__/                   # 129 tests across 10 test files

apps/web/src/app/api/ai/
├── market-insights/
│   ├── route.ts                 # POST: quick insights
│   └── [id]/route.ts            # GET: poll, POST: trigger deep
├── generate-jd/route.ts         # POST: JD generation
├── generate-stages/route.ts     # POST: stage generation
├── generate-questions/route.ts  # POST: per-focus-area questions
├── generate-strategy/route.ts   # POST: hiring strategy
├── analyze-coverage/route.ts    # POST: coverage analysis
└── synthesize-feedback/route.ts # POST: feedback synthesis (transcript stub)

packages/database/src/
├── types.ts                     # Auto-generated from Supabase (21 migrations)
├── domain-types.ts              # Manual type overlays (HiringStrategy, CoverageAnalysis, etc.)
└── index.ts                     # Barrel exports
```
