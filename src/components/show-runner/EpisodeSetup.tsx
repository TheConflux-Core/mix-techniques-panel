"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Submission } from "@/lib/types";

interface EpisodeSetupProps {
  onEpisodeCreated?: (episode: any) => void;
}

export default function EpisodeSetup({ onEpisodeCreated }: EpisodeSetupProps) {
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [title, setTitle] = useState("");
  const [airDate, setAirDate] = useState("");
  const [guestJudges, setGuestJudges] = useState("");
  const [pulledContestants, setPulledContestants] = useState<(Submission & { pull_status: "pending" | "confirmed" })[]>([]);
  const [availableSubmissions, setAvailableSubmissions] = useState<Submission[]>([]);
  const [selectedManualId, setSelectedManualId] = useState("");
  const [pulling, setPulling] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAvailable = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/submissions?status=submitted", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableSubmissions(data);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchAvailable();
  }, [fetchAvailable]);

  const handlePull4 = async () => {
    setPulling(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const pulled: (Submission & { pull_status: "pending" | "confirmed" })[] = [];
      const existingIds = new Set(pulledContestants.map((c) => c.id));

      for (let i = 0; i < 4; i++) {
        const res = await fetch("/api/submissions/pull", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || `Failed on pull ${i + 1}`);
        }
        const data = await res.json();
        // Avoid duplicates
        if (!existingIds.has(data.submission.id) && !pulled.find((p) => p.id === data.submission.id)) {
          pulled.push({ ...data.submission, pull_status: "pending" });
        } else {
          // Retry once for duplicates
          i--;
        }
      }

      setPulledContestants((prev) => [...prev, ...pulled]);
      await fetchAvailable();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPulling(false);
    }
  };

  const handleManualAssign = () => {
    if (!selectedManualId) return;
    const sub = availableSubmissions.find((s) => s.id === selectedManualId);
    if (!sub) return;
    if (pulledContestants.find((c) => c.id === sub.id)) return; // already added
    setPulledContestants((prev) => [...prev, { ...sub, pull_status: "confirmed" }]);
    setSelectedManualId("");
  };

  const handleConfirmContestant = (id: string) => {
    setPulledContestants((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pull_status: "confirmed" } : c))
    );
  };

  const handleRemoveContestant = (id: string) => {
    setPulledContestants((prev) => prev.filter((c) => c.id !== id));
  };

  const handleCreateEpisode = async () => {
    if (!episodeNumber) {
      setError("Episode number is required");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Create episode
      const epRes = await fetch("/api/episodes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          episode_number: Number(episodeNumber),
          title: title || null,
          air_date: airDate || null,
          guest_judges: guestJudges || null,
        }),
      });
      if (!epRes.ok) {
        const body = await epRes.json();
        throw new Error(body.error || "Failed to create episode");
      }
      const episode = await epRes.json();

      // Assign confirmed contestants to the episode
      const confirmed = pulledContestants.filter((c) => c.pull_status === "confirmed");
      for (let i = 0; i < confirmed.length; i++) {
        const assignRes = await fetch(`/api/episodes/${episode.id}/contestants`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ submission_id: confirmed[i].id, pull_order: i + 1 }),
        });
        if (!assignRes.ok) {
          console.error(`Failed to assign contestant ${confirmed[i].name}`);
        }
      }

      onEpisodeCreated?.(episode);
      // Reset form
      setEpisodeNumber("");
      setTitle("");
      setAirDate("");
      setGuestJudges("");
      setPulledContestants([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const pendingCount = pulledContestants.filter((c) => c.pull_status === "pending").length;

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded font-[family-name:var(--font-mono)] text-sm error-shake">
          {error}
        </div>
      )}

      {/* Episode Details Form */}
      <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[#D4A843] uppercase tracking-[0.15em] font-bold mb-6">
          New Episode
        </h2>
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
        </div>
      </div>

      {/* Contestant Pull & Assign */}
      <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#D4A843] uppercase tracking-[0.15em] font-bold">
            Contestants
          </h2>
          <button
            onClick={handlePull4}
            disabled={pulling}
            className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-4 py-2 rounded disabled:opacity-50 font-semibold"
          >
            {pulling ? "Pulling..." : "🎲 Pull 4 Names"}
          </button>
        </div>

        {/* Manual assign */}
        <div className="flex items-end gap-3 mb-6">
          <div className="flex-1">
            <label className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 uppercase tracking-wider block mb-2">
              Manual Assign
            </label>
            <select
              value={selectedManualId}
              onChange={(e) => setSelectedManualId(e.target.value)}
              className="w-full bg-[#1A0F0A] border border-[#3A2818] rounded px-3 py-2 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm focus:border-[#D4A843]/50 focus:outline-none transition-colors"
            >
              <option value="">Select a submission...</option>
              {availableSubmissions
                .filter((s) => !pulledContestants.find((c) => c.id === s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.track_title || "Untitled"} ({s.genre})
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={handleManualAssign}
            disabled={!selectedManualId}
            className="font-[family-name:var(--font-mono)] text-sm text-[#F0E6D3]/70 hover:text-[#D4A843] border border-[#3A2818] hover:border-[#D4A843]/40 px-4 py-2 rounded transition-colors disabled:opacity-30"
          >
            + Add
          </button>
        </div>

        {/* Pulled contestants list */}
        {pulledContestants.length === 0 ? (
          <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
            No contestants yet. Pull names or manually assign.
          </p>
        ) : (
          <div className="space-y-2">
            {pulledContestants.map((contestant, i) => (
              <div
                key={contestant.id}
                className={`flex items-center justify-between px-4 py-3 rounded border transition-colors ${
                  contestant.pull_status === "confirmed"
                    ? "border-[#D4A843]/30 bg-[#D4A843]/5"
                    : "border-[#3A2818] bg-[#1A0F0A]/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="font-[family-name:var(--font-mono)] text-[#D4A843]/60 text-xs w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3] text-sm font-medium">
                      {contestant.name}
                    </p>
                    <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-xs">
                      {contestant.track_title || "Untitled"} · {contestant.genre}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {contestant.pull_status === "pending" ? (
                    <button
                      onClick={() => handleConfirmContestant(contestant.id)}
                      className="font-[family-name:var(--font-mono)] text-xs text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 px-3 py-1 rounded transition-colors"
                    >
                      Confirm
                    </button>
                  ) : (
                    <span className="font-[family-name:var(--font-mono)] text-xs text-[#D4A843]/60 border border-[#D4A843]/20 px-3 py-1 rounded">
                      ✓ Confirmed
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveContestant(contestant.id)}
                    className="font-[family-name:var(--font-mono)] text-xs text-red-400/60 hover:text-red-400 px-2 py-1 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Episode Button */}
      <div className="flex items-center justify-between">
        <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs">
          {pulledContestants.length} contestant{pulledContestants.length !== 1 ? "s" : ""} assigned
          {pendingCount > 0 && ` (${pendingCount} pending confirmation)`}
        </p>
        <button
          onClick={handleCreateEpisode}
          disabled={creating || !episodeNumber}
          className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-6 py-3 rounded disabled:opacity-50 font-semibold tracking-wider uppercase"
        >
          {creating ? "Creating..." : "🎬 Create Episode"}
        </button>
      </div>
    </div>
  );
}
