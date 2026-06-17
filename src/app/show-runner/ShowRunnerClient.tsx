"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Episode } from "@/lib/types";
import Navbar from "@/components/Navbar";
import EpisodeSetup from "@/components/show-runner/EpisodeSetup";

export default function ShowRunnerClient() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);

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

  const handleEpisodeCreated = (episode: Episode) => {
    setEpisodes((prev) => [episode, ...prev]);
    setShowSetup(false);
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
      <div className="fixed inset-0 carbon-fiber pointer-events-none" />
      <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50" />
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
              onClick={() => { setEditingEpisode(null); setShowSetup(true); }}
              className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-4 py-2 rounded font-semibold"
            >
              + New Episode
            </button>
          </div>

          {/* Create / Edit Form */}
          {showSetup && (
            <div className="mb-8">
              <EpisodeSetup
                initialEpisode={editingEpisode}
                onEpisodeCreated={handleEpisodeCreated}
                onEpisodeUpdated={(updated) => {
                  setEpisodes((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
                  setShowSetup(false);
                  setEditingEpisode(null);
                }}
                onCancel={() => { setShowSetup(false); setEditingEpisode(null); }}
              />
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
                No episodes yet. Create your first one above.
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
                          setEditingEpisode(ep);
                          setShowSetup(true);
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
