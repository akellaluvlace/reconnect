-- Audit log for tracking all mutations during beta
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  table_name TEXT NOT NULL,
  record_id TEXT, -- UUID or identifier of the affected record
  metadata JSONB DEFAULT '{}'::jsonb, -- additional context (changed fields, old values, etc.)
  ip_address TEXT
);

-- Index for querying by time (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);

-- Index for querying by table + record
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);

-- RLS: only platform admins can read audit logs
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Service role can insert (API routes use service client for logging)
-- No user-facing read policy needed — admin reads via platform admin page
