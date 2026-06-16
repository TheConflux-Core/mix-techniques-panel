-- Fix: Add missing columns to episodes table
-- These columns are referenced by the API but were never migrated

-- Add guest_judges column (text array for multiple judges)
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS guest_judges TEXT[];

-- Add description column
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS description TEXT;

-- Ensure seasons seed data exists (idempotent)
INSERT INTO seasons (number, name, start_date, status)
VALUES (1, 'Season 1', CURRENT_DATE, 'active')
ON CONFLICT (number) DO NOTHING;
