"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import type { Episode, Submission } from "@/lib/types";
import { GENRE_OPTIONS } from "@/lib/types";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import AudioPlayer from "@/components/AudioPlayer";
import WaveformPreview from "@/components/WaveformPreview";

export default function EpisodeDetailClient() {
  const params = useParams();
  const episodeId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [contestants, setContestants] = useState<Submission[]>([]);
  const [availableSubmissions, setAvailableSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  const fetchEpisode = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      const res = await fetch(`/api/episodes/${episodeId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch episode");
      setEpisode(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }, [episodeId]);

  const fetchContestants = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/episodes/${episodeId}/contestants`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setContestants(await res.json());
    } catch { /* silent */ }
  }, [episodeId]);

  const fetchAvailable = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/submissions?status=submitted", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setAvailableSubmissions(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchEpisode(), fetchContestants(), fetchAvailable()]);
      setLoading(false);
    };
    init();
  }, [fetchEpisode, fetchContestants, fetchAvailable]);

  const handleToggleSubmissions = async () => {
    if (!episode) return;
    setToggling(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const newValue = !episode.submissions_open;
      const res = await fetch(`/api/episodes/${episodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ submissions_open: newValue }),
      });
      if (!res.ok) throw new Error("Failed to update submission status");
      const updated = await res.json();
      setEpisode(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setToggling(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedSubmissionId || !episode) return;
    setAssigning(selectedSubmissionId);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const nextOrder = contestants.length > 0
        ? Math.max(...contestants.map((c) => c.pull_order || 0)) + 1
        : 1;

      const res = await fetch(`/api/episodes/${episodeId}/contestants`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ submission_id: selectedSubmissionId, pull_order: nextOrder }),
      });
      if (!res.ok) throw new Error("Failed to assign submission");

      setSelectedSubmissionId("");
      await Promise.all([fetchContestants(), fetchAvailable()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(null);
    }
  };

  const handleRemove = async (submissionId: string) => {
    setRemoving(submissionId);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Unassign: clear episode_id and reset status to submitted
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: "submitted", episode_id: null }),
      });
      if (!res.ok) throw new Error("Failed to remove contestant");

      await Promise.all([fetchContestants(), fetchAvailable()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRemoving(null);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!episode) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/episodes/${episodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setEpisode(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getNextStatus = (current: string) => {
    switch (current) {
      case "setup": return { label: "Mark Ready", status: "ready", desc: "Lock lineup, close submissions." };
      case "ready": return { label: "🔴 GO LIVE", status: "live", desc: "Start broadcast." };
      case "live": return { label: "End Show", status: "post_production", desc: "Stop broadcast." };
      case "post_production": return { label: "Publish", status: "published", desc: "Finalize episode." };
      default: return null;
    }
  };

  const getGenreLabel = (value: string) =>
    GENRE_OPTIONS.find((g) => g.value === value)?.label || value;

  // Filter available to exclude already-assigned
  const assignable = availableSubmissions.filter(
    (s) => !contestants.find((c) => c.id === s.id)
  );

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen relative">
        <div className="fixed inset-0 carbon-fiber pointer-events-none" />
        <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50" />
        <Navbar />
        <main className="flex-1 px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-20">
              Loading episode...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="flex flex-col min-h-screen relative">
        <div className="fixed inset-0 carbon-fiber pointer-events-none" />
        <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50" />
        <Navbar />
        <main className="flex-1 px-4 py-8">
          <div className="max-w-5xl mx-auto">
            <p className="font-[family-name:var(--font-mono)] text-red-400 text-sm text-center py-20">
              Episode not found.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const nextStatus = getNextStatus(episode.status);

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="fixed inset-0 carbon-fiber pointer-events-none" />
      <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50" />
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/show-runner")}
                className="font-[family-name:var(--font-mono)] text-sm text-[#F0E6D3]/50 hover:text-[#D4A843] transition-colors border border-[#3A2818] hover:border-[#D4A843]/40 px-3 py-2 rounded"
              >
                ← Show Runner
              </button>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#D4A843] uppercase tracking-[0.15em] font-bold">
                  Ep.{String(episode.episode_number).padStart(2, "0")}
                  {episode.title && (
                    <span className="text-[#F0E6D3]/60 ml-3 text-2xl normal-case tracking-normal">
                      — {episode.title}
                    </span>
                  )}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`font-[family-name:var(--font-mono)] text-xs px-3 py-1 rounded uppercase tracking-wider ${
                    episode.status === "live" ? "text-green-400 border border-green-800"
                    : episode.status === "ready" ? "text-[#D4A843] border border-[#D4A843]/40"
                    : episode.status === "setup" ? "text-blue-400 border border-blue-800"
                    : episode.status === "published" ? "text-purple-400 border border-purple-800"
                    : episode.status === "post_production" ? "text-amber-400 border border-amber-800"
                    : "text-[#F0E6D3]/40 border border-[#3A2818]"
                  }`}>
                    {episode.status}
                  </span>
                  {episode.air_date && (
                    <span className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs">
                      {new Date(episode.air_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded font-[family-name:var(--font-mono)] text-sm mb-6 error-shake">
              {error}
            </div>
          )}

          {/* Submission Controls */}
          <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold">
                  Submissions
                </h2>
                <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs mt-1">
                  {episode.submissions_open
                    ? "Submissions are OPEN — new tracks can be assigned to this episode."
                    : "Submissions are CLOSED — no new tracks can be assigned."}
                </p>
              </div>
              <button
                onClick={handleToggleSubmissions}
                disabled={toggling}
                className={`font-[family-name:var(--font-mono)] text-sm px-6 py-3 rounded font-semibold tracking-wider uppercase transition-all disabled:opacity-50 ${
                  episode.submissions_open
                    ? "bg-red-700 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(185,28,28,0.2)]"
                    : "bg-green-700 hover:bg-green-600 text-white shadow-[0_0_20px_rgba(21,128,61,0.2)]"
                }`}
              >
                {toggling
                  ? "Saving..."
                  : episode.submissions_open
                    ? "🚫 Close Submissions"
                    : "✅ Open Submissions"}
              </button>
            </div>
          </div>

          {/* Status Transition */}
          {nextStatus ? (
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/50 text-sm">
                    Next step: <span className="text-[#D4A843]">{nextStatus.desc}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {episode.status === "ready" && (
                    <button
                      onClick={() => handleStatusChange("setup")}
                      className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/40 hover:text-[#D4A843] border border-[#3A2818] hover:border-[#D4A843]/40 px-3 py-2 rounded transition-colors"
                    >
                      ← Revert to Setup
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusChange(nextStatus.status)}
                    className={`font-[family-name:var(--font-mono)] text-sm px-6 py-3 rounded font-semibold tracking-wider uppercase transition-colors ${
                      nextStatus.status === "live"
                        ? "bg-green-700 hover:bg-green-600 text-white animate-pulse"
                        : nextStatus.status === "published"
                        ? "bg-purple-700 hover:bg-purple-600 text-white"
                        : "bg-[#D4A843] hover:bg-[#E89B2E] text-[#1A0F0A]"
                    }`}
                  >
                    {nextStatus.label}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden mb-6">
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center">
                This episode is finalized.{' '}
                <button
                  onClick={() => router.push("/show-runner")}
                  className="text-[#D4A843] hover:underline"
                >
                  ← Back to Show Runner
                </button>
              </p>
            </div>
          )}

          {/* Contestant Queue */}
          <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold">
                Contestant Queue
              </h2>
              <button
                onClick={() => setShowAssignPanel(!showAssignPanel)}
                className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/70 hover:text-[#D4A843] border border-[#3A2818] hover:border-[#D4A843]/40 px-3 py-1.5 rounded transition-colors"
              >
                {showAssignPanel ? "Hide" : "+ Assign Submission"}
              </button>
            </div>

            {/* Assign panel */}
            {showAssignPanel && (
              <div className="flex items-end gap-3 mb-6 p-4 bg-[#0F0A07] rounded border border-[#3A2818]">
                <div className="flex-1">
                  <label className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 uppercase tracking-wider block mb-2">
                    Select Submission
                  </label>
                  <select
                    value={selectedSubmissionId}
                    onChange={(e) => setSelectedSubmissionId(e.target.value)}
                    className="w-full bg-[#1A0F0A] border border-[#3A2818] rounded px-3 py-2 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm focus:border-[#D4A843]/50 focus:outline-none transition-colors"
                  >
                    <option value="">Choose a submission...</option>
                    {assignable.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.track_title || "Untitled"} ({getGenreLabel(s.genre)})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssign}
                  disabled={!selectedSubmissionId || assigning === selectedSubmissionId}
                  className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-4 py-2 rounded disabled:opacity-30 font-semibold"
                >
                  {assigning === selectedSubmissionId ? "Assigning..." : "Assign"}
                </button>
              </div>
            )}

            {/* Contestant list */}
            {contestants.length === 0 ? (
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
                No contestants assigned yet.
              </p>
            ) : (
              <div className="space-y-2">
                {contestants.map((c, i) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 px-4 py-3 rounded border border-[#3A2818] bg-[#1A0F0A]/50"
                  >
                    <span className="font-[family-name:var(--font-mono)] text-[#D4A843]/60 text-xs w-6">
                      {String(c.pull_order ?? i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3] text-sm font-medium truncate">
                        {c.name}
                      </p>
                      <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-xs truncate">
                        {c.track_title || "Untitled"} · {getGenreLabel(c.genre)}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                    <button
                      onClick={() => handleRemove(c.id)}
                      disabled={removing === c.id}
                      className="font-[family-name:var(--font-mono)] text-xs text-red-400/60 hover:text-red-400 px-2 py-1 transition-colors disabled:opacity-30"
                      title="Remove from episode"
                    >
                      {removing === c.id ? "..." : "✕"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Episode Details */}
          {(episode.guest_judges?.length > 0 || episode.description) && (
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold mb-4">
                Details
              </h2>
              {episode.guest_judges && episode.guest_judges.length > 0 && (
                <div className="mb-3">
                  <p className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 uppercase tracking-wider mb-1">
                    Guest Judges
                  </p>
                  <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3] text-sm">
                    {episode.guest_judges.map((j) => j.startsWith("@") ? j : `@${j}`).join(", ")}
                  </p>
                </div>
              )}
              {episode.description && (
                <div>
                  <p className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 uppercase tracking-wider mb-1">
                    Description
                  </p>
                  <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/70 text-sm">
                    {episode.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
