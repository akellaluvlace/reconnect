import { z } from "zod";

// Table name allowlist
export const CMS_TABLES = [
  "cms_skills",
  "cms_industries",
  "cms_levels",
  "cms_stage_templates",
  "cms_questions",
  "cms_jd_templates",
  "cms_email_templates",
] as const;

export type CmsTable = (typeof CMS_TABLES)[number];

// URL slug → DB table name
export const SLUG_TO_TABLE: Record<string, CmsTable> = {
  skills: "cms_skills",
  industries: "cms_industries",
  levels: "cms_levels",
  "stage-templates": "cms_stage_templates",
  questions: "cms_questions",
  "jd-templates": "cms_jd_templates",
  "email-templates": "cms_email_templates",
};

// Tables that should be ordered by order_index instead of created_at
const ORDER_BY_INDEX: ReadonlySet<CmsTable> = new Set(["cms_levels"]);

/** Returns the column to ORDER BY for the given CMS table. */
export function orderColumn(table: CmsTable): string {
  return ORDER_BY_INDEX.has(table) ? "order_index" : "created_at";
}

/** Returns explicit column selection for the given CMS table. */
export function selectColumns(table: CmsTable): string {
  const columns: Record<CmsTable, string> = {
    cms_skills: "id, name, category, is_active",
    cms_industries: "id, name, is_active",
    cms_levels: "id, name, order_index, description, is_active",
    cms_stage_templates:
      "id, name, type, duration_minutes, focus_areas, suggested_questions, is_active",
    cms_questions:
      "id, question, purpose, look_for, category, stage_type, is_active",
    cms_jd_templates: "id, name, content, style, is_active",
    cms_email_templates:
      "id, name, template_type, subject, body_html, is_active",
  };
  return columns[table];
}

// Create schemas per table
export const createSchemas: Record<CmsTable, z.ZodType> = {
  cms_skills: z.object({
    name: z.string().min(1).max(200),
    category: z.string().max(200).optional(),
  }),
  cms_industries: z.object({
    name: z.string().min(1).max(200),
  }),
  cms_levels: z.object({
    name: z.string().min(1).max(200),
    order_index: z.number().int().min(0).max(100),
    description: z.string().max(500).optional(),
  }),
  cms_stage_templates: z.object({
    name: z.string().min(1).max(200),
    type: z.string().max(100).optional(),
    duration_minutes: z.number().int().min(5).max(480).optional(),
    focus_areas: z.array(z.string().max(200)).max(10).optional(),
    suggested_questions: z.array(z.string().max(1000)).max(20).optional(),
  }),
  cms_questions: z.object({
    question: z.string().min(1).max(1000),
    purpose: z.string().max(500).optional(),
    look_for: z.array(z.string().max(200)).max(10).optional(),
    category: z.string().max(200).optional(),
    stage_type: z.string().max(100).optional(),
  }),
  cms_jd_templates: z.object({
    name: z.string().min(1).max(200),
    content: z.record(z.string(), z.unknown()),
    style: z.enum(["formal", "creative", "concise"]).optional(),
  }),
  cms_email_templates: z.object({
    name: z.string().min(1).max(200),
    template_type: z.string().min(1).max(100),
    subject: z.string().min(1).max(500),
    body_html: z.string().min(1).max(10000),
  }),
};

// Update schemas — same as create but all fields optional, plus is_active toggle
export const updateSchemas: Record<CmsTable, z.ZodType> = {
  cms_skills: z.object({
    name: z.string().min(1).max(200).optional(),
    category: z.string().max(200).optional(),
    is_active: z.boolean().optional(),
  }),
  cms_industries: z.object({
    name: z.string().min(1).max(200).optional(),
    is_active: z.boolean().optional(),
  }),
  cms_levels: z.object({
    name: z.string().min(1).max(200).optional(),
    order_index: z.number().int().min(0).max(100).optional(),
    description: z.string().max(500).optional(),
    is_active: z.boolean().optional(),
  }),
  cms_stage_templates: z.object({
    name: z.string().min(1).max(200).optional(),
    type: z.string().max(100).optional(),
    duration_minutes: z.number().int().min(5).max(480).optional(),
    focus_areas: z.array(z.string().max(200)).max(10).optional(),
    suggested_questions: z.array(z.string().max(1000)).max(20).optional(),
    is_active: z.boolean().optional(),
  }),
  cms_questions: z.object({
    question: z.string().min(1).max(1000).optional(),
    purpose: z.string().max(500).optional(),
    look_for: z.array(z.string().max(200)).max(10).optional(),
    category: z.string().max(200).optional(),
    stage_type: z.string().max(100).optional(),
    is_active: z.boolean().optional(),
  }),
  cms_jd_templates: z.object({
    name: z.string().min(1).max(200).optional(),
    content: z.record(z.string(), z.unknown()).optional(),
    style: z.enum(["formal", "creative", "concise"]).optional(),
    is_active: z.boolean().optional(),
  }),
  cms_email_templates: z.object({
    name: z.string().min(1).max(200).optional(),
    template_type: z.string().min(1).max(100).optional(),
    subject: z.string().min(1).max(500).optional(),
    body_html: z.string().min(1).max(10000).optional(),
    is_active: z.boolean().optional(),
  }),
};
