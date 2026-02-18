# Rec+onnect AI Intelligence Engine

**Proprietary Deep Research Pipeline — Why This Isn't ChatGPT**

---

## The Problem with Generic AI

If a recruiter opens ChatGPT and asks "What should I pay a Senior Backend Engineer in Dublin?", they get:

> "Typically between 60,000 and 90,000 EUR..."

No sources. No confidence level. No context on whether that's current. No link to the rest of their hiring process. They copy-paste it into a spreadsheet and move on.

**Rec+onnect doesn't do that.**

---

## What Rec+onnect Does Instead

### 1. Deep Research Pipeline (Market Insights)

When a hiring manager creates a playbook for "Senior Backend Engineer, FinTech, Dublin", the system doesn't ask one AI model one question. It runs a **6-step research pipeline** that mirrors how a senior recruitment consultant would actually research a role:

```
Step 1: QUERY GENERATION
────────────────────────
AI generates 8-12 targeted search queries:
  • "senior backend engineer salary dublin 2025 2026"
  • "fintech hiring trends ireland Q1 2026"
  • "backend developer demand dublin glassdoor"
  • "irish fintech companies actively hiring engineers"
  • "software engineer compensation survey ireland"
  • "dublin tech salary benchmark morgan mckinney"
  • ... (8-12 queries, tailored to role + location + industry)

Step 2: LIVE WEB SEARCH
────────────────────────
All queries execute simultaneously via Tavily Search API.
~50 raw results collected, deduplicated to ~25 unique sources.
This is LIVE data — not training data from months ago.

Step 3: SOURCE SCORING
──────────────────────
AI ranks sources by:
  • Recency: Prefer data from last 6 months
  • Authority: Salary surveys > job boards > blog posts > forums
  • Relevance: Exact role match > adjacent roles
Top 12-15 sources selected for deep analysis.

Step 4: PARALLEL EXTRACTION
───────────────────────────
For EACH source (in parallel):
  • Fetch and read full page content
  • Extract structured data points:
    - Salary figures with context
    - Market demand signals
    - Company names hiring for this role
    - Trend observations
    - Source publication date
    - Data confidence rating

Step 5: CROSS-REFERENCING (the key differentiator)
───────────────────────────────────────────────────
All 12-15 extractions fed into a single high-quality synthesis:

  "Salary: 5 sources report 65-85K, 3 sources report 70-95K for
   FinTech specifically. Weighted consensus: €68-88K. The higher
   range (70-95K) correlates with FinTech-specific sources
   (Morgan McKinney 2025 survey, Glassdoor n=234) — FinTech
   commands a 10-15% premium over general tech roles."

  "Demand: HIGH — 342 open positions on IrishJobs matching this
   profile (up 28% YoY per CSO data). 8/12 sources describe
   demand as 'strong' or 'very high'."

  "Key competitors hiring: Stripe (12 roles), Intercom (8),
   Fenergo (6), PTSB (4) — cross-referenced across LinkedIn,
   IrishJobs, and company career pages."

  "Emerging trend: 4 of 5 recent salary surveys note 15-20%
   premium for AI/ML experience in backend roles."

  Confidence: HIGH (12 sources agree on core data)

Step 6: VALIDATION
──────────────────
  • Salary min < max? ✓
  • At least 3 sources cited? ✓ (12 used)
  • No hallucinated URLs? ✓ (all from live search)
  • Date range reasonable? ✓ (all within 12 months)
  • Currency correct (EUR)? ✓
```

**Result: Not a guess. A researched, sourced, cross-referenced market analysis.**

---

### 2. Chained Intelligence (Not Isolated Calls)

The outputs aren't disconnected. Each AI step feeds the next with targeted context:

```
Market Insights (deep research, live data)
    │
    │ injects: salary_range, key_skills, demand_level, competitors
    ▼
Job Description Generation (informed by market reality)
    │
    │ injects: responsibilities, requirements, seniority signals
    ▼
Interview Stage Generation (aligned with JD and market)
    │
    │ injects: focus_areas, suggested_questions, role context
    ▼
  ┌───────── each stage has ─────────┐
  │ 2-3 focus areas (targeted)       │
  │ 3-5 questions per focus area     │
  │ Scoring criteria (1-4 scale)     │
  │ Time allocation                  │
  └──────────────────────────────────┘
    │
    │ After interviews, collects:
    │ structured feedback + transcript
    ▼
Feedback Synthesis (EU AI Act compliant)
    • Text-only analysis
    • Cross-references ALL interviewer feedback
    • Highlights agreement + disagreement
    • Identifies key strengths and concerns
    • NO hire/no-hire recommendation
    • Human review disclaimer mandatory
```

**Each step builds on the previous.** The JD knows the salary is competitive and the market is tight. The interview stages know the JD emphasises distributed systems. The questions know which focus areas matter most for this specific role in this specific market.

---

### 3. Two-Phase UX (Instant + Deep)

Users don't wait 30 seconds staring at a spinner:

```
User clicks "Generate Insights"
    │
    ├── Phase 1 (3-5 seconds): QUICK INSIGHTS
    │   Claude generates preliminary data from training knowledge.
    │   Displayed immediately with "Preliminary" badge.
    │   User can start reading and working.
    │
    └── Phase 2 (15-30 seconds, background): DEEP RESEARCH
        Full 6-step pipeline runs in background.
        When complete:
        • UI updates seamlessly with "Research Complete" badge
        • Source count displayed: "Based on 14 sources"
        • Citations panel available
        • Confidence levels shown per data point
```

---

### 4. 30-Day Intelligent Cache

Same role + level + industry + location within 30 days = instant results from cache. No redundant research. When a new playbook is created for "Senior Backend Engineer, FinTech, Dublin" and one was researched 2 weeks ago, the system serves cached insights immediately with a "Refresh" option.

Cache is per-organization, so different companies don't see each other's data.

---

### 5. Global with Irish Market Priority

Toggle between:
- **Irish market focus** (default): Queries tuned for Ireland, EUR currency, Irish salary surveys prioritised, Irish job boards searched first
- **Global**: Broader search, multi-currency support, international benchmarks

---

## Why This Isn't ChatGPT

| Aspect | ChatGPT | Rec+onnect AI Engine |
|--------|---------|---------------------|
| **Data freshness** | Training data (months old) | Live web search (today's data) |
| **Sources** | Unknown, unverifiable | 12-15 cited sources per query |
| **Cross-referencing** | Single response | Consensus from multiple sources, contradictions flagged |
| **Output format** | Free text (copy-paste) | Structured, validated, feeds next step |
| **Context** | Each chat is isolated | Chained pipeline — each step builds on previous |
| **Irish market** | Generic global knowledge | Irish salary surveys, IrishJobs, CSO data, local companies |
| **Compliance** | None | EU AI Act guardrails, GDPR, human review disclaimers |
| **Audit trail** | None | Model used, prompt version, sources, timestamps on every output |
| **Integration** | Copy-paste into tools | Lives in the hiring workflow — insights → JD → stages → feedback → synthesis |
| **Confidence** | "Typically..." | "HIGH (12/14 sources agree)" with per-field confidence |
| **Caching** | None | 30-day intelligent cache, instant on repeat queries |

---

## Compliance Built-In (EU AI Act)

Every AI output in Rec+onnect enforces:

- **Text-only analysis** — no emotion detection, no voice analysis, no biometric inference
- **No hire/no-hire recommendation** — AI highlights, humans decide
- **Mandatory disclaimer** on every synthesis: *"This AI-generated content is for informational purposes only. All hiring decisions must be made by humans."*
- **Full audit trail** — model used, prompt version, generation timestamp, sources cited
- **1-4 rating scale** on feedback — structured, not subjective AI scoring

---

## Technical Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Deep Research | Tavily Search API + Claude | Live web search + multi-source synthesis |
| Quick Generation | Claude Sonnet 4.5 | Fast JD, stages, questions (3-5s) |
| Deep Analysis | Claude Opus 4.6 | Market synthesis, feedback analysis |
| Transcription | OpenAI Whisper | Interview recording → text |
| Validation | Zod schemas | Every AI output validated against strict types |
| Caching | Supabase (30-day) | Avoid redundant research |
| Error Recovery | Retry with escalation | Sonnet fails → retry → escalate to Opus |

**Estimated cost per playbook creation: ~$0.30-0.50** (search + Claude calls)
**Estimated cost per feedback synthesis: ~$0.10-0.20** (depending on transcript length)

---

## What This Means for the Product

Rec+onnect isn't a chatbot wrapper. It's a **research engine that happens to use AI**. The value isn't "we have AI" — the value is:

1. **Live, sourced market data** that a recruiter would spend hours gathering manually
2. **Connected intelligence** where every step of the hiring process informs the next
3. **Compliant by design** — EU AI Act and GDPR from day one
4. **Auditable** — every AI decision has a paper trail

This is the moat. This is why a hiring manager uses Rec+onnect instead of opening ChatGPT.
