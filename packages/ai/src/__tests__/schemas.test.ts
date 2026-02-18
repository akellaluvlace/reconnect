import { describe, it, expect } from "vitest";
import {
  MarketInsightsSchema,
  QuickMarketInsightsSchema,
  JobDescriptionSchema,
  InterviewStageSchema,
  InterviewStagesSchema,
  FeedbackSynthesisSchema,
  QuestionsForFocusAreaSchema,
  SearchQueriesSchema,
  SourceScoringSchema,
  SourceExtractionSchema,
} from "../schemas";

describe("MarketInsightsSchema", () => {
  const validDeep = {
    phase: "deep",
    salary: {
      min: 50000,
      max: 80000,
      median: 65000,
      currency: "EUR",
      confidence: 0.85,
    },
    competition: {
      companies_hiring: ["Accenture", "Deloitte"],
      job_postings_count: 120,
      market_saturation: "medium",
    },
    time_to_hire: {
      average_days: 35,
      range: { min: 14, max: 60 },
    },
    candidate_availability: {
      level: "moderate",
      description: "Good pool of candidates in Dublin area",
    },
    key_skills: {
      required: ["TypeScript", "React"],
      emerging: ["AI/ML", "Rust"],
      declining: ["jQuery"],
    },
    trends: ["Remote-first adoption", "AI integration roles growing"],
    sources: [
      {
        url: "https://example.com/salary-survey",
        title: "2026 Salary Survey",
        relevance_score: 0.9,
      },
    ],
    metadata: {
      model_used: "claude-opus-4-6",
      prompt_version: "1.0.0",
      generated_at: "2026-02-19T10:00:00Z",
      source_count: 5,
      confidence: 0.82,
    },
  };

  it("validates valid deep market insights", () => {
    expect(MarketInsightsSchema.safeParse(validDeep).success).toBe(true);
  });

  it("validates without optional sources", () => {
    const { sources, ...withoutSources } = validDeep;
    expect(MarketInsightsSchema.safeParse(withoutSources).success).toBe(true);
  });

  it("rejects invalid salary confidence > 1", () => {
    const invalid = {
      ...validDeep,
      salary: { ...validDeep.salary, confidence: 1.5 },
    };
    expect(MarketInsightsSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects invalid market_saturation value", () => {
    const invalid = {
      ...validDeep,
      competition: { ...validDeep.competition, market_saturation: "extreme" },
    };
    expect(MarketInsightsSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(MarketInsightsSchema.safeParse({}).success).toBe(false);
    expect(MarketInsightsSchema.safeParse({ salary: "bad" }).success).toBe(
      false,
    );
  });
});

describe("QuickMarketInsightsSchema", () => {
  it("validates quick phase", () => {
    const valid = {
      phase: "quick",
      salary: {
        min: 45000,
        max: 75000,
        median: 60000,
        currency: "EUR",
        confidence: 0.6,
      },
      competition: {
        companies_hiring: ["Google"],
        job_postings_count: 50,
        market_saturation: "low",
      },
      time_to_hire: { average_days: 28, range: { min: 14, max: 45 } },
      candidate_availability: { level: "limited", description: "Scarce pool" },
      key_skills: {
        required: ["Python"],
        emerging: ["Go"],
        declining: [],
      },
      trends: ["Growing demand"],
    };
    expect(QuickMarketInsightsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects deep phase", () => {
    const invalid = {
      phase: "deep",
      salary: {
        min: 45000,
        max: 75000,
        median: 60000,
        currency: "EUR",
        confidence: 0.6,
      },
      competition: {
        companies_hiring: [],
        job_postings_count: 0,
        market_saturation: "low",
      },
      time_to_hire: { average_days: 28, range: { min: 14, max: 45 } },
      candidate_availability: { level: "moderate", description: "OK" },
      key_skills: { required: [], emerging: [], declining: [] },
      trends: [],
    };
    expect(QuickMarketInsightsSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("JobDescriptionSchema", () => {
  it("validates a full JD", () => {
    const valid = {
      title: "Senior Software Engineer",
      summary: "Join our team to build amazing products.",
      responsibilities: ["Lead development", "Code reviews"],
      requirements: {
        required: ["5+ years experience", "TypeScript"],
        preferred: ["AWS experience"],
      },
      benefits: ["Health insurance", "Remote work"],
      salary_range: { min: 70000, max: 100000, currency: "EUR" },
      location: "Dublin, Ireland",
      remote_policy: "Hybrid — 2 days in office",
      seniority_signals: ["lead development", "mentor junior engineers"],
      confidence: 0.88,
    };
    expect(JobDescriptionSchema.safeParse(valid).success).toBe(true);
  });

  it("validates with minimal fields", () => {
    const minimal = {
      title: "Developer",
      summary: "A role.",
      responsibilities: ["Code"],
      requirements: { required: ["JS"], preferred: [] },
      benefits: [],
      confidence: 0.5,
    };
    expect(JobDescriptionSchema.safeParse(minimal).success).toBe(true);
  });

  it("rejects confidence > 1", () => {
    const invalid = {
      title: "Dev",
      summary: "X",
      responsibilities: [],
      requirements: { required: [], preferred: [] },
      benefits: [],
      confidence: 2,
    };
    expect(JobDescriptionSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("InterviewStageSchema", () => {
  const validStage = {
    name: "Technical Interview",
    type: "technical",
    duration_minutes: 60,
    description: "Deep technical assessment",
    focus_areas: [
      {
        name: "System Design",
        description: "Architecture skills",
        weight: 3,
      },
      { name: "Coding", description: "Implementation skills", weight: 4 },
    ],
    suggested_questions: [
      {
        question: "Design a URL shortener",
        purpose: "Assess system design skills",
        look_for: ["scalability", "trade-offs"],
        focus_area: "System Design",
      },
      {
        question: "Implement a LRU cache",
        purpose: "Assess coding ability",
        look_for: ["efficiency", "correctness"],
        focus_area: "Coding",
      },
      {
        question: "Explain your debugging process",
        purpose: "Assess problem-solving",
        look_for: ["methodology", "tools"],
        focus_area: "Coding",
      },
      {
        question: "Design a chat system",
        purpose: "Real-time architecture",
        look_for: ["WebSocket", "scaling"],
        focus_area: "System Design",
      },
      {
        question: "Code review this snippet",
        purpose: "Code quality awareness",
        look_for: ["bugs", "improvements"],
        focus_area: "Coding",
      },
      {
        question: "Database schema for e-commerce",
        purpose: "Data modeling",
        look_for: ["normalization", "indexes"],
        focus_area: "System Design",
      },
    ],
  };

  it("validates a valid stage with 2 focus areas", () => {
    expect(InterviewStageSchema.safeParse(validStage).success).toBe(true);
  });

  it("rejects fewer than 2 focus areas", () => {
    const invalid = {
      ...validStage,
      focus_areas: [validStage.focus_areas[0]],
    };
    expect(InterviewStageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects more than 3 focus areas", () => {
    const invalid = {
      ...validStage,
      focus_areas: [
        ...validStage.focus_areas,
        { name: "A", description: "B", weight: 1 },
        { name: "C", description: "D", weight: 2 },
      ],
    };
    expect(InterviewStageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects weight > 4", () => {
    const invalid = {
      ...validStage,
      focus_areas: [
        { ...validStage.focus_areas[0], weight: 5 },
        validStage.focus_areas[1],
      ],
    };
    expect(InterviewStageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects fewer than 6 questions", () => {
    const invalid = {
      ...validStage,
      suggested_questions: validStage.suggested_questions.slice(0, 5),
    };
    expect(InterviewStageSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("InterviewStagesSchema", () => {
  it("validates array of stages", () => {
    const valid = {
      stages: [
        {
          name: "Screen",
          type: "screening",
          duration_minutes: 30,
          description: "Initial screen",
          focus_areas: [
            { name: "Culture", description: "Fit", weight: 2 },
            { name: "Motivation", description: "Why", weight: 2 },
          ],
          suggested_questions: Array.from({ length: 6 }, (_, i) => ({
            question: `Q${i + 1}`,
            purpose: "P",
            look_for: ["X"],
            focus_area: i < 3 ? "Culture" : "Motivation",
          })),
        },
      ],
    };
    expect(InterviewStagesSchema.safeParse(valid).success).toBe(true);
  });
});

describe("FeedbackSynthesisSchema", () => {
  const valid = {
    summary: "Strong technical candidate with good communication.",
    consensus: {
      areas_of_agreement: ["Strong coding skills"],
      areas_of_disagreement: ["Leadership readiness"],
    },
    key_strengths: ["Problem solving", "Clean code"],
    key_concerns: ["Limited management experience"],
    discussion_points: ["Consider for senior IC track"],
    rating_overview: {
      average_score: 3.2,
      total_feedback_count: 3,
      score_distribution: [
        { score: 3, count: 1 },
        { score: 4, count: 2 },
      ],
    },
    disclaimer:
      "This AI-generated content is for informational purposes only. All hiring decisions must be made by humans.",
  };

  it("validates valid synthesis with disclaimer", () => {
    expect(FeedbackSynthesisSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing disclaimer", () => {
    const { disclaimer, ...noDisclaimer } = valid;
    expect(FeedbackSynthesisSchema.safeParse(noDisclaimer).success).toBe(false);
  });

  it("rejects score > 4 in distribution", () => {
    const invalid = {
      ...valid,
      rating_overview: {
        ...valid.rating_overview,
        score_distribution: [{ score: 5, count: 1 }],
      },
    };
    expect(FeedbackSynthesisSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("QuestionsForFocusAreaSchema", () => {
  it("validates 3-5 questions", () => {
    const valid = {
      focus_area: "Technical Skills",
      questions: [
        { question: "Q1", purpose: "P1", look_for: ["A"] },
        { question: "Q2", purpose: "P2", look_for: ["B"] },
        { question: "Q3", purpose: "P3", look_for: ["C"] },
      ],
    };
    expect(QuestionsForFocusAreaSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects fewer than 3 questions", () => {
    const invalid = {
      focus_area: "X",
      questions: [
        { question: "Q1", purpose: "P1", look_for: ["A"] },
        { question: "Q2", purpose: "P2", look_for: ["B"] },
      ],
    };
    expect(QuestionsForFocusAreaSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects more than 5 questions", () => {
    const invalid = {
      focus_area: "X",
      questions: Array.from({ length: 6 }, (_, i) => ({
        question: `Q${i}`,
        purpose: `P${i}`,
        look_for: ["A"],
      })),
    };
    expect(QuestionsForFocusAreaSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("SearchQueriesSchema", () => {
  it("validates 4-12 queries", () => {
    const valid = { queries: ["q1", "q2", "q3", "q4"] };
    expect(SearchQueriesSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects fewer than 4", () => {
    const invalid = { queries: ["q1", "q2"] };
    expect(SearchQueriesSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("SourceScoringSchema", () => {
  it("validates scored sources", () => {
    const valid = {
      scored_sources: [
        {
          url: "https://example.com",
          title: "Test",
          recency_score: 0.8,
          authority_score: 0.7,
          relevance_score: 0.9,
          overall_score: 0.8,
          reasoning: "High quality salary survey",
        },
      ],
    };
    expect(SourceScoringSchema.safeParse(valid).success).toBe(true);
  });
});

describe("SourceExtractionSchema", () => {
  it("validates extraction with all optional fields", () => {
    const valid = {
      url: "https://example.com",
      salary_data: [
        { min: 50000, max: 80000, currency: "EUR", role_match: 0.9 },
      ],
      companies_mentioned: ["Google"],
      demand_signals: ["High demand"],
      skills_mentioned: ["React"],
      trends: ["Growing"],
      data_date: "2026-01",
    };
    expect(SourceExtractionSchema.safeParse(valid).success).toBe(true);
  });

  it("validates extraction with minimal fields", () => {
    const minimal = { url: "https://example.com" };
    expect(SourceExtractionSchema.safeParse(minimal).success).toBe(true);
  });
});
