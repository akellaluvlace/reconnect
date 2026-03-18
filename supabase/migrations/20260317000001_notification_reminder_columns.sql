-- Add last_reminder_sent_at to collaborators for daily reminder cooldown
ALTER TABLE public.collaborators
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
