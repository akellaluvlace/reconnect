export const AI_CONFIG = {
  marketInsights: {
    model: "claude-opus-4-6" as const,
    temperature: 0.3,
    maxTokens: 4096,
  },
  marketInsightsQuick: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.3,
    maxTokens: 2048,
  },
  jdGeneration: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.4,
    maxTokens: 2048,
  },
  stageGeneration: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.2,
    maxTokens: 1024,
  },
  questionGeneration: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.3,
    maxTokens: 1024,
  },
  feedbackSynthesis: {
    model: "claude-opus-4-6" as const,
    temperature: 0.1,
    maxTokens: 4096,
  },
  queryGeneration: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.5,
    maxTokens: 1024,
  },
  sourceScoring: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.1,
    maxTokens: 1024,
  },
  sourceExtraction: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.1,
    maxTokens: 2048,
  },
  strategyGeneration: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.3,
    maxTokens: 2048,
  },
  coverageAnalysis: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.2,
    maxTokens: 1024,
  },
  candidateProfile: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.3,
    maxTokens: 1024,
  },
} as const;

export type AIEndpoint = keyof typeof AI_CONFIG;

export const SEARCH_CONFIG = {
  maxQueriesPerResearch: 12,
  maxResultsPerQuery: 8,
  maxSourcesForExtraction: 15,
  cacheTTLDays: 30,
  tavily: {
    searchDepth: "advanced" as const,
    maxResults: 8,
    includeAnswer: false,
    includeRawContent: false,
  },
} as const;

export const PROMPT_VERSIONS = {
  compliance: "1.0.0",
  marketInsights: "1.0.0",
  queryGeneration: "1.0.0",
  sourceScoring: "1.0.0",
  sourceExtraction: "1.0.0",
  jdGeneration: "1.0.0",
  stageGeneration: "1.0.0",
  questionGeneration: "1.0.0",
  feedbackSynthesis: "1.0.0",
  strategyGeneration: "1.0.0",
  coverageAnalysis: "1.0.0",
  candidateProfile: "1.0.0",
} as const;
