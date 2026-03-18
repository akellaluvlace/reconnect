-- Add Recall.ai bot ID column to interviews table
-- Stores the bot UUID returned by Recall.ai when scheduling a recording bot
ALTER TABLE interviews ADD COLUMN recall_bot_id TEXT;

-- Unique index for webhook lookups (find interview by bot ID, enforce 1:1)
CREATE UNIQUE INDEX idx_interviews_recall_bot_id ON interviews (recall_bot_id) WHERE recall_bot_id IS NOT NULL;
