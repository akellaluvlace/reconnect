// ---------------------------------------------------------------------------
// Process health + duration warning utilities for the Alignment chapter.
// Pure functions — no side effects, no imports from React or Next.js.
// ---------------------------------------------------------------------------

export interface ProcessWarning {
  type: "duration" | "no_interviewer" | "no_questions" | "missing_behavioral";
  message: string;
  stageName?: string;
  stageNames?: string[];
}

export interface StageInput {
  id: string;
  name: string;
  type: string;
  duration_minutes: number;
  focus_areas: Array<{
    name: string;
    description: string;
    weight: number;
  }> | null;
  questions: Array<{ question: string; purpose: string }> | null;
}

export interface CollaboratorInput {
  role: string | null;
  assigned_stages: string[] | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Approximate minutes per focus area during an interview. */
const MINUTES_PER_FA = 10;

/** Fixed overhead for intro/outro in every stage. */
const INTRO_OUTRO_MINUTES = 5;

/**
 * Maximum focus areas that fit in a given duration.
 * We suggest this number when the stage is over-packed.
 */
function maxFAsForDuration(durationMinutes: number): number {
  return Math.max(1, Math.floor((durationMinutes - INTRO_OUTRO_MINUTES) / MINUTES_PER_FA));
}

// ---------------------------------------------------------------------------
// getDurationWarnings
// ---------------------------------------------------------------------------

/**
 * Checks whether each stage's focus area count fits within its time budget.
 *
 * Rule: ~10 min per focus area + 5 min intro/outro.
 * If `duration_minutes < faCount * 10 + 5`, emit a warning.
 */
export function getDurationWarnings(stages: StageInput[]): ProcessWarning[] {
  const warnings: ProcessWarning[] = [];

  for (const stage of stages) {
    if (!stage.focus_areas || stage.focus_areas.length === 0) {
      continue;
    }

    const faCount = stage.focus_areas.length;
    const requiredMinutes = faCount * MINUTES_PER_FA + INTRO_OUTRO_MINUTES;

    if (stage.duration_minutes < requiredMinutes) {
      const suggested = maxFAsForDuration(stage.duration_minutes);
      warnings.push({
        type: "duration",
        stageName: stage.name,
        message:
          `${stage.name} has ${faCount} focus areas in a ${stage.duration_minutes}-min slot` +
          ` \u2014 consider ${requiredMinutes} min or reducing to ${suggested} focus area${suggested === 1 ? "" : "s"}.`,
      });
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// getProcessHealthWarnings
// ---------------------------------------------------------------------------

/**
 * Checks overall process completeness:
 *
 * 1. **no_interviewer** — stages with no collaborator (role="interviewer") covering them.
 *    `assigned_stages: null` means the interviewer covers all stages.
 * 2. **no_questions** — stages with null or empty questions array.
 * 3. **missing_behavioral** — pipeline has no "behavioral" or "culture_fit" stage type.
 */
export function getProcessHealthWarnings(
  stages: StageInput[],
  collaborators: CollaboratorInput[],
): ProcessWarning[] {
  const warnings: ProcessWarning[] = [];

  // --- no_interviewer ---
  const interviewers = collaborators.filter((c) => c.role === "interviewer");

  // A stage is "covered" if at least one interviewer has:
  //   - assigned_stages === null (covers all), or
  //   - assigned_stages includes the stage id
  const uncoveredStages = stages.filter((stage) => {
    return !interviewers.some(
      (interviewer) =>
        interviewer.assigned_stages === null ||
        interviewer.assigned_stages.includes(stage.id),
    );
  });

  if (uncoveredStages.length > 0) {
    const names = uncoveredStages.map((s) => s.name);
    const count = names.length;
    warnings.push({
      type: "no_interviewer",
      stageNames: names,
      message:
        count === 1
          ? `${count} stage has no assigned interviewer: ${names[0]}.`
          : `${count} stages have no assigned interviewer: ${names.join(", ")}.`,
    });
  }

  // --- no_questions ---
  const noQuestionStages = stages.filter(
    (stage) => !stage.questions || stage.questions.length === 0,
  );

  if (noQuestionStages.length > 0) {
    const names = noQuestionStages.map((s) => s.name);
    const count = names.length;
    warnings.push({
      type: "no_questions",
      stageNames: names,
      message:
        count === 1
          ? `${count} stage has no prepared questions: ${names[0]}.`
          : `${count} stages have no prepared questions: ${names.join(", ")}.`,
    });
  }

  // --- missing_behavioral ---
  const hasBehavioral = stages.some(
    (stage) => stage.type === "behavioral" || stage.type === "culture_fit",
  );

  if (!hasBehavioral) {
    warnings.push({
      type: "missing_behavioral",
      message:
        "No behavioural assessment in your interview pipeline",
    });
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// getCompetitiveInsights — market + strategy input types
// ---------------------------------------------------------------------------

export interface MarketInput {
  candidate_availability?: { level: string; description?: string };
  competition?: { companies_hiring?: string[]; market_saturation?: string };
  time_to_hire?: { average_days: number; range?: { min: number; max: number } };
}

export interface StrategyInput {
  salary_positioning?: string;
}

// ---------------------------------------------------------------------------
// getCompetitiveInsights
// ---------------------------------------------------------------------------

/**
 * Reads market insights and hiring strategy data, returning contextual advice
 * strings for hiring managers about competitive pressures.
 *
 * Pure function — no side effects.
 */
export function getCompetitiveInsights(
  market: MarketInput | null,
  strategy: StrategyInput | null,
): string[] {
  if (!market) return [];

  const insights: string[] = [];

  // --- Candidate availability ---
  const level = market.candidate_availability?.level;
  if (level === "scarce" || level === "limited") {
    insights.push(
      "Candidates in this market are in high demand \u2014 consider a faster process to avoid losing them to competing offers.",
    );
  }

  // --- Competition ---
  const companiesHiring = market.competition?.companies_hiring;
  if (companiesHiring && companiesHiring.length >= 5) {
    insights.push(
      `${companiesHiring.length} companies are actively hiring for similar roles \u2014 speed and differentiation matter.`,
    );
  }

  // --- Time to hire ---
  const avgDays = market.time_to_hire?.average_days;
  if (avgDays !== undefined && avgDays > 30) {
    insights.push(
      `Average time to hire is ${avgDays} days \u2014 streamlining your process could give you an edge.`,
    );
  }

  // --- Salary positioning ---
  if (strategy?.salary_positioning === "lag") {
    insights.push(
      "Your salary positioning is below market \u2014 consider highlighting non-monetary differentiators (remote work, growth opportunities, etc.).",
    );
  }

  return insights;
}
