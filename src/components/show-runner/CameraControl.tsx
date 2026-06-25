"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Submission } from "@/lib/types";

type CameraRole = "artist" | "host" | "guest";

interface CameraSlot {
  label: string;
  role: CameraRole;
  url: string;
  active: boolean;
}

interface CameraControlProps {
  sendMessage: (type: string, data: Record<string, unknown>) => boolean;
  contestants: Submission[];
  activeContestantIndex: number;
}

const LAYOUTS = ["1up", "2up", "3up", "4up"] as const;
const SLOT_COUNT = 4;

export default function CameraControl({
  sendMessage,
  contestants,
  activeContestantIndex,
}: CameraControlProps) {
  const supabase = createClient();
  const [activeLayout, setActiveLayout] = useState<string>("1up");
  const [slots, setSlots] = useState<CameraSlot[]>(
    Array.from({ length: SLOT_COUNT }, () => ({
      label: "",
      role: "artist" as CameraRole,
      url: "",
      active: false,
    }))
  );

  // Listen for camera-feed confirmations from WS
  useEffect(() => {
    // Status updates come through the parent's onMessage handler.
    // We mark slots active when a load is sent (optimistic).
    // The parent can call methods if needed; for now, track locally.
  }, []);

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

  const handleLoad = useCallback(
    (index: number) => {
      const slot = slots[index];
      if (!slot.url) return;
      sendMessage("camera-feed", {
        slot: index,
        url: slot.url,
        label: slot.label,
        role: slot.role,
      });
      updateSlot(index, { active: true });
    },
    [slots, sendMessage, updateSlot]
  );

  const handleClear = useCallback(
    (index: number) => {
      sendMessage("camera-clear", { slot: index });
      updateSlot(index, { active: false, url: "", label: "" });
    },
    [sendMessage, updateSlot]
  );

  const handleLoadAllFromBackstage = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Find pulled contestants with backstage_room_url
      const pulled = contestants.filter(
        (c) => c.status === "pulled" && c.backstage_room_url
      );
      if (pulled.length === 0) return;

      // Slot 0 = current contestant
      const current = contestants[activeContestantIndex];
      if (current && current.backstage_room_url) {
        updateSlot(0, {
          label: current.name,
          role: "artist",
          url: current.backstage_room_url,
        });
        sendMessage("camera-feed", {
          slot: 0,
          url: current.backstage_room_url,
          label: current.name,
          role: "artist",
        });
        setSlots((prev) =>
          prev.map((s, i) => (i === 0 ? { ...s, active: true } : s))
        );
      }

      // Slot 1 = host (no URL auto-fill for host)
      updateSlot(1, { label: "Host", role: "host" });

      // Slot 2 = next pulled contestant or guest judge
      const nextPulled = pulled.find(
        (c) => c.id !== current?.id
      );
      if (nextPulled && nextPulled.backstage_room_url) {
        updateSlot(2, {
          label: nextPulled.name,
          role: "guest",
          url: nextPulled.backstage_room_url,
        });
        sendMessage("camera-feed", {
          slot: 2,
          url: nextPulled.backstage_room_url,
          label: nextPulled.name,
          role: "guest",
        });
        setSlots((prev) =>
          prev.map((s, i) => (i === 2 ? { ...s, active: true } : s))
        );
      }
    } catch (err) {
      console.error("[CameraControl] Failed to load from backstage:", err);
    }
  }, [contestants, activeContestantIndex, sendMessage, updateSlot]);

  const handleClearAll = useCallback(() => {
    sendMessage("camera-clear-all", {});
    setSlots((prev) =>
      prev.map(() => ({
        label: "",
        role: "artist" as CameraRole,
        url: "",
        active: false,
      }))
    );
  }, [sendMessage]);

  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-4 relative overflow-hidden">
      <h3 className="font-[family-name:var(--font-display)] text-sm text-[#D4A843] uppercase tracking-[0.15em] font-bold mb-3">
        Camera Control
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
      <div className="space-y-3">
        {slots.map((slot, i) => (
          <div
            key={i}
            className="border border-[#3A2818] rounded-lg p-3 bg-[#1A0F0A]/50"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-[family-name:var(--font-mono)] text-[10px] text-[#F0E6D3]/40 uppercase tracking-wider">
                Slot {i}
              </span>
              <span
                className={`flex items-center gap-1.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider ${
                  slot.active ? "text-green-400" : "text-[#F0E6D3]/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    slot.active
                      ? "bg-green-500 shadow-[0_0_6px_rgba(76,175,80,0.5)]"
                      : "bg-[#3A2818]"
                  }`}
                />
                {slot.active ? "LIVE" : "Empty"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={slot.label}
                  onChange={(e) => updateSlot(i, { label: e.target.value })}
                  placeholder="Label"
                  className="flex-1 bg-[#1A0F0A] border border-[#3A2818] rounded px-2 py-1.5 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-xs focus:border-[#D4A843]/50 focus:outline-none transition-colors"
                />
                <select
                  value={slot.role}
                  onChange={(e) =>
                    updateSlot(i, { role: e.target.value as CameraRole })
                  }
                  className="bg-[#1A0F0A] border border-[#3A2818] rounded px-2 py-1.5 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-xs focus:border-[#D4A843]/50 focus:outline-none"
                >
                  <option value="artist">artist</option>
                  <option value="host">host</option>
                  <option value="guest">guest</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={slot.url}
                onChange={(e) => updateSlot(i, { url: e.target.value })}
                placeholder="https://daily.co/room?t=xxx"
                className="flex-1 bg-[#1A0F0A] border border-[#3A2818] rounded px-2 py-1.5 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-xs focus:border-[#D4A843]/50 focus:outline-none transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleLoad(i)}
                disabled={!slot.url}
                className="font-[family-name:var(--font-mono)] text-[10px] px-3 py-1 rounded border border-green-700/40 text-green-400 hover:bg-green-900/30 transition-colors uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Load
              </button>
              <button
                onClick={() => handleClear(i)}
                className="font-[family-name:var(--font-mono)] text-[10px] px-3 py-1 rounded border border-red-800/40 text-red-400 hover:bg-red-900/30 transition-colors uppercase tracking-wider"
              >
                Clear
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk actions */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleLoadAllFromBackstage}
          className="flex-1 font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded border border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10 transition-colors uppercase tracking-wider"
        >
          Load All from Backstage
        </button>
        <button
          onClick={handleClearAll}
          className="flex-1 font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded border border-red-800/40 text-red-400 hover:bg-red-900/30 transition-colors uppercase tracking-wider"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
