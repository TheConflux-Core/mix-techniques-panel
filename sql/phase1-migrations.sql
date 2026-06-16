-- Phase 1: Show Runner Dashboard Migrations
-- Mix Techniques Panel

-- Add pull_order to submissions (track pull sequence within an episode)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS pull_order INTEGER;

-- Create clip_markers table (for marking key moments in submissions during review)
CREATE TABLE IF NOT EXISTS clip_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID REFERENCES episodes(id),
  submission_id UUID REFERENCES submissions(id),
  timestamp INTERVAL NOT NULL,
  segment VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add per-metric columns to scores (granular scoring breakdown)
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_low_end DECIMAL(3,1);
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_clarity DECIMAL(3,1);
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_balance DECIMAL(3,1);
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_dynamics DECIMAL(3,1);
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_image DECIMAL(3,1);
