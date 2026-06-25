-- ============================================================
-- Mix Techniques — Consolidated Migrations
-- Run once on Supabase SQL Editor
-- All statements use IF NOT EXISTS / ON CONFLICT = idempotent
-- Safe to re-run
-- ============================================================

-- 1. Episodes: submissions_open flag
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS submissions_open BOOLEAN DEFAULT FALSE;

-- 2. Episodes: guest judges + description
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS guest_judges TEXT[];
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Ensure Season 1 seed data exists
INSERT INTO seasons (number, name, start_date, status)
VALUES (1, 'Season 1', CURRENT_DATE, 'active')
ON CONFLICT (number) DO NOTHING;

-- 4. Submissions: pull order tracking
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS pull_order INTEGER;

-- 5. Scores: golden knob award (MISSING from original migrations — never existed)
ALTER TABLE scores ADD COLUMN IF NOT EXISTS golden_knob BOOLEAN DEFAULT FALSE;

-- 6. Scores: per-metric breakdown columns
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_low_end DECIMAL(3,1);
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_clarity DECIMAL(3,1);
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_balance DECIMAL(3,1);
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_dynamics DECIMAL(3,1);
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_image DECIMAL(3,1);

-- 7. Clip markers table (for marking key moments during review)
CREATE TABLE IF NOT EXISTS clip_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id),
  submission_id UUID REFERENCES submissions(id),
  timestamp INTERVAL NOT NULL,
  segment VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Done. All columns and tables created.
-- ============================================================
