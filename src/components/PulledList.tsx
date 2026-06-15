"use client";

import type { Submission } from "@/lib/types";
import { GENRE_OPTIONS } from "@/lib/types";

interface PulledListProps {
  pulled: Submission[];
}

export default function PulledList({ pulled }: PulledListProps) {
  const getGenreLabel = (value: string) =>
    GENRE_OPTIONS.find((g) => g.value === value)?.label || value;

  if (pulled.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-12">
      <div className="flex items-center gap-4 mb-4">
        <h3 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold">
          Pulled This Session
        </h3>
        <div className="flex-1 h-px bg-[#3A2818]" />
        <span className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs">
          {pulled.length} contestant{pulled.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {pulled.map((sub, index) => (
          <div
            key={sub.id}
            className="flex items-center gap-4 bg-[#2A1810]/50 border border-[#3A2818]/50 rounded-lg px-4 py-3 transition-colors hover:border-[#D4A843]/20"
            style={{ animation: "fadeIn 0.3s ease-out forwards" }}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 flex items-center justify-center">
              <span className="font-[family-name:var(--font-mono)] text-[#D4A843] text-xs font-medium">
                {index + 1}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-[family-name:var(--font-display)] text-[#F0E6D3] text-sm font-medium truncate">
                {sub.name}
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-xs truncate">
                {sub.track_title || "Untitled"} &middot; {getGenreLabel(sub.genre)}
                {sub.location ? ` \u00b7 ${sub.location}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
