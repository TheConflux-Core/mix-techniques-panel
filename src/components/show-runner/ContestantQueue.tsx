"use client";

import type { Submission } from "@/lib/types";
import { STATUS_COLORS } from "@/lib/types";

interface ContestantQueueProps {
  contestants: Submission[];
  activeIndex: number;
  onActivate: (index: number) => void;
  contestantScores?: Record<string, number>;
}

function getStatusIcon(status: string, isActive: boolean): string {
  if (isActive) return "▶";
  switch (status) {
    case "aired":
      return "✅";
    case "scored":
      return "✅";
    default:
      return "○";
  }
}

function getStatusIconClass(status: string, isActive: boolean): string {
  if (isActive) return "text-[#D4A843] animate-pulse";
  switch (status) {
    case "aired":
    case "scored":
      return "text-green-400";
    default:
      return "text-[#F0E6D3]/30";
  }
}

export default function ContestantQueue({ contestants, activeIndex, onActivate, contestantScores }: ContestantQueueProps) {
  // Sort by pull_order (nulls last)
  const sorted = [...contestants].sort((a, b) => {
    const aOrder = (a as any).pull_order ?? Infinity;
    const bOrder = (b as any).pull_order ?? Infinity;
    return aOrder - bOrder;
  });

  if (sorted.length === 0) {
    return (
      <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
        <h3 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold mb-4">
          Contestant Queue
        </h3>
        <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
          No contestants assigned yet
        </p>
      </div>
    );
  }

  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
      <h3 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold mb-4">
        Contestant Queue
      </h3>
      <div className="space-y-2">
        {sorted.map((contestant, i) => {
          const isActive = i === activeIndex;
          const pullOrder = (contestant as any).pull_order;
          const statusClass = STATUS_COLORS[contestant.status] || "text-[#F0E6D3]/40 border-[#3A2818]";

          return (
            <button
              key={contestant.id}
              onClick={() => onActivate(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded border transition-all text-left ${
                isActive
                  ? "border-l-2 border-[#D4A843] bg-[#D4A843]/5 border-t-[#3A2818] border-r-[#3A2818] border-b-[#3A2818]"
                  : "border-[#3A2818] bg-[#1A0F0A]/50 hover:border-[#D4A843]/20"
              }`}
            >
              {/* Status icon */}
              <span className={`text-sm w-5 text-center ${getStatusIconClass(contestant.status, isActive)}`}>
                {getStatusIcon(contestant.status, isActive)}
              </span>

              {/* Order number */}
              <span className="font-[family-name:var(--font-mono)] text-[#D4A843]/60 text-xs w-6">
                {pullOrder != null ? String(pullOrder).padStart(2, "0") : "—"}
              </span>

              {/* Name & track */}
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3] text-sm font-medium truncate">
                  {contestant.name}
                </p>
                <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-xs truncate">
                  {contestant.track_title || "Untitled"}
                </p>
              </div>

              {/* Backstage indicator */}
              {contestant.backstage_room_url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(contestant.backstage_room_url!);
                  }}
                  title="Copy backstage room URL"
                  className="font-[family-name:var(--font-mono)] text-[10px] px-1.5 py-0.5 rounded border border-green-700/40 text-green-400 hover:bg-green-900/30 transition-colors"
                >
                  🎤
                </button>
              )}

              {/* Status badge */}
              <span className={`font-[family-name:var(--font-mono)] text-[10px] px-2 py-0.5 rounded uppercase tracking-wider border ${statusClass}`}>
                {contestant.status}
              </span>

              {/* Score display */}
              {(contestant.status === "aired" || contestant.status === "scored") && (
                <span className="font-[family-name:var(--font-mono)] text-[#D4A843] text-xs w-8 text-right font-bold">
                  {contestantScores?.[contestant.id]?.toFixed(1) ?? "—"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
