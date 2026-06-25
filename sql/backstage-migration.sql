-- Backstage fields for submissions table
-- Run this against your Supabase project

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS backstage_room_url text;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS backstage_room_name text;
