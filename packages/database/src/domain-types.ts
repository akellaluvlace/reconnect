// Domain type overlays for DB enums and JSONB shapes.
// These supplement the auto-generated types.ts with stricter typing.

// --- DB enum unions (CHECK constraints where noted) ---

export type UserRole = "admin" | "manager" | "interviewer"; // CHECK constraint
export type PlaybookStatus = "draft" | "active" | "archived"; // CHECK constraint
export type CandidateStatus = "active" | "hired" | "rejected" | "withdrawn"; // CHECK constraint
export type InterviewStatus = "scheduled" | "completed" | "cancelled" | "no_show"; // CHECK constraint
export type RecordingStatus =
  | "scheduled"
  | "pending"
  | "uploaded"
  | "transcribed"
  | "synthesizing"
  | "completed"
  | "failed_recording"
  | "failed_download"
  | "failed_transcription"
  | "failed_synthesis"
  | "no_consent"; // CHECK constraint — see migration #25
export type CollaboratorRole = "viewer" | "interviewer"; // CHECK constraint
export type JdTemplateStyle = "formal" | "creative" | "concise"; // CHECK constraint
export type SynthesisType = "initial" | "updated" | "final"; // Application-level enum (no DB CHECK constraint)

// --- JSONB shape interfaces ---

export interface RatingEntry {
  category: string;
  score: 1 | 2 | 3 | 4;
  notes?: string;
}

export interface FeedbackRatings {
  ratings: RatingEntry[];
  pros: string[];
  cons: string[];
}

export interface NotificationPreferences {
  assigned?: boolean;
  feedback_submitted?: boolean;
  synthesis_ready?: boolean;
  reminders?: boolean;
}

export interface SalaryExpectation {
  min?: number;
  max?: number;
  currency?: string;
}

export interface FocusArea {
  name: string;
  description: string;
  weight: 1 | 2 | 3 | 4;
  rationale?: string;
}

export interface SuggestedQuestion {
  question: string;
  purpose: string;
  look_for: string[];
  focus_area: string;
}

export interface JobDescription {
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: {
    required: string[];
    preferred: string[];
  };
  benefits: string[];
  salary_range?: {
    min: number;
    max: number;
    currency: string;
  };
  location?: string;
  remote_policy?: string;
  seniority_signals?: string[];
  confidence: number;
  /** @deprecated Use raw_text only for manually-entered JDs, not AI-generated ones */
  raw_text?: string;
}

export interface MarketInsights {
  phase: "quick" | "deep";
  salary: {
    min: number;
    max: number;
    median: number;
    currency: string;
    confidence: number;
  };
  competition: {
    companies_hiring: string[];
    job_postings_count?: number;
    market_saturation: "low" | "medium" | "high";
  };
  time_to_hire: {
    average_days: number;
    range: { min: number; max: number };
  };
  candidate_availability: {
    level: "scarce" | "limited" | "moderate" | "abundant";
    description: string;
  };
  key_skills: {
    required: string[];
    emerging: string[];
    declining: string[];
  };
  trends: string[];
  sources?: Array<{
    url: string;
    title: string;
    relevance_score: number;
    published_date?: string;
  }>;
  metadata: {
    model_used: string;
    prompt_version: string;
    generated_at: string;
    source_count: number;
    confidence: number;
  };
}

export interface CandidateProfile {
  ideal_background?: string;
  must_have_skills?: string[];
  nice_to_have_skills?: string[];
  experience_range?: string;
  cultural_fit_indicators?: string[];
  disclaimer: string;
}

export interface OrgSettings {
  timezone?: string;
  default_language?: string;
  branding?: {
    logo_url?: string;
    primary_color?: string;
  };
}

export interface PlaybookSettings {
  auto_generate_jd?: boolean;
  auto_generate_insights?: boolean;
  default_stage_count?: number;
}

export interface HiringStrategy {
  market_classification: "employer_market" | "balanced" | "candidate_market";
  market_classification_rationale: string;
  salary_positioning: {
    strategy: "lead" | "match" | "lag";
    rationale: string;
    recommended_range: { min: number; max: number; currency: string };
  };
  process_speed: {
    recommendation: "fast_track" | "standard" | "thorough";
    rationale: string;
    max_stages: number;
    target_days: number;
  };
  competitive_differentiators: string[];
  skills_priority: {
    must_have: string[];
    nice_to_have: string[];
    emerging_premium: string[];
  };
  key_risks: Array<{ risk: string; mitigation: string }>;
  recommendations: string[];
  disclaimer: string;
}

export interface CoverageAnalysis {
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
  recommendations: string[];
  overall_coverage_score: number;
  disclaimer: string;
}
