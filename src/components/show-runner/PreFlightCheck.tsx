"use client";

interface PreFlightCheckProps {
  wsConnected: boolean;
  overlayCount: number | null;
  contestantsConfirmed: number;
  contestantsTotal: number;
  allTracksLoaded: boolean;
  episodeStatus: string;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${
        ok
          ? "bg-green-500 shadow-[0_0_4px_rgba(76,175,80,0.5)]"
          : "bg-red-500 shadow-[0_0_4px_rgba(196,57,42,0.5)]"
      }`}
    />
  );
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  planned: { label: "Planned", cls: "text-gray-400" },
  ready: { label: "Ready", cls: "text-[#D4A843]" },
  active: { label: "LIVE", cls: "text-green-400 animate-pulse" },
  live: { label: "LIVE", cls: "text-green-400 animate-pulse" },
  post_production: { label: "Post", cls: "text-amber-400" },
  published: { label: "Published", cls: "text-purple-400" },
};

export default function PreFlightCheck({
  wsConnected,
  overlayCount,
  contestantsConfirmed,
  contestantsTotal,
  allTracksLoaded,
  episodeStatus,
}: PreFlightCheckProps) {
  const allContestantsReady = contestantsConfirmed === contestantsTotal && contestantsTotal > 0;
  const badge = STATUS_BADGE[episodeStatus] || { label: episodeStatus, cls: "text-[#F0E6D3]/40" };

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-[#1A0F0A]/80 border border-[#3A2818] rounded-lg font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider mb-6">
      {/* WS Status */}
      <div className="flex items-center gap-1.5">
        <StatusDot ok={wsConnected} />
        <span style={{ color: wsConnected ? "rgba(76,175,80,0.7)" : "rgba(196,57,42,0.6)" }}>
          {wsConnected ? "Connected" : "Offline"}
        </span>
      </div>

      <span className="text-[#3A2818]">│</span>

      {/* Overlays */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#F0E6D3]/30">Overlays:</span>
        <span className={overlayCount !== null ? "text-[#F0E6D3]/60" : "text-[#F0E6D3]/20"}>
          {overlayCount !== null ? overlayCount : "—"}
        </span>
      </div>

      <span className="text-[#3A2818]">│</span>

      {/* Contestants */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#F0E6D3]/30">Contestants:</span>
        <span className={allContestantsReady ? "text-green-400" : contestantsConfirmed > 0 ? "text-[#E89B2E]" : "text-[#F0E6D3]/40"}>
          {contestantsConfirmed}/{contestantsTotal}
        </span>
      </div>

      <span className="text-[#3A2818]">│</span>

      {/* Tracks */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#F0E6D3]/30">Tracks:</span>
        <span>{allTracksLoaded ? "✅" : "❌"}</span>
      </div>

      <span className="text-[#3A2818]">│</span>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span className="text-[#F0E6D3]/30">Status:</span>
        <span className={badge.cls}>{badge.label}</span>
      </div>
    </div>
  );
}
