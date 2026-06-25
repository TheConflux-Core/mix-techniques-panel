"use client";

interface QuickActionsProps {
  onGoToBreak: () => void;
  onActivateBackup: () => void;
  onSkipContestant: () => void;
  onResetEpisode: () => void;
  onEndShow: () => void;
  onBringOnAir: () => void;
  isOnBreak: boolean;
  hasBackup: boolean;
  currentSegment: string;
  canBringOnAir: boolean;
}

interface ActionButton {
  icon: string;
  label: string;
  accent: string;
  hoverBg: string;
  glow: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

export default function QuickActions({
  onGoToBreak,
  onActivateBackup,
  onSkipContestant,
  onResetEpisode,
  onEndShow,
  onBringOnAir,
  isOnBreak,
  hasBackup,
  currentSegment,
  canBringOnAir,
}: QuickActionsProps) {
  const buttons: ActionButton[] = [
    {
      icon: "📡",
      label: "BRING ON AIR",
      accent: "border-[#D4A843] text-[#1A0F0A] bg-[#D4A843] font-bold",
      hoverBg: "hover:bg-[#E89B2E]",
      glow: "shadow-[0_0_12px_rgba(212,168,67,0.3)]",
      onClick: onBringOnAir,
      disabled: !canBringOnAir,
    },
    {
      icon: "🚨",
      label: isOnBreak ? "▶ RESUME" : "BREAK",
      accent: "border-[#E89B2E]/40 text-[#E89B2E]",
      hoverBg: "hover:bg-[#E89B2E]/10",
      glow: isOnBreak ? "shadow-[0_0_8px_rgba(232,155,46,0.3)]" : "",
      onClick: onGoToBreak,
      active: isOnBreak,
    },
    {
      icon: "🔄",
      label: "BACKUP",
      accent: "border-[#D4A843]/40 text-[#D4A843]",
      hoverBg: "hover:bg-[#D4A843]/10",
      glow: "",
      onClick: onActivateBackup,
      disabled: !hasBackup,
    },
    {
      icon: "⏭",
      label: "SKIP",
      accent: "border-[#C4392A]/40 text-[#C4392A]",
      hoverBg: "hover:bg-[#C4392A]/10",
      glow: "",
      onClick: onSkipContestant,
    },
    {
      icon: "🔁",
      label: "RESET",
      accent: "border-[#C4392A]/40 text-[#C4392A]",
      hoverBg: "hover:bg-[#C4392A]/10",
      glow: "",
      onClick: onResetEpisode,
    },
    {
      icon: "⏹",
      label: "END SHOW",
      accent: "border-[#C4392A]/60 text-[#C4392A] font-bold",
      hoverBg: "hover:bg-[#C4392A]/10",
      glow: "",
      onClick: onEndShow,
    },
  ];

  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-4 relative overflow-hidden mt-6">
      <h3 className="font-[family-name:var(--font-display)] text-sm text-[#F0E6D3]/40 uppercase tracking-[0.15em] font-bold mb-3">
        Quick Actions
      </h3>
      <div className="flex items-center gap-3">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            disabled={btn.disabled}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg border bg-[#1A0F0A]/50 transition-all font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider ${
              btn.disabled
                ? "opacity-30 cursor-not-allowed border-[#3A2818] text-[#F0E6D3]/20"
                : `${btn.accent} ${btn.hoverBg} ${btn.glow} ${
                    btn.active ? "shadow-[0_0_12px_rgba(232,155,46,0.2)]" : ""
                  }`
            }`}
          >
            <span className="text-lg">{btn.icon}</span>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
