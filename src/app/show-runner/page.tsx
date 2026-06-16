"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Episode, Submission } from "@/lib/types";
import Navbar from "@/components/Navbar";
import EpisodeSetup from "@/components/show-runner/EpisodeSetup";
import EpisodeHeader from "@/components/show-runner/EpisodeHeader";
import ContestantQueue from "@/components/show-runner/ContestantQueue";
import SegmentControl from "@/components/show-runner/SegmentControl";
import Timer from "@/components/show-runner/Timer";
import LiveScores, { type MetricScores } from "@/components/show-runner/LiveScores";
import AudioControls from "@/components/show-runner/AudioControls";
import PreFlightCheck from "@/components/show-runner/PreFlightCheck";
import QuickActions from "@/components/show-runner/QuickActions";
import { useOverlaySocket } from "@/lib/useOverlaySocket";

export default function ShowRunnerPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [contestants, setContestants] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  // Live control state
  const [currentSegment, setCurrentSegment] = useState("COLD_OPEN");
  const [segmentHistory, setSegmentHistory] = useState<string[]>([]);
  const [activeContestantIndex, setActiveContestantIndex] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Phase 3: Scoring & Audio state
  const emptyMetrics: MetricScores = { lowEnd: 0, clarity: 0, balance: 0, dynamics: 0, image: 0 };
  const [hostMetrics, setHostMetrics] = useState<MetricScores>({ ...emptyMetrics });
  const [viewerMetrics, setViewerMetrics] = useState<MetricScores>({ ...emptyMetrics });
  const [viewerVotes, setViewerVotes] = useState(0);
  const [metricVotes, setMetricVotes] = useState<Record<string, number>>({});
  const [scoreLocked, setScoreLocked] = useState(false);
  const [votingClosed, setVotingClosed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{ title: string; artist: string; url: string } | null>(null);
  const [volume, setVolume] = useState(70);

  // Phase 4: Operations state
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [previousSegment, setPreviousSegment] = useState("COLD_OPEN");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { connected, sendMessage, pushSegment, pushContestant, pushTrack, pushEpisode, pushEpisodeStatus, pushScoreUpdate, pushLockScore, pushPlayTrack, pushPauseTrack } = useOverlaySocket();

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      fetchEpisodes();
    };
    checkAuth();
  }, []);

  // Timer interval
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerRunning]);

  const fetchEpisodes = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/episodes", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEpisodes(data);
        // Find a live, ready, or setup episode first (not published/post_production)
        const active = data.find((e: Episode) => ["live", "ready", "setup"].includes(e.status));
        if (active) {
          setActiveEpisode(active);
          fetchContestants(active.id, session.access_token);
        } else if (data.length > 0) {
          // Fall back to most recent episode
          setActiveEpisode(data[0]);
          fetchContestants(data[0].id, session.access_token);
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const fetchContestants = useCallback(async (episodeId: string, token: string) => {
    try {
      const res = await fetch(`/api/episodes/${episodeId}/contestants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContestants(data);
      }
    } catch { /* silent */ }
  }, []);

  const handleEpisodeCreated = (episode: Episode) => {
    setEpisodes((prev) => [episode, ...prev]);
    setActiveEpisode(episode);
    setShowSetup(false);
    // Fetch contestants for the new episode
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchContestants(episode.id, session.access_token);
    });
  };

  const handleSegmentChange = useCallback((segment: string) => {
    setCurrentSegment(segment);
    setSegmentHistory((prev) => {
      if (prev.includes(segment)) return prev;
      return [...prev, segment];
    });
    pushSegment(segment);
    // Reset timer on segment change
    setTimerSeconds(0);
    setTimerRunning(false);
  }, [pushSegment]);

  // Audio ref for local playback
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleActivateContestant = useCallback((index: number) => {
    setActiveContestantIndex(index);
    // Reset scores when contestant changes
    setHostMetrics({ ...emptyMetrics });
    setScoreLocked(false);
    setVotingClosed(false);
    // Stop audio on contestant change
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    const c = contestants[index];
    if (c) {
      pushContestant({
        name: c.name,
        city: c.location || "",
        genre: c.genre || "",
        handle: c.social_links?.instagram || "",
      });
      if (c.track_title) {
        pushTrack({ title: c.track_title, artist: c.name });
      }
      // Set current track with signed URL for audio playback
      if (c.track_signed_url) {
        setCurrentTrack({ title: c.track_title || "", artist: c.name, url: c.track_signed_url });
      }
    }
  }, [contestants, pushContestant, pushTrack]);

  const handleTimerStart = useCallback(() => setTimerRunning(true), []);
  const handleTimerStop = useCallback(() => setTimerRunning(false), []);
  const handleTimerReset = useCallback(() => {
    setTimerRunning(false);
    setTimerSeconds(0);
  }, []);

  // Phase 3: Lock score handler
  const handleLockScore = useCallback(() => {
    setScoreLocked(true);
    pushLockScore();
  }, [pushLockScore]);

  // Phase 3: Close voting handler
  const handleCloseVoting = useCallback(() => {
    setVotingClosed(true);
    // Send segment change to close voting on overlays
    pushSegment("VERDICT");
  }, [pushSegment]);

  // Phase 3: Audio handlers
  const handlePlay = useCallback(() => {
    if (audioRef.current && currentTrack?.url) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.play();
      setIsPlaying(true);
      pushPlayTrack({ url: currentTrack.url, title: currentTrack.title, artist: currentTrack.artist });
    }
  }, [currentTrack, pushPlayTrack]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      pushPauseTrack();
    }
  }, [pushPauseTrack]);

  const handlePushToViewers = useCallback(() => {
    if (currentTrack) {
      pushPlayTrack({ url: currentTrack.url, title: currentTrack.title, artist: currentTrack.artist });
    }
  }, [currentTrack, pushPlayTrack]);

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
    }
  }, []);

  // Phase 4: Computed helpers
  const hasBackup = contestants.some((c) => c.pull_order === 4);
  const contestantsConfirmed = contestants.filter((c) => c.status === "selected" || c.status === "aired").length;
  const allTracksLoaded = contestants.length > 0 && contestants.every((c) => c.track_url);

  // Phase 4: Quick action handlers
  const handleGoToBreak = useCallback(() => {
    if (isOnBreak) {
      // Resume: go back to previous segment
      setIsOnBreak(false);
      handleSegmentChange(previousSegment);
    } else {
      // Go to break
      setPreviousSegment(currentSegment);
      setIsOnBreak(true);
      handleSegmentChange("BREAK");
    }
  }, [isOnBreak, previousSegment, currentSegment, handleSegmentChange]);

  const handleActivateBackup = useCallback(() => {
    const backupIdx = contestants.findIndex((c) => c.pull_order === 4);
    if (backupIdx === -1) return;
    // Swap backup into current slot by updating pull_order
    const updated = [...contestants];
    const currentContestant = updated[activeContestantIndex];
    const backupContestant = updated[backupIdx];
    if (currentContestant && backupContestant) {
      const tmpOrder = currentContestant.pull_order;
      currentContestant.pull_order = backupContestant.pull_order;
      backupContestant.pull_order = tmpOrder;
      setContestants(updated);
      handleActivateContestant(backupIdx);
    }
  }, [contestants, activeContestantIndex, handleActivateContestant]);

  const handleSkipContestant = useCallback(() => {
    if (!window.confirm("Skip this contestant and move to next?")) return;
    const nextIdx = activeContestantIndex + 1;
    if (nextIdx < contestants.length) {
      handleActivateContestant(nextIdx);
    }
  }, [activeContestantIndex, contestants.length, handleActivateContestant]);

  const handleResetEpisode = useCallback(() => {
    if (!window.confirm("Reset all scores and votes for this episode?")) return;
    sendMessage("reset-episode", {});
    setHostMetrics({ ...emptyMetrics });
    setViewerMetrics({ ...emptyMetrics });
    setViewerVotes(0);
    setMetricVotes({});
    setScoreLocked(false);
    setVotingClosed(false);
  }, [sendMessage]);

  const handleEndShow = useCallback(async () => {
    if (!window.confirm("End the show? This will stop the timer and close voting.")) return;
    if (!activeEpisode) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/episodes/${activeEpisode.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: "post_production" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveEpisode(updated);
        setTimerRunning(false);
        pushEpisodeStatus("post_production");
      }
    } catch { /* silent */ }
  }, [activeEpisode, pushEpisodeStatus]);

  const isLive = activeEpisode?.status === "live";
  const isReady = activeEpisode?.status === "ready";
  const isSetup = activeEpisode?.status === "setup";
  const controlsEnabled = isLive || isReady; // Show full controls when ready or live

  // Status transition handler
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!activeEpisode) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/episodes/${activeEpisode.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveEpisode(updated);
        setEpisodes((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        pushEpisodeStatus(newStatus);
        // Auto-start timer when going live
        if (newStatus === "live") {
          setTimerSeconds(0);
          setTimerRunning(true);
        }
      }
    } catch { /* silent */ }
  }, [activeEpisode, pushEpisodeStatus]);

  // Next status based on current
  const getNextStatus = (current: string): { label: string; status: string; color: string; desc: string } | null => {
    switch (current) {
      case "setup": return {
        label: "Lock Lineup",
        status: "ready",
        color: "bg-[#D4A843] hover:bg-[#E89B2E] text-[#1A0F0A]",
        desc: "Closes submissions, locks contestant order."
      };
      case "ready": return {
        label: "🔴 GO LIVE",
        status: "live",
        color: "bg-green-700 hover:bg-green-600 text-white animate-pulse",
        desc: "Starts timer, opens broadcast. Viewers can see overlays."
      };
      case "live": return {
        label: "End Show",
        status: "post_production",
        color: "bg-amber-700 hover:bg-amber-600 text-white",
        desc: "Stops timer, closes voting."
      };
      case "post_production": return {
        label: "Publish Episode",
        status: "published",
        color: "bg-purple-700 hover:bg-purple-600 text-white",
        desc: "Finalizes scores, updates leaderboard."
      };
      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="fixed inset-0 carbon-fiber pointer-events-none" />
      <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50" />
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-[#D4A843] uppercase tracking-[0.2em] font-bold gold-shimmer">
                Show Runner
              </h1>
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm mt-2 uppercase tracking-wider">
                Live episode control
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* WS connection indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-all ${connected ? "bg-green-500 shadow-[0_0_6px_rgba(76,175,80,0.5)]" : "bg-red-500"}`} />
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider" style={{ color: connected ? "rgba(76,175,80,0.6)" : "rgba(196,57,42,0.5)" }}>
                  {connected ? "Overlays Live" : "Overlays Offline"}
                </span>
              </div>

              {!showSetup && (
                <button
                  onClick={() => setShowSetup(true)}
                  className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-4 py-2 rounded font-semibold"
                >
                  + New Episode
                </button>
              )}
              {showSetup && (
                <button
                  onClick={() => setShowSetup(false)}
                  className="font-[family-name:var(--font-mono)] text-sm text-[#F0E6D3]/70 hover:text-[#D4A843] border border-[#3A2818] hover:border-[#D4A843]/40 px-4 py-2 rounded transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
                Loading...
              </p>
            </div>
          ) : showSetup ? (
            <div className="mb-8">
              <EpisodeSetup onEpisodeCreated={handleEpisodeCreated} />
            </div>
          ) : activeEpisode && (isLive || isReady) ? (
            <>
              {/* Episode Header */}
              <EpisodeHeader
                episode={activeEpisode}
                contestants={contestants}
                isLive={isLive || isReady}
                timerSeconds={timerSeconds}
              />

              {/* Pre-flight status bar */}
              <PreFlightCheck
                wsConnected={connected}
                overlayCount={null}
                contestantsConfirmed={contestantsConfirmed}
                contestantsTotal={contestants.length}
                allTracksLoaded={allTracksLoaded}
                episodeStatus={activeEpisode?.status || ""}
              />

              {/* Two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Contestant Queue */}
                <ContestantQueue
                  contestants={contestants}
                  activeIndex={activeContestantIndex}
                  onActivate={handleActivateContestant}
                />

                {/* Right: Segments + Timer + Audio */}
                <div className="space-y-6">
                  <SegmentControl
                    currentSegment={currentSegment}
                    segmentHistory={segmentHistory}
                    onSegmentChange={handleSegmentChange}
                    disabled={!isLive}
                  />
                  <Timer
                    seconds={timerSeconds}
                    isRunning={timerRunning}
                    onStart={handleTimerStart}
                    onStop={handleTimerStop}
                    onReset={handleTimerReset}
                  />
                  <AudioControls
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onPushToViewers={handlePushToViewers}
                    volume={volume}
                    onVolumeChange={handleVolumeChange}
                  />
                  <audio ref={audioRef} preload="none" />
                </div>
              </div>

              {/* Live Scores — full width */}
              <div className="mt-6">
                <LiveScores
                  hostMetrics={hostMetrics}
                  viewerMetrics={viewerMetrics}
                  viewerVotes={viewerVotes}
                  onLockScore={handleLockScore}
                  onCloseVoting={handleCloseVoting}
                  locked={scoreLocked}
                  votingClosed={votingClosed}
                />
              </div>

              {/* Quick Actions — full width */}
              <QuickActions
                onGoToBreak={handleGoToBreak}
                onActivateBackup={handleActivateBackup}
                onSkipContestant={handleSkipContestant}
                onResetEpisode={handleResetEpisode}
                onEndShow={handleEndShow}
                isOnBreak={isOnBreak}
                hasBackup={hasBackup}
                currentSegment={currentSegment}
              />
            </>
          ) : activeEpisode ? (
            /* Episode exists but not live — show details with status controls */
            <div className="space-y-6 mb-8">
              <EpisodeHeader
                episode={activeEpisode}
                contestants={contestants}
                isLive={false}
                timerSeconds={0}
              />

              {/* Status transition controls */}
              <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
                <div className="flex flex-col items-center gap-5">
                  {/* Current state description */}
                  <div className="text-center">
                    <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/50 text-sm">
                      Episode is in <span className="text-[#D4A843] font-semibold">{activeEpisode.status}</span> status.
                    </p>
                    {isSetup && (
                      <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs mt-1">
                        Submissions are open. Pull contestants and configure the episode.
                      </p>
                    )}
                    {activeEpisode.status === "ready" && (
                      <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs mt-1">
                        Lineup locked. Submissions closed. Ready to go live.
                      </p>
                    )}
                    {activeEpisode.status === "post_production" && (
                      <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs mt-1">
                        Show ended. Review scores and finalize before publishing.
                      </p>
                    )}
                    {activeEpisode.status === "published" && (
                      <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs mt-1">
                        Episode complete. Leaderboard updated.
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {(() => {
                      const next = getNextStatus(activeEpisode.status);
                      if (next) {
                        return (
                          <div className="flex flex-col items-center gap-2">
                            <button
                              onClick={() => handleStatusChange(next.status)}
                              className={`font-[family-name:var(--font-mono)] text-sm px-8 py-3 rounded font-semibold tracking-wider uppercase transition-colors ${next.color}`}
                            >
                              {next.label}
                            </button>
                            <span className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/25 text-xs">
                              {next.desc}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {isSetup && (
                      <button
                        onClick={() => setShowSetup(true)}
                        className="font-[family-name:var(--font-mono)] text-sm text-[#F0E6D3]/70 hover:text-[#D4A843] border border-[#3A2818] hover:border-[#D4A843]/40 px-4 py-3 rounded transition-colors"
                      >
                        Edit / Pull Contestants
                      </button>
                    )}
                  </div>
                  {isSetup && contestants.length === 0 && (
                    <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs text-center">
                      Tip: Use "Edit / Pull Contestants" to assign submissions before locking lineup.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* No episode at all */
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden mb-8">
              <div className="flex flex-col items-center gap-4 py-8">
                <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center">
                  No active episode. Create one to get started.
                </p>
                <button
                  onClick={() => setShowSetup(true)}
                  className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-6 py-3 rounded font-semibold tracking-wider uppercase"
                >
                  + New Episode
                </button>
              </div>
            </div>
          )}

          {/* Episode list */}
          <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden mt-8">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[#F0E6D3]/60 uppercase tracking-[0.15em] font-bold mb-4">
              All Episodes
            </h2>
            {episodes.length === 0 ? (
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
                No episodes yet. Create your first one above.
              </p>
            ) : (
              <div className="space-y-2">
                {episodes.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setActiveEpisode(ep);
                      setShowSetup(false);
                      supabase.auth.getSession().then(({ data: { session } }) => {
                        if (session) fetchContestants(ep.id, session.access_token);
                      });
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded border transition-colors text-left ${
                      activeEpisode?.id === ep.id
                        ? "border-[#D4A843]/40 bg-[#D4A843]/5"
                        : "border-[#3A2818] bg-[#1A0F0A]/50 hover:border-[#D4A843]/20"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-[family-name:var(--font-mono)] text-[#D4A843]/60 text-xs w-12">
                        Ep.{String(ep.episode_number).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3] text-sm">
                          {ep.title || "Untitled Episode"}
                        </p>
                        {ep.air_date && (
                          <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs">
                            {new Date(ep.air_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`font-[family-name:var(--font-mono)] text-xs px-3 py-1 rounded uppercase tracking-wider ${
                        ep.status === "live"
                          ? "text-green-400 border border-green-800"
                          : ep.status === "ready"
                          ? "text-[#D4A843] border border-[#D4A843]/40"
                          : ep.status === "setup"
                          ? "text-blue-400 border border-blue-800"
                          : ep.status === "published"
                          ? "text-purple-400 border border-purple-800"
                          : ep.status === "post_production"
                          ? "text-amber-400 border border-amber-800"
                          : "text-[#F0E6D3]/40 border border-[#3A2818]"
                      }`}
                    >
                      {ep.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
