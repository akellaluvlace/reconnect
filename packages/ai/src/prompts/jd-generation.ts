import { PROMPT_VERSIONS } from "../config";
import { COMPLIANCE_SYSTEM_PROMPT } from "./compliance";
import { sanitizeInput } from "../sanitize";

export interface JDGenerationInput {
  role: string;
  level: string;
  industry: string;
  company_context?: string;
  style: "formal" | "creative" | "concise";
  currency?: string;
  market_context?: {
    salary_range?: { min: number; max: number; currency: string };
    key_skills?: string[];
    demand_level?: string;
    competitors?: string[];
  };
  strategy_context?: {
    salary_positioning?: { strategy: string; recommended_range?: { min: number; max: number; currency: string } };
    competitive_differentiators?: string[];
    skills_priority?: { must_have: string[]; nice_to_have: string[] };
  };
}

export const JD_GENERATION_PROMPT = {
  version: PROMPT_VERSIONS.jdGeneration,

  system: `You are an expert HR consultant generating job descriptions for the Irish and European market.
${COMPLIANCE_SYSTEM_PROMPT}

Tone: Professional and friendly. Inclusive language. Avoid jargon where possible.`,

  user: (input: JDGenerationInput) => {
    const marketSection = input.market_context
      ? `
MARKET CONTEXT (from research — use to inform your output):
- Salary range: ${input.market_context.salary_range ? `${input.market_context.salary_range.currency} ${input.market_context.salary_range.min.toLocaleString()}–${input.market_context.salary_range.max.toLocaleString()}` : "Not available"}
- Key skills in demand: ${input.market_context.key_skills?.join(", ") ?? "Not available"}
- Market demand: ${input.market_context.demand_level ?? "Not available"}
- Competitors hiring: ${input.market_context.competitors?.join(", ") ?? "Not available"}`
      : "";

    const strategySection = input.strategy_context
      ? `
STRATEGY CONTEXT (align JD with hiring strategy):
- Salary positioning: ${input.strategy_context.salary_positioning?.strategy ?? "N/A"}${input.strategy_context.salary_positioning?.recommended_range ? ` (${input.strategy_context.salary_positioning.recommended_range.currency} ${input.strategy_context.salary_positioning.recommended_range.min.toLocaleString()}–${input.strategy_context.salary_positioning.recommended_range.max.toLocaleString()})` : ""}
- Differentiators to highlight: ${input.strategy_context.competitive_differentiators?.slice(0, 3).join("; ") ?? "N/A"}
- Must-have skills: ${input.strategy_context.skills_priority?.must_have?.slice(0, 5).join(", ") ?? "N/A"}
- Nice-to-have skills: ${input.strategy_context.skills_priority?.nice_to_have?.slice(0, 3).join(", ") ?? "N/A"}`
      : "";

    return `Generate a job description for:
- Role: ${sanitizeInput(input.role)}
- Level: ${sanitizeInput(input.level)}
- Industry: ${sanitizeInput(input.industry)}
${input.company_context ? `- Company Context: ${sanitizeInput(input.company_context)}` : ""}
- Style: ${input.style}
- Currency: ${input.currency ?? "EUR"}
${marketSection}
${strategySection}

Style guidelines:
- formal: Professional, corporate language
- creative: Engaging, modern startup tone
- concise: Short, bullet-point focused

Include Ireland-specific considerations (visa sponsorship mention if relevant, remote work policies).
Provide seniority_signals: phrases in the JD that indicate the seniority level (used downstream for stage generation).`;
  },
} as const;
