-- Add discord_handle to submissions table
-- Run this in Supabase SQL Editor

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS discord_handle TEXT;

-- Index for lookups by discord handle
CREATE INDEX IF NOT EXISTS idx_submissions_discord_handle ON submissions(discord_handle) WHERE discord_handle IS NOT NULL;

-- Comment
COMMENT ON COLUMN submissions.discord_handle IS 'Discord username for contestant flow automation (role assignment, DMs, voice channel management)';
