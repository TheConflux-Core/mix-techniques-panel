"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Submission } from "@/lib/types";

interface BackstageEntry {
  submission: Submission;
  roomCreated: boolean;
  connected: boolean;
}

interface BackstageStatusProps {
  contestants: Submission[];
  episodeId: string;
}

export default function BackstageStatus({
  contestants,
  episodeId,
}: BackstageStatusProps) {
  const supabase = createClient();
  const [entries, setEntries] = useState<BackstageEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pulled = useMemo(
    () => contestants.filter((c) => c.status === "pulled"),
    [contestants]
  );

  // Build entries from pulled contestants
  useEffect(() => {
    const newEntries: BackstageEntry[] = pulled.map((c) => ({
      submission: c,
      roomCreated: !!c.backstage_room_url,
      connected: false, // TODO: track via WS presence when available
    }));
    setEntries(newEntries);
  }, [pulled]);

  const getStatusDisplay = (entry: BackstageEntry) => {
    if (entry.connected)
      return { emoji: "🟢", label: "Connected", color: "text-green-400" };
    if (entry.roomCreated)
      return { emoji: "🟡", label: "Waiting", color: "text-amber-400" };
    return { emoji: "🔴", label: "Not Joined", color: "text-red-400" };
  };

  const handleCreateAllRooms = useCallback(async () => {
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Create rooms for each pulled submission that doesn't have one
      const needsRoom = entries.filter((e) => !e.roomCreated);
      for (const entry of needsRoom) {
        try {
          await fetch("/api/backstage", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              submission_id: entry.submission.id,
              episode_id: episodeId,
            }),
          });
        } catch (err) {
          console.error(
            `[BackstageStatus] Failed to create room for ${entry.submission.name}:`,
            err
          );
        }
      }

      // Refresh data
      await handleRefresh();
    } finally {
      setCreating(false);
    }
  }, [entries, episodeId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/episodes/${episodeId}/contestants`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const updated: Submission[] = await res.json();
        const pulledUpdated = updated.filter((c) => c.status === "pulled");
        setEntries(
          pulledUpdated.map((c) => ({
            submission: c,
            roomCreated: !!c.backstage_room_url,
            connected: false,
          }))
        );
      }
    } catch (err) {
      console.error("[BackstageStatus] Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  }, [episodeId]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(handleRefresh, 15000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-4 relative overflow-hidden">
      <h3 className="font-[family-name:var(--font-display)] text-sm text-[#D4A843] uppercase tracking-[0.15em] font-bold mb-3">
        Backstage
      </h3>

      {entries.length === 0 ? (
        <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs text-center py-4">
          No pulled contestants
        </p>
      ) : (
        <div className="space-y-2 mb-3">
          {entries.map((entry) => {
            const status = getStatusDisplay(entry);
            return (
              <div
                key={entry.submission.id}
                className="flex items-center gap-3 px-3 py-2 rounded border border-[#3A2818] bg-[#1A0F0A]/50"
              >
                <span className="text-sm">{status.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-[family-name:var(--font-mono)] text-[#F0E6D3] text-xs font-medium truncate block">
                    {entry.submission.name}
                  </span>
                  <span className={`font-[family-name:var(--font-mono)] text-[10px] ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <span className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-[10px] truncate max-w-[120px]">
                  {entry.submission.track_title || "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleCreateAllRooms}
          disabled={creating}
          className="flex-1 font-[family-name:var(--font-mono)] text-[10px] px-3 py-1.5 rounded border border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10 transition-colors uppercase tracking-wider disabled:opacity-30"
        >
          {creating ? "Creating..." : "Create All Rooms"}
        </button>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="font-[family-name:var(--font-mono)] text-[10px] px-3 py-1.5 rounded border border-[#3A2818] text-[#F0E6D3]/40 hover:text-[#F0E6D3]/60 hover:border-[#D4A843]/20 transition-colors uppercase tracking-wider disabled:opacity-30"
        >
          {refreshing ? "..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}
