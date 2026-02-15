# Step 6 — AI Platform Setup (Claude + Schemas + Prompts)

**Status:** NOT STARTED
**Week:** 2 (Day 2-4)
**Default Owners:** AI Engineer + Security

---

## Goal

Create a safe, structured AI layer that never ships "free-form" outputs.

---

## Deliverables

- Claude client config (Opus 4.6 for deep research + synthesis, Sonnet 4.5 for fast ops)
- Zod schemas (JD, Market Insights, Stages, Synthesis — NO recommendation schema)
- Prompt templates with strict JSON-only outputs
- AI tone: Professional / Friendly (client decision)
- AI generation constraints: 2-3 focus areas per stage, 3-5 questions per focus area
- Basic error handling & output validation
- "prompt_version" + "model_used" capture plan
- Rating scale: 1-4 (NOT 1-5)

---

## Definition of Done (Step Level)

- [ ] API test route returns schema-valid JSON
- [ ] Validation failures handled gracefully (no app crash)
- [ ] Compliance guardrails documented
- [ ] Golden tests for each AI endpoint
- [ ] All micro steps complete

---

## Micro Steps

### 6.1 — Create Claude Client Configuration

**Owner:** AI Engineer
**Supporting:** Backend
**Status:** PENDING
**Branch:** `step06-1-claude-client`

**Allowed Paths:**
- `packages/ai/src/client.ts`
- `packages/ai/src/config.ts`

**Tasks:**
- [ ] Create AI configuration:
```typescript
// packages/ai/src/config.ts
export const AI_CONFIG = {
  marketInsights: {
    model: 'claude-opus-4-6',               // Deep research, full effort
    temperature: 0.3,
    maxTokens: 4096,
    description: 'Deep market research, complex analysis',
  },
  jdGeneration: {
    model: 'claude-sonnet-4-5-20250929',    // Fast JD generation
    temperature: 0.4,
    maxTokens: 2048,
    description: 'Job description generation',
  },
  stageGeneration: {
    model: 'claude-sonnet-4-5-20250929',    // Stage + question generation
    temperature: 0.2,
    maxTokens: 1024,
    description: 'Interview stage generation',
  },
  questionGeneration: {
    model: 'claude-sonnet-4-5-20250929',    // Question generation
    temperature: 0.3,
    maxTokens: 1024,
    description: 'Interview question generation',
    // Constraint: 3-5 questions per focus area
  },
  feedbackSynthesis: {
    model: 'claude-opus-4-6',               // Compliant synthesis, full effort
    temperature: 0.1,
    maxTokens: 2048,
    description: 'Feedback synthesis (text-only, highlights only, NO recommendation)',
  },
} as const;

export type AIEndpoint = keyof typeof AI_CONFIG;
```

- [ ] Create Claude client:
```typescript
// packages/ai/src/client.ts
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG, type AIEndpoint } from './config';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function callClaude<T>({
  endpoint,
  prompt,
  systemPrompt,
}: {
  endpoint: AIEndpoint;
  prompt: string;
  systemPrompt?: string;
}): Promise<{ content: string; model: string }> {
  const config = AI_CONFIG[endpoint];

  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Expected text response from Claude');
  }

  return {
    content: content.text,
    model: config.model,
  };
}

export { anthropic };
```

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
```

**Output:** Claude client configured

---

### 6.2 — Create Zod Schemas for AI Outputs

**Owner:** AI Engineer
**Supporting:** Architect
**Status:** PENDING
**Branch:** `step06-2-zod-schemas`

**Allowed Paths:**
- `packages/ai/src/schemas/**`

**Tasks:**
- [ ] Create Market Insights schema:
```typescript
// packages/ai/src/schemas/market-insights.ts
import { z } from 'zod';

export const MarketInsightsSchema = z.object({
  salary: z.object({
    min: z.number(),
    max: z.number(),
    median: z.number(),
    currency: z.string().default('EUR'),
    source: z.string(),
    confidence: z.number().min(0).max(1),
  }),
  competition: z.object({
    companies_hiring: z.array(z.string()),
    job_postings_count: z.number(),
    market_saturation: z.enum(['low', 'medium', 'high']),
  }),
  time_to_hire: z.object({
    average_days: z.number(),
    range: z.object({ min: z.number(), max: z.number() }),
  }),
  candidate_availability: z.object({
    level: z.enum(['scarce', 'limited', 'moderate', 'abundant']),
    description: z.string(),
  }),
  key_skills: z.object({
    required: z.array(z.string()),
    emerging: z.array(z.string()),
    declining: z.array(z.string()),
  }),
  trends: z.array(z.string()),
});

export type MarketInsights = z.infer<typeof MarketInsightsSchema>;
```

- [ ] Create Job Description schema:
```typescript
// packages/ai/src/schemas/job-description.ts
import { z } from 'zod';

export const JobDescriptionSchema = z.object({
  title: z.string(),
  summary: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.object({
    required: z.array(z.string()),
    preferred: z.array(z.string()),
  }),
  benefits: z.array(z.string()),
  salary_range: z.object({
    min: z.number(),
    max: z.number(),
    currency: z.string().default('EUR'),
  }).optional(),
  location: z.string().optional(),
  remote_policy: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type JobDescription = z.infer<typeof JobDescriptionSchema>;
```

- [ ] Create Interview Stage schema:
```typescript
// packages/ai/src/schemas/interview-stage.ts
import { z } from 'zod';

export const InterviewStageSchema = z.object({
  name: z.string(),
  type: z.enum(['screening', 'technical', 'behavioral', 'cultural', 'final', 'custom']),
  duration_minutes: z.number(),
  description: z.string(),
  focus_areas: z.array(z.object({        // 2-3 per interview (client requirement)
    name: z.string(),
    weight: z.number().min(1).max(4),    // 1-4 scale (aligned with feedback)
  })).min(2).max(3),
  suggested_questions: z.array(z.object({ // 3-5 per focus area (client requirement)
    question: z.string(),
    purpose: z.string(),
    look_for: z.array(z.string()),
  })).min(3).max(5),
});

export const InterviewStagesSchema = z.array(InterviewStageSchema);

export type InterviewStage = z.infer<typeof InterviewStageSchema>;
```

- [ ] Create Feedback Synthesis schema:
```typescript
// packages/ai/src/schemas/feedback-synthesis.ts
import { z } from 'zod';

// NO hire/no-hire recommendation — highlights only (client decision)
export const FeedbackSynthesisSchema = z.object({
  summary: z.string(),
  consensus: z.object({
    areas_of_agreement: z.array(z.string()),
    areas_of_disagreement: z.array(z.string()),
  }),
  key_strengths: z.array(z.string()),       // Highlight points
  key_concerns: z.array(z.string()),        // Highlight points
  discussion_points: z.array(z.string()),   // For hiring team discussion
  rating_overview: z.object({
    average_score: z.number(),              // Average across 1-4 scale
    total_feedback_count: z.number(),
    score_distribution: z.array(z.object({
      score: z.number().min(1).max(4),
      count: z.number(),
    })),
  }),
  // NO recommendation_breakdown — human decides
  disclaimer: z.string(), // MANDATORY
});

export type FeedbackSynthesis = z.infer<typeof FeedbackSynthesisSchema>;
```

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
```

**Output:** All Zod schemas created

---

### 6.3 — Create Prompt Templates

**Owner:** AI Engineer (Opus)
**Supporting:** Security
**Status:** PENDING
**Branch:** `step06-3-prompt-templates`

**Allowed Paths:**
- `packages/ai/src/prompts/**`

**Tasks:**
- [ ] Create base compliance prompt:
```typescript
// packages/ai/src/prompts/compliance.ts
export const COMPLIANCE_SYSTEM_PROMPT = `
COMPLIANCE REQUIREMENTS (MANDATORY - EU AI Act):
- You MUST analyze TEXT ONLY
- You MUST NOT infer emotions from voice, video, or any biometric data
- You MUST NOT detect deception, lies, or truthfulness
- You MUST NOT analyze hesitation, confidence, or tone from audio
- You MUST NOT provide behavioral manipulation or covert persuasion

For any synthesis or recommendation:
- Include this disclaimer: "This AI-generated content is for informational purposes only. All hiring decisions must be made by humans."
- Never recommend rejecting a candidate without human review
- Focus on factual, text-based information only

OUTPUT FORMAT:
Return ONLY valid JSON matching the specified schema.
No markdown code blocks. No explanations outside the JSON.
`;
```

- [ ] Create JD generation prompt:
```typescript
// packages/ai/src/prompts/jd-generation.ts
export const JD_GENERATION_PROMPT = {
  version: '1.0.0',
  system: `You are an expert HR consultant generating job descriptions for the Irish market.
${COMPLIANCE_SYSTEM_PROMPT}`,

  user: (input: {
    role: string;
    level: string;
    industry: string;
    company_context?: string;
    style: 'formal' | 'creative' | 'concise';  // User always selects (no default)
    currency?: string;                           // Auto-detect, mostly EUR
  }) => `
Generate a job description for:
- Role: ${input.role}
- Level: ${input.level}
- Industry: ${input.industry}
${input.company_context ? `- Company Context: ${input.company_context}` : ''}
- Style: ${input.style}
- Tone: Professional and friendly

Style guidelines:
- formal: Professional, corporate language
- creative: Engaging, modern startup tone
- concise: Short, bullet-point focused

Length: Standard (user can edit afterwards).
Include Ireland-specific considerations (visa sponsorship mention if relevant, remote work policies).
Currency: ${input.currency || 'EUR'} (auto-detect based on job location).

Return JSON matching this structure:
{
  "title": "string",
  "summary": "string (2-3 sentences)",
  "responsibilities": ["string"],
  "requirements": {
    "required": ["string"],
    "preferred": ["string"]
  },
  "benefits": ["string"],
  "salary_range": { "min": number, "max": number, "currency": "${input.currency || 'EUR'}" },
  "location": "string",
  "remote_policy": "string",
  "confidence": number (0-1)
}
`,
};
```

- [ ] Create market insights prompt
- [ ] Create stage generation prompt
- [ ] Create feedback synthesis prompt (with strict compliance)

**Compliance Checklist:**
- [ ] All prompts include compliance instructions
- [ ] Feedback synthesis is text-only
- [ ] Disclaimer is mandatory
- [ ] No emotion/biometric language

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
```

**Output:** Prompt templates with compliance

---

### 6.4 — Create Validation & Error Handling

**Owner:** AI Engineer
**Supporting:** Backend
**Status:** PENDING
**Branch:** `step06-4-validation`

**Allowed Paths:**
- `packages/ai/src/validation.ts`
- `packages/ai/src/errors.ts`

**Tasks:**
- [ ] Create error classes:
```typescript
// packages/ai/src/errors.ts
export class AIError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AIError';
  }
}

export class AIValidationError extends AIError {
  constructor(public issues: any[]) {
    super('AI response validation failed', 'VALIDATION_ERROR');
  }
}

export class AIRateLimitError extends AIError {
  constructor(public retryAfter?: number) {
    super('AI rate limit exceeded', 'RATE_LIMIT');
  }
}

export class AITimeoutError extends AIError {
  constructor() {
    super('AI request timed out', 'TIMEOUT');
  }
}
```

- [ ] Create validation utility:
```typescript
// packages/ai/src/validation.ts
import { z } from 'zod';
import { AIValidationError } from './errors';

export async function validateAndParse<T>(
  content: string,
  schema: z.ZodSchema<T>
): Promise<T> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new AIValidationError([{ message: 'Invalid JSON response' }]);
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    console.error('Schema validation failed:', result.error.issues);
    throw new AIValidationError(result.error.issues);
  }

  return result.data;
}
```

- [ ] Create retry logic:
```typescript
// packages/ai/src/retry.ts
import { AIRateLimitError, AITimeoutError } from './errors';

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 16000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof AIRateLimitError) {
        const delay = Math.min(
          error.retryAfter ?? baseDelay * Math.pow(2, attempt),
          maxDelay
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (attempt === maxRetries) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, baseDelay * Math.pow(2, attempt))
      );
    }
  }

  throw lastError;
}
```

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
```

**Output:** Error handling and validation utilities

---

### 6.5 — Create AI API Routes

**Owner:** AI Engineer
**Supporting:** Backend
**Status:** PENDING
**Branch:** `step06-5-ai-routes`

**Allowed Paths:**
- `apps/web/src/app/api/ai/**`

**Tasks:**
- [ ] Create market insights route:
```typescript
// apps/web/src/app/api/ai/market-insights/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callClaude } from '@reconnect/ai';
import { MarketInsightsSchema } from '@reconnect/ai/schemas';
import { validateAndParse, withRetry } from '@reconnect/ai/validation';
import { MARKET_INSIGHTS_PROMPT } from '@reconnect/ai/prompts';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { role, level, industry } = body;

  try {
    const response = await withRetry(() =>
      callClaude({
        endpoint: 'marketInsights',
        prompt: MARKET_INSIGHTS_PROMPT.user({ role, level, industry }),
        systemPrompt: MARKET_INSIGHTS_PROMPT.system,
      })
    );

    const insights = await validateAndParse(
      response.content,
      MarketInsightsSchema
    );

    return NextResponse.json({
      data: insights,
      metadata: {
        model_used: response.model,
        prompt_version: MARKET_INSIGHTS_PROMPT.version,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Market insights error:', error);
    return NextResponse.json(
      { error: 'Failed to generate market insights' },
      { status: 500 }
    );
  }
}
```

- [ ] Create JD generation route
- [ ] Create stage generation route
- [ ] Create feedback synthesis route

**DoD Commands:**
```bash
pnpm lint && pnpm typecheck
# Test routes with Thunder Client or curl
```

**Output:** AI API routes created

---

### 6.6 — Create Golden Tests

**Owner:** QA
**Supporting:** AI Engineer
**Status:** PENDING
**Branch:** `step06-6-golden-tests`

**Allowed Paths:**
- `packages/ai/src/__tests__/**`

**Tasks:**
- [ ] Create schema validation tests:
```typescript
// packages/ai/src/__tests__/schemas.test.ts
import { describe, it, expect } from 'vitest';
import { MarketInsightsSchema, JobDescriptionSchema } from '../schemas';

describe('MarketInsightsSchema', () => {
  it('validates valid market insights', () => {
    const valid = {
      salary: { min: 50000, max: 80000, median: 65000, currency: 'EUR', source: 'market data', confidence: 0.8 },
      competition: { companies_hiring: ['Company A'], job_postings_count: 50, market_saturation: 'medium' },
      time_to_hire: { average_days: 30, range: { min: 14, max: 60 } },
      candidate_availability: { level: 'moderate', description: 'Good pool' },
      key_skills: { required: ['skill1'], emerging: ['skill2'], declining: [] },
      trends: ['trend1'],
    };
    expect(MarketInsightsSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid market insights', () => {
    const invalid = { salary: 'not an object' };
    expect(MarketInsightsSchema.safeParse(invalid).success).toBe(false);
  });
});
```

- [ ] Create edge case tests:
```typescript
describe('Edge cases', () => {
  it('handles empty arrays', () => {
    // Test with empty skills arrays
  });

  it('handles long text', () => {
    // Test with very long descriptions
  });

  it('handles special characters', () => {
    // Test with unicode, quotes, etc.
  });
});
```

- [ ] Create compliance tests:
```typescript
describe('Compliance', () => {
  it('feedback synthesis includes disclaimer', () => {
    // Verify disclaimer field is required
  });
});
```

**DoD Commands:**
```bash
pnpm test -- packages/ai
```

**Output:** Golden tests passing

---

## Completion Checklist

| Micro Step | Owner | Status | Branch |
|------------|-------|--------|--------|
| 6.1 Claude Client | AI Engineer | PENDING | step06-1-claude-client |
| 6.2 Zod Schemas | AI Engineer | PENDING | step06-2-zod-schemas |
| 6.3 Prompt Templates | AI Engineer | PENDING | step06-3-prompt-templates |
| 6.4 Validation | AI Engineer | PENDING | step06-4-validation |
| 6.5 AI Routes | AI Engineer | PENDING | step06-5-ai-routes |
| 6.6 Golden Tests | QA | PENDING | step06-6-golden-tests |

---

## Dependencies

- **Blocks:** Step 7 (Playbook Creation), Step 8 (Discovery + Process)
- **Blocked By:** Step 2 (Monorepo)

---

## Compliance Gate (MANDATORY)

Before any AI feature ships:

- [ ] Text-based analysis only
- [ ] No emotion inference from voice/video
- [ ] No lie detection or deception analysis
- [ ] Human review disclaimer present
- [ ] Output validated against Zod schema
- [ ] Metadata tracked (model, version, timestamp)
- [ ] Golden tests passing
