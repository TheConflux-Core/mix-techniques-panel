"use client";

interface AudioControlsProps {
  currentTrack: { title: string; artist: string; url: string } | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onPushToViewers: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export default function AudioControls({
  currentTrack,
  isPlaying,
  onPlay,
  onPause,
  onPushToViewers,
  volume,
  onVolumeChange,
}: AudioControlsProps) {
  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-6 bg-[#D4A843] rounded-full" />
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold">
          Audio
        </h2>
      </div>

      {/* Track info + play button */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="w-10 h-10 rounded-full bg-[#2A1810] border border-[#3A2818] hover:border-[#D4A843]/40 text-[#D4A843] flex items-center justify-center transition-colors shrink-0"
        >
          {isPlaying ? (
            <span className="text-sm">⏸</span>
          ) : (
            <span className="text-sm ml-0.5">▶</span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          {currentTrack ? (
            <>
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3] text-sm truncate">
                &ldquo;{currentTrack.title}&rdquo;
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-xs">
                by {currentTrack.artist}
              </p>
            </>
          ) : (
            <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm">
              No track loaded
            </p>
          )}
        </div>
      </div>

      {/* Waveform progress (visual only) */}
      <div className="mb-4">
        <div className="h-1 bg-[#3A2818] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#D4A843] to-[#E89B2E] rounded-full transition-all duration-300"
            style={{ width: isPlaying ? "37%" : "0%" }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#F0E6D3]/20">
            {isPlaying ? "1:23" : "0:00"}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[9px] text-[#F0E6D3]/20">
            {currentTrack ? "3:45" : "--:--"}
          </span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 mb-5">
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#F0E6D3]/40 uppercase tracking-wider w-14">
          Volume
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
          className="flex-1 accent-[#D4A843] h-1"
        />
        <span className="font-[family-name:var(--font-mono)] text-xs text-[#D4A843] w-10 text-right">
          {volume}%
        </span>
      </div>

      {/* Push to Viewers */}
      <button
        onClick={onPushToViewers}
        disabled={!currentTrack}
        className="w-full bg-[#D4A843] text-[#1A0F0A] font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider px-4 py-2 rounded font-bold hover:bg-[#E89B2E] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        🔊 Push to Viewers
      </button>
    </div>
  );
}
