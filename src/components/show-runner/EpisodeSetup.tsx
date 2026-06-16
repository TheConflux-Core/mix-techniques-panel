"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Episode } from "@/lib/types";

interface EpisodeSetupProps {
  onEpisodeCreated?: (episode: Episode) => void;
  onEpisodeUpdated?: (episode: Episode) => void;
  onCancel?: () => void;
  initialEpisode?: Episode | null;
}

export default function EpisodeSetup({
  onEpisodeCreated,
  onEpisodeUpdated,
  onCancel,
  initialEpisode,
}: EpisodeSetupProps) {
  const isEdit = !!initialEpisode;

  const [episodeNumber, setEpisodeNumber] = useState("");
  const [title, setTitle] = useState("");
  const [airDate, setAirDate] = useState("");
  const [guestJudges, setGuestJudges] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Pre-fill form when editing
  useEffect(() => {
    if (initialEpisode) {
      setEpisodeNumber(String(initialEpisode.episode_number || ""));
      setTitle(initialEpisode.title || "");
      setAirDate(initialEpisode.air_date ? initialEpisode.air_date.split("T")[0] : "");
      setGuestJudges(
        Array.isArray(initialEpisode.guest_judges)
          ? initialEpisode.guest_judges.join(", ")
          : initialEpisode.guest_judges || ""
      );
      setDescription(initialEpisode.description || "");
    }
  }, [initialEpisode]);

  const handleSave = async () => {
    if (!episodeNumber) {
      setError("Episode number is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const payload: Record<string, any> = {
        episode_number: Number(episodeNumber),
        title: title || null,
        air_date: airDate || null,
        guest_judges: guestJudges || null,
        description: description || null,
      };

      if (isEdit && initialEpisode) {
        // PATCH existing episode
        const res = await fetch(`/api/episodes/${initialEpisode.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to update episode");
        }
        const episode = await res.json();
        onEpisodeUpdated?.(episode);
      } else {
        // POST new episode
        const res = await fetch("/api/episodes", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || "Failed to create episode");
        }
        const episode = await res.json();
        onEpisodeCreated?.(episode);
      }

      // Reset form
      setEpisodeNumber("");
      setTitle("");
      setAirDate("");
      setGuestJudges("");
      setDescription("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[#D4A843] uppercase tracking-[0.15em] font-bold">
          {isEdit ? "Edit Episode" : "New Episode"}
        </h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 hover:text-[#D4A843] transition-colors px-3 py-1 rounded border border-[#3A2818] hover:border-[#D4A843]/40"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded font-[family-name:var(--font-mono)] text-sm mb-4 error-shake">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 uppercase tracking-wider block mb-2">
            Episode Number *
          </label>
          <input
            type="number"
            value={episodeNumber}
            onChange={(e) => setEpisodeNumber(e.target.value)}
            className="w-full bg-[#1A0F0A] border border-[#3A2818] rounded px-3 py-2 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm focus:border-[#D4A843]/50 focus:outline-none transition-colors"
            placeholder="e.g. 1"
          />
        </div>
        <div>
          <label className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 uppercase tracking-wider block mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1A0F0A] border border-[#3A2818] rounded px-3 py-2 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm focus:border-[#D4A843]/50 focus:outline-none transition-colors"
            placeholder="e.g. The Warm-Up"
          />
        </div>
        <div>
          <label className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 uppercase tracking-wider block mb-2">
            Air Date
          </label>
          <input
            type="date"
            value={airDate}
            onChange={(e) => setAirDate(e.target.value)}
            className="w-full bg-[#1A0F0A] border border-[#3A2818] rounded px-3 py-2 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm focus:border-[#D4A843]/50 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 uppercase tracking-wider block mb-2">
            Guest Judges
          </label>
          <input
            type="text"
            value={guestJudges}
            onChange={(e) => setGuestJudges(e.target.value)}
            className="w-full bg-[#1A0F0A] border border-[#3A2818] rounded px-3 py-2 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm focus:border-[#D4A843]/50 focus:outline-none transition-colors"
            placeholder="e.g. Alex Tumay, Young Guru"
          />
        </div>
        <div className="md:col-span-2">
          <label className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 uppercase tracking-wider block mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-[#1A0F0A] border border-[#3A2818] rounded px-3 py-2 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm focus:border-[#D4A843]/50 focus:outline-none transition-colors resize-none"
            placeholder="Optional episode description or notes..."
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-6">
        {onCancel && (
          <button
            onClick={onCancel}
            className="font-[family-name:var(--font-mono)] text-sm text-[#F0E6D3]/50 hover:text-[#F0E6D3] transition-colors px-4 py-2 rounded"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !episodeNumber}
          className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-6 py-3 rounded disabled:opacity-50 font-semibold tracking-wider uppercase shadow-[0_0_20px_rgba(212,168,67,0.15)]"
        >
          {saving
            ? isEdit ? "Saving..." : "Creating..."
            : isEdit ? "💾 Save Changes" : "🎬 Create Episode"}
        </button>
      </div>
    </div>
  );
}
