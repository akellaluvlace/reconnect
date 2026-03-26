import { createServiceRoleClient } from "@/lib/supabase/service-role";

type AuditAction = "create" | "update" | "delete";

interface AuditParams {
  userId?: string | null;
  userEmail?: string | null;
  action: AuditAction;
  table: string;
  recordId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event. Fire-and-forget — never throws.
 * Call this after every successful mutation in API routes.
 */
export async function audit(params: AuditParams): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from("audit_log" as never).insert({
      user_id: params.userId ?? null,
      user_email: params.userEmail ?? null,
      action: params.action,
      table_name: params.table,
      record_id: params.recordId ?? null,
      metadata: params.metadata ?? {},
    } as never);
  } catch (err) {
    console.error("[audit] Failed to log:", err);
  }
}
