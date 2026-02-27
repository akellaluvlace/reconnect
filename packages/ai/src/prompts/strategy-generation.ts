import { PROMPT_VERSIONS } from "../config";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { sanitizeInput } from "../sanitize";

export interface StrategyGenerationInput {
  role: string;
  level: string;
  industry: string;
  market_insights: {
    salary: { min: number; max: number; median: number; currency: string; confidence: number };
    competition: { companies_hiring: string[]; job_postings_count?: number; market_saturation: string };
    time_to_hire: { average_days: number; range: { min: number; max: number } };
    candidate_availability: { level: string; description: string };
    key_skills: { required: string[]; emerging: string[]; declining: string[] };
    trends: string[];
  };
}

export const STRATEGY_GENERATION_PROMPT = {
  version: PROMPT_VERSIONS.strategyGeneration,

  system: `You are a senior recruitment strategist specializing in the Irish and European market.
${COMPLIANCE_SYSTEM_PROMPT}

Analyze market research data and produce an actionable hiring strategy. Every strategic decision MUST include a rationale grounded in the market data provided.

Guidelines:
- Market classification: Based on candidate availability, competition, and salary trends
- Salary positioning: Consider market saturation and candidate scarcity
- Process speed: Balance thoroughness vs. losing candidates to faster-moving competitors
- max_stages MUST vary by role context. Use these ranges as a guide:
  * Junior/entry roles: 2-3 stages (phone screen + technical + offer)
  * Mid-level roles: 3-4 stages
  * Senior/lead roles: 3-5 stages
  * Executive roles: 4-6 stages (more stakeholder involvement)
  * Candidate-scarce markets: reduce by 1 stage to move faster
  * Employer markets with many candidates: can add 1 stage for selectivity
  Do NOT default to 4 for every role. Justify the number in your rationale.
- Skills priority: Separate must-have from nice-to-have based on market availability
- Always include at least 2 key risks with concrete mitigations`,

  user: (input: StrategyGenerationInput) => {
    const mi = input.market_insights;

    return `Analyze the following market data and generate a comprehensive hiring strategy:

ROLE: ${sanitizeInput(input.role)}
LEVEL: ${sanitizeInput(input.level)}
INDUSTRY: ${sanitizeInput(input.industry)}

MARKET DATA:
- Salary: ${mi.salary.currency} ${mi.salary.min.toLocaleString()}–${mi.salary.max.toLocaleString()} (median: ${mi.salary.median.toLocaleString()}, confidence: ${mi.salary.confidence})
- Competition: ${mi.competition.job_postings_count != null ? `~${mi.competition.job_postings_count} postings, ` : ""}saturation: ${mi.competition.market_saturation}
- Companies hiring: ${mi.competition.companies_hiring.slice(0, 8).join(", ")}
- Time to hire: avg ${mi.time_to_hire.average_days} days (range: ${mi.time_to_hire.range.min}–${mi.time_to_hire.range.max})
- Candidate availability: ${mi.candidate_availability.level} — ${sanitizeInput(mi.candidate_availability.description)}
- Required skills: ${mi.key_skills.required.slice(0, 8).join(", ")}
- Emerging skills: ${mi.key_skills.emerging.slice(0, 5).join(", ")}
- Declining skills: ${mi.key_skills.declining.slice(0, 3).join(", ")}
- Trends: ${mi.trends.slice(0, 5).join("; ")}

Produce:
1. market_classification (employer_market/balanced/candidate_market) + rationale
2. salary_positioning (lead/match/lag) + rationale + recommended range
3. process_speed (fast_track/standard/thorough) + rationale + max_stages + target_days
4. competitive_differentiators (what can make this role stand out)
5. skills_priority (must_have, nice_to_have, emerging_premium)
6. key_risks with mitigations
7. actionable recommendations
8. disclaimer`;
  },
} as const;
