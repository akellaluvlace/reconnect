import { z } from "zod";
import { FocusAreaSchema, SuggestedQuestionSchema } from "./interview-stage";
import { CoverageAnalysisSchema } from "./coverage-analysis";

// ── Diff schemas (surgical apply) ──

export const StagePatchSchema = z.object({
  stage_index: z.number().int().min(0),
  stage_name: z.string(),
  updated_name: z.string().optional(),
  updated_type: z.string().optional(),
  updated_duration_minutes: z.number().int().min(5).optional(),
  updated_description: z.string().optional(),
  add_focus_areas: z.array(z.object({
    focus_area: FocusAreaSchema,
    questions: z.array(SuggestedQuestionSchema).min(3).max(5),
    replaces: z.string().optional(),
  })).optional(),
  remove_focus_areas: z.array(z.string()).optional(),
  modify_focus_areas: z.array(z.object({
    name: z.string(),
    updated_description: z.string().optional(),
    updated_weight: z.number().int().min(1).max(4).optional(),
  })).optional(),
});

export const RefinementDiffSchema = z.object({
  patches: z.array(StagePatchSchema).min(1).max(10),
  summary: z.string(),
  disclaimer: z.string(),
});

export type StagePatch = z.infer<typeof StagePatchSchema>;
export type RefinementDiff = z.infer<typeof RefinementDiffSchema>;

// ── Snapshot schemas (version history) ──

export const StageSnapshotSchema = z.object({
  name: z.string(),
  type: z.string(),
  duration_minutes: z.number(),
  description: z.string(),
  focus_areas: z.array(FocusAreaSchema),
  suggested_questions: z.array(SuggestedQuestionSchema),
});

export const VersionSnapshotSchema = z.object({
  stages: z.array(StageSnapshotSchema),
  coverage: CoverageAnalysisSchema.passthrough(),
  refinements: z.object({
    items: z.array(z.object({
      id: z.string(),
      title: z.string(),
      rationale: z.string(),
      type: z.enum(["gap_fix", "redundancy_fix", "improvement"]),
      priority: z.enum(["critical", "important", "suggested"]),
      source_detail: z.string().optional(),
      change_summary: z.string(),
      selected: z.boolean(),
    })),
    user_prompt: z.string(),
    source_coverage_score: z.number(),
    disclaimer: z.string(),
  }).optional(),
});

export type VersionSnapshot = z.infer<typeof VersionSnapshotSchema>;

// ── AI output schema — no `id`, `selected`, or app state fields ──

/** AI output schema — no `id`, `selected`, or app state fields */
export const StageRefinementsOutputSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string(),
        rationale: z.string(),
        type: z.enum(["gap_fix", "redundancy_fix", "improvement"]),
        priority: z.enum(["critical", "important", "suggested"]),
        source_detail: z.string().optional(),
        change_summary: z.string(),
      }),
    )
    .min(1)
    .max(12),
  disclaimer: z.string(),
});

export type StageRefinementsOutput = z.infer<typeof StageRefinementsOutputSchema>;

/** Persisted schema — includes app state (id, selected, user_prompt, etc.) */
export const StageRefinementsPersistedSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    title: z.string(),
    rationale: z.string(),
    type: z.enum(["gap_fix", "redundancy_fix", "improvement"]),
    priority: z.enum(["critical", "important", "suggested"]),
    source_detail: z.string().optional(),
    change_summary: z.string(),
    selected: z.boolean(),
  })),
  user_prompt: z.string(),
  generated_at: z.string(),
  applied_at: z.string().optional(),
  source_coverage_score: z.number(),
  disclaimer: z.string(),
  history: z.array(z.object({
    version: z.number(),
    score_before: z.number(),
    score_after: z.number().nullable(),
    gaps_before: z.number(),
    gaps_after: z.number().nullable(),
    stages_count: z.number(),
    items_applied: z.array(z.string()),
    applied_at: z.string(),
    change_summary: z.string().optional(),
    snapshot: VersionSnapshotSchema.optional(),
  })).optional(),
});
