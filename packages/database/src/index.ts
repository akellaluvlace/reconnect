import type { Database } from "./types";

export type { Database, Json } from "./types";

type Tables = Database["public"]["Tables"];

// Convenience row types
export type Organization = Tables["organizations"]["Row"];
export type User = Tables["users"]["Row"];
export type Playbook = Tables["playbooks"]["Row"];
export type InterviewStage = Tables["interview_stages"]["Row"];
export type Candidate = Tables["candidates"]["Row"];
export type Interview = Tables["interviews"]["Row"];
export type Feedback = Tables["feedback"]["Row"];
export type AISynthesis = Tables["ai_synthesis"]["Row"];
export type Collaborator = Tables["collaborators"]["Row"];
export type ShareLink = Tables["share_links"]["Row"];
export type AuditLog = Tables["audit_logs"]["Row"];

// Insert types
export type OrganizationInsert = Tables["organizations"]["Insert"];
export type UserInsert = Tables["users"]["Insert"];
export type PlaybookInsert = Tables["playbooks"]["Insert"];
export type CandidateInsert = Tables["candidates"]["Insert"];
export type InterviewInsert = Tables["interviews"]["Insert"];
export type FeedbackInsert = Tables["feedback"]["Insert"];
