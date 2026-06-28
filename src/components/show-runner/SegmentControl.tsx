"use client";

interface SegmentControlProps {
  currentSegment: string;
  segmentHistory: string[];
  onSegmentChange: (segment: string) => void;
  disabled: boolean;
}

const SEGMENTS = [
  { key: "COLD_OPEN", label: "🎬 COLD OPEN" },
  { key: "THE_PULL", label: "🎲 THE PULL" },
  { key: "THE_PLAY", label: "▶ THE PLAY" },
  { key: "THE_CRITIQUE", label: "🔍 THE CRITIQUE" },
  { key: "THE_INTERVIEW", label: "🎤 THE INTERVIEW" },
  { key: "THE_VERDICT", label: "⚖️ THE VERDICT" },
  { key: "PANEL_REACTION", label: "👥 PANEL" },
  { key: "LEADERBOARD", label: "🏆 LEADERBOARD" },
  { key: "WRAP_UP", label: "👋 WRAP-UP" },
];

export default function SegmentControl({
  currentSegment,
  segmentHistory,
  onSegmentChange,
  disabled,
}: SegmentControlProps) {
  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
      <h3 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold mb-4">
        Segments
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {SEGMENTS.map((seg) => {
          const isActive = currentSegment === seg.key;
          const isHistory = segmentHistory.includes(seg.key) && !isActive;

          return (
            <button
              key={seg.key}
              onClick={() => !disabled && onSegmentChange(seg.key)}
              disabled={disabled}
              className={`font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider rounded-lg px-4 py-3 border transition-all ${
                disabled
                  ? "opacity-40 cursor-not-allowed bg-[#2A1810] border-[#3A2818] text-[#F0E6D3]/30"
                  : isActive
                  ? "bg-[#D4A843]/10 border-[#D4A843] text-[#D4A843] font-bold shadow-[0_0_15px_rgba(212,168,67,0.15)]"
                  : isHistory
                  ? "bg-[#2A1810]/50 border-[#3A2818]/50 text-[#F0E6D3]/25"
                  : "bg-[#2A1810] border border-[#3A2818] text-[#F0E6D3]/60 hover:border-[#D4A843]/40 hover:shadow-[0_0_15px_rgba(212,168,67,0.1)]"
              }`}
            >
              {isHistory && !isActive ? `✓ ${seg.label}` : seg.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
