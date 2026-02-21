export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_research_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          model_used: string
          organization_id: string
          phase: string
          prompt_version: string
          results: Json
          search_params: Json
          sources: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          model_used: string
          organization_id: string
          phase?: string
          prompt_version: string
          results: Json
          search_params: Json
          sources?: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          model_used?: string
          organization_id?: string
          phase?: string
          prompt_version?: string
          results?: Json
          search_params?: Json
          sources?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_research_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_synthesis: {
        Row: {
          candidate_id: string | null
          content: Json
          generated_at: string | null
          id: string
          model_used: string | null
          prompt_version: string | null
          synthesis_type: string
        }
        Insert: {
          candidate_id?: string | null
          content: Json
          generated_at?: string | null
          id?: string
          model_used?: string | null
          prompt_version?: string | null
          synthesis_type: string
        }
        Update: {
          candidate_id?: string | null
          content?: Json
          generated_at?: string | null
          id?: string
          model_used?: string | null
          prompt_version?: string | null
          synthesis_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_synthesis_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string | null
          current_stage_id: string | null
          cv_url: string | null
          email: string | null
          gdpr_consent_at: string | null
          gdpr_deletion_requested_at: string | null
          id: string
          linkedin_url: string | null
          name: string
          notes: string | null
          phone: string | null
          playbook_id: string | null
          retained_until: string | null
          salary_expectation: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_stage_id?: string | null
          cv_url?: string | null
          email?: string | null
          gdpr_consent_at?: string | null
          gdpr_deletion_requested_at?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          playbook_id?: string | null
          retained_until?: string | null
          salary_expectation?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_stage_id?: string | null
          cv_url?: string | null
          email?: string | null
          gdpr_consent_at?: string | null
          gdpr_deletion_requested_at?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          playbook_id?: string | null
          retained_until?: string | null
          salary_expectation?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "interview_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_email_templates: {
        Row: {
          body_html: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          subject: string
          template_type: string
          updated_at: string | null
        }
        Insert: {
          body_html: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          subject: string
          template_type: string
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          subject?: string
          template_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_industries: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_industries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_jd_templates: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          style: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          style?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_jd_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_levels: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number
          organization_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_levels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_questions: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          look_for: Json | null
          organization_id: string
          purpose: string | null
          question: string
          stage_type: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          look_for?: Json | null
          organization_id: string
          purpose?: string | null
          question: string
          stage_type?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          look_for?: Json | null
          organization_id?: string
          purpose?: string | null
          question?: string
          stage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_questions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_skills: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_skills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_stage_templates: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          focus_areas: Json | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          suggested_questions: Json | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          focus_areas?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          suggested_questions?: Json | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          focus_areas?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          suggested_questions?: Json | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_stage_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          accepted_at: string | null
          assigned_stages: string[] | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invite_token: string | null
          invited_by: string | null
          name: string | null
          playbook_id: string | null
          role: string | null
        }
        Insert: {
          accepted_at?: string | null
          assigned_stages?: string[] | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          name?: string | null
          playbook_id?: string | null
          role?: string | null
        }
        Update: {
          accepted_at?: string | null
          assigned_stages?: string[] | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          name?: string | null
          playbook_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          cons: Json | null
          focus_areas_confirmed: boolean
          id: string
          interview_id: string | null
          interviewer_id: string | null
          notes: string | null
          pros: Json | null
          ratings: Json
          submitted_at: string | null
        }
        Insert: {
          cons?: Json | null
          focus_areas_confirmed?: boolean
          id?: string
          interview_id?: string | null
          interviewer_id?: string | null
          notes?: string | null
          pros?: Json | null
          ratings: Json
          submitted_at?: string | null
        }
        Update: {
          cons?: Json | null
          focus_areas_confirmed?: boolean
          id?: string
          interview_id?: string | null
          interviewer_id?: string | null
          notes?: string | null
          pros?: Json | null
          ratings?: Json
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_stages: {
        Row: {
          assigned_interviewer_id: string | null
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          focus_areas: Json | null
          id: string
          name: string
          order_index: number
          playbook_id: string | null
          suggested_questions: Json | null
          type: string | null
        }
        Insert: {
          assigned_interviewer_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          focus_areas?: Json | null
          id?: string
          name: string
          order_index: number
          playbook_id?: string | null
          suggested_questions?: Json | null
          type?: string | null
        }
        Update: {
          assigned_interviewer_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          focus_areas?: Json | null
          id?: string
          name?: string
          order_index?: number
          playbook_id?: string | null
          suggested_questions?: Json | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_stages_assigned_interviewer_id_fkey"
            columns: ["assigned_interviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_stages_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_transcripts: {
        Row: {
          created_at: string | null
          id: string
          interview_id: string
          metadata: Json | null
          transcript: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interview_id: string
          metadata?: Json | null
          transcript: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interview_id?: string
          metadata?: Json | null
          transcript?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_transcripts_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: true
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          candidate_id: string | null
          completed_at: string | null
          created_at: string | null
          drive_file_id: string | null
          id: string
          interviewer_id: string | null
          meet_conference_id: string | null
          meet_link: string | null
          recording_consent_at: string | null
          recording_status: string | null
          recording_url: string | null
          scheduled_at: string | null
          stage_id: string | null
          status: string | null
          transcript: string | null
          transcript_metadata: Json | null
        }
        Insert: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          drive_file_id?: string | null
          id?: string
          interviewer_id?: string | null
          meet_conference_id?: string | null
          meet_link?: string | null
          recording_consent_at?: string | null
          recording_status?: string | null
          recording_url?: string | null
          scheduled_at?: string | null
          stage_id?: string | null
          status?: string | null
          transcript?: string | null
          transcript_metadata?: Json | null
        }
        Update: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          drive_file_id?: string | null
          id?: string
          interviewer_id?: string | null
          meet_conference_id?: string | null
          meet_link?: string | null
          recording_consent_at?: string | null
          recording_status?: string | null
          recording_url?: string | null
          scheduled_at?: string | null
          stage_id?: string | null
          status?: string | null
          transcript?: string | null
          transcript_metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "interview_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      org_drive_connections: {
        Row: {
          access_token: string
          connected_at: string | null
          connected_by: string | null
          drive_root_folder_id: string | null
          id: string
          organization_id: string
          refresh_token: string
          token_expiry: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          connected_by?: string | null
          drive_root_folder_id?: string | null
          id?: string
          organization_id: string
          refresh_token: string
          token_expiry: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          connected_by?: string | null
          drive_root_folder_id?: string | null
          id?: string
          organization_id?: string
          refresh_token?: string
          token_expiry?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_drive_connections_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_drive_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          drive_folder_id: string | null
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          drive_folder_id?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          drive_folder_id?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_google_config: {
        Row: {
          access_token: string
          auto_record_enabled: boolean | null
          created_at: string | null
          google_email: string
          id: string
          refresh_token: string
          scopes: string[] | null
          token_expiry: string
          updated_at: string | null
          workspace_domain: string | null
        }
        Insert: {
          access_token: string
          auto_record_enabled?: boolean | null
          created_at?: string | null
          google_email: string
          id?: string
          refresh_token: string
          scopes?: string[] | null
          token_expiry: string
          updated_at?: string | null
          workspace_domain?: string | null
        }
        Update: {
          access_token?: string
          auto_record_enabled?: boolean | null
          created_at?: string | null
          google_email?: string
          id?: string
          refresh_token?: string
          scopes?: string[] | null
          token_expiry?: string
          updated_at?: string | null
          workspace_domain?: string | null
        }
        Relationships: []
      }
      playbooks: {
        Row: {
          candidate_profile: Json | null
          created_at: string | null
          created_by: string | null
          department: string | null
          hiring_strategy: Json | null
          id: string
          industry: string | null
          job_description: Json | null
          level: string | null
          location: string | null
          market_insights: Json | null
          organization_id: string
          settings: Json | null
          skills: Json | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          candidate_profile?: Json | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          hiring_strategy?: Json | null
          id?: string
          industry?: string | null
          job_description?: Json | null
          level?: string | null
          location?: string | null
          market_insights?: Json | null
          organization_id: string
          settings?: Json | null
          skills?: Json | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          candidate_profile?: Json | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          hiring_strategy?: Json | null
          id?: string
          industry?: string | null
          job_description?: Json | null
          level?: string | null
          location?: string | null
          market_insights?: Json | null
          organization_id?: string
          settings?: Json | null
          skills?: Json | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playbooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playbooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          playbook_id: string | null
          token: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          playbook_id?: string | null
          token: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          playbook_id?: string | null
          token?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "share_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_playbook_id_fkey"
            columns: ["playbook_id"]
            isOneToOne: false
            referencedRelation: "playbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          notification_preferences: Json | null
          organization_id: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          name: string
          notification_preferences?: Json | null
          organization_id?: string | null
          role: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          notification_preferences?: Json | null
          organization_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      candidate_belongs_to_user_org: {
        Args: { cand_id: string }
        Returns: boolean
      }
      get_user_org_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_active_collaborator: {
        Args: { p_playbook_id: string }
        Returns: boolean
      }
      is_org_admin: { Args: never; Returns: boolean }
      is_org_manager_or_admin: { Args: never; Returns: boolean }
      playbook_belongs_to_user_org: {
        Args: { pb_id: string }
        Returns: boolean
      }
      validate_ratings_scores: { Args: { ratings: Json }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
