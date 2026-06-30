export interface Season {
  id: number;
  number: number;
  name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
}

export interface Episode {
  id: string;
  season_id: number;
  episode_number: number;
  title: string | null;
  air_date: string | null;
  status: string;
  submissions_open: boolean;
  youtube_url: string | null;
  podcast_url: string | null;
  guest_judges: string[];
  description: string | null;
  created_at: string;
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  soundcloud?: string;
}

export interface Submission {
  id: string;
  name: string;
  email: string;
  location: string | null;
  genre: "songwriter" | "producer" | "mix_engineer" | "multi";
  bio: string | null;
  discord_handle: string | null;
  social_links: SocialLinks;
  track_url: string;
  track_signed_url: string | null;
  track_title: string | null;
  track_duration: string | null;
  sample_rate: number | null;
  bit_depth: number | null;
  file_format: string | null;
  waveform_data: number[] | null;
  pull_order: number | null;
  backstage_room_url: string | null;
  status: "submitted" | "pulled" | "under_review" | "selected" | "aired" | "scored";
  episode_id: string | null;
  episodes?: { episode_number: number; title: string | null } | null;
  season_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Score {
  id: string;
  submission_id: string;
  episode_id: string;
  host_score: number | null;
  guest_scores: Record<string, number>;
  audience_score: number | null;
  notes: string | null;
  golden_knob: boolean;
  // Full 7-metric breakdown (host scores)
  metric_low_end: number | null;
  metric_clarity: number | null;
  metric_balance: number | null;
  metric_mid_range: number | null;
  metric_image: number | null;
  metric_high_end: number | null;
  metric_overall: number | null;
  // Combined + viewer data
  combined_score: number | null;
  viewer_avg: number | null;
  viewer_vote_count: number | null;
  scoring_formula: string | null;
  // Per-judge scores
  judge_scores: Record<string, JudgeScoreMetrics>;
  created_at: string;
}

export interface JudgeScoreMetrics {
  lowEnd?: number;
  clarity?: number;
  balance?: number;
  midRange?: number;
  image?: number;
  highEnd?: number;
  overall?: number;
  avg?: number;
}

export const GENRE_OPTIONS = [
  { value: "songwriter", label: "Songwriter" },
  { value: "producer", label: "Producer" },
  { value: "mix_engineer", label: "Mix Engineer" },
  { value: "multi", label: "Multi-Discipline" },
] as const;

export const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "pulled", label: "Pulled" },
  { value: "selected", label: "Selected" },
  { value: "aired", label: "Aired" },
  { value: "scored", label: "Scored" },
] as const;

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  genre: string | null;
  website: string | null;
  social_links: Record<string, string>;
  role: string;
  is_judge: boolean;
  created_at: string;
  updated_at: string;
}

export const STATUS_COLORS: Record<string, string> = {
  submitted: "border-[#D4A843] text-[#D4A843]",
  under_review: "bg-[#E89B2E] text-[#1A0F0A]",
  pulled: "bg-[#E89B2E] text-[#1A0F0A]",
  selected: "bg-[#D4A843] text-[#1A0F0A]",
  aired: "bg-green-700 text-white",
  scored: "bg-purple-700 text-white",
};
