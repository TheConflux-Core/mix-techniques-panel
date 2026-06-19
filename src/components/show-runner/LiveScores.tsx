"use client";

import { useMemo } from "react";

export interface MetricScores {
  lowEnd: number;
  clarity: number;
  balance: number;
  dynamics: number;
  image: number;
}

interface LiveScoresProps {
  hostMetrics: MetricScores;
  viewerMetrics: MetricScores;
  viewerVotes: number;
  onLockScore: () => void;
  onCloseVoting: () => void;
  locked: boolean;
  votingClosed: boolean;
}

const METRIC_KEYS: (keyof MetricScores)[] = [
  "lowEnd",
  "clarity",
  "balance",
  "dynamics",
  "image",
];

const METRIC_LABELS: Record<string, string> = {
  lowEnd: "LOW END",
  clarity: "CLARITY",
  balance: "BALANCE",
  dynamics: "DYNAMICS",
  image: "IMAGE",
};

function avgOf(metrics: MetricScores): number {
  const vals = METRIC_KEYS.map((k) => metrics[k]);
  const nonZero = vals.filter((v) => v > 0);
  if (nonZero.length === 0) return 7;
  return Math.round((nonZero.reduce((a, b) => a + b, 0) / nonZero.length) * 10) / 10;
}

function DeltaIndicator({
  host,
  viewer,
}: {
  host: number;
  viewer: number;
}) {
  if (viewer === 0 || host === 0) return null;
  if (viewer > host) {
    return <span className="text-green-400 text-[10px] ml-1">▲</span>;
  }
  if (viewer < host) {
    return <span className="text-red-400 text-[10px] ml-1">▼</span>;
  }
  return null;
}

export default function LiveScores({
  hostMetrics,
  viewerMetrics,
  viewerVotes,
  onLockScore,
  onCloseVoting,
  locked,
  votingClosed,
}: LiveScoresProps) {
  const hostAvg = useMemo(() => avgOf(hostMetrics), [hostMetrics]);
  const viewerAvg = useMemo(() => avgOf(viewerMetrics), [viewerMetrics]);
  const combined = useMemo(
    () => Math.round((hostAvg * 0.6 + viewerAvg * 0.4) * 10) / 10,
    [hostAvg, viewerAvg]
  );

  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-[#D4A843] rounded-full" />
          <h2 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold">
            Live Scores
          </h2>
        </div>
        {/* Status indicators */}
        <div className="flex items-center gap-3">
          {locked && (
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-green-400 border border-green-600/40 px-2 py-0.5 rounded">
              Score Locked
            </span>
          )}
          {votingClosed && (
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-red-400 border border-red-600/40 px-2 py-0.5 rounded">
              Voting Closed
            </span>
          )}
        </div>
      </div>

      {/* Metric labels row */}
      <div className="flex items-center mb-3 pl-[72px]">
        <div className="flex-1 flex justify-around">
          {METRIC_KEYS.map((key) => (
            <div
              key={key}
              className="w-14 text-center font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[2px] text-[#F0E6D3]/40"
            >
              {METRIC_LABELS[key]}
            </div>
          ))}
        </div>
        <div className="w-24 text-center font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[2px] text-[#F0E6D3]/40">
          AVG
        </div>
      </div>

      {/* HOST row — read-only display (scores come from host-panel.html) */}
      <div className="flex items-center gap-3 mb-3">
        <span className="font-[family-name:var(--font-mono)] text-xs text-[#D4A843] uppercase tracking-wider w-[60px] shrink-0 text-right">
          Host
        </span>
        <div className="flex-1 flex justify-around">
          {METRIC_KEYS.map((key) => (
            <div key={key} className="flex flex-col items-center">
              <span
                className={`font-[family-name:var(--font-mono)] text-sm w-14 text-center ${
                  hostMetrics[key] > 0 ? "text-[#D4A843]" : "text-[#F0E6D3]/20"
                }`}
              >
                {hostMetrics[key] > 0 ? hostMetrics[key].toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>
        <div className="w-24 text-center font-[family-name:var(--font-mono)] text-lg text-[#D4A843] font-bold">
          {hostAvg > 0 ? hostAvg.toFixed(1) : "—"}
        </div>
      </div>

      {/* VIEWER row — read-only display (defaults to 7.0 when no votes) */}
      <div className="flex items-center gap-3 mb-4">
        <span className="font-[family-name:var(--font-mono)] text-xs text-[#E89B2E] uppercase tracking-wider w-[60px] shrink-0 text-right">
          Viewers
        </span>
        <div className="flex-1 flex justify-around">
          {METRIC_KEYS.map((key) => (
            <div key={key} className="flex flex-col items-center">
              <div className="flex items-center">
                <span
                  className={`font-[family-name:var(--font-mono)] text-sm w-14 text-center ${
                    viewerVotes > 0 && viewerMetrics[key] > 0 ? "text-[#E89B2E]" : (viewerVotes > 0 ? "text-[#F0E6D3]/20" : "text-[#E89B2E]/50")
                  }`}
                >
                  {viewerVotes > 0 ? (viewerMetrics[key] > 0 ? viewerMetrics[key].toFixed(1) : "—") : "7.0"}
                </span>
                <DeltaIndicator
                  host={hostMetrics[key]}
                  viewer={viewerMetrics[key]}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="w-24 text-center">
          <span className="font-[family-name:var(--font-mono)] text-lg text-[#E89B2E] font-bold">
            {viewerVotes > 0 ? (viewerAvg > 0 ? viewerAvg.toFixed(1) : "—") : "7.0"}
          </span>
          {viewerVotes > 0 ? (
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#F0E6D3]/30 ml-1">
              ({viewerVotes})
            </span>
          ) : (
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#F0E6D3]/20 ml-1">
              (0)
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#3A2818] mb-4" />

      {/* COMBINED + Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/40 uppercase tracking-wider">
            Combined
          </span>
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#D4A843]">
            {combined > 0 ? combined.toFixed(1) : "—"}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#F0E6D3]/20">
            (host × 0.6 + viewer × 0.4)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCloseVoting}
            disabled={votingClosed}
            className={`font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider px-4 py-2 rounded font-bold transition-colors ${
              votingClosed
                ? "border border-red-600/40 text-red-400/50 bg-red-900/10 cursor-default"
                : "border border-[#C4392A] text-[#C4392A] bg-transparent hover:bg-[#C4392A]/10 cursor-pointer"
            }`}
          >
            {votingClosed ? "🚫 Voting Closed" : "🚫 Close Voting"}
          </button>
          <button
            onClick={onLockScore}
            disabled={locked}
            className={`font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider px-4 py-2 rounded font-bold transition-colors ${
              locked
                ? "border border-green-600/40 text-green-400/50 bg-green-900/10 cursor-default"
                : "border border-[#D4A843] text-[#D4A843] bg-transparent hover:bg-[#D4A843]/10 cursor-pointer"
            }`}
          >
            {locked ? "🔒 Score Locked" : "🔒 Lock Score"}
          </button>
        </div>
      </div>
    </div>
  );
}
