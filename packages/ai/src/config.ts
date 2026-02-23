export const AI_CONFIG = {
  marketInsights: {
    model: "claude-opus-4-6" as const,
    temperature: 0.3,
    maxTokens: 16384,
  },
  marketInsightsQuick: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.3,
    maxTokens: 8192,
  },
  jdGeneration: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.4,
    maxTokens: 8192,
  },
  stageGeneration: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.2,
    maxTokens: 8192,
  },
  questionGeneration: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.3,
    maxTokens: 4096,
  },
  feedbackSynthesis: {
    model: "claude-opus-4-6" as const,
    temperature: 0.1,
    maxTokens: 16384,
  },
  queryGeneration: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.5,
    maxTokens: 4096,
  },
  sourceScoring: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.1,
    maxTokens: 8192,
  },
  sourceExtraction: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.1,
    maxTokens: 8192,
  },
  strategyGeneration: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.3,
    maxTokens: 8192,
  },
  coverageAnalysis: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.2,
    maxTokens: 8192,
  },
  candidateProfile: {
    model: "claude-sonnet-4-5-20250929" as const,
    temperature: 0.3,
    maxTokens: 8192,
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
