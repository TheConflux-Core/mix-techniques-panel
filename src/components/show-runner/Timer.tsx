"use client";

interface TimerProps {
  seconds: number;
  isRunning: boolean;
  warningThreshold?: number;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Timer({
  seconds,
  isRunning,
  warningThreshold = 300,
  onStart,
  onStop,
  onReset,
}: TimerProps) {
  const getColor = () => {
    if (seconds >= warningThreshold * 2) return "text-[#C4392A] animate-pulse";
    if (seconds >= warningThreshold) return "text-[#E89B2E]";
    return "text-[#D4A843]";
  };

  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
      <h3 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold mb-4">
        Timer
      </h3>

      {/* Timer display */}
      <div className="text-center mb-6">
        <span
          className={`font-[family-name:var(--font-display)] text-5xl font-bold tabular-nums ${getColor()}`}
        >
          {formatTime(seconds)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onStart}
          disabled={isRunning}
          className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider px-3 py-1.5 rounded border border-[#3A2818] text-[#F0E6D3]/60 hover:border-green-500/40 hover:text-green-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ▶ Start
        </button>
        <button
          onClick={onStop}
          disabled={!isRunning}
          className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider px-3 py-1.5 rounded border border-[#3A2818] text-[#F0E6D3]/60 hover:border-amber-500/40 hover:text-amber-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ⏸ Stop
        </button>
        <button
          onClick={onReset}
          className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider px-3 py-1.5 rounded border border-[#3A2818] text-[#F0E6D3]/60 hover:border-red-500/40 hover:text-red-400 transition-colors"
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
}
