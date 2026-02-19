import type { Database } from "./types";

export type { Database, Json } from "./types";

// Re-export helper types for consumers
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

type TableDefs = Database["public"]["Tables"];

// Convenience row types
export type Organization = TableDefs["organizations"]["Row"];
export type User = TableDefs["users"]["Row"];
export type Playbook = TableDefs["playbooks"]["Row"];
export type InterviewStage = TableDefs["interview_stages"]["Row"];
export type Candidate = TableDefs["candidates"]["Row"];
/** Note: interviews.transcript column is deprecated — use interview_transcripts table instead */
export type Interview = TableDefs["interviews"]["Row"];
export type Feedback = TableDefs["feedback"]["Row"];
export type AISynthesis = TableDefs["ai_synthesis"]["Row"];
export type Collaborator = TableDefs["collaborators"]["Row"];
export type ShareLink = TableDefs["share_links"]["Row"];
export type AuditLog = TableDefs["audit_logs"]["Row"];
export type InterviewTranscript = TableDefs["interview_transcripts"]["Row"];
export type OrgDriveConnection = TableDefs["org_drive_connections"]["Row"];
export type CmsSkill = TableDefs["cms_skills"]["Row"];
export type CmsIndustry = TableDefs["cms_industries"]["Row"];
export type CmsLevel = TableDefs["cms_levels"]["Row"];
export type CmsStageTemplate = TableDefs["cms_stage_templates"]["Row"];
export type CmsQuestion = TableDefs["cms_questions"]["Row"];
export type CmsJdTemplate = TableDefs["cms_jd_templates"]["Row"];
export type CmsEmailTemplate = TableDefs["cms_email_templates"]["Row"];

// Insert types
export type OrganizationInsert = TableDefs["organizations"]["Insert"];
export type UserInsert = TableDefs["users"]["Insert"];
export type PlaybookInsert = TableDefs["playbooks"]["Insert"];
export type InterviewStageInsert = TableDefs["interview_stages"]["Insert"];
export type CandidateInsert = TableDefs["candidates"]["Insert"];
export type InterviewInsert = TableDefs["interviews"]["Insert"];
export type FeedbackInsert = TableDefs["feedback"]["Insert"];
export type CollaboratorInsert = TableDefs["collaborators"]["Insert"];
export type ShareLinkInsert = TableDefs["share_links"]["Insert"];

// Update types
export type PlaybookUpdate = TableDefs["playbooks"]["Update"];
export type CandidateUpdate = TableDefs["candidates"]["Update"];
export type InterviewUpdate = TableDefs["interviews"]["Update"];
export type FeedbackUpdate = TableDefs["feedback"]["Update"];
export type InterviewStageUpdate = TableDefs["interview_stages"]["Update"];

// Domain types (DB enum unions + JSONB shapes)
export type {
  UserRole,
  PlaybookStatus,
  CandidateStatus,
  InterviewStatus,
  RecordingStatus,
  CollaboratorRole,
  JdTemplateStyle,
  SynthesisType,
  RatingEntry,
  FeedbackRatings,
  NotificationPreferences,
  SalaryExpectation,
  FocusArea,
  SuggestedQuestion,
  JobDescription,
  MarketInsights,
  CandidateProfile,
  OrgSettings,
  PlaybookSettings,
  HiringStrategy,
  CoverageAnalysis,
} from "./domain-types";
