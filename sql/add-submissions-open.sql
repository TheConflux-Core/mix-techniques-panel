-- Add submissions_open flag to episodes
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS submissions_open BOOLEAN DEFAULT FALSE;
