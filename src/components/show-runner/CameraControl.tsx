"use client";

import { useState, useCallback } from "react";

type CameraRole = "host" | "judge" | "artist";

interface CameraSlot {
  label: string;
  role: CameraRole;
  active: boolean;
}

interface CameraControlProps {
  sendMessage: (type: string, data: Record<string, unknown>) => boolean;
  hostName?: string;
  judgeName?: string;
  contestantName?: string;
}

const LAYOUTS = ["1up", "2up", "3up", "4up"] as const;

export default function CameraControl({
  sendMessage,
  hostName = "Don Ziglioni",
  judgeName = "",
  contestantName = "",
}: CameraControlProps) {
  const [activeLayout, setActiveLayout] = useState<string>("1up");
  const [slots, setSlots] = useState<CameraSlot[]>([
    { label: hostName, role: "host", active: true },
    { label: judgeName, role: "judge", active: !!judgeName },
    { label: contestantName, role: "artist", active: false },
    { label: "", role: "artist", active: false },
  ]);

  const handleLayoutChange = useCallback(
    (layout: string) => {
      setActiveLayout(layout);
      sendMessage("camera-layout", { layout });
    },
    [sendMessage]
  );

  const updateSlot = useCallback(
    (index: number, updates: Partial<CameraSlot>) => {
      setSlots((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const pushNames = useCallback(() => {
    // Send all active slot names to overlays via WS
    const activeSlots = slots
      .map((s, i) => ({ ...s, index: i }))
      .filter((s) => s.active && s.label);
    sendMessage("camera-names", {
      slots: activeSlots.map((s) => ({
        index: s.index,
        label: s.label,
        role: s.role,
      })),
    });
  }, [slots, sendMessage]);

  const handleClear = useCallback(
    (index: number) => {
      updateSlot(index, { active: false, label: "" });
      sendMessage("camera-clear", { slot: index });
    },
    [updateSlot, sendMessage]
  );

  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-4 relative overflow-hidden">
      <h3 className="font-[family-name:var(--font-display)] text-sm text-[#D4A843] uppercase tracking-[0.15em] font-bold mb-3">
        Camera / Names
      </h3>

      {/* Layout selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#F0E6D3]/40 uppercase tracking-wider mr-2">
          Layout
        </span>
        {LAYOUTS.map((layout) => (
          <button
            key={layout}
            onClick={() => handleLayoutChange(layout)}
            className={`font-[family-name:var(--font-mono)] text-xs px-3 py-1.5 rounded border transition-all uppercase tracking-wider ${
              activeLayout === layout
                ? "border-[#D4A843] text-[#D4A843] bg-[#D4A843]/10 shadow-[0_0_8px_rgba(212,168,67,0.2)]"
                : "border-[#3A2818] text-[#F0E6D3]/40 hover:border-[#D4A843]/40 hover:text-[#F0E6D3]/60"
            }`}
          >
            {layout}
          </button>
        ))}
      </div>

      {/* Slots */}
      <div className="space-y-2 mb-4">
        {slots.map((slot, i) => (
          <div
            key={i}
            className="flex items-center gap-2 px-3 py-2 rounded border border-[#3A2818] bg-[#1A0F0A]/50"
          >
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#F0E6D3]/40 uppercase tracking-wider w-10">
              {slot.role}
            </span>
            <input
              type="text"
              value={slot.label}
              onChange={(e) => updateSlot(i, { label: e.target.value })}
              placeholder={slot.role === "host" ? "Host name" : slot.role === "judge" ? "Judge name" : "Contestant name"}
              className="flex-1 bg-[#1A0F0A] border border-[#3A2818] rounded px-2 py-1.5 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-xs focus:border-[#D4A843]/50 focus:outline-none transition-colors"
            />
            <button
              onClick={() => updateSlot(i, { active: !slot.active })}
              className={`font-[family-name:var(--font-mono)] text-[10px] px-2 py-1 rounded border transition-colors uppercase tracking-wider ${
                slot.active
                  ? "border-green-700/40 text-green-400 bg-green-900/20"
                  : "border-[#3A2818] text-[#F0E6D3]/30"
              }`}
            >
              {slot.active ? "ON" : "OFF"}
            </button>
            {slot.role !== "host" && (
              <button
                onClick={() => handleClear(i)}
                className="font-[family-name:var(--font-mono)] text-[10px] px-2 py-1 rounded border border-red-800/40 text-red-400 hover:bg-red-900/30 transition-colors uppercase tracking-wider"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Push to overlays */}
      <button
        onClick={pushNames}
        className="w-full font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded border border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10 transition-colors uppercase tracking-wider"
      >
        Push Names to Overlays
      </button>
    </div>
  );
}
