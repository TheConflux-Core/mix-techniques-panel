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
  youtube_url: string | null;
  podcast_url: string | null;
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
  social_links: SocialLinks;
  track_url: string;
  track_signed_url: string | null;
  track_title: string | null;
  track_duration: string | null;
  sample_rate: number | null;
  bit_depth: number | null;
  file_format: string | null;
  waveform_data: number[] | null;
  status: "submitted" | "under_review" | "selected" | "aired" | "scored";
  episode_id: string | null;
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
  created_at: string;
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
  { value: "selected", label: "Selected" },
  { value: "aired", label: "Aired" },
  { value: "scored", label: "Scored" },
] as const;

export const STATUS_COLORS: Record<string, string> = {
  submitted: "border-[#D4A843] text-[#D4A843]",
  under_review: "bg-[#E89B2E] text-[#1A0F0A]",
  selected: "bg-[#D4A843] text-[#1A0F0A]",
  aired: "bg-green-700 text-white",
  scored: "bg-purple-700 text-white",
};
