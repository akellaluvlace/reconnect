import type { Json } from "@reconnect/database";

export interface StageInfo {
  id: string;
  name: string;
  type: string | null;
  order_index: number;
  duration_minutes?: number | null;
}

export interface InterviewData {
  id: string;
  candidate_id: string | null;
  stage_id: string | null;
  interviewer_id: string | null;
  status: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  meet_link: string | null;
  recording_status: string | null;
  recording_consent_at: string | null;
  recording_url: string | null;
  drive_file_id: string | null;
  meet_conference_id: string | null;
  transcript_metadata: Json | null;
  pipeline_log?: Json | null;
  retry_count?: number | null;
  created_at: string | null;
}

export interface CollaboratorInfo {
  id: string;
  email: string;
  name: string;
}
