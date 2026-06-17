"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Episode } from "@/lib/types";
import Navbar from "@/components/Navbar";

export default function ShowRunnerClient() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [title, setTitle] = useState("");
  const [airDate, setAirDate] = useState("");
  const [guestJudges, setGuestJudges] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      fetchEpisodes();
    };
    checkAuth();
  }, []);

  const fetchEpisodes = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/episodes", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setEpisodes(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const openCreateForm = () => {
    setEditingEpisode(null);
    setEpisodeNumber("");
    setTitle("");
    setAirDate("");
    setGuestJudges("");
    setDescription("");
    setError(null);
    setFormOpen(true);
  };

  const openEditForm = (ep: Episode) => {
    setEditingEpisode(ep);
    setEpisodeNumber(String(ep.episode_number || ""));
    setTitle(ep.title || "");
    setAirDate(ep.air_date ? ep.air_date.split("T")[0] : "");
    setGuestJudges(Array.isArray(ep.guest_judges) ? ep.guest_judges.join(", ") : ep.guest_judges || "");
    setDescription(ep.description || "");
    setError(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!episodeNumber) { setError("Episode number is required"); return; }
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

      const isEdit = !!editingEpisode;
      const url = isEdit ? `/api/episodes/${editingEpisode.id}` : "/api/episodes";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Failed to ${isEdit ? "update" : "create"} episode`);
      }
      const episode = await res.json();

      if (isEdit) {
        setEpisodes((prev) => prev.map((e) => (e.id === episode.id ? episode : e)));
      } else {
        setEpisodes((prev) => [episode, ...prev]);
      }
      setFormOpen(false);
      setEditingEpisode(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    if (!confirm("Delete this episode? This cannot be undone.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/episodes/${episodeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setEpisodes((prev) => prev.filter((e) => e.id !== episodeId));
    } catch { /* silent */ }
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="fixed inset-0 carbon-fiber pointer-events-none -z-10" />
      <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50 -z-10" />
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-[#D4A843] uppercase tracking-[0.2em] font-bold gold-shimmer">
                Show Runner
              </h1>
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm mt-2 uppercase tracking-wider">
                Episode Dashboard
              </p>
            </div>
            <button
              onClick={openCreateForm}
              className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-4 py-2 rounded font-semibold"
            >
              Create Episode
            </button>
          </div>

          {/* Create / Edit Form */}
          {formOpen && (
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 mb-8 relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-[family-name:var(--font-display)] text-xl text-[#D4A843] uppercase tracking-[0.15em] font-bold">
                  {editingEpisode ? "Edit Episode" : "New Episode"}
                </h2>
                <button
                  onClick={() => { setFormOpen(false); setEditingEpisode(null); }}
                  className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 hover:text-[#D4A843] transition-colors px-3 py-1 rounded border border-[#3A2818] hover:border-[#D4A843]/40"
                >
                  Cancel
                </button>
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
                <button
                  onClick={() => { setFormOpen(false); setEditingEpisode(null); }}
                  className="font-[family-name:var(--font-mono)] text-sm text-[#F0E6D3]/50 hover:text-[#F0E6D3] transition-colors px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !episodeNumber}
                  className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-6 py-3 rounded disabled:opacity-50 font-semibold tracking-wider uppercase shadow-[0_0_20px_rgba(212,168,67,0.15)]"
                >
                  {saving
                    ? editingEpisode ? "Saving..." : "Creating..."
                    : editingEpisode ? "💾 Save Changes" : "🎬 Create Episode"}
                </button>
              </div>
            </div>
          )}

          {/* Episode List */}
          <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[#F0E6D3]/60 uppercase tracking-[0.15em] font-bold mb-4">
              All Episodes
            </h2>

            {loading ? (
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
                Loading...
              </p>
            ) : episodes.length === 0 ? (
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
                No episodes yet.
              </p>
            ) : (
              <div className="space-y-2">
                {episodes.map((ep) => (
                  <div
                    key={ep.id}
                    className="flex items-center justify-between px-4 py-3 rounded border border-[#3A2818] bg-[#1A0F0A]/50 hover:border-[#D4A843]/20 transition-colors"
                  >
                    {/* Left: episode info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <span className="font-[family-name:var(--font-mono)] text-[#D4A843]/60 text-xs w-12 shrink-0">
                        Ep.{String(ep.episode_number).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3] text-sm truncate">
                          {ep.title || "Untitled Episode"}
                        </p>
                        {ep.air_date && (
                          <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs">
                            {new Date(ep.air_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-[family-name:var(--font-mono)] text-xs px-3 py-1 rounded uppercase tracking-wider ${
                          ep.status === "live"
                            ? "text-green-400 border border-green-800"
                            : ep.status === "ready"
                            ? "text-[#D4A843] border border-[#D4A843]/40"
                            : ep.status === "published"
                            ? "text-purple-400 border border-purple-800"
                            : ep.status === "post_production"
                            ? "text-amber-400 border border-amber-800"
                            : "text-[#F0E6D3]/40 border border-[#3A2818]"
                        }`}
                      >
                        {ep.status}
                      </span>

                      {/* Edit */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditForm(ep);
                        }}
                        className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/40 hover:text-[#D4A843] transition-colors px-2 py-1 rounded border border-transparent hover:border-[#D4A843]/20"
                        title="Edit episode"
                      >
                        ✏️
                      </button>

                      {/* Run Show */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/episode/${ep.id}`);
                        }}
                        className="font-[family-name:var(--font-mono)] text-xs text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-3 py-1 rounded font-semibold tracking-wider uppercase"
                      >
                        Run Show
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEpisode(ep.id);
                        }}
                        className="font-[family-name:var(--font-mono)] text-xs text-red-400/40 hover:text-red-400 transition-colors px-2 py-1 rounded border border-transparent hover:border-red-800/40"
                        title="Delete episode"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
