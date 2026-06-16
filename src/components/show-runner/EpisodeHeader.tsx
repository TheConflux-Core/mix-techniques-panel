"use client";

import type { Episode, Submission } from "@/lib/types";

interface EpisodeHeaderProps {
  episode: Episode;
  contestants: Submission[];
  isLive: boolean;
  timerSeconds: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  planned: { bg: "bg-gray-700/30", text: "text-gray-400", border: "border-gray-600", label: "Planned" },
  ready: { bg: "bg-[#D4A843]/10", text: "text-[#D4A843]", border: "border-[#D4A843]/40", label: "Ready" },
  live: { bg: "bg-green-900/30", text: "text-green-400", border: "border-green-600", label: "LIVE" },
  post_production: { bg: "bg-amber-900/30", text: "text-amber-400", border: "border-amber-600", label: "Post-Production" },
  published: { bg: "bg-purple-900/30", text: "text-purple-400", border: "border-purple-600", label: "Published" },
};

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getTimerColor(seconds: number): string {
  if (seconds < 1800) return "text-green-400"; // < 30 min
  if (seconds < 2700) return "text-amber-400"; // 30-45 min
  return "text-red-400 animate-pulse"; // > 45 min
}

export default function EpisodeHeader({ episode, contestants, isLive, timerSeconds }: EpisodeHeaderProps) {
  const status = STATUS_STYLES[episode.status] || STATUS_STYLES.planned;

  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-4 relative overflow-hidden mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Episode info */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#D4A843] uppercase tracking-[0.15em] font-bold">
                EP.{String(episode.episode_number).padStart(2, "0")}
              </h2>
              {episode.title && (
                <span className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/60 text-sm">
                  — {episode.title}
                </span>
              )}
            </div>

            {/* Guest judges */}
            {episode.guest_judges && episode.guest_judges.length > 0 && (
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-xs mt-1">
                🎙️ {episode.guest_judges.map((j) => (j.startsWith("@") ? j : `@${j}`)).join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Right: Status + Timer */}
        <div className="flex items-center gap-4">
          {/* Contestant count */}
          <div className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs">
            {contestants.length} contestant{contestants.length !== 1 ? "s" : ""}
          </div>

          {/* Timer */}
          {isLive && (
            <div className={`font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums ${getTimerColor(timerSeconds)}`}>
              {formatTimer(timerSeconds)}
            </div>
          )}

          {/* Status badge */}
          <span
            className={`font-[family-name:var(--font-mono)] text-xs px-3 py-1 rounded uppercase tracking-wider border ${status.bg} ${status.text} ${status.border} ${
              episode.status === "live" ? "animate-pulse" : ""
            }`}
          >
            {status.label}
          </span>
        </div>
      </div>
    </div>
  );
}
